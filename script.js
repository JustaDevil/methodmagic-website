/* METHOD//MAGIC — interactions */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;

/* ---------- Cookie consent (Google Consent Mode v2) ---------- */
(function initCookieConsent() {
  const CONSENT_KEY = 'mm_cookie_consent';
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  let stored = null;
  try { stored = localStorage.getItem(CONSENT_KEY); } catch (e) {}

  if (!stored) {
    requestAnimationFrame(() => banner.classList.add('is-visible'));
  }

  function setConsent(state) {
    try { localStorage.setItem(CONSENT_KEY, state); } catch (e) {}
    if (window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
        analytics_storage: state
      });
    }
    banner.classList.remove('is-visible');
  }

  document.getElementById('cookieAccept')?.addEventListener('click', () => setConsent('granted'));
  document.getElementById('cookieDecline')?.addEventListener('click', () => setConsent('denied'));
})();

/* ---------- Smooth scroll (Lenis) ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1 });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
}

/* ---------- Seamless marquee (fills any viewport, constant speed) ---------- */
(function initMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const PHRASE = 'QUALITY COMMUNICATIONS  //  IMPACTFUL MARKETING  //  WISHLIST GROWTH  //  ';
  const SPEED = 70; /* px per second */

  function build() {
    track.innerHTML = '';
    const group = document.createElement('div');
    group.className = 'mq-group';
    track.appendChild(group);
    do {
      const s = document.createElement('span');
      s.textContent = PHRASE;
      group.appendChild(s);
    } while (group.offsetWidth < innerWidth + 120 && group.children.length < 60);
    const groupWidth = group.offsetWidth;
    track.appendChild(group.cloneNode(true)); /* identical second half → seamless -50% loop */
    track.style.setProperty('--mq-dur', (groupWidth / SPEED).toFixed(1) + 's');
  }

  build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
})();

/* ---------- three.js particle field ---------- */
(function initWebGL() {
  const canvas = document.getElementById('webgl');
  if (!canvas || !window.THREE || reduced) { if (canvas && reduced) canvas.style.opacity = 0.35; if (!window.THREE) return; }
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 2.2, 9);
    camera.lookAt(0, 0, 0);

    const COLS = 100, ROWS = 46;
    const COUNT = COLS * ROWS;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const cA = new THREE.Color('#0F54CD');
    const cB = new THREE.Color('#8A3FFC');
    let i = 0;
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        positions[i * 3] = (x / (COLS - 1) - 0.5) * 34;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (z / (ROWS - 1) - 0.5) * 18;
        const c = cA.clone().lerp(cB, x / (COLS - 1));
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        i++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const sprite = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const mat = new THREE.PointsMaterial({
      size: 0.11,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(geo, mat);
    points.position.y = -1.4;
    scene.add(points);

    let mx = 0, my = 0;
    addEventListener('pointermove', (e) => {
      mx = (e.clientX / innerWidth - 0.5) * 2;
      my = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    addEventListener('resize', resize);
    renderer.render(scene, camera);

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    const base = colors.slice();
    const clock = new THREE.Clock();

    /* Mouse glow: dots brighten near the cursor's point on the field */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let gx = 0, gz = 0, glow = 0, wasGlow = false;
    const GLOW_R2 = 3.4 * 3.4;

    function frame() {
      const t = clock.getElapsedTime();
      for (let j = 0; j < COUNT; j++) {
        const x = pos.array[j * 3];
        const z = pos.array[j * 3 + 2];
        pos.array[j * 3 + 1] =
          Math.sin(x * 0.45 + t * 0.9) * 0.45 +
          Math.cos(z * 0.55 + t * 0.7) * 0.35 +
          Math.sin((x + z) * 0.2 + t * 0.4) * 0.25;
      }
      pos.needsUpdate = true;

      ndc.set(mx, -my);
      raycaster.setFromCamera(ndc, camera);
      const dir = raycaster.ray.direction, org = raycaster.ray.origin;
      let targetGlow = 0, tx = gx, tz = gz;
      if (dir.y < -0.001) {
        const tHit = (points.position.y - org.y) / dir.y;
        if (tHit > 0) {
          tx = org.x + dir.x * tHit;
          tz = org.z + dir.z * tHit;
          targetGlow = 1;
        }
      }
      gx += (tx - gx) * 0.12;
      gz += (tz - gz) * 0.12;
      glow += (targetGlow - glow) * 0.08;

      /* Only touch the color buffer while the glow is active (or fading out). */
      if (glow > 0.003 || wasGlow) {
        for (let j = 0; j < COUNT; j++) {
          const dx = pos.array[j * 3] - gx;
          const dz = pos.array[j * 3 + 2] - gz;
          let f = glow * Math.max(0, 1 - (dx * dx + dz * dz) / GLOW_R2);
          f = f * f * 1.6;
          col.array[j * 3]     = Math.min(1, base[j * 3]     * (1 + f) + f * 0.22);
          col.array[j * 3 + 1] = Math.min(1, base[j * 3 + 1] * (1 + f) + f * 0.22);
          col.array[j * 3 + 2] = Math.min(1, base[j * 3 + 2] * (1 + f) + f * 0.32);
        }
        col.needsUpdate = true;
        wasGlow = glow > 0.003;
      }

      camera.position.x += (mx * 1.4 - camera.position.x) * 0.04;
      camera.position.y += (2.2 - my * 0.8 - camera.position.y) * 0.04;
      camera.lookAt(0, -0.5, 0);
      renderer.render(scene, camera);
    }
    window.__mmFrame = frame;

    (function tick() {
      requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      frame();
    })();
  } catch (e) {
    canvas.style.display = 'none';
  }
})();

/* ---------- GSAP ---------- */
if (window.gsap) {
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
  }

  /* Split lines into chars */
  document.querySelectorAll('.split').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'char';
      s.innerHTML = ch === ' ' ? '&nbsp;' : ch;
      el.appendChild(s);
    });
  });

  if (!reduced) {
    /* Hero intro */
    gsap.from('.hero-logo-img', {
      opacity: 0,
      y: 50,
      scale: 0.96,
      duration: 1.3,
      ease: 'power4.out',
      delay: 0.15
    });
    gsap.from('.hero-tagline, .hero-sub', {
      opacity: 0,
      y: 24,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.7
    });
    gsap.from('.site-header', { opacity: 0, y: -20, duration: 0.8, delay: 1 });

    /* Hero parallax out */
    gsap.to('.hero-content', {
      yPercent: -18,
      opacity: 0.25,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    /* Generic reveals */
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 36,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    /* Why-us growth chart: bars grow, area fades in, line draws, dot pops */
    const wvLine = document.querySelector('.wv-line');
    if (wvLine) {
      const len = wvLine.getTotalLength();
      gsap.set(wvLine, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set('.wv-area', { opacity: 0 });
      gsap.set('.wv-bar', { scaleY: 0 });
      gsap.set('.wv-dotwrap', { opacity: 0 });
      gsap.timeline({ scrollTrigger: { trigger: '.why-viz', start: 'top 78%' } })
        .to('.wv-bar', { scaleY: 1, duration: 0.8, ease: 'power3.out', stagger: 0.09 })
        .to('.wv-area', { opacity: 1, duration: 0.8 }, '-=0.5')
        .to(wvLine, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, '-=0.7')
        .to('.wv-dotwrap', { opacity: 1, duration: 0.4 }, '-=0.25');
    }

    /* Client logos: staggered entrance + idle float */
    gsap.from('.client', {
      opacity: 0,
      y: 40,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.16,
      scrollTrigger: { trigger: '.client-row', start: 'top 88%' }
    });
    gsap.to('.client img', {
      y: -9,
      duration: 2.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      stagger: 0.45
    });

    /* Contact title chars */
    gsap.from('.contact-title .char', {
      yPercent: 110,
      duration: 0.9,
      ease: 'power4.out',
      stagger: 0.04,
      scrollTrigger: { trigger: '.contact', start: 'top 70%' }
    });
  }

  /* Counters */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = prefix + to + suffix; return; }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => { el.textContent = prefix + Math.round(obj.v) + suffix; }
    });
  });
}

/* ---------- Header state ---------- */
const header = document.querySelector('.site-header');
addEventListener('scroll', () => {
  header.classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

/* ---------- The Numbers: zigzag slot reel ---------- */
(function initNumbers() {
  const track = document.getElementById('numsTrack');
  if (!track) return;
  const slides = [...track.querySelectorAll('[data-slide]')];
  const dots = [...track.querySelectorAll('[data-dot]')];
  const hint = track.querySelector('[data-hint]');
  const N = slides.length;
  if (!N) return;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function run() {
    const rect = track.getBoundingClientRect();
    const max = rect.height - innerHeight;
    const p = max > 0 ? clamp(-rect.top / max, 0, 1) : 0;
    const idx = p * (N - 1);
    for (let i = 0; i < N; i++) {
      const s = slides[i];
      const d = i - idx;
      const ad = Math.abs(d);
      const vis = ad < 1.05;
      s.style.visibility = vis ? 'visible' : 'hidden';
      if (!vis) continue;
      const a = clamp(d, -1, 1);
      const dir = i % 2 === 0 ? 1 : -1;
      s.style.opacity = String(clamp(1 - ad * 1.15, 0, 1));
      if (reduced) {
        s.style.transform = 'none';
        s.style.filter = 'none';
      } else {
        s.style.transform =
          'translateX(' + (dir * d * 55) + '%) translateY(' + (d * 18) + '%) ' +
          'rotateY(' + (dir * -a * 62) + 'deg) rotateX(' + (-a * 24) + 'deg) ' +
          'translateZ(' + (-ad * 160) + 'px)';
        /* light blur only — capped low so blurring the keyart image doesn't stutter */
        s.style.filter = ad > 0.04 ? 'blur(' + Math.min(ad * 2.2, 2.4).toFixed(2) + 'px)' : 'none';
      }
    }
    const act = clamp(Math.round(idx), 0, N - 1);
    for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === act);
    if (hint) hint.style.opacity = p < 0.02 ? '1' : '0';
  }

  let raf = 0;
  const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; run(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (lenis) lenis.on('scroll', onScroll);
  run();
  setTimeout(run, 400);
})();

/* ---------- Navigation ---------- */
(function initNav() {
  const header = document.querySelector('.site-header');
  const nav = document.getElementById('siteNav');
  const toggle = document.getElementById('navToggle');
  if (!header || !nav || !toggle) return;

  function closeMenu() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  });

  /* Smooth-scroll in-page anchors, offset for the fixed header */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = id === '#top' ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (nav.classList.contains('open')) closeMenu();
      const offset = header.offsetHeight + 6;
      if (lenis) {
        lenis.scrollTo(id === '#top' ? 0 : target, { offset: -offset });
      } else {
        const y = id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY - offset;
        scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  });

  /* Scrollspy: highlight the section currently in view */
  const linkFor = {};
  nav.querySelectorAll('a').forEach((a) => { linkFor[a.getAttribute('href').slice(1)] = a; });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      nav.querySelectorAll('a').forEach((l) => l.classList.remove('active'));
      const a = linkFor[en.target.id];
      if (a) a.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['results', 'services', 'why', 'clients', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });
})();

/* ---------- What We Do: active-segment tracking ---------- */
(function initWWD() {
  const section = document.querySelector('.wwd');
  if (!section) return;
  const segs = [...section.querySelectorAll('[data-seg]')];
  const anims = [...section.querySelectorAll('[data-anim]')];
  const counter = section.querySelector('.wwd-counter');
  const caption = section.querySelector('.wwd-caption');
  const glow = section.querySelector('.wwd-glow');
  const N = segs.length;
  if (!N) return;

  const accents = segs.map((s) => s.style.getPropertyValue('--accent').trim());
  const titles = segs.map((s) => s.querySelector('.wwd-title').textContent);
  let active = -1;

  function setActive(i) {
    if (i === active) return;
    active = i;
    const accent = accents[i];
    for (let k = 0; k < N; k++) segs[k].classList.toggle('active', k === i);
    for (let k = 0; k < anims.length; k++) anims[k].classList.toggle('active', k === i);
    if (counter) { counter.textContent = String(i + 1).padStart(2, '0') + ' / 10'; counter.style.color = accent; }
    if (caption) caption.textContent = (titles[i] || '').toUpperCase();
    if (glow) glow.style.background = 'radial-gradient(520px 420px at 50% 46%, ' + accent + '14, transparent 70%)';
  }

  let raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const mid = innerHeight / 2;
      let best = -1, bestD = Infinity;
      for (let k = 0; k < N; k++) {
        const r = segs[k].getBoundingClientRect();
        const d = Math.abs((r.top + r.height / 2) - mid);
        if (d < bestD) { bestD = d; best = k; }
      }
      if (best >= 0) setActive(best);
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (lenis) lenis.on('scroll', onScroll);
  setActive(0);
  onScroll();
  setTimeout(onScroll, 500);
})();

/* ---------- Magnetic buttons ---------- */
if (!touch && !reduced) {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.28}px, ${dy * 0.28}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
      el.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
      setTimeout(() => { el.style.transition = ''; }, 400);
    });
  });
}

/* ---------- Animated site background (below hero) ---------- */
if (!reduced && window.MethodMagicHeroBG) {
  const bgEl = document.querySelector('.site-bg');
  if (bgEl) MethodMagicHeroBG.init(bgEl, { motionSpeed: 0.9, particleDensity: 0.5 });
}

