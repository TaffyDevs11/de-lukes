/* ==========================================================================
   DE LUKES — front-end (vanilla ES6, no frameworks)
   1. Config & helpers        6. Persistent music player
   2. Theme toggle            7. Background music loop
   3. Header & mobile menu    8. In-site navigation (keeps audio playing)
   4. Ultra-smooth scrolling  9. Page features (hero, forms, lightbox…)
   5. Scroll reveals         10. Floating buttons & WhatsApp chatbot
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------- 1. Config & helpers ---------------- */
  const CFG = JSON.parse(document.getElementById('site-config').textContent);
  // Absolute site root. On the live site CFG.base is absolute; in the static
  // GitHub Pages preview it is relative (e.g. "../"), so resolve it once here.
  const BASE = new URL((CFG.base || '.').replace(/\/?$/, '/'), location.href).href.replace(/\/$/, '');
  const STATIC = !!CFG.static;
  const abs = (u, from = location.href) => (u ? new URL(u, from).href : u);
  // Header/footer/player stay on screen across in-site navigation, so their links must not be
  // page-relative (matters for the static preview, harmless on the live site).
  const absolutizeChrome = () => {
    document.querySelectorAll('a[href], img[src]').forEach(el => {
      if (el.closest('#main')) return;
      const attr = el.tagName === 'A' ? 'href' : 'src';
      const v = el.getAttribute(attr);
      if (v && !/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(v)) el.setAttribute(attr, el[attr]);
    });
  };
  absolutizeChrome();
  const pageUrl = p =>BASE + '/' + p + (STATIC ? '/' : '');
  const normTrack = (t, from) => Object.assign({}, t, { src: abs(t.src, from), cover: abs(t.cover, from), lyrics: abs(t.lyrics, from), album: abs(t.album, from) });
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const sess = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  root.classList.add('js');
  let pageCleanups = [];

  /* ---------------- 2. Theme toggle ---------------- */
  $('#theme-toggle').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('dlk-theme', next);
  });

  /* ---------------- 3. Header & mobile menu ---------------- */
  const header = $('#site-header');
  const menuBtn = $('#menu-toggle');
  const setMenu = open => {
    if (open) root.style.setProperty('--nav-top', Math.max(0, header.getBoundingClientRect().bottom) + 'px');
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) smooth.stop(); else smooth.start();
  };
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeChat(); } });

  const announce = $('#announce');
  if (announce) {
    if (sess.get('dlk-announce-off')) announce.classList.add('is-hidden');
    $('[data-dismiss-announce]', announce).addEventListener('click', () => { announce.classList.add('is-hidden'); sess.set('dlk-announce-off', 1); });
  }

  let lastY = 0;
  const onScrollUI = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
    $('#to-top').classList.toggle('is-visible', y > 600);
    lastY = y;
  };
  addEventListener('scroll', onScrollUI, { passive: true });

  /* ---------------- 4. Ultra-smooth scrolling ----------------
     Mouse-wheel / trackpad input is eased with linear interpolation
     (inertia), giving a buttery glide. Touch devices keep native momentum.
     Keyboard, scrollbar and anchor jumps stay in sync. Disabled when the
     user prefers reduced motion. */
  const smooth = (() => {
    const finePointer = matchMedia('(pointer: fine)').matches;
    let enabled = !reduceMotion && finePointer;
    let target = scrollY, current = scrollY, raf = null, stopped = false;
    const ease = 0.075; // lower = smoother/longer glide
    const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
    const loop = () => {
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.5) { current = target; raf = null; }
      window.scrollTo(0, current);
      if (raf !== null) raf = requestAnimationFrame(loop);
    };
    const run = () => { if (raf === null) raf = requestAnimationFrame(loop); };
    const canScrollInside = (el, dy) => {
      while (el && el !== document.body && el !== document.documentElement) {
        const st = getComputedStyle(el);
        if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight) {
          if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight)) return true;
        }
        el = el.parentElement;
      }
      return false;
    };
    if (enabled) {
      addEventListener('wheel', e => {
        if (stopped || e.ctrlKey || e.defaultPrevented) return;
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 40; else if (e.deltaMode === 2) dy *= innerHeight;
        if (canScrollInside(e.target, dy) || e.target.closest('input[type=range], select')) return;
        e.preventDefault();
        if (raf === null) { target = current = scrollY; }
        target = Math.max(0, Math.min(maxScroll(), target + dy));
        run();
      }, { passive: false });
      // keep in sync with keyboard / scrollbar / find-in-page
      addEventListener('scroll', () => { if (raf === null) target = current = scrollY; }, { passive: true });
    } else {
      root.classList.add('smooth-native');
    }
    return {
      to(y, instant = false) {
        y = Math.max(0, Math.min(maxScroll(), y));
        if (instant) { if (raf) cancelAnimationFrame(raf); raf = null; target = current = y; window.scrollTo(0, y); return; }
        if (!enabled) { window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
        if (raf === null) current = scrollY;
        target = y; run();
      },
      stop() { stopped = true; }, start() { stopped = false; },
    };
  })();

  // Smooth in-page anchor links
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || a.target) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    smooth.to(el.getBoundingClientRect().top + scrollY - header.offsetHeight - 16);
    history.replaceState(history.state, '', url.hash);
    if (el.id === 'main') el.focus({ preventScroll: true });
  });

  /* ---------------- 5. Scroll reveals ---------------- */
  let revealObserver = null;
  const initReveal = () => {
    const items = $$('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window) || reduceMotion) { items.forEach(i => i.classList.add('is-in')); return; }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); revealObserver.unobserve(en.target); }
      }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    items.forEach((el, i) => { el.style.transitionDelay = (Math.min(i % 4, 3) * 80) + 'ms'; revealObserver.observe(el); });
  };

  /* ---------------- 6. Persistent music player ---------------- */
  const P = {
    el: $('#player'), audio: $('#pl-audio'), queue: [], index: -1,
    init() {
      const a = this.audio;
      a.volume = parseFloat(store.get('dlk-vol', '0.9'));
      $('#pl-volume').value = a.volume;
      $('#pl-play').addEventListener('click', () => this.toggle());
      $('#pl-next').addEventListener('click', () => this.next());
      $('#pl-prev').addEventListener('click', () => this.prev());
      $('#pl-close').addEventListener('click', () => this.close());
      $('#pl-mute').addEventListener('click', () => { a.muted = !a.muted; this.el.classList.toggle('is-muted', a.muted); });
      $('#pl-volume').addEventListener('input', e => { a.volume = +e.target.value; a.muted = false; this.el.classList.remove('is-muted'); store.set('dlk-vol', a.volume); });
      $('#pl-seek').addEventListener('input', e => { if (a.duration) a.currentTime = (e.target.value / 1000) * a.duration; });
      $('#pl-queue-btn').addEventListener('click', () => {
        const q = $('#pl-queue'); q.hidden = !q.hidden;
        $('#pl-queue-btn').setAttribute('aria-expanded', String(!q.hidden));
      });
      a.addEventListener('timeupdate', () => this.progress());
      a.addEventListener('loadedmetadata', () => this.progress());
      a.addEventListener('play', () => { this.state(true); BG.duck(true); });
      a.addEventListener('pause', () => { this.state(false); this.save(); });
      a.addEventListener('ended', () => this.next(true));
      a.addEventListener('error', () => { if (a.src) toast('Could not load this song. Please try again.'); });
      addEventListener('pagehide', () => this.save());
      // Media Session (lock-screen controls on phones)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => a.play());
        navigator.mediaSession.setActionHandler('pause', () => a.pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      }
      this.restore();
    },
    show() { this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('is-visible')); document.body.style.setProperty('--player-h', this.el.offsetHeight + 'px'); root.style.setProperty('--player-h', this.el.offsetHeight + 'px'); },
    close() { this.audio.pause(); this.el.classList.remove('is-visible'); root.style.setProperty('--player-h', '0px'); document.body.style.setProperty('--player-h', '0px'); sess.set('dlk-player', null); BG.duck(false); },
    load(i, autoplay = true, at = 0) {
      if (i < 0 || i >= this.queue.length) return;
      this.index = i;
      const t = this.queue[i];
      this.audio.src = t.src;
      this.audio.preload = 'auto';
      if (at) this.audio.addEventListener('loadedmetadata', () => { this.audio.currentTime = at; }, { once: true });
      $('#pl-title').textContent = t.title;
      $('#pl-artist').textContent = t.artist;
      $('#pl-cover').src = t.cover;
      const ly = $('#pl-lyrics');
      ly.href = t.lyrics; ly.classList.toggle('is-disabled', !t.lyrics);
      ly.setAttribute('aria-label', 'Lyrics for ' + t.title);
      this.show(); this.renderQueue(); this.mark();
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'De Lukes', artwork: [{ src: t.cover, sizes: '400x400' }] });
      if (autoplay) this.audio.play().catch(() => {});
      this.save();
    },
    playTrack(track, list) {
      if (list && list.length) this.queue = list; else if (!this.queue.find(x => x.id === track.id)) this.queue.push(track);
      const i = this.queue.findIndex(x => x.id === track.id);
      if (i === this.index && this.audio.src) { this.toggle(); return; }
      this.load(i);
    },
    toggle() { if (!this.audio.src) return; this.audio.paused ? this.audio.play().catch(() => {}) : this.audio.pause(); },
    next(auto = false) { if (this.index < this.queue.length - 1) this.load(this.index + 1); else if (!auto) this.load(0); else { this.state(false); BG.duck(false); } },
    prev() { if (this.audio.currentTime > 4) this.audio.currentTime = 0; else this.load(Math.max(0, this.index - 1)); },
    state(playing) {
      this.el.classList.toggle('is-playing', playing);
      $('#pl-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
      this.mark();
      if (!playing && this.audio.ended) BG.duck(false);
    },
    progress() {
      const a = this.audio, d = a.duration || 0, c = a.currentTime || 0;
      const pct = d ? (c / d) * 100 : 0;
      $('#pl-bar').style.width = pct + '%';
      $('#pl-seek').value = d ? Math.round(pct * 10) : 0;
      $('#pl-time').textContent = fmt(c) + ' / ' + fmt(d);
      if (Math.floor(c) % 5 === 0) this.save();
    },
    mark() {
      const cur = this.queue[this.index];
      const playing = !this.audio.paused;
      $$('[data-track-row]').forEach(r => r.classList.toggle('is-playing', !!cur && playing && +r.dataset.trackRow === cur.id));
    },
    renderQueue() {
      const ol = $('#pl-queue-list');
      ol.innerHTML = '';
      this.queue.forEach((t, i) => {
        const li = document.createElement('li');
        if (i === this.index) li.className = 'is-current';
        const b = document.createElement('button');
        b.type = 'button';
        const img = document.createElement('img'); img.src = t.cover; img.alt = ''; img.width = 36; img.height = 36;
        const span = document.createElement('span'); span.textContent = t.title + ' — ' + t.artist;
        b.append(img, span);
        b.addEventListener('click', () => this.load(i));
        li.append(b); ol.append(li);
      });
    },
    save() { if (this.index >= 0) sess.set('dlk-player', { q: this.queue, i: this.index, t: this.audio.currentTime || 0 }); },
    restore() {
      const s = sess.get('dlk-player');
      if (s && s.q && s.q.length) { this.queue = s.q; this.load(s.i, false, s.t); }
    },
  };

  // Load the whole catalogue as the default queue (lazy, small JSON)
  let catalogue = null;
  const getCatalogue = async () => {
    if (catalogue) return catalogue;
    try { const r = await fetch(BASE + (STATIC ? '/api/tracks.json' : '/api/tracks'), { headers: { Accept: 'application/json' } }); catalogue = ((await r.json()).tracks || []).map(t => normTrack(t, BASE + '/')); }
    catch (e) { catalogue = []; }
    return catalogue;
  };

  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-play-track]');
    if (btn) {
      e.preventDefault();
      const track = normTrack(JSON.parse(btn.dataset.playTrack));
      if (!track.src) return;
      BG.userPaused = true;
      // Queue = all buttons in the same group on this page, else the full catalogue
      let list = null;
      if (btn.dataset.queueGroup) {
        const seen = new Set();
        list = $$('[data-queue-group="' + btn.dataset.queueGroup + '"]').map(b => normTrack(JSON.parse(b.dataset.playTrack))).filter(t => t.src && !seen.has(t.id) && seen.add(t.id));
      } else {
        list = (await getCatalogue()).slice();
        if (!list.find(t => t.id === track.id)) list.unshift(track);
      }
      P.playTrack(track, list);
      return;
    }
    const all = e.target.closest('[data-play-all]');
    if (all) {
      const first = $('[data-queue-group="' + all.dataset.playAll + '"]');
      if (first) first.click();
    }
  });

  /* ---------------- 7. Background music loop ----------------
     Plays the artist's chosen songs (Nyengetera, Vuubum) softly in a loop.
     Browsers block sound until the visitor interacts, so it starts on the
     first click/tap/key — unless the visitor switched it off. It pauses
     automatically whenever the main player is playing. */
  const BG = {
    audio: $('#bg-audio'), btn: $('#bg-toggle'), list: (CFG.bgMusic || []).map(t => normTrack(t)), i: 0, userPaused: false, ducked: false,
    init() {
      if (!this.list.length) { this.btn.hidden = true; return; }
      this.audio.volume = 0.35;
      const s = sess.get('dlk-bg');
      if (s) { this.i = s.i || 0; this.resumeAt = s.t || 0; }
      this.userPaused = store.get('dlk-bg-off') === '1';
      this.audio.addEventListener('ended', () => { this.i = (this.i + 1) % this.list.length; this.load(true); });
      this.audio.addEventListener('play', () => this.ui(true));
      this.audio.addEventListener('pause', () => this.ui(false));
      addEventListener('pagehide', () => sess.set('dlk-bg', { i: this.i, t: this.audio.currentTime || 0 }));
      this.btn.addEventListener('click', e => {
        e.stopPropagation();
        if (this.audio.paused) { this.userPaused = false; store.set('dlk-bg-off', '0'); if (!P.audio.paused) P.audio.pause(); this.play(); }
        else { this.userPaused = true; store.set('dlk-bg-off', '1'); this.audio.pause(); }
      });
      const kick = e => {
        if (e.target.closest && e.target.closest('#bg-toggle, [data-play-track], #player')) return;
        ['pointerdown', 'keydown', 'touchstart'].forEach(ev => removeEventListener(ev, kick, true));
        if (!this.userPaused && P.audio.paused) this.play();
      };
      ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, kick, true));
    },
    load(autoplay) {
      const t = this.list[this.i];
      this.audio.src = t.src;
      if (autoplay) this.audio.play().catch(() => {});
    },
    play() {
      if (!this.audio.src) {
        this.load(false);
        if (this.resumeAt) this.audio.addEventListener('loadedmetadata', () => { this.audio.currentTime = this.resumeAt; this.resumeAt = 0; }, { once: true });
      }
      this.audio.play().catch(() => {});
    },
    duck(on) {
      if (!this.list.length) return;
      if (on) { this.ducked = !this.audio.paused || this.ducked; this.audio.pause(); }
      else if (this.ducked && !this.userPaused) { this.ducked = false; this.play(); }
    },
    ui(on) {
      this.btn.classList.toggle('is-on', on);
      this.btn.setAttribute('aria-pressed', String(on));
      const t = this.list[this.i];
      this.btn.setAttribute('aria-label', on ? 'Pause background music' : 'Play background music');
      this.btn.title = on && t ? 'Now playing: ' + t.title : 'Background music';
    },
  };

  /* ---------------- 8. In-site navigation ----------------
     Internal links load the next page with fetch() and swap only <main>,
     so the music player and background music never stop. Falls back to a
     normal page load on any error. */
  const isInternal = a => {
    if (!a || a.target || a.hasAttribute('download') || a.dataset.noSwap !== undefined) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.href.startsWith(BASE)) return false;
    const path = url.pathname.replace(new URL(BASE + '/').pathname, '/');
    if (/^\/?(admin|stream|download|api|uploads|assets|audio|sitemap\.xml|payment)/.test(path)) return false;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
    return true;
  };
  let navController = null;
  const navigate = async (href, push = true) => {
    if (navController) navController.abort();
    navController = new AbortController();
    document.body.classList.add('is-loading');
    try {
      const res = await fetch(href, { signal: navController.signal, headers: { 'X-Swap': '1' }, credentials: 'same-origin' });
      if (!res.ok && res.status !== 404) throw new Error(res.status);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newMain = doc.getElementById('main');
      if (!newMain) throw new Error('no main');
      pageCleanups.forEach(fn => fn()); pageCleanups = [];
      const main = $('#main');
      // Update the URL first so relative links/images in the new content resolve correctly
      if (push) history.pushState({ swap: true }, '', res.url || href);
      main.innerHTML = newMain.innerHTML;
      main.dataset.page = newMain.dataset.page;
      document.body.dataset.page = newMain.dataset.page;
      document.title = doc.title;
      // head meta & JSON-LD
      ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[property="og:image"]', 'meta[name="robots"]']
        .forEach(sel => { const n = doc.head.querySelector(sel), o = document.head.querySelector(sel); if (n && o) o.replaceWith(n.cloneNode(true)); });
      $$('script[type="application/ld+json"]', document.head).forEach(s => s.remove());
      $$('script[type="application/ld+json"]', doc.head).forEach(s => document.head.append(s.cloneNode(true)));
      const nl = $('.nav__list', doc); if (nl) { $('.nav__list').innerHTML = nl.innerHTML; absolutizeChrome(); }
      const cc = $('[data-cart-count]', doc); if (cc) { const c = $('[data-cart-count]'); c.textContent = cc.textContent; c.hidden = cc.hidden; }
      setMenu(false);
      const hash = new URL(href, location.href).hash;
      const target = hash && document.getElementById(hash.slice(1));
      smooth.to(target ? target.getBoundingClientRect().top + scrollY - 90 : 0, true);
      document.body.classList.remove('page-swap'); void document.body.offsetWidth; document.body.classList.add('page-swap');
      main.focus({ preventScroll: true });
      initPage();
    } catch (err) {
      if (err.name !== 'AbortError') location.href = href;
    } finally {
      document.body.classList.remove('is-loading');
    }
  };
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!isInternal(a)) return;
    e.preventDefault();
    navigate(a.href);
  });
  history.replaceState({ swap: true }, '', location.href);
  addEventListener('popstate', e => { if (e.state && e.state.swap) navigate(location.href, false); });

  /* ---------------- 9. Page features ---------------- */
  const toast = msg => {
    const t = document.createElement('div');
    t.className = 'alert alert--info'; t.setAttribute('role', 'status');
    Object.assign(t.style, { position: 'fixed', left: '16px', bottom: 'calc(16px + var(--player-h))', zIndex: 300, maxWidth: '360px', boxShadow: 'var(--shadow)' });
    t.textContent = msg; document.body.append(t);
    setTimeout(() => t.remove(), 3500);
  };

  const initHero = () => {
    const slides = $$('.hero__slide');
    if (slides.length > 1 && !reduceMotion) {
      let i = 0;
      const id = setInterval(() => { slides[i].classList.remove('is-active'); i = (i + 1) % slides.length; slides[i].classList.add('is-active'); }, 7000);
      pageCleanups.push(() => clearInterval(id));
    }
    const v = $('[data-hero-video]');
    if (!v) return;
    // Save data on phones / slow connections: keep the poster image instead of the video
    const c = navigator.connection || {};
    const slow = c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '');
    const small = matchMedia('(max-width: 767px)').matches;
    const toggle = $('[data-hero-toggle]');
    if (slow || small || reduceMotion) { if (toggle) toggle.hidden = true; return; }
    v.src = v.dataset.src;
    v.addEventListener('canplay', () => v.classList.add('is-ready'), { once: true });
    v.play().catch(() => {});
    if (toggle) toggle.addEventListener('click', () => {
      const paused = !v.paused; paused ? v.pause() : v.play();
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    });
    // pause off-screen to save battery
    const io = new IntersectionObserver(([en]) => { if (toggle && toggle.getAttribute('aria-pressed') === 'true') return; en.isIntersecting ? v.play().catch(() => {}) : v.pause(); });
    io.observe(v); pageCleanups.push(() => io.disconnect());
  };

  const initYouTube = () => $$('.yt-lite').forEach(box => box.addEventListener('click', () => {
    const id = box.dataset.yt;
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
    f.title = 'YouTube video'; f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen = true;
    box.innerHTML = ''; box.append(f);
    P.audio.pause(); BG.duck(true);
  }, { once: true }));

  // Social embed codes: run their scripts after swap; hide the box if nothing renders
  const initEmbeds = () => $$('[data-embed]').forEach(box => {
    $$('script', box).forEach(old => { const s = document.createElement('script'); [...old.attributes].forEach(a => s.setAttribute(a.name, a.value)); s.text = old.text; old.replaceWith(s); });
    const t = setTimeout(() => { if (!box.querySelector('iframe') || box.offsetHeight < 80) box.hidden = true; }, 8000);
    pageCleanups.push(() => clearTimeout(t));
  });

  // Static preview (GitHub Pages): there is no server, so forms explain what happens on the live site
  if (STATIC) {
    document.addEventListener('submit', e => {
      const form = e.target;
      if (form.id === 'chat-form') return;
      e.preventDefault(); e.stopImmediatePropagation();
      const isCart = /cart|checkout/.test(form.action) || form.matches('[data-cart-form]');
      const text = isCart
        ? 'Preview only — on the live site this adds to the cart and checks out with EcoCash, PayPal or card.'
        : 'Preview only — on the live site this form is sent straight to De Lukes (saved in the admin panel + email notification).';
      let msg = form.querySelector('.form-msg');
      if (!msg) { msg = document.createElement('p'); msg.className = 'form-msg'; form.append(msg); }
      msg.className = 'form-msg is-ok'; msg.textContent = text;
    }, true);
  }

  const initForms = () => {
    // AJAX forms (newsletter)
    $$('form[data-ajax-form], form[data-cart-form]').forEach(form => form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('.form-msg', form);
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' } });
        const data = await res.json();
        if (msg) { msg.textContent = data.message || data.error || ''; msg.className = 'form-msg ' + (data.ok ? 'is-ok' : 'is-err'); }
        if (data.ok && form.matches('[data-ajax-form]')) form.reset();
        if (data.ok && 'count' in data) {
          const c = $('[data-cart-count]'); c.textContent = data.count; c.hidden = !data.count;
          if (msg) msg.innerHTML = '';
          if (msg) { msg.append(document.createTextNode((data.message || 'Added.') + ' ')); const a = document.createElement('a'); a.href = pageUrl('cart'); a.innerHTML = 'View cart ' + svgIcon('arrow'); a.className = 'text-link'; msg.append(a); }
        }
      } catch (err) { form.submit(); }
      finally { btn.disabled = false; }
    }));
    // Cart quantity auto-submit
    $$('[data-autosubmit]').forEach(i => i.addEventListener('change', () => i.form.requestSubmit ? i.form.requestSubmit() : i.form.submit()));
    // Book via WhatsApp: pre-fill with the booking form details
    const wa = $('[data-book-whatsapp]');
    if (wa) wa.addEventListener('click', () => {
      const f = $('#booking-form'), v = n => (f.elements[n] && f.elements[n].value.trim()) || '-';
      const date = v('event_date') !== '-' ? new Date(v('event_date')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
      const text = `${wa.dataset.waIntro}\n\n*Name:* ${v('name')}\n*Phone:* ${v('phone')}\n*Email:* ${v('email')}\n*Event type:* ${v('event_type')}\n*Date:* ${date}\n*Location:* ${v('location')}\n*Budget:* ${v('budget')}\n*Details:* ${v('message')}`;
      window.open('https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
    const focusMe = $('[data-focus]'); if (focusMe) focusMe.focus();
  };

  const initShare = () => $$('[data-share]').forEach(b => b.addEventListener('click', async () => {
    const data = { title: b.dataset.shareTitle || document.title, url: location.href };
    if (navigator.share) { try { await navigator.share(data); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(location.href); toast('Link copied — paste it anywhere to share.'); }
    catch (e) { prompt('Copy this link:', location.href); }
  }));

  const initLightbox = () => {
    const lb = $('#lightbox'); if (!lb) return;
    const links = $$('[data-lightbox]'); let i = 0, lastFocus = null;
    const show = n => { i = (n + links.length) % links.length; const a = links[i]; $('#lb-img').src = a.href; $('#lb-img').alt = a.dataset.caption || 'Photo'; $('#lb-cap').textContent = a.dataset.caption || ''; };
    const open = n => { lastFocus = document.activeElement; show(n); lb.hidden = false; smooth.stop(); $('[data-lb-close]', lb).focus(); };
    const close = () => { lb.hidden = true; smooth.start(); if (lastFocus) lastFocus.focus(); };
    links.forEach((a, n) => a.addEventListener('click', e => { e.preventDefault(); open(n); }));
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => show(i - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    const key = e => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); };
    document.addEventListener('keydown', key); pageCleanups.push(() => document.removeEventListener('keydown', key));
  };

  function initPage() {
    initReveal(); initHero(); initYouTube(); initEmbeds(); initForms(); initShare(); initLightbox(); P.mark();
  }

  /* ---------------- 10. Floating buttons & chatbot ---------------- */
  $('#to-top').addEventListener('click', () => { smooth.to(0); $('#main').focus({ preventScroll: true }); });

  const chat = $('#chatbot'), chatBtn = $('#chat-toggle'), body = $('#chat-body'), chips = $('#chat-chips');
  const waLink = text => 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(text);
  const say = (html, me = false) => {
    const m = document.createElement('div'); m.className = 'msg' + (me ? ' msg--me' : '');
    if (me) m.textContent = html; else m.innerHTML = html;
    body.append(m); body.scrollTop = body.scrollHeight;
  };
  const botSay = html => new Promise(r => {
    const t = document.createElement('div'); t.className = 'msg msg--typing'; t.innerHTML = '<i></i><i></i><i></i>';
    body.append(t); body.scrollTop = body.scrollHeight;
    setTimeout(() => { t.remove(); say(html); r(); }, reduceMotion ? 0 : 650);
  });
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Inline SVG icons for the chat assistant (same Material-style set as the PHP icon() helper)
  const ICONS = {
    mic: 'M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5.3-3c0 3-2.5 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.4 2.7 6.2 6 6.7V21h2v-3.3c3.3-.5 6-3.3 6-6.7h-1.7z',
    headphones: 'M12 3a9 9 0 00-9 9v7a2 2 0 002 2h3v-8H5v-1a7 7 0 0114 0v1h-3v8h3a2 2 0 002-2v-7a9 9 0 00-9-9z',
    shirt: 'M16 3l5.5 3.2-2.2 4.3-2.3-1.1V21H7V9.4l-2.3 1.1-2.2-4.3L8 3c.6 1.3 2.1 2.2 4 2.2s3.4-.9 4-2.2z',
    calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11z',
    chat: 'M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
    arrow: 'M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z',
  };
  const svgIcon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="${ICONS[name]}"/></svg>`;
  const intents = [    { label: 'Book a show', icon: 'mic', match: /book|show|event|wedding|perform|hire|gig/i, reply: () => `Amazing! You can fill in the <a href="${pageUrl('booking')}">booking form</a> (fastest), or continue on WhatsApp and we’ll reply personally.`, wa: 'Hi De Lukes, I would like to book you for an event.' },
    { label: 'Where can I stream?', icon: 'headphones', match: /stream|spotify|listen|song|music|album/i, reply: () => `Press play right here on the site — or go to <a href="${pageUrl('music')}">Music</a> for every release and lyrics. You’ll also find De Lukes on Spotify.`, wa: null },
    { label: 'Merch & orders', icon: 'shirt', match: /merch|shirt|tee|order|buy|shop|store|pay|ecocash/i, reply: () => `Check out the <a href="${pageUrl('store')}">Store</a> — we accept EcoCash, PayPal and card. Questions about an order? Send your order reference on WhatsApp.`, wa: 'Hi De Lukes, I have a question about merch / an order.' },
    { label: 'Next shows', icon: 'calendar', match: /tour|date|concert|ticket|when|next/i, reply: () => `All upcoming dates are on the <a href="${pageUrl('events')}">Events</a> page.`, wa: null },
    { label: 'Talk to the team', icon: 'chat', match: /.*/, reply: () => 'Sure — tap below to open WhatsApp and chat with the team directly.', wa: CFG.waMessage },
  ];
  const showWa = text => say(`<a class="btn btn--wa btn--sm" href="${waLink(text)}" target="_blank" rel="noopener">Continue on WhatsApp ${svgIcon('arrow')}</a>`);
  const handle = async text => {
    say(text, true);
    const intent = intents.find(i => i.match.test(text));
    await botSay(intent.reply());
    if (intent.wa) showWa(intent === intents[intents.length - 1] && !/talk to the team/i.test(text) ? text : intent.wa);
  };
  let chatStarted = false;
  const openChat = async () => {
    chat.hidden = false; document.body.classList.add('chat-open'); chatBtn.setAttribute('aria-expanded', 'true');
    if (!chatStarted) {
      chatStarted = true;
      await botSay('Mhoroi! Welcome to the official De Lukes website.');
      await botSay('How can we help you today?');
      intents.forEach(i => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = svgIcon(i.icon) + '<span>' + esc(i.label) + '</span>'; b.addEventListener('click', () => handle(i.label)); chips.append(b); });
    }
    $('#chat-input').focus();
  };
  function closeChat() { if (!chat.hidden) { chat.hidden = true; document.body.classList.remove('chat-open'); chatBtn.setAttribute('aria-expanded', 'false'); chatBtn.focus(); } }
  chatBtn.addEventListener('click', () => chat.hidden ? openChat() : closeChat());
  $('[data-chat-close]', chat).addEventListener('click', closeChat);
  $('#chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#chat-input'), text = input.value.trim();
    if (!text) return;
    input.value = '';
    handle(esc(text).length ? text : '');
  });

  /* ---------------- Boot ---------------- */
  P.init();
  BG.init();
  onScrollUI();
  initPage();
})();
