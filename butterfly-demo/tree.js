'use strict';

const $ = id => document.getElementById(id);
const width = 390;
const height = 428;
const center = width / 2;
const palettes = [
  { name: '冰蓝白', rich: ['#4a9bff', '#86d9ff'], pale: ['#d4f7ff', '#f8fdff'], accent: '#bce8ff', wash: '#213952' },
  { name: '粉白', rich: ['#ef6fad', '#ff9cc8'], pale: ['#ffd6ea', '#fff4fa'], accent: '#ffd1e7', wash: '#48283c' },
  { name: '紫白', rich: ['#a36cff', '#c393ff'], pale: ['#e7d7ff', '#fff7ff'], accent: '#e4cbff', wash: '#3b2e55' },
  { name: '暖金白', rich: ['#eda656', '#ffca72'], pale: ['#ffe7bd', '#fff9e9'], accent: '#ffe3a8', wash: '#483723' },
  { name: '极光青紫', rich: ['#42efc6', '#a377ff'], pale: ['#bcfff1', '#ecd9ff'], accent: '#baf5e6', wash: '#243e44' }
];
const customPalette = { name: '自选', rich: ['#4a9bff', '#80c7ff'], pale: ['#d4f7ff', '#ffffff'], accent: '#bce8ff', wash: '#213952' };
const allPalettes = palettes.concat(customPalette);
const customPaletteIndex = palettes.length;
const styles = ['侧光蝶影', '冰晶蝶翼', '幻彩蝶翼'];
const layoutNames = ['错落蝶群', '蝴蝶圣诞树'];
const butterflyColors = ['主色', '浅色', '双色'];
const overlays = { sparkle: true, bokeh: false };
const topperNames = ['金辉五角', '冰晶八芒', '银雪星芒'];

const canvas = $('scene');
const ctx = canvas.getContext('2d');
const layer = $('effects');
const fx = layer.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let palette = 0;
let customPaletteUsed = false;

let brushType = 0;
const dedication = {x:center, y:height-16};
let textDrag = null;
let topper = 2;
let butterflyStyle = 2;
let arrangement = 1;
let usePosedWings = true;
let crown = [];
let flutterUntil = 0;
let lightStart = -5000;
let newColor = 0;
let nextScale = 1;
let nextTint = null;
let newOpacity = .90;
let lit = false;
let selected = null;
let gesture = null;
let ornaments = [];

let sprites = [];
let frame = 0;
let lastFrame = 0;
let phase = 0;
let resolution = 1;
const starFrames = new Image();
const silverRibbon = new Image();
for (const image of [starFrames,silverRibbon]) image.onload = () => redraw();
starFrames.src = fixedBackdrop.frames;
silverRibbon.src = fixedBackdrop.silver;
const wingImages = wingSources.map(source => {
  const img = new Image();
  img.onload = () => { buildSprites(); redraw(); };
  img.src = source;
  return img;
});

function rng(seed) {
  return function () {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function alpha(hex, opacity) {
  const color = parseInt(hex.slice(1), 16);
  return 'rgba(' + [color >> 16, color >> 8 & 255, color & 255, opacity].join(',') + ')';
}

function circle(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function halo(g, x, y, r, color, opacity) {
  const glow = g.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, alpha(color, opacity));
  glow.addColorStop(0.28, alpha(color, opacity * 0.60));
  glow.addColorStop(1, alpha(color, 0));
  g.fillStyle = glow;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function sparkle(g, x, y, r, color, opacity) {
  g.save();
  g.translate(x, y);
  g.globalAlpha = opacity;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, -r);
  g.quadraticCurveTo(r * .12, -r * .13, r * .77, 0);
  g.quadraticCurveTo(r * .12, r * .12, 0, r);
  g.quadraticCurveTo(-r * .12, r * .12, -r * .77, 0);
  g.quadraticCurveTo(-r * .12, -r * .12, 0, -r);
  g.fill();
  g.restore();
}

// Wing outlines and branching veins are rasterized when the palette changes.
const sideBack = 'M -12 26 C -31 7 -65 -34 -73 -59 C -80 -85 -43 -65 -21 -41 C -7 -25 -5 -1 -12 26 Z';
const sideHind = 'M -11 27 C 7 5 27 -10 50 -8 C 67 -5 68 4 73 12 C 87 38 62 44 33 42 C 12 42 -3 37 -11 27 Z';
const sideFront = 'M -11 26 C -25 1 -24 -36 -9 -56 C 4 -75 25 -50 34 -43 C 45 -35 57 -37 56 -22 C 55 -5 20 17 -11 26 Z';
const crystalUpper = 'M 0 2 C 12 -22 33 -48 57 -61 L 76 -70 L 72 -49 L 67 -34 L 76 -24 L 63 -16 L 56 -5 L 42 2 L 26 10 L 0 5 Z';
const crystalLower = 'M 0 2 C 19 0 43 6 58 19 L 67 30 L 56 34 L 60 45 L 47 43 L 42 56 L 32 47 L 22 59 L 17 43 L 5 34 Z';
const astralUpper = 'M 0 4 C 9 -18 26 -48 49 -66 C 62 -77 77 -74 80 -61 C 84 -49 76 -38 72 -29 C 78 -20 69 -9 59 -5 C 59 6 46 12 35 10 C 24 18 9 14 0 4 Z';
const astralLower = 'M 0 3 C 18 -1 41 4 56 16 C 67 25 67 35 58 40 C 62 49 51 55 42 49 C 35 61 23 58 18 48 C 8 44 3 25 0 3 Z';

function paintWing(g, outline, color, origin, edge, endpoints, strength, crystal) {
  const wing = new Path2D(outline);
  const gradient = g.createRadialGradient(origin[0], origin[1], 1, origin[0], origin[1], 87);
  gradient.addColorStop(0, alpha('#ffffff', .96 * strength));
  gradient.addColorStop(.24, alpha(color, .73 * strength));
  gradient.addColorStop(.67, alpha(color, (crystal ? .16 : .37) * strength));
  gradient.addColorStop(1, alpha(color, .68 * strength));
  g.save();
  g.shadowColor = color;
  g.shadowBlur = crystal ? 14 : 9;
  g.fillStyle = gradient;
  g.fill(wing);
  g.strokeStyle = alpha(crystal ? '#f7fcff' : color, edge);
  g.lineWidth = crystal ? 1.8 : 1.35;
  g.lineJoin = 'round';
  g.stroke(wing);
  g.restore();

  g.save();
  g.clip(wing);
  endpoints.forEach(function (end, index) {
    const bendX = origin[0] * .37 + end[0] * .63;
    const bendY = origin[1] * .64 + end[1] * .36;
    g.beginPath();
    g.moveTo(origin[0], origin[1]);
    g.quadraticCurveTo(bendX, bendY, end[0], end[1]);
    g.lineWidth = crystal ? (index % 3 === 0 ? 1.35 : .82) : .72;
    g.lineCap = 'round';
    g.strokeStyle = alpha('#f7fcff', (crystal ? .90 : .72) * strength);
    g.stroke();
    if (index % 2 === 0) {
      g.beginPath();
      g.moveTo(bendX, bendY);
      g.quadraticCurveTo((bendX + end[0]) * .5 - 4, (bendY + end[1]) * .5 + 3, end[0] - 5, end[1] + 2);
      g.lineWidth = .55;
      g.strokeStyle = alpha('#ffffff', .58 * strength);
      g.stroke();
    }
  });
  if (!crystal) {
    g.beginPath();
    g.moveTo(origin[0], origin[1]);
    g.quadraticCurveTo(28, -19, 58, -30);
    g.strokeStyle = alpha('#ffffff', .48 * strength);
    g.lineWidth = .7;
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const x = 17 + i * 5.1;
      const y = -35 + i * 3.1;
      circle(g, x, y, i % 3 === 0 ? 1 : .6, alpha('#ffffff', .54 * strength));
    }
  }
  g.restore();
}

function makeButterfly(color, secondary, style, rich, dual) {
  const sprite = document.createElement('canvas');
  sprite.width = 204;
  sprite.height = 194;
  const g = sprite.getContext('2d');
  g.translate(102, 96);
  const strength = rich ? 1 : .78;
  if (wingImages[style].naturalWidth) {
    g.drawImage(wingImages[style], -99, -77, 198, 154);
    const pixels = g.getImageData(0,0,204,194);
    const channels = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
    const base = channels(color), other = channels(secondary);
    for (let i=0; i<pixels.data.length; i+=4) {
      const d = pixels.data;
      if (!d[i+3]) continue;
      const value = Math.max(d[i],d[i+1],d[i+2])/255;
      const glint = Math.pow(value,9)*.84;
      const blend = dual ? (i/4%204)/203 : 0;
      for (let c=0;c<3;c++) {
        const tint = base[c]*(1-blend)+other[c]*blend;
        d[i+c] = value*(tint*(1-glint)+255*glint);
      }
    }
    g.putImageData(pixels,0,0);
    return sprite;
  }
  halo(g, 0, 1, 92, color, style === 1 ? .18 : .21);
  if (style === 0) {
    paintWing(g, sideBack, secondary, [-12,26], .53, [[-66,-66],[-51,-65],[-35,-57],[-20,-38],[-17,-17]], strength * .70);
    paintWing(g, sideHind, secondary, [-12,26], .59, [[61,0],[73,16],[75,30],[59,38],[37,40]], strength * .77);
    paintWing(g, sideFront, color, [-12,26], .69, [[-7,-57],[7,-57],[21,-50],[35,-44],[51,-34],[53,-21],[42,-9]], strength);
    const dust = rng(1509);
    for (let i = 0; i < 22; i++) {
      const x = dust() * 151 - 73;
      const y = dust() * 115 - 70;
      circle(g, x, y, .35 + dust() * .68, alpha('#ffffff', .20 + dust() * .42));
    }
    halo(g, -11, 26, 22, '#ffffff', .72);
    g.save();
    g.translate(-11, 26);
    g.rotate(-.95);
    drawBody(g, 9);
    g.restore();
    return sprite;
  }

  for (const direction of [-1, 1]) {
    g.save();
    g.scale(direction, 1);
    if (style === 1) {
      paintWing(g, crystalLower, dual ? secondary : color, [0,3], .91, [[18,10],[34,12],[52,24],[62,31],[53,39],[46,49],[35,52],[22,47]], strength, true);
      paintWing(g, crystalUpper, color, [0,1], .95, [[12,-10],[28,-28],[47,-51],[65,-63],[74,-49],[66,-33],[57,-17],[42,-4]], strength, true);
      for (const fleck of [[70,-52,3.4],[63,-29,2.5],[48,-11,2.3],[35,48,3.2],[53,30,2.6]]) {
        halo(g, fleck[0], fleck[1], fleck[2] * 2.8, '#ffffff', .65);
      }
    } else {
      g.save();
      g.rotate(-.18);
      g.scale(.99, 1.14);
      paintWing(g, astralUpper, secondary, [0,2], .4, [[8,-9],[19,-28],[34,-48],[50,-65],[68,-68],[76,-55],[70,-36],[61,-19],[51,-7],[36,6]], strength * .48);
      paintWing(g, astralLower, secondary, [0,2], .27, [[10,9],[26,14],[44,18],[58,29],[57,39],[43,49],[29,49],[18,37]], strength * .48);
      g.restore();
      paintWing(g, astralLower, secondary, [0,4], .55, [[10,8],[25,12],[43,17],[58,28],[60,38],[48,48],[37,50],[27,45],[18,35]], strength);
      paintWing(g, astralUpper, color, [0,4], .62, [[8,-9],[19,-27],[34,-48],[51,-66],[68,-69],[77,-58],[73,-42],[65,-27],[58,-13],[48,-2],[34,8]], strength);
      for (const star of [[71,-54,3.5],[55,-28,2.7],[35,-13,2.1],[52,23,3.1],[35,39,2.4],[61,-37,1.8]]) {
        halo(g, star[0], star[1], star[2] * 3, color, .48);
        sparkle(g, star[0], star[1], star[2], '#ffffff', .86);
      }
    }
    g.restore();
  }
  halo(g, 0, 1, 19, '#ffffff', .59);
  drawBody(g, style === 1 ? 22 : 17);
  return sprite;
}

function drawBody(g, length) {
  g.beginPath();
  g.moveTo(0, length);
  g.quadraticCurveTo(-3, 2, 0, -10);
  g.moveTo(0, -6);
  g.quadraticCurveTo(3, -16, 9, -22);
  g.moveTo(0, -6);
  g.quadraticCurveTo(-3, -16, -9, -22);
  g.strokeStyle = '#f7fbff';
  g.lineWidth = 1.75;
  g.stroke();
  circle(g, 0, -6, 2.25, '#ffffff');
}

function paletteColors() { return allPalettes[palette]; }

function colorVariants() {
  const colors = paletteColors();
  return [
    { color: colors.rich[0], secondary: colors.rich[1], rich: true },
    { color: colors.rich[1], secondary: colors.rich[0], rich: true },
    { color: colors.pale[0], secondary: colors.pale[1], rich: false },
    { color: colors.pale[1], secondary: colors.pale[0], rich: false },
    { color: '#ffffff', secondary: colors.pale[0], rich: false },
    { color: colors.rich[0], secondary: colors.pale[0], rich: true, dual: true }
  ];
}

function buildSprites() {
  const variants = colorVariants();
  sprites = styles.map((_, style) => variants.map(item =>
    makeButterfly(item.color, item.secondary, style, item.rich, item.dual)));
}

function butterfly(x, y, size, random, row, column, angle, side) {
  return { x, y, size, row, column, angle: Number.isFinite(angle) ? angle : 0, tone: random(), color: random() < .5 ? 0 : 1,
    mirror: side < 0 ? -1 : 1, opacity: .76 + random() * .18, pinned: false, deleted: false };
}

function helixPoint(t) {
  const a = t * 21 + .8;
  return { x: center + Math.sin(a) * (7 + t * 154),
    y: 111 + t * 266 - Math.cos(a) * (1 + t * 22) };
}

const posedRows = [
[[195,190,37,0,-22]],[[191,222,46,2,-15],[211,229,30,0,18]],
[[176,254,48,2,-27],[209,260,43,1,15]],[[158,287,48,0,-16],[188,284,40,1,8],[223,296,54,2,21]],
[[173,320,53,2,-19],[207,323,44,0,24],[236,326,34,1,14]],
[[145,349,56,2,-22],[183,351,37,1,-9],[215,357,49,2,9],[250,355,44,0,34]],
[[132,382,45,1,-27],[163,385,48,2,8],[197,387,49,0,-9],[232,387,38,1,18],[268,391,56,2,18]],
[[143,418,56,2,-13],[180,421,47,0,10],[217,425,57,2,18],[254,421,39,1,16]],
[[110,450,57,0,-30],[147,453,48,2,6],[183,455,40,1,8],[215,458,50,0,-12],[249,452,47,2,13],[283,460,56,2,24]],
[[100,492,54,1,-18],[136,486,58,2,-23],[175,489,46,0,8],[208,493,48,2,11],[242,489,37,1,20],[277,495,50,0,15],[301,496,42,2,34]],
[[71,535,63,2,-29],[112,525,43,0,-6],[149,534,54,2,9],[186,529,42,1,-16],[219,535,56,2,3],[258,526,44,0,19],[290,534,56,1,15],[324,540,46,2,27]]];
function buildCrown(seed) {
  const random = rng(seed);
  crown = [];
  posedRows.forEach((row,r) => row.forEach(([x,y,w,pose,angle],col) => {
    const b = butterfly(center+(x-center)*.84, 117+(y-190)*.78,
      w*.65,random,r,col,angle*Math.PI/180,1);
    b.pose = pose;
    b.opacity = .98;
    b.tone = (crown.length * .61803398875 + .17) % 1;
    crown.push(b);
  }));
  const originals = crown.slice();
  while(crown.length < 108) {
    const ref = originals[Math.floor(random()*originals.length)];
    const b = butterfly(ref.x+(random()-.5)*28,ref.y+(random()-.5)*24,12+random()*5,random,ref.row,0,random()*.5,1);
    crown.push(b);
  }
}
function regenerate(seed) {
  const random = rng(seed);
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 15];
  const top = 124;
  const rowGap = 20;
  ornaments = [];
  selected = null;
  rows.forEach(function (count, row) {
    const half = 8 + row * 10.35;
    for (let column = 0; column < count; column++) {
      const offset = count === 1 ? 0 : (column / (count - 1) * 2 - 1) * half;
      const centerDistance = Math.abs(column - (count - 1) / 2);
      const pairIndex = Math.min(column, count - 1 - column);
      const pairRandom = rng((seed + row * 7919 + pairIndex * 104729) >>> 0);
      const side = Math.sign(offset);
      const size = 17 + row * .30 + (Math.round(centerDistance) % 3) * .8 + random() * 4.6;
      const yOffset = (row % 2 ? 3.2 : -1.8) + (random() - .5) * 4.8;
      const angle = side * (.025 + random() * .18) + (random() - .5) * .14;
      const rowShift = row % 2 ? 3.2 : -2.2;
      const xJitter = (random() - .5) * 9.2;
      const b = butterfly(center + offset + rowShift + xJitter, top + row * rowGap + yOffset,
        size, pairRandom, row, column, angle, side);
      b.tone = (row * .37 + pairIndex * .61803398875) % 1;
      b.color = (row + pairIndex) % 2;
      ornaments.push(b);
    }
  });

  buildCrown(seed);
}

function spreadRow(items, target) {
  if (target >= items.length) return items;
  if (target <= 0) return [];
  if (items.length > 1 && (items.length - target) % 2) {
    target = target < items.length ? target + 1 : target - 1;
  }
  if (target === 1) return [items[Math.floor(items.length / 2)]];
  const picked = [];
  for (let i = 0; i < target; i++) {
    const index = Math.round(i * (items.length - 1) / (target - 1));
    picked.push(items[index]);
  }
  return picked;
}

function activeButterflies() {
  if (arrangement === 1) {
    const count = Number($('density').value);
    return crown.filter((b,i) => !b.deleted && ((i<45 ? Math.floor((i+1)*Math.min(count,45)/45)>Math.floor(i*Math.min(count,45)/45) : i<count) || b.pinned))
      .concat(ornaments.filter(b => b.pinned && !b.deleted && b.row === undefined));
  }
  const density = Number($('density').value) / 108;
  const rows = new Map();
  const active = new Set(ornaments.filter(b => !b.deleted && b.pinned));
  ornaments.forEach(function (b) {
    if (b.deleted || b.row === undefined) return;
    if (!rows.has(b.row)) rows.set(b.row, []);
    rows.get(b.row).push(b);
  });
  rows.forEach(function (row) {
    row.sort((a, b) => a.column - b.column);
    const target = Math.max(1, Math.round(row.length * density));
    spreadRow(row, target).forEach(b => active.add(b));
  });
  return ornaments.filter(b => !b.deleted && active.has(b));
}

function butterflySize(b) { return b.size * (b.scale || 1) * Number($('size').value) / 100; }

function paintButterfly(g, b) {
  const rich = b.tone < Number($('rich').value) / 100;
  const style = b.customStyle === undefined ? (usePosedWings && b.pose !== undefined ? b.pose : butterflyStyle) : b.customStyle;
  const color = b.customColor === undefined ? (rich ? 0 : 2) + b.color :
    b.customColor === 2 ? 5 : b.customColor * 2 + b.color;
  let sprite = sprites[style][color];
  if (b.tint) {
    if (b.tintKey !== style+b.tint || !b.tintSprite) {
      b.tintKey = style+b.tint;
      b.tintSprite = makeButterfly(b.tint,b.tint,style,true,false);
    }
    sprite = b.tintSprite;
  }
  const s = butterflySize(b);
  g.save();
  g.translate(b.x, b.y);
  g.rotate(b.angle);
  const now = performance.now();
  if (b === selected && now < flutterUntil && !reducedMotion.matches)
    g.scale(1-.27*Math.pow(Math.sin((flutterUntil-now)/420*Math.PI*2),2),1);
  if (lit && !reducedMotion.matches && now-lightStart < 1550) {
    const distance = Math.abs(b.y-(400-(now-lightStart)*.22));
    if (distance < 36) halo(g,0,0,s*.85,paletteColors().pale[1],.55*(1-distance/36));
  }
  if (style === 0) g.scale(b.mirror, 1);
  g.globalAlpha = (b.opacityOverride !== undefined ? b.opacityOverride : newOpacity) * b.opacity * (lit ? 1 : .93);
  g.drawImage(sprite, -s * .67, -s * .64, s * 1.34, s * 1.28);
  g.restore();
}

const stardust = [];
const skyRandom = rng(12337);
for (let i = 0; i < 108; i++) {
  stardust.push({ x: 10 + skyRandom() * 370, y: 8 + skyRandom() * 407, r: skyRandom(),
    phase: skyRandom() * Math.PI * 2 });
}

function background(g) {
  const colors = paletteColors();
  g.fillStyle = '#04060d';
  g.fillRect(0, 0, width, height);
  halo(g, center, 253, 199, colors.rich[0], .105);
  halo(g, 265, 298, 143, colors.rich[1], .064);
  g.save();
  g.translate(center, 391);
  g.scale(1, .16);
  halo(g, 0, 0, 129, colors.rich[0], lit ? .32 : .19);
  g.restore();
  g.save();
  g.globalCompositeOperation = 'screen';
  if (starFrames.naturalWidth) {
    const {ends,w,h,columns} = fixedBackdrop;
    const clock = reducedMotion.matches ? 0 : phase*1000 % ends[ends.length-1];
    const i = ends.findIndex(end => clock < end);
    g.globalAlpha = .70;
    g.drawImage(starFrames,(i%columns)*w,Math.floor(i/columns)*h,w,h,32,61,326,359);
  }
  if (silverRibbon.naturalWidth) {
    g.globalAlpha = .70;
    g.drawImage(silverRibbon,49,103,292,289);
  }
  g.restore();
  stardust.forEach(function (p, i) {
    if (i % 3) circle(g, p.x, p.y, .36 + p.r * .7, alpha(colors.pale[i % 2], .13 + p.r * .31));
  });
}

function drawFacetedStar(g, rays, outer, inner, gold) {
  const count = rays * 2;
  const vertices = [];
  const innerRadius = inner;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / rays;
    const radius = i % 2 ? inner : outer;
    vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  const edge = gold ? '#fff0c8' : '#e4f8ff';
  const darkFacet = gold ? '#c69748' : '#77b9db';
  const lightFacet = gold ? '#fff9e8' : '#ffffff';
  g.save();
  g.shadowColor = gold ? '#ffd36a' : '#9be5ff';
  g.shadowBlur = lit ? 27 : 18;
  g.beginPath();
  vertices.forEach((point, index) => index ? g.lineTo(point[0], point[1]) : g.moveTo(point[0], point[1]));
  g.closePath();
  g.fillStyle = gold ? '#f6e2aa' : '#dcf5ff';
  g.fill();
  g.strokeStyle = edge;
  g.lineWidth = 1.1;
  g.stroke();
  g.shadowBlur = 0;
  g.save();
  g.clip();
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(vertices[i][0], vertices[i][1]);
    g.lineTo(vertices[next][0], vertices[next][1]);
    g.closePath();
    g.fillStyle = i % 2 ? lightFacet : (i % 4 ? edge : darkFacet);
    g.globalAlpha = i % 2 ? .62 : .75;
    g.fill();
    g.strokeStyle = alpha('#ffffff', .62);
    g.lineWidth = .65;
    g.stroke();
  }
  g.globalAlpha = .85;
  g.strokeStyle = alpha(edge, .8);
  g.lineWidth = rays >= 12 ? .45 : .7;
  for (let i = 0; i < count; i += rays >= 12 ? 2 : 1) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(vertices[i][0] * .83, vertices[i][1] * .83);
    g.stroke();
  }
  const glitter = rng(7319 + rays);
  for (let i = 0; i < rays * 5; i++) {
    const angle = glitter() * Math.PI * 2;
    const distance = Math.sqrt(glitter()) * outer * .82;
    circle(g, Math.cos(angle) * distance, Math.sin(angle) * distance, .35 + glitter() * .55,
      alpha('#ffffff', .4 + glitter() * .5));
  }
  g.restore();
  halo(g, 0, 0, rays >= 12 ? 12 : 14, '#ffffff', .86);
  circle(g, 0, 0, 2.8, '#ffffff');
  g.restore();
}

function drawCrystalBranches(g, radius, color) {
  g.save();
  g.strokeStyle = alpha('#ffffff', .92);
  g.lineWidth = 1.05;
  g.lineCap = 'round';
  g.shadowColor = color;
  g.shadowBlur = 8;
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 4;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const nx = -uy;
    const ny = ux;
    const start = radius * .23;
    const end = radius * .92;
    g.beginPath();
    g.moveTo(ux * start, uy * start);
    g.lineTo(ux * end, uy * end);
    g.stroke();
    [.56, .73].forEach(function (position, index) {
      const branchX = ux * radius * position;
      const branchY = uy * radius * position;
      const length = radius * (index ? .16 : .2);
      const forward = radius * .07;
      g.beginPath();
      g.moveTo(branchX - ux * forward, branchY - uy * forward);
      g.lineTo(branchX + nx * length, branchY + ny * length);
      g.moveTo(branchX - ux * forward, branchY - uy * forward);
      g.lineTo(branchX - nx * length, branchY - ny * length);
      g.stroke();
    });
  }
  g.restore();
  halo(g, 0, 0, 11, '#ffffff', .95);
  sparkle(g, 0, 0, 7, '#ffffff', 1);
}

function drawTopper(g) {
  const colors = paletteColors();
  const y = 87;
  const outer = lit ? 33 : 29;
  halo(g, center, y, 56, topper === 0 ? '#ffd885' : colors.accent, lit ? .7 : .5);
  g.save();
  g.translate(center, y);
  if (topper === 0) drawFacetedStar(g, 5, outer * .88, outer * .36, true);
  else if (topper === 1) drawFacetedStar(g, 8, outer, outer * .39, false);
  else {
    drawFacetedStar(g, 8, outer, outer * .36, false);
    drawCrystalBranches(g, outer, colors.accent);
  }
  g.restore();
}

function heading(g) {
  g.textAlign = 'center';
  g.fillStyle = paletteColors().pale[1];
  g.font = 'italic 29px Georgia, serif';
  g.fillText('Merry Christmas', center, 37);
  const name = $('name').value.trim();
  if (name) {
    g.font = '12px sans-serif';
    g.fillStyle = $('text-color').value;
    const half = dedicationHalfWidth();
    dedication.x = clamp(dedication.x, half+4, width-half-4);
    g.fillText('送给 ' + name, dedication.x, dedication.y, 344);
  }
}

function paintBase(g, includeSelection) {
  background(g);
  for (const stroke of starStrokes) for (const p of stroke) {
    if(p.type===2) halo(g,p.x,p.y,p.r,'#d2eaff',.52);
    else if(p.type===1) circle(g,p.x,p.y,p.r,'rgba(209,236,255,.8)');
    else sparkle(g,p.x,p.y,p.r,'#eff9ff',.92);
  }

  const active = activeButterflies();
  active.forEach(b => paintButterfly(g, b));
  drawTopper(g);
  if (lit && !reducedMotion.matches) {
    const pulse = 1-Math.abs(performance.now()-lightStart-1450)/240;
    if (pulse > 0) sparkle(g,center,87,17+20*pulse,'#ffffff',pulse);
  }
  heading(g);
  if (includeSelection && selected) {
    const s = butterflySize(selected);
    g.save();
    g.strokeStyle = paletteColors().accent;
    g.setLineDash([2, 4]);
    g.beginPath();
    g.arc(selected.x, selected.y, Math.max(12, s * .52), 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
}

function paintEffects(g, time) {
  const colors = paletteColors();
  const strength = lit ? 1 : .76;
  stardust.forEach((p,i)=>{
    const pulse=(.76+.2*Math.sin(p.phase+time))*strength;
    if(overlays.sparkle && i%5===0) sparkle(g,p.x,p.y,1.4+p.r*3.1,colors.pale[i%2],pulse);
    if(overlays.bokeh && i%3===0 && Math.abs(p.x-center)>105 && p.y>70)
      halo(g,p.x,p.y,5+p.r*13,colors.pale[i%2],pulse*.37);
  });
}

function redraw() {
  paintBase(ctx, true);
  redrawEffects();
}

function redrawEffects() {
  fx.clearRect(0, 0, width, height);
  fx.save();
  paintEffects(fx, phase);
  fx.restore();
}

function animate(now) {
  frame = 0;
  const animateBackground = starFrames.naturalWidth;
  if (reducedMotion.matches || document.hidden) return;
  if (now - lastFrame > 32) {
    phase = now / 1000;
    if (animateBackground || lastFrame < flutterUntil || (lit && lastFrame-lightStart < 1710)) paintBase(ctx, true);
    redrawEffects();
    lastFrame = now;
  }
  frame = requestAnimationFrame(animate);
}

function syncAnimation() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  const animateBackground = starFrames.naturalWidth;
  if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(animate);
}

function resize() {
  const stage = canvas.parentElement;
  const cssWidth = Math.min(stage.clientWidth,stage.clientHeight * width / height);
  for (const c of [canvas,layer]) {
    c.style.width = cssWidth + 'px';
    c.style.height = Math.round(cssWidth * height / width) + 'px';
  }
  if (!cssWidth) return;
  canvas.style.height = Math.round(cssWidth / width * height) + 'px';
  resolution = Math.min(2, window.devicePixelRatio || 1);
  [canvas, layer].forEach(function (c) {
    c.width = Math.round(cssWidth * resolution);
    c.height = Math.round(canvas.clientHeight * resolution);
    c.getContext('2d').setTransform(c.width / width, 0, 0, c.height / height, 0, 0);
  });
  redraw();
}

function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * width, y: (event.clientY - rect.top) / rect.height * height };
}

function hit(p) {
  const active = activeButterflies();
  for (let i = active.length - 1; i >= 0; i--) {
    const b = active[i];
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const x = dx * Math.cos(b.angle) + dy * Math.sin(b.angle);
    const y = -dx * Math.sin(b.angle) + dy * Math.cos(b.angle);
    if (Math.hypot(x, y * 1.35) <= butterflySize(b) * .49) return b;
  }
  return null;
}

function clamp(value, low, high) { return Math.max(low, Math.min(value, high)); }

function updateHint(message) {
  $('remove').disabled = !selected || lit;
  syncButterflyTools();
  $('hint').textContent = message || (lit ? '预览贺卡 · 可填写收卡人名字' :
    selected ? '已选中蝴蝶 · 可拖动或删除' : activeTool === 'background' ? '滑动画布绘制星星' : activeTool === 'butterfly' ? '拖动蝴蝶调整位置 · 点空白添加' : '选择装饰，或点亮你的圣诞树');
}

function deselect() {
  selected = null;
  updateHint();
  redraw();
}

function erase() {
  if (!selected || lit) return;
  selected.deleted = true;
  selected = null;
  updateHint('已删除 · 点空白添加蝴蝶');
  redraw();
}

function start(event) {
  if (lit || activeTool !== 'butterfly' || gesture || (event.button !== undefined && event.button !== 0)) return;
  const p = point(event);
  const ornament = hit(p);
  gesture = { id: event.pointerId, start: p, ornament,
    dx: ornament ? ornament.x - p.x : 0, dy: ornament ? ornament.y - p.y : 0, moved: false };
  if (ornament) {
    canvas.focus({ preventScroll: true });
    event.preventDefault();
    selected = ornament;
    flutterUntil = performance.now()+420;
    syncAnimation();
    updateHint();
    redraw();
  }
  if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
}

function move(event) {
  if (!gesture || gesture.id !== event.pointerId || !gesture.ornament) return;
  const p = point(event);
  if (!gesture.moved && Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) < 3) return;
  gesture.moved = true;
  const b = gesture.ornament;
  b.x = clamp(p.x + gesture.dx, 10, width - 10);
  b.y = clamp(p.y + gesture.dy, 67, height - 15);
  b.pinned = true;
  paintBase(ctx, true);
}

function finish(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const g = gesture;
  gesture = null;
  if (event.type !== 'pointerup' || g.ornament) return;
  const p = point(event);
  if (Math.hypot(p.x - g.start.x, p.y - g.start.y) > 7) return;
  if (p.y < 64 || p.y > height - 10) {
    updateHint('请点树附近的空白添加蝴蝶');
    return;
  }
  if (ornaments.filter(b => b.pinned && !b.deleted).length >= 90) {
    updateHint('请先删除一只蝴蝶，再添加');
    return;
  }
  const b = butterfly(p.x, p.y, 35, Math.random);
  b.pinned = true;
  b.scale = nextScale;
  b.tint = nextTint;
  b.customColor = newColor;
  b.customStyle = butterflyStyle;
  b.opacity = 1;
  ornaments.push(b);
  selected = b;
  updateHint('已添加蝴蝶 · 可拖动或删除');
  redraw();
}

function choices(id, labels, current, callback, colors) {
  const group = $(id);
  labels.forEach(function (label, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(index === current));
    if (colors) {
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = 'linear-gradient(90deg,' + colors[index].rich.join(',') + ',' + colors[index].pale[1] + ')';
      swatch.setAttribute('aria-hidden', 'true');
      button.appendChild(swatch);
    }
    button.appendChild(document.createTextNode(label));
    button.addEventListener('click', function () {
      const pressed = group.querySelector('[aria-pressed=true]');
      if (pressed) pressed.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      callback(index);
      redraw();
    });
    group.appendChild(button);
  });
}

function setLit(value) {
  lit = value;
  $('launch').hidden = value || !!activeTool;
  if (value) lightStart = performance.now();
  selected = null;
  canvas.style.cursor = value ? 'default' : 'crosshair';
  $('edit-panel').hidden = value;
  $('card-panel').hidden = !value;
  $(value ? 'step-edit' : 'step-card').removeAttribute('aria-current');
  $(value ? 'step-card' : 'step-edit').setAttribute('aria-current', 'step');
  $('result').textContent = '';
  updateHint();
  redraw();
  syncAnimation();
  $(value ? 'name' : 'light').focus({ preventScroll: true });
}

async function saveCard() {
  const output = document.createElement('canvas');
  output.width = 1170;
  output.height = 1284;
  const g = output.getContext('2d');
  g.scale(3, 3);
  paintBase(g, false);
  paintEffects(g, phase);
  if (window.xhs && window.xhs.miniTool) {
    const sdk = window.xhs.miniTool;
    const readVersion = options => options && options.miniToolEnv && options.miniToolEnv.buildVersion;
    try {
      let version = readVersion(window.xhs.launchOptions);
      if (!version && typeof sdk.getLaunchOptions === 'function') version = readVersion(await sdk.getLaunchOptions());
      if (!/^[1-9][0-9]{6,}$/.test(String(version)) || Math.floor(Number(version) / 1000) < 9420 ||
          typeof sdk.saveImageToPhotosAlbum !== 'function') {
        $('result').textContent = '当前客户端无法保存到相册';
        return;
      }
      const data = output.toDataURL('image/png');
      const file = typeof sdk.writeTempFile === 'function' ? await sdk.writeTempFile({ data }) : { filePath: data };
      await sdk.saveImageToPhotosAlbum({ filePath: file.filePath });
      $('result').textContent = '贺卡已存入相册';
    } catch (error) {
      $('result').textContent = '保存失败，请重试';
    }
    return;
  }
  output.toBlob(function (blob) {
    if (!blob) {
      $('result').textContent = '生成失败，请重试';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '蝴蝶圣诞树.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    $('result').textContent = '已生成 PNG 贺卡';
  }, 'image/png');
}

function pressChoice(id, active) {
  Array.from($(id).children).forEach((button, index) => button.setAttribute('aria-pressed', String(index === active)));
}

function mixHex(first, second, ratio) {
  const a = Number.parseInt(first.slice(1), 16);
  const b = Number.parseInt(second.slice(1), 16);
  const channels = [16, 8, 0].map(shift => Math.round(((a >> shift) & 255) * (1 - ratio) + ((b >> shift) & 255) * ratio));
  return '#' + channels.map(value => value.toString(16).padStart(2, '0')).join('');
}

function applyPalette() {
  const colors = paletteColors();
  document.documentElement.style.setProperty('--accent', colors.accent);
  document.documentElement.style.setProperty('--wash', colors.wash);
  buildSprites();
  updateColorSwatches();
  syncButterflyTools();
}

function updateColorSwatches() {
  const colors = paletteColors();
  Array.from($('palettes').children).forEach(function (button, index) {
    button.firstElementChild.style.background = 'linear-gradient(90deg,' + allPalettes[index].rich[0] + ',' + allPalettes[index].pale[1] + ')';
  });
  $('rich-color').value = colors.rich[0];
  $('pale-color').value = colors.pale[0];
  const swatches = [colors.rich, colors.pale, [colors.rich[0], colors.pale[0]]];
  Array.from($('butterfly-colors').children).forEach(function (button, index) {
    button.firstElementChild.style.background = 'linear-gradient(90deg,' + swatches[index].join(',') + ')';
  });
}

function syncButterflyTools() {
  const b = selected;
  $('individual-title').textContent = b ? '已选蝴蝶' : '点空处添蝶';
  const pct = Math.round((b ? b.scale || 1 : nextScale)*100);
  $('wing-size').value = pct;
  $('wing-size-out').textContent = pct+'%';
  const scheme = paletteColors();
  const tone = b && b.customColor === undefined ? (b.tone < Number($('rich').value)/100 ? 0 : 1) : b ? b.customColor : newColor;
  $('wing-color').value = (b ? b.tint : nextTint) || (tone === 1 ? scheme.pale[0] : scheme.rich[0]);
  $('tool-title').textContent = b ? '已选蝴蝶' : '新蝴蝶';
  $('single-style').hidden = !b;
  $('deselect').hidden = !b;
  if (b) pressChoice('single-styles', b.customStyle === undefined ? (usePosedWings && b.pose !== undefined ? b.pose : butterflyStyle) : b.customStyle);
  const color = b ? (b.customColor === undefined ? (b.tone < Number($('rich').value) / 100 ? 0 : 1) : b.customColor) : newColor;
  pressChoice('butterfly-colors', color);
  const opacity = Math.round((b && b.opacityOverride !== undefined ? b.opacityOverride : newOpacity) * 100);
  $('opacity-scope').textContent = b ? '选中蝴蝶浓淡' : '整树浓淡';
  $('opacity').value = opacity;
  $('opacity-out').textContent = opacity + '%';
}

choices('palettes', allPalettes.map(p => p.name), palette, function (index) {
  if (index === customPaletteIndex && palette !== customPaletteIndex && !customPaletteUsed) {
    const current = paletteColors();
    customPalette.rich = current.rich.slice();
    customPalette.pale = current.pale.slice();
    customPalette.accent = current.accent;
    customPalette.wash = current.wash;
    customPaletteUsed = true;
  }
  palette = index;
  applyPalette();
}, allPalettes);
choices('styles', styles, butterflyStyle, index => {
  usePosedWings = false;
  butterflyStyle = index;
  syncButterflyTools();
});
choices('layouts', layoutNames, arrangement, index => {
  arrangement = index;
  selected = null;
  updateHint('拖动蝴蝶调整位置 · 点空白添加');
});
choices('single-styles', styles, butterflyStyle, index => {
  if (!selected) return;
  selected.customStyle = index;
  selected.pinned = true;
});
choices('butterfly-colors', butterflyColors, newColor, index => {
  if (selected) {
    selected.tint = null;
    selected.customColor = index;
    selected.pinned = true;
  } else {newColor = index; nextTint = null;}
  syncButterflyTools();
}, butterflyColors.map(() => ({ rich: ['#ffffff'], pale: ['#ffffff', '#ffffff'] })));
$('rich-color').addEventListener('change', function () {
  if (palette !== customPaletteIndex) {
    const colors = paletteColors();
    customPalette.rich = colors.rich.slice();
    customPalette.pale = colors.pale.slice();
    customPaletteUsed = true;
  }
  palette = customPaletteIndex;
  customPalette.rich[0] = $('rich-color').value;
  customPalette.rich[1] = mixHex(customPalette.rich[0], '#ffffff', .26);
  customPalette.accent = mixHex(customPalette.rich[0], customPalette.pale[1], .66);
  customPalette.wash = mixHex(customPalette.rich[0], '#06070b', .78);
  pressChoice('palettes', palette);
  applyPalette();
  redraw();
});
$('pale-color').addEventListener('change', function () {
  if (palette !== customPaletteIndex) {
    const colors = paletteColors();
    customPalette.rich = colors.rich.slice();
    customPalette.pale = colors.pale.slice();
    customPaletteUsed = true;
  }
  palette = customPaletteIndex;
  customPalette.pale[0] = $('pale-color').value;
  customPalette.pale[1] = mixHex(customPalette.pale[0], '#ffffff', .54);
  customPalette.accent = mixHex(customPalette.rich[0], customPalette.pale[1], .66);
  customPalette.wash = mixHex(customPalette.rich[0], '#06070b', .78);
  pressChoice('palettes', palette);
  applyPalette();
  redraw();
});
$('opacity').addEventListener('input', function () {
  const opacity = Number($('opacity').value) / 100;
  if (selected) {
    selected.opacityOverride = opacity;
    selected.pinned = true;
  } else {
    newOpacity = opacity;
    for (const b of crown.concat(ornaments)) delete b.opacityOverride;
  }
  syncButterflyTools();
  redraw();
});
for (const btn of $('effects-choices').querySelectorAll('button')) {
  btn.onclick = () => {
    const key = btn.dataset.overlay;
    overlays[key] = !overlays[key];
    btn.setAttribute('aria-pressed',String(overlays[key]));
    redraw();
  };
}
choices('brushes',['星簇','细闪','柔光点'],0,index=>{brushType=index;});
choices('topper-choices', topperNames, topper, index => { topper = index; });
['rich', 'density', 'size'].forEach(function (id) {
  $(id).addEventListener('input', function () {
    $(id + '-out').textContent = $(id).value + (id === 'density' ? '' : '%');
    if (selected && !activeButterflies().includes(selected)) selected = null;
    updateHint();
    redraw();
  });
});

let activeTool = '';
const starStrokes = [];
let brush = null;
function selectTool(tool) {
  activeTool = tool;
  brush = null;
  gesture = null;
  selected = null;
  $('launch').hidden = !!tool;
  $('edit-panel').hidden = !tool;
  document.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== tool);
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tool)));
  $('tool-body').scrollTop = 0;
  $('reset').hidden = tool !== 'butterfly';
  updateHint(tool === 'background' ? '滑动画布绘制星星' : tool === 'butterfly' ? '点空处添蝶 · 拖动调整位置' : '蝴蝶圣诞树');
  resize();
}
$('tabs').addEventListener('click', e => { if(e.target.dataset.tab) selectTool(e.target.dataset.tab); });
$('decorate').onclick = () => selectTool('butterfly');
$('done').onclick = () => selectTool('');
$('preview').onclick = () => setLit(true);
$('undo').onclick = () => { brush = null; starStrokes.pop(); $('undo').disabled = !starStrokes.length; redraw(); };
function stamp(stroke,x,y) {
  const count = brushType===1 ? 16 : brushType===2 ? 5 : 6+Math.floor(Math.random()*4);
  for(let i=0;i<count;i++){
    const a=Math.random()*2*Math.PI, r=Math.sqrt(Math.random())*15;
    stroke.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,type:brushType,
      r:brushType===2 ? 3+Math.random()*5 : brushType===1 ? .4+Math.random() : 1+Math.random()*2.6});
  }
}
function dedicationHalfWidth(){
  ctx.save();ctx.font='12px sans-serif';
  const w=Math.min(344,ctx.measureText('送给 '+$('name').value.trim()).width)/2;
  ctx.restore();return w;
}
canvas.addEventListener('pointerdown',e=>{
  if(!lit || !$('name').value.trim() || textDrag || e.button!==0) return;
  const p=point(e);
  if(Math.abs(p.x-dedication.x)>dedicationHalfWidth()+8 || Math.abs(p.y-dedication.y+5)>14) return;
  textDrag={id:e.pointerId,dx:dedication.x-p.x,dy:dedication.y-p.y};
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!textDrag || textDrag.id!==e.pointerId) return;
  const p=point(e), half=dedicationHalfWidth();
  dedication.x=clamp(p.x+textDrag.dx,half+4,width-half-4);
  dedication.y=clamp(p.y+textDrag.dy,16,height-5);
  redraw();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])
  canvas.addEventListener(type,e=>{if(textDrag && textDrag.id===e.pointerId) textDrag=null;});
$('text-color').oninput=redraw;
canvas.addEventListener('pointerdown', e => {
  if(lit || activeTool !== 'background' || brush || e.button !== 0) return;
  const p = point(e);
  const stroke = [];
  stamp(stroke,p.x,p.y);
  starStrokes.push(stroke);
  brush = {id:e.pointerId,stroke,last:p};
  canvas.setPointerCapture(e.pointerId);
  $('undo').disabled = false;
  redraw();
});
canvas.addEventListener('pointermove', e => {
  if(!brush || brush.id !== e.pointerId) return;
  const p = point(e), stroke = brush.stroke, last = brush.last;
  const distance = Math.hypot(p.x-last.x,p.y-last.y);
  for(let step=15;step<=distance;step+=15) {
    const x=last.x+(p.x-last.x)*step/distance, y=last.y+(p.y-last.y)*step/distance;
    if(x<0 || x>width || y<0 || y>height) break;
    stamp(stroke,x,y);
    brush.last={x,y};
  }
  if(distance>=15) redraw();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])
  canvas.addEventListener(name,e => { if(brush && brush.id===e.pointerId) brush=null; });
const hasPointer = 'PointerEvent' in window;
canvas.addEventListener(hasPointer ? 'pointerdown' : 'mousedown', start);
canvas.addEventListener(hasPointer ? 'pointermove' : 'mousemove', move);
canvas.addEventListener(hasPointer ? 'pointerup' : 'mouseup', finish);
canvas.addEventListener(hasPointer ? 'pointercancel' : 'mouseleave', finish);
canvas.addEventListener('keydown', function (event) {
  if (event.key === 'Delete' || event.key === 'Backspace') erase();
  if (event.key === 'Escape') deselect();
});
$('remove').addEventListener('click', erase);
$('deselect').addEventListener('click', deselect);
$('reset').addEventListener('click', function () {
  if (ornaments.concat(crown).some(b => b.pinned || b.deleted) &&
      !confirm('重新生成会清除手动移动、添加和删除，继续吗？')) return;
  regenerate(Date.now() >>> 0);
  updateHint('已重新生成 · 拖动或点空白继续装饰');
  redraw();
});
$('light').addEventListener('click', () => setLit(true));
$('back').addEventListener('click', () => { setLit(false); selectTool(activeTool || 'butterfly'); });
$('name').addEventListener('input', redraw);
$('export').addEventListener('click', saveCard);
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', syncAnimation);
if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncAnimation);
else if (reducedMotion.addListener) reducedMotion.addListener(syncAnimation);

$('wing-size').oninput = function(){
  const scale = Number(this.value)/100;
  if(selected){selected.scale=scale;selected.pinned=true;} else nextScale=scale;
  syncButterflyTools();redraw();
};
$('wing-color').oninput = function(){
  if(selected){selected.tint=this.value;selected.pinned=true;} else nextTint=this.value;
  redraw();
};
regenerate(121625);
buildSprites();
updateColorSwatches();
syncButterflyTools();
updateHint();
resize();
syncAnimation();

if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);
