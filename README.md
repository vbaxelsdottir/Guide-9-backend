# Christmas Movie Calendar — separate back-end project

This is a NEW project copied from the Vue calendar at Guide-8- commit `7afdc4b690fcc10b3b6f3a737e4ced36ce294483`. The original React, Vue, Angular and comparison projects are unchanged. The earlier recommendation-only report is unchanged too.

Two pages:

- `/` — Vue calendar connected to the API
- `/report.html` — interactive assignment report, with real local-test evidence and deployment limitations

## Run now without accounts (local testing)

Use Node.js 22.12+ (tested with Node 24.21.0):

```sh
npm ci
npm run dev:local
```

Open http://127.0.0.1:4392/ and http://127.0.0.1:4392/report.html.

The local API runs on port 4393 with the same handler and SQL migration as production, using PGlite (PostgreSQL compiled to WebAssembly) and persistent files in `.local-data/postgres`. Click **Save & share calendar**, then **Continue as local test owner**, then save. This identity is simulated; no email is sent. The local server is loopback-only and must NOT be exposed publicly. Open the guest link in a separate browser/session to see guest controls.

`npm run dev` runs the frontend against Supabase once `.env.local` is configured. The development-only test identity is eliminated from production builds; the deployed Edge Function has no simulated authentication path.

## Rules implemented

- Anyone can draft. Saving a calendar requires a verified owner session in production.
- Before December 1, the owner and guests holding a valid random link can edit; early sharing lock restricts editing to the owner.
- From December 1 at 00:00 UTC in that calendar's year, everyone is blocked from changing movies. Old calendars remain frozen.
- Only owners may lock sharing, rotate guest links or delete. Deletion and access revocation remain possible after the movie freeze; this is a documented privacy-oriented implementation choice.
- Guest links can be forwarded. Guests have no individual accounts or attributable edit history.
- Future titles are withheld from read-only viewers. Editors who have already seen titles cannot be made to forget them.
- Opened-door history is browser-local. Movie choices are shared database data.
- Saving requires a matching version so a stale draft does not silently overwrite newer changes.

## Supabase deployment (requires your account)

1. Create a Supabase project. Save the database password privately. Do not paste private credentials in chat or commit them.
2. In its SQL editor, run `supabase/migrations/202610030001_calendar.sql` once. This creates tables, constraints, server functions and denies direct browser access. No permissive RLS policies need to be added.
3. Install/use the official CLI with `npx supabase login`, then `npx supabase link --project-ref YOUR_PROJECT_REF` from this folder. If you used the SQL editor already, do not apply the same initial migration again through `db push`.
4. Set the allowed FRONTEND ORIGIN (no path) as a function secret:
   `npx supabase secrets set ALLOWED_ORIGINS=https://vbaxelsdottir.github.io,http://127.0.0.1:4392`
5. Deploy: `npx supabase functions deploy calendar-api`. `supabase/config.toml` deliberately disables the gateway's blanket JWT check so guests can reach the handler; the handler verifies owner JWTs with `auth.getUser` and validates guest tokens. Never remove those checks.
6. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to functions. The service role remains server-side; never put it in Vite settings.
7. Under Authentication, enable email sign-in. Use the default Magic Link template. Set Site URL and an exact allowed Redirect URL to the deployed app URL, including its repository path and trailing slash. The app sends emailRedirectTo and Supabase processes the returned session. Configure rate limits and bot protection as needed.
8. Configure a custom SMTP provider for public users. Supabase's default SMTP only supports restricted testing with project-team addresses. Email delivery, sender domain setup and provider pricing need validation. Do not disable verification to work around email failures.
9. Copy `.env.example` to `.env.local` and insert the project URL and PUBLIC publishable key. Run `npm run dev` to test real email sign-in.

Official references: [email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [function deployment](https://supabase.com/docs/guides/functions/deploy).

## Publish separately on GitHub Pages

Create a NEW repository, for example `calendar-backend`. Upload this project's source, including `.github`, but excluding `node_modules`, `dist`, `.env.local` and `.local-data`. Do not upload it over `Guide-8-`.

In repository Settings → Secrets and variables → Actions → Variables, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These must be the public project URL/key. In Settings → Pages choose GitHub Actions. The included workflow tests and builds this new project only.

The resulting URLs would be `https://vbaxelsdottir.github.io/Guide-9-backend/` and `https://vbaxelsdottir.github.io/Guide-9-backend/report.html` IF that repository name is used. They are examples, not existing deployments. The app uses a relative build base and fragment routes, so Pages does not need a server-side router.

## Tests and evidence

```sh
npm test
npm run build
```

Tests issue real local HTTP requests through the production handler and migration. They use stubbed identities instead of real email verification. PGlite verifies PostgreSQL statements locally; hosted Supabase and Deno integration still require smoke tests. `evidence/local-http-capture.json` contains redacted actual requests; `evidence/test-results.txt` records the verified run.

The report honestly distinguishes these results from unperformed production/two-device/email/peer checks. For submission finish the checklist in `DEPLOYMENT-CHECKLIST.md` and update the evidence; do not mark a test passed simply because the expected result is written down.

## Security and practical limits

- API functions are granted only to `service_role`; tables have RLS and no browser policies. The server gets owner identity from verified auth, never from request JSON.
- Calendar permission checks and writes run in one database transaction with row locking.
- Guest tokens use 32 cryptographically random bytes; only SHA-256 fingerprints are stored. Link rotation invalidates old links. Tokens appear in URL fragments, are sent in a header and are omitted from app logs.
- JSON size 16 KiB; server-side title/day validation; 20 calendars per owner; database-backed fixed-window request quotas (90 per owner/link per minute, coarse project cap 1200 per minute).
- The global quota can allow one abusive client to affect availability; it is a small-project safeguard, not a complete DDoS solution. Auth mail/verification limits are configured separately with Supabase.
- Logs contain request ID, method, action and status only. Unexpected errors are sanitised.
- Persistent Supabase browser sessions are accessible to JavaScript: avoid untrusted scripts and raw HTML rendering, use HTTPS, and sign out on shared devices. Email ownership and mailbox security matter.
- Monitoring, backups/restore exercises, legal/privacy copy appropriate to your audience and abuse controls need review before broad public use. No claim of production security certification is made.
