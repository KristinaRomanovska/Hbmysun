/* Базова логіка без музики + автогалерея з кореневої папки */

// --------- Хелпери ---------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// Неоновий режим
const themeBtn = $('#themeBtn');
themeBtn?.addEventListener('click', () => {
  document.body.classList.toggle('neon');
});

// Typed текст
const typedEl = $('#typed');
(function typewriter() {
  if (!typedEl) return;
  const text = typedEl.dataset.text || typedEl.textContent || '';
  typedEl.textContent = '';
  let i = 0;
  const tick = () => {
    if (i <= text.length) {
      typedEl.textContent = text.slice(0, i);
      i++;
      setTimeout(tick, 22);
    }
  };
  tick();
})();

// Конфеті (проста версія)
const confettiCanvas = $('#confettiCanvas');
const celebrateBtn  = $('#celebrateBtn');
celebrateBtn?.addEventListener('click', () => {
  burstConfetti(1000);
});
function burstConfetti(duration=1200) {
  if (!confettiCanvas) return;
  confettiCanvas.style.display = 'block';
  const ctx = confettiCanvas.getContext('2d');
  const { innerWidth:w, innerHeight:h } = window;
  confettiCanvas.width = w; confettiCanvas.height = h;
  const pieces = Array.from({length:160}, () => ({
    x: Math.random()*w, y: -20-Math.random()*h,
    s: 6+Math.random()*8, vy: 2+Math.random()*3, vx: -1+Math.random()*2,
    a: Math.random()*Math.PI*2, va: -0.1 + Math.random()*0.2,
  }));
  let start = performance.now();
  function frame(t){
    const dt = (t - start); start = t;
    ctx.clearRect(0,0,w,h);
    pieces.forEach(p => {
      p.vy += 0.03; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
      ctx.fillStyle = `hsl(${260+Math.random()*80}, 80%, 70%)`;
      ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s);
      ctx.restore();
    });
    pieces.filter(p => p.y < h+40);
    if (t < performance.now()+duration) requestAnimationFrame(frame);
    else confettiCanvas.style.display = 'none';
  }
  requestAnimationFrame(frame);
}

// --------- Міні-гра (спрощено) ---------
(function game(){
  const canvas = $('#gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const scoreEl = $('#score');
  const timeEl  = $('#time');
  const startBtn = $('#startGame');
  const winMsg = $('#winMessage');
  let hearts = [], score=0, time=30, running=false;
  let ring = {x: 200, y: 150, r: 36};

  const resize = () => {
    // Canvas сам адаптується за CSS, але координати беруть із атрибутів width/height
    // Залишаємо базові 900x540; вправо/вниз масштабується.
  };
  window.addEventListener('resize', resize);
  resize();

  const spawnHeart = () => {
    hearts.push({
      x: Math.random()*canvas.width,
      y: -20,
      vy: 1.5 + Math.random()*2.5,
      r: 14 + Math.random()*10
    });
  };

  const drawHeart = (x,y,s) => {
    ctx.save();
    ctx.translate(x,y);
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    const top = s*0.3;
    ctx.moveTo(0, top);
    ctx.bezierCurveTo(s, -s*0.2, s*1.2, s*0.8, 0, s*1.4);
    ctx.bezierCurveTo(-s*1.2, s*0.8, -s, -s*0.2, 0, top);
    ctx.fill();
    ctx.restore();
  };

  const loop = () => {
    if (!running) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // кільце
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI*2);
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 6;
    ctx.stroke();

    // серця
    if (Math.random() < 0.06) spawnHeart();
    hearts.forEach(h => { h.y += h.vy; drawHeart(h.x,h.y,h.r/10); });

    // колізії
    hearts = hearts.filter(h => {
      const dx = h.x - ring.x, dy = h.y - ring.y;
      const d = Math.hypot(dx,dy);
      if (d < ring.r + h.r*0.6) {
        score += 1; scoreEl.textContent = score;
        return false;
      }
      return h.y < canvas.height + 20;
    });

    requestAnimationFrame(loop);
  };

  const start = () => {
    if (running) return;
    score = 0; time = 30; scoreEl.textContent = score; timeEl.textContent = time;
    hearts = []; winMsg.classList.add('hidden');
    running = true; loop();
    const timer = setInterval(() => {
      if (!running) return clearInterval(timer);
      time -= 1; timeEl.textContent = time;
      if (time <= 0) {
        running = false; 
        if (score >= 30) {
          winMsg.classList.remove('hidden');
          burstConfetti(1500);
        }
      }
    }, 1000);
  };

  startBtn?.addEventListener('click', start);

  // керування: миша/тач
  const setPos = (x,y) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ring.x = (x - rect.left) * scaleX;
    ring.y = (y - rect.top) * scaleY;
  };
  canvas.addEventListener('mousemove', e => setPos(e.clientX, e.clientY));
  canvas.addEventListener('touchmove', e => {
    const t = e.touches[0]; if (t) setPos(t.clientX, t.clientY);
  }, {passive:true});
})();

// --------- Автогалерея з кореня ---------
(async function autoGallery(){
  const grid = $('#galleryGrid');
  if (!grid) return;

  // Якщо ви хочете вручну задати список — додайте window.GALLERY_IMAGES = ['photos/01.jpg', ...]
  let sources = window.GALLERY_IMAGES || null;

  // Якщо немає — пробуємо розумно вгадати:
  if (!sources) {
    const baseDirs = ['/photos', '/images', '/img', '/']; // з кореня
    const names = [];
    for (let i=1; i<=50; i++) {
      const n2 = String(i).padStart(2,'0');
      names.push(`photo-${i}`, `photo${i}`, `img-${i}`, `img${i}`, `${n2}`, `${i}`);
    }
    const exts = ['jpg','jpeg','png','webp','gif','JPG','JPEG','PNG','WEBP','GIF'];
    sources = [];
    baseDirs.forEach(dir => {
      names.forEach(n => {
        exts.forEach(ext => sources.push(`${dir}/${n}.${ext}`));
      });
    });
  }

  // Унікальні шляхи
  sources = Array.from(new Set(sources));

  const exists = (src) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now(); // bust cache
  });

  const found = [];
  // Паралельно, але обмежено
  const concurrency = 8;
  let i = 0;
  await Promise.all(new Array(concurrency).fill(0).map(async () => {
    while (i < sources.length) {
      const idx = i++; // захоплюємо індекс
      const ok = await exists(sources[idx]);
      if (ok) found.push(ok);
    }
  }));

  // Якщо нічого не знайшли — м'яке повідомлення
  if (found.length === 0) {
    const p = document.createElement('p');
    p.className = 'muted center';
    p.textContent = '';
    grid.after(p);
    return;
  }

  // Додаємо в грід
  found.slice(0, 80).forEach(src => {
    const item = document.createElement('div');
    item.className = 'item';
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Спогад';
    item.appendChild(img);
    grid.appendChild(item);
  });

  // Лайтбокс
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const closeLightbox = $('#closeLightbox');

  grid.addEventListener('click', e => {
    const img = e.target.closest('.item img');
    if (!img) return;
    lightboxImg.src = img.src;
    lightbox.classList.remove('hidden');
  });
  closeLightbox?.addEventListener('click', () => lightbox.classList.add('hidden'));
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.add('hidden'); });
})();

// --------- Лист ---------
(function letter(){
  const openBtn = $('#openLetter');
  const modal   = $('#letterModal');
  const closeBtn= $('#closeLetter');
  const textBox = $('#letterText');
  openBtn?.addEventListener('click', () => {
    modal.classList.remove('hidden');
    // друк тексту
    if (textBox.dataset.done) return;
    const text = textBox.dataset.text || textBox.textContent || '';
    textBox.textContent = '';
    let i=0;
    const tick = () => {
      if (i <= text.length) {
        textBox.textContent = text.slice(0,i);
        i++; setTimeout(tick, 12);
      } else { textBox.dataset.done = '1'; }
    };
    tick();
  });
  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));
  modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
})();

// --------- Інше: "не натискати" та зоряний квест ---------
(function fun(){
  const btn = $('#doNotPress');
  btn?.addEventListener('click', () => {
    burstConfetti(900);
    btn.disabled = true;
    btn.textContent = 'Ну от 🙂';
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Не натискати'; }, 2000);
  });

  const starsBtn = $('#starsQuestBtn');
  starsBtn?.addEventListener('click', () => {
    // розкидаємо 7 клікабельних зірок, зібравши — відкриється лист
    const total = 7; let left = total;
    const makeStar = () => {
      const s = document.createElement('button');
      s.className = 'ghost small';
      s.style.position = 'fixed';
      s.style.zIndex = '1200';
      s.style.left = Math.random()*80 + 10 + 'vw';
      s.style.top  = Math.random()*70 + 15 + 'vh';
      s.textContent = '⭐';
      s.addEventListener('click', () => {
        s.remove();
        left--;
        if (left === 0) {
          $('#questHint').textContent = 'Секрет розблоковано! Відкрий лист 💌';
          burstConfetti(1200);
        }
      });
      document.body.appendChild(s);
    };
    for (let i=0; i<total; i++) makeStar();
    $('#questHint').textContent = 'Залишилось зірок: ' + left;
  });
})();



// --------- Тло: зоряний пил (маленькі минаючі зірочки) ---------
(function starfield(){
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w, h, dpr;
  const stars = [];
  const STAR_COUNT = Math.min(180, Math.floor((window.innerWidth * window.innerHeight) / 8000));
  const MAX_SPEED = 0.25;

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  function rand(a, b){ return a + Math.random()*(b-a); }
  function makeStar() {
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.4, 1.6) * dpr,
      vx: rand(-MAX_SPEED, MAX_SPEED) * dpr,
      vy: rand(-MAX_SPEED, MAX_SPEED) * dpr,
      tw: Math.random()*Math.PI*2
    };
  }
  for (let i=0; i<STAR_COUNT; i++) stars.push(makeStar());

  function step(){
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of stars){
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -5) s.x = w+5; else if (s.x > w+5) s.x = -5;
      if (s.y < -5) s.y = h+5; else if (s.y > h+5) s.y = -5;

      // легке мерехтіння
      s.tw += 0.03;
      const alpha = 0.5 + 0.5*Math.sin(s.tw);

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
    requestAnimationFrame(step);
  }
  step();
})();
