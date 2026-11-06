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

/* runway-countdown: when the night scene comes into view, the runway counts down 14 to 11 and the thread appears message by message. */
(function () {
  var figs = document.querySelectorAll('.night');
  if (!figs.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function settle(f) { f.classList.add('played'); var b = f.querySelector('.nr-figure b'); if (b) b.textContent = '11'; }
  function play(f) {
    if (reduce) { settle(f); return; }
    f.classList.add('playing');
    var b = f.querySelector('.nr-figure b'), n = 14;
    setTimeout(function step() { n -= 1; if (b) b.textContent = String(n); if (n > 11) setTimeout(step, 520); else f.classList.add('played'); }, 2600);
  }
  if (!('IntersectionObserver' in window)) { figs.forEach(settle); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { play(e.target); io.unobserve(e.target); } }); }, { threshold: 0.35 });
  figs.forEach(function (f) { io.observe(f); });
})();
