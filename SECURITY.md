# Security Policy

## Reporting a vulnerability

Please report security issues privately to **ehre@modulr.design** (do not open a public issue for
sensitive reports). We aim to acknowledge within a few business days.

## Hardening notes (read before production)

- **Auth is dev-open by default.** Out of the box, requests resolve to a local owner so the app runs
  without login. For any shared/production deployment set **`AUTH_MODE=strict`** and issue per-user
  API keys (or wire OIDC). Routes marked `@RequirePermission(...)` then require an authorized role.
- **Secrets** are encrypted at rest with AES-256-GCM using `SECRETS_MASTER_KEY`. Set a strong,
  unique key (`openssl rand -base64 32`) and keep it out of version control. Secrets are injected
  into agent runs as environment variables only — **never** into prompts or logs.
- **No phone-home.** AIgency OS does not require a license key and does not call out to a vendor
  beacon. It can run fully air-gapped.
- **Data residency** is yours: self-host the Postgres instance in your chosen region.
- **External agents** should use **token-scoped credentials** (rotate per agent in the personnel
  file) and an appropriate **sovereignty level**, never a shared full-access service account.
- Audit log is append-only; export to your SIEM for retention.

## Supported versions

Pre-1.0 (M1 research preview): security fixes land on `main`.
