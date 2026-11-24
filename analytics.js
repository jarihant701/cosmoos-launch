// CosmoOS launch site: analytics-ready event layer. It sends NOTHING anywhere.
//
// Every event is (1) kept in an in-memory list, window.cosmoosAnalytics.events, and (2) dispatched as a DOM
// CustomEvent named "cosmoos:analytics" on window, with { name, props, at } as its detail. To connect an analytics
// provider later, listen for that event in one place and forward it. Until then, no network call, cookie, storage
// or identifier is involved, and the list disappears when the page closes.
//
// Privacy rules enforced here: only allowlisted event names, only allowlisted property keys, and only short
// string or number values. Never pass personal data, typed text (such as post titles) or message contents.
// The full event list and the meaning of each event are documented in README.md.
;(function () {
  'use strict'

  var EVENTS = [
    'demo_started',
    'demo_walkthrough_started',
    'demo_walkthrough_completed',
    'demo_walkthrough_skipped',
    'demo_tab_viewed',
    'demo_feedback_sample_selected',
    'demo_revision_recorded',
    'demo_post_added',
    'demo_invoice_toggled',
    'demo_currency_changed',
    'demo_reset',
    'demo_waitlist_clicked',
    'homepage_demo_clicked',
    'homepage_waitlist_clicked',
    'waitlist_form_submitted',
  ]
  var PROPS = ['tab', 'step', 'sample', 'currency', 'source', 'paid', 'revision']

  function clean(props) {
    var out = {}
    if (!props) return out
    PROPS.forEach(function (key) {
      var value = props[key]
      if (typeof value === 'number' && isFinite(value)) out[key] = value
      else if (typeof value === 'boolean') out[key] = value
      else if (typeof value === 'string' && /^[a-z0-9_-]{1,32}$/.test(value)) out[key] = value
    })
    return out
  }

  var events = []

  function track(name, props) {
    if (EVENTS.indexOf(name) === -1) return
    var entry = { name: name, props: clean(props), at: Date.now() }
    events.push(entry)
    try {
      window.dispatchEvent(new CustomEvent('cosmoos:analytics', { detail: entry }))
    } catch (e) {
      // Very old browsers without CustomEvent: the in-memory list is still updated.
    }
  }

  window.cosmoosAnalytics = { track: track, events: events }

  // Links and buttons can declare an event in markup: data-track="name" data-track-source="hero".
  document.addEventListener('click', function (event) {
    var target = event.target.closest ? event.target.closest('[data-track]') : null
    if (!target) return
    track(target.getAttribute('data-track'), { source: target.getAttribute('data-track-source') || undefined })
  })

  // The Hostinger Reach embed dispatches "reach:form-submitted" on the form container after Reach accepts a
  // signup. This is the only real signup signal available: it means the form was accepted (with double opt-in,
  // the address is still pending until the visitor confirms by email). A click on a waitlist link is NOT a signup.
  document.addEventListener('reach:form-submitted', function (event) {
    var container = event.target && event.target.closest ? event.target.closest('[data-track-source]') : null
    track('waitlist_form_submitted', { source: container ? container.getAttribute('data-track-source') : undefined })
  })
})()
