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

  /* ---- read-only "viewing a shared result" mode -------------------------
   * Opening a `?s=` link no longer imports the sharer's answers over your own;
   * it shows their result read-only. The whole app renders from the global
   * `answers`, so while viewing we point `answers` at the shared snapshot
   * (everything renders for free) and stash your own answers in `myAnswers`.
   * Every WRITE path is gated on `viewing`, so the snapshot — and your real
   * localStorage — stay untouched, which also kills the old refresh-data-loss
   * bug at its source: `?s=` can safely stay in the URL. */
  var viewing = false;        // true when `answers` is a shared snapshot, not your own
  var myAnswers = null;       // your own answers, stashed while viewing
  var compareMine = false;    // overlay your own answers against theirs throughout

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
  function save() {
    if (viewing) return;   // read-only: viewing a shared snapshot never touches storage
    try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) {}
  }
  function isRoute(s) { return /^(intro|results|q\d+)$/.test(s); }
  function nKeys(o) { return o ? Object.keys(o).length : 0; }
  /* drop the `?s=` share blob from the address bar without reloading, keeping
   * the hash route intact (only on a deliberate exit/adopt, or an undecodable
   * blob — while viewing we keep `?s=` so a refresh re-enters the same view) */
  function stripShareParam() {
    try {
      var u = new URL(location.href);
      if (!u.searchParams.has('s')) return;
      u.searchParams.delete('s');
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    } catch (e) {}
  }

  function load() {
    var local = {};
    try { var raw = localStorage.getItem(STORE_KEY); if (raw) local = JSON.parse(raw) || {}; } catch (e) {}
    /* A `?s=` link you opened on purpose is shown READ-ONLY (you're viewing the
     * sharer's result), not imported over your own. We keep your answers in
     * `myAnswers`, point `answers` at the snapshot, and never write storage
     * while viewing. Adopting it as your own is still possible — explicitly —
     * via the view bar's "Make these my results". */
    var sParam = '';
    try { sParam = new URLSearchParams(location.search).get('s') || ''; } catch (e) {}
    if (sParam) {
      var fromQuery = decodeState(sParam);
      if (fromQuery && nKeys(fromQuery)) { myAnswers = local; answers = fromQuery; viewing = true; return; }
      stripShareParam();                              // undecodable blob → drop it, fall through
    }
    answers = local;
  }

  /* ---- compare-mode helpers (used while viewing a shared result) ---- */
  function isPickSrc(src, id, idx) {
    var a = src && src[id]; if (!a) return false;
    if (Array.isArray(a.sel)) return a.sel.indexOf(idx) !== -1;
    return a.sel === idx;
  }
  /* do two answer-sets carry the same answers? (used to spot when a shared link
   * is identical to your own, so we can suppress the "make mine" actions) */
  function normAns(a) {
    if (!a) return '';
    var sel = Array.isArray(a.sel) ? a.sel.slice().sort(function (x, y) { return x - y; }).join(',')
      : (a.sel == null ? '' : String(a.sel));
    return sel + '|' + (a.strength || '') + '|' + (a.but ? 'b' : '');
  }
  function answersEqual(a, b) {
    a = a || {}; b = b || {};
    /* only count keys that carry a real (non-skip) answer on either side */
    function realKeys(o) { return Object.keys(o).filter(function (k) { return isAnswered(o[k]); }); }
    var ka = realKeys(a), kb = realKeys(b);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) {
      var k = ka[i];
      if (!isAnswered(b[k])) return false;
      if (normAns(a[k]) !== normAns(b[k])) return false;
    }
    return true;
  }
  function cloneAnswers(src) {
    var out = {};
    Object.keys(src || {}).forEach(function (id) {
      var a = src[id]; if (!a) return;
      out[id] = { sel: Array.isArray(a.sel) ? a.sel.slice() : a.sel, strength: a.strength };
      if (a.but) out[id].but = true;
    });
    return out;
  }
  /* one person's answer to a question, as a short label (null = no position) */
  function positionTextFor(q, src) {
    var a = src && src[q.id];
    if (!a || a.strength === 'skip') return null;
    var but = !!a.but;
    if (a.strength === 'agnostic') return { text: 'Undecided', strength: 'agnostic', but: but };
    if (a.strength === 'nofact')   return { text: 'No fact of the matter', strength: 'nofact', but: but };
    if (Array.isArray(a.sel)) return a.sel.length
      ? { text: a.sel.map(function (i) { return q.cast[i].who; }).join(', '), strength: 'multi', but: but } : null;
    if (typeof a.sel === 'number') return { text: q.cast[a.sel].who, strength: a.strength, but: but };
    return null;
  }
  /* normalise an answer into a comparable shape (pos = has option picks) */
  function posInfo(src, id) {
    var a = src && src[id];
    if (!a || a.strength === 'skip') return null;
    if (a.strength === 'agnostic') return { kind: 'agnostic', sels: [] };
    if (a.strength === 'nofact')   return { kind: 'nofact', sels: [] };
    var sels = Array.isArray(a.sel) ? a.sel.slice() : (typeof a.sel === 'number' ? [a.sel] : []);
    return sels.length ? { kind: 'pos', sels: sels } : null;
  }
  /* agreement on one question: null if either side has no position; else
   * {score, kind:'agree'|'partial'|'disagree'} (Jaccard overlap of picks) */
  function comparePair(mine, them, q) {
    var a = posInfo(mine, q.id), b = posInfo(them, q.id);
    if (!a || !b) return null;
    var score, kind;
    if (a.kind !== 'pos' || b.kind !== 'pos') {
      score = (a.kind === b.kind) ? 1 : 0; kind = score ? 'agree' : 'disagree';
    } else {
      var inter = a.sels.filter(function (i) { return b.sels.indexOf(i) !== -1; }).length;
      var uni = a.sels.slice();
      b.sels.forEach(function (i) { if (uni.indexOf(i) === -1) uni.push(i); });
      score = uni.length ? inter / uni.length : 0;
      kind = score === 1 ? 'agree' : (score > 0 ? 'partial' : 'disagree');
    }
    return { q: q, score: score, kind: kind };
  }
  function compareRows(mine, them) {
    var rows = [];
    QS.forEach(function (q) { var r = comparePair(mine, them, q); if (r) rows.push(r); });
    return rows;
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
  function answeredCount(src) { src = src || answers; var n = 0; QS.forEach(function (q) { if (isAnswered(src[q.id])) n++; }); return n; }

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
    updateViewBar();   // keep the read-only banner in sync on every navigation
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
    var a = answers[q.id] || {};   // the displayed answer (theirs while viewing)
    var multi = q.ask.type === 'multi';
    var cmp = viewing && compareMine;   // also overlay your own pick inline
    var host = el('qhost');

    var html = '<div class="qcard">';
    html += '<div class="qkicker">Situation ' + (cur + 1) + ' / ' + QS.length + ' · ' + esc(q.topic) + '</div>';
    html += '<div class="qscenario">' + esc(q.scenario) + '</div>';
    html += '<div class="qask">' + mdBold(q.ask.label) + '</div>';
    html += '<div class="opts">';
    q.cast.forEach(function (c, i) {
      var theirs = multi ? (Array.isArray(a.sel) && a.sel.indexOf(i) >= 0)
                         : (typeof a.sel === 'number' && a.sel === i);
      var yours = cmp && isPickSrc(myAnswers, q.id, i);
      var cls = 'opt';
      if (theirs) cls += multi ? ' marked' : (a.strength === 'firm' ? ' firm' : ' lean');
      if (yours) cls += ' opt-you';
      html += '<button class="' + cls + '" data-i="' + i + '">';
      html += '<span class="opt-num">' + (i + 1) + '</span>';
      html += '<div class="opt-who">' + esc(c.who) + '</div>';
      html += '<div class="opt-head">' + esc(c.headline) + '</div>';
      html += '<div class="opt-pass">' + esc(c.passage) + '</div>';
      var st = '';
      if (cmp) {
        var who = [];
        if (theirs) who.push('Them');
        if (yours) who.push('You');
        st = who.join(' · ');
      } else if (theirs) {
        st = multi ? 'Could argue this' : (a.strength === 'firm' ? 'Conviction' : 'Leaning');
      }
      html += '<div class="opt-state">' + st + '</div>';
      html += '</button>';
    });
    html += '</div>';

    /* a one-line "Them: … · You: …" summary while comparing — also carries
     * the non-option stances (undecided / no-fact) and "no answer" cases */
    if (cmp) {
      var tp = positionTextFor(q, answers), mp = positionTextFor(q, myAnswers);
      function posBit(p) { return p ? esc(p.text) + (p.but ? ' · but' : '') : '<i>no answer</i>'; }
      html += '<p class="qcompare"><span class="who them">Them</span> ' + posBit(tp) +
        '<span class="qcsep">·</span><span class="who you">You</span> ' + posBit(mp) + '</p>';
    }

    /* read-only (viewing) hides the answer/stance/hedge/skip chips — only the
     * answer highlights and the Back/Next navigation remain */
    if (!viewing) {
      html += '<div class="qcontrols">';
      if (!multi) {
        html += chip('U', 'Undecided', a.strength === 'agnostic');
        html += chip('F', 'No fact of the matter', a.strength === 'nofact');
      }
      var hasSel = Array.isArray(a.sel) ? a.sel.length > 0 : typeof a.sel === 'number';
      html += '<button class="chip' + (a.but ? ' on' : '') + '" data-act="but"' + (hasSel ? '' : ' style="opacity:.5"') + '>…but (hedge)</button>';
      html += '<button class="chip' + (a.strength === 'skip' ? ' on' : '') + '" data-act="skip">Skip</button>';
      html += '</div>';
    }

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
    if (viewing) return;   // read-only: can't change a shared snapshot
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
    /* read-only: navigation still works, but stance/hedge/skip can't mutate a
     * snapshot — skip just steps forward like Next */
    if (viewing) {
      if (what === 'next' || what === 'skip') { if (cur < QS.length - 1) { cur++; go('q' + QS[cur].id); } else go('results'); return; }
      if (what === 'back') { if (cur > 0) { cur--; go('q' + QS[cur].id); } else go('results'); return; }
      if (what === 'results') { go('results'); return; }
      return;                                   // agnostic / nofact / but: no-op
    }
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
  function computeScores(src) {
    src = src || answers;   // defaults to the displayed answers (theirs while viewing)
    var num = {}, den = {}, t = { answered: 0, agnostic: 0, nofact: 0 };
    AXES.forEach(function (a) { num[a.key] = 0; den[a.key] = 0; });
    QS.forEach(function (q) {
      var a = src[q.id]; if (!isAnswered(a)) return;
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
    var v = viewing;
    /* third-person framing + hide own-session controls while viewing a shared
     * result (Continue / Start over act on YOUR data, not what's shown) */
    function setTxt(id, t) { var n = el(id); if (n) n.textContent = t; }
    setTxt('resultEyebrow', v ? 'A shared result' : 'Your results');
    setTxt('titleCompass', v ? 'Their compass' : 'Your compass');
    setTxt('titleLean', v ? 'Where they lean' : 'Where you lean');
    setTxt('titleBreakdown', v ? 'Every situation, and who they went with' : 'Every situation, and who you went with');
    ['btnContinue', 'btnReset'].forEach(function (id) { var n = el(id); if (n) n.style.display = v ? 'none' : ''; });

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
      '<span class="eyebrow">' + (v ? 'They are' : 'You are') + '</span>' +
      '<div class="aname">' + esc(a.name) + '</div>' +
      '<div class="ablurb">' + esc(a.blurb) + '</div>' +
      '<div class="aportrait">' + esc(a.portrait) + '</div>' +
      (runners.length ? '<div class="arunners">A touch of ' + runners.map(esc).join(' and ') + ', too.</div>' : '');

    el('compassHost').innerHTML = compassSVG(r.score, a.name);

    /* axes — paired (them vs. you) with a summary line when comparing */
    if (v && compareMine) {
      var mineScores = computeScores(myAnswers);
      el('axes').innerHTML = renderCompareSummary(myAnswers, answers) + renderAxes(r.score, r.conf, mineScores.score);
    } else {
      el('axes').innerHTML = renderAxes(r.score, r.conf);
    }
    el('breakdown').innerHTML = renderBreakdown();
  }

  /* compact "you vs. this result" summary shown above the axes while comparing */
  function renderCompareSummary(mine, them) {
    var rows = compareRows(mine, them);
    if (!rows.length) {
      return '<p class="compare-summary">You and this result haven’t taken a position on any of the same situations yet.</p>';
    }
    var n = rows.length;
    var agree = rows.filter(function (r) { return r.kind === 'agree'; }).length;
    var partial = rows.filter(function (r) { return r.kind === 'partial'; }).length;
    var disagree = rows.filter(function (r) { return r.kind === 'disagree'; }).length;
    var avg = Math.round(rows.reduce(function (s, r) { return s + r.score; }, 0) / n * 100);
    var partBit = partial ? ', partly overlap on <b>' + partial + '</b>' : '';
    return '<p class="compare-summary">' +
      '<span class="who you">You</span> and <span class="who them">this result</span> both took a position on <b>' + n + '</b> situation' + (n === 1 ? '' : 's') + '. ' +
      'You agree on <b>' + agree + '</b>' + partBit + ', and differ on <b>' + disagree + '</b> — about <b>' + avg + '%</b> overlap.</p>';
  }

  function poleWin(a, v) {
    if (Math.abs(v) < 0.12) return null;
    return v < 0 ? 'A' : 'B';
  }
  /* short "clearly poleA" style label for an axis value (used while comparing) */
  function leanLabel(a, v) {
    var mag = Math.abs(v);
    if (mag < 0.12) return 'balanced';
    var s = mag > 0.55 ? 'strongly' : (mag > 0.3 ? 'clearly' : 'slightly');
    return s + ' ' + (v < 0 ? a.poleA : a.poleB).toLowerCase();
  }
  /* returns the axes HTML. When `mineScore` is passed (compare mode), each
   * track carries two marks: theirs (accent) and yours (the orange overlay). */
  function renderAxes(score, conf, mineScore) {
    var cmp = !!mineScore;
    var html = '';
    AXES.forEach(function (a) {
      var v = score[a.key];
      var win = poleWin(a, v);
      var pos = (clamp(v, -1, 1) + 1) * 50;
      html += '<div class="axis">';
      html += '<div class="axis-name">' + esc(a.name) + '</div>';
      html += '<div class="axis-poles"><span class="pole' + (win === 'A' ? ' win' : '') + '">' + esc(a.poleA) + '</span>' +
              '<span class="pole' + (win === 'B' ? ' win' : '') + '">' + esc(a.poleB) + '</span></div>';
      if (cmp) {
        var mv = mineScore[a.key], mpos = (clamp(mv, -1, 1) + 1) * 50;
        html += '<div class="axis-track"><span class="mid"></span>' +
                '<span class="mark them" style="left:' + pos.toFixed(1) + '%"></span>' +
                '<span class="mark you" style="left:' + mpos.toFixed(1) + '%"></span></div>';
        html += '<div class="axis-detail"><span class="who them">Them</span> ' + esc(leanLabel(a, v)) +
                ' · <span class="who you">You</span> ' + esc(leanLabel(a, mv)) + '</div>';
      } else {
        var blurb = win === 'A' ? a.blurbA : win === 'B' ? a.blurbB
          : (viewing ? 'They sit near the middle here.' : 'You sit near the middle here.');
        html += '<div class="axis-track"><span class="mid"></span><span class="mark" style="left:' + pos.toFixed(1) + '%;' +
                (conf[a.key] < 0.5 ? 'opacity:.4' : '') + '"></span></div>';
        html += '<div class="axis-detail">' + esc(blurb) + (conf[a.key] < 0.5 ? ' (lightly held so far)' : '') + '</div>';
      }
      html += '</div>';
    });
    return html;
  }

  function renderBreakdown() {
    var cmp = viewing && compareMine;
    var html = '';
    QS.forEach(function (q) {
      var a = answers[q.id];
      var pick;
      if (!isAnswered(a)) pick = a && a.strength === 'skip' ? '<small>Skipped</small>' : '<small>Not answered</small>';
      else if (a.strength === 'agnostic') pick = '<small>Undecided</small>';
      else if (a.strength === 'nofact') pick = '<small>No fact of the matter</small>';
      else if (Array.isArray(a.sel)) pick = a.sel.map(function (i) { return esc(q.cast[i].who); }).join('; ') + ' <small>could argue</small>';
      else { pick = esc(q.cast[a.sel].who) + ' <small>' + (a.strength === 'firm' ? 'conviction' : 'leaning') + (a.but ? ', with a but' : '') + '</small>'; }
      var prefix = cmp ? '<span class="who them">Them</span> ' : '';
      html += '<div class="brk"><div class="brk-q">' + esc(q.topic) + '</div><div class="brk-a">' + prefix + pick + '</div>' +
        (cmp ? cellYouLine(q) : '') + '</div>';
    });
    return html;
  }
  /* your own answer to a situation, as a "You: …" line tinted by agreement —
   * shown beneath each breakdown cell while comparing in view mode */
  function cellYouLine(q) {
    var mp = positionTextFor(q, myAnswers);
    var pair = comparePair(myAnswers, answers, q);
    var tint = pair ? pair.kind : 'na';
    return '<div class="brk-you ' + tint + '"><span class="who you">You</span> ' +
      (mp ? esc(mp.text) + (mp.but ? ' · but' : '') : '<i>no answer</i>') + '</div>';
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
    s += '<text x="' + (W / 2) + '" y="40" text-anchor="middle" font-size="22" font-weight="700" fill="' + col.ink + '">' + (viewing ? 'A Moral Compass' : 'Your Moral Compass') + '</text>';
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

  /* ---------- read-only view mode: bar, leave / adopt / compare ---------- */
  function toast(msg) {
    var n = document.createElement('div');
    n.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#1f1e1d;color:#fff;padding:11px 18px;border-radius:10px;font-size:14px;font-family:ui-sans-serif,system-ui,sans-serif;z-index:60;box-shadow:0 8px 30px rgba(0,0,0,.25);max-width:90%';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(function () { n.style.transition = 'opacity .4s'; n.style.opacity = '0'; setTimeout(function () { n.remove(); }, 400); }, 1700);
  }
  /* leave the shared view and go back to your own data (or start the test) */
  function exitView() {
    if (!viewing) return;
    answers = myAnswers || {};
    myAnswers = null; viewing = false; compareMine = false; cur = 0;
    stripShareParam();
    if (answeredCount() > 0) go('results', true);
    else go('q' + QS[0].id, true);              // nothing of your own yet → begin
  }
  /* adopt the shared snapshot as your own answers (the deliberate overwrite) */
  function adoptView() {
    if (!viewing) return;
    var mineN = answeredCount(myAnswers), got = answeredCount();
    if (mineN && !confirm('Replace your ' + mineN + ' saved answer' + (mineN === 1 ? '' : 's') +
        ' with the ' + got + ' from this shared result?')) return;
    answers = cloneAnswers(answers);            // detach from the decoded snapshot
    myAnswers = null; viewing = false; compareMine = false; cur = 0;
    save();
    stripShareParam();
    go('results', true);
    toast('These are now your answers (' + got + ' situation' + (got === 1 ? '' : 's') + ').');
  }
  /* flip the "compare to mine" overlay and re-render whatever screen we're on */
  function toggleCompareMine() {
    compareMine = !compareMine;
    updateViewBar();
    var hash = (location.hash || '').replace(/^#/, '');
    if (hash === 'results') renderResults();
    else if (/^q\d+$/.test(hash)) renderQuestion();
  }
  /* the persistent read-only banner. Re-rendered on every route3() so it stays
   * in sync across intro / quiz / results. Hidden entirely when not viewing. */
  function updateViewBar() {
    var bar = el('viewBar');
    if (!bar) return;
    if (!viewing) {
      bar.hidden = true; bar.innerHTML = '';
      document.body.classList.remove('is-viewing');
      document.documentElement.style.removeProperty('--viewbar-h');
      return;
    }
    var haveMine = answeredCount(myAnswers) > 0;
    var identical = haveMine && answersEqual(answers, myAnswers);
    var label = identical
      ? 'Viewing a shared result — <b>identical to your own</b>.'
      : 'Viewing a shared result · read-only';

    var html = '<div class="view-bar-inner"><span class="vb-label">' + label + '</span>' +
      '<span class="vb-actions">' +
        '<button id="vbExit" class="vb-primary">' +
          (haveMine ? '‹ Back to my results' : 'Start the test ›') + '</button>';
    if (haveMine && !identical) {
      html += '<button id="vbCompare" class="vb-toggle' + (compareMine ? ' on' : '') + '" ' +
        'role="switch" aria-checked="' + (compareMine ? 'true' : 'false') + '"><i></i>Compare to mine</button>';
    }
    if (!identical) {
      html += '<button id="vbAdopt" class="vb-adopt">Make these my results</button>';
    }
    html += '</span></div>';
    bar.innerHTML = html;
    bar.hidden = false;

    var ex = el('vbExit'); if (ex) ex.addEventListener('click', exitView);
    var cmp = el('vbCompare'); if (cmp) cmp.addEventListener('click', toggleCompareMine);
    var ad = el('vbAdopt'); if (ad) ad.addEventListener('click', adoptView);

    /* push the sticky quiz topbar below the (variable-height) banner */
    document.body.classList.add('is-viewing');
    document.documentElement.style.setProperty('--viewbar-h', bar.offsetHeight + 'px');
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

    /* initial route. A shared `?s=` link opened read-only lands on the sharer's
     * result; otherwise honour any explicit #route, else show the intro. */
    var start = (location.hash || '').replace(/^#/, '');
    if (viewing) {
      if (/^q\d+$/.test(start) || start === 'results') route3(start);
      else go('results', true);                 // keep view flows within quiz/results
    } else if (isRoute(start)) {
      route3(start);
    } else {
      history.replaceState(null, '', '#intro'); route3('intro');
    }
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
