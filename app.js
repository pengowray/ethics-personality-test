/* ==================================================================== *
 *  Your Moral Compass - app logic
 *  - one situation at a time; a cast of people, you pick whose move is
 *    yours (lean / conviction) or, on "multi" asks, mark every view you
 *    could argue
 *  - results: a five-axis compass, a gated archetype, a full breakdown,
 *    a downloadable / shareable compass image
 *  No dependencies, no build, answers live in localStorage only.
 * ==================================================================== */
(function () {
  'use strict';

  var AXES = window.MC_AXES;
  var ARCH = window.MC_ARCHETYPES;
  var QS   = window.MC_QUESTIONS;
  var AX_BY = {}; AXES.forEach(function (a) { AX_BY[a.key] = a; });

  var STORE_KEY = 'mc_answers_v1';
  var THEME_KEY = 'mc_theme';
  var W_FIRM = 1.0, W_LEAN = 0.55, W_MULTI = 0.5, W_BUT = 0.8;

  /* answers[id] = { sel:number|number[]|null,
   *                 strength:'lean'|'firm'|'agnostic'|'nofact'|'skip',
   *                 but?:true } */
  var answers = {};
  var cur = 0;
  var theme = 'light';

  /* ---------- tiny helpers ---------- */
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mdBold(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function optChar(n) { return String.fromCharCode(97 + n); }
  function optNum(c) { return c.charCodeAt(0) - 97; }
  function qById(id) { for (var i = 0; i < QS.length; i++) if (QS[i].id == id) return QS[i]; return null; }

  /* ---------- persistence + share ---------- */
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) {} }
  function isRoute(s) { return /^(intro|results|q\d+)$/.test(s); }
  function nKeys(o) { return o ? Object.keys(o).length : 0; }

  function load() {
    var local = null;
    try { var raw = localStorage.getItem(STORE_KEY); if (raw) local = JSON.parse(raw) || {}; } catch (e) {}
    var sParam = '';
    try { sParam = new URLSearchParams(location.search).get('s') || ''; } catch (e) {}
    var fromQuery = decodeState(sParam);
    if (fromQuery && nKeys(fromQuery)) { answers = fromQuery; save(); return; }
    answers = local || {};
  }

  function encodeState() {
    var out = '';
    Object.keys(answers).forEach(function (id) {
      var a = answers[id]; if (!a) return;
      var s = a.strength;
      if (s === 'skip') return;
      if (Array.isArray(a.sel)) { out += id + 'M' + a.sel.map(optChar).join('') + (a.but ? 'B' : ''); }
      else if (s === 'agnostic') { out += id + 'A'; }
      else if (s === 'nofact')   { out += id + 'N'; }
      else if (typeof a.sel === 'number') { out += id + (s === 'firm' ? 'F' : 'L') + optChar(a.sel) + (a.but ? 'B' : ''); }
    });
    return out;
  }
  function decodeState(str) {
    if (!str || isRoute(str)) return null;
    var out = {}, consumed = 0, re = /(\d+)([LFMAN])([a-z]*)(B?)/g, m;
    while ((m = re.exec(str))) {
      if (m.index !== consumed) return null;
      consumed = re.lastIndex;
      var id = m[1], s = m[2], opts = m[3], but = m[4] === 'B', a;
      if (s === 'M') { if (!opts.length) return null; a = { sel: opts.split('').map(optNum), strength: 'firm' }; }
      else if (s === 'L' || s === 'F') { if (opts.length !== 1) return null; a = { sel: optNum(opts), strength: s === 'F' ? 'firm' : 'lean' }; }
      else { if (opts.length) return null; a = { sel: null, strength: s === 'A' ? 'agnostic' : 'nofact' }; }
      if (but) a.but = true;
      out[id] = a;
    }
    return consumed === str.length ? out : null;
  }

  /* ---------- answered bookkeeping ---------- */
  function isAnswered(a) {
    if (!a) return false;
    if (a.strength === 'skip') return false;
    if (Array.isArray(a.sel)) return a.sel.length > 0;
    if (a.strength === 'agnostic' || a.strength === 'nofact') return true;
    return typeof a.sel === 'number';
  }
  function answeredCount() { var n = 0; QS.forEach(function (q) { if (isAnswered(answers[q.id])) n++; }); return n; }

  /* ---------- routing / screens ---------- */
  function show(screen) {
    ['intro', 'quiz', 'results'].forEach(function (s) {
      el('screen-' + s).classList.toggle('active', s === screen);
    });
    if (screen !== 'quiz') window.scrollTo(0, 0);
  }
  function go(route, replace) {
    if (('#' + route) === location.hash && !replace) { route3(route); return; }
    if (replace) history.replaceState(null, '', '#' + route); else location.hash = route;
    route3(route);
  }
  function route3(route) {
    if (route === 'results') { show('results'); renderResults(); return; }
    var m = /^q(\d+)$/.exec(route);
    if (m) { var i = QS.findIndex(function (q) { return q.id == m[1]; }); cur = i < 0 ? 0 : i; show('quiz'); renderQuestion(); return; }
    show('intro'); refreshResume();
  }

  /* ---------- intro ---------- */
  function refreshResume() {
    var n = answeredCount();
    el('factCount').textContent = QS.length;
    el('counter').innerHTML = '<b>' + n + '</b> / ' + QS.length + ' answered';
    el('resumeRow').style.display = n > 0 ? 'flex' : 'none';
    if (n > 0) el('resumeText').textContent = 'You have ' + n + ' of ' + QS.length + ' answered. ';
  }

  /* ---------- quiz ---------- */
  function setCounter() {
    var n = answeredCount();
    el('counter').innerHTML = '<b>' + n + '</b> / ' + QS.length + ' answered';
    el('progressFill').style.width = (100 * n / QS.length) + '%';
  }

  function renderQuestion() {
    var q = QS[cur]; if (!q) return;
    var a = answers[q.id] || {};
    var multi = q.ask.type === 'multi';
    var host = el('qhost');

    var html = '<div class="qcard">';
    html += '<div class="qkicker">Situation ' + (cur + 1) + ' / ' + QS.length + ' · ' + esc(q.topic) + '</div>';
    html += '<div class="qscenario">' + esc(q.scenario) + '</div>';
    html += '<div class="qask">' + mdBold(q.ask.label) + '</div>';
    html += '<div class="opts">';
    q.cast.forEach(function (c, i) {
      var cls = 'opt';
      if (multi) { if (Array.isArray(a.sel) && a.sel.indexOf(i) >= 0) cls += ' marked'; }
      else if (typeof a.sel === 'number' && a.sel === i) cls += (a.strength === 'firm' ? ' firm' : ' lean');
      html += '<button class="' + cls + '" data-i="' + i + '">';
      html += '<span class="opt-num">' + (i + 1) + '</span>';
      html += '<div class="opt-who">' + esc(c.who) + '</div>';
      html += '<div class="opt-head">' + esc(c.headline) + '</div>';
      html += '<div class="opt-pass">' + esc(c.passage) + '</div>';
      var st = '';
      if (multi) { if (Array.isArray(a.sel) && a.sel.indexOf(i) >= 0) st = 'Could argue this'; }
      else if (typeof a.sel === 'number' && a.sel === i) st = (a.strength === 'firm' ? 'Conviction' : 'Leaning');
      html += '<div class="opt-state">' + st + '</div>';
      html += '</button>';
    });
    html += '</div>';

    /* secondary controls */
    html += '<div class="qcontrols">';
    if (!multi) {
      html += chip('U', 'Undecided', a.strength === 'agnostic');
      html += chip('F', 'No fact of the matter', a.strength === 'nofact');
    }
    var hasSel = Array.isArray(a.sel) ? a.sel.length > 0 : typeof a.sel === 'number';
    html += '<button class="chip' + (a.but ? ' on' : '') + '" data-act="but"' + (hasSel ? '' : ' style="opacity:.5"') + '>…but (hedge)</button>';
    html += '<button class="chip' + (a.strength === 'skip' ? ' on' : '') + '" data-act="skip">Skip</button>';
    html += '</div>';

    if (q.realNote) html += '<div class="realnote">' + esc(q.realNote) + '</div>';

    html += '<div class="nav">';
    html += '<button class="btn btn-ghost" data-act="back">‹ Back</button>';
    html += (cur === QS.length - 1)
      ? '<button class="btn btn-primary" data-act="results">See results ›</button>'
      : '<button class="btn btn-primary" data-act="next">Next ›</button>';
    html += '</div>';
    html += '</div>';

    host.innerHTML = html;
    setCounter();

    host.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () { pick(q, parseInt(b.getAttribute('data-i'), 10)); });
    });
    host.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () { act(q, b.getAttribute('data-act')); });
    });
  }
  function chip(key, label, on) {
    return '<button class="chip' + (on ? ' on' : '') + '" data-act="' + (key === 'U' ? 'agnostic' : 'nofact') + '">' + esc(label) + '</button>';
  }

  function pick(q, i) {
    var a = answers[q.id] || {};
    if (q.ask.type === 'multi') {
      var arr = Array.isArray(a.sel) ? a.sel.slice() : [];
      var at = arr.indexOf(i);
      if (at >= 0) arr.splice(at, 1); else arr.push(i);
      arr.sort(function (x, y) { return x - y; });
      a = { sel: arr, strength: 'firm', but: a.but };
      if (!arr.length) a = {};
    } else {
      if (typeof a.sel === 'number' && a.sel === i) {
        if (a.strength === 'lean') a = { sel: i, strength: 'firm', but: a.but };
        else a = {};                       /* firm -> clear */
      } else {
        a = { sel: i, strength: 'lean', but: a.but };
      }
    }
    answers[q.id] = a; save(); renderQuestion();
  }

  function act(q, what) {
    var a = answers[q.id] || {};
    if (what === 'agnostic' || what === 'nofact') {
      a = (a.strength === what) ? {} : { sel: null, strength: what };
    } else if (what === 'but') {
      var hasSel = Array.isArray(a.sel) ? a.sel.length > 0 : typeof a.sel === 'number';
      if (!hasSel) return;
      a.but = !a.but;
    } else if (what === 'skip') {
      a = (a.strength === 'skip') ? {} : { sel: null, strength: 'skip' };
      answers[q.id] = a; save();
      if (cur < QS.length - 1) { cur++; go('q' + QS[cur].id); } else go('results');
      return;
    } else if (what === 'next') {
      if (cur < QS.length - 1) { cur++; go('q' + QS[cur].id); } return;
    } else if (what === 'back') {
      if (cur > 0) { cur--; go('q' + QS[cur].id); } else go('intro'); return;
    } else if (what === 'results') { go('results'); return; }
    answers[q.id] = a; save(); renderQuestion();
  }

  /* ---------- scoring ---------- */
  function computeScores() {
    var num = {}, den = {}, t = { answered: 0, agnostic: 0, nofact: 0 };
    AXES.forEach(function (a) { num[a.key] = 0; den[a.key] = 0; });
    QS.forEach(function (q) {
      var a = answers[q.id]; if (!isAnswered(a)) return;
      t.answered++;
      if (a.strength === 'agnostic') { t.agnostic++; return; }
      if (a.strength === 'nofact') { t.nofact++; num.source += 0.55; den.source += 0.55; return; }
      var but = a.but ? W_BUT : 1;
      if (Array.isArray(a.sel)) {
        a.sel.forEach(function (i) { addChar(q.cast[i], W_MULTI * but, num, den); });
      } else if (typeof a.sel === 'number') {
        addChar(q.cast[a.sel], (a.strength === 'firm' ? W_FIRM : W_LEAN) * but, num, den);
      }
    });
    var score = {}, conf = {};
    AXES.forEach(function (a) { score[a.key] = den[a.key] > 0 ? clamp(num[a.key] / den[a.key], -1, 1) : 0; conf[a.key] = den[a.key]; });
    return { score: score, conf: conf, t: t };
  }
  function addChar(c, w, num, den) {
    if (!c || !c.axes) return;
    Object.keys(c.axes).forEach(function (k) { if (num[k] === undefined) return; num[k] += c.axes[k] * w; den[k] += w; });
  }

  function pickArchetypes(score, t) {
    var scored = ARCH.map(function (arc) {
      /* gated types (Skeptic, Error Theorist) score by how DOMINANT the
       * behaviour that earns them is, so heavy use of undecided / no-fact
       * actually wins rather than just appearing in the runners-up. */
      if (arc.gate) {
        if (!arc.gate(t)) return { arc: arc, s: -Infinity };
        var rel = arc.key === 'skeptic' ? t.agnostic : t.nofact;
        var dom = t.answered ? rel / t.answered : 0;
        return { arc: arc, s: 0.5 + dom * 1.1 };
      }
      /* non-gated: cosine similarity (direction), scaled by how strongly
       * those axes are actually held (so a faint match cannot beat a clear
       * one). Bounded to roughly [-1, 1]. */
      var keys = Object.keys(arc.target || {});
      if (!keys.length) return { arc: arc, s: -Infinity };
      var dot = 0, tm = 0, um = 0;
      keys.forEach(function (k) { var u = score[k] || 0, tv = arc.target[k]; dot += u * tv; tm += tv * tv; um += u * u; });
      var cos = um > 0 ? dot / (Math.sqrt(tm) * Math.sqrt(um)) : 0;
      var strength = Math.sqrt(um / keys.length);            /* ~[0,1] */
      return { arc: arc, s: cos * (0.6 + 0.4 * strength) };
    }).filter(function (x) { return x.s > -Infinity; });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored;
  }

  /* ---------- results ---------- */
  function renderResults() {
    var r = computeScores();
    var ranked = pickArchetypes(r.score, r.t);
    var top = ranked[0];

    if (r.t.answered === 0) {
      el('archetype').innerHTML = '<div class="aname">No reading yet</div><div class="aportrait">Answer a few situations and your compass will take shape. ' +
        '<button class="link-btn" onclick="location.hash=\'q' + QS[0].id + '\'">Start ›</button></div>';
      el('compassHost').innerHTML = ''; el('axes').innerHTML = ''; el('breakdown').innerHTML = '';
      return;
    }

    var a = top.arc;
    var runners = ranked.slice(1, 3).map(function (x) { return x.arc.name; }).filter(Boolean);
    el('archetype').innerHTML =
      '<span class="eyebrow">You are</span>' +
      '<div class="aname">' + esc(a.name) + '</div>' +
      '<div class="ablurb">' + esc(a.blurb) + '</div>' +
      '<div class="aportrait">' + esc(a.portrait) + '</div>' +
      (runners.length ? '<div class="arunners">A touch of ' + runners.map(esc).join(' and ') + ', too.</div>' : '');

    el('compassHost').innerHTML = compassSVG(r.score, a.name);
    renderAxes(r.score, r.conf);
    renderBreakdown();
  }

  function poleWin(a, v) {
    if (Math.abs(v) < 0.12) return null;
    return v < 0 ? 'A' : 'B';
  }
  function renderAxes(score, conf) {
    var host = el('axes'); var html = '';
    AXES.forEach(function (a) {
      var v = score[a.key];
      var win = poleWin(a, v);
      var pos = (clamp(v, -1, 1) + 1) * 50;
      var blurb = win === 'A' ? a.blurbA : win === 'B' ? a.blurbB : 'You sit near the middle here.';
      html += '<div class="axis">';
      html += '<div class="axis-name">' + esc(a.name) + '</div>';
      html += '<div class="axis-poles"><span class="pole' + (win === 'A' ? ' win' : '') + '">' + esc(a.poleA) + '</span>' +
              '<span class="pole' + (win === 'B' ? ' win' : '') + '">' + esc(a.poleB) + '</span></div>';
      html += '<div class="axis-track"><span class="mid"></span><span class="mark" style="left:' + pos.toFixed(1) + '%;' +
              (conf[a.key] < 0.5 ? 'opacity:.4' : '') + '"></span></div>';
      html += '<div class="axis-detail">' + esc(blurb) + (conf[a.key] < 0.5 ? ' (lightly held so far)' : '') + '</div>';
      html += '</div>';
    });
    host.innerHTML = html;
  }

  function renderBreakdown() {
    var host = el('breakdown'); var html = '';
    QS.forEach(function (q) {
      var a = answers[q.id];
      var pick;
      if (!isAnswered(a)) pick = a && a.strength === 'skip' ? '<small>Skipped</small>' : '<small>Not answered</small>';
      else if (a.strength === 'agnostic') pick = '<small>Undecided</small>';
      else if (a.strength === 'nofact') pick = '<small>No fact of the matter</small>';
      else if (Array.isArray(a.sel)) pick = a.sel.map(function (i) { return esc(q.cast[i].who); }).join('; ') + ' <small>could argue</small>';
      else { pick = esc(q.cast[a.sel].who) + ' <small>' + (a.strength === 'firm' ? 'conviction' : 'leaning') + (a.but ? ', with a but' : '') + '</small>'; }
      html += '<div class="brk"><div class="brk-q">' + esc(q.topic) + '</div><div class="brk-a">' + pick + '</div></div>';
    });
    host.innerHTML = html;
  }

  /* ---------- compass SVG ---------- */
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function compassSVG(score, archName) {
    var W = 660, padX = 150, rowH = 52, top = 96;
    var H = top + AXES.length * rowH + 30;
    var col = {
      bg: cssVar('--card') || '#fffdf8', ink: cssVar('--ink') || '#2b2724',
      soft: cssVar('--ink-soft') || '#6b6258', line: cssVar('--line2') || '#d2c4ab',
      accent: cssVar('--accent') || '#9a5b2e'
    };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="ui-sans-serif, system-ui, sans-serif">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="16" fill="' + col.bg + '"/>';
    s += '<text x="' + (W / 2) + '" y="40" text-anchor="middle" font-size="22" font-weight="700" fill="' + col.ink + '">Your Moral Compass</text>';
    s += '<text x="' + (W / 2) + '" y="66" text-anchor="middle" font-size="15" fill="' + col.accent + '">' + esc(archName) + '</text>';
    AXES.forEach(function (a, i) {
      var y = top + i * rowH + rowH / 2;
      var x0 = padX, x1 = W - padX, mid = (x0 + x1) / 2;
      var v = clamp(score[a.key], -1, 1);
      var mx = mid + v * (x1 - mid);
      s += '<text x="' + (x0 - 10) + '" y="' + (y + 4) + '" text-anchor="end" font-size="12.5" fill="' + col.soft + '">' + esc(a.poleA) + '</text>';
      s += '<text x="' + (x1 + 10) + '" y="' + (y + 4) + '" text-anchor="start" font-size="12.5" fill="' + col.soft + '">' + esc(a.poleB) + '</text>';
      s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + col.line + '" stroke-width="4" stroke-linecap="round"/>';
      s += '<line x1="' + mid + '" y1="' + (y - 7) + '" x2="' + mid + '" y2="' + (y + 7) + '" stroke="' + col.line + '" stroke-width="1"/>';
      s += '<circle cx="' + mx.toFixed(1) + '" cy="' + y + '" r="8" fill="' + col.accent + '"/>';
      s += '<text x="' + mid + '" y="' + (y - 16) + '" text-anchor="middle" font-size="10.5" letter-spacing="1" fill="' + col.soft + '">' + esc(a.name.toUpperCase()) + '</text>';
    });
    s += '</svg>';
    return s;
  }
  function currentSVGString() {
    var svg = el('compassHost').querySelector('svg');
    return svg ? svg.outerHTML : '';
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  /* ---------- wire up ---------- */
  function initTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    theme = (t === 'dark') ? 'dark' : 'light';
    el('themeToggle').querySelector('.ti').textContent = theme === 'dark' ? '☀' : '☾';
  }
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    el('themeToggle').querySelector('.ti').textContent = theme === 'dark' ? '☀' : '☾';
    if (el('screen-results').classList.contains('active')) renderResults();
  }

  function onKey(e) {
    if (!el('screen-quiz').classList.contains('active')) return;
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    var q = QS[cur]; if (!q) return;
    var k = e.key;
    if (k >= '1' && k <= '9') { var i = parseInt(k, 10) - 1; if (i < q.cast.length) { pick(q, i); e.preventDefault(); } }
    else if (k === 'ArrowRight' || k === 'Enter') { act(q, cur === QS.length - 1 ? 'results' : 'next'); e.preventDefault(); }
    else if (k === 'ArrowLeft') { act(q, 'back'); e.preventDefault(); }
    else if (k === 'u' || k === 'U') { if (q.ask.type !== 'multi') act(q, 'agnostic'); }
    else if (k === 'f' || k === 'F') { if (q.ask.type !== 'multi') act(q, 'nofact'); }
    else if (k === 'b' || k === 'B') { act(q, 'but'); }
    else if (k === 's' || k === 'S') { act(q, 'skip'); }
  }

  function init() {
    load(); initTheme();
    el('themeToggle').addEventListener('click', toggleTheme);
    el('startBtn').addEventListener('click', function () { go('q' + QS[0].id); });
    el('resumeBtn').addEventListener('click', function () {
      var firstUnanswered = QS.find(function (q) { return !isAnswered(answers[q.id]); }) || QS[0];
      go('q' + firstUnanswered.id);
    });
    el('resultsTopBtn').addEventListener('click', function () { go('results'); });
    el('resultsTopBtn2').addEventListener('click', function () { go('results'); });
    el('introReset').addEventListener('click', resetAll);
    el('btnReset').addEventListener('click', resetAll);
    el('btnContinue').addEventListener('click', function () {
      var firstUnanswered = QS.find(function (q) { return !isAnswered(answers[q.id]); }) || QS[QS.length - 1];
      go('q' + firstUnanswered.id);
    });
    el('btnSVG').addEventListener('click', function () {
      var str = currentSVGString(); if (!str) return;
      downloadBlob(new Blob([str], { type: 'image/svg+xml' }), 'moral-compass.svg');
    });
    el('btnPNG').addEventListener('click', exportPNG);
    el('btnShare').addEventListener('click', shareLink);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', function () { route3((location.hash || '#intro').replace(/^#/, '')); });

    var start = (location.hash || '#intro').replace(/^#/, '');
    if (!isRoute(start)) { history.replaceState(null, '', '#intro'); start = 'intro'; }
    route3(start);
  }

  function resetAll() {
    if (!confirm('Clear all your answers and start over?')) return;
    answers = {}; save();
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    go('intro', true);
  }

  function shareLink() {
    var code = encodeState();
    var url = location.origin + location.pathname + (code ? ('?s=' + code) : '') + '#results';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { flash(el('btnShare'), 'Copied ✓'); },
        function () { prompt('Copy this link:', url); });
    } else prompt('Copy this link:', url);
  }
  function flash(btn, msg) { var o = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = o; }, 1400); }

  function exportPNG() {
    var str = currentSVGString(); if (!str) return;
    var svg = el('compassHost').querySelector('svg');
    var w = parseInt(svg.getAttribute('width'), 10) || 660, h = parseInt(svg.getAttribute('height'), 10) || 420;
    var scale = 2, img = new Image();
    var blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = w * scale; cv.height = h * scale;
      var ctx = cv.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      cv.toBlob(function (b) { if (b) downloadBlob(b, 'moral-compass.png'); });
    };
    img.onerror = function () { URL.revokeObjectURL(url); alert('PNG export failed; the SVG download still works.'); };
    img.src = url;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
