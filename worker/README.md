# Waitlist relay: launch site → Hostinger Reach

GitHub Pages serves static files only, so it cannot hold a secret. The Hostinger Reach API is authenticated with a
**Hostinger account API token that has the same permissions as your account owner**: anyone who sees it can control
your Hostinger account. So the token never goes into the page or the repository. Instead:

```text
Visitor's browser ──POST email──▶ Cloudflare Worker (this folder, holds the token as an encrypted secret)
                                      └──▶ POST developers.hostinger.com/api/reach/v1/profiles/{profile}/contacts
```

The Worker accepts posts only from your site's origin, validates the email, ignores bots that fill the hidden
honeypot field, sends Reach only `email`, a short note and an optional tag, and never returns Reach's error details or
the token to the browser. The Cloudflare Workers free plan is enough for a waitlist.

## One-time setup

You need a Cloudflare account (free) and Node.js. Run the commands in PowerShell from the repository root.

### 1. Create the Hostinger API token

In hPanel, open **Profile → API** (https://hpanel.hostinger.com/profile/api) and create a token. Give it an expiry
date if you can. Treat it like your account password: do not paste it into chats, issues, commits or the website.

### 2. (Optional) Look up Reach profile and tag IDs

This asks for the token without showing it on screen and lists your Reach profiles (`uuid` and `domain`):

```powershell
$secure = Read-Host 'Hostinger API token' -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuth([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
(Invoke-RestMethod https://developers.hostinger.com/api/reach/v1/profiles -Headers @{ Authorization = "Bearer $token" }).profiles | Format-Table uuid, domain
```

To tag every signup (for example with a "waitlist" tag you created in Reach), list the profile's tags and copy the
`uuid`:

```powershell
Invoke-RestMethod "https://developers.hostinger.com/api/reach/v1/profiles/<profile uuid>/tags" -Headers @{ Authorization = "Bearer $token" } | Format-Table uuid, value
```

Close the PowerShell window afterwards so the token is not left in the session.

### 3. Configure and deploy the Worker

`worker/wrangler.toml` is already filled in: the `cosmoos.tech` Reach profile, the Reach `waitlist` tag, and
`ALLOWED_ORIGINS` for `https://cosmoos.tech`, `https://www.cosmoos.tech` and `https://jarihant701.github.io`. Only
change them if you move the site or switch Reach profiles (step 2 shows how to look the IDs up).

```powershell
npx wrangler login
```

```powershell
npx wrangler secret put HOSTINGER_API_TOKEN --config worker/wrangler.toml
```

Paste the token when asked. It is stored encrypted by Cloudflare and never appears in the repository.

```powershell
npx wrangler deploy --config worker/wrangler.toml
```

The deploy prints the Worker URL, for example `https://cosmoos-waitlist.<your-subdomain>.workers.dev`.

### 4. Point the site at the relay

In `index.html`, set the one waitlist setting to that URL, then commit and push:

```html
<meta name="waitlist-endpoint" content="https://cosmoos-waitlist.<your-subdomain>.workers.dev" />
```

### 5. Recommended in Reach

Turn on **double opt-in** in Reach. New signups are then created as pending and Reach sends the confirmation email
itself; the site's success message already tells people to check their inbox.

## Responses the page understands

| Relay status | Meaning | Shown to the visitor |
|---|---|---|
| 200 | Reach accepted the contact (or a bot was silently dropped) | "You're on the list. Check your inbox…" |
| 422 | Invalid email (checked by the relay, or rejected by Reach) | "That email address doesn't look right…" |
| 429 | Reach rate limit | "A lot of people are signing up right now…" |
| 403 | Post did not come from an allowed origin | generic retry message |
| 502 / 503 | Reach error, or the relay is not configured yet | generic retry message |

Failures are logged in Cloudflare (`npx wrangler tail --config worker/wrangler.toml`) with the status and Reach's
`correlation_id` only, never the email or the token.

## Tests

```powershell
npm test
```

Node's built-in test runner checks the relay with Reach stubbed out (no network, no real token).

## If the token leaks

Delete it in hPanel → Profile → API immediately, create a new one, and run the `wrangler secret put` command again.
