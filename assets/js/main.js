/* =============================================================
   main.js — mode toggle, scroll reveals, sticky header state
   ============================================================= */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ------------------------------------------------ mode toggle */

  function setMode(mode, persist) {
    root.setAttribute('data-mode', mode);
    if (persist) {
      try { localStorage.setItem('site-mode', mode); } catch (e) {}
    }
    var btn = document.querySelector('.mode-toggle');
    if (btn) btn.setAttribute('aria-pressed', mode === 'fun' ? 'true' : 'false');
    /* space.js listens for this and eases its palette across */
    window.dispatchEvent(new CustomEvent('mode:change', { detail: mode }));
  }

  var toggle = document.querySelector('.mode-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      setMode(root.getAttribute('data-mode') === 'fun' ? 'dark' : 'fun', true);
    });
  }

  /* press "f" anywhere outside a field to flip modes */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    if (el && el.isContentEditable) return;
    setMode(root.getAttribute('data-mode') === 'fun' ? 'dark' : 'fun', true);
  });

  /* announce the mode the inline head script already applied */
  setMode(root.getAttribute('data-mode') || 'dark', false);

  /* ------------------------------------------------ sticky header */

  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------ scroll reveals */

  /* site.js builds its cards on DOMContentLoaded, and it registers that
     listener first (it loads from <head>), so waiting for the same event
     means the injected cards are already here to be observed. */
  function initReveals() {
    var reveals = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    Array.prototype.forEach.call(reveals, function (el) {
      /* safe to call twice: an element is only ever observed once */
      if (el.getAttribute('data-revealing')) return;
      el.setAttribute('data-revealing', '1');

      /* stagger siblings a little unless the markup sets its own delay */
      if (!el.style.getPropertyValue('--delay')) {
        var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.setProperty('--delay', Math.min(idx, 6) * 70 + 'ms');
      }
      io.observe(el);
    });
  }

  /* site.js calls this straight after it injects its cards, so they reveal
     whichever of the two files gets to run first */
  window.siteInitReveals = initReveals;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveals);
  } else {
    initReveals();
  }
})();
