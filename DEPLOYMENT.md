# Umami deployment runbook

## Release record

- Application: Umami
- Release: `v3.2.0`
- Upstream commit: `2f6e2b5ff256862a081d9e74bed18a42ebf795e3`
- Production branch: `codex/production`
- Application host: Netlify Free
- Database host: Neon Free project `Site Metrics Admin`
- Public hostname: `metrics.<owned-domain>` (replace at deployment)

The production branch is pinned to the release above. Do not automatically merge or deploy
the upstream `master` branch.

## Neon

1. Use the dedicated project `Site Metrics Admin` in AWS US East 2 (Ohio), near Netlify's
   default Functions region.
2. Keep its default branch named `production`.
3. Copy the **pooled** connection string. Preserve Neon's SSL parameters and ensure the query
   string contains `pgbouncer=true` and `connect_timeout=10`.
4. Store the pooled connection string only in Netlify's production environment as
   `DATABASE_URL`.

Do not put a database URL in this repository. Deploy previews must not inherit the production
database URL. A preview intended to test an upgrade must receive the pooled URL of a temporary
Neon branch in Netlify's deploy-preview context.

## Netlify

1. Import the GitHub repository and choose `codex/production` as the production branch.
2. Confirm the repository's `netlify.toml` is detected. It pins Node 22, runs
   `pnpm run build`, publishes `.next`, and activates Umami's Next.js adapter.
3. Add production-scoped secrets in **Project configuration → Environment variables**:
   - `DATABASE_URL`: Neon pooled connection string
   - `APP_SECRET`: output of `openssl rand -hex 32`
4. Confirm these committed build variables are present:
   - `TRACKER_SCRIPT_NAME=t.js`
   - `COLLECT_API_ENDPOINT=/api/e`
   - `DISABLE_TELEMETRY=1`
5. Deploy and verify that the build creates/migrates the database successfully.
6. Attach `metrics.<owned-domain>`, update DNS as instructed by Netlify, and wait for the TLS
   certificate to become active.
7. Log in with `admin` / `umami` and change the password immediately. Do not enable public
   share URLs by default.

## Website onboarding

Create one Umami website record per canonical website. Use both the bare and `www` hostname
where both serve the same site. Install this snippet after replacing all placeholders:

```html
<script
  defer
  src="https://metrics.example.com/t.js"
  data-website-id="WEBSITE_ID"
  data-domains="example.com,www.example.com"
  data-do-not-track="true">
</script>
```

Pilot one low-risk site with both the Cloud and self-hosted trackers for 48 hours. If collection
and dashboard access remain healthy, move the remaining sites in small batches. Keep Umami
Cloud available for 30 days. Before ending that overlap, export every Cloud website to gzip CSV
and verify that each archive opens.

## Monitoring and limits

- Monitor `https://metrics.<owned-domain>/t.js` from an external HTTPS monitor.
- Weekly for the first month, then monthly, review Netlify credits and Neon storage, CU-hours,
  and egress.
- Start migration or paid-tier planning at 70% of any quota.
- Check the dashboard weekly for recent real events; a static tracker check does not validate
  database writes.
- Expect the first database-backed request after Neon sleeps to be slower.

## Upgrade procedure

1. Review the latest stable Umami release and its migrations; never deploy upstream `master`.
2. Create a temporary Neon branch from production.
3. Give a non-production Netlify deploy only that temporary branch's pooled URL.
4. Build and test login, dashboards, tracking, and existing data.
5. Immediately before production deployment, create a fresh `pre-upgrade-YYYYMMDD` Neon branch.
6. Deploy the reviewed release to production.
7. Keep the pre-upgrade branch for 24 hours after validation, then delete it.

Never point a deploy preview at the production database.

## Recovery boundary

No independent database backup is configured. Temporary Neon branches reduce migration risk,
but they do not protect against Neon account or project loss, late-discovered deletion, or a
provider failure. Revisit off-provider backups before analytics becomes contractually important.

## Deployment notes

- Netlify's first deploy did not apply non-secret values from
  `[context.production.environment]` to Umami's build/runtime. They are intentionally committed
  under `[build.environment]` instead; `DATABASE_URL` and `APP_SECRET` remain secret UI values.
- Netlify's Next.js runtime did not honor Umami 3.2.0's alternate tracker rewrite even though
  `/api/config` reported `t.js`. The build now creates the configured tracker aliases as real
  static files after Rollup builds `public/script.js`.
- Umami 3.2.0 emits a forward-looking PostgreSQL client warning for `sslmode=require`. The
  current client treats it as full certificate verification. Recheck Neon's recommended URL and
  use an explicit supported verification mode during the next reviewed Umami/`pg` upgrade.
