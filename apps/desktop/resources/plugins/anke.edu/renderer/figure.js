/* 数字人：纯 Canvas 2D 程序化角色，零外部资源。
 * 说话时口型随 TTS 的 boundary 事件 + 包络驱动；空闲时呼吸、眨眼、目光跟随。
 * 这是对「数字人形象」能力的本地重建，不使用平台方的模型或素材。
 */
(function (global) {
  'use strict';


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
      this.reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.seed = hashSeed(opts.name || 'x');
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
      const { ctx, w, h } = this;
      const size = Math.min(w, h) * 0.92;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate((w - size) / 2, (h - size) / 2);
      ctx.scale(size / 100, size / 100);
      global.AnkeEducationArt.paint(ctx, this.reducedMotion ? 0 : this.t,
        this.mouth, this.reducedMotion ? 0 : this.blink,
        this.reducedMotion ? { x: 0, y: 0 } : this.gaze, this.seed);
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
