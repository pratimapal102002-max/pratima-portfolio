'use strict';

/* ──────────────────────────────────────────────────────────
   1. PRELOADER
────────────────────────────────────────────────────────── */
(function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const MIN_DISPLAY = 1800;
  const startTime   = Date.now();

  function hidePreloader() {
    const elapsed = Date.now() - startTime;
    const delay   = Math.max(0, MIN_DISPLAY - elapsed);
    setTimeout(() => {
      preloader.classList.add('hidden');
      preloader.addEventListener('transitionend', () => {
        preloader.remove();
      }, { once: true });
      document.body.style.overflow = '';
    }, delay);
  }

  document.body.style.overflow = 'hidden';

  if (document.readyState === 'complete') {
    hidePreloader();
  } else {
    window.addEventListener('load', hidePreloader);
  }
})();


/* ──────────────────────────────────────────────────────────
   2. CUSTOM CURSOR
────────────────────────────────────────────────────────── */
(function initCursor() {
  const follower = document.getElementById('cursorFollower');
  const dot      = document.getElementById('cursorDot');
  if (!follower || !dot) return;

  if (!window.matchMedia('(pointer: fine)').matches) return;

  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;
  let raf;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
  });

  function animateFollower() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    follower.style.left = followerX + 'px';
    follower.style.top  = followerY + 'px';
    raf = requestAnimationFrame(animateFollower);
  }
  raf = requestAnimationFrame(animateFollower);

  const hoverTargets = 'a, button, .magnetic-btn, .filter-btn, .service-card, .skill-card, .project-card, input, textarea, select, .nav-link, .play-btn, label';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverTargets)) {
      follower.classList.add('hovering');
      dot.style.transform = 'translate(-50%, -50%) scale(0.5)';
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverTargets)) {
      follower.classList.remove('hovering');
      dot.style.transform = 'translate(-50%, -50%) scale(1)';
    }
  });

  document.addEventListener('mouseleave', () => {
    follower.style.opacity = '0';
    dot.style.opacity      = '0';
  });
  document.addEventListener('mouseenter', () => {
    follower.style.opacity = '1';
    dot.style.opacity      = '1';
  });
})();


/* ──────────────────────────────────────────────────────────
   3. NAVBAR
────────────────────────────────────────────────────────── */
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const navLinks  = document.querySelectorAll('.nav-link[data-section]');
  const sections  = [];
  if (!navbar) return;

  navLinks.forEach(link => {
    const id = link.dataset.section;
    const el = document.getElementById(id);
    if (el) sections.push({ id, el, link });
  });

  function onScroll() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    const scrollMid = window.scrollY + window.innerHeight * 0.4;
    let current = sections[0];
    for (const s of sections) {
      if (s.el.offsetTop <= scrollMid) current = s;
    }
    navLinks.forEach(l => l.classList.remove('active'));
    if (current) current.link.classList.add('active');
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ──────────────────────────────────────────────────────────
   4. MOBILE MENU
────────────────────────────────────────────────────────── */
(function initMobileMenu() {
  const hamburger    = document.getElementById('hamburger');
  const navMenu      = document.getElementById('navMenu');
  const mobileOverlay = document.getElementById('mobileOverlay');
  if (!hamburger || !navMenu || !mobileOverlay) return;

  function openMenu() {
    hamburger.classList.add('open');
    navMenu.classList.add('open');
    mobileOverlay.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    navMenu.classList.remove('open');
    mobileOverlay.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    if (navMenu.classList.contains('open')) closeMenu();
    else openMenu();
  });

  mobileOverlay.addEventListener('click', closeMenu);

  navMenu.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) closeMenu();
  });
})();


/* ──────────────────────────────────────────────────────────
   5. HERO TYPING EFFECT
────────────────────────────────────────────────────────── */
(function initTyped() {
  const el = document.getElementById('heroTyped');
  if (!el) return;

  const words    = ['Web Developer', 'Frontend Developer', 'JavaScript Learner', 'Freelancer'];
  let wordIdx    = 0;
  let charIdx    = 0;
  let isDeleting = false;
  let typingTimer;

  const TYPING_SPEED   = 90;
  const DELETING_SPEED = 50;
  const PAUSE_AFTER    = 1800;
  const PAUSE_BEFORE   = 300;

  function type() {
    const word    = words[wordIdx];
    const current = isDeleting ? word.slice(0, charIdx - 1) : word.slice(0, charIdx + 1);
    el.textContent = current;

    if (!isDeleting) {
      charIdx++;
      if (charIdx > word.length) {
        isDeleting = true;
        typingTimer = setTimeout(type, PAUSE_AFTER);
        return;
      }
      typingTimer = setTimeout(type, TYPING_SPEED);
    } else {
      charIdx--;
      if (charIdx < 0) {
        isDeleting = false;
        wordIdx    = (wordIdx + 1) % words.length;
        charIdx    = 0;
        typingTimer = setTimeout(type, PAUSE_BEFORE);
        return;
      }
      typingTimer = setTimeout(type, DELETING_SPEED);
    }
  }

  setTimeout(type, 2200);
})();


/* ──────────────────────────────────────────────────────────
   6. HERO PARTICLE CANVAS
────────────────────────────────────────────────────────── */
(function initParticleCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], raf;

  const CONFIG = {
    count:      60,
    speed:      0.25,
    minR:       1,
    maxR:       2.5,
    color:      'rgba(255, 0, 0, ',
    lineColor:  'rgba(255, 0, 0, ',
    lineMaxDist: 130,
    mouseRadius: 120,
  };

  let mouse = { x: -9999, y: -9999 };

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function randomParticle() {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      vx:   (Math.random() - 0.5) * CONFIG.speed * 2,
      vy:   (Math.random() - 0.5) * CONFIG.speed * 2,
      r:    CONFIG.minR + Math.random() * (CONFIG.maxR - CONFIG.minR),
      alpha: 0.2 + Math.random() * 0.5,
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < CONFIG.count; i++) particles.push(randomParticle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0)  p.x = W;
      if (p.x > W)  p.x = 0;
      if (p.y < 0)  p.y = H;
      if (p.y > H)  p.y = 0;

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRadius) {
        const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
        p.x += (dx / dist) * force * 1.5;
        p.y += (dy / dist) * force * 1.5;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.color + p.alpha + ')';
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const q   = particles[j];
        const ldx = p.x - q.x;
        const ldy = p.y - q.y;
        const d   = Math.sqrt(ldx * ldx + ldy * ldy);
        if (d < CONFIG.lineMaxDist) {
          const a = (1 - d / CONFIG.lineMaxDist) * 0.15;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = CONFIG.lineColor + a + ')';
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
    }

    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); });
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  init();
  draw();
})();


/* ──────────────────────────────────────────────────────────
   7. MAGNETIC BUTTONS
────────────────────────────────────────────────────────── */
(function initMagneticButtons() {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const STRENGTH = 0.35;

  function attach(btn) {
    btn.addEventListener('mousemove', (e) => {
      const rect  = btn.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) * STRENGTH;
      const dy    = (e.clientY - cy) * STRENGTH;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  }

  document.querySelectorAll('.magnetic-btn').forEach(attach);
})();


/* ──────────────────────────────────────────────────────────
   8. COUNTER ANIMATIONS
────────────────────────────────────────────────────────── */
(function initCounters() {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  const DURATION = 2000;

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const start  = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
})();


/* ──────────────────────────────────────────────────────────
   9. SKILLS PROGRESS BAR ANIMATIONS
────────────────────────────────────────────────────────── */
(function initSkillBars() {
  const bars = document.querySelectorAll('.skill-bar-fill[data-width]');
  if (!bars.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar   = entry.target;
        const width = bar.dataset.width;
        setTimeout(() => {
          bar.style.width = width + '%';
        }, 150);
        observer.unobserve(bar);
      }
    });
  }, { threshold: 0.3 });

  bars.forEach(bar => observer.observe(bar));
})();


/* ──────────────────────────────────────────────────────────
   10. AOS — ANIMATE ON SCROLL
────────────────────────────────────────────────────────── */
(function initAOS() {
  if (typeof AOS === 'undefined') return;
  setTimeout(() => {
    AOS.init({
      duration:   800,
      easing:     'ease-out-cubic',
      once:       true,
      mirror:     false,
      offset:     50,
    });
    AOS.refresh();
  }, 2000);
})();


/* ──────────────────────────────────────────────────────────
   11. GSAP + SCROLL TRIGGER
────────────────────────────────────────────────────────── */
(function initGSAP() {
  if (typeof gsap === 'undefined') return;

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  gsap.from('.hero-title', {
    duration: 1.1,
    y: 60,
    opacity: 0,
    ease: 'power3.out',
    delay: 1.9,
  });

  gsap.from('.hero-desc', {
    duration: 0.9,
    y: 40,
    opacity: 0,
    ease: 'power3.out',
    delay: 2.1,
  });

  gsap.from('.hero-cta', {
    duration: 0.9,
    y: 30,
    opacity: 0,
    ease: 'power3.out',
    delay: 2.3,
  });

  gsap.from('.hero-stats', {
    duration: 0.9,
    y: 30,
    opacity: 0,
    ease: 'power3.out',
    delay: 2.5,
  });

  gsap.from('.hero-visual', {
    duration: 1.2,
    x: 80,
    opacity: 0,
    ease: 'power3.out',
    delay: 2.0,
  });

  gsap.from('.hero-badge', {
    duration: 0.8,
    y: -30,
    opacity: 0,
    ease: 'power3.out',
    delay: 1.8,
  });

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.from('.service-card', {
      scrollTrigger: {
        trigger: '.services-grid',
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      duration: 0.7,
      y: 50,
      opacity: 0,
      stagger: 0.12,
      ease: 'power3.out',
    });

    gsap.from('.stat-card', {
      scrollTrigger: {
        trigger: '.stats-grid',
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      duration: 0.7,
      y: 50,
      opacity: 0,
      stagger: 0.1,
      ease: 'power3.out',
    });

    gsap.from('.footer-brand, .footer-links-col, .footer-contact-col', {
      scrollTrigger: {
        trigger: '.footer-grid',
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      duration: 0.6,
      y: 30,
      opacity: 0,
      stagger: 0.1,
      ease: 'power3.out',
    });

    gsap.to('.orb-1', {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      y: -120,
      ease: 'none',
    });

    gsap.to('.orb-2', {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      y: -60,
      ease: 'none',
    });
  }
})();


/* ──────────────────────────────────────────────────────────
   12. SWIPER — TESTIMONIALS
────────────────────────────────────────────────────────── */
(function initSwiper() {
  if (typeof Swiper === 'undefined') return;

  new Swiper('.testimonialSwiper', {
    slidesPerView:  1,
    spaceBetween:   28,
    loop:           true,
    speed:          600,
    autoplay: {
      delay:             4500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el:        '.swiper-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    breakpoints: {
      640: {
        slidesPerView: 1,
        spaceBetween:  20,
      },
      900: {
        slidesPerView: 2,
        spaceBetween:  24,
      },
      1100: {
        slidesPerView: 3,
        spaceBetween:  28,
      },
    },
    a11y: {
      prevSlideMessage: 'Previous testimonial',
      nextSlideMessage: 'Next testimonial',
    },
  });
})();


/* ──────────────────────────────────────────────────────────
   13. SMOOTH SCROLLING
────────────────────────────────────────────────────────── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const navH   = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      const top    = target.getBoundingClientRect().top + window.scrollY - navH;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* ──────────────────────────────────────────────────────────
   14. BACK TO TOP
────────────────────────────────────────────────────────── */
(function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btn.classList.add('visible');
    else btn.classList.remove('visible');
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();


/* ──────────────────────────────────────────────────────────
   15. CONTACT FORM — Web3Forms
   ▸ Root cause of the original error:
     The form was POSTing to contact.php which GitHub Pages
     returns 405 Method Not Allowed for (static host, no PHP).
   ▸ Fix: replaced fetch('contact.php', …) with a POST to
     https://api.web3forms.com/submit — a free, no-backend
     email service that works on any static host.
   ▸ Steps to activate:
     1. Go to https://web3forms.com
     2. Enter your email → click "Create Access Key"
     3. Copy the key and paste it into WEB3FORMS_ACCESS_KEY below
     4. Save and deploy — done.
────────────────────────────────────────────────────────── */
(function initContactForm() {

  /* ── ✏️  PASTE YOUR WEB3FORMS ACCESS KEY HERE ─────────── */
  const WEB3FORMS_ACCESS_KEY = '75a6ce2a-c1a4-490e-ba73-488e0d4189db';
  /* ──────────────────────────────────────────────────────── */

  const form      = document.getElementById('contactForm');
  const submitBtn = document.getElementById('formSubmitBtn');
  const btnText   = submitBtn  && submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn  && submitBtn.querySelector('.btn-loader');
  const btnIcon   = submitBtn  && submitBtn.querySelector('.btn-icon');

  if (!form) return;

  /* ── Validators ──────────────────────────────────────── */
  const validators = {
    name(v)    { return v.trim().length >= 2 ? '' : 'Please enter your full name (min 2 characters).'; },
    email(v)   { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
    subject(v) { return v.trim().length >= 3 ? '' : 'Subject must be at least 3 characters.'; },
    message(v) { return v.trim().length >= 10 ? '' : 'Message must be at least 10 characters.'; },
  };

  function showError(fieldId, msg) {
    const input = document.getElementById('f-' + fieldId);
    const err   = document.getElementById('err-' + fieldId);
    if (input) input.classList.add('has-error');
    if (err)   { err.textContent = msg; err.classList.add('show'); }
  }

  function clearError(fieldId) {
    const input = document.getElementById('f-' + fieldId);
    const err   = document.getElementById('err-' + fieldId);
    if (input) input.classList.remove('has-error');
    if (err)   { err.textContent = ''; err.classList.remove('show'); }
  }

  ['name', 'email', 'subject', 'message'].forEach(id => {
    const input = document.getElementById('f-' + id);
    if (!input) return;
    input.addEventListener('blur', () => {
      const err = validators[id](input.value);
      if (err) showError(id, err);
      else     clearError(id);
    });
    input.addEventListener('input', () => {
      if (input.classList.contains('has-error')) {
        const err = validators[id](input.value);
        if (!err) clearError(id);
      }
    });
  });

  function validateAll() {
    let valid = true;
    ['name', 'email', 'subject', 'message'].forEach(id => {
      const input = document.getElementById('f-' + id);
      if (!input) return;
      const err = validators[id](input.value);
      if (err) { showError(id, err); valid = false; }
      else     clearError(id);
    });
    return valid;
  }

  /* ── Toast ───────────────────────────────────────────── */
  function showToast(type, title, msg) {
    const toast      = document.getElementById('toastPopup');
    const toastIcon  = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMsg   = document.getElementById('toastMsg');
    if (!toast) return;

    toastIcon.className  = 'toast-icon ' + type;
    toastIcon.innerHTML  = type === 'success'
      ? '<i class="fas fa-check"></i>'
      : '<i class="fas fa-exclamation-triangle"></i>';
    toastTitle.textContent = title;
    toastMsg.textContent   = msg;

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 6000);
  }

  const toastClose = document.getElementById('toastClose');
  toastClose && toastClose.addEventListener('click', () => {
    document.getElementById('toastPopup').classList.remove('show');
  });

  /* ── Loading state helpers ───────────────────────────── */
  function setLoading(on) {
    submitBtn.disabled = on;
    if (btnText)   btnText.style.display   = on ? 'none'         : '';
    if (btnLoader) btnLoader.style.display = on ? 'inline-flex'  : 'none';
    if (btnIcon)   btnIcon.style.display   = on ? 'none'         : '';
  }

  /* ── Submit handler ──────────────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateAll()) {
      const firstErr = form.querySelector('.has-error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    /* Guard: remind developer to add the access key */
    if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      showToast('error', 'Setup Required',
        'Please add your Web3Forms access key in script.js to enable the contact form.');
      return;
    }

    setLoading(true);

    try {
      /* Build a plain JSON payload for Web3Forms */
      const name    = document.getElementById('f-name').value.trim();
      const email   = document.getElementById('f-email').value.trim();
      const subject = document.getElementById('f-subject').value.trim();
      const message = document.getElementById('f-message').value.trim();
      const service = document.getElementById('f-service') ? document.getElementById('f-service').value : '';
      const budget  = document.getElementById('f-budget')  ? document.getElementById('f-budget').value  : '';

      const payload = {
        access_key:   WEB3FORMS_ACCESS_KEY,
        subject:      `[Portfolio] ${subject}`,
        from_name:    name,
        email:        email,
        message:      [
          message,
          service ? `\nService: ${service}` : '',
          budget  ? `\nBudget: ${budget}`   : '',
        ].join(''),
        /* Honeypot — Web3Forms will silently drop spam */
        botcheck: '',
      };

      const response = await fetch('https://api.web3forms.com/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', 'Message Sent! 🎉', "Thanks for reaching out — I'll get back to you within 24 hours.");
        form.reset();
      } else {
        /* Web3Forms returns a human-readable message on failure */
        showToast('error', 'Failed to Send', data.message || 'Something went wrong. Please try again.');
      }

    } catch (err) {
      console.error('Form submission error:', err);
      showToast('error', 'Connection Error', 'Network issue — please try again or email me directly.');
    } finally {
      setLoading(false);
    }
  });
})();


/* ──────────────────────────────────────────────────────────
   16. FOOTER COPYRIGHT YEAR
────────────────────────────────────────────────────────── */
(function setCopyrightYear() {
  const el = document.getElementById('copyrightYear');
  if (el) el.textContent = new Date().getFullYear();
})();


/* ──────────────────────────────────────────────────────────
   17. HOVER GLOW ON CARDS
────────────────────────────────────────────────────────── */
(function initCardGlow() {
  const cards = document.querySelectorAll('.service-card, .skill-card, .project-card, .testi-card, .stat-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x    = ((e.clientX - rect.left) / rect.width)  * 100;
      const y    = ((e.clientY - rect.top)  / rect.height) * 100;
      card.style.setProperty('--glow-x', x + '%');
      card.style.setProperty('--glow-y', y + '%');
    });
  });

  if (!document.getElementById('cardGlowStyle')) {
    const style = document.createElement('style');
    style.id    = 'cardGlowStyle';
    style.textContent = `
      .service-card, .skill-card, .project-card, .testi-card, .stat-card {
        background-image: radial-gradient(
          circle at var(--glow-x, 50%) var(--glow-y, 50%),
          rgba(255, 0, 0, 0.04) 0%,
          transparent 60%
        );
      }
    `;
    document.head.appendChild(style);
  }
})();


/* ──────────────────────────────────────────────────────────
   18. SCROLL PROGRESS INDICATOR
────────────────────────────────────────────────────────── */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id    = 'scrollProgress';
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 2px;
    width: 0%;
    background: linear-gradient(90deg, #cc0000, #ff0000, #ff4d4d);
    z-index: 9999;
    pointer-events: none;
    transition: width 0.1s linear;
    box-shadow: 0 0 8px rgba(255,0,0,0.5);
  `;
  document.body.prepend(bar);

  window.addEventListener('scroll', () => {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const progress   = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width  = Math.min(progress, 100) + '%';
  }, { passive: true });
})();


/* ──────────────────────────────────────────────────────────
   19. ACCESSIBILITY
────────────────────────────────────────────────────────── */
(function initAccessibility() {
  const skipLink = document.createElement('a');
  skipLink.href       = '#home';
  skipLink.textContent = 'Skip to content';
  skipLink.className  = 'skip-link';
  skipLink.style.cssText = `
    position: fixed;
    top: -100%;
    left: 16px;
    z-index: 99999;
    background: #ff0000;
    color: #fff;
    padding: 8px 18px;
    border-radius: 0 0 8px 8px;
    font-family: Poppins, sans-serif;
    font-size: 14px;
    font-weight: 600;
    transition: top 0.2s;
  `;
  skipLink.addEventListener('focus', () => { skipLink.style.top = '0'; });
  skipLink.addEventListener('blur',  () => { skipLink.style.top = '-100%'; });
  document.body.prepend(skipLink);
})();


/* ──────────────────────────────────────────────────────────
   20. RENDER HINTS
────────────────────────────────────────────────────────── */
(function initRenderHints() {
  let scrollTimer;
  const animated = document.querySelectorAll('.profile-card, .float-badge, .glow-orb');

  window.addEventListener('scroll', () => {
    animated.forEach(el => { el.style.willChange = 'transform'; });
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      animated.forEach(el => { el.style.willChange = 'auto'; });
    }, 300);
  }, { passive: true });
})();


(function initLog() {
  const style = [
    'color: #ff4d4d',
    'font-size: 14px',
    'font-weight: bold',
    'padding: 4px 0',
  ].join(';');
  console.log('%c✦ Pratima Pal Portfolio — Loaded Successfully', style);
})();