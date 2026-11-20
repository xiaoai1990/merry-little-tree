(function () {
  'use strict';

  var PI2 = Math.PI * 2;
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  var W = 1;
  var H = 1;
  var DPR = 1;
  var lastFrame = 0;
  var rafId = 0;
  var toastTimer = 0;
  var hashTimer = 0;
  var lightStartedAt = 0;
  var posterDataUrl = '';
  var drag = null;
  var receivedFromShare = false;
  var historyStack = [];
  var reducedMotion = false;
  var pageVisible = true;

  try {
    reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (error) {
    reducedMotion = false;
  }

  var TREE_STYLES = [
    {
      id: 'fir',
      name: '冷杉',
      deep: '#123d31',
      deep2: '#0c2e27',
      mid: '#24624c',
      light: '#5c9a76',
      edge: '#9acaa7'
    },
    {
      id: 'cedar',
      name: '雪松',
      deep: '#153f4b',
      deep2: '#0d303c',
      mid: '#2c6874',
      light: '#72a9a7',
      edge: '#b6dcd5'
    },
    {
      id: 'champ',
      name: '香槟',
      deep: '#3d4b31',
      deep2: '#2a3524',
      mid: '#707c4c',
      light: '#b9ab70',
      edge: '#ebddaa'
    }
  ];

  var ORNAMENTS = [
    { id: 'red', name: '红球' },
    { id: 'gold', name: '金球' },
    { id: 'snow', name: '雪花' },
    { id: 'star', name: '星星' },
    { id: 'candy', name: '拐杖糖' },
    { id: 'bell', name: '铃铛' },
    { id: 'cookie', name: '姜饼人' },
    { id: 'gift', name: '礼物' }
  ];

  var TREE_MAP = {};
  var ORNAMENT_MAP = {};
  var ANCHORS = [];

  TREE_STYLES.forEach(function (style) {
    TREE_MAP[style.id] = style;
  });
  ORNAMENTS.forEach(function (item) {
    ORNAMENT_MAP[item.id] = item;
  });

  ANCHORS = buildAnchors();

  var STARS = [];
  var BOKEH = [];
  var FOREST = [];
  var SNOW = [];
  var BULBS = [];

  buildAmbientData();

  var els = {
    undoBtn: document.getElementById('undoBtn'),
    randomBtn: document.getElementById('randomBtn'),
    clearBtn: document.getElementById('clearBtn'),
    lightBtn: document.getElementById('lightBtn'),
    lightBtnText: document.getElementById('lightBtnText'),
    ornamentTray: document.getElementById('ornamentTray'),
    treeColors: document.getElementById('treeColors'),
    nameInput: document.getElementById('nameInput'),
    hint: document.getElementById('hint'),
    toast: document.getElementById('toast'),
    trayNote: document.getElementById('trayNote'),
    received: document.getElementById('received'),
    receivedText: document.getElementById('receivedText'),
    resetReceived: document.getElementById('resetReceived'),
    shareOverlay: document.getElementById('shareOverlay'),
    closeShareBtn: document.getElementById('closeShareBtn'),
    posterImg: document.getElementById('posterImg'),
    posterTip: document.getElementById('posterTip'),
    saveBtn: document.getElementById('saveBtn'),
    shareBtn: document.getElementById('shareBtn'),
    linkToggle: document.getElementById('linkToggle'),
    linkBox: document.getElementById('linkBox'),
    shareLinkInput: document.getElementById('shareLinkInput')
  };

  var state = defaultState();

  function defaultState() {
    return {
      tree: 'fir',
      lit: false,
      name: '',
      ornaments: []
    };
  }

  function rnd(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits) {
    var power = Math.pow(10, digits);
    return Math.round(value * power) / power;
  }

  function buildAnchors() {
    var list = [];
    for (var row = 0; row < 8; row += 1) {
      var count = row + 1;
      var v = 0.075 + row * 0.112;
      for (var column = 0; column < count; column += 1) {
        var u = count === 1 ? 0 : -0.62 + (1.24 * column) / (count - 1);
        if (row % 2 === 1) {
          u += 0.035 * (column % 2 === 0 ? 1 : -1);
        }
        list.push({
          u: clamp(u + (rnd(row * 19 + column * 7) - 0.5) * 0.075, -0.72, 0.72),
          v: clamp(v + (rnd(row * 31 + column * 13) - 0.5) * 0.035, 0.045, 0.94)
        });
      }
    }
    return list;
  }

  function buildAmbientData() {
    var i;
    for (i = 0; i < 56; i += 1) {
      STARS.push({
        x: rnd(i * 3 + 2),
        y: rnd(i * 5 + 7) * 0.7,
        r: 0.5 + rnd(i * 7 + 1) * 1.4,
        a: 0.22 + rnd(i * 11 + 4) * 0.56,
        phase: rnd(i * 13 + 5) * PI2
      });
    }

    for (i = 0; i < 11; i += 1) {
      BOKEH.push({
        x: rnd(i * 17 + 9),
        y: 0.12 + rnd(i * 23 + 3) * 0.58,
        r: 8 + rnd(i * 29 + 6) * 28,
        a: 0.025 + rnd(i * 37 + 2) * 0.05
      });
    }

    for (i = 0; i < 13; i += 1) {
      FOREST.push({
        x: rnd(i * 41 + 12),
        y: 0.6 + rnd(i * 43 + 4) * 0.1,
        w: 0.03 + rnd(i * 47 + 3) * 0.055,
        h: 0.07 + rnd(i * 53 + 5) * 0.13,
        a: 0.25 + rnd(i * 59 + 8) * 0.34
      });
    }

    for (i = 0; i < 46; i += 1) {
      SNOW.push({
        x: rnd(i * 61 + 11),
        y: rnd(i * 67 + 13),
        r: 0.6 + rnd(i * 71 + 2) * 2.1,
        speed: 0.012 + rnd(i * 73 + 7) * 0.032,
        drift: 0.005 + rnd(i * 79 + 9) * 0.016,
        phase: rnd(i * 83 + 4) * PI2,
        a: 0.2 + rnd(i * 89 + 1) * 0.55
      });
    }

    for (i = 0; i < 38; i += 1) {
      var v = 0.09 + (i / 37) * 0.82;
      var angle = i * 2.399;
      var u = Math.sin(angle) * 0.56 + Math.sin(i * 0.61) * 0.08;
      BULBS.push({
        u: clamp(u, -0.7, 0.7),
        v: v,
        phase: rnd(i * 97 + 5) * PI2,
        warm: i % 5 === 0
      });
    }
  }

  function getTreeStyle() {
    return TREE_MAP[state.tree] || TREE_STYLES[0];
  }

  function getTreeGeom(area) {
    var topY = area.y + area.h * 0.055;
    var bottomY = area.y + area.h * 0.92;
    var halfW = Math.min(area.w * 0.37, area.h * 0.34);
    return {
      cx: area.x + area.w / 2,
      topY: topY,
      bottomY: bottomY,
      halfW: halfW,
      h: bottomY - topY
    };
  }

  function treeHalfAt(geom, v) {
    return geom.halfW * (0.07 + 0.93 * clamp(v, 0, 1));
  }

  function ornamentPoint(ornament, geom) {
    var v = clamp(ornament.v, 0.02, 1.02);
    return {
      x: geom.cx + ornament.u * treeHalfAt(geom, v),
      y: geom.topY + v * geom.h
    };
  }

  function stageArea() {
    var compact = H < 720;
    return {
      x: 0,
      y: H * (compact ? 0.14 : 0.125),
      w: W,
      h: H * (compact ? 0.48 : 0.605)
    };
  }

  function cloneState() {
    return JSON.parse(JSON.stringify(state));
  }

  function pushHistory() {
    historyStack.push(cloneState());
    if (historyStack.length > 32) {
      historyStack.shift();
    }
    updateUndo();
  }

  function updateUndo() {
    els.undoBtn.disabled = historyStack.length === 0;
  }

  function makeOrnament(type, u, v, scale, rotation) {
    return {
      type: type,
      u: round(u, 3),
      v: round(v, 3),
      s: round(scale || 1, 2),
      r: round(rotation || 0, 2),
      born: 0
    };
  }

  function stateToHash() {
    var data = {
      v: 1,
      t: state.tree,
      l: state.lit ? 1 : 0,
      n: state.name,
      o: state.ornaments.map(function (item) {
        return [item.type, round(item.u, 3), round(item.v, 3), round(item.s, 2), round(item.r, 2)];
      })
    };
    return encodeURIComponent(JSON.stringify(data));
  }

  function hashToState(raw) {
    var data = JSON.parse(decodeURIComponent(raw));
    if (!data || data.v !== 1) {
      return null;
    }
    var next = defaultState();
    if (TREE_MAP[data.t]) {
      next.tree = data.t;
    }
    next.lit = !!data.l;
    if (typeof data.n === 'string') {
      next.name = data.n.slice(0, 12);
    }
    if (Object.prototype.toString.call(data.o) === '[object Array]') {
      data.o.slice(0, 32).forEach(function (entry) {
        if (Object.prototype.toString.call(entry) !== '[object Array]') {
          return;
        }
        if (!ORNAMENT_MAP[entry[0]]) {
          return;
        }
        next.ornaments.push(makeOrnament(
          entry[0],
          clamp(Number(entry[1]) || 0, -0.72, 0.72),
          clamp(Number(entry[2]) || 0.4, 0.03, 0.98),
          clamp(Number(entry[3]) || 1, 0.76, 1.2),
          Number(entry[4]) || 0
        ));
      });
    }
    return next;
  }

  function readInitialState() {
    try {
      var hash = window.location.hash.replace(/^#/, '');
      if (hash.indexOf('tree=') !== 0) {
        return null;
      }
      return hashToState(hash.slice(5));
    } catch (error) {
      return null;
    }
  }

  function syncHash(immediate) {
    window.clearTimeout(hashTimer);
    function write() {
      try {
        var base = window.location.href.split('#')[0];
        var hasContent = state.name || state.lit || state.ornaments.length;
        window.history.replaceState(null, '', base + (hasContent ? '#tree=' + stateToHash() : ''));
      } catch (error) {
        // file:// previews can reject history updates.
      }
    }
    if (immediate) {
      write();
    } else {
      hashTimer = window.setTimeout(write, 140);
    }
  }

  function buildTreeColors() {
    els.treeColors.innerHTML = '';
    TREE_STYLES.forEach(function (style) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'tree-color';
      button.setAttribute('data-tree', style.id);
      button.setAttribute('aria-label', '换成' + style.name);
      button.innerHTML = '<span class="tree-color-dot" style="background:' + style.mid + '"></span><span>' + style.name + '</span>';
      button.addEventListener('click', function () {
        setTreeStyle(style.id);
      });
      els.treeColors.appendChild(button);
    });
    updateTreeColorUi();
  }

  function buildOrnamentTray() {
    els.ornamentTray.innerHTML = '';
    ORNAMENTS.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'ornament-btn';
      button.setAttribute('aria-label', '添加' + item.name);

      var icon = document.createElement('canvas');
      icon.width = 64;
      icon.height = 64;
      var iconContext = icon.getContext('2d');
      iconContext.scale(2, 2);
      drawOrnament(iconContext, item.id, 16, 18.5, 11.5, 0, false, 0, 1);

      var label = document.createElement('span');
      label.textContent = item.name;
      button.appendChild(icon);
      button.appendChild(label);
      button.addEventListener('click', function () {
        addOrnament(item.id);
      });
      els.ornamentTray.appendChild(button);
    });
  }

  function updateTreeColorUi() {
    var buttons = els.treeColors.querySelectorAll('.tree-color');
    for (var i = 0; i < buttons.length; i += 1) {
      var active = buttons[i].getAttribute('data-tree') === state.tree;
      if (active) {
        buttons[i].classList.add('is-active');
      } else {
        buttons[i].classList.remove('is-active');
      }
    }
  }

  function updateLightUi() {
    els.lightBtnText.textContent = state.lit ? '生成分享卡' : '点亮圣诞树';
    els.trayNote.textContent = state.lit ? '树上已经有光了，点按钮生成贺卡' : '拖动树上的挂饰，可以重新摆放';
    els.nameInput.value = state.name;
  }

  function updateAllUi() {
    updateTreeColorUi();
    updateLightUi();
    updateUndo();
  }

  function setTreeStyle(id) {
    if (!TREE_MAP[id] || state.tree === id) {
      return;
    }
    pushHistory();
    state.tree = id;
    updateTreeColorUi();
    syncHash();
  }

  function findFreeAnchor() {
    var start = Math.floor(Math.random() * ANCHORS.length);
    var i;
    for (i = 0; i < ANCHORS.length; i += 1) {
      var anchor = ANCHORS[(start + i) % ANCHORS.length];
      var free = true;
      for (var j = 0; j < state.ornaments.length; j += 1) {
        var item = state.ornaments[j];
        var du = item.u - anchor.u;
        var dv = (item.v - anchor.v) * 1.45;
        if (Math.sqrt(du * du + dv * dv) < 0.095) {
          free = false;
          break;
        }
      }
      if (free) {
        return anchor;
      }
    }
    return {
      u: (Math.random() - 0.5) * 1.1,
      v: 0.2 + Math.random() * 0.64
    };
  }

  function addOrnament(type) {
    if (!ORNAMENT_MAP[type] || state.ornaments.length >= 32) {
      if (state.ornaments.length >= 32) {
        toast('树上已经很热闹啦');
      }
      return;
    }
    pushHistory();
    var anchor = findFreeAnchor();
    var ornament = makeOrnament(
      type,
      anchor.u + (Math.random() - 0.5) * 0.045,
      anchor.v + (Math.random() - 0.5) * 0.02,
      0.88 + Math.random() * 0.24,
      (Math.random() - 0.5) * 0.28
    );
    ornament.born = now();
    state.ornaments.push(ornament);
    hideHint();
    updateAllUi();
    syncHash();
    haptic('light');
  }

  function randomizeTree() {
    pushHistory();
    var pool = ORNAMENTS.slice(0);
    for (var i = pool.length - 1; i > 0; i -= 1) {
      var swap = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i];
      pool[i] = pool[swap];
      pool[swap] = tmp;
    }
    var added = 0;
    var target = Math.max(8, Math.min(12, 9 + Math.floor(Math.random() * 3)));
    while (added < target) {
      var anchor = findFreeAnchor();
      var type = pool[added % pool.length].id;
      var item = makeOrnament(
        type,
        anchor.u + (Math.random() - 0.5) * 0.05,
        anchor.v + (Math.random() - 0.5) * 0.02,
        0.88 + Math.random() * 0.24,
        (Math.random() - 0.5) * 0.3
      );
      item.born = now() + added * 55;
      state.ornaments.push(item);
      added += 1;
      if (state.ornaments.length >= 32) {
        break;
      }
    }
    hideHint();
    updateAllUi();
    syncHash();
    haptic('medium');
    toast('已经帮你挂好一层雪夜');
  }

  function clearTree() {
    if (!state.ornaments.length && !state.lit) {
      toast('树还是空的，先挂一个挂饰吧');
      return;
    }
    pushHistory();
    state.ornaments = [];
    state.lit = false;
    lightStartedAt = 0;
    updateAllUi();
    syncHash();
    toast('清空啦，可以重新布置');
  }

  function undo() {
    if (!historyStack.length) {
      return;
    }
    state = historyStack.pop();
    state.ornaments.forEach(function (item) {
      item.born = 0;
    });
    updateAllUi();
    syncHash();
    haptic('light');
  }

  function toggleLight() {
    if (!state.lit) {
      pushHistory();
      state.lit = true;
      lightStartedAt = now();
      updateLightUi();
      updateUndo();
      syncHash();
      haptic('medium');
      toast('亮起来了，准备好送出去了吗');
      hideHint();
      return;
    }
    openShare();
  }

  function now() {
    return window.performance && window.performance.now ? window.performance.now() : Date.now();
  }

  function hideHint() {
    els.hint.classList.add('is-hidden');
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2200);
  }

  function haptic(strength) {
    var miniTool = window.xhs && window.xhs.miniTool;
    if (miniTool && typeof miniTool.vibrateShort === 'function') {
      try {
        var result = miniTool.vibrateShort({ type: strength || 'light' });
        if (result && typeof result.catch === 'function') {
          result.catch(function () {});
        }
      } catch (error) {
        // Haptics are optional.
      }
      return;
    }
    if (navigator.vibrate) {
      try {
        navigator.vibrate(strength === 'medium' ? 18 : 8);
      } catch (error) {
        // Haptics are optional.
      }
    }
  }

  function showReceived() {
    els.receivedText.textContent = state.name ? '这是 ' + state.name + ' 的圣诞树' : '你收到了一棵圣诞树';
    els.received.hidden = false;
    hideHint();
  }

  function resetReceived() {
    state = defaultState();
    historyStack = [];
    lightStartedAt = 0;
    drag = null;
    els.received.hidden = true;
    els.nameInput.value = '';
    els.hint.classList.remove('is-hidden');
    updateAllUi();
    syncHash(true);
    toast('现在，这棵树归你了');
  }

  function setAppHeight() {
    document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
  }

  function resize() {
    setAppHeight();
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function loop(time) {
    if (!pageVisible) {
      return;
    }
    var delta = lastFrame ? Math.min(42, time - lastFrame) : 16;
    lastFrame = time;
    if (!reducedMotion) {
      updateSnow(delta);
    }
    drawStage(time);
    rafId = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (!pageVisible || rafId) {
      return;
    }
    lastFrame = 0;
    rafId = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function updateSnow(delta) {
    for (var i = 0; i < SNOW.length; i += 1) {
      var flake = SNOW[i];
      flake.y += flake.speed * (delta / 16);
      if (flake.y > 1.04) {
        flake.y = -0.04;
        flake.x = Math.random();
      }
    }
  }

  function drawStage(time) {
    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx, W, H, false, time);
    drawTreeScene(ctx, stageArea(), state, false, time);
    drawSnowfall(ctx, W, H, time, false);
  }

  function drawBackground(c, w, h, poster, time) {
    var sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#071425');
    sky.addColorStop(0.34, '#102743');
    sky.addColorStop(0.67, '#1e4054');
    sky.addColorStop(1, '#2c5361');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    var upperGlow = c.createRadialGradient(w * 0.48, h * 0.08, 0, w * 0.48, h * 0.08, w * 0.72);
    upperGlow.addColorStop(0, 'rgba(73, 101, 143, 0.36)');
    upperGlow.addColorStop(0.55, 'rgba(37, 69, 105, 0.08)');
    upperGlow.addColorStop(1, 'rgba(7, 20, 37, 0)');
    c.fillStyle = upperGlow;
    c.fillRect(0, 0, w, h);

    drawMoon(c, w, h, poster);

    for (var i = 0; i < STARS.length; i += 1) {
      var star = STARS[i];
      var twinkle = poster ? 1 : 0.72 + Math.sin(time * 0.0011 + star.phase) * 0.28;
      c.globalAlpha = star.a * twinkle;
      c.fillStyle = '#fff7dd';
      c.beginPath();
      c.arc(star.x * w, star.y * h, star.r, 0, PI2);
      c.fill();
      if (star.r > 1.55) {
        c.globalAlpha = star.a * twinkle * 0.5;
        c.fillRect(star.x * w - star.r * 2.4, star.y * h - 0.35, star.r * 4.8, 0.7);
        c.fillRect(star.x * w - 0.35, star.y * h - star.r * 2.4, 0.7, star.r * 4.8);
      }
    }
    c.globalAlpha = 1;

    for (var b = 0; b < BOKEH.length; b += 1) {
      var orb = BOKEH[b];
      var ox = orb.x * w;
      var oy = orb.y * h;
      var glow = c.createRadialGradient(ox, oy, 0, ox, oy, orb.r);
      glow.addColorStop(0, 'rgba(245, 206, 134, ' + orb.a + ')');
      glow.addColorStop(1, 'rgba(245, 206, 134, 0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(ox, oy, orb.r, 0, PI2);
      c.fill();
    }

    for (var f = 0; f < FOREST.length; f += 1) {
      drawForestTree(c, FOREST[f], w, h, poster);
    }

    var ground = c.createLinearGradient(0, h * 0.7, 0, h);
    ground.addColorStop(0, 'rgba(33, 71, 83, 0.92)');
    ground.addColorStop(0.55, 'rgba(19, 50, 63, 0.98)');
    ground.addColorStop(1, '#0a1a2b');
    c.fillStyle = ground;
    c.fillRect(0, h * 0.7, w, h * 0.3);

    var drift = c.createRadialGradient(w * 0.48, h * 0.79, 0, w * 0.48, h * 0.79, w * 0.7);
    drift.addColorStop(0, 'rgba(189, 222, 226, 0.19)');
    drift.addColorStop(0.58, 'rgba(86, 139, 149, 0.05)');
    drift.addColorStop(1, 'rgba(20, 47, 61, 0)');
    c.fillStyle = drift;
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.83, w * 0.67, h * 0.13, 0, 0, PI2);
    c.fill();

    c.globalAlpha = 0.16;
    c.strokeStyle = '#e6f2ee';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, h * 0.745);
    c.quadraticCurveTo(w * 0.22, h * 0.725, w * 0.44, h * 0.748);
    c.quadraticCurveTo(w * 0.7, h * 0.778, w, h * 0.742);
    c.stroke();
    c.globalAlpha = 1;
  }

  function drawMoon(c, w, h, poster) {
    var x = w * 0.79;
    var y = h * 0.105;
    var r = Math.min(w, h) * 0.052;
    var glow = c.createRadialGradient(x, y, 0, x, y, r * 4.2);
    glow.addColorStop(0, 'rgba(255, 238, 191, 0.34)');
    glow.addColorStop(0.32, 'rgba(255, 229, 171, 0.12)');
    glow.addColorStop(1, 'rgba(255, 229, 171, 0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(x, y, r * 4.2, 0, PI2);
    c.fill();

    var moon = c.createRadialGradient(x - r * 0.34, y - r * 0.38, r * 0.05, x, y, r);
    moon.addColorStop(0, '#fff8d9');
    moon.addColorStop(0.52, '#f4e4b4');
    moon.addColorStop(0.84, '#d7c188');
    moon.addColorStop(1, '#c4ac74');
    c.fillStyle = moon;
    c.beginPath();
    c.arc(x, y, r, 0, PI2);
    c.fill();

    c.fillStyle = 'rgba(103, 91, 61, 0.12)';
    c.beginPath();
    c.arc(x - r * 0.2, y + r * 0.28, r * 0.2, 0, PI2);
    c.fill();
    c.beginPath();
    c.arc(x + r * 0.34, y - r * 0.12, r * 0.14, 0, PI2);
    c.fill();
    c.beginPath();
    c.arc(x + r * 0.08, y + r * 0.42, r * 0.1, 0, PI2);
    c.fill();
  }

  function drawForestTree(c, tree, w, h, poster) {
    var x = tree.x * w;
    var baseY = tree.y * h;
    var treeW = tree.w * w;
    var treeH = tree.h * h;
    c.globalAlpha = tree.a * (poster ? 1 : 0.9);
    c.fillStyle = '#0b2333';
    c.beginPath();
    c.moveTo(x, baseY - treeH);
    c.lineTo(x + treeW * 0.5, baseY);
    c.lineTo(x - treeW * 0.5, baseY);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
  }

  function drawTreeScene(c, area, sceneState, poster, time) {
    var style = TREE_MAP[sceneState.tree] || TREE_STYLES[0];
    var geom = getTreeGeom(area);
    var lit = !!sceneState.lit;

    drawTreeHalo(c, geom, lit, poster, time);
    drawTrunk(c, geom);

    var specs = [
      { v: 0.0, w: 0.31, h: 0.3 },
      { v: 0.16, w: 0.49, h: 0.31 },
      { v: 0.34, w: 0.67, h: 0.31 },
      { v: 0.53, w: 0.84, h: 0.31 },
      { v: 0.72, w: 1.0, h: 0.27 }
    ];
    for (var i = 0; i < specs.length; i += 1) {
      drawTier(c, geom, specs[i], style, i);
    }

    drawLights(c, geom, lit, poster, time);
    drawTopper(c, geom, lit, poster, time);
    drawGifts(c, geom, poster);
    drawOrnamentSet(c, geom, sceneState, poster, time);
    drawTreeBaseSnow(c, geom, poster);
  }

  function drawTreeHalo(c, geom, lit, poster, time) {
    var cx = geom.cx;
    var cy = geom.topY + geom.h * 0.48;
    var radius = geom.halfW * (poster ? 2.25 : 2.05);
    var strength = lit ? 0.24 : 0.12;
    var pulse = lit && !reducedMotion ? 0.018 * Math.sin(time * 0.0016) : 0;
    var glow = c.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, 'rgba(255, 211, 128, ' + (strength + pulse) + ')');
    glow.addColorStop(0.32, 'rgba(255, 196, 103, ' + (strength * 0.52) + ')');
    glow.addColorStop(0.66, 'rgba(255, 190, 100, ' + (strength * 0.13) + ')');
    glow.addColorStop(1, 'rgba(255, 190, 100, 0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(cx, cy, radius, 0, PI2);
    c.fill();

    c.strokeStyle = 'rgba(244, 206, 134, ' + (lit ? 0.16 : 0.08) + ')';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(cx, cy, radius * 0.62, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
  }

  function drawTrunk(c, geom) {
    var trunkW = geom.halfW * 0.15;
    var trunkH = geom.h * 0.14;
    var x = geom.cx - trunkW / 2;
    var y = geom.bottomY - geom.h * 0.035;
    roundedRect(c, x, y, trunkW, trunkH, trunkW * 0.18);
    var trunkGradient = c.createLinearGradient(x, 0, x + trunkW, 0);
    trunkGradient.addColorStop(0, '#38251b');
    trunkGradient.addColorStop(0.45, '#67402b');
    trunkGradient.addColorStop(1, '#2d1d17');
    c.fillStyle = trunkGradient;
    c.fill();
    c.fillStyle = 'rgba(255, 220, 170, 0.12)';
    c.fillRect(x + trunkW * 0.56, y + 2, trunkW * 0.12, trunkH - 4);
  }

  function drawTier(c, geom, spec, style, index) {
    var top = geom.topY + spec.v * geom.h;
    var base = Math.min(geom.bottomY, geom.topY + (spec.v + spec.h) * geom.h);
    var half = geom.halfW * spec.w;
    var height = base - top;
    if (height <= 0) {
      return;
    }

    var grad = c.createLinearGradient(geom.cx - half, 0, geom.cx + half, 0);
    grad.addColorStop(0, style.light);
    grad.addColorStop(0.32, style.mid);
    grad.addColorStop(0.72, style.deep);
    grad.addColorStop(1, style.deep2);

    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(geom.cx, top);
    c.bezierCurveTo(
      geom.cx + half * 0.24,
      top + height * 0.27,
      geom.cx + half * 0.82,
      base - height * 0.2,
      geom.cx + half,
      base
    );

    var scallops = 8;
    for (var i = 0; i < scallops; i += 1) {
      var from = 1 - (i * 2 / scallops);
      var to = 1 - ((i + 1) * 2 / scallops);
      var midX = geom.cx + half * (from + to) / 2;
      var dip = (i % 2 === 0 ? 1 : -0.45) * geom.h * 0.008;
      c.quadraticCurveTo(midX, base + dip, geom.cx + half * to, base);
    }

    c.bezierCurveTo(
      geom.cx - half * 0.82,
      base - height * 0.2,
      geom.cx - half * 0.24,
      top + height * 0.27,
      geom.cx,
      top
    );
    c.closePath();
    c.fill();

    c.strokeStyle = 'rgba(223, 244, 234, 0.14)';
    c.lineWidth = Math.max(1, geom.halfW * 0.012);
    c.beginPath();
    c.moveTo(geom.cx, top + 1);
    c.bezierCurveTo(
      geom.cx - half * 0.24,
      top + height * 0.27,
      geom.cx - half * 0.82,
      base - height * 0.2,
      geom.cx - half,
      base - 1
    );
    c.stroke();

    c.strokeStyle = 'rgba(6, 22, 20, 0.18)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(geom.cx - half, base);
    c.quadraticCurveTo(geom.cx, base + geom.h * 0.012, geom.cx + half, base);
    c.stroke();

    drawTierNeedles(c, geom, top, base, half, index);
  }

  function drawTierNeedles(c, geom, top, base, half, index) {
    c.strokeStyle = 'rgba(219, 244, 226, 0.12)';
    c.lineWidth = 1;
    for (var i = 0; i < 10; i += 1) {
      var t = 0.14 + (i / 9) * 0.78;
      var y = top + (base - top) * t;
      var edge = half * (0.12 + 0.82 * t);
      var direction = i % 2 === 0 ? 1 : -1;
      var x = geom.cx + edge * direction;
      var length = geom.halfW * (0.035 + rnd(index * 40 + i) * 0.03);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + length * direction, y + length * 0.75);
      c.stroke();
    }
  }

  function drawLights(c, geom, lit, poster, time) {
    for (var i = 0; i < BULBS.length; i += 1) {
      var bulb = BULBS[i];
      var v = bulb.v;
      var x = geom.cx + bulb.u * treeHalfAt(geom, v);
      var y = geom.topY + v * geom.h;
      var pulse = lit && !reducedMotion ? 0.72 + Math.sin(time * 0.003 + bulb.phase) * 0.28 : 0.6;
      var glowRadius = (lit ? geom.halfW * 0.075 : geom.halfW * 0.028) * (0.82 + pulse * 0.35);
      var color = bulb.warm ? '255, 207, 122' : '255, 234, 187';

      if (lit) {
        var glow = c.createRadialGradient(x, y, 0, x, y, glowRadius);
        glow.addColorStop(0, 'rgba(' + color + ', ' + (0.42 * pulse) + ')');
        glow.addColorStop(0.45, 'rgba(' + color + ', ' + (0.12 * pulse) + ')');
        glow.addColorStop(1, 'rgba(' + color + ', 0)');
        c.fillStyle = glow;
        c.beginPath();
        c.arc(x, y, glowRadius, 0, PI2);
        c.fill();
      }

      c.fillStyle = lit ? 'rgba(255, 242, 205, ' + (0.82 + pulse * 0.18) + ')' : 'rgba(244, 206, 134, 0.55)';
      c.beginPath();
      c.arc(x, y, Math.max(1.1, geom.halfW * 0.012), 0, PI2);
      c.fill();
    }
  }

  function drawTopper(c, geom, lit, poster, time) {
    var x = geom.cx;
    var y = geom.topY - geom.h * 0.035;
    var radius = geom.halfW * (poster ? 0.11 : 0.095);
    var pulse = lit && !reducedMotion ? 1 + Math.sin(time * 0.0028) * 0.06 : 1;

    if (lit) {
      var glow = c.createRadialGradient(x, y, 0, x, y, radius * 4.2);
      glow.addColorStop(0, 'rgba(255, 223, 145, 0.52)');
      glow.addColorStop(0.34, 'rgba(255, 207, 112, 0.14)');
      glow.addColorStop(1, 'rgba(255, 207, 112, 0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(x, y, radius * 4.2, 0, PI2);
      c.fill();
    }

    c.save();
    c.translate(x, y);
    c.scale(pulse, pulse);
    starPath(c, 0, 0, radius, radius * 0.44, 5);
    var starGradient = c.createLinearGradient(-radius, -radius, radius, radius);
    starGradient.addColorStop(0, '#fff4bd');
    starGradient.addColorStop(0.52, '#f4ce86');
    starGradient.addColorStop(1, '#c88d37');
    c.fillStyle = starGradient;
    c.fill();
    c.strokeStyle = 'rgba(255, 248, 214, 0.7)';
    c.lineWidth = 1;
    c.stroke();
    c.restore();

    if (lit) {
      c.strokeStyle = 'rgba(255, 225, 157, 0.34)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - radius * 1.7, y);
      c.lineTo(x - radius * 1.25, y);
      c.moveTo(x + radius * 1.25, y);
      c.lineTo(x + radius * 1.7, y);
      c.moveTo(x, y - radius * 1.7);
      c.lineTo(x, y - radius * 1.25);
      c.stroke();
    }
  }

  function drawGifts(c, geom, poster) {
    var baseY = geom.bottomY + geom.h * 0.04;
    var scale = geom.halfW * (poster ? 0.23 : 0.21);
    drawGiftBox(c, geom.cx - geom.halfW * 0.62, baseY, scale * 0.78, scale * 0.48, '#a83f48', '#e7bf6a', 0.04);
    drawGiftBox(c, geom.cx + geom.halfW * 0.5, baseY + scale * 0.04, scale * 0.94, scale * 0.6, '#2f6654', '#e6c77e', -0.05);
    drawGiftBox(c, geom.cx + geom.halfW * 0.06, baseY + scale * 0.08, scale * 0.6, scale * 0.42, '#e7ddc8', '#b64a4f', 0.02);
  }

  function drawGiftBox(c, x, baseY, width, height, bodyColor, ribbonColor, rotate) {
    c.save();
    c.translate(x, baseY);
    c.rotate(rotate);
    var w = width;
    var h = height;
    roundedRect(c, -w / 2, -h, w, h, Math.max(2, w * 0.07));
    var grad = c.createLinearGradient(-w / 2, -h, w / 2, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(0.38, bodyColor);
    grad.addColorStop(1, '#1c2f30');
    c.fillStyle = grad;
    c.fill();
    c.fillStyle = ribbonColor;
    c.fillRect(-w * 0.07, -h, w * 0.14, h);
    c.fillRect(-w / 2, -h * 0.63, w, h * 0.13);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fillRect(-w * 0.45, -h * 0.94, w * 0.12, h * 0.7);
    c.restore();
  }

  function drawOrnamentSet(c, geom, sceneState, poster, time) {
    for (var i = 0; i < sceneState.ornaments.length; i += 1) {
      var item = sceneState.ornaments[i];
      var point = ornamentPoint(item, geom);
      var size = Math.max(8, geom.halfW * 0.105 * item.s);
      var pop = 1;
      if (item.born) {
        var age = time - item.born;
        if (age >= 0 && age < 460) {
          pop = easeOutBack(age / 460);
        } else if (age >= 460) {
          item.born = 0;
        }
      }

      c.strokeStyle = 'rgba(244, 206, 134, 0.22)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(point.x, point.y - size * 1.55);
      c.lineTo(point.x, point.y - size * 0.7);
      c.stroke();

      c.fillStyle = 'rgba(4, 15, 20, 0.2)';
      c.beginPath();
      c.ellipse(point.x + size * 0.18, point.y + size * 0.64, size * 0.42, size * 0.14, 0, 0, PI2);
      c.fill();

      drawOrnament(c, item.type, point.x, point.y, size, item.r, sceneState.lit, time, pop);

      if (drag && drag.index === i) {
        c.strokeStyle = 'rgba(244, 206, 134, 0.7)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(point.x, point.y, size * 1.25, 0, PI2);
        c.stroke();
      }
    }
  }

  function drawTreeBaseSnow(c, geom, poster) {
    var width = geom.halfW * 1.3;
    var height = geom.h * 0.035;
    var glow = c.createRadialGradient(geom.cx, geom.bottomY + height * 0.2, 0, geom.cx, geom.bottomY + height * 0.2, width);
    glow.addColorStop(0, 'rgba(230, 247, 246, 0.18)');
    glow.addColorStop(0.56, 'rgba(206, 236, 235, 0.06)');
    glow.addColorStop(1, 'rgba(206, 236, 235, 0)');
    c.fillStyle = glow;
    c.beginPath();
    c.ellipse(geom.cx, geom.bottomY + height * 0.25, width, height, 0, 0, PI2);
    c.fill();
  }

  function drawOrnament(c, type, x, y, size, rotation, lit, time, scale) {
    c.save();
    c.translate(x, y);
    c.rotate(rotation || 0);
    c.scale(scale, scale);

    if (lit) {
      var ornamentGlow = c.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 1.32);
      ornamentGlow.addColorStop(0, 'rgba(255, 241, 187, 0.3)');
      ornamentGlow.addColorStop(0.5, 'rgba(255, 221, 139, 0.11)');
      ornamentGlow.addColorStop(1, 'rgba(255, 221, 139, 0)');
      c.fillStyle = ornamentGlow;
      c.beginPath();
      c.arc(0, 0, size * 1.32, 0, PI2);
      c.fill();
    }

    if (type === 'red' || type === 'gold') {
      var isGold = type === 'gold';
      var radius = size * 0.72;
      var bauble = c.createRadialGradient(-radius * 0.32, -radius * 0.38, radius * 0.08, 0, 0, radius);
      if (isGold) {
        bauble.addColorStop(0, '#fff8d8');
        bauble.addColorStop(0.24, '#f7d98a');
        bauble.addColorStop(0.64, '#c99639');
        bauble.addColorStop(1, '#7e5321');
      } else {
        bauble.addColorStop(0, '#ffd9d8');
        bauble.addColorStop(0.24, '#e36a6c');
        bauble.addColorStop(0.7, '#a8333e');
        bauble.addColorStop(1, '#671c2b');
      }
      c.fillStyle = bauble;
      c.beginPath();
      c.arc(0, 0, radius, 0, PI2);
      c.fill();
      c.strokeStyle = 'rgba(50, 17, 20, 0.28)';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.62)';
      c.beginPath();
      c.arc(-radius * 0.36, -radius * 0.4, radius * 0.2, 0, PI2);
      c.fill();
      c.fillStyle = '#d8b46b';
      roundedRect(c, -size * 0.11, -size * 0.94, size * 0.22, size * 0.18, size * 0.04);
      c.fill();
      c.strokeStyle = 'rgba(255, 241, 189, 0.55)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, -size * 0.9, size * 0.16, 0, PI2);
      c.stroke();
    } else if (type === 'snow') {
      c.strokeStyle = '#e7f8ff';
      c.lineWidth = Math.max(1.4, size * 0.15);
      c.lineCap = 'round';
      var arm = size * 0.92;
      for (var i = 0; i < 6; i += 1) {
        var angle = (i * Math.PI) / 3;
        var dx = Math.cos(angle);
        var dy = Math.sin(angle);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(dx * arm, dy * arm);
        c.stroke();
        c.beginPath();
        c.moveTo(dx * arm * 0.58, dy * arm * 0.58);
        c.lineTo(dx * arm * 0.78 - dy * size * 0.2, dy * arm * 0.78 + dx * size * 0.2);
        c.moveTo(dx * arm * 0.58, dy * arm * 0.58);
        c.lineTo(dx * arm * 0.78 + dy * size * 0.2, dy * arm * 0.78 - dx * size * 0.2);
        c.stroke();
      }
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(0, 0, size * 0.16, 0, PI2);
      c.fill();
    } else if (type === 'star') {
      starPath(c, 0, 0, size * 0.94, size * 0.38, 5);
      var starGradient = c.createLinearGradient(-size, -size, size, size);
      starGradient.addColorStop(0, '#fff5c4');
      starGradient.addColorStop(0.55, '#f2c76f');
      starGradient.addColorStop(1, '#bd8430');
      c.fillStyle = starGradient;
      c.fill();
      c.strokeStyle = 'rgba(255, 248, 214, 0.55)';
      c.lineWidth = 1;
      c.stroke();
    } else if (type === 'candy') {
      c.lineCap = 'round';
      c.strokeStyle = '#f5eee1';
      c.lineWidth = size * 0.38;
      c.beginPath();
      c.moveTo(-size * 0.08, size * 0.74);
      c.lineTo(-size * 0.08, -size * 0.02);
      c.quadraticCurveTo(size * 0.2, -size * 0.56, size * 0.54, -size * 0.12);
      c.stroke();
      c.strokeStyle = '#c3414a';
      c.setLineDash([size * 0.24, size * 0.2]);
      c.lineWidth = size * 0.17;
      c.beginPath();
      c.moveTo(-size * 0.08, size * 0.74);
      c.lineTo(-size * 0.08, -size * 0.02);
      c.quadraticCurveTo(size * 0.2, -size * 0.56, size * 0.54, -size * 0.12);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = 'rgba(255,255,255,0.62)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-size * 0.17, size * 0.3);
      c.lineTo(-size * 0.17, -size * 0.12);
      c.stroke();
    } else if (type === 'bell') {
      c.fillStyle = '#d8a646';
      c.beginPath();
      c.moveTo(-size * 0.48, size * 0.44);
      c.quadraticCurveTo(-size * 0.3, size * 0.3, -size * 0.3, 0);
      c.quadraticCurveTo(-size * 0.3, -size * 0.64, 0, -size * 0.64);
      c.quadraticCurveTo(size * 0.3, -size * 0.64, size * 0.3, 0);
      c.quadraticCurveTo(size * 0.3, size * 0.3, size * 0.48, size * 0.44);
      c.closePath();
      var bellGradient = c.createLinearGradient(-size * 0.3, -size * 0.4, size * 0.3, size * 0.5);
      bellGradient.addColorStop(0, '#fff0b6');
      bellGradient.addColorStop(0.48, '#d8a646');
      bellGradient.addColorStop(1, '#8f5e23');
      c.fillStyle = bellGradient;
      c.fill();
      c.fillStyle = '#b67b2c';
      c.beginPath();
      c.arc(0, size * 0.5, size * 0.13, 0, PI2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.42)';
      c.beginPath();
      c.ellipse(-size * 0.12, -size * 0.18, size * 0.07, size * 0.18, -0.3, 0, PI2);
      c.fill();
    } else if (type === 'cookie') {
      c.fillStyle = '#a86a3f';
      c.strokeStyle = '#7f4d2d';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, -size * 0.38, size * 0.28, 0, PI2);
      c.fill();
      roundedRect(c, -size * 0.28, -size * 0.1, size * 0.56, size * 0.55, size * 0.16);
      c.fill();
      c.save();
      c.rotate(-0.55);
      roundedRect(c, -size * 0.56, -size * 0.06, size * 0.52, size * 0.16, size * 0.08);
      c.fill();
      c.restore();
      c.save();
      c.rotate(0.55);
      roundedRect(c, size * 0.04, -size * 0.06, size * 0.52, size * 0.16, size * 0.08);
      c.fill();
      c.restore();
      c.fillStyle = '#f4e4c8';
      c.beginPath();
      c.arc(-size * 0.1, -size * 0.43, size * 0.04, 0, PI2);
      c.arc(size * 0.1, -size * 0.43, size * 0.04, 0, PI2);
      c.fill();
      c.strokeStyle = '#f4e4c8';
      c.lineWidth = Math.max(1, size * 0.06);
      c.beginPath();
      c.arc(0, -size * 0.28, size * 0.1, 0.1, Math.PI - 0.1);
      c.stroke();
      c.fillStyle = '#f4e4c8';
      c.beginPath();
      c.arc(0, -size * 0.02, size * 0.05, 0, PI2);
      c.fill();
    } else {
      c.fillStyle = '#a63f48';
      roundedRect(c, -size * 0.5, -size * 0.3, size, size * 0.88, size * 0.08);
      var giftGradient = c.createLinearGradient(-size * 0.5, -size * 0.3, size * 0.5, size * 0.58);
      giftGradient.addColorStop(0, '#df7770');
      giftGradient.addColorStop(0.55, '#a63f48');
      giftGradient.addColorStop(1, '#69202c');
      c.fillStyle = giftGradient;
      c.fill();
      c.fillStyle = '#f0ca75';
      c.fillRect(-size * 0.07, -size * 0.3, size * 0.14, size * 0.88);
      c.fillRect(-size * 0.5, -size * 0.05, size, size * 0.14);
      c.fillStyle = '#e5bd68';
      c.beginPath();
      c.ellipse(-size * 0.18, -size * 0.38, size * 0.16, size * 0.1, -0.4, 0, PI2);
      c.ellipse(size * 0.18, -size * 0.38, size * 0.16, size * 0.1, 0.4, 0, PI2);
      c.fill();
    }

    c.restore();
  }

  function drawSnowfall(c, w, h, time, poster) {
    for (var i = 0; i < SNOW.length; i += 1) {
      var flake = SNOW[i];
      var sway = Math.sin(time * 0.00055 + flake.phase) * flake.drift;
      var x = (flake.x + sway) * w;
      var y = flake.y * h;
      var alpha = flake.a * (poster ? 0.7 : 0.66 + Math.sin(time * 0.001 + flake.phase) * 0.22);
      c.globalAlpha = alpha;
      c.fillStyle = '#f4fbff';
      c.beginPath();
      c.arc(x, y, flake.r * (poster ? 1.2 : 1), 0, PI2);
      c.fill();
      if (flake.r > 1.7) {
        c.globalAlpha = alpha * 0.55;
        c.fillRect(x - flake.r * 2.2, y - 0.4, flake.r * 4.4, 0.8);
        c.fillRect(x - 0.4, y - flake.r * 2.2, 0.8, flake.r * 4.4);
      }
    }
    c.globalAlpha = 1;
  }

  function starPath(c, x, y, radius, innerRadius, points) {
    c.beginPath();
    for (var i = 0; i < points * 2; i += 1) {
      var angle = -Math.PI / 2 + (i * Math.PI) / points;
      var r = i % 2 === 0 ? radius : innerRadius;
      var px = x + Math.cos(angle) * r;
      var py = y + Math.sin(angle) * r;
      if (i === 0) {
        c.moveTo(px, py);
      } else {
        c.lineTo(px, py);
      }
    }
    c.closePath();
  }

  function roundedRect(c, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + width - r, y);
    c.quadraticCurveTo(x + width, y, x + width, y + r);
    c.lineTo(x + width, y + height - r);
    c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    c.lineTo(x + r, y + height);
    c.quadraticCurveTo(x, y + height, x, y + height - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    var p = t - 1;
    return 1 + c3 * p * p * p + c1 * p * p;
  }

  function drawSpacedText(c, text, x, y, spacing, font, color, align) {
    c.font = font;
    c.fillStyle = color;
    var widths = [];
    var total = 0;
    for (var i = 0; i < text.length; i += 1) {
      widths[i] = c.measureText(text.charAt(i)).width;
      total += widths[i] + (i < text.length - 1 ? spacing : 0);
    }
    var cursor = align === 'center' ? x - total / 2 : x;
    c.textAlign = 'left';
    for (var j = 0; j < text.length; j += 1) {
      c.fillText(text.charAt(j), cursor, y);
      cursor += widths[j] + spacing;
    }
  }

  function renderPoster() {
    var pw = 900;
    var ph = 1200;
    var posterCanvas = document.createElement('canvas');
    posterCanvas.width = pw;
    posterCanvas.height = ph;
    var c = posterCanvas.getContext('2d');

    drawBackground(c, pw, ph, true, 0);

    var wash = c.createLinearGradient(0, 0, 0, ph);
    wash.addColorStop(0, 'rgba(4, 11, 21, 0.08)');
    wash.addColorStop(0.7, 'rgba(4, 11, 21, 0.08)');
    wash.addColorStop(1, 'rgba(4, 11, 21, 0.44)');
    c.fillStyle = wash;
    c.fillRect(0, 0, pw, ph);

    drawTreeScene(c, { x: 50, y: 168, w: 800, h: 660 }, state, true, 0);
    drawSnowfall(c, pw, ph, 0, true);

    c.strokeStyle = 'rgba(244, 206, 134, 0.3)';
    c.lineWidth = 1.5;
    roundedRect(c, 28, 28, pw - 56, ph - 56, 25);
    c.stroke();

    drawSpacedText(c, 'MERRY LITTLE TREE', pw / 2, 82, 5, '600 13px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', 'rgba(255, 247, 229, 0.74)', 'center');

    c.strokeStyle = 'rgba(244, 206, 134, 0.32)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(pw / 2 - 55, 101);
    c.lineTo(pw / 2 + 55, 101);
    c.stroke();

    c.textAlign = 'center';
    drawSpacedText(c, 'TO', pw / 2, 884, 5, 'italic 16px Baskerville, "Times New Roman", serif', 'rgba(244, 206, 134, 0.82)', 'center');

    var name = state.name ? state.name : 'YOU';
    c.font = 'italic 54px Baskerville, "Songti SC", "STSong", "Times New Roman", serif';
    c.fillStyle = '#fff4d9';
    c.textAlign = 'center';
    c.fillText(name, pw / 2, 942);

    c.font = '600 64px Baskerville, "Songti SC", "STSong", "Times New Roman", serif';
    c.fillStyle = '#f4ce86';
    c.fillText('Merry Christmas', pw / 2, 1030);

    c.font = '400 25px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    c.fillStyle = 'rgba(255, 247, 229, 0.74)';
    c.fillText('圣诞快乐 · ' + new Date().getFullYear(), pw / 2, 1083);

    c.strokeStyle = 'rgba(244, 206, 134, 0.26)';
    c.beginPath();
    c.moveTo(pw / 2 - 82, 1112);
    c.lineTo(pw / 2 + 82, 1112);
    c.stroke();

    drawSpacedText(c, 'A LITTLE WINTER WISH', pw / 2, 1150, 3, '500 10px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', 'rgba(255, 247, 229, 0.58)', 'center');
    return posterCanvas.toDataURL('image/jpeg', 0.94);
  }

  function openShare() {
    if (!state.ornaments.length) {
      toast('先挂几个挂饰，再生成贺卡吧');
      return;
    }
    syncHash(true);
    try {
      posterDataUrl = renderPoster();
      els.posterImg.src = posterDataUrl;
    } catch (error) {
      toast('贺卡生成失败，请再试一次');
      return;
    }

    var miniTool = window.xhs && window.xhs.miniTool;
    var nativeShare = !!(miniTool && typeof miniTool.share === 'function');
    var nativeSave = !!(miniTool && typeof miniTool.saveImageToPhotosAlbum === 'function');
    var webShare = !!navigator.share;

    if (nativeSave) {
      els.saveBtn.textContent = '保存到相册';
      els.posterTip.textContent = '图已生成，可以保存，也可以直接分享';
    } else {
      els.saveBtn.textContent = '长按保存';
      els.posterTip.textContent = '长按图片可以保存到相册';
    }

    if (nativeShare) {
      els.shareBtn.textContent = '分享贺卡';
    } else if (webShare) {
      els.shareBtn.textContent = '分享这棵树';
    } else {
      els.shareBtn.textContent = '拿到分享链接';
    }

    els.linkToggle.hidden = !!nativeShare;
    els.linkBox.hidden = true;
    els.shareLinkInput.value = '';
    els.shareOverlay.hidden = false;
    hideHint();
    try {
      els.closeShareBtn.focus();
    } catch (error) {
      // Focus is optional.
    }
  }

  function closeShare() {
    els.shareOverlay.hidden = true;
    try {
      els.lightBtn.focus();
    } catch (error) {
      // Focus is optional.
    }
  }

  function showShareLink() {
    syncHash(true);
    els.shareLinkInput.value = window.location.href;
    els.linkBox.hidden = false;
    try {
      els.shareLinkInput.focus();
      els.shareLinkInput.select();
    } catch (error) {
      // Selection is optional.
    }
    toast('长按链接复制，发给朋友');
  }

  function savePoster() {
    var miniTool = window.xhs && window.xhs.miniTool;
    if (!posterDataUrl) {
      toast('还没有生成贺卡');
      return;
    }

    if (miniTool && typeof miniTool.saveImageToPhotosAlbum === 'function') {
      var filePath = posterDataUrl;
      var canWriteTemp = typeof miniTool.writeTempFile === 'function';
      var work = canWriteTemp ? miniTool.writeTempFile({ data: posterDataUrl }).catch(function () {
        return null;
      }) : Promise.resolve(null);
      work.then(function (result) {
        if (result && result.filePath) {
          filePath = result.filePath;
        }
        return miniTool.saveImageToPhotosAlbum({ filePath: filePath });
      }).then(function () {
        toast('已保存到相册');
      }).catch(function (error) {
        if (error && error.errMsg) {
          toast('保存失败，请长按图片保存');
        } else {
          toast('保存失败，请长按图片保存');
        }
      });
      return;
    }

    toast('请长按上面的图片保存到相册');
    els.posterImg.scrollIntoView && els.posterImg.scrollIntoView({ block: 'center' });
  }

  function sharePoster() {
    var miniTool = window.xhs && window.xhs.miniTool;
    if (posterDataUrl && miniTool && typeof miniTool.share === 'function') {
      miniTool.share({
        type: 'image',
        image_resource: posterDataUrl
      }).then(function () {
        toast('分享面板已打开');
      }).catch(function (error) {
        var message = error && error.errMsg ? error.errMsg : '';
        toast(message.indexOf('15503') >= 0 ? '今天的分享次数用完了' : '分享没有完成，可以先保存图片');
      });
      return;
    }

    var shareUrl = window.location.href;
    if (navigator.share) {
      try {
        var result = navigator.share({
          title: '我装饰了一棵圣诞树',
          text: state.name ? state.name + '，这棵树送给你' : '这棵圣诞树送给你',
          url: shareUrl
        });
        if (result && typeof result.catch === 'function') {
          result.catch(function (error) {
            if (!error || error.name !== 'AbortError') {
              showShareLink();
            }
          });
        }
      } catch (error) {
        showShareLink();
      }
      return;
    }
    showShareLink();
  }

  function canvasPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function hitOrnament(point) {
    var geom = getTreeGeom(stageArea());
    for (var i = state.ornaments.length - 1; i >= 0; i -= 1) {
      var item = state.ornaments[i];
      var position = ornamentPoint(item, geom);
      var hitRadius = Math.max(20, geom.halfW * 0.105 * item.s * 1.5);
      var dx = point.x - position.x;
      var dy = point.y - position.y;
      if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
        return { index: i, position: position };
      }
    }
    return null;
  }

  function onPointerDown(event) {
    if (!els.shareOverlay.hidden) {
      return;
    }
    var point = canvasPoint(event);
    var hit = hitOrnament(point);
    if (!hit) {
      return;
    }

    var before = cloneState();
    var movedItem = state.ornaments.splice(hit.index, 1)[0];
    state.ornaments.push(movedItem);
    drag = {
      index: state.ornaments.length - 1,
      startX: point.x,
      startY: point.y,
      moved: false,
      before: before,
      pointerId: event.pointerId
    };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture is optional.
    }
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!drag) {
      return;
    }
    var point = canvasPoint(event);
    var dx = point.x - drag.startX;
    var dy = point.y - drag.startY;
    if (!drag.moved && Math.sqrt(dx * dx + dy * dy) > 5) {
      drag.moved = true;
      hideHint();
    }
    if (!drag.moved) {
      return;
    }

    var geom = getTreeGeom(stageArea());
    var item = state.ornaments[drag.index];
    var v = clamp((point.y - geom.topY) / geom.h, 0.035, 0.985);
    var u = clamp((point.x - geom.cx) / treeHalfAt(geom, v), -0.78, 0.78);
    item.u = round(u, 3);
    item.v = round(v, 3);
    item.born = 0;
    syncHash();
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (!drag) {
      return;
    }
    var finished = drag;
    drag = null;
    if (finished.moved) {
      historyStack.push(finished.before);
      if (historyStack.length > 32) {
        historyStack.shift();
      }
      updateUndo();
      haptic('light');
    }
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture is optional.
    }
    event.preventDefault();
  }

  function bindEvents() {
    els.undoBtn.addEventListener('click', undo);
    els.randomBtn.addEventListener('click', randomizeTree);
    els.clearBtn.addEventListener('click', clearTree);
    els.lightBtn.addEventListener('click', toggleLight);
    els.nameInput.addEventListener('input', function () {
      state.name = els.nameInput.value.slice(0, 12);
      syncHash();
    });
    els.nameInput.addEventListener('focus', hideHint);
    els.resetReceived.addEventListener('click', resetReceived);
    els.closeShareBtn.addEventListener('click', closeShare);
    els.saveBtn.addEventListener('click', savePoster);
    els.shareBtn.addEventListener('click', sharePoster);
    els.linkToggle.addEventListener('click', showShareLink);

    els.shareOverlay.addEventListener('click', function (event) {
      if (event.target === els.shareOverlay) {
        closeShare();
      }
    });

    canvas.addEventListener('pointerdown', onPointerDown, false);
    canvas.addEventListener('pointermove', onPointerMove, false);
    canvas.addEventListener('pointerup', onPointerUp, false);
    canvas.addEventListener('pointercancel', onPointerUp, false);

    window.addEventListener('resize', resize, false);
    window.addEventListener('orientationchange', function () {
      window.setTimeout(resize, 220);
    }, false);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !els.shareOverlay.hidden) {
        closeShare();
      }
    });

    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      if (pageVisible) {
        startLoop();
      } else {
        stopLoop();
      }
    });
  }

  function init() {
    var loaded = readInitialState();
    if (loaded) {
      state = loaded;
      receivedFromShare = true;
    }
    buildTreeColors();
    buildOrnamentTray();
    bindEvents();
    resize();
    updateAllUi();
    if (receivedFromShare) {
      showReceived();
    }
    startLoop();
  }

  init();
})();
