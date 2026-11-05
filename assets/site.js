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

/* Plays the DBP sign's story once on opening, and again whenever Replay is pressed. */
(function () {
  document.querySelectorAll('.merge').forEach(function (fig) {
    function play() { fig.classList.remove('play'); void fig.offsetWidth; fig.classList.add('play'); }
    var btn = fig.querySelector('.replay'); if (btn) btn.addEventListener('click', play);
    play();
  });
  // When the language changes, play the story of the version now shown.
  ['btn-ar', 'btn-en'].forEach(function (id) { var b = document.getElementById(id); if (b) b.addEventListener('click', function () {
    document.querySelectorAll('.merge').forEach(function (fig) { fig.classList.remove('play'); void fig.offsetWidth; fig.classList.add('play'); });
  }); });
})();
