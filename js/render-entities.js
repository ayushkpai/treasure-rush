/* =========================================================
   TREASURE RUSH — entity art: torches, gate, traps, loot,
   chests, boulders and the explorer.
   ========================================================= */

(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function flamePath(ctx, width, height) {
    ctx.beginPath();
    ctx.moveTo(0, -height);
    ctx.bezierCurveTo(width, -height * 0.32, width * 0.85, height * 0.24, 0, height * 0.3);
    ctx.bezierCurveTo(-width * 0.85, height * 0.24, -width, -height * 0.32, 0, -height);
    ctx.closePath();
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

  Game.prototype.torchWorldPos = function (torch, size) {
    return {
      x: (torch.x + 0.5) * size + torch.dirX * size * 0.33,
      y: (torch.y + 0.5) * size + torch.dirY * size * 0.33
    };
  };

  /* ---------------------------------------------------------
     Torches
     --------------------------------------------------------- */

  Game.prototype.drawTorches = function (ctx, time) {
    var size = this.cellSize;

    for (var i = 0; i < this.level.torches.length; i++) {
      var torch = this.level.torches[i];
      var pos = this.torchWorldPos(torch, size);
      var phase = torch.phase;
      var sway = Math.sin(time * 8.4 + phase) * size * 0.025;
      var flicker = 0.5 + 0.5 * Math.sin(time * 9.1 + phase * 1.7);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22 + flicker * 0.16;
      ctx.drawImage(this.glowGold, pos.x - size * 0.8, pos.y - size * 0.9, size * 1.6, size * 1.6);
      ctx.restore();

      ctx.save();
      ctx.translate(pos.x, pos.y);

      ctx.strokeStyle = '#181310';
      ctx.lineWidth = Math.max(1.5, size * 0.035);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, size * 0.16);
      ctx.lineTo(0, -size * 0.02);
      ctx.stroke();

      ctx.fillStyle = '#2c2118';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.075, size * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(245, 196, 81, 0.4)';
      ctx.lineWidth = Math.max(1, size * 0.012);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.005, size * 0.06, size * 0.035, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.translate(sway, -size * 0.03);

      ctx.fillStyle = 'rgba(240, 102, 26, 0.9)';
      flamePath(ctx, size * 0.105, size * (0.19 + flicker * 0.045));
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 190, 64, 0.95)';
      flamePath(ctx, size * 0.07, size * (0.14 + flicker * 0.035));
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 246, 216, 0.95)';
      flamePath(ctx, size * 0.032, size * 0.08);
      ctx.fill();

      for (var e = 0; e < 3; e++) {
        var rise = (time * (0.45 + e * 0.12) + phase * 0.2 + e * 0.41) % 1;
        var ex = Math.sin(time * 3 + phase + e * 2.1) * size * 0.05;
        var ey = -size * 0.16 - rise * size * 0.4;
        ctx.globalAlpha = (1 - rise) * 0.5;
        ctx.fillStyle = e === 1 ? '#9ef0c0' : '#ffd75f';
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(0.8, size * 0.011), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  };

  /* ---------------------------------------------------------
     Escape gate
     --------------------------------------------------------- */

  Game.prototype.drawExit = function (ctx, time) {
    var size = this.cellSize;
    var exit = this.level.exit;
    var cx = (exit.x + 0.5) * size;
    var cy = (exit.y + 0.5) * size;
    var active = this.exitActive;
    var pulse = 0.5 + 0.5 * Math.sin(time * 3.2);

    ctx.save();
    ctx.translate(cx, cy);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = active ? 0.45 + pulse * 0.22 : 0.1;
    ctx.drawImage(
      active ? this.glowEmerald : this.glowGold,
      -size * 0.85, -size * 0.85, size * 1.7, size * 1.7
    );
    ctx.restore();

    var radius = size * 0.38;

    ctx.lineWidth = Math.max(2, size * 0.075);
    ctx.strokeStyle = '#3c3125';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(1, size * 0.018);
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    for (var s = 0; s < 12; s++) {
      var a = (s / 12) * Math.PI * 2 + time * 0.12;
      var inner = radius * 0.9;
      var outer = radius * 1.03;
      ctx.strokeStyle = s % 3 === 0 ? 'rgba(245, 196, 81, 0.55)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = Math.max(1, size * (s % 3 === 0 ? 0.028 : 0.014));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }

    var innerRadius = radius * 0.82;
    var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
    if (active) {
      gradient.addColorStop(0, 'rgba(224, 255, 235, 0.95)');
      gradient.addColorStop(0.18, 'rgba(79, 227, 154, 0.82)');
      gradient.addColorStop(0.62, 'rgba(22, 118, 77, 0.72)');
      gradient.addColorStop(1, 'rgba(5, 25, 16, 0.92)');
    } else {
      gradient.addColorStop(0, 'rgba(22, 40, 30, 0.9)');
      gradient.addColorStop(1, 'rgba(4, 10, 7, 0.95)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    if (active) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      for (var i = 0; i < 3; i++) {
        ctx.strokeStyle = 'rgba(190, 255, 217, ' + (0.3 - i * 0.06) + ')';
        ctx.lineWidth = Math.max(1, size * 0.028);
        ctx.beginPath();
        var start = time * (1.2 + i * 0.4) + i * 2.1;
        ctx.arc(0, 0, innerRadius * (0.24 + i * 0.19), start, start + Math.PI * 1.05);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 240, 190, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(245, 196, 81, 0.16)';
      ctx.lineWidth = Math.max(1, size * 0.016);
      ctx.beginPath();
      ctx.moveTo(-innerRadius * 0.32, -innerRadius * 0.3);
      ctx.lineTo(innerRadius * 0.32, innerRadius * 0.32);
      ctx.moveTo(innerRadius * 0.32, -innerRadius * 0.3);
      ctx.lineTo(-innerRadius * 0.32, innerRadius * 0.32);
      ctx.stroke();
    }

    ctx.restore();
  };

  /* ---------------------------------------------------------
     Spike traps
     --------------------------------------------------------- */

  Game.prototype.drawSpikes = function (ctx, time) {
    var size = this.cellSize;

    for (var i = 0; i < this.level.spikes.length; i++) {
      var spike = this.level.spikes[i];
      var cx = (spike.x + 0.5) * size;
      var cy = (spike.y + 0.5) * size;
      var ext = spike.ext;

      ctx.save();
      ctx.translate(cx, cy);

      ctx.fillStyle = 'rgba(6, 9, 7, 0.42)';
      roundRect(ctx, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8, size * 0.08);
      ctx.fill();

      ctx.fillStyle = '#1c1915';
      roundRect(ctx, -size * 0.38, -size * 0.38, size * 0.76, size * 0.76, size * 0.06);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 220, 170, 0.09)';
      ctx.lineWidth = Math.max(1, size * 0.012);
      ctx.stroke();

      var bolts = [
        [-0.29, -0.29], [0.29, -0.29], [-0.29, 0.29], [0.29, 0.29]
      ];
      for (var b = 0; b < bolts.length; b++) {
        ctx.fillStyle = 'rgba(120, 108, 90, 0.5)';
        ctx.beginPath();
        ctx.arc(bolts[b][0] * size, bolts[b][1] * size, size * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }

      if (spike.warn && ext < 0.6) {
        var warnPulse = 0.5 + 0.5 * Math.sin(time * 16 + spike.offset);
        ctx.strokeStyle = 'rgba(255, 170, 70, ' + (0.22 + warnPulse * 0.35) + ')';
        ctx.lineWidth = Math.max(1.5, size * 0.025);
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(-size * 0.34, -size * 0.34, size * 0.68, size * 0.68, size * 0.05)
          : roundRect(ctx, -size * 0.34, -size * 0.34, size * 0.68, size * 0.68, size * 0.05);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 190, 80, ' + (0.16 + warnPulse * 0.18) + ')';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      if (ext > 0.4) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (ext - 0.4) * 0.22;
        ctx.fillStyle = '#ff9b5f';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      var offsets = [
        [-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]
      ];

      for (var s = 0; s < offsets.length; s++) {
        var sx = offsets[s][0] * size;
        var sy = offsets[s][1] * size;
        var rise = ext * size * 0.3;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + size * 0.07, size * 0.075, size * 0.026, 0, 0, Math.PI * 2);
        ctx.fill();

        var grad = ctx.createLinearGradient(sx, sy - rise, sx, sy + size * 0.05);
        grad.addColorStop(0, '#e8eee6');
        grad.addColorStop(0.45, '#a8b1a8');
        grad.addColorStop(1, '#565d56');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(sx - size * 0.07, sy + size * 0.06);
        ctx.lineTo(sx - size * 0.012, sy - size * 0.02 - rise);
        ctx.lineTo(sx + size * 0.012, sy - size * 0.02 - rise);
        ctx.lineTo(sx + size * 0.07, sy + size * 0.06);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(20, 24, 20, 0.6)';
        ctx.lineWidth = Math.max(1, size * 0.012);
        ctx.stroke();

        if (rise > size * 0.08) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = Math.max(1, size * 0.01);
          ctx.beginPath();
          ctx.moveTo(sx, sy - size * 0.015 - rise);
          ctx.lineTo(sx, sy + size * 0.04);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  };

  /* ---------------------------------------------------------
     Locked gate
     --------------------------------------------------------- */

  Game.prototype.drawDoors = function (ctx, time) {
    var size = this.cellSize;

    for (var i = 0; i < this.level.doors.length; i++) {
      var door = this.level.doors[i];
      var open = clamp(door.anim, 0, 1);
      var shake = door.shake > 0 ? Math.sin(time * 46) * door.shake * size * 0.04 : 0;
      var cx = (door.x + 0.5) * size;
      var cy = (door.y + 0.5) * size;

      ctx.save();
      ctx.translate(cx + shake, cy);

      var half = size * 0.5;
      var postW = size * 0.11;

      ctx.fillStyle = '#2c241c';
      ctx.fillRect(-half, -half, postW, size);
      ctx.fillRect(half - postW, -half, postW, size);
      ctx.fillStyle = 'rgba(255, 220, 160, 0.07)';
      ctx.fillRect(-half, -half, postW, size * 0.04);
      ctx.fillRect(half - postW, -half, postW, size * 0.04);

      ctx.fillStyle = '#342a20';
      ctx.fillRect(-half, -half, size, size * 0.1);

      ctx.strokeStyle = 'rgba(245, 196, 81, 0.2)';
      ctx.lineWidth = Math.max(1, size * 0.014);
      ctx.beginPath();
      ctx.moveTo(-half + postW, -half + size * 0.014);
      ctx.lineTo(half - postW, -half + size * 0.014);
      ctx.stroke();

      if (open < 0.99) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-half + postW, -half + size * 0.08, size - postW * 2, size * 0.86);
        ctx.clip();

        var lift = open * size * 0.82;
        ctx.translate(0, -lift);
        ctx.globalAlpha = 1 - open * 0.72;

        ctx.strokeStyle = 'rgba(120, 94, 46, 0.7)';
        ctx.lineWidth = Math.max(2, size * 0.045);
        for (var bar = 0; bar < 4; bar++) {
          var bx = -size * 0.3 + bar * size * 0.2;
          var grad = ctx.createLinearGradient(bx, -size * 0.32, bx, size * 0.38);
          grad.addColorStop(0, '#d9c08a');
          grad.addColorStop(0.5, '#8d7648');
          grad.addColorStop(1, '#4c3d22');
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(bx, -size * 0.32);
          ctx.lineTo(bx, size * 0.38);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(200, 172, 112, 0.5)';
        ctx.lineWidth = Math.max(2, size * 0.035);
        ctx.beginPath();
        ctx.moveTo(-size * 0.34, -size * 0.2);
        ctx.lineTo(size * 0.34, -size * 0.2);
        ctx.moveTo(-size * 0.34, size * 0.24);
        ctx.lineTo(size * 0.34, size * 0.24);
        ctx.stroke();

        if (open < 0.5) {
          ctx.globalAlpha = 1 - open * 2;
          var lockR = size * 0.1;
          ctx.fillStyle = '#f0c04e';
          ctx.beginPath();
          ctx.arc(0, 0, lockR, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(80, 50, 10, 0.65)';
          ctx.lineWidth = Math.max(1, size * 0.018);
          ctx.stroke();

          ctx.fillStyle = '#3b2608';
          ctx.beginPath();
          ctx.arc(0, -lockR * 0.12, lockR * 0.22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-lockR * 0.07, -lockR * 0.05, lockR * 0.14, lockR * 0.45);
        }

        ctx.restore();
      }

      if (open > 0.5) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (open - 0.5) * 0.24;
        ctx.drawImage(this.glowGold, -size * 0.55, -size * 0.55, size * 1.1, size * 1.1);
        ctx.restore();
      }

      ctx.restore();
    }
  };

  /* ---------------------------------------------------------
     Treasure chests
     --------------------------------------------------------- */

  Game.prototype.drawChests = function (ctx, time) {
    var size = this.cellSize;

    for (var i = 0; i < this.level.chests.length; i++) {
      var chest = this.level.chests[i];
      var open = chest.anim;
      var cx = (chest.x + 0.5) * size;
      var cy = (chest.y + 0.5) * size;
      var w = size * 0.62;
      var h = size * 0.4;
      var shine = 0.5 + 0.5 * Math.sin(time * 2.6 + chest.phase);

      ctx.save();
      ctx.translate(cx, cy);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.72, w * 0.55, size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      if (open > 0.15) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.28 + open * 0.35 + shine * 0.08;
        ctx.drawImage(this.glowGold, -size * 0.55, -size * 0.75, size * 1.1, size * 1.1);
        ctx.restore();

        for (var ray = 0; ray < 4; ray++) {
          var angle = -Math.PI * 0.8 + ray * 0.5;
          ctx.save();
          ctx.rotate(angle);
          ctx.globalAlpha = open * 0.18;
          ctx.fillStyle = '#ffe9a8';
          ctx.beginPath();
          ctx.moveTo(-size * 0.03, 0);
          ctx.lineTo(size * 0.03, 0);
          ctx.lineTo(0, -size * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.1 + shine * 0.08;
        ctx.drawImage(this.glowGold, -size * 0.46, -size * 0.5, size * 0.92, size * 0.92);
        ctx.restore();
      }

      var lidAngle = open * 1.02;
      ctx.save();
      ctx.translate(0, -h * 0.08);
      ctx.rotate(-lidAngle);

      var lidGrad = ctx.createLinearGradient(0, -h * 0.72, 0, 0);
      lidGrad.addColorStop(0, '#c8913c');
      lidGrad.addColorStop(0.45, '#8f5d25');
      lidGrad.addColorStop(1, '#5a3614');
      ctx.fillStyle = lidGrad;
      roundRect(ctx, -w / 2, -h * 0.72, w, h * 0.78, size * 0.06);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 17, 6, 0.65)';
      ctx.lineWidth = Math.max(1, size * 0.015);
      ctx.stroke();

      ctx.fillStyle = '#e3b34f';
      ctx.fillRect(-w * 0.31, -h * 0.72, w * 0.09, h * 0.78);
      ctx.fillRect(w * 0.22, -h * 0.72, w * 0.09, h * 0.78);

      ctx.fillStyle = '#f6d078';
      roundRect(ctx, -w * 0.13, -h * 0.3, w * 0.26, h * 0.22, size * 0.02);
      ctx.fill();
      ctx.fillStyle = '#40270b';
      ctx.beginPath();
      ctx.arc(0, -h * 0.22, size * 0.018, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-size * 0.007, -h * 0.2, size * 0.014, h * 0.08);

      ctx.restore();

      var bodyGrad = ctx.createLinearGradient(0, -h * 0.1, 0, h * 0.62);
      bodyGrad.addColorStop(0, '#a86d2c');
      bodyGrad.addColorStop(0.55, '#7b4a1d');
      bodyGrad.addColorStop(1, '#4b2b10');
      ctx.fillStyle = bodyGrad;
      roundRect(ctx, -w / 2, -h * 0.06, w, h * 0.68, size * 0.05);
      ctx.fill();
      ctx.strokeStyle = 'rgba(27, 15, 5, 0.7)';
      ctx.lineWidth = Math.max(1, size * 0.016);
      ctx.stroke();

      ctx.fillStyle = '#d5a342';
      ctx.fillRect(-w * 0.31, -h * 0.06, w * 0.09, h * 0.68);
      ctx.fillRect(w * 0.22, -h * 0.06, w * 0.09, h * 0.68);

      if (open > 0.3) {
        ctx.fillStyle = 'rgba(255, 228, 150, ' + (open * 0.9) + ')';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.08, w * 0.3, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        for (var c = 0; c < 3; c++) {
          var coinX = (c - 1) * w * 0.17;
          var coinY = h * 0.04 + Math.sin(time * 3 + c) * size * 0.01;
          ctx.fillStyle = '#ffe9a8';
          ctx.beginPath();
          ctx.arc(coinX, coinY, size * 0.026, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = '#f2c759';
      roundRect(ctx, -w * 0.12, h * 0.16, w * 0.24, h * 0.2, size * 0.02);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70, 42, 8, 0.6)';
      ctx.lineWidth = Math.max(1, size * 0.012);
      ctx.stroke();
      ctx.fillStyle = '#412608';
      ctx.beginPath();
      ctx.arc(0, h * 0.22, size * 0.017, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-size * 0.006, h * 0.24, size * 0.012, h * 0.06);

      ctx.restore();
    }
  };

  /* ---------------------------------------------------------
     Loot
     --------------------------------------------------------- */

  Game.prototype.drawItems = function (ctx, time) {
    var size = this.cellSize;

    for (var i = 0; i < this.level.coins.length; i++) {
      if (!this.level.coins[i].taken) this.drawCoin(ctx, this.level.coins[i], time, size);
    }
    for (var g = 0; g < this.level.gems.length; g++) {
      if (!this.level.gems[g].taken) this.drawGem(ctx, this.level.gems[g], time, size);
    }
    for (var k = 0; k < this.level.keys.length; k++) {
      if (!this.level.keys[k].taken) this.drawKey(ctx, this.level.keys[k], time, size);
    }
  };

  Game.prototype.drawCoin = function (ctx, coin, time, size) {
    var cx = (coin.x + 0.5) * size;
    var cy = (coin.y + 0.5) * size;
    var bob = Math.sin(time * 2.7 + coin.phase) * size * 0.028;
    var r = size * 0.155;
    var spin = Math.max(0.24, Math.abs(Math.cos(time * 2.2 + coin.phase)));

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.2, size * 0.11, size * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.24 + 0.1 * Math.sin(time * 3 + coin.phase);
    ctx.drawImage(this.glowGold, cx - r * 2.1, cy + bob - r * 2.1, r * 4.2, r * 4.2);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.scale(spin, 1);

    var grad = ctx.createRadialGradient(-r * 0.34, -r * 0.34, r * 0.08, 0, 0, r);
    grad.addColorStop(0, '#fff8d6');
    grad.addColorStop(0.35, '#f9d977');
    grad.addColorStop(0.8, '#d9a334');
    grad.addColorStop(1, '#926016');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(110, 68, 8, 0.8)';
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(130, 82, 10, 0.55)';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.32, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  Game.prototype.drawGem = function (ctx, gem, time, size) {
    var cx = (gem.x + 0.5) * size;
    var cy = (gem.y + 0.5) * size;
    var bob = Math.sin(time * 2.1 + gem.phase) * size * 0.035;
    var r = size * 0.185;
    var pulse = 0.5 + 0.5 * Math.sin(time * 3.4 + gem.phase);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.22, size * 0.12, size * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy + bob);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 + pulse * 0.12;
    ctx.fillStyle = gem.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2, r * 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    var grad = ctx.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, gem.color);
    grad.addColorStop(1, 'rgba(10, 30, 20, 0.92)');

    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(5, 20, 12, 0.7)';
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.78, -r * 0.28);
    ctx.lineTo(0, r * 0.9);
    ctx.lineTo(-r * 0.78, -r * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(-r * 0.78, -r * 0.28);
    ctx.lineTo(0, 0);
    ctx.lineTo(r * 0.78, -r * 0.28);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, r * 0.9);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.35 + pulse * 0.45) + ')';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.45, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    if (pulse > 0.55) {
      var sparkleAlpha = (pulse - 0.55) * 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + sparkleAlpha + ')';
      ctx.lineWidth = Math.max(1, size * 0.012);
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 0.85);
      ctx.lineTo(r * 0.7, -r * 0.35);
      ctx.moveTo(r * 0.45, -r * 0.6);
      ctx.lineTo(r * 0.95, -r * 0.6);
      ctx.stroke();
    }

    ctx.restore();
  };

  Game.prototype.drawKey = function (ctx, key, time, size) {
    var cx = (key.x + 0.5) * size;
    var cy = (key.y + 0.5) * size;
    var bob = Math.sin(time * 2.6 + key.phase) * size * 0.04;
    var r = size * 0.16;
    var tilt = Math.sin(time * 1.8 + key.phase) * 0.16;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.23, size * 0.12, size * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(this.glowGold, cx - size * 0.38, cy + bob - size * 0.38, size * 0.76, size * 0.76);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(-0.55 + tilt);

    ctx.strokeStyle = '#f6d078';
    ctx.lineWidth = Math.max(2, size * 0.042);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(-r * 0.95, 0, r * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#c9942f';
    ctx.beginPath();
    ctx.arc(-r * 0.95, 0, r * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f6d078';
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, 0);
    ctx.lineTo(r * 1.4, 0);
    ctx.moveTo(r * 0.7, 0);
    ctx.lineTo(r * 0.7, r * 0.5);
    ctx.moveTo(r * 1.15, 0);
    ctx.lineTo(r * 1.15, r * 0.42);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(110, 68, 8, 0.55)';
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, size * 0.028);
    ctx.lineTo(r * 1.4, size * 0.028);
    ctx.stroke();

    ctx.restore();
  };

  /* ---------------------------------------------------------
     Boulders
     --------------------------------------------------------- */

  Game.prototype.drawBoulders = function (ctx, time) {
    var size = this.cellSize;

    for (var i = 0; i < this.level.boulders.length; i++) {
      var b = this.level.boulders[i];
      var cx = b.x * size;
      var cy = b.y * size;
      var r = size * 0.33;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.82, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(b.angle);

      var grad = ctx.createRadialGradient(-r * 0.32, -r * 0.4, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#9a8b74');
      grad.addColorStop(0.38, '#6e6150');
      grad.addColorStop(0.75, '#493f33');
      grad.addColorStop(1, '#2b251d');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(20, 16, 12, 0.7)';
      ctx.lineWidth = Math.max(1.5, size * 0.022);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(20, 16, 12, 0.55)';
      ctx.lineWidth = Math.max(1, size * 0.014);
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.1);
      ctx.lineTo(-r * 0.15, r * 0.05);
      ctx.lineTo(-r * 0.05, r * 0.42);
      ctx.moveTo(r * 0.2, -r * 0.5);
      ctx.lineTo(r * 0.05, -r * 0.1);
      ctx.lineTo(r * 0.5, r * 0.16);
      ctx.moveTo(r * 0.36, -r * 0.52);
      ctx.lineTo(r * 0.6, -r * 0.32);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(220, 205, 175, 0.22)';
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, Math.PI * 1.05, Math.PI * 1.55);
      ctx.stroke();

      ctx.fillStyle = 'rgba(46, 112, 74, 0.18)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.45, r * 0.3, r * 0.22, r * 0.12, 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  };

  /* ---------------------------------------------------------
     The explorer
     --------------------------------------------------------- */

  Game.prototype.drawPlayer = function (ctx, time) {
    var p = this.player;
    if (!p) return;

    var size = this.cellSize;
    var u = size / 64;
    var flip = p.face === 'left' ? -1 : 1;
    var moving = p.moving;
    var walk = moving ? Math.sin(p.walkTime * Math.PI * 2 * 2.1) : 0;
    var bob = moving
      ? Math.abs(Math.sin(p.walkTime * Math.PI * 2 * 2.1)) * size * 0.025
      : Math.sin(time * 2.3) * size * 0.012;

    var bumpOffset = p.bumpT * p.bumpT * size * 0.09;
    var cx = p.x * size + p.bumpDir.x * bumpOffset;
    var cy = p.y * size + p.bumpDir.y * bumpOffset;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.32, size * 0.2, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();

    if (this.invincible > 0 && Math.floor(time * 14) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    if (this.dying > 0) {
      ctx.globalAlpha *= 0.6 + 0.4 * Math.abs(Math.sin(time * 12));
    }

    ctx.translate(cx, cy + bob);
    ctx.scale(flip, 1);

    var skin = '#e2b183';
    var jacket = '#8a5a34';
    var jacketDark = '#67401f';
    var trouser = '#473a2c';
    var boot = '#3a2614';
    var scarf = '#b8442f';
    var hat = '#c9a15e';
    var hatDark = '#9d7740';
    var outline = 'rgba(28, 16, 6, 0.55)';

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    function leg(side, swing) {
      ctx.save();
      ctx.translate(side * 6.5 * u, 10 * u);
      ctx.rotate(swing * 0.5);
      ctx.fillStyle = trouser;
      roundRect(ctx, -3.4 * u, 0, 6.8 * u, 15 * u, 3 * u);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.4 * u;
      ctx.stroke();

      ctx.fillStyle = boot;
      roundRect(ctx, -4 * u, 13 * u, 8 * u, 6.5 * u, 2.4 * u);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.stroke();
      ctx.restore();
    }

    function arm(side, swing) {
      ctx.save();
      ctx.translate(side * 11 * u, 0);
      ctx.rotate(swing * 0.4);
      ctx.fillStyle = jacket;

      if (side < 0) {
        roundRect(ctx, -2.6 * u, 0, 5.2 * u, 12 * u, 2.6 * u);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.4 * u;
        ctx.stroke();
      } else {
        roundRect(ctx, -2.6 * u, 0, 5.2 * u, 11 * u, 2.6 * u);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.4 * u;
        ctx.stroke();

        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, 12 * u, 2.7 * u, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    leg(-1, walk);
    leg(1, -walk);

    arm(-1, -walk * 0.7);
    arm(1, walk * 0.7);

    var bodyGrad = ctx.createLinearGradient(0, -10 * u, 0, 20 * u);
    bodyGrad.addColorStop(0, jacket);
    bodyGrad.addColorStop(1, jacketDark);
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, -11.5 * u, -9 * u, 23 * u, 25 * u, 6 * u);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6 * u;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 225, 180, 0.12)';
    roundRect(ctx, -8 * u, -7 * u, 7 * u, 18 * u, 3.5 * u);
    ctx.fill();

    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(-11.5 * u, 9 * u, 23 * u, 4 * u);

    ctx.fillStyle = '#f0c04e';
    roundRect(ctx, -3 * u, 9.4 * u, 6 * u, 3.2 * u, 1 * u);
    ctx.fill();

    ctx.fillStyle = '#67401f';
    roundRect(ctx, -14 * u, -2 * u, 6 * u, 11 * u, 2.4 * u);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2 * u;
    ctx.stroke();

    ctx.fillStyle = '#f0c04e';
    ctx.beginPath();
    ctx.arc(-11 * u, 3.5 * u, 1.5 * u, 0, Math.PI * 2);
    ctx.fill();

    if (p.face !== 'up') {
      ctx.fillStyle = scarf;
      ctx.beginPath();
      ctx.moveTo(-8 * u, -10.5 * u);
      ctx.quadraticCurveTo(-18 * u + Math.sin(time * 7) * 2 * u, -6 * u, -15 * u + Math.sin(time * 6) * 2 * u, 2 * u);
      ctx.lineTo(-9 * u, -1 * u);
      ctx.quadraticCurveTo(-11 * u, -6 * u, -6 * u, -8 * u);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -17 * u, 9.4 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4 * u;
    ctx.stroke();

    ctx.fillStyle = 'rgba(120, 72, 40, 0.65)';
    ctx.beginPath();
    ctx.arc(0, -19 * u, 8.6 * u, Math.PI * 0.05, Math.PI * 0.95);
    ctx.fill();

    if (p.face === 'up') {
      ctx.fillStyle = '#3b2a1e';
      roundRect(ctx, -5 * u, -21 * u, 10 * u, 5 * u, 2 * u);
      ctx.fill();
    } else {
      ctx.fillStyle = '#2e1c10';
      var eyeShift = p.face === 'left' ? -1.4 * u : p.face === 'right' ? 1.4 * u : 0;
      ctx.beginPath();
      ctx.arc(-3.2 * u + eyeShift, -16.5 * u, 1.15 * u, 0, Math.PI * 2);
      ctx.arc(3.2 * u + eyeShift, -16.5 * u, 1.15 * u, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(120, 62, 36, 0.7)';
      ctx.lineWidth = 1 * u;
      ctx.beginPath();
      ctx.arc(0, -12.5 * u, 2.4 * u, 0.22 * Math.PI, 0.78 * Math.PI);
      ctx.stroke();
    }

    ctx.fillStyle = scarf;
    roundRect(ctx, -9.5 * u, -11.5 * u, 19 * u, 4.4 * u, 2 * u);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2 * u;
    ctx.stroke();

    ctx.fillStyle = hatDark;
    ctx.beginPath();
    ctx.ellipse(0, -24 * u, 17.5 * u, 5 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4 * u;
    ctx.stroke();

    var hatGrad = ctx.createLinearGradient(0, -35 * u, 0, -22 * u);
    hatGrad.addColorStop(0, '#e0bd7c');
    hatGrad.addColorStop(1, hatDark);
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(-10.5 * u, -24 * u);
    ctx.quadraticCurveTo(-12 * u, -35 * u, -5 * u, -35.5 * u);
    ctx.quadraticCurveTo(0, -36.5 * u, 5 * u, -35.5 * u);
    ctx.quadraticCurveTo(12 * u, -35 * u, 10.5 * u, -24 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4 * u;
    ctx.stroke();

    ctx.fillStyle = '#5a3a1c';
    ctx.fillRect(-10.3 * u, -28.5 * u, 20.6 * u, 3.1 * u);

    ctx.fillStyle = '#f0c04e';
    roundRect(ctx, -11.3 * u, -25.6 * u, 5.2 * u, 2.1 * u, 1 * u);
    ctx.fill();

    ctx.fillStyle = '#f0c04e';
    ctx.beginPath();
    ctx.moveTo(11 * u, 4 * u);
    ctx.lineTo(17 * u, 6 * u);
    ctx.lineTo(15 * u, 12 * u);
    ctx.lineTo(10 * u, 10 * u);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(60, 40, 10, 0.6)';
    ctx.lineWidth = 1 * u;
    ctx.stroke();

    ctx.restore();

    ctx.save();
    var lanternX = cx + flip * size * 0.26;
    var lanternY = cy + size * 0.1 + Math.sin(time * 3) * size * 0.01;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.34 + Math.sin(time * 5.3) * 0.05;
    ctx.drawImage(this.glowGold, lanternX - size * 0.55, lanternY - size * 0.55, size * 1.1, size * 1.1);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(lanternX, lanternY, size * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
})();
