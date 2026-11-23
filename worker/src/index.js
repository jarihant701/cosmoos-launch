// CosmoOS waitlist relay: a Cloudflare Worker between the static launch site (GitHub Pages) and Hostinger Reach.
//
// Why it exists: the Reach API authenticates with a Hostinger account API token that carries the SAME permissions as
// the account owner. That token must never be shipped to a browser, so the page posts the email here and only this
// Worker calls Reach, with the token stored as an encrypted Worker secret.
//
// Reach contract (developers.hostinger.com OpenAPI, current, non-deprecated):
//   POST https://developers.hostinger.com/api/reach/v1/profiles/{profileUuid}/contacts
//   Authorization: Bearer <token>, JSON body { email, note?, tag_uuids? }
//   200 "Request accepted" | 422 validation errors | 401 unauthenticated | 429 rate limited | 500 error
//   With double opt-in enabled in Reach, the contact starts as pending and Reach sends the confirmation email.
//
// Configuration (wrangler.toml [vars] and secrets):
//   ALLOWED_ORIGINS      comma-separated site origins allowed to post, e.g. https://jarihant701.github.io
//   REACH_PROFILE_UUID   the Reach profile to add contacts to (GET /api/reach/v1/profiles)
//   REACH_TAG_UUID       optional existing Reach tag to attach, e.g. a "waitlist" tag
//   HOSTINGER_API_TOKEN  SECRET, set with `npx wrangler secret put HOSTINGER_API_TOKEN`

const REACH_BASE = 'https://developers.hostinger.com/api/reach/v1'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOTE = 'CosmoOS waitlist (launch site)'

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origin ? corsHeaders(origin) : {}),
    },
  })
}

async function readEmailAndHoneypot(request) {
  const type = request.headers.get('Content-Type') || ''
  if (type.includes('application/json')) {
    const body = await request.json()
    return { email: body && body.email, honeypot: body && body._gotcha }
  }
  // The site posts FormData (multipart) or a classic url-encoded form.
  const form = await request.formData()
  return { email: form.get('email'), honeypot: form.get('_gotcha') }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = allowedOrigins(env)
    const originOk = allowed.includes(origin)

    if (request.method === 'OPTIONS') {
      return originOk ? new Response(null, { status: 204, headers: corsHeaders(origin) }) : new Response(null, { status: 403 })
    }
    if (request.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' })
    // Browsers always send Origin on cross-site POSTs; anything else is not our page.
    if (!originOk) return json(403, { ok: false, error: 'forbidden' })

    if (!env.HOSTINGER_API_TOKEN || !env.REACH_PROFILE_UUID) {
      return json(503, { ok: false, error: 'not_configured' }, origin)
    }

    let email
    let honeypot
    try {
      ;({ email, honeypot } = await readEmailAndHoneypot(request))
    } catch {
      return json(400, { ok: false, error: 'invalid_request' }, origin)
    }

    // A filled honeypot is a bot: answer as if it worked and send nothing to Reach.
    if (typeof honeypot === 'string' && honeypot.trim() !== '') return json(200, { ok: true }, origin)

    email = typeof email === 'string' ? email.trim() : ''
    if (email.length > 254 || !EMAIL.test(email)) return json(422, { ok: false, error: 'invalid_email' }, origin)

    const payload = { email, note: NOTE }
    if (env.REACH_TAG_UUID) payload.tag_uuids = [env.REACH_TAG_UUID]

    let upstream
    try {
      upstream = await fetch(`${REACH_BASE}/profiles/${encodeURIComponent(env.REACH_PROFILE_UUID)}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.HOSTINGER_API_TOKEN}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch {
      return json(502, { ok: false, error: 'upstream_unavailable' }, origin)
    }

    // Never echo Reach's response body to the browser; map it to a small, safe vocabulary.
    if (upstream.ok) return json(200, { ok: true }, origin)
    if (upstream.status === 422) return json(422, { ok: false, error: 'invalid_email' }, origin)
    if (upstream.status === 429) return json(429, { ok: false, error: 'rate_limited' }, origin)
    // Log only the status and Reach's correlation id (for Hostinger support), never the email or the token.
    let correlationId = ''
    try {
      correlationId = (await upstream.json()).correlation_id || ''
    } catch {
      // Body was not JSON; the status is enough.
    }
    console.error('Reach responded', upstream.status, correlationId)
    return json(502, { ok: false, error: 'upstream_error' }, origin)
  },
}
