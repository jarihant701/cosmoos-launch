// CosmoOS demo: a sample brand deal that runs entirely in this page.
// No sign-in, no network calls, no AI and no storage: state lives in memory and resets on reload.
;(function () {
  'use strict'

  var REVISION_LIMIT = 1
  var FEE = 40000
  var STATUSES = ['Idea', 'Drafted', 'Scheduled', 'Posted']
  var DELIVERY_STATUSES = ['Not started', 'In progress', 'Delivered']

  // Pre-written results for the sample messages. The real app compares any pasted feedback with the brief.
  var SAMPLES = [
    {
      id: 'tiktok',
      text: 'Love the first cut! Could you also make a TikTok version, and can we run the reel as a paid ad next month?',
      usesRevision: true,
      findings: [
        { kind: 'scope', text: 'A TikTok version is a new deliverable.', quote: '2 Instagram Reels, 30–45 seconds' },
        { kind: 'scope', text: 'Paid ads go beyond the agreed usage rights.', quote: 'Organic use only, 3 months' },
        { kind: 'ok', text: 'Feedback on the first cut is a revision round.', quote: '1 round included' },
      ],
    },
    {
      id: 'label',
      text: 'Can you make the product label more visible and swap the music for something calmer?',
      usesRevision: true,
      findings: [
        { kind: 'ok', text: 'Edits to an agreed Reel are a revision round.', quote: '1 round included' },
      ],
    },
    {
      id: 'usage',
      text: "Great work! We'd like to use the reels for 12 months and could you send us the raw footage?",
      usesRevision: false,
      findings: [
        { kind: 'scope', text: '12 months of use is longer than agreed.', quote: 'Organic use only, 3 months' },
        { kind: 'scope', text: 'Raw footage is not a listed deliverable.', quote: '2 Instagram Reels, 30–45 seconds' },
      ],
    },
  ]

  var state

  function freshState() {
    return {
      deliverables: [
        { id: 'd1', name: 'Reel 1 · Morning routine', due: 3, status: 1 },
        { id: 'd2', name: 'Reel 2 · Serum close-up', due: 6, status: 0 },
      ],
      posts: [
        { id: 'p1', title: 'Teaser: something new on my shelf', platform: 'Instagram', day: 1, status: 2 },
        { id: 'p2', title: 'Reel 1 · Morning routine', platform: 'Instagram', day: 3, status: 1 },
        { id: 'p3', title: 'Behind the scenes of the shoot', platform: 'YouTube', day: 5, status: 0 },
      ],
      revisionsUsed: 0,
      recordedSamples: {},
      paid: false,
      sample: null,
      nextId: 1,
    }
  }

  // ---------- Helpers ----------

  function $(selector) {
    return document.querySelector(selector)
  }

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text != null) node.textContent = text
    return node
  }

  var dayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  var money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

  function dayLabel(offset) {
    var date = new Date()
    date.setDate(date.getDate() + offset)
    var label = dayFormat.format(date)
    if (offset === 0) return 'Today · ' + label
    if (offset === 1) return 'Tomorrow · ' + label
    return label
  }

  function announce(message) {
    var live = $('[data-live]')
    live.textContent = ''
    // A fresh text node so screen readers repeat identical messages.
    window.setTimeout(function () {
      live.textContent = message
    }, 30)
  }

  // ---------- Rendering ----------

  function renderStats() {
    var open = state.deliverables.filter(function (d) {
      return d.status < 2
    }).length
    $('[data-stat="open"]').textContent = String(open)
    var revisions = $('[data-stat="revisions"]')
    revisions.textContent = state.revisionsUsed + ' of ' + REVISION_LIMIT
    revisions.classList.toggle('stats__value--warn', state.revisionsUsed > REVISION_LIMIT)
    $('[data-stat="posts"]').textContent = String(state.posts.length)
    $('[data-stat="owed"]').textContent = state.paid ? money.format(0) : money.format(FEE)
  }

  function renderDeliverables() {
    var list = $('[data-list="deliverables"]')
    list.replaceChildren()
    state.deliverables.forEach(function (d) {
      var item = el('li', 'deliverable')
      var text = el('div')
      text.append(el('p', 'deliverable__name', d.name), el('p', 'deliverable__due', 'Due ' + dayLabel(d.due)))
      var select = el('select', 'deliverable__status')
      select.setAttribute('aria-label', 'Status of ' + d.name)
      DELIVERY_STATUSES.forEach(function (label, index) {
        var option = el('option', null, label)
        option.value = String(index)
        option.selected = index === d.status
        select.append(option)
      })
      select.dataset.status = String(d.status)
      select.addEventListener('change', function () {
        d.status = Number(select.value)
        select.dataset.status = select.value
        renderStats()
        announce(d.name + ' is now ' + DELIVERY_STATUSES[d.status] + '.')
      })
      item.append(text, select)
      list.append(item)
    })
  }

  function renderInvoice() {
    $('[data-invoice-meta]').textContent = state.paid ? 'Paid · received in full' : 'Sent · waiting for payment'
    var button = $('[data-action="toggle-paid"]')
    button.textContent = state.paid ? 'Mark as unpaid' : 'Mark as paid'
    $('.invoice').classList.toggle('invoice--paid', state.paid)
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
      if (!posts.length) {
        day.append(el('p', 'week__empty', 'Nothing planned'))
      }
      posts.forEach(function (post) {
        var row = el('div', 'post')
        var info = el('div', 'post__info')
        info.append(el('span', 'chip', post.platform), el('p', 'post__title', post.title))
        var status = el('button', 'post__status', STATUSES[post.status])
        status.type = 'button'
        status.dataset.status = String(post.status)
        status.setAttribute('aria-label', 'Status: ' + STATUSES[post.status] + '. Move ' + post.title + ' to the next status')
        status.addEventListener('click', function () {
          post.status = (post.status + 1) % STATUSES.length
          renderWeek()
          announce(post.title + ' is now ' + STATUSES[post.status] + '.')
        })
        var remove = el('button', 'post__remove', '×')
        remove.type = 'button'
        remove.setAttribute('aria-label', 'Remove ' + post.title)
        remove.addEventListener('click', function () {
          state.posts = state.posts.filter(function (p) {
            return p !== post
          })
          renderWeek()
          renderStats()
          announce('Removed ' + post.title + '.')
        })
        row.append(info, status, remove)
        day.append(row)
      })
      list.append(day)
    }
  }

  function renderSamples() {
    var list = $('[data-list="samples"]')
    list.replaceChildren()
    SAMPLES.forEach(function (sample) {
      var button = el('button', 'sample')
      button.type = 'button'
      button.setAttribute('role', 'radio')
      button.setAttribute('aria-checked', String(state.sample === sample.id))
      button.append(el('span', 'sample__quote', '“' + sample.text + '”'))
      button.addEventListener('click', function () {
        state.sample = sample.id
        renderSamples()
        renderFindings()
      })
      list.append(button)
    })
  }

  function renderFindings() {
    var list = $('[data-list="findings"]')
    var actions = $('[data-feedback-actions]')
    list.replaceChildren()
    var sample = SAMPLES.find(function (s) {
      return s.id === state.sample
    })
    if (!sample) {
      list.append(el('li', 'findings__empty', 'Pick a message to see how it compares with the approved brief.'))
      actions.hidden = true
      return
    }
    sample.findings.forEach(function (f) {
      var item = el('li', 'finding finding--' + f.kind)
      item.append(
        el('span', 'finding__kind', f.kind === 'scope' ? 'Possible scope change' : 'Within scope'),
        el('p', null, f.text),
        el('p', 'finding__quote', 'Brief says: “' + f.quote + '”'),
      )
      list.append(item)
    })
    var scopeCount = sample.findings.filter(function (f) {
      return f.kind === 'scope'
    }).length
    announce(
      scopeCount
        ? scopeCount + (scopeCount === 1 ? ' possible scope change flagged.' : ' possible scope changes flagged.')
        : 'Everything in this message is within scope.',
    )
    renderRevisionAction(sample)
  }

  function renderRevisionAction(sample) {
    var actions = $('[data-feedback-actions]')
    var button = $('[data-action="record-revision"]')
    var note = $('[data-revision-note]')
    if (!sample.usesRevision) {
      actions.hidden = true
      return
    }
    actions.hidden = false
    var recorded = state.recordedSamples[sample.id]
    button.disabled = !!recorded
    button.textContent = recorded ? 'Recorded' : 'Record as a revision round'
    var next = state.revisionsUsed + (recorded ? 0 : 1)
    if (recorded) {
      note.textContent =
        state.revisionsUsed > REVISION_LIMIT
          ? 'Revision ' + state.revisionsUsed + ' of ' + REVISION_LIMIT + ' included. Consider quoting the extra round.'
          : 'Recorded in the revision history.'
    } else if (next > REVISION_LIMIT) {
      note.textContent = 'This would be revision ' + next + ' of ' + REVISION_LIMIT + ' included: over the limit.'
    } else {
      note.textContent = 'This would be revision ' + next + ' of ' + REVISION_LIMIT + ' included.'
    }
    note.classList.toggle('feedback-actions__note--warn', next > REVISION_LIMIT)
  }

  function renderAll() {
    renderStats()
    renderDeliverables()
    renderInvoice()
    renderDays()
    renderWeek()
    renderSamples()
    renderFindings()
  }

  // ---------- Tabs (WAI-ARIA tabs pattern) ----------

  function setupTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'))
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var selected = t === tab
        t.setAttribute('aria-selected', String(selected))
        t.tabIndex = selected ? 0 : -1
        document.getElementById(t.getAttribute('aria-controls')).hidden = !selected
      })
      if (focus) tab.focus()
    }
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        select(tab, false)
      })
      tab.addEventListener('keydown', function (event) {
        var next = null
        if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length]
        if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length]
        if (event.key === 'Home') next = tabs[0]
        if (event.key === 'End') next = tabs[tabs.length - 1]
        if (next) {
          event.preventDefault()
          select(next, true)
        }
      })
    })
  }

  // ---------- Actions ----------

  function setupActions() {
    $('[data-action="toggle-paid"]').addEventListener('click', function () {
      state.paid = !state.paid
      renderInvoice()
      renderStats()
      announce(state.paid ? 'Invoice marked as paid.' : 'Invoice marked as unpaid.')
    })

    $('[data-action="record-revision"]').addEventListener('click', function () {
      var sample = state.sample
      if (!sample || state.recordedSamples[sample]) return
      state.recordedSamples[sample] = true
      state.revisionsUsed += 1
      renderStats()
      renderRevisionAction(
        SAMPLES.find(function (s) {
          return s.id === sample
        }),
      )
      announce('Revision ' + state.revisionsUsed + ' of ' + REVISION_LIMIT + ' recorded.')
    })

    $('[data-action="reset"]').addEventListener('click', function () {
      state = freshState()
      $('[data-form="post"]').reset()
      $('[data-form-error]').textContent = ''
      renderAll()
      announce('Demo reset to the sample data.')
    })

    var form = $('[data-form="post"]')
    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var title = form.elements.title.value.trim()
      var error = $('[data-form-error]')
      if (!title) {
        error.textContent = 'Give the post a title.'
        form.elements.title.focus()
        return
      }
      error.textContent = ''
      state.posts.push({
        id: 'n' + state.nextId++,
        title: title,
        platform: form.elements.platform.value,
        day: Number(form.elements.day.value),
        status: 0,
      })
      form.elements.title.value = ''
      renderWeek()
      renderStats()
      announce('Added ' + title + ' to ' + dayLabel(Number(form.elements.day.value)) + '.')
    })
  }

  state = freshState()
  setupTabs()
  setupActions()
  renderAll()
})()
