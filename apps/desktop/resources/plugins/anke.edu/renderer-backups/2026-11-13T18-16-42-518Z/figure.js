/* 数字人：纯 Canvas 2D 程序化角色，零外部资源。
 * 说话时口型随 TTS 的 boundary 事件 + 包络驱动；空闲时呼吸、眨眼、目光跟随。
 * 这是对「数字人形象」能力的本地重建，不使用平台方的模型或素材。
 */
(function (global) {
  'use strict';

  const PALETTES = [
    { skin: '#f7d7c4', skinShade: '#e9bda6', hair: '#2b2118', cloth: '#3b6ef0', cloth2: '#2a52c4', bg1: '#eef3ff', bg2: '#dbe6ff', accent: '#2f6bff' },
    { skin: '#f3cdb4', skinShade: '#e2b096', hair: '#3a2a20', cloth: '#0f9d8f', cloth2: '#0b7c72', bg1: '#e9fbf8', bg2: '#d2f4ee', accent: '#0f9d8f' },
    { skin: '#f9ddc8', skinShade: '#ecc4a8', hair: '#4a3428', cloth: '#8b5cf6', cloth2: '#6d3fe0', bg1: '#f5f1ff', bg2: '#e8dfff', accent: '#7c4dff' },
    { skin: '#f0c9ae', skinShade: '#dcaa8c', hair: '#211a15', cloth: '#f97316', cloth2: '#d95f07', bg1: '#fff5eb', bg2: '#ffe7d1', accent: '#f97316' },
    { skin: '#f8d9c6', skinShade: '#e8bba1', hair: '#2f2a26', cloth: '#db2777', cloth2: '#b21e60', bg1: '#fff0f7', bg2: '#ffd9ec', accent: '#db2777' },
  ];

  const HAIR = ['bob', 'short', 'ponytail'];

  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  class DigitalFigure {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = opts;
      this.seed = hashSeed(opts.name || 'x');
      this.pal = PALETTES[this.seed % PALETTES.length];
      this.hair = HAIR[(this.seed >> 3) % HAIR.length];
      this.glasses = ((this.seed >> 7) & 1) === 1;
      this.speaking = false;
      this.listening = false;
      this.mouth = 0;
      this.mouthTarget = 0;
      this.blink = 0;
      this.nextBlink = 1.5 + Math.random() * 3;
      this.t = 0;
      this.gaze = { x: 0, y: 0 };
      this.mood = 'idle';
      this._raf = null;
      this._last = performance.now();
      this._boundaryTimer = 0;

      this._resize();
      this._onResize = () => this._resize();
      global.addEventListener('resize', this._onResize);
      this._onMove = (e) => {
        const r = this.canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        this.gaze.x = Math.max(-1, Math.min(1, x * 2.4));
        this.gaze.y = Math.max(-1, Math.min(1, y * 2.4));
      };
      global.addEventListener('pointermove', this._onMove, { passive: true });

      this._loop = this._loop.bind(this);
      this._raf = requestAnimationFrame(this._loop);
    }

    _resize() {
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      const rect = this.canvas.getBoundingClientRect();
      const w = rect.width || 300, h = rect.height || 300;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.dpr = dpr;
      this.w = w; this.h = h;
    }

    setStyleFromName(name) {
      this.seed = hashSeed(name || 'x');
      this.pal = PALETTES[this.seed % PALETTES.length];
      this.hair = HAIR[(this.seed >> 3) % HAIR.length];
      this.glasses = ((this.seed >> 7) & 1) === 1;
    }

    setMood(m) { this.mood = m; }

    /* ---------- 语音 ---------- */
    speak(text, { rate = 1, pitch = 1.05, onEnd } = {}) {
      this.stop();
      this.speaking = true;
      this.mood = 'speaking';
      const synth = global.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
        // 无 TTS：仍给出口型动画，便于观感
        this._simulate = setTimeout(() => { this.speaking = false; this.mood = 'idle'; onEnd && onEnd(); }, Math.min(9000, 600 + text.length * 110));
        return { mode: 'silent' };
      }
      const u = new SpeechSynthesisUtterance(String(text).slice(0, 1200));
      u.lang = 'zh-CN';
      u.rate = rate; u.pitch = pitch;
      const voices = synth.getVoices();
      const zh = voices.find((v) => /zh[-_]CN|Chinese|中文|普通话/i.test(v.lang + ' ' + v.name));
      if (zh) u.voice = zh;
      u.onstart = () => { this.speaking = true; };
      u.onboundary = () => { this.mouthTarget = 0.55 + Math.random() * 0.45; this._boundaryTimer = 0.12; };
      u.onend = () => { this.speaking = false; this.mood = 'idle'; this.mouthTarget = 0; onEnd && onEnd(); };
      u.onerror = () => { this.speaking = false; this.mood = 'idle'; onEnd && onEnd(); };
      synth.cancel();
      synth.speak(u);
      return { mode: 'tts' };
    }

    stop() {
      this.speaking = false;
      this.mood = 'idle';
      this.mouthTarget = 0;
      if (this._simulate) { clearTimeout(this._simulate); this._simulate = null; }
      if (global.speechSynthesis) global.speechSynthesis.cancel();
    }

    destroy() {
      cancelAnimationFrame(this._raf);
      global.removeEventListener('resize', this._onResize);
      global.removeEventListener('pointermove', this._onMove);
      this.stop();
    }

    /* ---------- 渲染 ---------- */
    _loop(now) {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.t += dt;

      // 眨眼
      this.nextBlink -= dt;
      if (this.nextBlink <= 0) { this.blink = 1; this.nextBlink = 2 + Math.random() * 4; }
      this.blink = Math.max(0, this.blink - dt * 6);

      // 口型：boundary 触发后衰减，否则用噪声包络
      if (this.speaking) {
        if (this._boundaryTimer > 0) {
          this._boundaryTimer -= dt;
        } else {
          const env = 0.5 + 0.5 * Math.sin(this.t * 9.1) * Math.sin(this.t * 3.7 + 1.2);
          this.mouthTarget = 0.12 + Math.max(0, env) * 0.7;
        }
      } else {
        this.mouthTarget = 0;
      }
      this.mouth += (this.mouthTarget - this.mouth) * Math.min(1, dt * 16);

      this._draw();
      this._raf = requestAnimationFrame(this._loop);
    }

    _draw() {
      const { ctx, w, h, pal } = this;
      const cx = w / 2, cy = h * 0.60;
      const s = Math.min(w, h) / 270;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 背景光晕
      const bg = ctx.createRadialGradient(cx, cy - 30 * s, 10, cx, cy, w * 0.62);
      bg.addColorStop(0, pal.bg1);
      bg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy - 10 * s, w * 0.5, 0, Math.PI * 2); ctx.fill();

      // 说话脉冲环
      if (this.speaking) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 3.2);
        ctx.strokeStyle = pal.accent + Math.round(30 + pulse * 50).toString(16).padStart(2, '0');
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy - 20 * s, (92 + pulse * 4) * s, 0, Math.PI * 2); ctx.stroke();
      }
      if (this.listening) {
        ctx.strokeStyle = 'rgba(225,29,72,.35)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy - 20 * s, (96 + Math.sin(this.t * 4) * 3) * s, 0, Math.PI * 2); ctx.stroke();
      }

      const breath = Math.sin(this.t * 1.6) * 2.2 * s;
      const sway = Math.sin(this.t * 0.7) * 2.4 * s;

      ctx.save();
      ctx.translate(cx + sway * 0.4, cy + breath * 0.35);

      // 身体
      ctx.fillStyle = pal.cloth;
      ctx.beginPath();
      ctx.moveTo(-62 * s, 96 * s);
      ctx.quadraticCurveTo(-58 * s, 52 * s, -20 * s, 44 * s);
      ctx.lineTo(20 * s, 44 * s);
      ctx.quadraticCurveTo(58 * s, 52 * s, 62 * s, 96 * s);
      ctx.quadraticCurveTo(0, 106 * s, -62 * s, 96 * s);
      ctx.closePath(); ctx.fill();
      // 衣领
      ctx.fillStyle = pal.cloth2;
      ctx.beginPath();
      ctx.moveTo(-20 * s, 44 * s); ctx.quadraticCurveTo(0, 66 * s, 20 * s, 44 * s);
      ctx.quadraticCurveTo(0, 52 * s, -20 * s, 44 * s); ctx.fill();

      // 脖子
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath();
      ctx.roundRect(-11 * s, 24 * s, 22 * s, 26 * s, 8 * s);
      ctx.fill();

      // 头
      const headR = 44 * s;
      const headCY = -6 * s;
      ctx.save();
      ctx.translate(0, headCY);
      ctx.rotate(Math.sin(this.t * 0.7) * 0.012);

      // 耳朵
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath(); ctx.ellipse(-headR * 0.98, 2 * s, 7 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(headR * 0.98, 2 * s, 7 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();

      // 头发（后层）
      ctx.fillStyle = pal.hair;
      if (this.hair === 'bob') {
        ctx.beginPath();
        ctx.ellipse(0, 2 * s, headR * 1.12, headR * 1.18, 0, Math.PI * 0.02, Math.PI * 0.98, true);
        ctx.rect(-headR * 1.12, -6 * s, headR * 2.24, 52 * s);
        ctx.fill();
      } else if (this.hair === 'ponytail') {
        ctx.beginPath(); ctx.ellipse(0, -4 * s, headR * 1.06, headR * 1.08, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(headR * 0.86, -10 * s);
        ctx.quadraticCurveTo(headR * 1.5, 10 * s, headR * 1.18, 46 * s);
        ctx.quadraticCurveTo(headR * 0.95, 20 * s, headR * 0.8, 2 * s);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.ellipse(0, -6 * s, headR * 1.04, headR * 1.0, 0, 0, Math.PI * 2); ctx.fill();
      }

      // 脸
      const faceGrad = ctx.createLinearGradient(0, -headR, 0, headR);
      faceGrad.addColorStop(0, pal.skin);
      faceGrad.addColorStop(1, pal.skinShade);
      ctx.fillStyle = faceGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2 * s, headR * 0.92, headR * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();

      // 刘海
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.moveTo(-headR * 0.95, -6 * s);
      ctx.quadraticCurveTo(-headR * 0.6, -headR * 1.05, 0, -headR * 1.0);
      ctx.quadraticCurveTo(headR * 0.6, -headR * 1.05, headR * 0.95, -6 * s);
      ctx.quadraticCurveTo(headR * 0.55, -22 * s, headR * 0.2, -16 * s);
      ctx.quadraticCurveTo(0, -8 * s, -headR * 0.3, -18 * s);
      ctx.quadraticCurveTo(-headR * 0.6, -24 * s, -headR * 0.95, -6 * s);
      ctx.closePath(); ctx.fill();

      // 眉
      ctx.strokeStyle = pal.hair; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
      const browLift = this.mood === 'speaking' ? -1.2 * s : 0;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(side * 10 * s, -14 * s + browLift);
        ctx.quadraticCurveTo(side * 17 * s, -17.5 * s + browLift, side * 24 * s, -13.5 * s + browLift);
        ctx.stroke();
      });

      // 眼
      const eyeY = -2 * s;
      const blinkK = 1 - Math.min(1, this.blink * 1.6);
      [-1, 1].forEach((side) => {
        const ex = side * 16 * s;
        // 眼白
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex, eyeY, 7.4 * s, 6.4 * s * blinkK, 0, 0, Math.PI * 2); ctx.fill();
        // 虹膜
        if (blinkK > 0.25) {
          ctx.fillStyle = '#2b2b33';
          ctx.beginPath();
          ctx.ellipse(ex + this.gaze.x * 1.8 * s, eyeY + this.gaze.y * 1.4 * s, 3.4 * s, 3.4 * s * blinkK, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.beginPath();
          ctx.arc(ex + this.gaze.x * 1.8 * s - 1 * s, eyeY + this.gaze.y * 1.4 * s - 1.2 * s, 1.1 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        // 上眼线
        ctx.strokeStyle = 'rgba(60,42,34,.55)'; ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(ex - 7.4 * s, eyeY - 3 * s * blinkK);
        ctx.quadraticCurveTo(ex, eyeY - 7 * s * blinkK, ex + 7.4 * s, eyeY - 3 * s * blinkK);
        ctx.stroke();
      });

      // 眼镜
      if (this.glasses) {
        ctx.strokeStyle = 'rgba(40,48,66,.7)'; ctx.lineWidth = 1.6 * s;
        [-1, 1].forEach((side) => {
          ctx.beginPath(); ctx.roundRect(side * 16 * s - 10 * s, eyeY - 8 * s, 20 * s, 16 * s, 5 * s); ctx.stroke();
        });
        ctx.beginPath(); ctx.moveTo(-6 * s, eyeY - 1 * s); ctx.lineTo(6 * s, eyeY - 1 * s); ctx.stroke();
      }

      // 鼻子
      ctx.strokeStyle = 'rgba(190,120,96,.55)'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.moveTo(0, 8 * s); ctx.quadraticCurveTo(2.4 * s, 13 * s, -1.4 * s, 14 * s); ctx.stroke();

      // 嘴
      const m = this.mouth;
      const mouthW = 15 * s;
      const openH = 2 * s + m * 13 * s;
      ctx.fillStyle = '#a83f4b';
      ctx.beginPath();
      ctx.moveTo(-mouthW, 24 * s);
      ctx.quadraticCurveTo(0, 24 * s + openH * 1.5, mouthW, 24 * s);
      ctx.quadraticCurveTo(0, 24 * s + openH * 0.5, -mouthW, 24 * s);
      ctx.closePath(); ctx.fill();
      if (m > 0.12) {
        ctx.fillStyle = '#f2f2f4';
        ctx.beginPath();
        ctx.moveTo(-mouthW * 0.62, 24 * s + 0.6 * s);
        ctx.quadraticCurveTo(0, 24 * s + openH * 0.55, mouthW * 0.62, 24 * s + 0.6 * s);
        ctx.quadraticCurveTo(0, 24 * s + 2.2 * s, -mouthW * 0.62, 24 * s + 0.6 * s);
        ctx.fill();
      }

      // 腮红
      ctx.fillStyle = 'rgba(240,140,130,.22)';
      [-1, 1].forEach((side) => {
        ctx.beginPath(); ctx.ellipse(side * 28 * s, 14 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      });

      ctx.restore();
      ctx.restore();
    }
  }

  /* SpeechSynthesis 需要用户手势后才能在一些浏览器里发声，这里预热一次。 */
  function primeVoices() {
    if (global.speechSynthesis) {
      try { global.speechSynthesis.getVoices(); } catch { /* ignore */ }
    }
  }

  global.DigitalFigure = DigitalFigure;
  global.primeVoices = primeVoices;
})(window);
