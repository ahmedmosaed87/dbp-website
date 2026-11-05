/*
 * WHAT THIS DOES: Shows each visitor the price list for their region, in their region's currency, and the
 * international US dollar list everywhere else. The visitor can switch list at any time.
 * WHY IT MATTERS: A price a visitor must convert in their head is friction; a wrong or drifting price is a
 * trust leak. So every amount here is written down and reviewed, never computed on the fly.
 * RULES (founder, 6 Nov 2026):
 *   - The international list is in US dollars. A country with no price list, or with an unstable currency, sees it.
 *   - Each region may have its own list, priced for its market, in its own currency. Today the regional lists
 *     are the international list converted: Saudi riyal at the exact fixed rate, UAE dirham and Qatari riyal
 *     rounded to the nearest 10, euro and pound approximate at a stated rate date and refreshed monthly.
 *   - Egypt sees the international list with an invitation to ask for local pricing.
 * PRIVACY: the region is inferred from the browser's own time zone. Nothing is sent anywhere.
 */
(function () {
  var RATE_DATE = { en: '5 Nov 2026', ar: '5 نوفمبر 2026' };

  // One price list per region: its currency, how amounts are written, what the visitor is told, and the amounts per plan.
  var LISTS = {
    USD: {
      fmt: { en: function (n) { return '$' + n; }, ar: function (n) { return '$' + n; } },
      note: { en: 'Prices in US dollars, a month.', ar: 'الأسعار بالدولار الأمريكي شهريًا.' },
      prices: { startup: 0, core: 500, coreplus: 1000, optimize: 2000, grow: 3000 }
    },
    SAR: { // Saudi Arabia: fixed rate 3.75, exact
      fmt: { en: function (n) { return 'SAR ' + n; }, ar: function (n) { return n + ' ر.س'; } },
      note: { en: 'Prices in Saudi riyals, a month.', ar: 'الأسعار بالريال السعودي شهريًا.' },
      prices: { startup: 0, core: 1875, coreplus: 3750, optimize: 7500, grow: 11250 }
    },
    AED: { // United Arab Emirates: fixed rate 3.6725, nearest 10
      fmt: { en: function (n) { return 'AED ' + n; }, ar: function (n) { return n + ' د.إ'; } },
      note: { en: 'Prices in UAE dirhams, a month.', ar: 'الأسعار بالدرهم الإماراتي شهريًا.' },
      prices: { startup: 0, core: 1840, coreplus: 3670, optimize: 7350, grow: 11020 }
    },
    QAR: { // Qatar: fixed rate 3.64, nearest 10
      fmt: { en: function (n) { return 'QAR ' + n; }, ar: function (n) { return n + ' ر.ق'; } },
      note: { en: 'Prices in Qatari riyals, a month.', ar: 'الأسعار بالريال القطري شهريًا.' },
      prices: { startup: 0, core: 1820, coreplus: 3640, optimize: 7280, grow: 10920 }
    },
    EUR: { // Euro area: ECB reference rate 1.1224 on 5 Nov 2026, nearest 10, approximate
      fmt: { en: function (n) { return '≈ €' + n; }, ar: function (n) { return '≈ €' + n; } },
      note: { en: 'Approximate prices in euros, a month, at the exchange rate of ' + RATE_DATE.en + '. Our prices are set in US dollars.', ar: 'أسعار تقريبية باليورو شهريًا، بسعر الصرف في ' + RATE_DATE.ar + '. أسعارنا محدّدة بالدولار الأمريكي.' },
      prices: { startup: 0, core: 450, coreplus: 890, optimize: 1780, grow: 2670 }
    },
    GBP: { // United Kingdom: market rate 1.3467 on 5 Nov 2026, nearest 10, approximate
      fmt: { en: function (n) { return '≈ £' + n; }, ar: function (n) { return '≈ £' + n; } },
      note: { en: 'Approximate prices in pounds sterling, a month, at the exchange rate of ' + RATE_DATE.en + '. Our prices are set in US dollars.', ar: 'أسعار تقريبية بالجنيه الإسترليني شهريًا، بسعر الصرف في ' + RATE_DATE.ar + '. أسعارنا محدّدة بالدولار الأمريكي.' },
      prices: { startup: 0, core: 370, coreplus: 740, optimize: 1490, grow: 2230 }
    }
  };
  var EGYPT_NOTE = { en: ' In Egypt? Ask us for local pricing.', ar: ' في مصر؟ اسألنا عن الأسعار المحلية.' };

  // Which time zones belong to a region with its own list; every other place sees the international list.
  var EURO_ZONES = ['Amsterdam', 'Andorra', 'Athens', 'Berlin', 'Bratislava', 'Brussels', 'Dublin', 'Helsinki', 'Lisbon', 'Ljubljana', 'Luxembourg', 'Madrid', 'Malta', 'Monaco', 'Paris', 'Podgorica', 'Riga', 'Rome', 'San_Marino', 'Tallinn', 'Vatican', 'Vienna', 'Vilnius', 'Zagreb', 'Mariehamn'];
  var UK_ZONES = ['London', 'Belfast', 'Guernsey', 'Jersey', 'Isle_of_Man'];
  function zone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }
  function detect(tz) {
    if (tz === 'Asia/Riyadh') return 'SAR';
    if (tz === 'Asia/Dubai') return 'AED';
    if (tz === 'Asia/Qatar') return 'QAR';
    if (tz.indexOf('Europe/') === 0 && UK_ZONES.indexOf(tz.slice(7)) >= 0) return 'GBP';
    if (tz.indexOf('Europe/') === 0 && EURO_ZONES.indexOf(tz.slice(7)) >= 0) return 'EUR';
    if (tz === 'Atlantic/Canary' || tz === 'Atlantic/Madeira' || tz === 'Atlantic/Azores' || tz === 'Africa/Ceuta' || tz === 'Asia/Nicosia') return 'EUR';
    return 'USD';
  }

  // Write thousands with commas so 11250 reads as 11,250.
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function langOf(el) { var l = el.closest('[lang]'); return l && l.getAttribute('lang') === 'ar' ? 'ar' : 'en'; }

  // Show every plan price, and the explaining line, from the chosen list.
  var tz = zone();
  var inEgypt = tz === 'Africa/Cairo';
  function apply(id) {
    var list = LISTS[id] || LISTS.USD;
    document.querySelectorAll('[data-plan-price]').forEach(function (el) {
      var plan = el.getAttribute('data-plan-price');
      var useList = list.prices[plan] === undefined ? LISTS.USD : list;
      el.textContent = useList.fmt[langOf(el)](group(useList.prices[plan]));
    });
    document.querySelectorAll('.cur-note').forEach(function (p) {
      var lang = langOf(p);
      p.textContent = list.note[lang] + (id === 'USD' && inEgypt ? EGYPT_NOTE[lang] : '');
    });
    document.querySelectorAll('.cur button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-cur') === id ? 'true' : 'false');
    });
  }

  // A visitor's own choice wins over the guess, and is remembered on this device only.
  if (!document.querySelector('[data-plan-price]')) return;
  var saved = null;
  try { saved = localStorage.getItem('dbp-currency'); } catch (e) { saved = null; }
  apply(saved && LISTS[saved] ? saved : detect(tz));
  document.querySelectorAll('.cur button').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-cur');
      try { localStorage.setItem('dbp-currency', id); } catch (e) { /* the page works without it */ }
      apply(id);
    });
  });
})();
