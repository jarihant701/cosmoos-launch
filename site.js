// CosmoOS launch site: waitlist forms.
// The endpoint lives in one place: <meta name="waitlist-endpoint"> in index.html. It works with form services that
// accept a POST of form fields and answer JSON when sent `Accept: application/json` (Formspree, Getform, Basin...).
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
          if (!response.ok) throw new Error('status ' + response.status)
          form.reset()
          show("You're on the list. We'll email you when your invitation is ready.", 'success')
        })
        .catch(function () {
          // Keep what they typed so a retry is one click.
          show("We couldn't add you just now. Check your connection and try again.", 'error')
        })
        .then(function () {
          button.disabled = false
          button.textContent = label
        })
    })
  })
})()
