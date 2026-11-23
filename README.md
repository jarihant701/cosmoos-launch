# CosmoOS launch site

A static, single-page launch site for **CosmoOS** ("Your universe. One workspace."), the creator operating system
for brand deals. Plain HTML and CSS: no build step, no framework. The only third-party code is Hostinger Reach's form embed
script; the Manrope font is self-hosted.

## Run it locally

```powershell
python -m http.server 4321 --directory D:\AI\cosmoos-launch
```

Then open http://localhost:4321. Opening `index.html` directly from disk also works.

## Waitlist (Hostinger Reach)

Both waitlist spots (hero and closing band) embed the **Hostinger Reach** signup form `CosmoOs`
(form ID `34a947fa-79d6-45b9-97e0-df93e1c061fc`, profile `cosmoos.tech`). The page loads
`https://cdn-reach.hostinger.com/js/embed.js`, which turns each `<div data-reach-form="…">` into an iframe served
from `reach-forms.hostingerusercontent.com`. Reach handles the submission, validation, double opt-in (if enabled)
and the thank-you state, so the site holds no API token and no form code of its own. Without JavaScript, a
`<noscript>` link opens the hosted form instead.

- **Signups** appear in Reach under Contacts, tagged `form:CosmoOs` and `waitlist`.
- **Form design** (colours, copy, button) lives in Reach, not in this repository. It was set to match the page:
  navy `#101B2D` background, teal `#20B8B0` button, 10px radius. Edit it in Reach → Forms; after editing an active
  form, pause it and set it active again to publish the change.
- **Turning the waitlist off:** pause the form in Reach. The iframe then stops accepting submissions.
- **Privacy:** [`privacy.html`](privacy.html) is the privacy notice (India DPDP Act 2023 and GDPR basics: what is
  collected, why, Hostinger and GitHub as processors, retention, rights, contact `hello@cosmoos.tech`). A consent line
  under each form links to it, the footer links to it, and Reach's profile `privacy_policy_url` points at it. Update the
  notice and its "Last updated" date before collecting anything beyond an email address or using it for a new
  purpose. It has not been reviewed by a lawyer.
- **Emails:** Reach sends as `CosmoOS <hello@cosmoos.tech>`. On the Reach 100 plan, automations and transactional
  emails are locked, so the only automatic email is the double opt-in confirmation.

## Deploy on GitHub Pages

1. On GitHub, open the repository's **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder
   `/ (root)`, and save.
2. The site is served at **https://cosmoos.tech** (custom domain from the `CNAME` file; DNS at Hostinger points the
   apex A/AAAA records at GitHub Pages and `www` at `jarihant701.github.io`). `jarihant701.github.io/cosmoos-launch/`
   redirects there. Turn on **Enforce HTTPS** in Settings → Pages once the certificate is issued.

GitHub Pages from a **private** repository needs a paid GitHub plan (Pro, Team or Enterprise). On a free plan, make
the repository public first (Settings → General → Danger Zone → Change visibility). The repository contains no
secrets, so that is safe.

Any other static host (Cloudflare Pages, Netlify, Hostinger web hosting) also works: upload the folder as-is.

## Files

| Path | Purpose |
|---|---|
| `index.html` | The page: hero with the feedback-check demonstration, deal flow, features, principles, FAQ, waitlist. |
| `privacy.html` | Privacy notice for the waitlist, linked from the forms and footer. |
| `styles.css` | All styling. Tokens follow the app's DESIGN.md: teal `#20B8B0`, midnight navy `#101B2D`, Manrope, 10px radius. |
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

Semantic landmarks and headings, a skip link, labelled form fields (the Reach form's email field carries an `aria-label`), visible focus, WCAG AA text contrast (checked with Impeccable's detector), and no motion when the visitor prefers reduced
motion.
