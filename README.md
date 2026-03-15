# Grant Consulting — Admin Dashboard

A secure admin dashboard for managing content on grant-consulting.uz.
Built with vanilla HTML/CSS/JS + Cloudflare Pages Functions.

## What you can manage

| Section | What it does |
|---|---|
| Blog Posts | Publish new articles in all 4 languages (EN / UZ / ЎЗ / RU) |
| Events | Add/remove upcoming events shown on the Events page |
| Gallery | Upload photos & videos (max 25 MB), remove items |
| Testimonials | Add/delete student success stories |

After any change the website rebuilds automatically via Cloudflare (~1 minute).

---

## One-time Setup

### 1. Create a GitHub Personal Access Token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name like `grant-consulting-dashboard`
4. Select scope: ✅ **repo** (full repo access)
5. Click **Generate token** — copy it immediately

### 2. Connect this repo to Cloudflare Pages

1. Push this repo to `https://github.com/sarvarbeksoporboyev8-debug/consulting-dashboard`
2. Go to **Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git**
3. Select the `consulting-dashboard` repo
4. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/`
5. Click **Save and Deploy**

### 3. Set Environment Variables

In Cloudflare Pages → `consulting-dashboard` → **Settings → Environment variables**,
add these variables (for **Production** environment):

| Variable | Value |
|---|---|
| `DASHBOARD_PASSWORD` | Your chosen password (e.g. `MySecret2025!`) |
| `SESSION_SECRET` | Any random 32+ character string (e.g. `xK9mP2qL8rT5vN1jH4wA7dF3cB6eG0`) |
| `GITHUB_PAT` | The token you created in Step 1 |
| `GITHUB_OWNER` | `sarvarbeksoporboyev8-debug` |
| `GITHUB_REPO` | `consulting-website` |

Click **Save** then **Redeploy** for the variables to take effect.

### 4. Access the dashboard

Your dashboard is available at:
```
https://consulting-dashboard.pages.dev
```
(or whatever Cloudflare assigns — check the Pages project URL)

Log in with the password you set in `DASHBOARD_PASSWORD`.

---

## Security notes

- The GitHub token (`GITHUB_PAT`) never reaches the browser — it stays in Cloudflare's edge functions
- Sessions use HMAC-SHA256, valid until you change the password or secret
- The dashboard URL is not linked from anywhere public; only share it with the owner
