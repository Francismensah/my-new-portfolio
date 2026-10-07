# Task

Update the blog post `blog/the-reboot-that-took-us-down-systemd-production.html` with the revised content below.

# Context

- Site: infrabyfrancis.me (personal SRE/tech blog, static HTML).
- Author: Francis Morkeh Mensah.
- Existing post URL: https://infrabyfrancis.me/blog/the-reboot-that-took-us-down-systemd-production
- Canonical: https://infrabyfrancis.me/blog/the-reboot-that-took-us-down-systemd-production.html

# Rules

1. Reuse the existing post's HTML template, CSS classes, header, footer, theme toggle, and image markup. Do not create a new layout.
2. Convert the Markdown between `<<<POST_START>>>` and `<<<POST_END>>>` into HTML that matches the existing structure (h1, h2, tables, code blocks, figures with captions).
3. Keep all code blocks verbatim. Do not reformat, rename variables, or "improve" them.
4. Keep the three existing images and their alt text and captions. Paths: `/images/systemd-boot-flow.svg`, `/images/systemd-unit-anatomy.svg`, `/images/systemd-release-flow.svg`. The new draft references boot-flow and release-flow; keep unit-anatomy under the unit file section.
5. Anything in [square brackets] is a placeholder for facts only the author knows. Leave them exactly as written. Do not invent incident details, dates, durations, or impact.
6. Update `<title>` and meta description to: "The Reboot That Took Us Down: Running systemd Services in Production" / "Run Linux applications reliably with systemd: units, logs, timers, releases, rollback, hardening, and incident lessons."
7. Add the TL;DR as a highlighted paragraph directly under the byline, using the site's existing callout style if one exists.
8. Make no other changes to the site (nav, other posts, global CSS).

# Acceptance checklist

- [ ] Page renders with the same layout as before
- [ ] All code blocks present and unchanged
- [ ] Placeholders in [brackets] untouched
- [ ] Table of unit types renders correctly
- [ ] Canonical and meta tags updated
- [ ] No broken image paths or links

# Content

<<<POST_START>>>

# The Reboot That Took Us Down: Running systemd Services in Production

**TL;DR:** `start` affects now. `enable` affects future boots. A service can be running today and still be gone after the next reboot.

📅 [Month DD, 2026] · ⏱ [recalculate] min read · ✍️ Francis Morkeh Mensah

Tags: systemd, Linux, SRE, Operations

## The incident

[Date], during planned maintenance, we rebooted the VM hosting [service name]. It did not come back. [Service] was down for [duration], and [impact: e.g. which customers or flows were affected].

The service had been running before the reboot. Someone had started it manually during a previous deploy with `systemctl start`, and nobody ran `systemctl enable`. After the reboot, systemd did exactly what it was told: it left the service inactive.

We detected it through [alert / customer report / health check]. We fixed it with `sudo systemctl enable --now [service]`. Afterwards we [what changed: CI check, alert, reboot test].

The rest of this post covers what I now check on every deployment.

## What systemd actually does

systemd runs as PID 1, the first userspace process started by the kernel. It brings the host to a target state, starts units in dependency order, supervises long-running processes, and records output in the journal.

A process is only the program running right now. A service also has an owner, working directory, environment, startup command, dependencies, restart policy, log destination, and boot behavior. Starting `node server.js` from an SSH session proves the binary works. It doesn't define what happens after the terminal closes, the VM reboots, or the app crashes.

| Unit | Purpose | Example |
| --- | --- | --- |
| service | Long-running process or one-shot command | api.service |
| timer | Schedules another unit | backup.timer |
| socket | Opens a socket and activates a service | sshd.socket |
| target | Groups units into a desired state | multi-user.target |

Figure: systemd-boot-flow.svg — "The kernel hands control to systemd, which brings the host to a target state before application services start."

## systemctl is the control plane

```
sudo systemctl start app.service            # now
sudo systemctl enable app.service           # future boots
sudo systemctl enable --now app.service     # both
systemctl is-active app.service
systemctl is-enabled app.service
sudo systemctl daemon-reload                # only after unit file changes
```

On every deployment I check both states. A service that is active but not enabled is an outage waiting for the next reboot.

## A production unit file

Figure: systemd-unit-anatomy.svg — "A service unit is not just a process entry. It is also a dependency, lifecycle, and boot contract."

```
[Unit]
Description=My API
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=my-api
Group=my-api
WorkingDirectory=/opt/my-api/current
EnvironmentFile=/etc/my-api/my-api.env
ExecStart=/usr/bin/node /opt/my-api/current/dist/server.js
Restart=on-failure
RestartSec=5s
TimeoutStartSec=60s
TimeoutStopSec=30s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Notes:

- `StartLimit*` stops a crash loop from restarting forever.
- `network-online.target` only delays startup if a wait-online service (`systemd-networkd-wait-online` or `NetworkManager-wait-online`) is enabled on the host.
- Keep the env file at `0640`, owned by root with the app's group.
- For apps that support it (.NET does), `Type=notify` gives systemd a real readiness signal.

## Hardening

A service account is a start. These directives limit the damage if the app is compromised:

```
[Service]
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/my-api
```

`ProtectSystem=strict` makes the filesystem read-only for the service except for paths you list. Run `systemd-analyze security my-api.service` to see a score and what's still exposed. Add directives gradually and test each one, since a too-strict unit fails in ways that look like app bugs.

## journalctl

```
sudo journalctl -u my-api.service --no-pager -n 100
sudo journalctl -fu my-api.service
sudo journalctl -u my-api.service -b -1 --no-pager   # previous boot
sudo journalctl -p err -b --no-pager
```

The previous-boot query only works if the journal is persistent. Many distros default to volatile storage, so after a reboot the evidence is gone. Set this in `/etc/systemd/journald.conf`:

```
[Journal]
Storage=persistent
SystemMaxUse=1G
```

Then run `sudo systemctl restart systemd-journald`. Keep an eye on disk usage.

## Timers instead of cron

A timer activates a service, so you need both units.

```
# /etc/systemd/system/backup.service
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/opt/scripts/backup.sh
```

```
# /etc/systemd/system/backup.timer
[Unit]
Description=Run backup nightly

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=15m

[Install]
WantedBy=timers.target
```

```
sudo systemctl enable --now backup.timer
systemctl list-timers
```

The same trap applies here: enable the **timer**, not the service. `Persistent=true` runs a missed job after downtime, and output goes to the journal like any other unit.

## Releases and rollback

I use immutable release directories and a single symlink swap. It's easy to audit and easy to roll back.

Figure: systemd-release-flow.svg — "A controlled release path matters as much as a healthy unit file. The app should be started, checked, and rolled back deliberately."

```
#!/usr/bin/env bash
set -euo pipefail

release_name=${1:?release name required}
health_url=${2:?health url required}
app_root=/opt/orders
service=orders.service
previous=$(readlink -f "$app_root/current" || true)

ln -sfn "$app_root/releases/$release_name" "$app_root/current"
sudo systemctl restart "$service"

for i in {1..10}; do
  curl -sf --max-time 5 "$health_url" >/dev/null && exit 0
  sleep 3
done

if [ -n "$previous" ]; then
  ln -sfn "$previous" "$app_root/current"
  sudo systemctl restart "$service"
fi
exit 1
```

The retry loop gives the app time to start before it is judged. No `daemon-reload` is needed, because the unit file didn't change.

## Preventing the next reboot incident

1. **Assert boot state in the pipeline.** Fail the deploy if the service isn't enabled:

```
systemctl is-active --quiet orders.service  || { echo "not active"; exit 1; }
systemctl is-enabled --quiet orders.service || { echo "not enabled"; exit 1; }
```

2. **Alert on service state.** With node_exporter's systemd collector enabled, alert on `node_systemd_unit_state{name="orders.service",state="active"} == 0`. This catches the outage after a reboot. It does not catch the misconfiguration beforehand, which is why step 1 matters.
3. **Test reboots in staging.** Run `sudo systemctl reboot`, then run smoke tests. Do it before maintenance, not during.
4. **Don't enable by hand.** Put unit files and enablement in Ansible, cloud-init, or your image build, so the state is declared and repeatable.

## Checklist

- Dedicated non-root user per application
- `enable --now` for the first production activation
- Unit files, env files, and deploy scripts in Git
- Persistent journald with a size limit
- `Restart=on-failure` with a delay and start limits
- Hardening directives, checked with `systemd-analyze security`
- `is-active` and `is-enabled` asserted on every deploy
- A reboot test in staging before production

## Key lesson

A production service is not just a process on a VM. It is a boot-aware unit with a verified startup path, a health check, and a tested rollback. If you haven't rebooted it on purpose, you haven't tested it.

Related: [link your SRE demo series post]

<<<POST_END>>>
