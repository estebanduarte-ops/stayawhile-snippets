/**
 * Enjoy Unique Stays · Blog TOC
 * Scroll-spy + mobile accordion for the [eus_toc] sidebar nav printed by
 * eus-blog-enhancements.php. Hosted externally (GitHub + jsDelivr) because
 * Cloudflare's WAF blocks saving inline <script> blocks in WP snippets.
 * v1.0.0
 */
(function () {
  function init() {
    var toc = document.querySelector('[data-eus-toc]');
    if (!toc || toc.dataset.eusInit) return;
    toc.dataset.eusInit = '1';

    var links = [].slice.call(toc.querySelectorAll('.eus-toc__list a[href^="#"]'));
    var heads = links.map(function (a) {
      return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    });
    if (!links.length) return;

    var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--eus-scroll-offset'), 10) || 120;

    function spy() {
      var current = -1;
      for (var i = 0; i < heads.length; i++) {
        if (heads[i] && heads[i].getBoundingClientRect().top <= offset + 12) current = i;
      }
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === current); });
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () { spy(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    spy();

    /* mobile accordion */
    var btn = toc.querySelector('.eus-toc__toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var open = toc.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.forEach(function (a) {
        a.addEventListener('click', function () {
          if (getComputedStyle(btn).display !== 'none') {
            toc.classList.remove('is-open');
            btn.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }

    /* back to top */
    var top = toc.querySelector('.eus-toc__top');
    if (top) {
      top.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
