# CosmoOS launch site

A static, single-page launch site for **CosmoOS** ("Your universe. One workspace."), the creator operating system
for brand deals. Plain HTML, CSS and a few lines of JavaScript: no build step, no framework, no third-party requests
at runtime (the Manrope font is self-hosted).

## Run it locally

```powershell
python -m http.server 4321 --directory D:\AI\cosmoos-launch
```

Then open http://localhost:4321. Opening `index.html` directly from disk also works.

## Turn on the waitlist

The waitlist forms post to a form service you control. Until an endpoint is set, both forms stay hidden and the page
shows "The waitlist opens soon", so visitors never meet a dead button.

1. Create a free form on a service that accepts a plain POST and answers JSON when sent `Accept: application/json`,
   for example [Formspree](https://formspree.io), Getform or Basin. Formspree gives you a URL like
   `https://formspree.io/f/abcd1234`.
2. Paste that URL into the one setting in `index.html`:

   ```html
   <meta name="waitlist-endpoint" content="https://formspree.io/f/abcd1234" />
   ```

3. Reload the page and submit a test address. Entries appear in the form service's dashboard.

Each submission sends `email` plus an empty `_gotcha` honeypot field (Formspree drops entries where it is filled).
Only `https://` endpoints are accepted. The page tells visitors their email is used only to invite them to early
access: keep it that way, or update that sentence and add a privacy notice before collecting more.

## Deploy

Any static host works; upload the folder as-is:

- **Cloudflare Pages:** create a project, choose direct upload, and drop this folder.
- **Netlify:** drag this folder onto app.netlify.com/drop.
- **GitHub Pages:** push this repository and enable Pages for the default branch, root folder.

No server code, environment variables or secrets are involved.

## Files

| Path | Purpose |
|---|---|
| `index.html` | The page: hero with the feedback-check demonstration, deal flow, features, principles, FAQ, waitlist. |
| `styles.css` | All styling. Tokens follow the app's DESIGN.md: teal `#20B8B0`, midnight navy `#101B2D`, Manrope, 10px radius. |
| `site.js` | Waitlist behaviour: reads the endpoint, submits with `fetch`, shows success or a retryable error. |
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
