/*
 * WHAT THIS DOES: Switches the pricing page between products (Finance as a Service, the COACTA platform,
 * and any product added later). A link such as pricing.html#coacta opens that product's tab directly.
 * HOW TO ADD A PRODUCT: add one tab button (data-ptab="id") and one panel (data-ptab-panel="id") in each
 * language; nothing here changes.
 */
(function () {
  var tabs = document.querySelectorAll('[data-ptab]');
  if (!tabs.length) return;

  // Show one product's panel and mark its tab, in both languages at once.
  function open(id) {
    if (!document.querySelector('[data-ptab-panel="' + id + '"]')) id = tabs[0].getAttribute('data-ptab');
    tabs.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-ptab') === id ? 'true' : 'false'); b.tabIndex = b.getAttribute('data-ptab') === id ? 0 : -1; });
    document.querySelectorAll('[data-ptab-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-ptab-panel') !== id; });
  }

  // A click opens the product and records it in the address, so the link can be shared.
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-ptab');
      open(id);
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* the tab still opens */ }
    });
    // Arrow keys move between tabs, as a keyboard user expects.
    b.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      var group = Array.prototype.slice.call(b.parentNode.querySelectorAll('[data-ptab]'));
      var i = group.indexOf(b), rtl = b.closest('[dir="rtl"]') !== null;
      var step = (ev.key === 'ArrowRight') !== rtl ? 1 : -1;
      var next = group[(i + step + group.length) % group.length];
      next.focus(); next.click(); ev.preventDefault();
    });
  });

  // Open the product named in the address, or the first one.
  open((location.hash || '').replace('#', '') || tabs[0].getAttribute('data-ptab'));
})();
