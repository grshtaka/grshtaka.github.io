/* ============================================================
   THE GARDEN — content   (no build step; just edit + commit)
   ------------------------------------------------------------
   EASIEST WAY TO ADD A PAGE: open  editor.html  in your browser,
   fill the form (pick a flower/colour, paste your text, add a gif),
   press Export, and paste the snippet it gives you down at the
   bottom of the list below. Then bump  data/entries.js?v=NN  in
   index.html and push with GitHub Desktop. (See HOW-TO-ADD.md.)

   ── To add by hand, copy ONE of these and fill it in ──────────

   // A GARDEN STORY (a poem / fragment). text: blank line = stanza break.
   story({
     id:   'duskfall',                 // unique, lowercase, no spaces
     name: 'DUSKFALL.TXT',             // shown on the page + shelf
     kind: 'DREAM',                    // ABOUT | COSMOGONY | MYTH | SHADOW | DREAM
     flower: '✿',                      // optional — the bloom in the bed
     color: '',                        // optional '#rrggbb' to override the mood colour
     desc: 'one line shown when you hover the bloom',
     text: `
First line of the poem.
Second line.

A new stanza after the blank line.`,
     // bg: 'assets/yourbackground.gif',   // optional page background
   }),

   // A LIBRARY SIGN (an omen + its meaning)
   sign({
     id:   'whitedog',
     name: 'WHITE DOG',
     color: '#cf8a4a',                 // the book spine + page colour
     desc: 'one line shown when you hover the book',
     gif:  'assets/whitedog.gif',      // optional image on the page
     text: 'The full interpretation paragraph goes here.',
   }),
   ============================================================ */

/* ---- authoring helpers (used here AND by editor.html's Export) ---- */
function verse(text) {
  const lines = [];
  String(text || '').replace(/\r/g, '').split('\n').forEach(raw => {
    const t = raw.trim();
    if (t === '') { if (lines.length && lines[lines.length - 1].t !== 'stanza') lines.push({ t: 'stanza' }); }
    else lines.push({ t: 'line', text: t });
  });
  while (lines.length && lines[lines.length - 1].t === 'stanza') lines.pop();
  return { t: 'verse', lines };
}
function story(o) {
  const blocks = [];
  if (o.gif) blocks.push({ t: 'image', src: o.gif, cap: o.name, treat: 'crt' });
  blocks.push(verse(o.text));
  const e = { id: o.id, name: o.name, kind: o.kind || 'DREAM', collection: 'garden',
              desc: o.desc || '', blocks };
  if (o.color)  e.color  = o.color;
  if (o.flower) e.flower = o.flower;
  if (o.bg)     e.bg     = o.bg;
  return e;
}
function sign(o) {
  const blocks = [];
  if (o.gif) blocks.push({ t: 'image', src: o.gif, cap: o.name, treat: 'crt' });
  blocks.push({ t: 'note', text: o.text || '' });
  const e = { id: o.id, name: o.name, kind: 'SIGN', collection: 'library',
              color: o.color || '#cf8a4a', desc: o.desc || '', blocks };
  if (o.h) e.h = o.h;
  if (o.w) e.w = o.w;
  return e;
}
window.Authoring = { verse, story, sign };

window.ENTRIES = [
  {
    id: 'mirrors',
    name: 'MIRRORS.TXT',
    heading: 'MIRRORS.TXT',
    kind: 'ABOUT',
    collection: 'garden',
    desc: 'the place itself — why these fragments are gathered',
    path: 'C:\\GARDEN\\MIRRORS.TXT',
    links: ['clue1', 'memory'],
    blocks: [
      { t: 'verse', lines: [
        { t: 'line', text: 'This is a place where I gather the fragments --' },
        { t: 'line', text: 'dreams, symbols, thoughts,' },
        { t: 'line', text: 'and the moments that feel more real than reality itself.' },
        { t: 'stanza' },
        { t: 'line', text: 'A place to track the patterns that move beneath the surface of ordinary life' },
        { t: 'line', text: 'and to observe the mind the way a smith studies metal:' },
        { t: 'stanza' },
        { t: 'line', text: 'heating it, folding it, burning away what does not belong,' },
        { t: 'line', text: 'and shaping what remains into something precise.' },
      ]},
      { t: 'note', text: 'Each leaf in this directory is a page. Turn it, and the weather of the page changes with what it holds.' },
      { t: 'widget', kind: 'reveal', label: 'UNFOLD :: THE METHOD', blocks: [
        { t: 'note', text: 'Heat. Fold. Strike. Repeat until only the true line remains.' },
        { t: 'ascii', cap: 'FIG. -- THE FOLD', art:
"   >======|\n" +
"   >=====||\n" +
"   >====|||   fold\n" +
"   >=====||\n" +
"   >======|" },
      ]},
    ],
  },

  {
    id: 'clue1',
    name: 'CLUE1.TXT',
    heading: 'CLUE1.TXT',
    kind: 'COSMOGONY',
    collection: 'garden',
    desc: 'the first splitting — how the many came from one',
    path: 'C:\\GARDEN\\CLUE1.TXT',
    links: ['clue2', 'memory'],
    blocks: [
      { t: 'verse', lines: [
        { t: 'line', text: 'As the four stood silent to each one' },
        { t: 'line', text: 'Their looks intertwined' },
        { t: 'line', text: 'The land reached its hand for the skies' },
        { t: 'line', text: 'Not a breath to spare, the depths had given to the chase' },
        { t: 'line', text: 'Racing one another, who will be the first to wonder' },
        { t: 'stanza' },
        { t: 'line', text: 'Celestial dome came down for the show' },
        { t: 'line', text: 'One being split into two' },
        { t: 'line', text: 'Each facing their own reflection, looking in' },
        { t: 'stanza' },
        { t: 'line', text: "They've begun to sing, countless others joined in" },
        { t: 'line', text: 'A chorus so powerful, so loud' },
        { t: 'line', text: 'Structure so violent, so profound' },
        { t: 'stanza' },
        { t: 'line', text: "In their nooks and crannies they've birthed a new mind" },
        { t: 'line', text: 'Resting upon others safe and sound' },
      ]},
      { t: 'ascii', cap: 'FIG. I -- THE SPLITTING', art:
"        .   *   .\n" +
"     *    (o)    *\n" +
"        \\  |  /\n" +
"     ---- (O) ----\n" +
"        /  |  \\\n" +
"     *    (o)    *\n" +
"        '   *   '\n" +
"     one became two\n" +
"     two became all" },
    ],
  },

  {
    id: 'clue2',
    name: 'CLUE2.TXT',
    heading: 'CLUE2.TXT',
    kind: 'MYTH',
    collection: 'garden',
    desc: 'the sword of Ishis and the war of divine beings',
    path: 'C:\\GARDEN\\CLUE2.TXT',
    links: ['clue1', 'malformation'],
    blocks: [
      { t: 'verse', lines: [
        { t: 'line', text: 'The battle, locked still' },
        { t: 'line', text: 'Neither side with a moving will' },
        { t: 'line', text: 'In that moment, decision was his' },
        { t: 'line', text: 'To plunge unto chest the sword of Ishis' },
        { t: 'stanza' },
        { t: 'line', text: 'With such actions things were set into motion' },
        { t: 'line', text: 'Divine beings thrown into commotion' },
        { t: 'line', text: 'Eyegaze upon the thread unveiled' },
        { t: 'line', text: 'Three rushed into battle with no moment to spare' },
        { t: 'stanza' },
        { t: 'line', text: 'He and she adored the awe' },
        { t: 'line', text: 'With no words coming from his mouth shut' },
        { t: 'line', text: 'Through every valley, tree and rock' },
        { t: 'line', text: 'Even the sky above overlooking' },
        { t: 'stanza' },
        { t: 'line', text: 'With his voice in all, shuddered' },
        { t: 'line', text: 'Her eyes frozen in fear' },
        { t: 'line', text: 'To no avail is escape near' },
        { t: 'stanza' },
        { t: 'line', text: 'Gentle breeze upon the desert dunes' },
        { t: 'line', text: 'Every touch, poison or blessing as such' },
        { t: 'line', text: 'His hand her mind' },
        { t: 'line', text: 'Her soul his heart' },
      ]},
    ],
  },

  {
    id: 'malformation',
    name: 'MALFORMATION.TXT',
    heading: 'MALFORMATION.TXT',
    kind: 'SHADOW',
    collection: 'garden',
    desc: 'the form that turned to claws and smoke',
    path: 'C:\\GARDEN\\MALFORMATION.TXT',
    links: ['memory', 'clue2'],
    blocks: [
      { t: 'verse', lines: [
        { t: 'line', text: 'My form, ethereal it was supposed to be' },
        { t: 'line', text: 'These hands, to build they were looking' },
        { t: 'line', text: 'But all I see is weaving of black smoke' },
        { t: 'line', text: 'Dispute of purple lightning and flames' },
        { t: 'stanza' },
        { t: 'line', text: 'Sharp claws have grown, scales upon scales' },
        { t: 'line', text: 'No longer is there wish to learn, no longer is there wish to know' },
        { t: 'stanza' },
        { t: 'line', text: 'Only malice, only destruction' },
        { t: 'line', text: 'To rip apart, to tear the awe' },
        { t: 'stanza' },
        { t: 'line', text: "For pain I've learnt, pain I will cast upon" },
      ]},
    ],
  },

  // ★ TEMPLATE PAGE — MEMORY is the staple example of how a page should look:
  //   a background gif (`bg`), the verse/text with an illuminated drop-cap, page
  //   chrome (C:/MANIFOLD/...), page-turn. Copy this shape for new entries.
  {
    id: 'memory',
    name: 'MEMORY.TXT',
    heading: 'MEMORY.TXT',
    kind: 'DREAM',
    collection: 'garden',
    desc: 'a face returning across distant planes',
    path: 'C:\\GARDEN\\MEMORY.TXT',
    links: ['clue1', 'malformation'],
    // `bg` puts an image/gif behind the whole page, dimmed + vignetted so text reads
    bg: 'assets/lotus.gif',
    blocks: [
      { t: 'verse', lines: [
        { t: 'line', text: "Through distant planes, again you've come to me" },
        { t: 'line', text: 'Standing tall and proud, enveloped by a dark shroud' },
        { t: 'line', text: 'Your visage -- was it hair or snakes living?' },
        { t: 'line', text: "Eyes dark as coal, into my soul, they're peering" },
        { t: 'stanza' },
        { t: 'line', text: 'Such terror, such fear, I could not stand to be near' },
        { t: 'line', text: 'Frightened, I closed my eyes and wished not to see' },
        { t: 'line', text: 'Turned my back to you, to scream, to flee' },
        { t: 'line', text: 'But even with my eyes closed, I saw yours looking back at me' },
        { t: 'stanza' },
        { t: 'refrain', text: 'Sahte enli amar' },
        { t: 'refrain', text: 'Sahte enli amar' },
        { t: 'stanza' },
        { t: 'line', text: 'Never averting her gaze, flaming eyes gleaming with vigor' },
        { t: 'line', text: 'To me it was a trigger' },
        { t: 'line', text: 'Memories future and past, every moment that was us' },
        { t: 'stanza' },
        { t: 'line', text: 'It flashed: Before time, was you and me' },
        { t: 'line', text: 'Every touch, taste, smell and sound' },
        { t: 'line', text: 'To you forever has made me bound' },
        { t: 'line', text: "Your mind, soul and body, the only I've ever known" },
        { t: 'stanza' },
        { t: 'refrain', text: 'Sahte enli amar' },
        { t: 'stanza' },
        { t: 'line', text: 'As I stood up and turned to face you' },
        { t: 'line', text: 'Fear was there no more. Replaced by longing' },
        { t: 'line', text: 'Pressing your lips against mine, a familiar moment' },
        { t: 'line', text: 'Divine' },
        { t: 'stanza' },
        { t: 'refrain', text: 'Sahte enli amar' },
        { t: 'refrain', text: 'Sahte enli amar' },
        { t: 'refrain', text: 'Sahte enli amar' },
        { t: 'stanza' },
        { t: 'line', text: 'I am with you, echoed through our mind' },
      ]},
    ],
  },

  /* ============================================================
     LIBRARY · the signs — a field guide to symbols/omens.
     Same page structure as the stories. Each is a "book" on the
     shelf: `color` sets the spine + the page's bloom, `desc` is the
     one-line meaning shown on hover. Swap the placeholder lotus.gif
     `src` for your own (e.g. assets/headlights.gif).
     ============================================================ */
  {
    id: 'headlights',
    name: 'HEADLIGHTS',
    heading: 'HEADLIGHTS',
    kind: 'SIGN',
    collection: 'library',
    color: '#e3c66a',
    desc: 'ego flaring in the mirror — reconsider the road',
    path: 'C:\\MANIFOLD\\LIBRARY\\HEADLIGHTS',
    blocks: [
      { t: 'image', src: 'assets/lotus.gif', cap: 'HEADLIGHTS // REARVIEW', treat: 'crt' },
      { t: 'note', text: 'Lights swelling in the rearview: the ego, flaring, demanding to be seen. When they crowd the mirror, the urgency is yours -- not the road’s. Ease off. Reconsider the decision you are speeding toward.' },
    ],
  },

  {
    id: 'beetle',
    name: 'BLACK BEETLE',
    heading: 'BLACK BEETLE',
    kind: 'SIGN',
    collection: 'library',
    color: '#46b89a',
    desc: 'a dangerous choice nears — words and acts will carry',
    path: 'C:\\MANIFOLD\\LIBRARY\\BEETLE',
    blocks: [
      { t: 'image', src: 'assets/lotus.gif', cap: 'BLACK BEETLE // TURNING', treat: 'crt' },
      { t: 'note', text: 'A black beetle turning in place: you are nearing a dangerous choice. What is said and done here will not stay in the moment -- it will carry. Step with care; the small thing is not small.' },
    ],
  },

  {
    id: 'feather',
    name: 'FEATHER',
    heading: 'FEATHER',
    kind: 'SIGN',
    collection: 'library',
    color: '#e8d9a0',
    desc: 'a feather on your path — you are going the right way',
    path: 'C:\\MANIFOLD\\LIBRARY\\FEATHER',
    blocks: [
      { t: 'image', src: 'assets/lotus.gif', cap: 'FEATHER // ON THE PATH', treat: 'crt' },
      { t: 'note', text: 'A feather laid on your path: reassurance. The road you are on is the right one -- keep walking. What you have been doubting, you may trust a little more.' },
    ],
  },
];
