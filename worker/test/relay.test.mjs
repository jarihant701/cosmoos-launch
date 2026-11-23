// Run with: node --test worker/test   (Node 20+, no dependencies). Reach is stubbed; nothing leaves the machine.
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import worker from '../src/index.js'

const SITE = 'https://jarihant701.github.io'
const ENV = {
  ALLOWED_ORIGINS: SITE,
  REACH_PROFILE_UUID: 'profile-123',
  REACH_TAG_UUID: 'tag-waitlist',
  HOSTINGER_API_TOKEN: 'test-token-not-real',
}
const realFetch = globalThis.fetch
let calls = []

function stubReach(status, body = { message: 'Request accepted' }) {
  calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
}

function post(fields, { origin = SITE } = {}) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.set(k, v)
  return new Request('https://relay.example/', {
    method: 'POST',
    headers: origin ? { Origin: origin, Accept: 'application/json' } : { Accept: 'application/json' },
    body: form,
  })
}

afterEach(() => {
  globalThis.fetch = realFetch
})

test('adds a valid email to the configured Reach profile with the token server-side', async () => {
  stubReach(200)
  const res = await worker.fetch(post({ email: '  friend@example.com ', _gotcha: '' }), ENV)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), SITE)

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://developers.hostinger.com/api/reach/v1/profiles/profile-123/contacts')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token-not-real')
  const sent = JSON.parse(calls[0].init.body)
  assert.equal(sent.email, 'friend@example.com')
  assert.deepEqual(sent.tag_uuids, ['tag-waitlist'])
  assert.ok(sent.note.length <= 75, 'Reach note max length is 75')
})

test('never returns the token or the upstream body to the browser', async () => {
  stubReach(500, { message: 'internal detail', correlation_id: 'abc' })
  const res = await worker.fetch(post({ email: 'friend@example.com' }), ENV)
  const text = await res.text()
  assert.equal(res.status, 502)
  assert.ok(!text.includes('test-token-not-real'))
  assert.ok(!text.includes('internal detail'))
  assert.deepEqual(JSON.parse(text), { ok: false, error: 'upstream_error' })
})

test('rejects posts from other origins or without an Origin', async () => {
  stubReach(200)
  const other = await worker.fetch(post({ email: 'a@b.co' }, { origin: 'https://evil.example' }), ENV)
  const none = await worker.fetch(post({ email: 'a@b.co' }, { origin: null }), ENV)
  assert.equal(other.status, 403)
  assert.equal(none.status, 403)
  assert.equal(calls.length, 0)
})

test('rejects invalid emails before calling Reach', async () => {
  stubReach(200)
  for (const email of ['', 'not-an-email', 'a@b', `${'x'.repeat(250)}@example.com`]) {
    const res = await worker.fetch(post({ email }), ENV)
    assert.equal(res.status, 422, email)
  }
  assert.equal(calls.length, 0)
})

test('treats a filled honeypot as a bot: reports success, sends nothing', async () => {
  stubReach(200)
  const res = await worker.fetch(post({ email: 'bot@example.com', _gotcha: 'http://spam' }), ENV)
  assert.equal(res.status, 200)
  assert.equal(calls.length, 0)
})

test('maps Reach validation and rate-limit responses', async () => {
  stubReach(422, { message: 'The email must be a valid email address.' })
  assert.equal((await worker.fetch(post({ email: 'friend@example.com' }), ENV)).status, 422)
  stubReach(429, { message: 'Too Many Requests' })
  const limited = await worker.fetch(post({ email: 'friend@example.com' }), ENV)
  assert.equal(limited.status, 429)
  assert.deepEqual(await limited.json(), { ok: false, error: 'rate_limited' })
})

test('reports not_configured until the token and profile are set', async () => {
  stubReach(200)
  const res = await worker.fetch(post({ email: 'friend@example.com' }), { ...ENV, HOSTINGER_API_TOKEN: '' })
  assert.equal(res.status, 503)
  assert.equal(calls.length, 0)
})

test('answers the CORS preflight only for allowed origins', async () => {
  const ok = await worker.fetch(new Request('https://relay.example/', { method: 'OPTIONS', headers: { Origin: SITE } }), ENV)
  const bad = await worker.fetch(
    new Request('https://relay.example/', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }),
    ENV,
  )
  assert.equal(ok.status, 204)
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), SITE)
  assert.equal(bad.status, 403)
})

test('refuses non-POST methods', async () => {
  const res = await worker.fetch(new Request('https://relay.example/', { method: 'GET' }), ENV)
  assert.equal(res.status, 405)
})
