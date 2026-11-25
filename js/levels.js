// Level data for Draw the World.
//
// Every drawing lives on a 400 x 400 canvas. Each level is a list of steps,
// and each step is a list of SVG path strings. The same paths drive the
// animated demo (stroke-by-stroke playback) and the reference image the
// kid's photo is scored against, so the two can never drift apart.
//
// All reference drawings here are original. Later "Grand Voyage" levels teach
// manga style for the kid's own fan art; the app never ships official
// One Piece artwork, logos or traced character images.

const circle = (cx, cy, r) =>
  `M${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy}`;

const ellipse = (cx, cy, rx, ry) =>
  `M${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}`;

const polyline = (pts, close = false) =>
  'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L') + (close ? ' Z' : '');

function sunRays(cx, cy, r1, r2, count) {
  const rays = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x1 = Math.round(cx + Math.cos(a) * r1);
    const y1 = Math.round(cy + Math.sin(a) * r1);
    const x2 = Math.round(cx + Math.cos(a) * r2);
    const y2 = Math.round(cy + Math.sin(a) * r2);
    rays.push(`M${x1} ${y1} L${x2} ${y2}`);
  }
  return rays;
}

export const WORLDS = [
  { id: 'line-land', name: 'Line Land', emoji: '✏️', blurb: 'Lines, curves and simple shapes' },
  { id: 'cartoon-cove', name: 'Cartoon Cove', emoji: '😄', blurb: 'Faces, feelings and bean bodies' },
  { id: 'manga-island', name: 'Manga Island', emoji: '⚡', blurb: 'Manga heads, eyes, hair and poses' },
  { id: 'grand-voyage', name: 'Grand Voyage', emoji: '🏴‍☠️', blurb: 'Your own pirate crew and fan art' },
];

// Playable levels: full steps, animated demo and photo scoring.
const PLAYABLE = [
  {
    id: 1,
    world: 'line-land',
    title: 'Sunny Sea',
    skill: 'Straight lines, wavy lines and a circle',
    goal: 'Practise steady straight lines, smooth waves and a round circle.',
    color: '#ff9f1c',
    steps: [
      {
        say: 'Draw one long, straight line across the middle. This is where the sea meets the sky.',
        paths: ['M40 250 L360 250'],
      },
      {
        say: 'Under it, draw a wavy line: up and down, up and down, like a snake.',
        paths: ['M40 310 Q70 285 100 310 T160 310 T220 310 T280 310 T340 310'],
      },
      {
        say: 'Up in the sky, draw a big round circle for the sun.',
        paths: [circle(200, 145, 50)],
      },
      {
        say: 'Add short straight lines all around the sun. These are its sunbeams!',
        paths: sunRays(200, 145, 64, 88, 8),
      },
    ],
    tips: [
      'Move your whole arm for long lines, not just your fingers.',
      'For the circle, try drawing it lightly a few times, then go over the best one.',
    ],
  },
  {
    id: 2,
    world: 'line-land',
    title: 'Little Sailboat',
    skill: 'Building things from shapes',
    goal: 'See how squares, triangles and circles join together to make a boat.',
    color: '#2ec4b6',
    steps: [
      {
        say: 'Draw the boat bottom: a long line on top, slanted sides, and a shorter line at the bottom.',
        paths: [polyline([[80, 260], [320, 260], [280, 320], [120, 320]], true)],
      },
      {
        say: 'Draw a tall straight line from the middle of the boat up to the sky. This is the mast.',
        paths: ['M200 260 L200 70'],
      },
      {
        say: 'Draw a big triangle sail on the right side of the mast.',
        paths: [polyline([[208, 90], [208, 245], [320, 245]], true)],
      },
      {
        say: 'Draw a smaller triangle sail on the left side.',
        paths: [polyline([[192, 120], [192, 245], [110, 245]], true)],
      },
      {
        say: 'Add a little flag at the very top of the mast.',
        paths: [polyline([[200, 70], [244, 82], [200, 96]])],
      },
      {
        say: 'Draw two small circles on the boat for windows, then a wavy line of water underneath.',
        paths: [
          circle(160, 290, 11),
          circle(240, 290, 11),
          'M40 340 Q70 320 100 340 T160 340 T220 340 T280 340 T340 340',
        ],
      },
    ],
    tips: [
      'Look for the shapes first: a box, two triangles, two circles.',
      'Draw the big shapes first and the small details last.',
    ],
  },
  {
    id: 3,
    world: 'line-land',
    title: 'Cartoon Pirate Kid',
    skill: 'A cartoon face with spiky manga hair',
    goal: 'Use a circle and simple lines to make a happy cartoon face.',
    color: '#e71d36',
    steps: [
      {
        say: 'Draw a big circle for the head.',
        paths: [circle(200, 215, 110)],
      },
      {
        say: 'Add an ear on each side. They look like the letter C, one backwards.',
        paths: ['M92 205 C66 200 66 258 96 252', 'M308 205 C334 200 334 258 304 252'],
      },
      {
        say: 'Draw spiky hair on top of the head: zig, zag, zig, zag, all the way across.',
        paths: [
          polyline([
            [93, 190], [70, 150], [108, 140], [92, 95], [145, 98], [150, 52], [192, 82],
            [215, 38], [238, 82], [282, 58], [275, 102], [322, 108], [298, 145], [330, 150], [307, 190],
          ]),
        ],
      },
      {
        say: 'Draw a zigzag fringe across the forehead. Manga hair loves sharp points!',
        paths: [
          polyline([
            [110, 150], [135, 185], [150, 148], [178, 188], [195, 145], [218, 186],
            [235, 148], [258, 185], [272, 150], [290, 175],
          ]),
        ],
      },
      {
        say: 'Draw two tall oval eyes with a small circle shine in each, and an eyebrow above each eye.',
        paths: [
          ellipse(165, 235, 14, 20),
          ellipse(235, 235, 14, 20),
          circle(170, 227, 5),
          circle(240, 227, 5),
          'M143 204 Q165 194 187 202',
          'M213 202 Q235 194 257 204',
        ],
      },
      {
        say: 'Add a tiny nose, then a big happy grin: a straight line on top and a smile curve under it.',
        paths: ['M196 262 Q204 266 200 272', 'M150 280 Q200 335 250 280 Z'],
      },
    ],
    tips: [
      'Keep the eyes in the middle of the face, not up high.',
      'Spiky hair does not need to be perfect. Wild spikes look cool!',
    ],
  },
];

// Planned levels: shown on the map so kids can see where the voyage goes.
const PLANNED = [
  { id: 4, world: 'cartoon-cove', title: 'Feelings Faces', skill: 'Happy, sad, angry and surprised eyes and mouths' },
  { id: 5, world: 'cartoon-cove', title: 'Bean Buddies', skill: 'Bean-shaped bodies with stick arms and legs' },
  { id: 6, world: 'cartoon-cove', title: 'Hands and Feet', skill: 'Mitten hands, simple fingers and boots' },
  { id: 7, world: 'manga-island', title: 'Manga Head', skill: 'Face guidelines, chin shapes and where features go' },
  { id: 8, world: 'manga-island', title: 'Big Manga Eyes', skill: 'Eye shapes, shines, and hairstyles' },
  { id: 9, world: 'manga-island', title: 'Action Pose', skill: 'The line of action: running, jumping, punching' },
  { id: 10, world: 'manga-island', title: 'Clothes and Props', skill: 'Shirts, sandals, hats, swords and cloth folds' },
  { id: 11, world: 'grand-voyage', title: 'My Pirate Crew', skill: 'Design your own original pirate character' },
  { id: 12, world: 'grand-voyage', title: 'Fan-Art Studio', skill: 'Draw your favourite manga heroes in scenes: sailing, feasting, battling' },
];

export const LEVELS = [...PLAYABLE.map((l) => ({ ...l, playable: true })), ...PLANNED.map((l) => ({ ...l, playable: false }))];

export const PASS_SCORE = 80;

export function getLevel(id) {
  return LEVELS.find((l) => l.id === Number(id));
}

export function allPaths(level) {
  return level.steps.flatMap((s) => s.paths);
}
