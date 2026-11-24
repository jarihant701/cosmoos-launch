# CosmoOS launch site

A static, single-page launch site for **CosmoOS** ("Your universe. One workspace."), the creator operating system
for brand deals. Plain HTML, CSS and a little vanilla JavaScript (the demo and an analytics-ready event layer): no build step, no framework. The only third-party scripts are Hostinger Reach's form embed
and the Cloudflare Web Analytics beacon; the Manrope font is self-hosted.

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
  collected, why, Hostinger, GitHub and Cloudflare as processors, retention, rights, contact `hello@cosmoos.tech`). A consent line
  under each form links to it, the footer links to it, and Reach's profile `privacy_policy_url` points at it. Update the
  notice and its "Last updated" date before collecting anything beyond an email address or using it for a new
  purpose. It has not been reviewed by a lawyer.
- **Emails:** Reach sends as `CosmoOS <hello@cosmoos.tech>`. On the Reach 100 plan, automations and transactional
  emails are locked, so the only automatic email is the double opt-in confirmation.

## Interactive demo

`demo.html` is a product preview with sample data, not the product. It runs entirely in the page: no sign-in,
storage, cookies, network calls or AI. Reloading resets it.

- **Intro:** what the demo shows, three expectations (about 60 seconds, no account, sample data only) and two ways in:
  **Explore the sample project** starts the guided walkthrough, **Try Feedback Check** jumps straight to it.
- **Guided walkthrough:** an optional three-step guide shown inline between the tabs and the panel (Deal → Planner →
  Feedback Check). It outlines the relevant controls without covering or dimming anything, shows "Step n of 3",
  marks each step's suggested action as done when the visitor does it, supports Back/Next/Skip and Escape, and can
  be replayed. "Start over" closes it and clears its progress. State is in memory only.
- **Deal:** the approved, locked brief; deliverable statuses; a sample invoice that can be marked paid or unpaid.
- **Planner:** add posts (empty titles are rejected), click a status to move it from Idea to Posted, remove posts.
- **Feedback Check:** three sample client messages with **predefined** findings, labelled "Interactive example:
  predefined results, no live AI." Findings are grouped into possible scope changes and within-scope requests, each
  with the agreed brief terms, plus the revision impact (included, used, remaining). Recording a round past the
  allowance explains that it may need a separate agreement or an additional quote; it never creates an invoice.
- **Sample currency:** USD (default), EUR, GBP or INR. Each has its own round sample fee (1,200 / 1,100 / 950 /
  40,000). These are illustrative figures, not exchange-rate conversions, and the page says so. The demo takes no
  payments.
- **Waitlist links** go to `./#join` on the homepage, which keeps the single Hostinger Reach form.

To change the sample data, edit `freshState()`, `SAMPLES`, `TOUR` and `CURRENCIES` at the top of `demo.js`.

## Cloudflare Web Analytics

`index.html`, `demo.html` and `privacy.html` load Cloudflare's cookieless Web Analytics beacon just before
`</body>`. It reports page views, visits, referrers, countries, devices and page-load performance to the Cloudflare
dashboard (Analytics & Logs, then Web Analytics, site `cosmoos.tech`). The `token` in the snippet is a public site
identifier designed to be in page source; it is not a secret. Cloudflare only records visits on the hostname the site
is registered for, so local runs on `localhost` are not counted. Data can take a few minutes to appear.

Cloudflare Web Analytics does not accept custom events, so the demo events below stay in the browser. To remove
analytics, delete the beacon `<script>` from the three pages and the Cloudflare line from `privacy.html`. If you add
any other page, add the beacon to it too.

## Analytics events

`analytics.js` defines `window.cosmoosAnalytics.track(name, props)`. No provider receives these events (Cloudflare Web Analytics counts page views only): each event
is appended to the in-memory `window.cosmoosAnalytics.events` list and dispatched as a `cosmoos:analytics`
`CustomEvent` on `window` (detail: `{ name, props, at }`). Nothing leaves the browser, and no cookies, storage or
identifiers are used. To connect a provider later, add one listener for `cosmoos:analytics` and forward events.

Only allowlisted event names and property keys (`tab`, `step`, `sample`, `currency`, `source`, `paid`, `revision`)
are accepted, and values must be short slugs, numbers or booleans. Post titles, message text and any personal data
are never included.

| Event | When it fires | Properties |
|---|---|---|
| `demo_started` | First interaction with the demo in a page load (intro buttons, tabs or any control) | `source` |
| `demo_walkthrough_started` | Walkthrough opened (Explore button or Replay) | none |
| `demo_walkthrough_completed` | Visitor pressed Finish on step 3 | none |
| `demo_walkthrough_skipped` | Walkthrough closed before finishing (Skip, close button or Escape) | `step` |
| `demo_tab_viewed` | The selected tab changed | `tab`: `deal`, `plan`, `feedback` |
| `demo_feedback_sample_selected` | A sample message was selected | `sample`: `tiktok`, `edits`, `usage` |
| `demo_revision_recorded` | "Record as a revision round" pressed | `revision`: running count |
| `demo_post_added` | A post was added to the planner (the title is not sent) | `tab` |
| `demo_invoice_toggled` | Sample invoice marked paid or unpaid | `paid` |
| `demo_currency_changed` | Sample currency changed | `currency` |
| `demo_reset` | "Start over" pressed | none |
| `demo_waitlist_clicked` | A waitlist link in the demo was clicked (a click, not a signup) | `source`: `header`, `walkthrough`, `feedback`, `closing` |
| `homepage_demo_clicked` | A demo link on the homepage was clicked | `source`: `header`, `hero`, `example`, `faq` |
| `homepage_waitlist_clicked` | The header "Join the waitlist" link was clicked (a click, not a signup) | `source` |
| `waitlist_form_submitted` | Reach's embed reported that it accepted a signup (`reach:form-submitted`) | `source`: `hero`, `closing` |

**Measuring signups:** a click on a waitlist link is not a signup. `waitlist_form_submitted` comes from the
`reach:form-submitted` event that Hostinger Reach's `embed.js` dispatches on the form container after Reach accepts a
submission. With double opt-in on, the address is still pending until the visitor confirms by email; confirmations
happen in the visitor's inbox and can only be counted in Reach (Contacts, `waitlist` tag). The iframe is
cross-origin, so nothing else about the submission is visible to the page.

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
| `demo.html`, `demo.js`, `demo.css` | Interactive demo with a sample brand deal (see below). |
| `analytics.js` | Analytics-ready event layer used by the homepage and demo. Sends nothing (see below). |
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
