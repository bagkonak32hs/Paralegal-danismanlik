/**
 * ============================================================
 * PARALEGAL DANIŞMANLIK — Main Application Script
 * Version 2.0 | Premium Legal-Tech Redesign
 * Architecture: IIFE modules, idempotent init guard
 * ============================================================
 */

(() => {
  'use strict';

  /* Prevent double initialization (e.g., multiple script tags) */
  if (window.__paralegalInit) return;
  window.__paralegalInit = true;

  /* ============================================================
     UTILITIES
     ============================================================ */

  /**
   * Safe querySelector — returns null if element not found
   */
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /**
   * Debounce: delays fn execution until after `wait` ms
   */
  function debounce(fn, wait = 150) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }


  /* ============================================================
     MODULE: PRELOADER (logo reveal → site)
     ============================================================ */
  (function initPreloader() {
    const el = qs('#preloader');
    if (!el) return;

    const MIN_MS = 1400;           // minimum time the logo stays on screen
    const MAX_MS = 4500;           // failsafe
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      el.classList.add('is-done');
      window.dispatchEvent(new Event('preloader:done'));
      setTimeout(() => el.remove(), 1000);
    }

    function schedule() {
      const wait = Math.max(0, MIN_MS - performance.now());
      setTimeout(finish, wait);
    }

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    setTimeout(finish, MAX_MS);
  })();


  /* ============================================================
     MODULE: NAVIGATION
     ============================================================ */
  (function initNav() {
    const header    = qs('#header');
    const toggle    = qs('#nav-toggle');
    const navLinks  = qs('#nav-links');
    if (!header || !toggle || !navLinks) return;

    /* ---- Mobile menu open/close ---- */
    function openMenu() {
      navLinks.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
    }

    function closeMenu() {
      navLinks.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    }

    function toggleMenu() {
      navLinks.classList.contains('is-open') ? closeMenu() : openMenu();
    }

    toggle.addEventListener('click', toggleMenu);

    /* Close on Escape key */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('is-open')) closeMenu();
    });

    /* Close when any nav item is clicked */
    qsa('a', navLinks).forEach(link => {
      link.addEventListener('click', () => closeMenu());
    });

    /* Close when clicking outside the nav */
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });

    /* ---- Sticky header style on scroll ---- */
    function updateHeader() {
      const scrolled = window.scrollY > 60;
      header.classList.toggle('scrolled', scrolled);
    }

    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    /* ---- Active link on scroll (Intersection Observer) ---- */
    const sections = qsa('section[id]');
    if (sections.length && 'IntersectionObserver' in window) {
      const sectionObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          qsa('.nav__link').forEach(link => {
            const href = link.getAttribute('href');
            const isActive = href === `#${id}` || (href === 'index.html' && id === 'hero');
            link.classList.toggle('active', isActive);
          });
        });
      }, { threshold: 0.35, rootMargin: '-70px 0px -40% 0px' });

      sections.forEach(s => sectionObs.observe(s));
    }

    /* ---- Sync CSS header height variable ---- */
    function syncHeaderHeight() {
      const h = header.getBoundingClientRect().height || 72;
      document.documentElement.style.setProperty('--header-h', `${Math.ceil(h)}px`);
    }
    const syncDebounced = debounce(syncHeaderHeight, 100);
    window.addEventListener('resize',      syncDebounced, { passive: true });
    window.addEventListener('load',        syncHeaderHeight, { once: true });
    new MutationObserver(syncHeaderHeight).observe(header, { childList: true, subtree: true, attributes: true });
    syncHeaderHeight();

  })();


  /* ============================================================
     MODULE: HERO SLIDER
     ============================================================ */
  (function initSlider() {
    const hero = qs('.hero');
    if (!hero) return;

    /* Image paths (SLD4 & SLD5 are used in content sections) */
    const bases   = ['/images/SLD1', '/images/SLD2', '/images/SLD3', '/images/SLD6', '/images/SLD7'];
    const toSrc   = b => `${b}.png`;
    const FADE_MS = 800;
    const TICK_MS = 4000;

    /* Ensure slide layers exist */
    let layers = qsa('.hero__slide', hero);
    if (layers.length < 2) {
      const makeLayer = () => {
        const d = document.createElement('div');
        d.className = 'hero__slide';
        const img = document.createElement('img');
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        d.appendChild(img);
        return d;
      };
      const la = makeLayer();
      const lb = makeLayer();
      hero.querySelector('.hero__slider').append(la, lb);
      layers = [la, lb];
    }

    const [A, B] = layers;
    const imgA   = qs('img', A);
    const imgB   = qs('img', B);

    /* Load first image */
    imgA.src = toSrc(bases[0]);
    A.classList.add('show');

    let idx     = 0;
    let topIsA  = true;
    let busy    = false;
    let timer   = null;

    function showSlide(n) {
      if (busy) return;
      busy = true;
      const next      = ((n % bases.length) + bases.length) % bases.length;
      const topLayer  = topIsA ? A : B;
      const underLayer= topIsA ? B : A;
      const underImg  = qs('img', underLayer);

      underImg.src = toSrc(bases[next]);

      /* Trigger reflow, then crossfade */
      void underLayer.offsetWidth;
      underLayer.classList.add('show');
      topLayer.classList.remove('show');

      setTimeout(() => {
        topIsA = !topIsA;
        idx    = next;
        busy   = false;
      }, FADE_MS);
    }

    const nextSlide = () => showSlide(idx + 1);
    const prevSlide = () => showSlide(idx - 1);

    function startTimer() { stopTimer(); timer = setInterval(nextSlide, TICK_MS); }
    function stopTimer()  { if (timer) { clearInterval(timer); timer = null; } }

    startTimer();

    /* Pause on hover (desktop) */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('mouseenter', stopTimer);
      hero.addEventListener('mouseleave', startTimer);
    }

    /* Pause when tab hidden */
    document.addEventListener('visibilitychange', () => {
      document.hidden ? stopTimer() : startTimer();
    });

    /* Keyboard navigation */
    hero.tabIndex = 0;
    hero.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { stopTimer(); nextSlide(); startTimer(); }
      if (e.key === 'ArrowLeft')  { stopTimer(); prevSlide(); startTimer(); }
    });

    /* Touch/swipe */
    let touchStartX = null;
    hero.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    hero.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 48) {
        stopTimer();
        dx < 0 ? nextSlide() : prevSlide();
        startTimer();
      }
      touchStartX = null;
    }, { passive: true });

  })();


  /* ============================================================
     MODULE: SCROLL REVEAL (IntersectionObserver)
     ============================================================ */
  (function initReveal() {
    if (!('IntersectionObserver' in window)) {
      /* Fallback: make everything visible */
      qsa('[data-reveal], [data-hero-reveal]').forEach(el => el.classList.add('is-visible'));
      return;
    }

    /* Reveal hero content on load (after the preloader lifts, when present) */
    const revealHero = () => {
      qsa('[data-hero-reveal]').forEach(el => {
        requestAnimationFrame(() => el.classList.add('is-visible'));
      });
    };
    if (qs('#preloader')) window.addEventListener('preloader:done', revealHero, { once: true });
    else window.addEventListener('load', revealHero, { once: true });

    /* Scroll-triggered reveal for section elements */
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, {
      threshold:  0.12,
      rootMargin: '0px 0px -48px 0px'
    });

    qsa('[data-reveal]').forEach(el => revealObs.observe(el));

  })();


  /* ============================================================
     MODULE: ABOUT LOGO ANIMATION
     ============================================================ */
  (function initAboutLogo() {
    const logo = qs('#aboutlogo');
    if (!logo) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          logo.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
          logo.style.opacity    = '1';
          logo.style.transform  = 'scale(1)';
          obs.unobserve(logo);
        }
      });
    }, { threshold: 0.2 });

    logo.style.opacity   = '0';
    logo.style.transform = 'scale(0.93)';
    obs.observe(logo);
  })();


  /* ============================================================
     MODULE: CONTACT FORM — Web3Forms async submit
     ============================================================ */
  (function initForms() {
    const forms = qsa('form[action*="web3forms.com/submit"]');

    forms.forEach(form => {
      if (form.dataset.bound === '1') return;
      form.dataset.bound = '1';

      const submitBtn = qs('[type="submit"]', form);
      const msgEl     = qs('.form-msg', form);

      function setMsg(text, type /* 'success' | 'error' */) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.className   = `form-msg ${type}`;
      }

      function resetMsg() {
        if (!msgEl) return;
        msgEl.textContent = '';
        msgEl.className   = 'form-msg';
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetMsg();

        const fd = new FormData(form);
        if (!fd.get('access_key')) {
          fd.append('access_key', '853d3157-7c4d-4506-94ac-1c54d873a7b5');
        }

        /* Lock UI */
        if (submitBtn) {
          submitBtn.disabled = true;
          const origHTML = submitBtn.innerHTML;
          submitBtn.dataset.origHTML = origHTML;
          submitBtn.innerHTML = '<span>Gönderiliyor...</span>';
        }

        try {
          const res  = await fetch(form.action, {
            method:  'POST',
            body:    fd,
            headers: { Accept: 'application/json' }
          });
          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success !== false) {
            form.reset();
            setMsg('Teşekkürler! Mesajınız başarıyla iletildi. En kısa sürede geri dönüş yapacağız.', 'success');
          } else {
            setMsg(data.message || data.error || 'Gönderim başarısız. Lütfen tekrar deneyin.', 'error');
          }
        } catch {
          setMsg('Ağ hatası oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.origHTML || 'Gönder';
          }
        }
      });
    });
  })();


  /* ============================================================
     MODULE: SMOOTH SCROLL (for anchor links)
     ============================================================ */
  (function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const header = qs('#header');
      const headerH = header ? header.getBoundingClientRect().height : parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '72'
      );
      const offset = href === '#contact' ? 16 : (headerH + 16);
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  })();


  /* ============================================================
     MODULE: iOS / iPadOS viewport height fix
     ============================================================ */
  (function fixVh() {
    const apply = () => {
      document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    };
    const run = () => requestAnimationFrame(apply);
    run();
    window.addEventListener('resize',            run, { passive: true });
    window.addEventListener('orientationchange', run, { passive: true });
    window.addEventListener('pageshow',          run);
    document.addEventListener('visibilitychange', run);
  })();


  /* ============================================================
     MODULE: NAV LOGO FADE-IN
     ============================================================ */
  (function initLogoAnim() {
    const logo = qs('#nav-logo-img');
    if (!logo) return;
    logo.style.opacity    = '0';
    logo.style.transform  = 'translateY(-12px)';
    logo.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    setTimeout(() => {
      logo.style.opacity   = '1';
      logo.style.transform = 'translateY(0)';
    }, 80);
  })();

})();
