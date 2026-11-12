/* =========================================================
   TREASURE RUSH — rendering core: resize, stone textures,
   camera, lighting, particles. Entity art in render-entities.js.
   ========================================================= */

(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hash(x, y, salt) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 144269);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }

  function roundRect(ctx, x, y, w, h, radius) {
    var r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function makeLightSprite() {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.42, 'rgba(255,255,255,0.82)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.34)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return canvas;
  }

  function makeGlowSprite(r, g, b) {
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.55)');
    gradient.addColorStop(0.45, 'rgba(' + r + ',' + g + ',' + b + ',0.2)');
    gradient.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return canvas;
  }

  Game.prototype.makeLightAssets = function () {
    if (!this.lightSprite) this.lightSprite = makeLightSprite();
    if (!this.glowGold) this.glowGold = makeGlowSprite(255, 187, 82);
    if (!this.glowEmerald) this.glowEmerald = makeGlowSprite(79, 227, 154);
  };

  Game.prototype.resize = function () {
    if (!this.canvas) return;

    var rect = this.canvas.getBoundingClientRect();
    var width = rect.width || window.innerWidth || 1;
    var height = rect.height || window.innerHeight || 1;

    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.cellSize = clamp(Math.floor(Math.min(this.width, this.height) / 9.4), 38, 82);

    this.camera.init = false;
    this.makeLightAssets();

    if (this.level) this.buildStatic();
  };

  /* ---------------------------------------------------------
     Static temple stonework, cached once per level/resize
     --------------------------------------------------------- */

  Game.prototype.buildStatic = function () {
    if (!this.level) return;

    var size = this.cellSize;
    var cols = this.level.cols;
    var rows = this.level.rows;
    var worldW = cols * size;
    var worldH = rows * size;
    var dpr = Math.min(this.dpr, 1.5);

    var canvas = this.staticCanvas || document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(worldW * dpr));
    canvas.height = Math.max(1, Math.round(worldH * dpr));

    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, worldW, worldH);
    g.fillStyle = '#070a07';
    g.fillRect(0, 0, worldW, worldH);

    var grid = this.level.grid;

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (grid[y][x] === 1) {
          this.paintWallTile(g, x * size, y * size, size, x, y);
        } else {
          this.paintFloorTile(g, x * size, y * size, size, x, y);
        }
      }
    }

    this.paintFloorShadows(g, size, cols, rows, grid);
    this.paintExitRunes(g, size);

    this.staticCanvas = canvas;
  };

  Game.prototype.paintWallTile = function (g, px, py, size, gx, gy) {
    var n = hash(gx, gy, 1);
    var n2 = hash(gx, gy, 2);
    var n3 = hash(gx, gy, 3);

    g.save();
    g.beginPath();
    g.rect(px, py, size, size);
    g.clip();

    var hue = 24 + n * 10;
    var sat = 12 + n2 * 9;
    var light = 12 + n * 6;
    g.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + light + '%)';
    g.fillRect(px, py, size, size);

    g.fillStyle = 'rgba(255, 224, 176,' + (0.018 + n2 * 0.02) + ')';
    g.fillRect(px, py, size, size * 0.12);

    var rowsOfBricks = 3;
    var brickH = size / rowsOfBricks;
    var line = Math.max(1, size * 0.022);

    g.strokeStyle = 'rgba(0, 0, 0, 0.38)';
    g.lineWidth = line;

    for (var r = 0; r < rowsOfBricks; r++) {
      var y = py + r * brickH;
      g.beginPath();
      g.moveTo(px, y);
      g.lineTo(px + size, y);
      g.stroke();

      var joints = r % 2 === 0 ? [0.5] : [0.28, 0.74];
      for (var j = 0; j < joints.length; j++) {
        g.beginPath();
        g.moveTo(px + size * joints[j], y);
        g.lineTo(px + size * joints[j], y + brickH);
        g.stroke();
      }

      g.fillStyle = 'rgba(255, 224, 176, 0.035)';
      g.fillRect(px + 1, y + line, size - 2, Math.max(1, size * 0.014));

      var shade = hash(gx, gy, 10 + r);
      if (shade > 0.55) {
        g.fillStyle = 'rgba(0, 0, 0,' + (0.04 + shade * 0.06) + ')';
        g.fillRect(px + (r % 2) * size * 0.4, y, size * 0.34, brickH);
      }
    }

    if (n3 > 0.68) {
      g.fillStyle = 'rgba(46, 112, 74, ' + (0.05 + n3 * 0.06) + ')';
      for (var m = 0; m < 3; m++) {
        var mx = px + hash(gx, gy, 30 + m) * size;
        var my = py + hash(gx, gy, 40 + m) * size;
        g.beginPath();
        g.ellipse(mx, my, size * (0.06 + hash(gx, gy, 50 + m) * 0.1), size * 0.045, 0, 0, Math.PI * 2);
        g.fill();
      }
    }

    if (n2 > 0.55) {
      g.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      g.lineWidth = Math.max(1, size * 0.012);
      g.beginPath();
      var crackX = px + n * size;
      var crackY = py + n3 * size;
      g.moveTo(crackX, crackY);
      g.lineTo(crackX + size * 0.08, crackY + size * 0.1);
      g.lineTo(crackX + size * 0.03, crackY + size * 0.2);
      g.stroke();
    }

    if (n < 0.055) {
      g.strokeStyle = 'rgba(245, 196, 81, 0.3)';
      g.lineWidth = Math.max(1, size * 0.012);
      g.beginPath();
      g.moveTo(px + size * 0.15, py + size * 0.75);
      g.lineTo(px + size * 0.32, py + size * 0.58);
      g.lineTo(px + size * 0.28, py + size * 0.4);
      g.lineTo(px + size * 0.42, py + size * 0.25);
      g.stroke();
    }

    if (n3 > 0.8) {
      g.strokeStyle = 'rgba(245, 196, 81, 0.12)';
      g.lineWidth = Math.max(1, size * 0.018);
      g.beginPath();
      g.moveTo(px + size * 0.5, py + size * 0.36);
      g.lineTo(px + size * 0.38, py + size * 0.52);
      g.lineTo(px + size * 0.56, py + size * 0.52);
      g.lineTo(px + size * 0.46, py + size * 0.66);
      g.stroke();

      if (n2 > 0.5) {
        g.beginPath();
        g.moveTo(px + size * 0.4, py + size * 0.44);
        g.lineTo(px + size * 0.6, py + size * 0.44);
        g.stroke();
      }
    }

    g.fillStyle = 'rgba(0, 0, 0, 0.18)';
    g.fillRect(px, py + size - line * 1.5, size, line * 1.5);

    g.restore();
  };

  Game.prototype.paintFloorTile = function (g, px, py, size, gx, gy) {
    var n = hash(gx, gy, 101);
    var n2 = hash(gx, gy, 102);
    var n3 = hash(gx, gy, 103);

    g.save();
    g.beginPath();
    g.rect(px, py, size, size);
    g.clip();

    g.fillStyle = 'hsl(' + (30 + n * 8) + ',' + (10 + n2 * 6) + '%,' + (7.5 + n * 3) + '%)';
    g.fillRect(px, py, size, size);

    var half = size / 2;
    g.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    g.lineWidth = Math.max(1, size * 0.018);
    g.beginPath();
    g.moveTo(px, py + half);
    g.lineTo(px + size, py + half);
    g.moveTo(px + half, py);
    g.lineTo(px + half, py + size);
    g.stroke();

    g.strokeStyle = 'rgba(255, 225, 180, 0.025)';
    g.lineWidth = Math.max(1, size * 0.008);
    g.beginPath();
    g.moveTo(px + 1, py + half + 1);
    g.lineTo(px + half - 1, py + half + 1);
    g.moveTo(px + half + 1, py + 1);
    g.lineTo(px + half + 1, py + half - 1);
    g.stroke();

    var flecks = 4 + Math.floor(n2 * 5);
    for (var i = 0; i < flecks; i++) {
      var fx = px + hash(gx, gy, 120 + i) * size;
      var fy = py + hash(gx, gy, 140 + i) * size;
      var fr = size * (0.006 + hash(gx, gy, 160 + i) * 0.013);
      g.fillStyle = hash(gx, gy, 180 + i) > 0.86
        ? 'rgba(245, 196, 81, 0.2)'
        : 'rgba(255, 230, 190, 0.05)';
      g.beginPath();
      g.arc(fx, fy, fr, 0, Math.PI * 2);
      g.fill();
    }

    if (n3 > 0.84) {
      g.strokeStyle = 'rgba(0, 0, 0, 0.36)';
      g.lineWidth = Math.max(1, size * 0.012);
      g.beginPath();
      var sx = px + n * size;
      var sy = py + n2 * size;
      g.moveTo(sx, sy);
      g.lineTo(sx + size * 0.09, sy + size * 0.06);
      g.lineTo(sx + size * 0.04, sy + size * 0.15);
      g.stroke();
    }

    if (n2 > 0.74) {
      g.fillStyle = 'rgba(46, 112, 74, 0.055)';
      g.beginPath();
      g.ellipse(px + hash(gx, gy, 200) * size, py + hash(gx, gy, 201) * size, size * 0.13, size * 0.08, n3 * 3, 0, Math.PI * 2);
      g.fill();
    }

    g.restore();
  };

  Game.prototype.paintFloorShadows = function (g, size, cols, rows, grid) {
    var dark = 'rgba(0, 0, 0, 0.34)';
    var clear = 'rgba(0, 0, 0, 0)';
    var depth = size * 0.3;

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (grid[y][x] !== 0) continue;
        var px = x * size;
        var py = y * size;
        var gradient;

        if (y > 0 && grid[y - 1][x] === 1) {
          gradient = g.createLinearGradient(0, py, 0, py + depth);
          gradient.addColorStop(0, dark);
          gradient.addColorStop(1, clear);
          g.fillStyle = gradient;
          g.fillRect(px, py, size, depth);
        }
        if (y < rows - 1 && grid[y + 1][x] === 1) {
          gradient = g.createLinearGradient(0, py + size, 0, py + size - depth);
          gradient.addColorStop(0, dark);
          gradient.addColorStop(1, clear);
          g.fillStyle = gradient;
          g.fillRect(px, py + size - depth, size, depth);
        }
        if (x > 0 && grid[y][x - 1] === 1) {
          gradient = g.createLinearGradient(px, 0, px + depth, 0);
          gradient.addColorStop(0, dark);
          gradient.addColorStop(1, clear);
          g.fillStyle = gradient;
          g.fillRect(px, py, depth, size);
        }
        if (x < cols - 1 && grid[y][x + 1] === 1) {
          gradient = g.createLinearGradient(px + size, 0, px + size - depth, 0);
          gradient.addColorStop(0, dark);
          gradient.addColorStop(1, clear);
          g.fillStyle = gradient;
          g.fillRect(px + size - depth, py, depth, size);
        }
      }
    }
  };

  Game.prototype.paintExitRunes = function (g, size) {
    var exit = this.level.exit;
    var cx = (exit.x + 0.5) * size;
    var cy = (exit.y + 0.5) * size;

    g.save();
    g.translate(cx, cy);
    g.strokeStyle = 'rgba(245, 196, 81, 0.18)';
    g.lineWidth = Math.max(1, size * 0.015);

    for (var r = 0; r < 2; r++) {
      g.beginPath();
      g.arc(0, 0, size * (0.3 + r * 0.07), 0, Math.PI * 2);
      g.stroke();
    }

    g.setLineDash([size * 0.05, size * 0.035]);
    g.strokeStyle = 'rgba(79, 227, 154, 0.13)';
    g.beginPath();
    g.arc(0, 0, size * 0.24, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);

    g.strokeStyle = 'rgba(245, 196, 81, 0.16)';
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(angle) * size * 0.34, Math.sin(angle) * size * 0.34);
      g.lineTo(Math.cos(angle) * size * 0.4, Math.sin(angle) * size * 0.4);
      g.stroke();
    }

    g.restore();
  };

  /* ---------------------------------------------------------
     Camera
     --------------------------------------------------------- */

  Game.prototype.updateCamera = function (dt) {
    if (!this.level || !this.player) return;

    var px = this.player.x * this.cellSize;
    var py = this.player.y * this.cellSize;
    var targetX = px;
    var targetY = py;

    if (this.state === 'menu') {
      targetX += Math.sin(this.time * 0.35) * this.cellSize * 0.9;
      targetY += Math.cos(this.time * 0.28) * this.cellSize * 0.55;
    }

    if (!this.camera.init) {
      this.camera.x = targetX;
      this.camera.y = targetY;
      this.camera.init = true;
      return;
    }

    var k = 1 - Math.exp(-Math.min(dt, 0.05) * 9);
    this.camera.x += (targetX - this.camera.x) * k;
    this.camera.y += (targetY - this.camera.y) * k;
  };

  /* ---------------------------------------------------------
     Frame
     --------------------------------------------------------- */

  Game.prototype.render = function () {
    var ctx = this.ctx;
    if (!ctx) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#040705';
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.level || !this.player) return;

    var size = this.cellSize;
    var worldW = this.level.cols * size;
    var worldH = this.level.rows * size;

    var baseX;
    var baseY;

    if (worldW <= this.width) {
      baseX = (this.width - worldW) / 2;
    } else {
      baseX = clamp(this.camera.x - this.width / 2, 0, worldW - this.width);
    }

    if (worldH <= this.height) {
      baseY = (this.height - worldH) / 2;
    } else {
      baseY = clamp(this.camera.y - this.height / 2, 0, worldH - this.height);
    }

    var shakeAmount = this.shake * size * 0.16;
    var shakeX = (Math.random() * 2 - 1) * shakeAmount;
    var shakeY = (Math.random() * 2 - 1) * shakeAmount;

    var viewX = baseX - shakeX;
    var viewY = baseY - shakeY;
    this.viewX = viewX;
    this.viewY = viewY;

    ctx.save();
    ctx.translate(-viewX, -viewY);

    if (this.staticCanvas) {
      ctx.drawImage(this.staticCanvas, 0, 0, worldW, worldH);
    }

    this.drawExit(ctx, this.time);
    this.drawSpikes(ctx, this.time);
    this.drawDoors(ctx, this.time);
    this.drawChests(ctx, this.time);
    this.drawItems(ctx, this.time);
    this.drawBoulders(ctx, this.time);
    this.drawPlayer(ctx, this.time);
    this.drawTorches(ctx, this.time);

    ctx.restore();

    this.drawLighting(ctx, viewX, viewY);
    this.drawParticles(ctx, viewX, viewY);
    this.drawFloaters(ctx, viewX, viewY);
  };

  /* ---------------------------------------------------------
     Lighting
     --------------------------------------------------------- */

  Game.prototype.drawLighting = function (ctx, viewX, viewY) {
    var scale = 0.55;
    var needW = Math.max(1, Math.ceil(this.width * scale));
    var needH = Math.max(1, Math.ceil(this.height * scale));

    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement('canvas');
    }

    if (this.lightCanvas.width !== needW || this.lightCanvas.height !== needH) {
      this.lightCanvas.width = needW;
      this.lightCanvas.height = needH;
    }

    var lctx = this.lightCanvas.getContext('2d');
    lctx.setTransform(scale, 0, 0, scale, 0, 0);
    lctx.clearRect(0, 0, this.width, this.height);
    lctx.fillStyle = 'rgba(3, 7, 5, 0.56)';
    lctx.fillRect(0, 0, this.width, this.height);

    lctx.globalCompositeOperation = 'destination-out';

    var size = this.cellSize;

    function cut(x, y, radius, alpha) {
      lctx.globalAlpha = alpha;
      lctx.drawImage(this.lightSprite, x - radius, y - radius, radius * 2, radius * 2);
    }

    var playerX = this.player.x * size - viewX;
    var playerY = this.player.y * size - viewY;
    var playerRadius = size * (3.15 + Math.sin(this.time * 2.1) * 0.06);
    cut.call(this, playerX, playerY, playerRadius, 0.95);

    for (var i = 0; i < this.level.torches.length; i++) {
      var torch = this.level.torches[i];
      var pos = this.torchWorldPos(torch, size);
      var flicker = Math.sin(this.time * 7 + torch.phase) * 0.1 +
        Math.sin(this.time * 13.7 + torch.phase * 2) * 0.05;
      cut.call(
        this,
        pos.x - viewX,
        pos.y - viewY + size * 0.05,
        size * (1.9 + flicker),
        0.62 + flicker * 0.6
      );
    }

    if (this.exitActive) {
      var ex = (this.level.exit.x + 0.5) * size - viewX;
      var ey = (this.level.exit.y + 0.5) * size - viewY;
      cut.call(this, ex, ey, size * (2.4 + Math.sin(this.time * 3) * 0.12), 0.75);
    }

    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.lightCanvas, 0, 0, this.width, this.height);
  };

  /* ---------------------------------------------------------
     Screen-space particles & floating text
     --------------------------------------------------------- */

  Game.prototype.drawParticles = function (ctx, viewX, viewY) {
    if (!this.particles.length) return;

    var size = this.cellSize;

    ctx.save();

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      if (p.glow && p.shape !== 'confetti') continue;
      var alpha = clamp(p.life / p.max, 0, 1);
      var sx = p.x * size - viewX;
      var sy = p.y * size - viewY;
      var radius = Math.max(1, p.size * size);

      ctx.globalAlpha = alpha * (p.shape === 'dust' ? 0.5 : 0.85);
      ctx.fillStyle = p.color;

      if (p.shape === 'confetti') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(alpha * 6 + i);
        ctx.fillRect(-radius * 0.5, -radius * 0.22, radius, radius * 0.44);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'lighter';

    for (var j = 0; j < this.particles.length; j++) {
      var spark = this.particles[j];
      if (!spark.glow || spark.shape === 'confetti') continue;
      var a = clamp(spark.life / spark.max, 0, 1);
      var x = spark.x * size - viewX;
      var y = spark.y * size - viewY;
      var r = Math.max(1, spark.size * size);

      ctx.globalAlpha = a;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = a * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  };

  Game.prototype.drawFloaters = function (ctx, viewX, viewY) {
    if (!this.floaters.length) return;

    var size = this.cellSize;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    for (var i = 0; i < this.floaters.length; i++) {
      var f = this.floaters[i];
      var alpha = clamp(f.life / f.max, 0, 1);
      if (alpha <= 0.01) continue;

      var x = f.x * size - viewX;
      var y = f.y * size - viewY;
      var fontSize = Math.round(clamp(size * 0.23 * f.scale, 10, 22));

      ctx.globalAlpha = Math.min(1, alpha * 1.5);
      ctx.font = '800 ' + fontSize + 'px "Avenir Next", Avenir, system-ui, sans-serif';
      ctx.lineWidth = Math.max(2, fontSize * 0.22);
      ctx.strokeStyle = 'rgba(4, 9, 6, 0.88)';
      ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  };

  /* ---------------------------------------------------------
     Small shared drawing helpers used by entity art
     --------------------------------------------------------- */

  Game.prototype.roundRect = roundRect;
  Game.prototype.clamp = clamp;

  window.TreasureRender = {
    hash: hash,
    roundRect: roundRect,
    clamp: clamp
  };
})();
