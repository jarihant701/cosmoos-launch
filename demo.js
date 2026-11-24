// CosmoOS demo: a sample brand deal that runs entirely in this page.
// No sign-in, no network calls, no AI and no storage: state lives in memory and resets on reload.
;(function () {
  'use strict'

  var REVISION_LIMIT = 1
  var STATUSES = ['Idea', 'Drafted', 'Scheduled', 'Posted']
  var DELIVERY_STATUSES = ['Not started', 'In progress', 'Delivered']

  // Sample fees per currency. Deliberately round, illustrative figures: not exchange-rate conversions.
  var CURRENCIES = {
    USD: { fee: 1200, locale: 'en-US' },
    EUR: { fee: 1100, locale: 'en-IE' },
    GBP: { fee: 950, locale: 'en-GB' },
    INR: { fee: 40000, locale: 'en-IN' },
  }

  // Predefined results for the sample messages. The full product compares any pasted feedback with the brief.
  var SAMPLES = [
    {
      id: 'tiktok',
      label: 'New format and paid ads',
      text: 'Love the first cut! Could you also make a TikTok version, and can we run the reel as a paid ad next month?',
      usesRevision: true,
      findings: [
        { kind: 'scope', text: "Adding a TikTok version introduces a deliverable that wasn't included in the brief.", terms: '2 Instagram Reels, 30–45 seconds.' },
        { kind: 'scope', text: 'Paid advertising use extends beyond the agreed organic-only rights.', terms: 'Organic use only, 3 months.' },
        { kind: 'ok', text: 'Feedback on the first cut counts as a revision round.', terms: '1 round of revisions included.' },
      ],
    },
    {
      id: 'edits',
      label: 'Edits to the Reel',
      text: 'Can you make the product label more visible and swap the music for something calmer?',
      usesRevision: true,
      findings: [
        { kind: 'ok', text: 'Changes to an agreed Reel fit the brief and count as a revision round.', terms: '1 round of revisions included.' },
      ],
    },
    {
      id: 'usage',
      label: 'Longer usage and raw files',
      text: "Great work! We'd like to use the reels for 12 months, and could you send us the raw footage?",
      usesRevision: false,
      findings: [
        { kind: 'scope', text: 'Using the Reels for 12 months is longer than the agreed period.', terms: 'Organic use only, 3 months.' },
        { kind: 'scope', text: 'Raw footage is not one of the agreed deliverables.', terms: '2 Instagram Reels, 30–45 seconds.' },
      ],
    },
  ]

  var TOUR = [
    {
      tab: 'deal',
      title: 'Understand the deal',
      text: 'Every brand collaboration starts with an approved brief. Keep your deliverables, terms, and payments connected.',
      task: "Change a deliverable's status.",
      targets: ['brief', 'deliverables', 'revisions', 'invoice'],
    },
    {
      tab: 'plan',
      title: 'Plan your content',
      text: 'Turn brand commitments into organized content you can plan and track.',
      task: 'Add a post to your schedule.',
      targets: ['week', 'post-form', 'status-hint'],
    },
    {
      tab: 'feedback',
      title: 'Check client feedback',
      text: 'See how a client request compares with the terms you originally agreed to.',
      task: 'Select a sample message and review the findings.',
      targets: ['samples', 'findings'],
    },
  ]

  var state
  var tour = { open: false, step: 0, done: [false, false, false], finished: false }
  var started = false
  var currency = 'USD'

  function freshState() {
    return {
      deliverables: [
        { name: 'Reel 1 · Morning routine', due: 3, status: 1 },
        { name: 'Reel 2 · Serum close-up', due: 6, status: 0 },
      ],
      posts: [
        { title: 'Teaser: something new on my shelf', platform: 'Instagram', day: 1, status: 2 },
        { title: 'Reel 1 · Morning routine', platform: 'Instagram', day: 3, status: 1 },
        { title: 'Behind the scenes of the shoot', platform: 'YouTube', day: 5, status: 0 },
      ],
      revisionsUsed: 0,
      recorded: {},
      paid: false,
      sample: null,
    }
  }

  // ---------- Helpers ----------

  function $(selector) {
    return document.querySelector(selector)
  }
  function $$(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector))
  }
  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text != null) node.textContent = text
    return node
  }
  function track(name, props) {
    if (window.cosmoosAnalytics) window.cosmoosAnalytics.track(name, props)
  }
  function markStarted(source) {
    if (started) return
    started = true
    track('demo_started', { source: source })
  }
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  function scrollTo(node) {
    node.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  var dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  function dayLabel(offset) {
    var date = new Date()
    date.setDate(date.getDate() + offset)
    var label = dayFormat.format(date)
    if (offset === 0) return 'Today, ' + label
    if (offset === 1) return 'Tomorrow, ' + label
    return label
  }
  function money(amount) {
    var c = CURRENCIES[currency]
    return new Intl.NumberFormat(c.locale, { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(amount)
  }
  function announce(message) {
    var live = $('[data-live]')
    live.textContent = ''
    window.setTimeout(function () {
      live.textContent = message
    }, 30)
  }
  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many)
  }

  // ---------- Rendering ----------

  function renderStats() {
    var open = state.deliverables.filter(function (d) {
      return d.status < 2
    }).length
    $('[data-stat="open"]').textContent = String(open)
    var revisions = $('[data-stat="revisions"]')
    revisions.textContent = state.revisionsUsed + ' of ' + REVISION_LIMIT
    revisions.classList.toggle('is-over', state.revisionsUsed > REVISION_LIMIT)
    $('[data-stat="posts"]').textContent = String(state.posts.length)
    $('[data-stat="owed"]').textContent = money(state.paid ? 0 : CURRENCIES[currency].fee)
  }

  function renderMoney() {
    var fee = money(CURRENCIES[currency].fee)
    $('[data-fee-line]').textContent = fee + ' (sample), due 15 days after delivery'
    $('[data-invoice-amount]').textContent = fee
  }

  function renderDeliverables() {
    var list = $('[data-list="deliverables"]')
    list.replaceChildren()
    state.deliverables.forEach(function (d, index) {
      var item = el('li', 'row')
      var text = el('div')
      text.append(el('p', 'row__title', d.name), el('p', 'row__meta', 'Due ' + dayLabel(d.due)))
      var select = el('select', 'status-select')
      select.id = 'deliverable-' + index
      select.setAttribute('aria-label', 'Status of ' + d.name)
      DELIVERY_STATUSES.forEach(function (label, i) {
        var option = el('option', null, label)
        option.value = String(i)
        option.selected = i === d.status
        select.append(option)
      })
      select.dataset.status = String(d.status)
      select.addEventListener('change', function () {
        markStarted('deliverable')
        d.status = Number(select.value)
        select.dataset.status = select.value
        renderStats()
        completeTask(0)
        announce(d.name + ' is now ' + DELIVERY_STATUSES[d.status] + '.')
      })
      item.append(text, select)
      list.append(item)
    })
  }

  function renderInvoice() {
    $('[data-invoice-meta]').textContent = state.paid
      ? 'Marked as paid (sample)'
      : 'Sent, waiting for payment (sample)'
    var button = $('[data-action="toggle-paid"]')
    button.textContent = state.paid ? 'Mark as unpaid' : 'Mark as paid'
    button.setAttribute('aria-pressed', String(state.paid))
    $('.invoice').classList.toggle('is-paid', state.paid)
  }

  function renderDays() {
    var select = $('[data-days]')
    if (select.options.length) return
    for (var offset = 0; offset < 7; offset++) {
      var option = el('option', null, dayLabel(offset))
      option.value = String(offset)
      select.append(option)
    }
  }

  function renderWeek() {
    var list = $('[data-list="week"]')
    list.replaceChildren()
    for (var offset = 0; offset < 7; offset++) {
      var posts = state.posts.filter(
        (function (day) {
          return function (p) {
            return p.day === day
          }
        })(offset),
      )
      var day = el('li', 'week__day')
      day.append(el('p', 'week__label', dayLabel(offset)))
      if (!posts.length) day.append(el('p', 'week__empty', 'Nothing planned'))
      posts.forEach(function (post) {
        var row = el('div', 'post')
        var info = el('div', 'post__info')
        info.append(el('span', 'chip', post.platform), el('p', 'post__title', post.title))
        var status = el('button', 'post__status', STATUSES[post.status])
        status.type = 'button'
        status.dataset.status = String(post.status)
        status.setAttribute(
          'aria-label',
          post.title + ': ' + STATUSES[post.status] + '. Move to ' + STATUSES[(post.status + 1) % STATUSES.length],
        )
        status.addEventListener('click', function () {
          markStarted('post_status')
          post.status = (post.status + 1) % STATUSES.length
          renderWeek()
          announce(post.title + ' is now ' + STATUSES[post.status] + '.')
          focusPost(post, '.post__status')
        })
        var remove = el('button', 'post__remove')
        remove.type = 'button'
        remove.setAttribute('aria-label', 'Remove ' + post.title)
        remove.innerHTML =
          '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18"/></svg>'
        remove.addEventListener('click', function () {
          markStarted('post_remove')
          state.posts = state.posts.filter(function (p) {
            return p !== post
          })
          renderWeek()
          renderStats()
          announce('Removed ' + post.title + '.')
          $('[data-list="week"]').closest('.sheet').querySelector('h3').setAttribute('tabindex', '-1')
          $('[data-list="week"]').closest('.sheet').querySelector('h3').focus()
        })
        row.dataset.postIndex = String(state.posts.indexOf(post))
        row.append(info, status, remove)
        day.append(row)
      })
      list.append(day)
    }
  }

  function focusPost(post, selector) {
    var index = state.posts.indexOf(post)
    var row = $('.post[data-post-index="' + index + '"]')
    if (row) row.querySelector(selector).focus()
  }

  function renderSamples() {
    var list = $('[data-list="samples"]')
    list.replaceChildren()
    SAMPLES.forEach(function (sample, index) {
      var id = 'sample-' + sample.id
      var option = el('label', 'message')
      option.setAttribute('for', id)
      var input = el('input')
      input.type = 'radio'
      input.name = 'sample'
      input.id = id
      input.value = sample.id
      input.checked = state.sample === sample.id
      input.addEventListener('change', function () {
        markStarted('feedback')
        state.sample = sample.id
        renderResults(true)
        completeTask(2)
        track('demo_feedback_sample_selected', { sample: sample.id })
      })
      var body = el('span', 'message__body')
      body.append(el('span', 'message__label', 'Message ' + (index + 1) + ': ' + sample.label), el('span', 'message__text', '“' + sample.text + '”'))
      option.append(input, body)
      list.append(option)
    })
  }

  function currentSample() {
    return SAMPLES.find(function (s) {
      return s.id === state.sample
    })
  }

  function renderFinding(f) {
    var item = el('li', 'finding finding--' + f.kind)
    item.append(
      el('p', 'finding__kind', f.kind === 'scope' ? 'Possible scope change' : 'Within scope'),
      el('p', 'finding__text', f.text),
    )
    var terms = el('p', 'finding__terms')
    terms.append(el('span', 'finding__terms-label', 'Agreed terms'), el('span', null, '“' + f.terms + '”'))
    item.append(terms)
    return item
  }

  function renderResults(announceIt) {
    var sample = currentSample()
    $('[data-results-empty]').hidden = !!sample
    $('[data-results]').hidden = !sample
    if (!sample) return
    var scope = sample.findings.filter(function (f) {
      return f.kind === 'scope'
    })
    var ok = sample.findings.filter(function (f) {
      return f.kind === 'ok'
    })
    $('[data-group="scope"]').hidden = !scope.length
    $('[data-group="ok"]').hidden = !ok.length
    $('[data-scope-heading]').textContent = plural(scope.length, 'possible scope change', 'possible scope changes')
    $('[data-ok-heading]').textContent = ok.length === 1 ? '1 request within scope' : ok.length + ' requests within scope'
    var scopeList = $('[data-list="scope"]')
    var okList = $('[data-list="ok"]')
    scopeList.replaceChildren.apply(scopeList, scope.map(renderFinding))
    okList.replaceChildren.apply(okList, ok.map(renderFinding))
    renderRevision(sample)
    if (announceIt) {
      announce(
        (scope.length ? plural(scope.length, 'possible scope change', 'possible scope changes') + ' flagged. ' : 'No scope changes flagged. ') +
          (ok.length ? plural(ok.length, 'request', 'requests') + ' within scope.' : ''),
      )
    }
  }

  function renderRevision(sample) {
    var used = state.revisionsUsed
    var remaining = Math.max(REVISION_LIMIT - used, 0)
    $('[data-revision-meter]').textContent =
      REVISION_LIMIT + ' included · ' + used + ' used · ' + remaining + ' remaining'
    var text = $('[data-revision-text]')
    var button = $('[data-action="record-revision"]')
    var confirm = $('[data-revision-confirm]')
    var recorded = !!state.recorded[sample.id]
    var block = $('.revision')
    block.classList.remove('is-over')
    confirm.textContent = ''

    if (!sample.usesRevision) {
      text.textContent = "This message doesn't ask for changes to an agreed deliverable, so no revision round is used."
      button.hidden = true
      return
    }
    button.hidden = false
    button.disabled = recorded
    button.textContent = recorded ? 'Recorded' : 'Record as a revision round'
    if (recorded) {
      var over = sample.recordedAs > REVISION_LIMIT
      confirm.textContent = over
        ? 'Recorded as revision ' + sample.recordedAs + '. The brief includes ' + plural(REVISION_LIMIT, 'round', 'rounds') + '.'
        : 'Recorded as revision ' + sample.recordedAs + ' of ' + REVISION_LIMIT + ' included.'
      text.textContent = over
        ? 'Extra rounds beyond the agreed allowance may need a separate agreement or an additional quote. Whether to ask for one is your decision.'
        : 'Saved to the project’s revision history.'
      block.classList.toggle('is-over', over)
      return
    }
    var next = used + 1
    if (next > REVISION_LIMIT) {
      text.textContent =
        'This would be revision ' + next + ', beyond the ' + plural(REVISION_LIMIT, 'round', 'rounds') +
        ' the brief includes. Extra rounds may need a separate agreement or an additional quote. Whether to ask for one is your decision.'
      block.classList.add('is-over')
    } else {
      text.textContent =
        'This would use revision ' + next + ' of ' + REVISION_LIMIT + ' included' +
        (REVISION_LIMIT - next === 0 ? ', the last one in the brief.' : ', leaving ' + plural(REVISION_LIMIT - next, 'round', 'rounds') + '.')
    }
  }

  function renderAll() {
    renderMoney()
    renderStats()
    renderDeliverables()
    renderInvoice()
    renderDays()
    renderWeek()
    renderSamples()
    renderResults(false)
  }

  // ---------- Tabs (WAI-ARIA tabs pattern) ----------

  var tabs = $$('[role="tab"]')
  var currentTab = 'deal'

  function selectTab(name, options) {
    options = options || {}
    var tab = document.getElementById('tab-' + name)
    tabs.forEach(function (t) {
      var selected = t === tab
      t.setAttribute('aria-selected', String(selected))
      t.tabIndex = selected ? 0 : -1
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected
    })
    if (options.focusTab) tab.focus()
    if (options.focusPanel) document.getElementById(tab.getAttribute('aria-controls')).focus({ preventScroll: true })
    if (currentTab !== name) {
      currentTab = name
      track('demo_tab_viewed', { tab: name })
    }
  }

  function setupTabs() {
    tabs.forEach(function (tab, index) {
      var name = tab.id.replace('tab-', '')
      tab.addEventListener('click', function () {
        markStarted('tab')
        selectTab(name)
        syncTourWithTab(name)
      })
      tab.addEventListener('keydown', function (event) {
        var next = null
        if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length]
        if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length]
        if (event.key === 'Home') next = tabs[0]
        if (event.key === 'End') next = tabs[tabs.length - 1]
        if (next) {
          event.preventDefault()
          var nextName = next.id.replace('tab-', '')
          selectTab(nextName, { focusTab: true })
          syncTourWithTab(nextName)
        }
      })
    })
  }

  // ---------- Guided walkthrough ----------

  var guide = $('[data-guide]')

  function clearHighlights() {
    $$('.is-tour-target').forEach(function (node) {
      node.classList.remove('is-tour-target')
    })
  }

  function renderTour(moveFocus) {
    clearHighlights()
    guide.hidden = !tour.open
    if (!tour.open) return
    var finished = tour.finished
    $('[data-guide-done]').hidden = !finished
    ;['[data-guide-progress]', '.guide__dots', '[data-guide-title]', '[data-guide-text]', '[data-guide-task]'].forEach(function (s) {
      $(s).hidden = finished
    })
    guide.querySelector('.guide__nav').hidden = finished
    guide.classList.toggle('is-finished', finished)
    if (finished) {
      if (moveFocus) $('[data-guide-done-title]').focus({ preventScroll: true })
      return
    }
    var step = TOUR[tour.step]
    $('[data-guide-progress]').textContent = 'Step ' + (tour.step + 1) + ' of ' + TOUR.length
    $$('.guide__dots li').forEach(function (dot, i) {
      dot.classList.toggle('is-current', i === tour.step)
      dot.classList.toggle('is-past', i < tour.step)
    })
    $('[data-guide-title]').textContent = step.title
    $('[data-guide-text]').textContent = step.text
    var task = $('[data-guide-task]')
    task.classList.toggle('is-done', tour.done[tour.step])
    $('[data-guide-task-text]').textContent = (tour.done[tour.step] ? 'Done: ' : 'Try it: ') + step.task
    $('[data-guide-back]').disabled = tour.step === 0
    $('[data-guide-next]').textContent = tour.step === TOUR.length - 1 ? 'Finish' : 'Next'
    step.targets.forEach(function (name) {
      var node = $('[data-tour="' + name + '"]')
      if (node) node.classList.add('is-tour-target')
    })
    if (moveFocus) $('[data-guide-title]').focus({ preventScroll: true })
  }

  function goToStep(index, moveFocus) {
    tour.step = index
    tour.finished = false
    selectTab(TOUR[index].tab)
    renderTour(moveFocus)
  }

  function startTour() {
    markStarted('walkthrough')
    tour = { open: true, step: 0, done: [false, false, false], finished: false }
    track('demo_walkthrough_started')
    goToStep(0, false)
    scrollTo($('.tabs'))
    $('[data-guide-title]').focus({ preventScroll: true })
  }

  function closeTour(reason) {
    if (!tour.open) return
    if (reason === 'skip' && !tour.finished) track('demo_walkthrough_skipped', { step: tour.step + 1 })
    tour.open = false
    renderTour(false)
  }

  function completeTask(stepIndex) {
    if (!tour.open || tour.finished) return
    tour.done[stepIndex] = true
    if (tour.step === stepIndex) renderTour(false)
  }

  // If the visitor uses the tabs directly during the walkthrough, follow them rather than fight them.
  function syncTourWithTab(name) {
    if (!tour.open || tour.finished) return
    var index = TOUR.findIndex(function (s) {
      return s.tab === name
    })
    if (index !== -1 && index !== tour.step) {
      tour.step = index
      renderTour(false)
    }
  }

  function setupTour() {
    $('[data-guide-next]').addEventListener('click', function () {
      if (tour.step < TOUR.length - 1) {
        goToStep(tour.step + 1, true)
      } else {
        tour.finished = true
        clearHighlights()
        track('demo_walkthrough_completed')
        renderTour(true)
      }
    })
    $('[data-guide-back]').addEventListener('click', function () {
      if (tour.step > 0) goToStep(tour.step - 1, true)
    })
    $$('[data-guide-skip]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeTour('skip')
        $('#tab-' + currentTab).focus()
      })
    })
    guide.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeTour('skip')
        $('#tab-' + currentTab).focus()
      }
    })
    $$('[data-action="replay"]').forEach(function (button) {
      button.addEventListener('click', startTour)
    })
  }

  // ---------- Actions ----------

  function setupActions() {
    $('[data-action="explore"]').addEventListener('click', startTour)

    $('[data-action="jump-feedback"]').addEventListener('click', function () {
      markStarted('jump_feedback')
      if (tour.open && !tour.finished) {
        tour.step = 2
        renderTour(false)
      }
      selectTab('feedback')
      scrollTo($('.tabs'))
      document.getElementById('panel-feedback').focus({ preventScroll: true })
    })

    $('[data-currency]').addEventListener('change', function (event) {
      markStarted('currency')
      currency = event.target.value
      renderMoney()
      renderStats()
      track('demo_currency_changed', { currency: currency.toLowerCase() })
      announce('Showing sample amounts in ' + currency + '.')
    })

    $('[data-action="toggle-paid"]').addEventListener('click', function () {
      markStarted('invoice')
      state.paid = !state.paid
      renderInvoice()
      renderStats()
      track('demo_invoice_toggled', { paid: state.paid })
      announce(state.paid ? 'Invoice marked as paid.' : 'Invoice marked as unpaid.')
    })

    $('[data-action="record-revision"]').addEventListener('click', function () {
      var sample = currentSample()
      if (!sample || state.recorded[sample.id]) return
      state.recorded[sample.id] = true
      state.revisionsUsed += 1
      sample.recordedAs = state.revisionsUsed
      renderStats()
      renderRevision(sample)
      track('demo_revision_recorded', { revision: state.revisionsUsed })
      $('[data-action="record-revision"]').focus()
    })

    $('[data-action="reset"]').addEventListener('click', function () {
      state = freshState()
      SAMPLES.forEach(function (s) {
        delete s.recordedAs
      })
      var form = $('[data-form="post"]')
      form.reset()
      $('[data-form-error]').textContent = ''
      form.elements.title.removeAttribute('aria-invalid')
      tour = { open: false, step: 0, done: [false, false, false], finished: false }
      renderTour(false)
      selectTab('deal')
      renderAll()
      track('demo_reset')
      announce('Demo reset to the sample data.')
      $('#tab-deal').focus()
    })

    var form = $('[data-form="post"]')
    form.addEventListener('submit', function (event) {
      event.preventDefault()
      markStarted('post_add')
      var input = form.elements.title
      var title = input.value.trim()
      var error = $('[data-form-error]')
      if (!title) {
        error.textContent = 'Give the post a title, then add it to the plan.'
        input.setAttribute('aria-invalid', 'true')
        input.focus()
        return
      }
      error.textContent = ''
      input.removeAttribute('aria-invalid')
      var day = Number(form.elements.day.value)
      state.posts.push({ title: title, platform: form.elements.platform.value, day: day, status: 0 })
      input.value = ''
      renderWeek()
      renderStats()
      completeTask(1)
      track('demo_post_added', { tab: 'plan' })
      announce('Added ' + title + ' to ' + dayLabel(day) + '.')
    })

    $$('[data-waitlist-link]').forEach(function (link) {
      link.addEventListener('click', function () {
        track('demo_waitlist_clicked', { source: link.getAttribute('data-track-source') })
      })
    })
  }

  state = freshState()
  setupTabs()
  setupTour()
  setupActions()
  renderAll()
})()
