**\~/francis**[topology](#topology)[deploys](#history)[incidents](#incidents)[stack](#stack)[writing](#writing)

all systems operational · Accra, GH

currently atHubtel logo

# I keep the pager *quiet* and the fleet *fast*.

Francis Morkeh Mensah — Site Reliability Engineer at Hubtel. I run production infrastructure for a microservices platform, turn noisy telemetry into signal, and write about what breaks.

[Read the postmortems](#incidents)[InfraByFrancis blog →](https://infrabyfrancis.me)

sre@production

```

```

**80+**services moved to Datadog with OpenTelemetry, one place for metrics, logs and traces

**−20%**alert noise after SLO and burn-rate alerting

**3 yrs**on a production microservices fleet

**AWS**Community Builder · Solutions Architect Associate

// what I run

## Service request path

A simplified view of a production platform: frontend clients reach APIs through one edge, with Kafka producers and consumers, background jobs, CDC, and durable workflows behind them. Orange dots are requests in flight.

// deploy history

## Release notes for a career

now · \~3 years

### Site Reliability Engineer — Hubtel

- Own production infrastructure and reliability for a production microservices fleet.
- Moved 80+ services from New Relic and Graylog to Datadog; introduced OpenTelemetry to avoid vendor lock-in.
- Built SLO and burn-rate alerting that cut alert noise by 20%.
- Run Nginx and SSL, Azure DevOps release pipelines, Cloudflare WAF rules, ASG/ALB setups and EBS capacity planning.

before

### Platform Engineer — Rancard

- Linux server operations: Bash automation for disk space management and log rotation across Kannel and Spring Boot workloads.

ongoing

### AWS Community Builder · Writer

- Publishing SRE and infrastructure write-ups as InfraByFrancis.

// postmortems

## Things that broke, and what fixed them

Real classes of failure from the production fleet. The unglamorous ones teach the most.

PM-01SEV · DB

### Migration blocked on lock contention

**SYMPTOM**EF Core migration hung on a PostgreSQL ALTER TABLE.

**FIX**Found the competing lock and sequenced the migration around it.

PM-02SEV · IAM

### Uploads failing on a missing S3 permission

**SYMPTOM**Inventory API errors on presigned uploads.

**FIX**Closed the IAM gap, then added Cloudflare WAF bypass rules for the presigned endpoints.

PM-03SEV · APP

### Type mismatch took out an API endpoint

**SYMPTOM**Npgsql InvalidCastException in production.

**FIX**Traced DateTimeOffset vs timestamp mismatch to the schema.

PM-04SEV · SEARCH

### Client and server disagreed on what "Elasticsearch" is

**SYMPTOM**UnsupportedProductException from the NEST client.

**FIX**Identified the OpenSearch incompatibility and moved to a compatible client path.

PM-05SEV · SCALE

### ASG rollout hit a security group limit

**SYMPTOM**API scale-out blocked by a rule cap.

**FIX**Restructured security group rules to fit within limits.

PM-06SEV · POOL

### Connection pool exhaustion in a Kafka consumer

**SYMPTOM**Npgsql pool at its 100 cap, 30s timeouts.

**STATUS**Investigating the repository call path holding connections.

// service catalog

## Stack

### Cloud

EC2EKSRDSElastiCacheLambdaS3IAMALBASGCloudWatch

### Platform & IaC

KubernetesTerraformDockerNginxsystemdCloudflareAzure DevOps

### Observability

OpenTelemetryDatadogPrometheusGrafanaOpenSearch

### Data & runtime

RedisElasticsearchPostgreSQL.NET / KestrelBashPython

## Attestations

AWS Solutions Architect – Associate

AWS Developer – AssociateDVA-C02 passed

AWS Cloud Practitioner

KCNA

Datadog Observability

Google IT Automation with Python

Google IT Support

Azure AZ-104in progress

// writing

## InfraByFrancis

[SRE · OBSERVABILITY The SRE Trap: When Monitoring Creates More Noise Than Signal Why more alerts means less reliability, and what to do about it.](https://infrabyfrancis.me/blog/the-sre-trap-monitoring-noise-signal) [SRE · SLO An SLO alerting framework Burn-rate alerts that page for what matters.](https://infrabyfrancis.me)

// on-call for opportunities

## Got a fleet that needs calming down?

Let's talk reliability, observability and cloud platforms.

[Get in touch via InfraByFrancis](https://infrabyfrancis.me)

© 2026 Francis Morkeh Mensah · built with care, deployed without drama