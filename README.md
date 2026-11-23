# CosmoOS launch site

A static, single-page launch site for **CosmoOS** ("Your universe. One workspace."), the creator operating system
for brand deals. Plain HTML, CSS and a few lines of JavaScript: no build step, no framework, no third-party requests
at runtime (the Manrope font is self-hosted).

## Run it locally

```powershell
python -m http.server 4321 --directory D:\AI\cosmoos-launch
```

Then open http://localhost:4321. Opening `index.html` directly from disk also works.

## Turn on the waitlist (Hostinger Reach)

Signups go to **Hostinger Reach** through a small relay in [`worker/`](worker/README.md): a free Cloudflare Worker
that holds your Hostinger API token as an encrypted secret and adds each email to your Reach profile. The token is
never in the page or the repository; it has your full account permissions, so it must stay server-side.

Until the relay URL is set, both forms stay hidden and the page shows "The waitlist opens soon", so visitors never
meet a dead button. Setup takes a few minutes: create the token, find your Reach profile ID, deploy the Worker, then
paste its URL into the one setting in `index.html`:

```html
<meta name="waitlist-endpoint" content="https://cosmoos-waitlist.<your-subdomain>.workers.dev" />
```

Step-by-step instructions, the response table and the leak procedure are in [worker/README.md](worker/README.md).
The page tells visitors their email is used only to invite them to early access: keep it that way, or update that
sentence and add a privacy notice before collecting more. Turning on double opt-in in Reach is recommended.

## Deploy on GitHub Pages

1. On GitHub, open the repository's **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder
   `/ (root)`, and save.
2. The site is served at **https://cosmoos.tech** (custom domain from the `CNAME` file; DNS at Hostinger points the
   apex A/AAAA records at GitHub Pages and `www` at `jarihant701.github.io`). `jarihant701.github.io/cosmoos-launch/`
   redirects there. The relay allows `https://cosmoos.tech`, `https://www.cosmoos.tech` and
   `https://jarihant701.github.io`. Turn on **Enforce HTTPS** in Settings → Pages once the certificate is issued.

GitHub Pages from a **private** repository needs a paid GitHub plan (Pro, Team or Enterprise). On a free plan, make
the repository public first (Settings → General → Danger Zone → Change visibility). The repository contains no
secrets, so that is safe as long as the token only ever lives in the Worker secret.

Any other static host (Cloudflare Pages, Netlify, Hostinger web hosting) also works: upload the folder as-is and add
the new site origin to `ALLOWED_ORIGINS` in `worker/wrangler.toml`.

## Files

| Path | Purpose |
|---|---|
| `index.html` | The page: hero with the feedback-check demonstration, deal flow, features, principles, FAQ, waitlist. |
| `styles.css` | All styling. Tokens follow the app's DESIGN.md: teal `#20B8B0`, midnight navy `#101B2D`, Manrope, 10px radius. |
| `site.js` | Waitlist behaviour: reads the endpoint, submits with `fetch`, shows success or a retryable error. |
| `worker/` | Cloudflare Worker relay to Hostinger Reach, its config (`wrangler.toml`), setup guide and tests. |
| `package.json` | `npm test` runs the relay tests with Node's built-in runner (no dependencies). |
| `favicon.svg`, `assets/brand/` | App mark (SVG) and PNG icons (192, 512). |
| `assets/fonts/` | Manrope variable font (Latin and Latin Extended subsets) and its SIL Open Font License (`OFL.txt`). |

## Content rules

- Everything described is a real feature of the CosmoOS app. The feedback check in the hero is labelled
  "Illustrative example" and uses invented sample text, not client data.
- Do not add testimonials, customer logos, user counts or results until they are real and you have permission.
- Pricing is not final; the FAQ says so. Update it when plans are decided.
- "CosmoOS" is the owner-selected brand, but trademark and domain checks have not been verified. Confirm both
  before a public launch.

## Accessibility

Semantic landmarks and headings, a skip link, labelled form fields, visible focus, live status messages for the
form, WCAG AA text contrast (checked with Impeccable's detector), and no motion when the visitor prefers reduced
motion.
