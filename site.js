// CosmoOS launch site: waitlist forms.
// The endpoint lives in one place: <meta name="waitlist-endpoint"> in index.html. Point it at the waitlist relay in
// worker/ (a Cloudflare Worker that adds the email to Hostinger Reach with the API token kept server-side). Any
// service that accepts a POST of form fields and answers JSON to `Accept: application/json` also works.
// With no endpoint configured, the forms stay hidden and the "opens soon" note stays visible: never a dead button.
;(function () {
  'use strict'

  var meta = document.querySelector('meta[name="waitlist-endpoint"]')
  var endpoint = meta ? meta.getAttribute('content').trim() : ''
  var forms = document.querySelectorAll('[data-waitlist]')
  var closedNotes = document.querySelectorAll('[data-waitlist-closed]')

  if (!/^https:\/\/\S+$/.test(endpoint)) return

  closedNotes.forEach(function (note) {
    note.hidden = true
  })

  forms.forEach(function (form) {
    form.action = endpoint
    form.hidden = false
    var button = form.querySelector('button[type="submit"]')
    var input = form.querySelector('input[type="email"]')
    var status = form.querySelector('.waitlist__status')
    var label = button.textContent

    function show(message, tone) {
      status.textContent = message
      status.dataset.tone = tone
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      if (button.disabled) return
      if (!input.checkValidity()) {
        show('Enter a valid email address, like you@example.com.', 'error')
        input.focus()
        return
      }

      button.disabled = true
      button.textContent = 'Joining…'
      show('', '')

      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (response) {
          if (response.ok) {
            form.reset()
            show("You're on the list. Check your inbox: if a confirmation email arrives, open it to confirm.", 'success')
            return
          }
          // Keep what they typed so a retry is one click.
          if (response.status === 422) {
            show("That email address doesn't look right. Check it and try again.", 'error')
            input.focus()
          } else if (response.status === 429) {
            show('A lot of people are signing up right now. Try again in a minute.', 'error')
          } else {
            show("We couldn't add you just now. Please try again in a moment.", 'error')
          }
        })
        .catch(function () {
          show("We couldn't reach the waitlist. Check your connection and try again.", 'error')
        })
        .then(function () {
          button.disabled = false
          button.textContent = label
        })
    })
  })
})()
