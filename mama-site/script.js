(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     1. Эффекты на canvas: сердечки, конфетти, искры
     ========================================================= */
  const canvas = $('#fx');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const parts = [];
  const COLORS = ['#ff6f9f', '#ffa3c4', '#f6cf86', '#ffffff', '#c9a7ff', '#ff4f8b'];
  const MAX = 320;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  function add(p) {
    if (parts.length < MAX) parts.push(p);
  }

  function heart(ctx, s) {
    const t = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, t * 0.7);
    ctx.bezierCurveTo(-t * 1.7, -t * 0.3, -t * 0.8, -t * 1.5, 0, -t * 0.6);
    ctx.bezierCurveTo(t * 0.8, -t * 1.5, t * 1.7, -t * 0.3, 0, t * 0.7);
    ctx.closePath();
  }

  function ambient() {
    add({
      type: 'heart', x: rnd(0, W), y: H + 20,
      vx: 0, vy: -rnd(0.5, 1.3), sway: rnd(0.5, 1.6), phase: rnd(0, 6.28),
      size: rnd(10, 26), rot: rnd(-0.4, 0.4), vr: 0,
      life: 0, max: 700, color: pick(COLORS), alpha: rnd(0.25, 0.6), g: 0
    });
  }

  function burst(x, y, n = 24, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const v = rnd(2, 7) * power;
      const isHeart = Math.random() < 0.55;
      add({
        type: isHeart ? 'heart' : 'conf', x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2,
        sway: 0, phase: 0,
        size: isHeart ? rnd(10, 24) : rnd(6, 11),
        rot: rnd(0, 6.28), vr: rnd(-0.2, 0.2),
        life: 0, max: rnd(70, 130), color: pick(COLORS), alpha: 1, g: 0.12
      });
    }
  }

  function spark(x, y) {
    add({
      type: 'spark', x, y, vx: rnd(-0.6, 0.6), vy: rnd(-0.2, 0.9), sway: 0, phase: 0,
      size: rnd(3, 7), rot: 0, vr: 0, life: 0, max: 40, color: pick(['#f6cf86', '#fff', '#ffa3c4']), alpha: 1, g: 0.02
    });
  }

  // салют на весь экран
  function fireworks() {
    let n = 0;
    const id = setInterval(() => {
      burst(rnd(W * 0.15, W * 0.85), rnd(H * 0.15, H * 0.55), 34, 1.15);
      if (++n > 7) clearInterval(id);
    }, 260);
  }

  let last = 0, acc = 0;
  function frame(t) {
    const dt = Math.min(t - last, 50); last = t;
    acc += dt;
    const every = reduceMotion ? 1400 : 420;
    if (acc > every) { acc = 0; ambient(); }

    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life++;
      p.vy += p.g;
      p.x += p.vx + (p.sway ? Math.sin(p.life / 40 + p.phase) * p.sway : 0);
      p.y += p.vy;
      p.rot += p.vr;
      const fade = p.type === 'heart' && p.g === 0 ? 1 : 1 - p.life / p.max;
      if (p.life > p.max || p.y < -40 || p.y > H + 60) { parts.splice(i, 1); continue; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * fade));
      ctx.fillStyle = p.color;
      if (p.type === 'heart') {
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        heart(ctx, p.size); ctx.fill();
      } else if (p.type === 'conf') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // старт: небольшая россыпь сердечек сразу
  for (let i = 0; i < 10; i++) { ambient(); parts[parts.length - 1].y = rnd(0, H); }

  // тап/клик — сердечки; мышь — искры за курсором
  window.addEventListener('pointerdown', e => {
    if (e.target.closest('#lightbox')) return;
    burst(e.clientX, e.clientY, 10, 0.7);
  });
  let lastSpark = 0;
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || reduceMotion) return;
    const now = performance.now();
    if (now - lastSpark > 35) { lastSpark = now; spark(e.clientX, e.clientY); }
  });

  /* =========================================================
     2. Открытие сюрприза + музыка
     ========================================================= */
  const gate = $('#gate');
  const site = $('#site');
  const audio = $('#bgm');
  const musicBtn = $('#musicBtn');

  function fadeIn(a, to = 0.7, ms = 3000) {
    a.volume = 0;
    const step = to / (ms / 100);
    const id = setInterval(() => {
      a.volume = Math.min(to, a.volume + step);
      if (a.volume >= to) clearInterval(id);
    }, 100);
  }

  function setMusicState() {
    musicBtn.classList.toggle('on', !audio.paused);
  }

  $('#openBtn').addEventListener('click', () => {
    // музыка (если файл не добавлен — сайт всё равно работает)
    audio.play().then(() => { fadeIn(audio); setMusicState(); }).catch(() => setMusicState());

    gate.classList.add('hide');
    document.body.classList.remove('locked');
    site.hidden = false;
    musicBtn.hidden = false;
    window.scrollTo(0, 0);

    burst(W / 2, H / 2, 70, 1.4);
    setTimeout(() => burst(W * 0.25, H * 0.4, 40, 1.1), 300);
    setTimeout(() => burst(W * 0.75, H * 0.4, 40, 1.1), 550);

    startTyped();
    observeReveal();
  });

  musicBtn.addEventListener('click', () => {
    if (audio.paused) { audio.volume = 0.7; audio.play().catch(() => {}); }
    else audio.pause();
    setMusicState();
  });
  audio.addEventListener('play', setMusicState);
  audio.addEventListener('pause', setMusicState);

  /* =========================================================
     3. Печатающийся текст
     ========================================================= */
  const phrases = [
    'Ты изучаешь общество — а для меня ты целый мир.',
    'За каждой цифрой ты видишь живого человека.',
    'Спасибо, что ты у меня есть.'
  ];
  const typedEl = $('#typed');
  let typedStarted = false;

  function startTyped() {
    if (typedStarted) return;
    typedStarted = true;
    if (reduceMotion) { typedEl.textContent = phrases[0]; return; }
    let pi = 0, ci = 0, del = false;
    (function tick() {
      const text = phrases[pi];
      typedEl.textContent = text.slice(0, ci);
      let delay = del ? 28 : 55;
      if (!del && ci === text.length) { del = true; delay = 2200; }
      else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; delay = 500; }
      ci += del ? -1 : 1;
      setTimeout(tick, delay);
    })();
  }

  /* =========================================================
     4. Появление блоков при прокрутке + счётчики
     ========================================================= */
  function countUp(el) {
    const to = +el.dataset.to;
    const dur = 1800, t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function observeReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('.count', en.target).forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    $$('.reveal').forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 0.08 + 's';
      io.observe(el);
    });
  }

  /* =========================================================
     5. Фотографии: автоподбор расширения + просмотр
     ========================================================= */
  const exts = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG'];
  const photos = $$('.polaroid');

  photos.forEach(fig => {
    const img = $('img', fig);
    const base = fig.dataset.base;
    $('.frame', fig).dataset.label = fig.dataset.label;
    let i = 0;
    img.addEventListener('error', () => {
      i++;
      if (i < exts.length) img.src = `assets/${base}.${exts[i]}`;
      else fig.classList.add('empty');
    });
    img.src = `assets/${base}.${exts[0]}`;
  });

  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let cur = 0;

  function loaded() { return photos.filter(f => !f.classList.contains('empty')); }

  function showPhoto(i) {
    const list = loaded();
    if (!list.length) return;
    cur = (i + list.length) % list.length;
    const f = list[cur];
    lbImg.src = $('img', f).currentSrc || $('img', f).src;
    lbCap.textContent = $('figcaption', f).textContent;
  }

  photos.forEach(f => f.addEventListener('click', () => {
    if (f.classList.contains('empty')) return;
    lb.hidden = false;
    document.body.classList.add('locked');
    showPhoto(loaded().indexOf(f));
  }));

  function closeLb() { lb.hidden = true; document.body.classList.remove('locked'); }
  $('.lb-close').addEventListener('click', closeLb);
  $('.lb-prev').addEventListener('click', () => showPhoto(cur - 1));
  $('.lb-next').addEventListener('click', () => showPhoto(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') showPhoto(cur - 1);
    if (e.key === 'ArrowRight') showPhoto(cur + 1);
  });
  // свайп на телефоне
  let sx = 0;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) showPhoto(cur + (dx < 0 ? 1 : -1));
  });

  /* =========================================================
     6. Мини-опрос
     ========================================================= */
  const poll = $('#poll');
  $$('.opt', poll).forEach(btn => btn.addEventListener('click', e => {
    poll.classList.add('done');
    $('.poll-result', poll).hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => { $('.bar i', poll).style.width = '100%'; }));
    const r = btn.getBoundingClientRect();
    burst(e.clientX || r.left + r.width / 2, e.clientY || r.top, 50, 1.2);
  }));

  /* =========================================================
     7. Финал: салют
     ========================================================= */
  const bigHeart = $('#bigHeart');
  bigHeart.addEventListener('click', () => {
    const r = bigHeart.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 60, 1.3);
  });
  bigHeart.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') bigHeart.click(); });
  $('#fireBtn').addEventListener('click', fireworks);

  // салют, когда долистала до конца
  const finaleIO = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) { fireworks(); finaleIO.disconnect(); } });
  }, { threshold: 0.6 });
  finaleIO.observe($('.finale'));
})();
