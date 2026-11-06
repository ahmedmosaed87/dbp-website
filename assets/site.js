/* Shows the page in Arabic or English, and remembers the choice across pages. */
(function () {
  var ar = document.getElementById('ar'), en = document.getElementById('en');
  var bAr = document.getElementById('btn-ar'), bEn = document.getElementById('btn-en');
  // Show one language, mark the matching button, and set the page direction.
  function show(lang) {
    var isAr = lang === 'ar';
    ar.hidden = !isAr; en.hidden = isAr;
    document.querySelectorAll('[data-lang]').forEach(function (n) { n.hidden = n.getAttribute('data-lang') !== lang; });
    bAr.setAttribute('aria-pressed', String(isAr)); bEn.setAttribute('aria-pressed', String(!isAr));
    document.documentElement.lang = lang; document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.classList.remove('lang-pending');
    try { localStorage.setItem('dbp-lang', lang); } catch (e) {}
    // Give search engines and the browser tab the title, description and address of the language being read.
    var pm = document.getElementById('page-meta');
    if (pm) {
      try {
        var m = JSON.parse(pm.textContent)[lang];
        document.title = m.t;
        var d = document.querySelector('meta[name="description"]'); if (d) d.setAttribute('content', m.d);
        var base = document.querySelector('link[hreflang="x-default"]'), c = document.querySelector('link[rel="canonical"]');
        if (base && c) c.setAttribute('href', base.getAttribute('href') + '?lang=' + lang);
      } catch (e) { /* the page still reads correctly */ }
    }
  }
  bAr.addEventListener('click', function () { show('ar'); });
  bEn.addEventListener('click', function () { show('en'); });
  // Start with a language named in the link (?lang=ar or ?lang=en), else the visitor's last choice, else their browser language.
  var asked = (location.search.match(/[?&]lang=(ar|en)\b/) || [])[1];
  var saved = null; try { saved = localStorage.getItem('dbp-lang'); } catch (e) {}
  show(asked || saved || ((navigator.language || '').toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en'));
})();

/* Searches every page's headings and card titles in the language being read; opens with the icon or the "/" key. */
(function () {
  var ov = document.getElementById('search'), input = document.getElementById('search-input'), list = document.getElementById('search-results');
  if (!ov || !window.DBP_SEARCH) return;
  var lang = function () { return document.documentElement.lang === 'ar' ? 'ar' : 'en'; };
  var norm = function (s) { return (s || '').toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي'); };
  function render() {
    var q = norm(input.value.trim()), l = lang(), html = '';
    var hits = window.DBP_SEARCH.filter(function (r) { return r.l === l && (!q || norm(r.t + ' ' + r.x).indexOf(q) >= 0); }).slice(0, q ? 12 : 8);
    hits.forEach(function (r) { html += '<li><a href="' + r.u + '"><span class="r-page">' + r.p + '</span><strong>' + r.t + '</strong>' + (r.x ? '<span class="r-text">' + r.x + '</span>' : '') + '</a></li>'; });
    list.innerHTML = html || '<li class="none">' + (l === 'ar' ? 'لا نتائج' : 'No results') + '</li>';
  }
  function open() { input.placeholder = lang() === 'ar' ? 'ابحث في الموقع' : 'Search the site'; ov.hidden = false; input.value = ''; render(); setTimeout(function () { input.focus(); }, 0); }
  function close() { ov.hidden = true; }
  document.getElementById('search-open').addEventListener('click', open);
  document.getElementById('search-close').addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  input.addEventListener('input', render);
  list.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !ov.hidden) close();
    if (e.key === '/' && ov.hidden && !/input|textarea/i.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); open(); }
  });
})();

/* The logo stage grows as the visitor scrolls: from a card under the hero to the full screen. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stages = document.querySelectorAll('.stage-scroll');
  if (!stages.length) return;
  if (reduce) { stages.forEach(function (s) { s.style.setProperty('--p', 1); }); return; }
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    stages.forEach(function (s) {
      if (s.offsetParent === null) return;
      var r = s.getBoundingClientRect();
      // Grows over the first stretch of the stage scrolling past, then holds full size while it stays pinned.
      // The growth starts only once the visitor scrolls, not while the stage is just peeking.
      // Each stage sets how long its growth lasts (in screen heights), so the moment is given its time.
      var span = parseFloat(s.getAttribute('data-span')) || 0.62;
      var p = (vh * 0.66 - r.top) / (vh * span);
      p = Math.max(0, Math.min(1, p));
      p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      s.style.setProperty('--p', p.toFixed(4));
      // The ground stays in the hero colour most of the way, and turns light as the card reaches full size.
      var q = Math.max(0, Math.min(1, (p - 0.55) / 0.4)); q = q * q * (3 - 2 * q);
      s.style.setProperty('--q', q.toFixed(4));
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('click', function () { setTimeout(update, 50); });
  update();
})();

/* marquee-wait: the logo wall starts moving only when the visitor reaches it, so the first logos are seen first. */
(function () {
  var walls = document.querySelectorAll('.marquee');
  if (!walls.length || !('IntersectionObserver' in window)) return;
  walls.forEach(function (w) { w.classList.add('waiting'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var w = e.target;
        setTimeout(function () { w.classList.remove('waiting'); }, 1200);
        io.unobserve(w);
      }
    });
  }, { threshold: 0.6 });
  walls.forEach(function (w) { io.observe(w); });
})();

/* Two-tab blocks (values and principles): click or arrow keys switch, one panel shows at a time. */
(function () {
  document.querySelectorAll('.btabs').forEach(function (list) {
    var tabs = list.querySelectorAll('[data-btab]');
    function open(btn) {
      tabs.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
        var p = document.querySelector('[data-bpanel="' + b.getAttribute('data-btab') + '"]'); if (p) p.hidden = !on;
      });
    }
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { open(b); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var rtl = b.closest('[dir="rtl"]') !== null, step = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
        var n = tabs[(i + step + tabs.length) % tabs.length]; n.focus(); open(n); e.preventDefault();
      });
    });
  });
})();

/* reveal-on-scroll: sections below the first screen rise gently into place as the visitor reaches them. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var items = document.querySelectorAll('main section.block > .wrap');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('reveal'); io.observe(el); }
  });
  setTimeout(function () { items.forEach(function (el) { el.classList.add('in'); }); }, 4000);
})();


/* search-focus-trap: while search is open, the keyboard stays inside it, Escape closes it, and focus returns to the search button. */
(function () {
  var ov = document.getElementById("search"), opener = document.getElementById("search-open");
  if (!ov || !opener) return;
  var mo = new MutationObserver(function () { if (ov.hidden) opener.focus(); });
  mo.observe(ov, { attributes: true, attributeFilter: ["hidden"] });
  ov.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = Array.prototype.filter.call(ov.querySelectorAll("a[href],button,input,[tabindex]:not([tabindex=\"-1\"])"), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });
})();

/* actors-flow-play: place the actors on the ring; each step travels around the ring (or along a spoke to finance), the caption follows. */
(function () {
  document.querySelectorAll(".actors-flow").forEach(function (fig) {
    var rtl = fig.closest("[dir=\"rtl\"]") !== null, R = 38;
    var stage = fig.querySelector(".af-stage"), lines = fig.querySelector(".af-lines"), pulse = fig.querySelector(".af-pulse"), cap = fig.querySelector(".af-caption");
    var nodes = fig.querySelectorAll(".af-node"), ang = {};
    nodes.forEach(function (n, i) {
      var d = -90 + i * (360 / nodes.length); if (rtl) d = 180 - d;
      var a = d * Math.PI / 180; ang[n.getAttribute("data-node")] = a;
      n.style.left = (50 + R * Math.cos(a)) + "%"; n.style.top = (50 + R * Math.sin(a)) + "%";
    });
    function pt(a, r) { return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]; }
    var steps = []; try { steps = JSON.parse(fig.getAttribute("data-steps")); } catch (e) { return; }
    var ns = "http://www.w3.org/2000/svg", segs = [];
    steps.forEach(function (st, i) {
      var p = document.createElementNS(ns, "path"), seg;
      if (st[0] === "core" || st[1] === "core") {
        var ring = st[0] === "core" ? st[1] : st[0], a = ang[ring], out = st[0] === "core";
        seg = { kind: "spoke", a: a, from: out ? 17 : R, to: out ? R : 17 };
        var p1 = pt(a, seg.from), p2 = pt(a, seg.to); p.setAttribute("d", "M" + p1 + "L" + p2);
      } else {
        var a1 = ang[st[0]], a2 = ang[st[1]], dlt = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
        seg = { kind: "arc", a1: a1, d: dlt };
        var q1 = pt(a1, R), q2 = pt(a2, R);
        p.setAttribute("d", "M" + q1 + "A" + R + " " + R + " 0 " + (Math.abs(dlt) > Math.PI ? 1 : 0) + " " + (dlt > 0 ? 1 : 0) + " " + q2);
      }
      p.setAttribute("data-k", i); lines.appendChild(p); segs.push(seg);
    });
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function at(seg, e) { return seg.kind === "spoke" ? pt(seg.a, seg.from + (seg.to - seg.from) * e) : pt(seg.a1 + seg.d * e, R); }
    function show(i) {
      var st = steps[i];
      fig.querySelectorAll(".is-from,.is-to").forEach(function (n) { n.classList.remove("is-from", "is-to"); });
      lines.querySelectorAll("path").forEach(function (l) { l.classList.toggle("on", +l.getAttribute("data-k") === i); });
      var f = stage.querySelector("[data-node=\"" + st[0] + "\"]"), to = stage.querySelector("[data-node=\"" + st[1] + "\"]");
      if (f) f.classList.add("is-from"); if (to) to.classList.add("is-to");
      if (st[1] === "investors") { var bd = stage.querySelector("[data-node=\"board\"]"); if (bd) bd.classList.add("is-to"); }
      cap.textContent = st[2];
      var p0 = at(segs[i], reduce ? 1 : 0); pulse.setAttribute("cx", p0[0]); pulse.setAttribute("cy", p0[1]);
      if (reduce) return;
      var t0 = null;
      function frame(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1300), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, q = at(segs[i], e);
        pulse.setAttribute("cx", q[0]); pulse.setAttribute("cy", q[1]); if (p < 1) requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
    }
    var k = 0; show(0);
    if (reduce) return;
    var timer = null;
    // Each step stays long enough to read its caption: longer lines hold longer.
    function dwell(i) { return Math.max(3400, 1600 + steps[i][2].length * 38); }
    function next() { timer = setTimeout(function () { k = (k + 1) % steps.length; show(k); next(); }, dwell(k)); }
    function start() { if (!timer) next(); }
    function stop() { clearTimeout(timer); timer = null; }
    if ("IntersectionObserver" in window) { new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }, { threshold: 0.3 }).observe(fig); } else start();
  });
})();



/* problem-story: the investor thread and the founder's evening, played as one story. Side by side (wide screens): the chat plays to the time marker, the clock runs 4:31 to 8:47 pm while each source lights up, then the 8:47 answer and the rest of the thread arrive. Stacked (phones): the chat and the clock each play when they come into view. Without motion everything shows at once, at its end state. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.night').forEach(function (f) {
    var phone = f.querySelector('.night-phone') || f, runway = f.querySelector('.night-runway');
    var items = Array.prototype.slice.call(f.querySelectorAll('.np-thread > li'));
    var gapAt = items.findIndex(function (li) { return li.classList.contains('np-gap'); });
    var c = f.querySelector('.hh-clock'), panel = c ? c.closest('.hc-hunt') : null;
    var wide = window.matchMedia('(min-width: 821px)').matches && panel && gapAt >= 0;

    // The clock: a time, a filling bar, the hours spent, and the sources lit as they are reached.
    var clockRun = null;
    if (c) {
      var ar = c.getAttribute('data-lang') === 'ar', from = +c.getAttribute('data-from'), span = +c.getAttribute('data-span');
      var time = c.querySelector('.hh-time'), bar = c.querySelector('.hh-bar i'), spent = c.querySelector('.hh-spent b');
      var srcs = panel.querySelectorAll('[data-at]'), started = false;
      var clk = function (m) { var h = Math.floor(m / 60) % 12 || 12, mm = m % 60; return h + ':' + (mm < 10 ? '0' : '') + mm + (ar ? ' م' : ' pm'); };
      var dur = function (m) { var h = Math.floor(m / 60), mm = m % 60; return ar ? h + ' س ' + mm + ' د' : h + ' h ' + mm + ' min'; };
      var draw = function (k) {
        var e = Math.round(span * k);
        time.textContent = clk(from + e); spent.textContent = dur(e); bar.style.width = (k * 100) + '%';
        srcs.forEach(function (s) { s.classList.toggle('hh-on', e >= +s.getAttribute('data-at')); });
      };
      panel.classList.add('hh-armed'); draw(0);
      clockRun = function (done) {
        if (started) return; started = true;
        var t0 = Date.now(), d = 5200;
        var iv = setInterval(function () {
          var k = Math.min(1, (Date.now() - t0) / d); draw(k);
          if (k >= 1) { clearInterval(iv); panel.classList.add('hh-done'); if (done) done(); }
        }, 40);
      };
    }

    // The chat: messages arrive one at a time.
    f.classList.add('armed');
    var show = function (i) { if (items[i]) items[i].classList.add('shown'); };
    var playFrom = function (i, last, gap, done) {
      if (i > last) { if (done) done(); return; }
      show(i); setTimeout(function () { playFrom(i + 1, last, gap, done); }, gap);
    };
    var go = function () {
      if (wide) {
        playFrom(0, gapAt, 900, function () {
          setTimeout(function () { clockRun(function () { setTimeout(function () { playFrom(gapAt + 1, items.length - 1, 1300); }, 400); }); }, 300);
        });
      } else {
        playFrom(0, items.length - 1, 900);
      }
    };
    var io1 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io1.disconnect(); go(); } }); }, { threshold: 0.35 });
    io1.observe(phone);

    // On phones the clock plays when its own panel comes into view.
    if (c && !wide) {
      var io3 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io3.disconnect(); setTimeout(function () { clockRun(); }, 300); } }); }, { threshold: 0.6 });
      io3.observe(panel);
    }

    // The week bars move once the cost panel is in view.
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { setTimeout(function () { f.classList.add('played'); }, 900); io2.disconnect(); } }); }, { threshold: 0.5 });
    if (runway) io2.observe(runway);
  });
})();
