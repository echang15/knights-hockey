# Knights Hockey

NHL-style team site: schedule, scores, player/goalie stats, game-day player availability, and a blog, with an admin UI for entering it all.

## Architecture (all AWS, serverless, pennies/month)

| Piece | Service |
|---|---|
| Site (React + Vite) | S3 + CloudFront |
| API (`/api/*`, same origin via CloudFront) | API Gateway HTTP API + Lambda |
| Data | DynamoDB (single table, retained on stack delete) |
| Accounts & roles | Cognito user pool (no self sign-up) with `admins` / `players` groups |
| Gallery photos | private S3 bucket, delivered via short-lived signed links |

Reads are public; `PUT`/`DELETE` are rejected by API Gateway unless the caller has a valid Cognito token.
Stats are computed in the browser from per-game stat lines, so entering a box score updates leaders and goalie SV% automatically.

## Player photos & bios

In **Admin → players → Edit**, choose a photo plus optional hometown, height, weight and bio. The browser crops the image to a small square JPEG and uploads it through the (login-protected) API to a private S3 bucket that CloudFront serves at `/photos/*`. Photos appear on the roster, each player's bio page (`/player/<id>`, linked from every player name), and the stats tables and leaderboards. Players without a photo show their jersey number instead.

**Privacy:** the site is public, and many players are minors. Get parent/guardian consent before posting photos or personal details like hometown, height and weight (all optional).

## Game check-in (player availability, members only)

Purely internal, so coaches know who is coming and can set lines and defensive pairings — it has nothing to do with fans. On an upcoming game's page, signed-in members (players, families, admins) pick a **roster player** from a dropdown and mark them **In** or **Out**. The page shows **In / Out / No response** columns grouped by forwards, defense and goalies, with a tally per position (e.g. `9/12 Forwards`, `5/6 Defense`, `1/2 Goalies`).

- Only active roster players can be checked in (no free-text names; retired players are excluded), and only for upcoming games. Re-submitting switches In/Out.
- Guests can't check in **and can't see any of it**: the API refuses their reads and writes, and the site shows no counts or names to them.
- Any member can update any roster player's status (so a parent can answer for their kid, and a coach can enter a text reply). Admins can clear an entry with **×**.

## Local development (no AWS needed)

```bash
npm install
npm run dev        # API on :8787 (JSON file, seeded with SAMPLE data), site on :5173
```
The local API has **no real auth** — it is for development only. Instead the footer shows a **DEV role** switcher (guest / player / admin) so you can try all three access levels. Gallery photos are stored in `api/data/gallery/`.
Delete `api/data/db.json` to reset.

## Deploy

Prereqs: AWS credentials configured, and once per account/region `npx -w infra cdk bootstrap`.

```bash
npm run deploy
```
Outputs the site URL and `UserPoolId`. There are three access levels, decided by Cognito group:

| Who | How | Can do |
|---|---|---|
| **Guest** | not signed in | public site: schedule, scores, stats, roster, blog, game check-in |
| **Player** | Cognito group `players` | everything a guest can, plus the **members-only gallery** |
| **Admin** | Cognito group `admins` | everything, plus edit the site, manage albums/photos, and invite members |

Create the **first admin** by hand (there is no sign-up form by design):

```bash
aws cognito-idp admin-create-user --user-pool-id <UserPoolId> --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true
aws cognito-idp admin-add-user-to-group --user-pool-id <UserPoolId> --username you@example.com --group-name admins
```
Cognito emails you a temporary password; sign in at `/login` and you'll be asked to choose a real one.

> **Upgrading from an earlier version?** Admins are now identified by group membership, not just by having an account. Add your existing admin user to the `admins` group (second command above) or you will be locked out of editing.

After that, invite everyone else from **Admin → members** (pick *Player* for players and families). They get an email with a temporary password. Remove someone there and they lose access immediately.

## Gallery (members only)

Signed-in players and admins see a **Gallery** link; guests don't, and the API refuses them too. Admins create albums and add photos (multi-select) right on the gallery pages; ★ sets an album's cover, and photos can be captioned or deleted.

- Photos are shrunk in the browser (1600 px full size + 400 px thumbnail JPEGs) before upload.
- They live in a **private** S3 bucket with no public access and no CloudFront route. The API hands signed-in members **15-minute signed links**; the page refreshes them automatically. A link a member copies stops working shortly after.
- Role checks happen inside the API (it reads the verified Cognito group), not just in the UI or API Gateway routing.
- Caveat: members can still save or screenshot photos they can see, so share only what you are comfortable with team members having. Get parent/guardian consent for photos of minors.
- Forgot password: remove the member and re-invite them (a self-serve reset isn't built yet).

## Customising

- Team name / branding: `web/src/config.ts`, colors in `:root` of `web/src/styles.css` (currently green/white), logo: put your file at `web/public/logo.png` (shown site-wide; a placeholder shield appears if missing) and optionally replace `web/public/favicon.svg`.
- Custom domain: add a certificate + `domainNames` to the `Distribution` in `infra/lib/stack.ts`.
- Remove sample data: it only lives in `api/src/seed.ts` and is used by the local server alone — it is never deployed.
