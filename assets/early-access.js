/*
 * WHAT THIS DOES: Runs the COACTA early-access form: suggestion chips the visitor can tap, a human check (Cloudflare
 * Turnstile), and sending the request to our private receiver. The visitor sees a clear thank-you or a clear reason
 * when something is missing.
 * PRIVACY: nothing is sent until the visitor presses the button and has agreed to be contacted.
 */
(function () {
  document.querySelectorAll('form.ea-form').forEach(function (form) {
    var lang = form.getAttribute('data-lang') || 'en';
    var endpoint = form.getAttribute('data-endpoint');
    var siteKey = form.getAttribute('data-sitekey');
    var msg = form.querySelector('.ea-msg'), btn = form.querySelector('button[type="submit"]');
    var T = lang === 'ar'
      ? { missing: 'أكمل الحقول المطلوبة، ووافق على أن نتواصل معك.', robot: 'لم يكتمل التحقق. أعد المحاولة بعد لحظة.', fail: 'تعذّر الإرسال الآن. أعد المحاولة، أو راسلنا على info@deep-bp.com.', sending: 'جارٍ الإرسال…' }
      : { missing: 'Please complete the required fields and agree to be contacted.', robot: 'The human check did not complete. Please try again in a moment.', fail: 'We could not send it just now. Please try again, or email info@deep-bp.com.', sending: 'Sending…' };

    // Suggestion chips: tap to add what you want first; your own words stay in the box below.
    form.querySelectorAll('.ea-chips button').forEach(function (c) {
      c.addEventListener('click', function () { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
    });

    // The human check renders once its script has loaded.
    var widget = null, holder = form.querySelector('.ea-turnstile');
    function renderCheck() {
      if (!window.turnstile || !holder || widget !== null || !siteKey) return;
      widget = window.turnstile.render(holder, { sitekey: siteKey, language: lang, theme: 'light', size: 'flexible' });
    }
    var tries = 0, iv = setInterval(function () { renderCheck(); if (widget !== null || ++tries > 60) clearInterval(iv); }, 250);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var wants = Array.prototype.map.call(form.querySelectorAll('.ea-chips button[aria-pressed="true"]'), function (c) { return c.textContent.trim(); }).join(' · ');
      var body = {
        name: d.get('name'), email: d.get('email'), company: d.get('company'), role: d.get('role'), stage: d.get('stage'),
        country: d.get('country'), wants: wants, note: d.get('note'), lang: lang, consent: d.get('consent') === 'on',
        turnstile: window.turnstile && widget !== null ? window.turnstile.getResponse(widget) : '',
      };
      if (!form.checkValidity() || !body.consent) { msg.textContent = T.missing; msg.className = 'ea-msg err'; form.reportValidity(); return; }
      btn.disabled = true; msg.textContent = T.sending; msg.className = 'ea-msg';
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (res.ok) { form.hidden = true; form.parentNode.querySelector('.ea-done').hidden = false; return; }
          msg.textContent = res.error === 'robot' ? T.robot : res.error === 'missing' ? T.missing : T.fail; msg.className = 'ea-msg err';
          btn.disabled = false; if (window.turnstile && widget !== null) window.turnstile.reset(widget);
        })
        .catch(function () { msg.textContent = T.fail; msg.className = 'ea-msg err'; btn.disabled = false; });
    });
  });
})();
