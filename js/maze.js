/* =========================================================
   TREASURE RUSH — maze generation & level layout
   Classic script (no build step). Exposes window.TreasureMaze.
   ========================================================= */

(function () {
  'use strict';

  var LEVELS = [
    {
      name: 'Sunken Halls',
      cols: 15,
      rows: 13,
      chests: 1,
      coins: 16,
      gems: 4,
      spikes: 5,
      boulders: 1,
      boulderSpeed: 1.22,
      moveTime: 0.145,
      timer: 60,
      spikePeriod: 2.9,
      spikeActive: 0.8,
      spikeWarn: 0.45
    }
  ];

  var DIRS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  var GEM_COLORS = ['#5ff0a8', '#65d8ff', '#ff7bd5', '#ffd75f', '#b48cff', '#ff9c62'];

  function key(x, y) {
    return x + ',' + y;
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function makeGrid(cols, rows, fill) {
    var grid = [];
    for (var y = 0; y < rows; y++) {
      var row = [];
      for (var x = 0; x < cols; x++) row.push(fill);
      grid.push(row);
    }
    return grid;
  }

  function isFloor(grid, x, y) {
    return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length && grid[y][x] === 0;
  }

  function floorNeighbors(grid, x, y) {
    var out = [];
    for (var i = 0; i < DIRS.length; i++) {
      var nx = x + DIRS[i].x;
      var ny = y + DIRS[i].y;
      if (isFloor(grid, nx, ny)) out.push({ x: nx, y: ny });
    }
    return out;
  }

  /* Depth-first backtracker on an odd grid: 1 = stone, 0 = floor. */
  function generateMaze(cols, rows) {
    var grid = makeGrid(cols, rows, 1);
    var stack = [{ x: 1, y: 1 }];
    grid[1][1] = 0;

    while (stack.length) {
      var cur = stack[stack.length - 1];
      var options = [];

      for (var i = 0; i < DIRS.length; i++) {
        var nx = cur.x + DIRS[i].x * 2;
        var ny = cur.y + DIRS[i].y * 2;
        if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && grid[ny][nx] === 1) {
          options.push({ x: nx, y: ny, wx: cur.x + DIRS[i].x, wy: cur.y + DIRS[i].y });
        }
      }

      if (!options.length) {
        stack.pop();
        continue;
      }

      var pick = options[Math.floor(Math.random() * options.length)];
      grid[pick.wy][pick.wx] = 0;
      grid[pick.y][pick.x] = 0;
      stack.push({ x: pick.x, y: pick.y });
    }

    /* Punch a few loops into the maze so corridors fork and flow. */
    var wallCandidates = [];
    for (var y = 1; y < rows - 1; y++) {
      for (var x = 1; x < cols - 1; x++) {
        if (grid[y][x] !== 1) continue;
        var horiz = isFloor(grid, x - 1, y) && isFloor(grid, x + 1, y) && !isFloor(grid, x, y - 1) && !isFloor(grid, x, y + 1);
        var vert = isFloor(grid, x, y - 1) && isFloor(grid, x, y + 1) && !isFloor(grid, x - 1, y) && !isFloor(grid, x + 1, y);
        if (horiz || vert) wallCandidates.push({ x: x, y: y });
      }
    }

    shuffle(wallCandidates);
    var loops = Math.min(wallCandidates.length, Math.max(2, Math.round(wallCandidates.length * 0.09)));
    for (var k = 0; k < loops; k++) {
      grid[wallCandidates[k].y][wallCandidates[k].x] = 0;
    }

    return grid;
  }

  function bfs(grid, start, blocked) {
    var rows = grid.length;
    var cols = grid[0].length;
    var dist = makeGrid(cols, rows, -1);
    var queue = [{ x: start.x, y: start.y }];
    dist[start.y][start.x] = 0;

    for (var head = 0; head < queue.length; head++) {
      var cur = queue[head];
      for (var i = 0; i < DIRS.length; i++) {
        var nx = cur.x + DIRS[i].x;
        var ny = cur.y + DIRS[i].y;
        if (!isFloor(grid, nx, ny)) continue;
        if (blocked && blocked.has(key(nx, ny))) continue;
        if (dist[ny][nx] !== -1) continue;
        dist[ny][nx] = dist[cur.y][cur.x] + 1;
        queue.push({ x: nx, y: ny });
      }
    }

    return dist;
  }

  /*
    A vault is a dead-end corridor. A gate is placed a couple of cells in,
    sealing a chest at the very end. Because the dead end has exactly one
    neighbour, the chest can only be reached by opening that gate.
  */
  function findVaults(grid, start, wanted, startDist) {
    var rows = grid.length;
    var cols = grid[0].length;
    var deadEnds = [];

    for (var y = 1; y < rows - 1; y++) {
      for (var x = 1; x < cols - 1; x++) {
        if (!isFloor(grid, x, y)) continue;
        if (x === start.x && y === start.y) continue;
        if (startDist[y][x] < 5) continue;
        if (floorNeighbors(grid, x, y).length !== 1) continue;
        deadEnds.push({ x: x, y: y, score: startDist[y][x] + Math.random() * 3.5 });
      }
    }

    deadEnds.sort(function (a, b) { return b.score - a.score; });

    var used = new Set();
    var vaults = [];

    for (var d = 0; d < deadEnds.length && vaults.length < wanted; d++) {
      var dead = deadEnds[d];
      if (used.has(key(dead.x, dead.y))) continue;

      var path = [{ x: dead.x, y: dead.y }];
      var prev = null;
      var cur = { x: dead.x, y: dead.y };

      while (path.length < 5) {
        var nbrs = floorNeighbors(grid, cur.x, cur.y).filter(function (n) {
          return !prev || n.x !== prev.x || n.y !== prev.y;
        });
        if (nbrs.length !== 1) break;
        var next = nbrs[0];
        if (used.has(key(next.x, next.y))) break;
        prev = cur;
        cur = next;
        path.push({ x: next.x, y: next.y });
      }

      if (path.length < 3) continue;

      var doorIndex = path.length >= 4 ? 3 : 2;
      var door = path[doorIndex];

      if (Math.abs(door.x - start.x) + Math.abs(door.y - start.y) < 4) continue;
      if (path.some(function (c) { return used.has(key(c.x, c.y)); })) continue;

      path.forEach(function (c) { used.add(key(c.x, c.y)); });
      vaults.push({
        path: path,
        chest: path[0],
        reward: path[1],
        bonus: path[2],
        door: door,
        doorIndex: doorIndex
      });
    }

    return vaults;
  }

  function makePool(grid, dist) {
    var pool = [];
    for (var y = 0; y < grid.length; y++) {
      for (var x = 0; x < grid[0].length; x++) {
        if (isFloor(grid, x, y) && dist[y][x] >= 0) {
          pool.push({ x: x, y: y, dist: dist[y][x] });
        }
      }
    }
    return pool;
  }

  function takeCells(pool, count, occupied, extraFilter) {
    var candidates = pool.filter(function (c) {
      if (occupied.has(key(c.x, c.y))) return false;
      return !extraFilter || extraFilter(c);
    });

    shuffle(candidates);
    var out = [];
    for (var i = 0; i < candidates.length && out.length < count; i++) {
      var c = candidates[i];
      out.push(c);
      occupied.add(key(c.x, c.y));
    }
    return out;
  }

  function buildTorches(grid) {
    var rows = grid.length;
    var cols = grid[0].length;
    var candidates = [];

    for (var y = 1; y < rows - 1; y++) {
      for (var x = 1; x < cols - 1; x++) {
        if (grid[y][x] !== 1) continue;
        var floors = floorNeighbors(grid, x, y);
        if (!floors.length) continue;
        var target = floors[Math.floor(Math.random() * floors.length)];
        candidates.push({
          x: x,
          y: y,
          dirX: target.x - x,
          dirY: target.y - y
        });
      }
    }

    shuffle(candidates);
    var torches = [];

    for (var i = 0; i < candidates.length && torches.length < 26; i++) {
      var c = candidates[i];
      var tooClose = torches.some(function (t) {
        return Math.abs(t.x - c.x) <= 1 && Math.abs(t.y - c.y) <= 1;
      });
      if (tooClose) continue;
      torches.push({
        x: c.x,
        y: c.y,
        dirX: c.dirX,
        dirY: c.dirY,
        phase: Math.random() * Math.PI * 2
      });
    }

    return torches;
  }

  function generateLevel(levelIndex) {
    var config = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
    var start = { x: 1, y: 1 };
    var grid = null;
    var vaults = [];
    var startDist = null;

    for (var attempt = 0; attempt < 60; attempt++) {
      grid = generateMaze(config.cols, config.rows);
      startDist = bfs(grid, start, null);
      vaults = findVaults(grid, start, config.chests, startDist);
      if (vaults.length >= config.chests) break;
    }

    var doors = [];
    var chests = [];
    var occupied = new Set();
    occupied.add(key(start.x, start.y));

    vaults.forEach(function (vault) {
      doors.push({ x: vault.door.x, y: vault.door.y });
      chests.push({ x: vault.chest.x, y: vault.chest.y });
      occupied.add(key(vault.chest.x, vault.chest.y));
      occupied.add(key(vault.reward.x, vault.reward.y));
      occupied.add(key(vault.door.x, vault.door.y));
      vault.path.forEach(function (c) { occupied.add(key(c.x, c.y)); });
    });

    var doorSet = new Set(doors.map(function (d) { return key(d.x, d.y); }));
    var mainDist = bfs(grid, start, doorSet);
    var mainPool = makePool(grid, mainDist).filter(function (c) {
      return !doorSet.has(key(c.x, c.y));
    });

    /* Fallback if a maze somehow lacks enough dead ends. */
    while (chests.length < config.chests) {
      var extraChest = takeCells(mainPool, 1, occupied, function (c) {
        return mainDist[c.y][c.x] >= 4;
      })[0];
      if (!extraChest) break;
      chests.push({ x: extraChest.x, y: extraChest.y });
    }

    var keyCells = takeCells(mainPool, doors.length, occupied, function (c) {
      return mainDist[c.y][c.x] >= 3;
    });

    if (keyCells.length < doors.length) {
      keyCells = keyCells.concat(takeCells(mainPool, doors.length - keyCells.length, occupied));
    }

    /* Safety net: never leave a gate without a key in the world. */
    if (keyCells.length < doors.length) {
      doors = doors.slice(0, keyCells.length);
    }

    var spikeCells = takeCells(mainPool, config.spikes, occupied, function (c) {
      return mainDist[c.y][c.x] >= 2;
    });

    var coinCells = takeCells(mainPool, config.coins, occupied);
    var gemCells = takeCells(mainPool, config.gems, occupied);

    var boulderCells = takeCells(mainPool, config.boulders, occupied, function (c) {
      return mainDist[c.y][c.x] >= 4;
    });

    if (boulderCells.length < config.boulders) {
      boulderCells = boulderCells.concat(takeCells(mainPool, config.boulders - boulderCells.length, occupied));
    }

    /* Vault interior rewards: one gem (and sometimes extra gold) per vault. */
    var vaultGems = [];
    vaults.forEach(function (vault, i) {
      vaultGems.push({
        x: vault.reward.x,
        y: vault.reward.y,
        color: GEM_COLORS[(i + levelIndex + 1) % GEM_COLORS.length],
        phase: Math.random() * Math.PI * 2
      });
      if (vault.doorIndex === 3) {
        coinCells.push({ x: vault.bonus.x, y: vault.bonus.y });
      }
    });

    var keys = keyCells.map(function (c) {
      return { x: c.x, y: c.y, phase: Math.random() * Math.PI * 2 };
    });

    var coins = coinCells.map(function (c) {
      return { x: c.x, y: c.y, phase: Math.random() * Math.PI * 2 };
    });

    var gems = gemCells.map(function (c, i) {
      return {
        x: c.x,
        y: c.y,
        color: GEM_COLORS[(i + levelIndex) % GEM_COLORS.length],
        phase: Math.random() * Math.PI * 2
      };
    }).concat(vaultGems);

    var spikes = spikeCells.map(function (c) {
      return {
        x: c.x,
        y: c.y,
        offset: Math.random() * config.spikePeriod,
        period: config.spikePeriod,
        activeDur: config.spikeActive,
        warnDur: config.spikeWarn,
        ext: 0,
        warn: false,
        active: false
      };
    });

    var boulders = boulderCells.map(function (c, i) {
      return {
        x: c.x + 0.5,
        y: c.y + 0.5,
        col: c.x,
        row: c.y,
        nextCol: c.x,
        nextRow: c.y,
        t: 0,
        speed: config.boulderSpeed + i * 0.04,
        angle: Math.random() * Math.PI * 2
      };
    });

    var chestObjects = chests.map(function (c, i) {
      return { x: c.x, y: c.y, phase: i * 1.7, opened: false, anim: 0 };
    });

    return {
      index: levelIndex,
      config: config,
      cols: config.cols,
      rows: config.rows,
      grid: grid,
      start: start,
      exit: { x: start.x, y: start.y },
      doors: doors.map(function (d) { return { x: d.x, y: d.y, open: false, anim: 0 }; }),
      chests: chestObjects,
      keys: keys,
      coins: coins,
      gems: gems,
      spikes: spikes,
      boulders: boulders,
      torches: buildTorches(grid),
      chestQuota: chestObjects.length
    };
  }

  window.TreasureMaze = {
    LEVELS: LEVELS,
    generateLevel: generateLevel,
    count: LEVELS.length
  };
})();
