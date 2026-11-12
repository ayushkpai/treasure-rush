/* =========================================================
   TREASURE RUSH — procedural audio (Web Audio, no assets)
   ========================================================= */

(function () {
  'use strict';

  function SoundEngine() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
  }

  SoundEngine.prototype.init = function () {
    if (this.ctx) return true;

    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoise();
      return true;
    } catch (err) {
      this.ctx = null;
      return false;
    }
  };

  SoundEngine.prototype._makeNoise = function () {
    var ctx = this.ctx;
    var length = Math.floor(ctx.sampleRate * 1.2);
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);

    for (var i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  };

  SoundEngine.prototype.resume = function () {
    if (!this.init()) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(function () {});
    }
  };

  SoundEngine.prototype.setMuted = function (muted) {
    this.muted = !!muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  };

  SoundEngine.prototype._ready = function () {
    return !!(this.ctx && !this.muted);
  };

  SoundEngine.prototype.tone = function (opts) {
    if (!this._ready()) return;

    var ctx = this.ctx;
    var freq = opts.freq || 440;
    var dur = opts.dur || 0.15;
    var type = opts.type || 'sine';
    var vol = opts.vol == null ? 0.1 : opts.vol;
    var delay = opts.delay || 0;
    var attack = opts.attack == null ? 0.006 : opts.attack;
    var t0 = ctx.currentTime + delay;

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    }

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, attack + 0.03));

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.06);
  };

  SoundEngine.prototype.noise = function (opts) {
    if (!this._ready() || !this.noiseBuffer) return;

    var ctx = this.ctx;
    var dur = opts.dur || 0.2;
    var delay = opts.delay || 0;
    var vol = opts.vol == null ? 0.06 : opts.vol;
    var freq = opts.freq || 900;
    var t0 = ctx.currentTime + delay;

    var src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    var filter = ctx.createBiquadFilter();
    filter.type = opts.type || 'lowpass';
    filter.frequency.setValueAtTime(freq, t0);
    if (opts.toFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.toFreq), t0 + dur);
    }

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  };

  SoundEngine.prototype.ui = function () {
    this.tone({ freq: 620, to: 760, dur: 0.06, type: 'triangle', vol: 0.055 });
  };

  SoundEngine.prototype.startRun = function () {
    this.tone({ freq: 196, to: 294, dur: 0.22, type: 'triangle', vol: 0.11 });
    this.tone({ freq: 294, to: 392, dur: 0.2, type: 'triangle', vol: 0.09, delay: 0.11 });
    this.noise({ dur: 0.5, vol: 0.03, freq: 500, toFreq: 180 });
  };

  SoundEngine.prototype.coin = function () {
    this.tone({ freq: 1046, to: 1318, dur: 0.075, type: 'triangle', vol: 0.085 });
    this.tone({ freq: 1568, dur: 0.1, type: 'sine', vol: 0.06, delay: 0.055 });
  };

  SoundEngine.prototype.gem = function () {
    this.tone({ freq: 880, dur: 0.16, type: 'sine', vol: 0.075 });
    this.tone({ freq: 1174, dur: 0.18, type: 'sine', vol: 0.055, delay: 0.055 });
    this.tone({ freq: 1760, dur: 0.22, type: 'sine', vol: 0.04, delay: 0.11 });
  };

  SoundEngine.prototype.key = function () {
    this.tone({ freq: 1318, to: 1760, dur: 0.13, type: 'triangle', vol: 0.075 });
    this.tone({ freq: 2637, dur: 0.1, type: 'sine', vol: 0.035, delay: 0.07 });
  };

  SoundEngine.prototype.chest = function () {
    this.noise({ dur: 0.18, vol: 0.04, freq: 700, toFreq: 200 });
    this.tone({ freq: 523, dur: 0.35, type: 'triangle', vol: 0.09, delay: 0.04 });
    this.tone({ freq: 659, dur: 0.35, type: 'triangle', vol: 0.075, delay: 0.11 });
    this.tone({ freq: 784, dur: 0.4, type: 'triangle', vol: 0.07, delay: 0.18 });
    this.tone({ freq: 1046, dur: 0.5, type: 'sine', vol: 0.06, delay: 0.26 });
  };

  SoundEngine.prototype.door = function () {
    this.tone({ freq: 150, to: 90, dur: 0.28, type: 'sawtooth', vol: 0.05 });
    this.noise({ dur: 0.4, vol: 0.05, freq: 320, toFreq: 1300, type: 'bandpass' });
    this.tone({ freq: 880, dur: 0.12, type: 'sine', vol: 0.03, delay: 0.3 });
  };

  SoundEngine.prototype.locked = function () {
    this.tone({ freq: 130, to: 90, dur: 0.12, type: 'square', vol: 0.05 });
    this.noise({ dur: 0.1, vol: 0.03, freq: 280 });
  };

  SoundEngine.prototype.hurt = function () {
    this.tone({ freq: 180, to: 54, dur: 0.34, type: 'sawtooth', vol: 0.14 });
    this.noise({ dur: 0.26, vol: 0.1, freq: 900, toFreq: 160 });
    this.tone({ freq: 84, dur: 0.3, type: 'sine', vol: 0.12 });
  };

  SoundEngine.prototype.bump = function () {
    this.tone({ freq: 92, to: 68, dur: 0.07, type: 'sine', vol: 0.045 });
  };

  SoundEngine.prototype.step = function (alt) {
    this.noise({ dur: 0.045, vol: 0.016, freq: alt ? 340 : 280 });
  };

  SoundEngine.prototype.tick = function (urgent) {
    this.tone({ freq: urgent ? 1180 : 880, dur: 0.05, type: 'sine', vol: urgent ? 0.055 : 0.035 });
  };

  SoundEngine.prototype.portal = function () {
    this.tone({ freq: 392, to: 784, dur: 0.5, type: 'sine', vol: 0.075 });
    this.tone({ freq: 587, to: 1174, dur: 0.55, type: 'triangle', vol: 0.05, delay: 0.08 });
    this.noise({ dur: 0.7, vol: 0.035, freq: 1200, toFreq: 4000, type: 'highpass' });
  };

  SoundEngine.prototype.levelComplete = function () {
    var notes = [523, 659, 784, 1046];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], dur: 0.5, type: 'triangle', vol: 0.085, delay: i * 0.1 });
      this.tone({ freq: notes[i] * 2, dur: 0.32, type: 'sine', vol: 0.025, delay: i * 0.1 + 0.02 });
    }
    this.tone({ freq: 261, dur: 1.1, type: 'sine', vol: 0.06, delay: 0.35 });
  };

  SoundEngine.prototype.gameOver = function () {
    var notes = [330, 262, 208, 156];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], dur: 0.5, type: 'triangle', vol: 0.08, delay: i * 0.18 });
    }
    this.noise({ dur: 1.1, vol: 0.045, freq: 600, toFreq: 80 });
  };

  SoundEngine.prototype.victory = function () {
    var notes = [392, 523, 659, 784, 1046, 1318];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], dur: 0.55, type: 'triangle', vol: 0.08, delay: i * 0.11 });
      this.tone({ freq: notes[i] * 2, dur: 0.35, type: 'sine', vol: 0.022, delay: i * 0.11 + 0.02 });
    }
    this.tone({ freq: 261, dur: 1.6, type: 'sine', vol: 0.07, delay: 0.5 });
    this.tone({ freq: 392, dur: 1.6, type: 'sine', vol: 0.05, delay: 0.5 });
    this.noise({ dur: 1.4, vol: 0.025, freq: 2000, toFreq: 5000, type: 'highpass', delay: 0.35 });
  };

  window.SoundEngine = SoundEngine;
})();
