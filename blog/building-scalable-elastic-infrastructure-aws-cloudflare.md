# Building Scalable and Elastic Infrastructure on AWS with Cloudflare: From AMI to ALB

## Introduction

Scalability and elasticity are not optional in modern cloud infrastructure—they are survival requirements. Systems that cannot grow under load fail silently, and systems that cannot shrink waste money. I have spent enough time on incident calls where we blamed "unexpected traffic" that we should have expected. That ends today.

This post walks you through a production-ready architecture that handles variable demand gracefully. You will build custom AMIs, wire them to Auto Scaling Groups, route traffic through an Application Load Balancer, and sit behind Cloudflare for edge performance and DDoS protection. By the end, you will have a system that scales horizontally without human intervention and fails over gracefully.

I am assuming you know AWS basics—EC2, security groups, VPCs. What you might not have done is wire all these pieces together coherently. That is the gap we close here.

## Step 1 – AMI: Your Golden Image Foundation

An AMI (Amazon Machine Image) is a snapshot of a configured OS and pre-installed dependencies. Instead of launching instances and babying them to a usable state, you bake an AMI once and reuse it everywhere. This is the immutable infrastructure mindset: your instances are cattle, not pets.

Why custom AMIs matter: Every instance launched from your AMI is identical. No drift. No "it works on my machine" nightmares when a junior teammate SSHes and tweaks a config. You version your AMI, you version your infrastructure.

### Best Practices for AMI Creation

**Pre-install everything.** Security updates, runtime dependencies, monitoring agents, log forwarders. The goal is that when an instance launches from your AMI, it is ready to serve traffic within seconds. No yum install at startup. No downloading agents mid-deployment.

**Harden the OS.** Disable unnecessary services. Set SELinux modes appropriately. Remove default users. Apply vendor security patches. Treat the AMI like you would a production hardened base image—because it is.

**Version your AMIs with naming conventions.** Do not use "latest-build-v1". Use ISO timestamps or semantic versioning. Example: `my-app-ubuntu-22.04-v2025-05-17-0342`. This way, when an AMI causes an incident, you can trace it back. You can also roll back quickly.

**Test the AMI before using it.** Launch an instance from it. Run basic health checks. Verify your application starts correctly. A broken AMI will break every instance launched from it.

### Creating an AMI from an EC2 Instance

Here is the AWS CLI flow for creating an AMI from a running instance:

```bash
# 1. Launch an instance manually and configure it exactly as you want
# 2. Once ready, create the AMI

aws ec2 create-image \
  --instance-id i-1234567890abcdef0 \
  --name "my-app-v2025-05-17" \
  --description "Production app server with dependencies, monitoring, and hardened OS" \
  --tag-specifications 'ResourceType=image,Tags=[{Key=Name,Value=my-app-v2025-05-17},{Key=Environment,Value=production},{Key=MaintainedBy,Value=platform-team}]'

# 3. Check the AMI creation status
aws ec2 describe-images --image-ids ami-1a2b3c4d --query 'Images[0].State'

# 4. Once available, note the AMI ID for use in Launch Templates
```

The image will go through several states: `pending` → `available`. This takes a few minutes. Once available, you can launch instances from it immediately.

### Integrate into IaC

If you use Terraform, store your AMI ID as a variable or data source:

```hcl
data "aws_ami" "my_app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:Name"
    values = ["my-app-*"]
  }
}

locals {
  ami_id = data.aws_ami.my_app.id
}
```

This way, when you create a new AMI, your Launch Template automatically picks it up.

---

## Step 2 – Launch Template: The Blueprint for Every Instance

Launch Templates (LTs) replaced the older Launch Configurations years ago. If you are still using Launch Configurations, migrate to LTs now. They are more flexible, support versioning, and allow you to update templates without affecting running instances.

A Launch Template is a blueprint. It says: "When you launch an instance, use this AMI, this instance type, these security groups, this IAM role, and run this user data script." The Auto Scaling Group then uses the template to spin up instances on demand.

### Key Fields in a Launch Template

**AMI ID**: The starting image for your instance. This should be your custom AMI from Step 1.

**Instance Type**: `t3.medium`, `m5.large`, etc. Pick based on your workload. Dev/test? t3 series (burstable). Production with steady traffic? m5 or c5 (general or compute optimized).

**IAM Instance Profile**: The role your instance assumes. It needs permissions to fetch application secrets, write logs to CloudWatch, pull from your container registry—whatever your app needs. Never use root credentials inside an instance.

**Security Groups**: Define which ports are open and from where. For an app behind an ALB, typically the app only listens on port 8080 internally. Port 443/80 is handled by the ALB.

**User Data Script**: A script that runs on first boot. Typically used for final setup, pulling configuration, or triggering deployment. Keep it lightweight; most setup should be baked into the AMI.

**EBS Configuration**: Root volume size, IOPS, volume type. For most workloads, gp3 volumes are faster and cheaper than gp2. Production apps often need higher IOPS—configure accordingly.

**Monitoring**: Enable detailed CloudWatch monitoring so you see CPU, network, and disk metrics at 1-minute intervals instead of 5-minute.

### Example Launch Template Creation

Using the AWS CLI:

```bash
aws ec2 create-launch-template \
  --launch-template-name my-app-template-v1 \
  --version-description "Production template with monitoring and IAM" \
  --launch-template-data '{
    "ImageId": "ami-1a2b3c4d",
    "InstanceType": "m5.large",
    "IamInstanceProfile": {
      "Arn": "arn:aws:iam::123456789012:instance-profile/my-app-role"
    },
    "SecurityGroupIds": ["sg-0123456789abcdef0"],
    "Monitoring": {
      "Enabled": true
    },
    "UserData": "IyEvYmluL2Jhc2gKZWNobyAnQXBwIGluaXRpYWxpemluZycgPi9ob21lL2FwcC9sb2dnZXIubG9nCg==",
    "TagSpecifications": [
      {
        "ResourceType": "instance",
        "Tags": [
          {"Key": "Name", "Value": "my-app-instance"},
          {"Key": "Environment", "Value": "production"}
        ]
      }
    ]
  }'
```

(The `UserData` is base64 encoded. Decode it to see the actual script.)

### Versioning Launch Templates

When you update a template, AWS keeps the old versions. You can launch instances from any version. This is critical for rollbacks.

```bash
# Create a new version
aws ec2 create-launch-template-version \
  --launch-template-id lt-0123456789abcdef \
  --source-version 1 \
  --launch-template-data '{"InstanceType": "m5.xlarge"}'

# Rollback by pointing ASG to previous version
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-app-asg \
  --launch-template LaunchTemplateId=lt-0123456789abcdef,Version=1
```

---

## Step 3 – Auto Scaling Group: Elasticity in Action

An Auto Scaling Group (ASG) is the orchestrator. It watches your target metric (CPU, custom metric, request count) and scales up or down accordingly. You tell it "I want between 2 and 10 instances" and it handles the rest.

### How ASG Works with Launch Templates

The ASG uses your Launch Template as a recipe. When the scaling policy triggers, the ASG launches new instances from the template. When demand drops, it terminates instances gracefully, respecting connection drain time.

### Scaling Policies: Target Tracking vs Step Scaling

**Target Tracking**: Simplest approach. You say "Keep CPU at 70%" and the ASG adjusts capacity automatically. AWS does the math. Example: CPU hits 80%, ASG scales up; CPU drops to 60%, ASG scales down. It smooths out spikes without you writing complex rules.

**Step Scaling**: More granular. You define: "If CPU is 75-85%, add 1 instance. If CPU is 85-95%, add 3 instances." Requires more tuning but gives you precise control. Good for predictable traffic patterns.

I usually recommend **Target Tracking** for most workloads. It is simpler, less prone to oscillation, and adapts better to traffic changes.

### Health Checks and Grace Periods

An ASG monitors instance health. If an instance fails health checks, it is terminated and replaced automatically.

**Health Check Type**: `ELB` (from load balancer) or `EC2` (from AWS status checks). Use `ELB` so the ASG only considers instances healthy if the ALB thinks they are.

**Health Check Grace Period**: Time (in seconds) after launch before health checks begin. New instances need time to initialize. Set this to how long your app takes to become ready. Too short and healthy new instances get killed. Too long and failed instances linger.

Example: If your app takes 60 seconds to fully initialize, set grace period to 90 seconds.

### ASG Configuration Example

Using Terraform:

```hcl
resource "aws_autoscaling_group" "my_app" {
  name                = "my-app-asg"
  vpc_zone_identifier = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  min_size              = 2
  max_size              = 10
  desired_capacity      = 3
  health_check_type     = "ELB"
  health_check_grace_period = 90

  launch_template {
    id      = aws_launch_template.my_app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "my-app-instance"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "my-app-scale-up"
  autoscaling_group_name = aws_autoscaling_group.my_app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

Min 2, max 10, desired 3. The ASG will keep 3 running under normal load. If CPU goes above 70%, it adds instances. If it drops below 70%, it removes them (respecting min_size).

---

## Step 4 – Target Group: Routing Traffic to Healthy Instances

A Target Group is the glue between the Application Load Balancer and your instances. The ALB forwards requests to targets in the group. The Target Group monitors target health and removes unhealthy ones from rotation.

Think of it as a smart pool: the ALB places requests into the pool, and the pool decides which instance gets which request.

### Health Check Configuration

The Target Group performs its own health checks (separate from the ASG health checks, though they can inform each other).

**Path**: The URL path the Target Group hits to determine health. Example: `/health`. Your app must respond with HTTP 200 on that path.

**Protocol**: HTTP or HTTPS.

**Interval**: How often to check. Typically 30 seconds.

**Healthy Threshold**: How many consecutive successful checks before marking an instance healthy. Default 2. Means 2 successful checks in a row.

**Unhealthy Threshold**: How many consecutive failed checks before marking unhealthy. Default 2. Means 2 failed checks in a row and the instance is removed from rotation.

**Timeout**: How long to wait for a response before considering the check failed. 5 seconds is typical.

### Target Type: Instance vs IP

**Instance**: ASG instances. The most common pattern. The ALB targets the EC2 instance directly.

**IP**: Fixed IPs or on-prem servers. Less common for ASG, but useful if you have a hybrid setup.

### Health Check Example

```hcl
resource "aws_lb_target_group" "my_app" {
  name     = "my-app-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  deregistration_delay = 30
}

resource "aws_autoscaling_group_attachment" "my_app" {
  autoscaling_group_name = aws_autoscaling_group.my_app.id
  lb_target_group_arn    = aws_lb_target_group.my_app.arn
}
```

The ASG is attached to the Target Group. When instances launch, they are automatically registered. When they are terminated, they are deregistered. The `deregistration_delay` gives in-flight requests 30 seconds to complete before the instance is forcibly removed.

---

## Step 5 – Application Load Balancer: The Traffic Gatekeeper

The Application Load Balancer (ALB) is your first layer of traffic distribution. It inspects HTTP headers, routes based on path or hostname, terminates SSL, and distributes load across target groups.

### ALB vs NLB

**ALB (Application Load Balancer)**: Best for HTTP/HTTPS, microservices, content-based routing. You can route `/api/*` to one service and `/static/*` to another. Operates at Layer 7 (application). Slightly higher latency than NLB but far more flexible.

**NLB (Network Load Balancer)**: Best for ultra-high throughput, low latency, or non-HTTP protocols like TCP/UDP. Operates at Layer 4 (transport). Use NLB if you are moving millions of requests/second or running game servers, IoT, or real-time systems.

For most web applications, **ALB is the right choice**.

### Listener Rules and Routing

An ALB Listener listens on a port (443 for HTTPS, 80 for HTTP). You attach Listener Rules that say "if the request matches X condition, forward to Target Group Y."

**Path-based routing**: Route `/api/*` to api-targets, `/web/*` to web-targets.

**Host-based routing**: Route `api.example.com` to api-targets, `web.example.com` to web-targets. Useful for multi-tenant setups.

**HTTP header routing**: Route requests with specific headers to specific targets. Example: route `X-Beta: true` to your canary targets.

### SSL Termination at the ALB

You upload an SSL certificate to the ALB. The ALB decrypts HTTPS traffic from clients, then forwards HTTP (or re-encrypted HTTPS) to instances. This offloads the CPU cost of decryption from your app instances.

Use AWS Certificate Manager (ACM) to provision free certificates. Cloudflare can also generate them, but ACM is simpler if your domain is in Route 53.

### Example ALB Configuration

```hcl
resource "aws_lb" "main" {
  name               = "my-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false
  enable_http2               = true
  enable_cross_zone_load_balancing = true
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.my_app.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

This ALB listens on 443 (HTTPS) with your ACM certificate and forwards to the Target Group. Port 80 (HTTP) is redirected to HTTPS with a 301 redirect.

---

## Step 6 – Cloudflare: The Edge Layer for Performance and Protection

Cloudflare sits between your users and your ALB. It caches content at the edge, blocks DDoS attacks, and rewrites headers. This is your last-mile optimization layer.

### Pointing Your Domain to the ALB via Cloudflare

Your domain's nameservers point to Cloudflare. You create a CNAME record in Cloudflare that points to your ALB's DNS name (something like `my-app-alb-1234567890.us-east-1.elb.amazonaws.com`).

Never point directly to an ALB IP. ALBs can change IPs during updates or failovers. CNAMEs are stable.

```
Name: example.com
Type: CNAME
Content: my-app-alb-1234567890.us-east-1.elb.amazonaws.com
TTL: Auto
Proxied: Yes (Orange cloud)
```

### Proxied vs DNS-Only Mode

**DNS-Only (Gray Cloud)**: Cloudflare just resolves DNS. Users connect directly to your ALB. No edge benefits. Use only for non-HTTP services or if you need users to see your real ALB IP.

**Proxied (Orange Cloud)**: Traffic flows through Cloudflare's edge. Your real origin (ALB) is hidden. Users see Cloudflare's IP, not yours. All requests hit Cloudflare first, then Cloudflare forwards to your ALB. This is what you want for HTTP/HTTPS services.

### Cloudflare WAF, DDoS Protection, and Caching

**WAF (Web Application Firewall)**: Blocks malicious requests based on signatures. OWASP Top 10 rules are enabled by default. You can add custom rules: block requests with SQL injection patterns, XSS attempts, unusual user agents, etc.

**DDoS Protection**: Cloudflare absorbs volumetric attacks at the edge. Terabits of junk traffic never reach your ALB. Their infrastructure is designed for this.

**Caching Rules**: Cache static assets (CSS, JavaScript, images) at Cloudflare's edge for millisecond response times. Set cache TTLs per path. Cache aggressively for assets, never cache login pages.

Example cache rule: cache everything under `/static/` for 1 year. Never cache `/api/*` or `/auth/*`.

### SSL Modes: Full vs Full (Strict)

Cloudflare offers multiple SSL modes:

**Off**: No HTTPS to Cloudflare. Only use for testing.

**Flexible**: HTTP between Cloudflare and origin. Origin has no certificate. Risky; users see HTTPS but origin is unencrypted.

**Full**: HTTPS between Cloudflare and origin, but certificate validation is loose. Origin can have a self-signed cert. Works but less secure.

**Full (Strict)**: HTTPS between Cloudflare and origin, and the origin certificate must be valid and signed by a trusted CA. This is production grade. If your ALB has an ACM certificate, use Full (Strict).

### Example Cloudflare Configuration

Via Terraform (using Cloudflare provider):

```hcl
resource "cloudflare_zone_settings_override" "main" {
  zone_id = cloudflare_zone.example.id

  settings {
    ssl                = "full"
    min_tls_version    = "1.2"
    http2              = "on"
    security_level     = "high"
    waf                = "on"
    universal_ssl      = true
  }
}

resource "cloudflare_record" "app" {
  zone_id = cloudflare_zone.example.id
  name    = "example.com"
  type    = "CNAME"
  value   = "my-app-alb-1234567890.us-east-1.elb.amazonaws.com"
  ttl     = 1  # 1 = auto TTL
  proxied = true
}

resource "cloudflare_page_rule" "cache_static" {
  zone_id = cloudflare_zone.example.id
  target  = "example.com/static/*"

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 31536000  # 1 year
  }
}

resource "cloudflare_page_rule" "no_cache_api" {
  zone_id = cloudflare_zone.example.id
  target  = "example.com/api/*"

  actions {
    cache_level = "bypass"
  }
}
```

### Health Checks Before Going Orange

Before setting your CNAME to proxied (orange cloud), verify your ALB is healthy:

```bash
# Check that your ALB is responding
curl -k -v https://my-app-alb-1234567890.us-east-1.elb.amazonaws.com

# Check that target instances are healthy
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:...
```

If instances show unhealthy, debug them. Check security groups, health check paths, application logs. Do not go orange until everything shows healthy. A broken origin will cascade to a global outage.

---

## Step 7 – Architecture Diagram Description

Here is the traffic flow from user to your app and back:

```
┌──────────┐
│   User   │
└────┬─────┘
     │ HTTPS request
     ▼
┌──────────────────────────┐
│   Cloudflare Edge        │
│  (DNS + WAF + Cache)     │
└────┬─────────────────────┘
     │ Forwards to origin (orange cloud)
     ▼
┌──────────────────────────────┐
│  Application Load Balancer   │
│  (SSL termination, routing)  │
└────┬─────────────────────────┘
     │ Distributes across targets
     ▼
┌──────────────────────────┐
│   Target Group           │
│  (Health checks, pool)   │
└────┬─────────────────────┘
     │ Routes to healthy instance
     ▼
┌────────────────────────────────────┐
│   EC2 Instance (from ASG)          │
│   - Launched from custom AMI       │
│   - Running your application       │
│   - Port 8080 (behind ALB)         │
└────────────────────────────────────┘
```

When user traffic arrives at Cloudflare, it is inspected for threats (WAF), cached if applicable, then forwarded to your ALB's DNS name. The ALB terminates SSL and routes the request to a healthy instance in the target group. The instance processes it and responds. Responses travel back through the same path, with Cloudflare caching if appropriate.

This architecture is fault-tolerant: if one instance fails, the ALB routes around it. If traffic spikes, the ASG launches more instances. If you get DDoSed, Cloudflare absorbs it before it reaches your infrastructure.

---

## Key Takeaways and Best Practices

**Immutable Infrastructure Mindset**: Your instances should be disposable. Never SSH into an instance to fix something manually. If something is broken, update the AMI, launch new instances, and tear down old ones. This forces you to codify everything and makes scaling predictable.

**Always Version Your AMIs**: A year from now, you will want to know which AMI is running in production and why. Use timestamps or semantic versioning. Automate AMI creation in your CI/CD pipeline so every code change produces a new AMI.

**Use Cloudflare Orange-Cloud Only After Validating Health**: Going orange before your origin is ready is a common mistake. New engineers enable Cloudflare proxying before instances are healthy, then panic when users see 502s. Validate ASG, ALB, and Target Group health first. Then go orange.

**Tag Everything for Cost Visibility**: Every EC2 instance, ALB, Target Group, and EIP should have tags: `Environment`, `Application`, `Team`, `Cost-Center`. Use these tags in your cost allocation reports. You will be surprised how much infrastructure creep costs.

**Monitor Target Group Health Metrics**: Check CloudWatch metrics on your Target Group. Watch the count of healthy vs unhealthy targets. Watch latency. If latency is climbing, add capacity or investigate the app. If unhealthy target count is increasing, debug why instances are failing health checks.

**Set Appropriate Health Check Grace Periods**: Too short and healthy new instances get killed. Too long and failed instances linger. Test your app startup time and set grace period 20-30% higher.

**Use Security Groups Defensively**: Your ALB security group should allow 80/443 from anywhere. Your app security group should allow only port 8080 from the ALB security group. Never allow 22 (SSH) except from a bastion or VPN. Never expose your app port directly to the internet.

**Cloudflare Certificate Pinning**: If you use Full (Strict) SSL mode, ensure your ALB certificate is from a trusted CA. Cloudflare validates it. Self-signed certificates will cause proxying to fail silently.

---

## Conclusion

You now have a production-grade architecture that scales elastically, survives component failures, and sits protected behind a global edge layer. This is the pattern running countless SaaS applications and internal company platforms.

The architecture is not magic. It is orchestration. You define the pieces (AMI, Launch Template, ASG, ALB, Cloudflare), and the system handles the boring operational work: spinning instances up and down, distributing traffic, replacing failed components, caching at the edge.

The next steps: automate AMI creation in your CI/CD pipeline. Add monitoring and alerting on key metrics. Run chaos engineering exercises to test your architecture under failure. Document runbooks for common incidents.

For deeper dives, check out the [AWS Auto Scaling documentation](https://docs.aws.amazon.com/autoscaling/), [ALB documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/), and [Cloudflare's architecture guides](https://developers.cloudflare.com/). Build this. Test it. Break it intentionally. Iterate.

Your future self will thank you when 3 AM incidents become 10-minute nonproblems.

---

**Tags**: AWS · Cloudflare · Auto Scaling · ALB · Infrastructure · DevOps · SRE
