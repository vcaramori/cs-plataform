;(function () {
  'use strict'

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script')
    return scripts[scripts.length - 1]
  })()

  var programKey = script.getAttribute('data-program-key')
  var userId     = script.getAttribute('data-user-id')  || ''
  var email      = script.getAttribute('data-email')    || ''
  var baseUrl    = script.getAttribute('data-base-url') || 'https://nps.cscontinuum.com'
  var force      = script.getAttribute('data-force') === 'true'

  if (!programKey || !email) return

  var STORAGE_KEY = 'cs_nps_' + programKey + '_' + email
  var isTest = false  // será atualizado conforme resposta do check

  function checkAndShow() {
    var cached = localStorage.getItem(STORAGE_KEY)
    if (cached && !force) {
      try {
        var c = JSON.parse(cached)
        if (c.hide_until && Date.now() < new Date(c.hide_until).getTime()) return
      } catch (e) {}
    }

    var url = baseUrl + '/api/nps/check?program_key=' + encodeURIComponent(programKey) + '&email=' + encodeURIComponent(email)
    if (force) url += '&force=true'

    fetch(url)
      .then(function (r) { return r.json() })
      .then(function (data) {
        if (data.should_show) {
          isTest = data.is_test === true
          renderWidget(data.program)
        }
      })
      .catch(function () {})
  }

  // ─── Estilos (slide-in panel) ─────────────────────────────────────────────
  var css = [
    /* Overlay */
    '#cs-nps-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:999998;animation:cs-nps-fade .35s ease;backdrop-filter:blur(2px)}',
    '@keyframes cs-nps-fade{from{opacity:0}to{opacity:1}}',

    /* Panel */
    '#cs-nps-widget{position:fixed;right:0;top:0;bottom:0;z-index:999999;display:flex;flex-direction:column;width:420px;max-width:100vw;background:#ffffff;box-shadow:-12px 0 60px rgba(0,0,0,0.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:cs-nps-slide .4s cubic-bezier(0.19,1,0.22,1)}',
    '@keyframes cs-nps-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}',

    /* Header */
    '#cs-nps-header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #f1f5f9;flex-shrink:0;gap:12px}',
    '#cs-nps-header-left{display:flex;align-items:center;gap:10px}',
    '.cs-nps-logo{width:32px;height:32px;background:#0ea5e9;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '#cs-nps-title{color:#1e293b;font-size:14px;font-weight:700;line-height:1.2}',
    '#cs-nps-subtitle{color:#94a3b8;font-size:11px;font-weight:500;margin-top:1px}',
    '#cs-nps-close{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:22px;line-height:1;padding:4px;transition:color .2s;flex-shrink:0}',
    '#cs-nps-close:hover{color:#334155}',

    /* Scrollable content */
    '#cs-nps-content{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:24px}',

    /* Questions */
    '.cs-nps-q{display:flex;flex-direction:column;gap:12px}',
    '.cs-nps-q-label{color:#1e293b;font-size:14px;font-weight:600;line-height:1.5}',
    '.cs-nps-required{color:#f43f5e;font-size:12px;margin-left:2px}',

    /* NPS scale */
    '.cs-nps-scale{display:flex;gap:3px;width:100%}',
    '.cs-nps-scale-btn{flex:1;height:38px;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;color:#fff;opacity:.85}',
    '.cs-nps-scale-btn[data-score="0"],.cs-nps-scale-btn[data-score="1"]{background:#ef4444}',
    '.cs-nps-scale-btn[data-score="2"],.cs-nps-scale-btn[data-score="3"]{background:#f87171}',
    '.cs-nps-scale-btn[data-score="4"],.cs-nps-scale-btn[data-score="5"]{background:#fb923c}',
    '.cs-nps-scale-btn[data-score="6"]{background:#fbbf24}',
    '.cs-nps-scale-btn[data-score="7"],.cs-nps-scale-btn[data-score="8"]{background:#a3e635}',
    '.cs-nps-scale-btn[data-score="9"],.cs-nps-scale-btn[data-score="10"]{background:#22c55e}',
    '.cs-nps-scale-btn:hover{opacity:1;transform:translateY(-2px)}',
    '.cs-nps-scale-btn.selected{opacity:1;outline:3px solid #0ea5e9;outline-offset:2px;transform:translateY(-3px);box-shadow:0 8px 16px rgba(0,0,0,0.12)}',
    '.cs-nps-scale-labels{display:flex;justify-content:space-between;color:#94a3b8;font-size:10px;font-weight:500}',

    /* Multiple choice */
    '.cs-nps-options{display:flex;flex-direction:column;gap:8px}',
    '.cs-nps-option{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .18s}',
    '.cs-nps-option:hover{border-color:#0ea5e9;background:#f0f9ff}',
    '.cs-nps-option.selected{border-color:#0ea5e9;background:#e0f2fe}',
    '.cs-nps-option-dot{width:16px;height:16px;border-radius:50%;border:2px solid #cbd5e1;flex-shrink:0}',
    '.cs-nps-option.selected .cs-nps-option-dot{border-color:#0ea5e9;background:#0ea5e9;box-shadow:inset 0 0 0 3px #fff}',
    '.cs-nps-option-label{color:#334155;font-size:13px;font-weight:500}',

    /* Textarea */
    '.cs-nps-textarea{width:100%;box-sizing:border-box;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;color:#1e293b;font-size:13px;padding:11px 13px;resize:none;min-height:80px;font-family:inherit;transition:all .18s}',
    '.cs-nps-textarea:focus{border-color:#0ea5e9;background:#fff;box-shadow:0 0 0 3px rgba(14,165,233,.12);outline:none}',

    /* Actions footer */
    '#cs-nps-actions{padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:10px;flex-shrink:0}',
    '#cs-nps-submit{background:#0ea5e9;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;padding:13px;cursor:pointer;transition:all .18s;width:100%}',
    '#cs-nps-submit:hover{background:#0284c7;transform:translateY(-1px);box-shadow:0 4px 16px rgba(14,165,233,.25)}',
    '#cs-nps-submit:disabled{background:#e2e8f0;color:#94a3b8;cursor:default;transform:none;box-shadow:none}',
    '#cs-nps-dismiss{background:none;border:none;color:#94a3b8;font-size:12px;font-weight:500;cursor:pointer;transition:color .18s;text-align:center}',
    '#cs-nps-dismiss:hover{color:#64748b}',

    /* Thanks */
    '#cs-nps-thanks{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:40px 24px;text-align:center;gap:16px}',
    '#cs-nps-thanks-icon{font-size:48px}',
    '#cs-nps-thanks-msg{color:#1e293b;font-size:18px;font-weight:700}',
    '#cs-nps-thanks-sub{color:#64748b;font-size:13px}',
  ].join('')

  function injectStyles() {
    if (document.getElementById('cs-nps-styles')) return
    var el = document.createElement('style')
    el.id = 'cs-nps-styles'
    el.textContent = css
    document.head.appendChild(el)
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  function renderWidget(program) {
    injectStyles()

    var questions = program.questions || []

    if (questions.length === 0) {
      questions = [{
        id: '__legacy_nps__',
        type: 'nps_scale',
        title: program.question || 'Qual a probabilidade de você recomendar o Plannera?',
        required: false,
        options: null,
      }, {
        id: '__legacy_comment__',
        type: 'text',
        title: program.open_question || 'Qual o motivo da sua nota?',
        required: false,
        options: null,
      }]
    }

    var answers = {}

    // Overlay
    var overlay = document.createElement('div')
    overlay.id = 'cs-nps-overlay'
    overlay.addEventListener('click', function () { dismiss() })
    document.body.appendChild(overlay)

    // Panel
    var widget = document.createElement('div')
    widget.id = 'cs-nps-widget'
    widget.innerHTML = buildPanelHTML(questions)
    document.body.appendChild(widget)

    // Bind questões
    questions.forEach(function (q) {
      if (q.type === 'nps_scale') {
        widget.querySelectorAll('[data-nps-q="' + q.id + '"] .cs-nps-scale-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            widget.querySelectorAll('[data-nps-q="' + q.id + '"] .cs-nps-scale-btn').forEach(function (b) { b.classList.remove('selected') })
            btn.classList.add('selected')
            answers[q.id] = { text_value: btn.getAttribute('data-score') }
            updateSubmitState()
          })
        })
      } else if (q.type === 'multiple_choice') {
        widget.querySelectorAll('[data-nps-q="' + q.id + '"] .cs-nps-option').forEach(function (opt) {
          opt.addEventListener('click', function () {
            var val = opt.getAttribute('data-option')
            var current = (answers[q.id] || {}).selected_options || []
            if (opt.classList.contains('selected')) {
              opt.classList.remove('selected')
              current = current.filter(function (v) { return v !== val })
            } else {
              opt.classList.add('selected')
              current = current.concat([val])
            }
            answers[q.id] = { selected_options: current.length > 0 ? current : null }
            updateSubmitState()
          })
        })
      } else if (q.type === 'text') {
        var textarea = widget.querySelector('[data-nps-q="' + q.id + '"] .cs-nps-textarea')
        if (textarea) {
          textarea.addEventListener('input', function () {
            answers[q.id] = { text_value: textarea.value.trim() || null }
            updateSubmitState()
          })
        }
      }
    })

    function updateSubmitState() {
      var required = questions.filter(function (q) { return q.required })
      var allFilled = required.every(function (q) {
        var a = answers[q.id]
        if (!a) return false
        if (q.type === 'nps_scale')       return a.text_value != null
        if (q.type === 'multiple_choice') return a.selected_options && a.selected_options.length > 0
        if (q.type === 'text')            return a.text_value && a.text_value.trim().length > 0
        return false
      })
      var btn = document.getElementById('cs-nps-submit')
      if (btn) btn.disabled = !allFilled
    }

    // Submit
    document.getElementById('cs-nps-submit').addEventListener('click', function () {
      var answerPayload = questions
        .filter(function (q) { return q.id !== '__legacy_nps__' && q.id !== '__legacy_comment__' })
        .map(function (q) {
          var a = answers[q.id] || {}
          return { question_id: q.id, text_value: a.text_value || null, selected_options: a.selected_options || null }
        })

      var npsQ = questions.find(function (q) { return q.type === 'nps_scale' })
      var scoreVal = npsQ && answers[npsQ.id] ? parseInt(answers[npsQ.id].text_value, 10) : undefined
      var commentQ = questions.find(function (q) { return q.id === '__legacy_comment__' })
      var commentVal = commentQ && answers[commentQ.id] ? answers[commentQ.id].text_value : undefined

      sendResponse({
        score: !isNaN(scoreVal) ? scoreVal : undefined,
        comment: commentVal || undefined,
        answers: answerPayload.length > 0 ? answerPayload : undefined,
        is_test: isTest,
      })

      // Mostra tela de agradecimento dentro do panel
      var content = document.getElementById('cs-nps-content')
      var actions = document.getElementById('cs-nps-actions')
      if (content) content.innerHTML = '<div id="cs-nps-thanks"><div id="cs-nps-thanks-icon">🙏</div><div id="cs-nps-thanks-msg">Obrigado pelo seu feedback!</div><div id="cs-nps-thanks-sub">Sua opinião é muito importante para nós.</div></div>'
      if (actions) actions.style.display = 'none'
      setTimeout(removeWidget, 3000)

      if (!isTest) {
        var hideUntil = new Date()
        hideUntil.setDate(hideUntil.getDate() + 90)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ hide_until: hideUntil.toISOString() }))
      }
    })

    // Dismiss (link "não agora")
    var dismissBtn = document.getElementById('cs-nps-dismiss')
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () { dismiss() })
    }

    // Fechar (X)
    document.getElementById('cs-nps-close').addEventListener('click', function () { dismiss() })

    function dismiss() {
      sendResponse({ dismissed: true, is_test: isTest })
      removeWidget()
      if (!isTest) {
        var hideUntil = new Date()
        hideUntil.setDate(hideUntil.getDate() + 30)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ hide_until: hideUntil.toISOString() }))
      }
    }

    updateSubmitState()
  }

  function buildPanelHTML(questions) {
    var questionsHTML = questions.map(function (q) {
      var inner = ''
      if (q.type === 'nps_scale') {
        var btns = [0,1,2,3,4,5,6,7,8,9,10].map(function (n) {
          return '<button class="cs-nps-scale-btn" data-score="' + n + '">' + n + '</button>'
        }).join('')
        inner = '<div class="cs-nps-scale">' + btns + '</div>'
             + '<div class="cs-nps-scale-labels"><span>Pouco provável</span><span>Muito provável</span></div>'
      } else if (q.type === 'multiple_choice') {
        var opts = (q.options || []).map(function (o) {
          return '<div class="cs-nps-option" data-option="' + escHtml(o) + '">'
               + '<div class="cs-nps-option-dot"></div>'
               + '<span class="cs-nps-option-label">' + escHtml(o) + '</span>'
               + '</div>'
        }).join('')
        inner = '<div class="cs-nps-options">' + opts + '</div>'
      } else {
        inner = '<textarea class="cs-nps-textarea" rows="3" placeholder="Digite aqui..."></textarea>'
      }

      var req = q.required ? '<span class="cs-nps-required">*</span>' : ''
      return '<div class="cs-nps-q" data-nps-q="' + q.id + '">'
           + '<div class="cs-nps-q-label">' + escHtml(q.title) + req + '</div>'
           + inner
           + '</div>'
    }).join('')

    var hasRequired = questions.some(function (q) { return q.required })

    var smileSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'

    return '<div id="cs-nps-header">'
         +   '<div id="cs-nps-header-left">'
         +     '<div class="cs-nps-logo">' + smileSvg + '</div>'
         +     '<div><div id="cs-nps-title">Pesquisa de Satisfação</div><div id="cs-nps-subtitle">Sua opinião importa</div></div>'
         +   '</div>'
         +   '<button id="cs-nps-close" aria-label="Fechar">×</button>'
         + '</div>'
         + '<div id="cs-nps-content">' + questionsHTML + '</div>'
         + '<div id="cs-nps-actions">'
         +   '<button id="cs-nps-submit"' + (hasRequired ? ' disabled' : '') + '>Enviar Pesquisa</button>'
         +   '<button id="cs-nps-dismiss">Não agora, obrigado</button>'
         + '</div>'
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function sendResponse(payload) {
    fetch(baseUrl + '/api/nps/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ program_key: programKey, user_email: email, user_id: userId }, payload))
    }).catch(function () {})
  }

  function removeWidget() {
    var w = document.getElementById('cs-nps-widget')
    var o = document.getElementById('cs-nps-overlay')
    if (w) {
      w.style.animation = 'cs-nps-slide-out .3s ease forwards'
      setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w) }, 300)
    }
    if (o) {
      o.style.animation = 'cs-nps-fade-out .3s ease forwards'
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o) }, 300)
    }
    // Injeta keyframes de saída se ainda não existirem
    if (!document.getElementById('cs-nps-out-styles')) {
      var s = document.createElement('style')
      s.id = 'cs-nps-out-styles'
      s.textContent = '@keyframes cs-nps-slide-out{to{transform:translateX(100%)}}@keyframes cs-nps-fade-out{to{opacity:0}}'
      document.head.appendChild(s)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShow)
  } else {
    setTimeout(checkAndShow, 1500)
  }
})()
