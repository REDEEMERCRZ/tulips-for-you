'use strict';

// Edit this block to personalize the gift. Colors run from shadow to highlight.
const CONFIG = {
  letter: {
    recipient: 'Baby', // Use {recipient} in the greeting or letter to insert this name.
    sender: '', // Add a name for a signature, or place it yourself with {sender}.
    greeting: 'I have something for you ♡',
    message: `Hi {recipient},

Alam ko recently wala talaga akong effort na nagawa para sayo because of the limitations and ayun nga nagtalo pa tayo
ito na yung bawi ko, sa paraan na alam ko. hindi man ako maganda sumulat sa papel at least dito maganda yung letter ko.
wala man akong bulaklak na nabigay sayo sana rito ay makabawi ako.
Im sorry sa mga nangyari. MAHAL NA MAHAL KITA.

I hope this little surprise reminds you of how much you mean to me.`,
    envelopeColor: '#e6a9bd', // Six-digit hex colors.
    sealColor: '#b95073',
    typingSpeed: 66, // Characters per second.
    surpriseButton: 'I LOVE YOU BABY KO♡',
  },
  messages: {
    title: 'I LOVE YOU ♡', // The final bouquet message.
  },
  flowerCount: 7, // Whole numbers from 1 to 12.
  flowerColors: {
    pink: ['#5b2448', '#df6ba8', '#ffc6df'],
    lavender: ['#412b66', '#9c75dc', '#e4caff'],
    blush: ['#652a46', '#e583a1', '#ffd6df'],
    white: ['#59415d', '#d5adce', '#fff1ed'],
  },
  animation: {
    introSpeed: 1, // Multiplier for the whole introduction.
    typingSpeed: 1, // Multiplier for the heading's typewriter effect.
    swaySpeed: 1, // Multiplier for the bouquet and rabbit's idle motion.
    particleSpeed: 1, // Multiplier for drifting hearts and sparks.
    titleAt: 8.15, // Seconds into the introduction at normal speed.
  },
};

const canvas = document.querySelector('#bouquet');
const context = canvas.getContext('2d');
const gift = document.querySelector('.gift');
const stage = document.querySelector('.stage');
const replayButton = document.querySelector('#replay');
const backButton = document.querySelector('#back-to-envelope');
const announcement = document.querySelector('#announcement');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const height = 510;
const center = 310;
const atlasScale = 2;
const mono = 'Consolas, "Liberation Mono", monospace';
const tau = 2 * Math.PI;
const radians = Math.PI / 180;

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const mix = (a, b, t) => a + (b - a) * t;
const fraction = (value) => value - Math.floor(value);
const noise = (x, y, seed) => fraction(Math.sin(x * 127.1 + y * 311.7 + seed * 13.71) * 43758.5453);
const ease = (amount) => amount * amount * (3 - 2 * amount);
const reveal = (time, start, duration) => ease(clamp((time - start) / duration));

function curve([x, y], ...segments) {
  const points = [[x, y]];
  for (const segment of segments) {
    if (segment.length === 2) {
      [x, y] = segment;
      points.push(segment);
      continue;
    }
    const [a, b, c, d, endX, endY] = segment;
    for (let step = 1; step <= 14; step++) {
      const t = step / 14;
      const u = 1 - t;
      points.push([
        u ** 3 * x + 3 * u * u * t * a + 3 * u * t * t * c + t ** 3 * endX,
        u ** 3 * y + 3 * u * u * t * b + 3 * u * t * t * d + t ** 3 * endY,
      ]);
    }
    x = endX;
    y = endY;
  }
  return points;
}

function oval(x, y, width, length, angle = 0) {
  return Array.from({ length: 36 }, (_, index) => {
    const theta = index * tau / 36;
    const dx = Math.cos(theta) * width;
    const dy = Math.sin(theta) * length;
    return [x + dx * Math.cos(angle) - dy * Math.sin(angle), y + dx * Math.sin(angle) + dy * Math.cos(angle)];
  });
}

function palette(colors, underpaint = .26) {
  const rgb = colors.map((color) => [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16)));
  return Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    const pair = t < .54 ? 0 : 1;
    const amount = pair === 0 ? t / .54 : (t - .54) / .46;
    const ink = rgb[pair].map((channel, i) => Math.round(mix(channel, rgb[pair + 1][i], amount)));
    const base = ink.map((channel, i) => Math.round(mix([13, 9, 15][i], channel, underpaint)));
    return { ink: `rgb(${ink.join(',')})`, base: `rgb(${base.join(',')})` };
  });
}

const flowerPalettes = Object.fromEntries(Object.entries(CONFIG.flowerColors).map(([name, colors]) => [name, palette(colors)]));
const colors = {
  stems: palette(['#15382e', '#478d70', '#b4d8a0'], .20),
  leaves: palette(['#17352f', '#589f85', '#c4e1af'], .24),
  paper: palette(['#352335', '#a1668c', '#e5bbcf'], .31),
  fold: palette(['#2d2437', '#77668f', '#d1bde2'], .29),
  ribbon: palette(['#642941', '#e17c9d', '#ffe0e5'], .38),
  rabbit: palette(['#564256', '#c29faa', '#fff1e7'], .61),
  cheeks: palette(['#644056', '#c67999', '#ffd3de'], .52),
};

// Scan-convert the overlapping surfaces on a monospace grid. Each cell belongs
// to the foremost surface at that position, so the contours stay readable.
function scanRow(points, y) {
  const edges = [];
  let [lastX, lastY] = points[points.length - 1];
  for (const [x, nextY] of points) {
    if ((nextY > y) !== (lastY > y)) {
      edges.push(mix(lastX, x, (y - lastY) / (nextY - lastY)));
    }
    lastX = x;
    lastY = nextY;
  }
  return edges.sort((a, b) => a - b);
}

function sprite(surfaces, seed, cellWidth = 4, cellHeight = 5.1) {
  const points = surfaces.flatMap(({ points: outline }) => outline);
  const left = Math.floor(Math.min(...points.map(([x]) => x)) / cellWidth) * cellWidth - cellWidth;
  const right = Math.ceil(Math.max(...points.map(([x]) => x)) / cellWidth) * cellWidth + cellWidth;
  const top = Math.floor(Math.min(...points.map(([, y]) => y)) / cellHeight) * cellHeight - cellHeight;
  const bottom = Math.ceil(Math.max(...points.map(([, y]) => y)) / cellHeight) * cellHeight + cellHeight;
  const bitmap = document.createElement('canvas');
  bitmap.width = Math.ceil((right - left) * atlasScale);
  bitmap.height = Math.ceil((bottom - top) * atlasScale);
  const paint = bitmap.getContext('2d');
  paint.scale(atlasScale, atlasScale);
  paint.font = `${cellWidth * 1.86}px ${mono}`;
  paint.textAlign = 'center';
  paint.textBaseline = 'middle';

  for (let y = top + cellHeight / 2; y < bottom; y += cellHeight) {
    const row = surfaces.map((surface) => scanRow(surface.points, y));
    for (let x = left + cellWidth / 2; x < right; x += cellWidth) {
      for (let layer = surfaces.length - 1; layer >= 0; layer--) {
        const edges = row[layer];
        let segment = 0;
        while (segment < edges.length && (x < edges[segment] || x >= edges[segment + 1])) segment += 2;
        if (segment >= edges.length) continue;

        const surface = surfaces[layer];
        const u = (x - edges[segment]) / (edges[segment + 1] - edges[segment]);
        const r = noise(x, y, seed);
        const grain = noise(x + 52, y - 13, seed);
        const { tone, marks } = surface.shade(x, y, u, r);
        const tint = surface.colors[Math.round(clamp(tone + (grain - .5) * .15) * 24)];
        // A muted color under each glyph separates overlapping petals and folds.
        paint.fillStyle = tint.base;
        paint.fillRect(x - left - cellWidth / 2, y - top - cellHeight / 2, cellWidth + .18, cellHeight + .18);
        paint.fillStyle = tint.ink;
        paint.fillText(marks[Math.floor(r * marks.length)], x - left, y - top);
        break;
      }
    }
  }
  return { bitmap, left, top, right, bottom };
}

function drawSprite(image) {
  context.drawImage(image.bitmap, image.left, image.top, image.bitmap.width / atlasScale, image.bitmap.height / atlasScale);
}

function growSprite(image, amount, below = image.bottom) {
  if (amount <= 0) return;
  if (amount >= 1) {
    drawSprite(image);
    return;
  }
  const edge = mix(below, image.top, amount);
  context.save();
  context.beginPath();
  context.rect(image.left, edge, image.right - image.left + 1, image.bottom - edge + 1);
  context.clip();
  drawSprite(image);
  context.restore();
}

const petalOutlines = [
  curve([0, 3], [-28, 1, -42, -20, -44, -49], [-45, -66, -37, -80, -33, -90], [-22, -89, -12, -82, -6, -79], [3, -90, 14, -98, 22, -95], [34, -91, 43, -72, 44, -55], [48, -27, 27, 4, 0, 3]),
  curve([-33, -82], [-19, -85, -10, -74, -4, -71], [5, -77, 17, -92, 26, -89], [36, -85, 38, -64, 33, -51], [22, -42, -19, -38, -32, -56], [-38, -65, -36, -75, -33, -82]),
  curve([-2, 5], [-28, 4, -47, -22, -46, -50], [-45, -66, -40, -77, -44, -89], [-30, -86, -19, -75, -13, -59], [-4, -36, 3, -10, -2, 5]),
  curve([-3, 3], [2, -14, 10, -45, 23, -67], [31, -78, 39, -81, 46, -86], [42, -68, 51, -58, 46, -38], [43, -13, 24, 5, -3, 3]),
  curve([0, 6], [-18, 5, -29, -10, -32, -27], [-35, -45, -28, -63, -28, -75], [-13, -73, -5, -65, -1, -59], [9, -65, 17, -74, 29, -75], [33, -56, 31, -41, 28, -27], [24, -8, 17, 5, 0, 6]),
];

function petalSurface(points, pigments, layer) {
  return {
    points,
    colors: pigments,
    shade(x, y, u, r) {
      const lift = clamp((-y + 3) / 94);
      const edge = Math.min(u, 1 - u);
      const light = [.55, .12, .48, .39, .55][layer];
      const fold = [0.4, 0.72, 0.23, .74, .45][layer];
      const ridge = Math.exp(-((u - fold) ** 2) / .047);
      const vein = Math.sin((u + Math.sin(y * .056) * .078) * 35 + y * .08);
      const rim = Math.max(0, .15 - edge) * (layer === 1 ? 0 : 1.9) * lift;
      const tone = light + lift * .32 + ridge * .20 + vein * .057 + rim - (1 - lift) ** 2 * .34;
      const slant = x < -6 ? '/' : '\\';
      let marks = lift > .76 || edge < .16 ? ".:+**'" : `.:++*${slant}${slant}xx`;
      if (layer === 1) marks = '.::+.-';
      if (r > .8 && vein > .25) marks = `++*${slant}${slant}#`;
      return { tone, marks };
    },
  };
}

// Ordered back to front. Coordinates locate the calyx, where the petals meet the stem.
const flowerLayout = [
  { x: 196, y: 170, width: 35, length: 75, angle: -23, color: 'lavender' },
  { x: 259, y: 135, width: 37, length: 84, angle: -13, color: 'pink' },
  { x: 334, y: 113, width: 38, length: 86, angle: 6, color: 'white' },
  { x: 402, y: 149, width: 38, length: 81, angle: 16, color: 'lavender' },
  { x: 466, y: 206, width: 35, length: 79, angle: 27, color: 'blush' },
  { x: 151, y: 220, width: 37, length: 80, angle: -24, color: 'blush' },
  { x: 333, y: 218, width: 40, length: 87, angle: 11, color: 'pink' },
];

function arrangeFlowers() {
  const total = clamp(Math.round(CONFIG.flowerCount), 1, 12);
  if (total === 7) return flowerLayout;
  if (total < 7) {
    const layouts = [[], [2], [1, 3], [1, 3, 6], [0, 2, 4, 6], [0, 1, 2, 4, 6], [0, 1, 2, 3, 4, 5]];
    const selected = layouts[total].map((index) => flowerLayout[index]);
    const average = selected.reduce((sum, flower) => sum + flower.x, 0) / total;
    return selected.map((flower) => ({ ...flower, x: center + (flower.x - average) * .93 }));
  }
  const extras = [
    { x: 228, y: 222, width: 31, length: 71, angle: -13, color: 'white' },
    { x: 405, y: 222, width: 32, length: 66, angle: 17, color: 'pink' },
    { x: 294, y: 173, width: 32, length: 72, angle: -8, color: 'blush' },
    { x: 191, y: 247, width: 31, length: 65, angle: -21, color: 'lavender' },
    { x: 441, y: 249, width: 31, length: 65, angle: 23, color: 'white' },
  ];
  return flowerLayout.concat(extras.slice(0, total - 7));
}

function stemSprite(flower, index) {
  const { x, y } = flower;
  const lean = (x - center) * .2;
  return sprite([{
    points: curve([x - 3, y - 5], [x - lean, y + 65, center + lean, 310, center - 3, 409],
      [center + 4, 409], [center + lean + 10, 309, x - lean + 8, y + 62, x + 4, y - 4]),
    colors: colors.stems,
    shade: (_x, _y, u) => ({ tone: .28 + .58 * (1 - u), marks: '/|:+x' }),
  }], index + 11, 3.1, 4.7);
}

function makeFlower(flower, index, total) {
  const pigments = flowerPalettes[flower.color];
  const surfaces = petalOutlines.map((outline, layer) => petalSurface(outline, pigments, layer));
  const phase = index / Math.max(1, total - 1);
  const calyx = sprite([{
    points: curve([-12, -3], [-10, 7, -3, 12, 0, 14], [4, 11, 10, 7, 12, -4], [3, 2, -6, 1, -12, -3]),
    colors: colors.stems,
    shade: (_x, y, u) => ({ tone: .32 + .4 * (1 - u) + .018 * y, marks: '.:+/x' }),
  }], index + 40, 3.2, 4.2);
  return {
    ...flower,
    phase,
    stem: stemSprite(flower, index),
    layers: [sprite(surfaces.slice(0, 2), index + 8, 3.5, 4.5), sprite(surfaces, index + 8, 3.5, 4.5)],
    calyx,
  };
}

function makeLeaf(x, y, endX, endY, width, seed, front) {
  const dx = endX - x;
  const dy = endY - y;
  const angle = Math.atan2(dx, -dy);
  const length = Math.hypot(dx, dy);
  const bend = Math.sign(dx) * width * .84;
  const points = curve([0, 3], [-width * .81, -length * .24, -width - bend * .4, -length * .6, bend, -length],
    [width * .12 + bend, -length * .77, width * 1.32, -length * .52, width * .67, -length * .26],
    [width * .43, -length * .14, width * .14, -length * .06, 0, 3]);
  const image = sprite([{
    points,
    colors: colors.leaves,
    shade(_x, localY, u) {
      const lift = -localY / length;
      const vein = .47 + .10 * Math.sin(lift * 3.4);
      const ridge = Math.exp(-((u - vein) ** 2) / .006);
      const hatching = Math.sin(lift * 73 + Math.abs(u - vein) * 12) * .09;
      const tone = .20 + lift * .28 + ridge * .26 + hatching + (u < vein ? .18 : -.06) + (front ? .04 : 0);
      return { tone, marks: u < vein ? '.:+/x/' : '.:-\\\\' };
    },
  }], seed, 3.4, 4.6);
  return { x, y, image, angle, front, start: 2.7 + noise(seed, 5, 55) * 1.8 };
}

const layout = arrangeFlowers();
const flowers = layout.map((flower, index) => makeFlower(flower, index, layout.length));
const leaves = [
  makeLeaf(280, 326, 160, 214, 23, 21, false),
  makeLeaf(282, 328, 218, 163, 18, 22, false),
  makeLeaf(296, 324, 271, 192, 15, 23, false),
  makeLeaf(326, 319, 353, 172, 17, 24, false),
  makeLeaf(335, 332, 446, 199, 21, 25, false),
  makeLeaf(339, 334, 493, 228, 19, 26, false),
  makeLeaf(298, 348, 198, 251, 27, 27, true),
  makeLeaf(321, 350, 417, 245, 26, 28, true),
  makeLeaf(313, 333, 286, 231, 15, 29, true),
];

function paperSurface(points, pigments, fold, brightness) {
  return {
    points,
    colors: pigments,
    shade(x, y, u, r) {
      const rim = Math.min(u, 1 - u) < .047 ? .23 : 0;
      const crease = Math.exp(-((u - fold) ** 2) / .027) * .21;
      const ridges = Math.sin(x * .19 + y * .106) * .045;
      const fade = clamp((425 - y) / 160) * .19;
      const marks = u > .6 ? ".:.\\\"+" : ".:.'/+";
      return { tone: brightness + rim + crease + ridges + fade, marks: r > .91 ? 'x+' : marks };
    },
  };
}

const backPaper = sprite([
  paperSurface(curve([308, 410], [260, 372, 209, 317, 176, 269], [206, 279, 232, 265, 247, 252],
    [273, 275, 293, 286, 309, 310], [330, 282, 354, 271, 375, 248],
    [399, 263, 417, 273, 450, 265], [405, 323, 348, 374, 311, 411]), colors.fold, .75, .28),
  paperSurface(curve([186, 267], [215, 271, 237, 260, 247, 252], [251, 277, 274, 299, 308, 336],
    [266, 320, 226, 305, 186, 267]), colors.paper, .63, .43),
  paperSurface(curve([375, 248], [397, 265, 424, 270, 450, 265], [420, 293, 384, 311, 329, 335],
    [350, 297, 374, 274, 375, 248]), colors.fold, .58, .44),
], 61, 3.5, 4.5);

const frontPaper = sprite([
  paperSurface(curve([190, 291], [234, 285, 272, 303, 306, 318], [348, 294, 399, 277, 437, 276],
    [394, 317, 361, 358, 329, 389], [330, 401, 342, 414, 344, 421],
    [322, 429, 293, 431, 278, 422], [286, 406, 290, 400, 293, 387],
    [262, 359, 221, 325, 190, 291]), colors.paper, .65, .37),
  paperSurface(curve([190, 291], [226, 293, 261, 302, 304, 323], [318, 348, 320, 371, 313, 391],
    [278, 376, 239, 339, 190, 291]), colors.paper, .68, .43),
  paperSurface(curve([437, 276], [407, 302, 372, 341, 329, 388], [317, 386, 308, 389, 300, 387],
    [326, 359, 343, 339, 372, 319], [392, 304, 419, 284, 437, 276]), colors.fold, .18, .53),
  paperSurface(curve([295, 389], [306, 394, 319, 394, 329, 389], [332, 402, 336, 410, 344, 421],
    [330, 424, 320, 425, 309, 423], [311, 414, 310, 403, 295, 389]), colors.fold, .62, .47),
], 62, 3.5, 4.5);

function ribbonSurface(points, brightness) {
  return {
    points,
    colors: colors.ribbon,
    shade(x, _y, u) {
      const tone = brightness + Math.sin(u * Math.PI) * .24 + Math.cos(x * .18) * .10;
      return { tone, marks: '.:+x*/' };
    },
  };
}

const ribbon = sprite([
  ribbonSurface(curve([288, 380], [297, 384, 321, 385, 335, 378], [331, 385, 330, 389, 327, 391],
    [318, 396, 300, 392, 291, 389], [288, 385, 288, 382, 288, 380]), .52),
  ribbonSurface(curve([311, 386], [302, 392, 300, 408, 284, 414], [281, 414], [285, 419], [278, 427],
    [300, 423, 303, 406, 313, 394]), .41),
  ribbonSurface(curve([312, 388], [320, 393, 327, 403, 341, 406], [336, 410], [337, 418],
    [319, 413, 316, 402, 310, 394]), .46),
  ribbonSurface(curve([306, 388], [288, 391, 274, 386, 275, 376], [277, 360, 296, 368, 308, 384],
    [302, 380, 286, 367, 282, 375], [280, 382, 297, 385, 306, 384]), .68),
  ribbonSurface(curve([313, 387], [326, 365, 348, 362, 347, 374], [345, 387, 330, 391, 314, 391],
    [323, 386, 341, 380, 341, 374], [341, 369, 322, 380, 313, 387]), .71),
  ribbonSurface(oval(311, 387, 8, 6, -.08), .79),
], 65, 2.9, 3.7);

function fur(points, pigments, brightness) {
  return {
    points,
    colors: pigments,
    shade(x, y, u) {
      const roundedLight = Math.sin(Math.PI * u) * .28;
      const cheekLight = Math.exp(-((x + 13) ** 2 + (y + 13) ** 2) / 1100) * .18;
      return { tone: brightness + roundedLight + cheekLight, marks: ".::+'*o" };
    },
  };
}

const rabbitBody = sprite([
  fur(oval(29, 27, 13, 11, -.25), colors.rabbit, .48),
  fur(oval(0, 23, 31, 29), colors.rabbit, .52),
  fur(oval(-19, 45, 15, 8, -.17), colors.rabbit, .65),
  fur(oval(19, 45, 15, 8, .17), colors.rabbit, .61),
  fur(oval(-28, -36, 11, 27, -.42), colors.rabbit, .61),
  fur(oval(27, -39, 11, 29, .38), colors.rabbit, .56),
  fur(oval(-29, -39, 5, 20, -.42), colors.cheeks, .56),
  fur(oval(28, -42, 5, 21, .38), colors.cheeks, .52),
  fur(oval(0, -1, 39, 28), colors.rabbit, .72),
], 48, 3.0, 4.0);

const rabbitPaws = sprite([
  fur(oval(-25, -34, 9, 8, -.25), colors.rabbit, .62),
  fur(oval(25, -34, 9, 8, .25), colors.rabbit, .61),
], 49, 2.7, 3.5);

function mark(paint, glyph, x, y, size, pigment, alpha = 1) {
  paint.globalAlpha = alpha;
  paint.font = `${size}px ${mono}`;
  paint.fillStyle = pigment;
  paint.fillText(glyph, x, y);
}

function drawFace(time, rest, opacity) {
  const blink = !rest && (time + 2.1) % 6.7 < .16;
  const eye = blink ? '−' : '●';
  mark(context, eye, -13, -3, 13, '#291824', opacity);
  mark(context, eye, 13, -3, 13, '#291824', opacity);
  if (!blink) {
    mark(context, '·', -14, -5, 8, '#fff5ec', opacity);
    mark(context, '·', 12, -5, 8, '#fff5ec', opacity);
  }
  mark(context, '♥', 0, 3, 10, '#79354f', opacity);
  mark(context, 'ᴗ', 0, 9, 15, '#43263c', opacity);
  mark(context, '///', -23, 7, 8, '#9e426b', opacity);
  mark(context, '///', 23, 7, 8, '#9e426b', opacity);
}

const effectsCanvas = document.querySelector('#effects');
const effects = effectsCanvas.getContext('2d');
const stageView = { width: 565, scaleX: 1, scaleY: 1 };
const screenView = { width: 0, height: 0, scaleX: 1, scaleY: 1 };
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
const state = {
  frame: null, lastFrame: null, elapsed: 0, clock: 0, runningSlow: 0, density: 2,
  reduced: motion.matches, complete: false, background: -1, bursts: [], effectsDirty: false,
};

const ambience = Array.from({ length: 54 }, (_, index) => ({
  x: noise(index, 2, 73),
  y: 18 + noise(index, 2, 14) * 471,
  phase: noise(index, 82, 3) * tau,
  pace: .5 + noise(index, 44, 4) * 1.6,
  size: 5 + noise(index, 7, 6) * 7,
  color: ['#ad6e9a', '#c58eaa', '#a587c4', '#ffe3e4'][index % 4],
}));

const constellations = [
  [-184, 51, '·', 17, '#bca0d3'], [-118, 50, '✦', 9, '#b7a0ce'], [133, 48, '·', 15, '#edb5d6'],
  [191, 75, '+', 13, '#dfabd1'], [-205, 108, '+', 14, '#e8a9c6'], [206, 104, '·', 12, '#c199df'],
  [-206, 230, '✦', 13, '#eac0dc'], [208, 230, '+', 14, '#d7b8e7'], [-191, 301, '·', 17, '#deacd3'],
  [178, 322, '✦', 14, '#e2b0d2'], [-126, 368, '+', 13, '#cc9ecb'], [120, 397, '·', 16, '#edb3d2'],
];

const idleHearts = [
  { x: -184, y: 158, size: 16, speed: 8, phase: 0, glyph: '♡' },
  { x: 165, y: 217, size: 12, speed: 12, phase: 1.4, glyph: '♡' },
  { x: 199, y: 282, size: 18, speed: 9, phase: 2.4, glyph: '♡' },
  { x: -154, y: 300, size: 11, speed: 13, phase: 3.1, glyph: '♥' },
  { x: 127, y: 350, size: 13, speed: 10, phase: 3.7, glyph: '♡' },
  { x: -90, y: 404, size: 16, speed: 11, phase: 4.2, glyph: '♡' },
];

function drawAmbience(time, clock, rest) {
  const spread = stageView.width / 2 - 10;
  const gain = reveal(time, .48, 4.1);
  const sparkle = reveal(time, 6.85, 2.7);
  const driftTime = rest ? 0 : clock * CONFIG.animation.particleSpeed;
  const count = [19, 33, ambience.length][state.density];
  context.shadowColor = '#d384b2';
  for (let index = 0; index < count; index++) {
    const particle = ambience[index];
    const early = index < 5 ? .42 : 0;
    const alpha = (early + gain * .46) * (.52 + .38 * Math.sin(particle.phase + driftTime * particle.pace));
    if (alpha < .035) continue;
    const x = center + (particle.x * 2 - 1) * spread + Math.sin(driftTime * .42 + particle.phase) * 5;
    const y = particle.y + Math.cos(driftTime * .44 + particle.phase) * 5;
    context.shadowBlur = early ? 4 * stageView.scaleX : 0;
    mark(context, index % 8 === 0 ? ':' : '·', x - pointer.x * 2, y - pointer.y * 2, particle.size, particle.color, alpha);
  }
  context.shadowBlur = 0;
  for (const [x, y, glyph, size, color] of constellations) {
    const flicker = .62 + Math.sin(driftTime * 1.45 + y * .04) * .22;
    mark(context, glyph, center + x - pointer.x * 4, y - pointer.y * 3, size, color, sparkle * flicker);
  }
  const heartGain = reveal(time, 7.25, 2.8);
  for (const heart of idleHearts) {
    const travel = rest ? 0 : ((driftTime - 11) * heart.speed) % 94;
    const x = center + heart.x + Math.sin(driftTime * .75 + heart.phase) * 5 - pointer.x * 5;
    const y = heart.y - travel;
    const fade = 1 - reveal(Math.abs(travel), 62, 32);
    mark(context, heart.glyph, x, y, heart.size, '#e990b7', (.53 + Math.sin(driftTime + heart.phase) * .17) * fade * heartGain);
  }
  context.globalAlpha = 1;
}

function drawRabbit(time, clock, paws) {
  const amount = reveal(time, .65, 1.6);
  if (amount === 0) return;
  const breathe = state.reduced ? 0 : Math.sin(clock * 1.75 * CONFIG.animation.swaySpeed);
  context.save();
  context.globalAlpha = amount;
  context.translate(center + pointer.x * 2.6, 443 + (1 - amount) * 13 + breathe * 1.1);
  context.scale(1 + breathe * .012, 1 - breathe * .019);
  if (paws) {
    drawSprite(rabbitPaws);
  } else {
    drawSprite(rabbitBody);
    if (amount > .56) drawFace(clock, state.reduced, amount);
    const loop = ((clock + 2.25) * CONFIG.animation.particleSpeed) % 8.25;
    if (!state.reduced && time > 8 && loop < 2.5) {
      const opacity = Math.sin(loop / 2.5 * Math.PI) * .78;
      mark(context, '♡', 55 + Math.sin(loop * 1.2) * 3, -18 - loop * 14, 17, '#f09dc7', opacity);
    }
  }
  context.restore();
}

function drawLeaf(leaf, time, clock) {
  const amount = reveal(time, leaf.start, 1.72);
  if (amount === 0) return;
  const sway = state.reduced ? 0 : Math.sin(clock * 1.32 + leaf.x * .16) * .022;
  context.save();
  context.translate(leaf.x, leaf.y);
  context.rotate(leaf.angle * mix(.53, 1, amount) + sway);
  context.scale(mix(.19, 1, amount), mix(.07, 1, amount));
  context.globalAlpha *= mix(.24, 1, amount);
  drawSprite(leaf.image);
  context.restore();
}

function flowerSway(flower, clock) {
  if (state.reduced) return 0;
  return Math.sin(clock * 1.14 + flower.phase * tau) * .009;
}

function drawStem(flower, time, clock) {
  const amount = reveal(time, 1.6 + flower.phase * .83, 2.7);
  context.save();
  context.translate(center, 394);
  context.rotate(flowerSway(flower, clock));
  context.translate(-center, -394);
  growSprite(flower.stem, amount, 411);
  context.restore();
}

function drawBloom(flower, time, clock) {
  const start = 4.07 + flower.phase * 1.38;
  const bud = reveal(time, start, 1.65);
  if (bud === 0) return;
  const opening = reveal(time, start + .40, 1.77);
  const sway = flowerSway(flower, clock);
  context.save();
  context.translate(center, 394);
  context.rotate(sway);
  context.translate(flower.x - center, flower.y - 394);
  context.rotate((flower.angle + (1 - opening) * -flower.angle * .35) * radians);

  context.globalAlpha *= bud;
  context.save();
  context.scale(flower.width / 45 * mix(.24, 1, opening), flower.length / 88 * mix(.14, 1, bud));
  if (opening < 1) {
    context.globalAlpha *= 1 - opening;
    growSprite(flower.layers[0], bud, 6);
    context.globalAlpha = bud * opening;
  }
  growSprite(flower.layers[1], bud, 6);
  context.restore();
  drawSprite(flower.calyx);
  context.restore();
}

function drawPaper(image, amount, origin) {
  if (amount === 0) return;
  context.save();
  context.translate(center, origin);
  context.scale(mix(.76, 1, amount), mix(.91, 1, amount));
  context.translate(-center, -origin);
  context.globalAlpha *= amount;
  drawSprite(image);
  context.restore();
}

function renderBouquet(time) {
  const clock = state.clock * CONFIG.animation.swaySpeed;
  const motionGain = reveal(time, 1, 2);
  const breeze = state.reduced ? 0 : Math.sin(clock * .85) * .011 * motionGain;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(stageView.scaleX, 0, 0, stageView.scaleY, (stageView.width / 2 - center) * stageView.scaleX, 0);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  drawAmbience(time, state.clock, state.reduced);
  drawRabbit(time, state.clock, false);

  context.save();
  context.translate(center + pointer.x * 3.7 * motionGain, 390 + pointer.y * 2.2 * motionGain);
  context.rotate(breeze + pointer.x * .014 * motionGain);
  context.translate(-center, -390);
  drawPaper(backPaper, reveal(time, 6.05, 1.55), 388);
  for (const flower of flowers) drawStem(flower, time, clock);
  for (const leaf of leaves) {
    if (!leaf.front) drawLeaf(leaf, time, clock);
  }
  for (const flower of flowers) drawBloom(flower, time, clock);
  for (const leaf of leaves) {
    if (leaf.front) drawLeaf(leaf, time, clock);
  }
  drawPaper(frontPaper, reveal(time, 6.45, 1.38), 391);
  drawPaper(ribbon, reveal(time, 7.17, 1.06), 387);
  context.restore();
  drawRabbit(time, state.clock, true);
}

function graphemes(value) {
  if (!('Segmenter' in Intl)) return Array.from(value);
  return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), ({ segment }) => segment);
}

function makeTypewriter(id, content) {
  const target = document.querySelector(`#${id}-visual`);
  document.querySelector(`#${id}-accessible`).textContent = content;
  const prefix = document.createTextNode('');
  const caret = document.createElement('span');
  const suffix = document.createElement('span');
  suffix.className = 'pending';
  target.replaceChildren(prefix, caret, suffix);
  const characters = graphemes(content);
  let previousCount = -1;
  return {
    length: characters.length,
    caret,
    update(count, showCursor) {
      if (count === previousCount) return;
      previousCount = count;
      prefix.textContent = characters.slice(0, Math.max(0, count - 1)).join('');
      caret.textContent = characters[count - 1] ?? '';
      caret.classList.toggle('cursor', showCursor && count > 0 && count < characters.length);
      suffix.textContent = characters.slice(count).join('');
    },
  };
}

const title = makeTypewriter('title', CONFIG.messages.title);
const typingSpeed = Math.max(.05, CONFIG.animation.typingSpeed);
const titleSpeed = 21 * typingSpeed;
const introductionEnd = Math.max(10.05, CONFIG.animation.titleAt + title.length / titleSpeed);

function updateDedication(time) {
  title.update(clamp(Math.floor((time - CONFIG.animation.titleAt) * titleSpeed), 0, title.length), !state.reduced);
  if (time >= introductionEnd && !state.complete) {
    state.complete = true;
    replayButton.hidden = false;
    backButton.hidden = false;
    announcement.textContent = 'The bouquet is in bloom.';
  }
}

function sizeCanvas(target, width, height, limit) {
  const ratio = Math.min(window.devicePixelRatio || 1, limit, Math.sqrt(2600000 / (width * height)));
  const pixelsWide = Math.max(1, Math.round(width * ratio));
  const pixelsHigh = Math.max(1, Math.round(height * ratio));
  if (target.width !== pixelsWide) target.width = pixelsWide;
  if (target.height !== pixelsHigh) target.height = pixelsHigh;
}

function resize() {
  const bounds = stage.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return;
  stageView.width = height * bounds.width / bounds.height;
  sizeCanvas(canvas, bounds.width, bounds.height, 2.5);
  stageView.scaleX = canvas.width / stageView.width;
  stageView.scaleY = canvas.height / height;
  const screen = effectsCanvas.getBoundingClientRect();
  screenView.width = screen.width;
  screenView.height = screen.height;
  sizeCanvas(effectsCanvas, screen.width, screen.height, 2);
  screenView.scaleX = effectsCanvas.width / (screen.width || 1);
  screenView.scaleY = effectsCanvas.height / (screen.height || 1);
  draw();
}

function releaseHearts(x, y) {
  const count = state.reduced ? 4 : [5, 8, 11][state.density];
  for (let index = 0; index < count; index++) {
    const scatter = (index / (count - 1) - .5) * 2;
    state.bursts.push({
      x: x + scatter * (state.reduced ? 23 : 7),
      y: y + (state.reduced ? Math.abs(scatter) * 14 - 14 : 0),
      vx: scatter * 62 + (Math.random() - .5) * 20,
      vy: -40 - Math.random() * 61,
      birth: state.clock,
      life: state.reduced ? .55 : 1.05 + Math.random() * .8,
      size: 12 + Math.random() * 11,
      color: ['#f49dbf', '#ddafe9', '#ffcfde', '#e784b3'][index % 4],
      glyph: index % 3 === 0 ? '♥' : '♡',
    });
  }
  if (state.bursts.length > 100) state.bursts.splice(0, state.bursts.length - 100);
  schedule();
}

function drawBursts() {
  if (!state.effectsDirty && state.bursts.length === 0) return;
  effects.setTransform(1, 0, 0, 1, 0, 0);
  effects.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
  effects.setTransform(screenView.scaleX, 0, 0, screenView.scaleY, 0, 0);
  effects.textAlign = 'center';
  effects.textBaseline = 'middle';
  state.bursts = state.bursts.filter((heart) => state.clock - heart.birth < heart.life);
  for (const heart of state.bursts) {
    const age = state.clock - heart.birth;
    const movement = state.reduced ? 0 : age * CONFIG.animation.particleSpeed;
    const x = heart.x + heart.vx * movement;
    const y = heart.y + heart.vy * movement + movement ** 2 * 13;
    const opacity = state.reduced ? .90 : 1 - reveal(age, heart.life * .24, heart.life * .76);
    mark(effects, heart.glyph, x, y, heart.size, heart.color, opacity);
  }
  effects.globalAlpha = 1;
  state.effectsDirty = state.bursts.length > 0;
}

function draw() {
  const time = state.reduced ? introductionEnd + 1 : state.elapsed;
  const background = Math.round(reveal(time, .2, 5.8) * 100);
  if (background !== state.background) {
    gift.style.setProperty('--glow', background / 100);
    state.background = background;
  }
  renderBouquet(time);
  drawBursts();
  updateDedication(time);
}

function schedule() {
  if (!gift.hidden && state.frame === null && !document.hidden) state.frame = requestAnimationFrame(tick);
}

function tick(now) {
  state.frame = null;
  const interval = state.lastFrame === null ? 0 : (now - state.lastFrame) / 1000;
  const delta = Math.min(interval, .12);
  state.lastFrame = now;
  state.clock += delta;
  state.elapsed += delta * Math.max(.05, CONFIG.animation.introSpeed);
  const follow = 1 - Math.exp(-delta * 5.2);
  pointer.x = mix(pointer.x, pointer.targetX, follow);
  pointer.y = mix(pointer.y, pointer.targetY, follow);
  if (interval > .029) state.runningSlow += delta;
  else state.runningSlow = Math.max(0, state.runningSlow - delta * .55);
  state.density = state.runningSlow > 2.4 ? 0 : state.runningSlow > .8 ? 1 : 2;
  draw();
  if (!state.reduced || state.bursts.length > 0) schedule();
  else state.lastFrame = null;
}

function clearPointer() {
  pointer.targetX = 0;
  pointer.targetY = 0;
}

function trackPointer(event) {
  if (gift.hidden || state.reduced) return;
  pointer.targetX = clamp(event.clientX / (screenView.width || 1) * 2 - 1, -1, 1);
  pointer.targetY = clamp(event.clientY / (screenView.height || 1) * 2 - 1, -1, 1);
}

function restart() {
  state.lastFrame = null;
  state.elapsed = 0;
  state.clock = 0;
  state.complete = false;
  state.bursts.length = 0;
  pointer.x = 0;
  pointer.y = 0;
  clearPointer();
  announcement.textContent = '';
  draw();
  if (!state.reduced) schedule();
}

const correspondence = document.querySelector('.correspondence');
const envelopeScene = document.querySelector('.envelope-scene');
const envelope = document.querySelector('.envelope');
const insert = document.querySelector('.envelope-insert');
const openEnvelope = document.querySelector('#open-envelope');
const paper = document.querySelector('.love-letter');
const reading = document.querySelector('.letter-reading');
const finishPaper = document.querySelector('#finish-letter');
const surprise = document.querySelector('#open-surprise');
const transition = document.querySelector('.surprise-transition');
const flow = { timer: null, unfold: null, frame: null, started: null, follow: true };
const letterSettings = CONFIG.letter;
const letterSpeed = Math.max(1, letterSettings.typingSpeed);
const personalize = (text) => text.replace(/\{(recipient|sender)\}/g, (_, name) => letterSettings[name]);
const signature = letterSettings.sender && !letterSettings.message.includes('{sender}') ? `\n\n${letterSettings.sender}` : '';
const letter = makeTypewriter('letter', personalize(letterSettings.message) + signature);

function stationeryColor(name, hex) {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const tint = (target, amount) => `rgb(${rgb.map((channel, index) => Math.round(mix(channel, target[index], amount))).join(',')})`;
  correspondence.style.setProperty(`--${name}-color`, hex);
  correspondence.style.setProperty(`--${name}-light`, tint([255, 236, 243], .47));
  correspondence.style.setProperty(`--${name}-deep`, tint([66, 24, 49], .26));
}

function addStationerySparks(parent, burst) {
  const fragment = document.createDocumentFragment();
  const count = burst ? 26 : 30;
  for (let index = 0; index < count; index++) {
    const spark = document.createElement('span');
    const angle = index * tau / count + noise(index, 18, 9) * .27;
    const distance = .36 + noise(index, 81, 9) * .65;
    const heart = index % (burst ? 3 : 5) === 0;
    spark.textContent = heart ? (index % 2 === 0 ? '♡' : '♥') : index % 4 === 0 ? '✦' : '·';
    spark.style.setProperty('--spark-color', ['#e9a8c7', '#ddbbe1', '#f4d2dd', '#ce88b0'][index % 4]);
    spark.style.setProperty('--size', `${heart ? 11 + distance * 10 : 7 + distance * 10}px`);
    if (burst) {
      spark.style.setProperty('--dx', `clamp(-340px, ${Math.cos(angle) * distance * 39}vw, 340px)`);
      spark.style.setProperty('--dy', `clamp(-295px, ${Math.sin(angle) * distance * 37}vh, 295px)`);
      spark.style.setProperty('--delay', `${noise(index, 42, 9) * .13}s`);
    } else {
      spark.style.setProperty('--x', `${50 + Math.cos(angle) * (26 + distance * 21)}%`);
      spark.style.setProperty('--y', `${50 + Math.sin(angle) * (25 + distance * 22)}%`);
      spark.style.setProperty('--alpha', `${.30 + noise(index, 2, 6) * .47}`);
      spark.style.setProperty('--duration', `${2.9 + noise(index, 16, 9) * 3.7}s`);
      spark.style.setProperty('--delay', `${-noise(index, 48, 9) * 4}s`);
    }
    fragment.append(spark);
  }
  parent.append(fragment);
}

function afterFlow(duration, action) {
  clearTimeout(flow.timer);
  flow.timer = setTimeout(() => {
    flow.timer = null;
    action();
  }, duration);
}

function stopLetterTyping() {
  if (flow.frame !== null) cancelAnimationFrame(flow.frame);
  flow.frame = null;
  flow.started = null;
}

function completeLetter() {
  stopLetterTyping();
  letter.update(letter.length, false);
  const focusSurprise = document.activeElement === finishPaper;
  finishPaper.hidden = true;
  surprise.hidden = false;
  if (focusSurprise) surprise.focus({ preventScroll: true });
}

function typeLetter(now) {
  flow.frame = null;
  flow.started ??= now;
  const count = Math.min(letter.length, Math.floor((now - flow.started) * letterSpeed / 1000));
  if (count === letter.length) {
    completeLetter();
    return;
  }
  letter.update(count, true);
  if (flow.follow && reading.scrollHeight > reading.clientHeight) {
    const bottom = reading.getBoundingClientRect().bottom;
    const advance = letter.caret.getBoundingClientRect().bottom + 12 - bottom;
    if (advance > 0) reading.scrollTop += advance;
  }
  flow.frame = requestAnimationFrame(typeLetter);
}

function showLetter() {
  clearTimeout(flow.timer);
  flow.timer = null;
  flow.unfold?.cancel();
  flow.unfold = null;
  correspondence.dataset.state = 'letter';
  delete correspondence.dataset.phase;
  envelopeScene.hidden = true;
  paper.hidden = false;
  paper.inert = false;
  paper.focus({ preventScroll: true });
  if (motion.matches) completeLetter();
  else flow.frame = requestAnimationFrame(typeLetter);
}

function unfoldLetter() {
  const folded = insert.getBoundingClientRect();
  paper.hidden = false;
  const opened = paper.getBoundingClientRect();
  const x = folded.left + folded.width / 2 - opened.left - opened.width / 2;
  const y = folded.top + folded.height / 2 - opened.top - opened.height / 2;
  const width = folded.width / opened.width;
  const depth = folded.height / opened.height;
  if (!paper.animate) {
    showLetter();
    return;
  }
  // Keep the unfolded paper anchored to the visible insert for the handoff.
  flow.unfold = paper.animate([
    { transform: `translate(${x}px, ${y}px) scale(${width}, ${depth})`, borderRadius: '8px' },
    { transform: `translate(${x * .46}px, ${y * .51}px) perspective(1100px) rotateX(-8deg) scale(${mix(width, 1, .62)}, ${mix(depth, 1, .36)})`, offset: .42 },
    { transform: 'translate(0, 0) scale(1)', borderRadius: '12px' },
  ], { duration: 740, easing: 'cubic-bezier(.23,.72,.25,1)', fill: 'both' });
  correspondence.dataset.phase = 'unfold';
  flow.unfold.onfinish = showLetter;
}

function openLetter() {
  if (correspondence.dataset.state !== 'envelope' || correspondence.dataset.phase) return;
  openEnvelope.disabled = true;
  delete correspondence.dataset.returning;
  if (motion.matches) {
    showLetter();
    return;
  }
  envelope.style.setProperty('--envelope-start', getComputedStyle(envelope).transform);
  correspondence.dataset.phase = 'opening';
  afterFlow(1580, unfoldLetter);
}

function startBouquet() {
  correspondence.hidden = true;
  gift.hidden = false;
  gift.inert = false;
  gift.focus({ preventScroll: true });
  if (context && effects) {
    resize();
    restart();
  } else {
    title.update(title.length, false);
    backButton.hidden = false;
  }
}

function revealSurprise() {
  if (surprise.hidden || surprise.disabled) return;
  surprise.disabled = true;
  paper.inert = true;
  if (motion.matches) {
    startBouquet();
    return;
  }
  correspondence.dataset.leaving = '';
  transition.hidden = false;
  afterFlow(665, () => {
    startBouquet();
    afterFlow(575, () => { transition.hidden = true; });
  });
}

function returnToEnvelope() {
  if (state.frame !== null) cancelAnimationFrame(state.frame);
  state.frame = null;
  state.lastFrame = null;
  state.elapsed = 0;
  state.clock = 0;
  state.complete = false;
  state.bursts.length = 0;
  if (effects) drawBursts();
  pointer.x = 0;
  pointer.y = 0;
  clearPointer();
  replayButton.hidden = true;
  backButton.hidden = true;
  announcement.textContent = '';
  gift.hidden = true;
  gift.inert = true;

  clearTimeout(flow.timer);
  flow.timer = null;
  flow.unfold?.cancel();
  flow.unfold = null;
  stopLetterTyping();
  transition.hidden = true;
  delete correspondence.dataset.leaving;
  delete correspondence.dataset.phase;
  correspondence.dataset.state = 'envelope';
  correspondence.dataset.returning = '';
  paper.inert = true;
  paper.hidden = true;
  letter.update(0, true);
  reading.scrollTop = 0;
  flow.follow = true;
  finishPaper.hidden = false;
  surprise.hidden = true;
  surprise.disabled = false;
  envelopeScene.hidden = false;
  openEnvelope.disabled = false;
  correspondence.hidden = false;
  openEnvelope.focus({ preventScroll: true });
}

document.querySelector('#envelope-greeting').textContent = personalize(letterSettings.greeting);
surprise.textContent = personalize(letterSettings.surpriseButton);
stationeryColor('envelope', letterSettings.envelopeColor);
stationeryColor('seal', letterSettings.sealColor);
addStationerySparks(document.querySelector('.letter-sparks'), false);
addStationerySparks(transition, true);
letter.update(0, true);
openEnvelope.disabled = false;
openEnvelope.addEventListener('click', openLetter);
paper.addEventListener('click', (event) => {
  if (!surprise.hidden || (!event.target.closest('#finish-letter') && window.getSelection()?.toString())) return;
  completeLetter();
});
for (const event of ['wheel', 'touchmove', 'keydown']) {
  reading.addEventListener(event, () => { flow.follow = false; }, { passive: true });
}
surprise.addEventListener('click', revealSurprise);
backButton.addEventListener('click', returnToEnvelope);

if (context && effects) {
  gift.dataset.ready = '';
  canvas.setAttribute('aria-label', `${flowers.length} pastel ASCII ${flowers.length === 1 ? 'tulip' : 'tulips'} held by a little rabbit.`);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', trackPointer, { passive: true });
  window.addEventListener('pointerdown', (event) => {
    if (gift.hidden || event.button !== 0 || event.target.closest?.('#replay, #back-to-envelope')) return;
    trackPointer(event);
    releaseHearts(event.clientX, event.clientY);
  }, { passive: true });
  window.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') clearPointer();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', clearPointer);
  window.addEventListener('pointercancel', clearPointer);
  window.addEventListener('blur', clearPointer);
  replayButton.addEventListener('click', restart);
  document.addEventListener('visibilitychange', () => {
    state.lastFrame = null;
    if (document.hidden && state.frame !== null) {
      cancelAnimationFrame(state.frame);
      state.frame = null;
    } else if (!state.reduced || state.bursts.length > 0) schedule();
  });
}

function updateMotion({ matches }) {
  state.reduced = matches;
  if (!gift.hidden && context && effects) restart();
  if (!matches) return;
  if (correspondence.dataset.phase) showLetter();
  if (flow.frame !== null) completeLetter();
  if (!transition.hidden) {
    clearTimeout(flow.timer);
    flow.timer = null;
    transition.hidden = true;
    if (gift.hidden) startBouquet();
  }
}

if (motion.addEventListener) motion.addEventListener('change', updateMotion);
else motion.addListener(updateMotion);
