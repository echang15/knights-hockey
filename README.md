# Knights Hockey

NHL-style team site: schedule, scores, player/goalie stats, attendance, and a blog, with an admin UI for entering it all.

## Architecture (all AWS, serverless, pennies/month)

| Piece | Service |
|---|---|
| Site (React + Vite) | S3 + CloudFront |
| API (`/api/*`, same origin via CloudFront) | API Gateway HTTP API + Lambda |
| Data | DynamoDB (single table, retained on stack delete) |
| Admin login | Cognito user pool (no self sign-up); write routes require a JWT |

Reads are public; `PUT`/`DELETE` are rejected by API Gateway unless the caller has a valid Cognito token.
Stats are computed in the browser from per-game stat lines, so entering a box score updates leaders, goalie SV%, and attendance automatically.

## Local development (no AWS needed)

```bash
npm install
npm run dev        # API on :8787 (JSON file, seeded with SAMPLE data), site on :5173
```
The local API has **no auth** — it is for development only. `/admin` is open in this mode.
Delete `api/data/db.json` to reset.

## Deploy

Prereqs: AWS credentials configured, and once per account/region `npx -w infra cdk bootstrap`.

```bash
npm run deploy
```
Outputs the site URL and `UserPoolId`. Create your admin login (no sign-up form exists by design):

```bash
aws cognito-idp admin-create-user --user-pool-id <UserPoolId> --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id <UserPoolId> --username you@example.com \
  --password '<strong password>' --permanent
```
Then sign in at `/admin`.

## Customising

- Team name / branding: `web/src/config.ts`, colors in `:root` of `web/src/styles.css`, crest in `web/src/components/Crest.tsx` + `web/public/favicon.svg`.
- Custom domain: add a certificate + `domainNames` to the `Distribution` in `infra/lib/stack.ts`.
- Remove sample data: it only lives in `api/src/seed.ts` and is used by the local server alone — it is never deployed.
