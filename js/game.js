/* =========================================================
   TREASURE RUSH — game state, input, progression, HUD
   Rendering lives in js/render.js (added to Game.prototype).
   ========================================================= */

(function () {
  'use strict';

  var DIRS = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }
  };

  var DIR_KEYS = ['up', 'left', 'down', 'right'];
  var STORAGE_BEST = 'treasureRush.bestScore';
  var STORAGE_MUTED = 'treasureRush.muted';
  var TIMER_CIRCUMFERENCE = 163.36;

  var COIN_COLORS = ['#ffe9a8', '#f5c451', '#fff6d8', '#d99a2b'];
  var GOLD_BURST = ['#ffe9a8', '#f5c451', '#fff6d8'];
  var HURT_COLORS = ['#ff6b6b', '#ffb08a', '#ff2d2d', '#ffffff'];

  function $(id) {
    return document.getElementById(id);
  }

  function cellKey(x, y) {
    return x + ',' + y;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      /* Storage can be unavailable in private mode; ignore. */
    }
  }

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  /* ---------------------------------------------------------
     Game
     --------------------------------------------------------- */

  function Game() {
    this.canvas = $('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.ui = {
      startScreen: $('startScreen'),
      pauseScreen: $('pauseScreen'),
      levelScreen: $('levelScreen'),
      endScreen: $('endScreen'),
      playBtn: $('playBtn'),
      resumeBtn: $('resumeBtn'),
      restartBtn: $('restartBtn'),
      quitBtn: $('quitBtn'),
      nextLevelBtn: $('nextLevelBtn'),
      playAgainBtn: $('playAgainBtn'),
      menuBtn: $('menuBtn'),
      pauseBtn: $('pauseBtn'),
      scoreValue: $('scoreValue'),
      bestValue: $('bestValue'),
      levelValue: $('levelValue'),
      levelName: $('levelName'),
      objectiveText: $('objectiveText'),
      chestValue: $('chestValue'),
      goalLine: $('goalLine'),
      timerValue: $('timerValue'),
      timerRing: $('timerRing'),
      timerWrap: document.querySelector('.timer-wrap'),
      lives: $('lives'),
      keyValue: $('keyValue'),
      startBest: $('startBest'),
      pauseBest: $('pauseBest'),
      finalScore: $('finalScore'),
      finalBest: $('finalBest'),
      statCoins: $('statCoins'),
      statGems: $('statGems'),
      statChests: $('statChests'),
      endEyebrow: $('endEyebrow'),
      endTitle: $('endTitle'),
      endCopy: $('endCopy'),
      newBestBadge: $('newBestBadge'),
      levelEyebrow: $('levelEyebrow'),
      levelCompleteTitle: $('levelCompleteTitle'),
      levelCompleteCopy: $('levelCompleteCopy'),
      levelTimeBonus: $('levelTimeBonus'),
      levelClearBonus: $('levelClearBonus'),
      levelScore: $('levelScore'),
      nextLevelName: $('nextLevelName'),
      nextLevelPips: $('nextLevelPips'),
      damageFlash: $('damageFlash'),
      toast: $('toast'),
      levelFade: $('levelFade'),
      soundButtons: Array.prototype.slice.call(document.querySelectorAll('.sound-btn')),
      soundLabels: Array.prototype.slice.call(document.querySelectorAll('#soundLabel, .sound-label'))
    };

    this.sound = new window.SoundEngine();
    this.muted = readStorage(STORAGE_MUTED) === '1';
    this.sound.setMuted(this.muted);
    this.best = parseInt(readStorage(STORAGE_BEST) || '0', 10);
    if (isNaN(this.best) || this.best < 0) this.best = 0;

    this.reducedMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    this.state = 'menu';
    this.levelIndex = 0;
    this.level = null;
    this.player = null;
    this.time = 0;
    this.playTime = 0;
    this.lastTs = 0;
    this.lastTimerValue = null;
    this.lastTimerSecond = 61;

    this.score = 0;
    this.lives = 3;
    this.keys = 0;
    this.timeLeft = 60;
    this.timerMax = 60;
    this.chestsOpened = 0;
    this.exitActive = false;
    this.invincible = 0;
    this.dying = 0;
    this.shake = 0;
    this.damageFlash = 0;
    this.autoMovePending = false;
    this.bonusPoints = 0;
    this.newHighScore = false;
    this.bestAtRunStart = this.best;
    this.transitioning = false;
    this.lastBumpSound = -1;
    this.portalBurstTimer = 0;
    this.toastTimer = null;

    this.stats = {
      coins: 0,
      gems: 0,
      chests: 0
    };

    this.input = {
      buffer: [],
      held: []
    };

    this.particles = [];
    this.floaters = [];
    this.camera = { x: 0, y: 0, init: false };
    this.swipe = null;

    this.resize();
    this.bindUI();
    this.bindKeyboard();
    this.bindTouch();
    this.updateSoundUI();

    this.resetRunStats();
    this.loadLevel(0);
    this.state = 'menu';
    document.body.dataset.screen = 'menu';
    this.hideAllScreens();
    this.ui.startScreen.classList.remove('is-hidden');
    this.refreshBestViews();
    this.updateHUD();

    this.lastTs = 0;
    this.loop = this.loop.bind(this);
    window.requestAnimationFrame(this.loop);
  }

  /* ---------------------------------------------------------
     Run / level lifecycle
     --------------------------------------------------------- */

  Game.prototype.resetRunStats = function () {
    this.score = 0;
    this.lives = 3;
    this.keys = 0;
    this.bonusPoints = 0;
    this.newHighScore = false;
    this.bestAtRunStart = this.best;
    this.stats.coins = 0;
    this.stats.gems = 0;
    this.stats.chests = 0;
  };

  Game.prototype.startRun = function () {
    if (this.transitioning) return;

    this.sound.resume();
    this.sound.startRun();
    this.resetRunStats();
    this.levelIndex = 0;
    this.loadLevel(0);
    this.state = 'playing';
    this.hideAllScreens();
    this.clearInput();
    document.body.dataset.screen = 'playing';
    this.ui.levelFade.classList.remove('is-on');
    this.updateHUD();
    this.updateTimerHUD();
    this.showToast('FIND ' + plural(this.level.chestQuota, 'CHEST', 'CHESTS') + ' · THEN ESCAPE');
    this.refreshBestViews();
  };

  Game.prototype.loadLevel = function (index) {
    this.level = window.TreasureMaze.generateLevel(index);
    this.levelIndex = index;

    var config = this.level.config;
    var start = this.level.start;

    this.player = {
      col: start.x,
      row: start.y,
      x: start.x + 0.5,
      y: start.y + 0.5,
      fromX: start.x + 0.5,
      fromY: start.y + 0.5,
      moving: false,
      moveT: 0,
      moveTime: config.moveTime,
      face: 'down',
      walkTime: 0,
      bumpT: 0,
      bumpDir: { x: 0, y: 0 }
    };

    this.chestsOpened = 0;
    this.exitActive = this.level.chestQuota === 0;
    this.timeLeft = config.timer;
    this.timerMax = config.timer;
    this.lastTimerValue = null;
    this.lastTimerSecond = Math.ceil(this.timeLeft);
    this.playTime = 0;
    this.invincible = 0;
    this.dying = 0;
    this.shake = 0;
    this.damageFlash = 0;
    this.autoMovePending = false;
    this.portalBurstTimer = 0;

    this.itemMap = new Map();
    this.doorMap = new Map();
    this.chestMap = new Map();
    this.spikeMap = new Map();

    this.level.doors.forEach(function (door) {
      door.open = false;
      door.anim = 0;
      door.shake = 0;
      this.doorMap.set(cellKey(door.x, door.y), door);
    }, this);

    this.level.chests.forEach(function (chest) {
      chest.opened = false;
      chest.anim = 0;
      this.chestMap.set(cellKey(chest.x, chest.y), chest);
    }, this);

    this.level.spikes.forEach(function (spike) {
      spike.ext = 0;
      spike.active = false;
      spike.warn = false;
      this.spikeMap.set(cellKey(spike.x, spike.y), spike);
    }, this);

    this.level.coins.forEach(function (coin) {
      coin.type = 'coin';
      coin.taken = false;
      this.itemMap.set(cellKey(coin.x, coin.y), coin);
    }, this);

    this.level.gems.forEach(function (gem) {
      gem.type = 'gem';
      gem.taken = false;
      this.itemMap.set(cellKey(gem.x, gem.y), gem);
    }, this);

    this.level.keys.forEach(function (key) {
      key.type = 'key';
      key.taken = false;
      this.itemMap.set(cellKey(key.x, key.y), key);
    }, this);

    this.level.boulders.forEach(function (boulder) {
      this.initBoulder(boulder);
    }, this);

    this.particles.length = 0;
    this.floaters.length = 0;
    this.camera.init = false;
    this.clearInput();
    this.buildStatic();
    this.updateHUD();
    this.updateTimerHUD();
    this.ui.levelValue.textContent = String(index + 1);
    this.ui.levelName.textContent = config.name;
    this.ui.levelFade.classList.remove('is-on');
  };

  Game.prototype.completeLevel = function () {
    if (this.state !== 'playing') return;

    var timeBonus = Math.max(0, Math.ceil(this.timeLeft)) * 5;
    var levelBonus = 250 * (this.levelIndex + 1);

    this.bonusPoints += timeBonus + levelBonus;
    this.score += timeBonus + levelBonus;
    this.saveBest();
    this.updateHUD();
    this.clearInput();

    if (this.levelIndex >= window.TreasureMaze.count - 1) {
      this.victory();
      return;
    }

    this.sound.levelComplete();
    this.burst(this.player.x, this.player.y, 40, GOLD_BURST, 1.4);
    this.addFloater(this.player.x, this.player.y - 0.6, 'ESCAPED!', '#9ef0c0', 1.5);

    this.state = 'levelComplete';
    document.body.dataset.screen = 'levelComplete';
    this.fillLevelScreen(timeBonus, levelBonus);
    this.hideAllScreens();
    this.ui.levelScreen.classList.remove('is-hidden');
    this.ui.nextLevelBtn.disabled = false;
    this.hideToast();
  };

  Game.prototype.nextLevel = function () {
    if (this.state !== 'levelComplete' || this.transitioning) return;

    this.transitioning = true;
    this.ui.nextLevelBtn.disabled = true;
    this.sound.ui();
    this.levelFade.classList.add('is-on');

    var self = this;
    window.setTimeout(function () {
      self.levelIndex += 1;
      self.lives = Math.min(3, self.lives + 1);
      self.loadLevel(self.levelIndex);
      self.state = 'playing';
      self.hideAllScreens();
      document.body.dataset.screen = 'playing';
      self.updateHUD();
      self.updateTimerHUD();
      self.levelFade.classList.remove('is-on');
      self.transitioning = false;
      self.ui.nextLevelBtn.disabled = false;
      self.sound.startRun();
      self.showToast('LEVEL ' + (self.levelIndex + 1) + ' · ' + self.level.config.name.toUpperCase());
      self.refreshBestViews();
    }, 320);
  };

  Game.prototype.fillLevelScreen = function (timeBonus, levelBonus) {
    var titles = [
      'THE HALLS FALL SILENT',
      'THE SERPENTS SLEEP',
      'THE SANCTUM YIELDS'
    ];
    var next = window.TreasureMaze.LEVELS[this.levelIndex + 1];

    this.ui.levelEyebrow.textContent = 'LEVEL ' + (this.levelIndex + 1) + ' CLEARED';
    this.ui.levelCompleteTitle.textContent = titles[this.levelIndex] || 'THE HALLS FALL SILENT';
    this.ui.levelCompleteCopy.textContent =
      'You slipped out with ' + Math.max(0, Math.ceil(this.timeLeft)) +
      ' seconds to spare and ' + plural(this.lives, 'life', 'lives') + ' intact.';
    this.ui.levelTimeBonus.textContent = '+' + timeBonus;
    this.ui.levelClearBonus.textContent = '+' + levelBonus;
    this.ui.levelScore.textContent = String(this.score);
    this.ui.nextLevelName.textContent = next ? next.name.toUpperCase() : '';
    this.ui.nextLevelName.parentElement.style.display = next ? '' : 'none';

    this.ui.nextLevelPips.innerHTML = '';
    var difficulty = Math.min(3, this.levelIndex + 2);
    for (var i = 0; i < 3; i++) {
      var pip = document.createElement('span');
      if (i < difficulty) pip.className = 'is-on';
      this.ui.nextLevelPips.appendChild(pip);
    }
  };

  Game.prototype.finishGameOver = function (reason) {
    if (this.state === 'gameover' || this.state === 'victory') return;

    this.state = 'gameover';
    this.clearInput();
    this.saveBest();
    this.sound.gameOver();
    this.hideAllScreens();
    this.fillEndScreen(reason);
    this.ui.endScreen.classList.remove('is-hidden');
    document.body.dataset.screen = 'gameover';
    this.hideToast();
  };

  Game.prototype.victory = function () {
    if (this.state === 'victory') return;

    this.state = 'victory';
    this.clearInput();
    this.saveBest();
    this.sound.victory();
    this.hideAllScreens();
    this.fillEndScreen('victory');
    this.ui.endScreen.classList.remove('is-hidden');
    document.body.dataset.screen = 'victory';
    this.hideToast();
    this.burst(this.player.x, this.player.y, 90, ['#ffe9a8', '#4fe39a', '#fff6d8', '#65d8ff'], 2.2);
  };

  Game.prototype.fillEndScreen = function (reason) {
    if (reason === 'victory') {
      this.ui.endEyebrow.textContent = 'TEMPLE ESCAPED';
      this.ui.endTitle.textContent = 'YOU MADE IT OUT';
      this.ui.endCopy.textContent =
        'The vault lies bare. The temple will remember your name.';
    } else if (reason === 'time') {
      this.ui.endEyebrow.textContent = 'THE SANDS RUN DRY';
      this.ui.endTitle.textContent = "TIME'S UP";
      this.ui.endCopy.textContent =
        'The temple seals itself with your treasure still inside.';
    } else {
      this.ui.endEyebrow.textContent = 'THE TEMPLE CLAIMS ANOTHER';
      this.ui.endTitle.textContent = 'GAME OVER';
      this.ui.endCopy.textContent =
        'The traps were faster this time. Your gold stays behind.';
    }

    this.ui.finalScore.textContent = String(this.score);
    this.ui.finalBest.textContent = String(this.best);
    this.ui.statCoins.textContent = String(this.stats.coins);
    this.ui.statGems.textContent = String(this.stats.gems);
    this.ui.statChests.textContent = String(this.stats.chests);
    this.ui.newBestBadge.classList.toggle('is-hidden', !this.newHighScore);
    this.refreshBestViews();
  };

  Game.prototype.quitToMenu = function () {
    this.sound.ui();
    this.state = 'menu';
    this.resetRunStats();
    this.levelIndex = 0;
    this.loadLevel(0);
    this.hideAllScreens();
    this.ui.startScreen.classList.remove('is-hidden');
    this.hideToast();
    this.clearInput();
    document.body.dataset.screen = 'menu';
    this.updateHUD();
    this.refreshBestViews();
  };

  /* ---------------------------------------------------------
     Pause & sound
     --------------------------------------------------------- */

  Game.prototype.togglePause = function () {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.clearInput();
      this.hideAllScreens();
      this.ui.pauseScreen.classList.remove('is-hidden');
      document.body.dataset.screen = 'paused';
      this.ui.pauseBest.textContent = String(this.best);
      this.sound.ui();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.hideAllScreens();
      document.body.dataset.screen = 'playing';
      this.lastTimerSecond = Math.ceil(this.timeLeft);
      this.sound.ui();
    }
  };

  Game.prototype.toggleMute = function () {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
    writeStorage(STORAGE_MUTED, this.muted ? '1' : '0');
    this.updateSoundUI();
    if (!this.muted) {
      this.sound.resume();
      this.sound.ui();
    }
  };

  Game.prototype.updateSoundUI = function () {
    document.body.classList.toggle('is-muted', this.muted);
    this.ui.soundLabels.forEach(function (label) {
      label.textContent = this.muted ? 'SOUND OFF' : 'SOUND ON';
    }, this);
    this.ui.soundButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', this.muted ? 'true' : 'false');
      btn.setAttribute('aria-label', this.muted ? 'Unmute sound' : 'Mute sound');
    }, this);
  };

  /* ---------------------------------------------------------
     Input
     --------------------------------------------------------- */

  Game.prototype.bindKeyboard = function () {
    var self = this;

    window.addEventListener('keydown', function (event) {
      var key = event.key;
      var dir = null;

      if (key === 'ArrowUp' || key === 'w' || key === 'W') dir = 'up';
      else if (key === 'ArrowDown' || key === 's' || key === 'S') dir = 'down';
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') dir = 'left';
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') dir = 'right';

      if (dir) {
        event.preventDefault();
        if (!event.repeat) self.pressDirection(dir);
        return;
      }

      if (key === 'p' || key === 'P' || key === 'Escape') {
        if (self.state === 'playing' || self.state === 'paused') {
          event.preventDefault();
          self.togglePause();
        }
      } else if (key === 'm' || key === 'M') {
        event.preventDefault();
        self.toggleMute();
      }
    }, { passive: false });

    window.addEventListener('keyup', function (event) {
      var key = event.key;
      var dir = null;

      if (key === 'ArrowUp' || key === 'w' || key === 'W') dir = 'up';
      else if (key === 'ArrowDown' || key === 's' || key === 'S') dir = 'down';
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') dir = 'left';
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') dir = 'right';

      if (dir) self.releaseDirection(dir);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.state === 'playing') self.togglePause();
    });
  };

  Game.prototype.bindTouch = function () {
    var self = this;
    var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (isTouch) document.body.classList.add('touch');

    var buttons = document.querySelectorAll('.dpad-btn');
    Array.prototype.forEach.call(buttons, function (btn) {
      var dir = btn.getAttribute('data-dir');

      function down(event) {
        event.preventDefault();
        btn.classList.add('is-held');
        if (btn.setPointerCapture && event.pointerId != null) {
          try { btn.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
        }
        if (self.state === 'playing') self.pressDirection(dir);
      }

      function up(event) {
        if (event) event.preventDefault();
        btn.classList.remove('is-held');
        self.releaseDirection(dir);
      }

      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    });

    this.canvas.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse') return;
      self.swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      if (self.canvas.setPointerCapture) {
        try { self.canvas.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      }
    });

    this.canvas.addEventListener('pointermove', function (event) {
      if (!self.swipe || self.swipe.id !== event.pointerId) return;
      var dx = event.clientX - self.swipe.x;
      var dy = event.clientY - self.swipe.y;
      if (Math.abs(dx) > 20 || Math.abs(dy) > 20) self.swipe.moved = true;
    });

    this.canvas.addEventListener('pointerup', function (event) {
      if (!self.swipe || self.swipe.id !== event.pointerId) return;

      var dx = event.clientX - self.swipe.x;
      var dy = event.clientY - self.swipe.y;
      self.swipe = null;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

      var dir;
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
      else dir = dy > 0 ? 'down' : 'up';

      if (self.state === 'playing') self.pressDirection(dir);
    });

    this.canvas.addEventListener('pointercancel', function () {
      self.swipe = null;
    });

    window.addEventListener('resize', function () {
      self.resize();
    });

    window.addEventListener('orientationchange', function () {
      window.setTimeout(function () { self.resize(); }, 180);
    });
  };

  Game.prototype.pressDirection = function (dir) {
    if (!DIRS[dir] || this.state !== 'playing') return;

    var index = this.input.held.indexOf(dir);
    if (index !== -1) this.input.held.splice(index, 1);
    this.input.held.push(dir);

    if (this.input.buffer.length >= 3) this.input.buffer.shift();
    this.input.buffer.push(dir);
  };

  Game.prototype.releaseDirection = function (dir) {
    var index = this.input.held.indexOf(dir);
    if (index !== -1) this.input.held.splice(index, 1);
  };

  Game.prototype.clearInput = function () {
    this.input.buffer.length = 0;
    this.input.held.length = 0;
    this.autoMovePending = false;
    Array.prototype.forEach.call(document.querySelectorAll('.dpad-btn.is-held'), function (btn) {
      btn.classList.remove('is-held');
    });
  };

  Game.prototype.updateInput = function () {
    if (this.state !== 'playing' || this.dying > 0) return;
    if (!this.player || this.player.moving) return;

    var dir = null;
    if (this.input.buffer.length) {
      dir = this.input.buffer.shift();
    } else if (this.autoMovePending) {
      this.autoMovePending = false;
      if (this.input.held.length) dir = this.input.held[this.input.held.length - 1];
    }

    if (dir) this.tryMove(dir);
  };

  /* ---------------------------------------------------------
     Movement & collision
     --------------------------------------------------------- */

  Game.prototype.isWalkable = function (x, y) {
    if (!this.level) return false;
    if (x < 0 || y < 0 || x >= this.level.cols || y >= this.level.rows) return false;
    return this.level.grid[y][x] === 0;
  };

  Game.prototype.tryMove = function (dir) {
    var vector = DIRS[dir];
    var player = this.player;
    if (!player || player.moving || !vector) return false;

    var nx = player.col + vector.x;
    var ny = player.row + vector.y;
    player.face = dir;

    if (!this.isWalkable(nx, ny)) {
      this.bumpWall(vector);
      return false;
    }

    var door = this.doorMap.get(cellKey(nx, ny));
    if (door && !door.open) {
      if (this.keys > 0) {
        this.keys -= 1;
        door.open = true;
        door.anim = 0;
        door.shake = 0;
        this.sound.door();
        this.updateHUD();
        this.burst(nx + 0.5, ny + 0.5, 14, GOLD_BURST, 1);
        this.showToast('GATE OPENED', true);
      } else {
        door.shake = 1;
        this.sound.locked();
        this.addFloater(nx + 0.5, ny + 0.5, 'NEED A KEY', '#ffb3b3', 1.1);
        this.bumpWall(vector);
        return false;
      }
    }

    player.fromX = player.x;
    player.fromY = player.y;
    player.col = nx;
    player.row = ny;
    player.moving = true;
    player.moveT = 0;
    player.walkTime = 0;
    this.autoMovePending = false;
    this.sound.step(Math.random() > 0.5);
    this.burst(player.fromX, player.fromY, 3, ['#7a6a4d', '#5b4d37'], 0.3);

    return true;
  };

  Game.prototype.bumpWall = function (vector) {
    this.player.bumpT = 1;
    this.player.bumpDir = vector;

    if (this.time - this.lastBumpSound > 0.18) {
      this.lastBumpSound = this.time;
      this.sound.bump();
    }
  };

  Game.prototype.updatePlayer = function (dt) {
    var player = this.player;
    if (!player) return;

    if (player.moving) {
      player.moveT += dt / player.moveTime;
      var t = Math.min(1, player.moveT);
      var eased = t * t * (3 - 2 * t);

      player.x = player.fromX + (player.col + 0.5 - player.fromX) * eased;
      player.y = player.fromY + (player.row + 0.5 - player.fromY) * eased;
      player.walkTime += dt;

      if (t >= 1) {
        player.x = player.col + 0.5;
        player.y = player.row + 0.5;
        player.moving = false;
        player.moveT = 0;
        this.autoMovePending = true;
        this.onArrive();
      }
    } else {
      player.x = player.col + 0.5;
      player.y = player.row + 0.5;
    }

    player.bumpT = Math.max(0, player.bumpT - dt * 7);
    this.invincible = Math.max(0, this.invincible - dt);
  };

  Game.prototype.onArrive = function () {
    if (!this.player) return;

    var player = this.player;
    var k = cellKey(player.col, player.row);
    var item = this.itemMap.get(k);

    if (item && !item.taken) this.collectItem(item);

    var chest = this.chestMap.get(k);
    if (chest && !chest.opened) this.openChest(chest);

    if (this.exitActive) this.checkExit();
  };

  Game.prototype.collectItem = function (item) {
    item.taken = true;
    this.itemMap.delete(cellKey(item.x, item.y));

    if (item.type === 'coin') {
      this.score += 10;
      this.stats.coins += 1;
      this.sound.coin();
      this.burst(item.x + 0.5, item.y + 0.5, 12, COIN_COLORS, 0.9);
      this.addFloater(item.x + 0.5, item.y + 0.2, '+10', '#ffe9a8', 1);
    } else if (item.type === 'gem') {
      this.score += 30;
      this.stats.gems += 1;
      this.sound.gem();
      this.burst(item.x + 0.5, item.y + 0.5, 18, [item.color, '#ffffff'], 1.1);
      this.addFloater(item.x + 0.5, item.y + 0.2, '+30', item.color, 1.1);
    } else if (item.type === 'key') {
      this.keys += 1;
      this.sound.key();
      this.burst(item.x + 0.5, item.y + 0.5, 14, GOLD_BURST, 0.9);
      this.addFloater(item.x + 0.5, item.y + 0.2, 'KEY!', '#ffe9a8', 1.1);
    }

    this.saveBest();
    this.updateHUD();
  };

  Game.prototype.openChest = function (chest) {
    chest.opened = true;
    chest.anim = 0;
    this.chestsOpened += 1;
    this.score += 100;
    this.stats.chests += 1;
    this.sound.chest();
    this.burst(chest.x + 0.5, chest.y + 0.5, 30, GOLD_BURST, 1.4);
    this.addFloater(chest.x + 0.5, chest.y - 0.1, '+100', '#ffe9a8', 1.3);
    this.saveBest();
    this.updateHUD();

    if (this.chestsOpened >= this.level.chestQuota) {
      this.activateExit();
    }
  };

  Game.prototype.activateExit = function () {
    if (this.exitActive) return;
    this.exitActive = true;
    this.sound.portal();
    this.showToast('EXIT OPEN · RETURN TO THE ENTRANCE', true);
    this.burst(this.level.exit.x + 0.5, this.level.exit.y + 0.5, 26, ['#4fe39a', '#9ef0c0', '#ffe9a8'], 1.2);
    this.updateHUD();
  };

  Game.prototype.checkExit = function () {
    if (!this.exitActive || !this.player || this.player.moving || this.dying > 0) return;
    if (this.player.col === this.level.exit.x && this.player.row === this.level.exit.y) {
      this.completeLevel();
    }
  };

  Game.prototype.damage = function (source) {
    if (this.state !== 'playing' || this.invincible > 0 || this.dying > 0) return;

    this.lives -= 1;
    this.invincible = 1.9;
    this.damageFlash = 1;
    this.shake = this.reducedMotion ? 0.4 : 1;
    this.sound.hurt();
    this.burst(this.player.x, this.player.y, 22, HURT_COLORS, 1.3);
    this.addFloater(this.player.x, this.player.y - 0.4, '-1 LIFE', '#ff9b9b', 1.2);
    this.updateHUD();

    if (this.lives <= 0) {
      this.dying = 1.05;
      this.lives = 0;
      this.showToast('THE TEMPLE CLAIMS YOU');
      this.updateHUD();
    }
  };

  Game.prototype.updateSpikes = function (dt) {
    var player = this.player;
    if (!player) return;

    for (var i = 0; i < this.level.spikes.length; i++) {
      var spike = this.level.spikes[i];
      var phase = (this.playTime + spike.offset) % spike.period;

      spike.active = phase < spike.activeDur;
      spike.warn = phase > spike.period - spike.warnDur;

      var target = spike.active ? 1 : 0;
      spike.ext += (target - spike.ext) * Math.min(1, dt * 15);

      if (spike.active && spike.ext > 0.55 && this.invincible <= 0 && this.dying <= 0) {
        var sameCell = player.col === spike.x && player.row === spike.y;
        var mostlyInside = !player.moving || player.moveT > 0.3;
        var close = Math.abs(player.x - (spike.x + 0.5)) < 0.3 &&
          Math.abs(player.y - (spike.y + 0.5)) < 0.3;

        if ((sameCell && mostlyInside) || close) {
          this.damage('spike');
        }
      }
    }
  };

  Game.prototype.canBoulderEnter = function (x, y) {
    if (!this.level) return false;
    if (!this.isWalkable(x, y)) return false;
    var k = cellKey(x, y);
    var door = this.doorMap.get(k);
    if (door && !door.open) return false;
    if (this.chestMap.has(k)) return false;
    return true;
  };

  Game.prototype.initBoulder = function (boulder) {
    boulder.col = Math.floor(boulder.x);
    boulder.row = Math.floor(boulder.y);
    boulder.nextCol = boulder.col;
    boulder.nextRow = boulder.row;
    boulder.t = 0;
    boulder.dirX = 0;
    boulder.dirY = 0;
    boulder.angle = Math.random() * Math.PI * 2;
    this.chooseBoulderNext(boulder);
  };

  Game.prototype.chooseBoulderNext = function (boulder) {
    var options = [];

    for (var i = 0; i < DIR_KEYS.length; i++) {
      var dir = DIRS[DIR_KEYS[i]];
      if (this.canBoulderEnter(boulder.col + dir.x, boulder.row + dir.y)) {
        options.push(dir);
      }
    }

    var chosen = null;

    if (boulder.dirX || boulder.dirY) {
      for (var s = 0; s < options.length; s++) {
        if (options[s].x === boulder.dirX && options[s].y === boulder.dirY) {
          chosen = options[s];
          break;
        }
      }
    }

    if (!chosen) {
      var forward = options.filter(function (dir) {
        return !(dir.x === -boulder.dirX && dir.y === -boulder.dirY);
      });
      if (forward.length) {
        chosen = forward[randomInt(forward.length)];
      } else if (options.length) {
        chosen = options[randomInt(options.length)];
      }
    }

    if (chosen) {
      boulder.dirX = chosen.x;
      boulder.dirY = chosen.y;
      boulder.nextCol = boulder.col + chosen.x;
      boulder.nextRow = boulder.row + chosen.y;
    } else {
      boulder.dirX = 0;
      boulder.dirY = 0;
      boulder.nextCol = boulder.col;
      boulder.nextRow = boulder.row;
    }
  };

  Game.prototype.updateBoulders = function (dt) {
    var player = this.player;
    if (!player) return;

    for (var i = 0; i < this.level.boulders.length; i++) {
      var boulder = this.level.boulders[i];

      boulder.t += dt * boulder.speed;
      var guard = 0;

      while (boulder.t >= 1 && guard < 2) {
        boulder.t -= 1;
        guard += 1;
        boulder.col = boulder.nextCol;
        boulder.row = boulder.nextRow;
        this.chooseBoulderNext(boulder);
      }

      boulder.x = boulder.col + 0.5 + (boulder.nextCol - boulder.col) * boulder.t;
      boulder.y = boulder.row + 0.5 + (boulder.nextRow - boulder.row) * boulder.t;
      boulder.angle += dt * boulder.speed * 3.4;

      if (Math.random() < dt * 7) {
        this.particles.push({
          x: boulder.x + (Math.random() - 0.5) * 0.25,
          y: boulder.y + 0.25,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -Math.random() * 0.2,
          life: 0.5,
          max: 0.5,
          size: 0.035 + Math.random() * 0.03,
          color: '#8b7a5c',
          gravity: 0.2,
          shape: 'dust'
        });
      }

      var dx = boulder.x - player.x;
      var dy = boulder.y - player.y;

      if (dx * dx + dy * dy < 0.36 && this.invincible <= 0 && this.dying <= 0) {
        this.damage('boulder');
      }
    }
  };

  Game.prototype.updateChests = function (dt) {
    if (!this.level) return;

    this.level.chests.forEach(function (chest) {
      if (chest.opened) chest.anim = Math.min(1, chest.anim + dt * 2.6);
    });

    this.level.doors.forEach(function (door) {
      var target = door.open ? 1 : 0;
      door.anim += (target - door.anim) * Math.min(1, dt * 7);
      door.shake = Math.max(0, door.shake - dt * 4);
    });
  };

  /* ---------------------------------------------------------
     Update loop
     --------------------------------------------------------- */

  Game.prototype.updateGameplay = function (dt) {
    if (this.state !== 'playing') return;

    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.finishGameOver('lives');
      return;
    }

    this.playTime += dt;
    this.timeLeft -= dt;

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.updateTimerHUD();
      this.finishGameOver('time');
      return;
    }

    this.updateTimerHUD();

    var second = Math.ceil(this.timeLeft);
    if (second !== this.lastTimerSecond) {
      this.lastTimerSecond = second;
      if (second <= 10 && second > 0) this.sound.tick(second <= 5);
    }

    this.updatePlayer(dt);
    if (this.state !== 'playing') return;

    this.updateSpikes(dt);
    this.updateBoulders(dt);
    this.checkExit();
    if (this.state !== 'playing') return;

    this.updateInput();

    if (this.exitActive) {
      this.portalBurstTimer -= dt;
      if (this.portalBurstTimer <= 0) {
        this.portalBurstTimer = 0.14;
        var exit = this.level.exit;
        this.particles.push({
          x: exit.x + 0.5 + (Math.random() - 0.5) * 0.55,
          y: exit.y + 0.65,
          vx: (Math.random() - 0.5) * 0.2,
          vy: -0.5 - Math.random() * 0.5,
          life: 0.8,
          max: 0.8,
          size: 0.03 + Math.random() * 0.025,
          color: Math.random() > 0.5 ? '#4fe39a' : '#ffe9a8',
          gravity: -0.1,
          shape: 'spark',
          glow: true
        });
      }
    }
  };

  Game.prototype.updateEffects = function (dt) {
    if (this.state !== 'paused') {
      this.updateChests(dt);
    }

    this.shake = Math.max(0, this.shake - dt * 2.3);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.8);
    if (this.ui.damageFlash) {
      this.ui.damageFlash.style.opacity = (this.damageFlash * 0.8).toFixed(3);
    }

    if (this.state === 'paused') return;

    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.vx *= 0.995;
      p.vy *= 0.995;
    }

    for (var f = this.floaters.length - 1; f >= 0; f--) {
      var floater = this.floaters[f];
      floater.life -= dt;
      floater.y -= dt * 0.7;
      if (floater.life <= 0) this.floaters.splice(f, 1);
    }
  };

  Game.prototype.update = function (dt) {
    if (this.state === 'playing') this.updateGameplay(dt);
    this.updateEffects(dt);
  };

  Game.prototype.loop = function (timestamp) {
    if (!this.lastTs) this.lastTs = timestamp;
    var dt = (timestamp - this.lastTs) / 1000;
    this.lastTs = timestamp;
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.1) dt = 0.1;

    this.time += dt;
    this.update(dt);
    this.updateCamera(dt);
    this.render();

    window.requestAnimationFrame(this.loop);
  };

  /* ---------------------------------------------------------
     Effects & helpers
     --------------------------------------------------------- */

  Game.prototype.burst = function (x, y, count, colors, power) {
    var total = this.reducedMotion ? Math.max(4, Math.floor(count * 0.4)) : count;
    var intensity = power || 1;

    for (var i = 0; i < total; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = (0.5 + Math.random() * 1.7) * intensity;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4 * intensity,
        life: 0.4 + Math.random() * 0.55,
        max: 0.95,
        size: 0.035 + Math.random() * 0.075,
        color: colors[randomInt(colors.length)],
        gravity: 1.1,
        shape: Math.random() > 0.65 ? 'confetti' : 'spark',
        glow: true
      });
    }

    if (this.particles.length > 260) {
      this.particles.splice(0, this.particles.length - 260);
    }
  };

  Game.prototype.addFloater = function (x, y, text, color, scale) {
    this.floaters.push({
      x: x,
      y: y,
      text: text,
      color: color || '#ffe9a8',
      life: 1,
      max: 1,
      scale: scale || 1
    });
  };

  Game.prototype.showToast = function (text, emerald) {
    this.ui.toast.textContent = text;
    this.ui.toast.classList.toggle('is-emerald', !!emerald);
    this.ui.toast.classList.add('is-visible');

    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    var self = this;
    this.toastTimer = window.setTimeout(function () {
      self.ui.toast.classList.remove('is-visible');
    }, 2300);
  };

  Game.prototype.hideToast = function () {
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.ui.toast.classList.remove('is-visible');
  };

  Game.prototype.saveBest = function () {
    if (this.score > this.best) {
      this.best = this.score;
      writeStorage(STORAGE_BEST, String(this.best));
    }

    if (this.score > this.bestAtRunStart && this.score > 0) {
      this.newHighScore = true;
    }

    this.refreshBestViews();
  };

  Game.prototype.refreshBestViews = function () {
    var text = String(this.best);
    this.ui.bestValue.textContent = text;
    this.ui.startBest.textContent = text;
    this.ui.pauseBest.textContent = text;
    this.ui.finalBest.textContent = text;
  };

  Game.prototype.updateHUD = function () {
    if (!this.ui) return;

    var scoreText = String(this.score);
    if (this.ui.scoreValue.textContent !== scoreText) {
      this.ui.scoreValue.textContent = scoreText;
      this.ui.scoreValue.classList.remove('is-bumped');
      void this.ui.scoreValue.offsetWidth;
      this.ui.scoreValue.classList.add('is-bumped');
    }

    this.ui.bestValue.textContent = String(this.best);
    this.ui.keyValue.textContent = String(this.keys);

    var hearts = '';
    for (var i = 0; i < 3; i++) {
      hearts += '<svg class="icon' + (i >= this.lives ? ' is-empty' : '') +
        '" aria-hidden="true"><use href="#icon-heart"></use></svg>';
    }
    this.ui.lives.innerHTML = hearts;
    this.ui.lives.setAttribute('aria-label', plural(this.lives, 'life', 'lives') + ' remaining');

    if (!this.level) return;

    this.ui.levelValue.textContent = String(this.levelIndex + 1);
    this.ui.levelName.textContent = this.level.config.name;

    if (this.exitActive) {
      this.ui.goalLine.classList.add('is-open');
      this.ui.objectiveText.textContent = 'EXIT';
      this.ui.chestValue.textContent = 'RETURN';
    } else {
      this.ui.goalLine.classList.remove('is-open');
      this.ui.objectiveText.textContent = this.level.chestQuota === 1 ? 'CHEST' : 'CHESTS';
      this.ui.chestValue.textContent = this.chestsOpened + ' / ' + this.level.chestQuota;
    }
  };

  Game.prototype.updateTimerHUD = function () {
    if (!this.ui || !this.level) return;

    var seconds = Math.max(0, Math.ceil(this.timeLeft));
    if (this.lastTimerValue !== seconds) {
      this.lastTimerValue = seconds;
      this.ui.timerValue.textContent = String(seconds);
    }

    var ratio = clamp(this.timeLeft / this.timerMax, 0, 1);
    this.ui.timerRing.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - ratio));
    this.ui.timerWrap.classList.toggle('is-low', this.timeLeft <= 10);
    this.ui.timerRing.setAttribute('aria-label', seconds + ' seconds remaining');
  };

  Game.prototype.hideAllScreens = function () {
    this.ui.startScreen.classList.add('is-hidden');
    this.ui.pauseScreen.classList.add('is-hidden');
    this.ui.levelScreen.classList.add('is-hidden');
    this.ui.endScreen.classList.add('is-hidden');
  };

  /* ---------------------------------------------------------
     UI bindings
     --------------------------------------------------------- */

  Game.prototype.bindUI = function () {
    var self = this;

    function on(button, handler) {
      if (!button) return;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        self.sound.resume();
        handler();
      });
    }

    on(this.ui.playBtn, function () { self.startRun(); });
    on(this.ui.pauseBtn, function () { self.togglePause(); });
    on(this.ui.resumeBtn, function () { self.togglePause(); });
    on(this.ui.restartBtn, function () { self.startRun(); });
    on(this.ui.quitBtn, function () { self.quitToMenu(); });
    on(this.ui.nextLevelBtn, function () { self.nextLevel(); });
    on(this.ui.playAgainBtn, function () { self.startRun(); });
    on(this.ui.menuBtn, function () { self.quitToMenu(); });

    this.ui.soundButtons.forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        self.sound.resume();
        self.toggleMute();
      });
    });
  };

  window.TreasureRushGame = Game;

  /* render.js and render-entities.js (loaded after this file) extend
     Game.prototype, so the constructor must also be a global. */
  window.Game = Game;

  window.addEventListener('load', function () {
    try {
      window.treasureRush = new Game();
    } catch (error) {
      if (window.console && window.console.error) {
        window.console.error('Treasure Rush failed to start:', error);
      }
    }
  });
})();
