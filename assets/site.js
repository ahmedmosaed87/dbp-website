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
    try { localStorage.setItem('dbp-lang', lang); } catch (e) {}
  }
  bAr.addEventListener('click', function () { show('ar'); });
  bEn.addEventListener('click', function () { show('en'); });
  // Start with a language named in the link (?lang=ar or ?lang=en), else the visitor's last choice, else their browser language.
  var asked = (location.search.match(/[?&]lang=(ar|en)\b/) || [])[1];
  var saved = null; try { saved = localStorage.getItem('dbp-lang'); } catch (e) {}
  show(asked || saved || ((navigator.language || '').toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en'));
})();
