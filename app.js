/* ============================================
   STOKED BROTHERHOOD COMMAND CENTER
   Firebase-powered: Auth + Firestore
   ============================================ */

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc,
         onSnapshot, setDoc, updateDoc,
         deleteDoc, getDoc, getDocs }             from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── FIREBASE CONFIG ───────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBIfsac4gqRxCEoU8655AnrajxmRQOSDo4",
  authDomain:        "stoked-brotherhood-app.firebaseapp.com",
  projectId:         "stoked-brotherhood-app",
  storageBucket:     "stoked-brotherhood-app.firebasestorage.app",
  messagingSenderId: "243670203554",
  appId:             "1:243670203554:web:adfed8e3bcb431368f6bfb",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

// ── ADMIN EMAIL ───────────────────────────────
// Only this email gets full admin access
const ADMIN_EMAIL = 'boysclubcabo@gmail.com';

// ── LEVEL SYSTEM ──────────────────────────────
const LEVELS = [
  { level: 1,  name: 'Recruit',    xpRequired: 1000  },
  { level: 2,  name: 'Apprentice', xpRequired: 2000  },
  { level: 3,  name: 'Initiate',   xpRequired: 3000  },
  { level: 4,  name: 'Pathfinder', xpRequired: 4000  },
  { level: 5,  name: 'Warrior',    xpRequired: 5000  },
  { level: 6,  name: 'Builder',    xpRequired: 6000  },
  { level: 7,  name: 'Guardian',   xpRequired: 7000  },
  { level: 8,  name: 'Leader',     xpRequired: 8000  },
  { level: 9,  name: 'Mentor',     xpRequired: 9000  },
  { level: 10, name: 'Stoked Man', xpRequired: 10000 },
];

const CHALLENGE_TAGS = {
  Physical:   { cardBg: 'rgba(196,105,58,0.07)',  cardBorder: 'rgba(196,105,58,0.4)',  pillBg: 'rgba(196,105,58,0.15)',  color: '#C4693A' }, // terracotta
  Creator:    { cardBg: 'rgba(91,138,160,0.07)',  cardBorder: 'rgba(91,138,160,0.4)',  pillBg: 'rgba(91,138,160,0.15)',  color: '#5B8AA0' }, // ocean
  Regulation: { cardBg: 'rgba(90,140,90,0.07)',   cardBorder: 'rgba(90,140,90,0.4)',   pillBg: 'rgba(90,140,90,0.15)',   color: '#5a8c5a' }, // sage
  Special:    { cardBg: 'rgba(212,168,83,0.07)',  cardBorder: 'rgba(212,168,83,0.4)',  pillBg: 'rgba(212,168,83,0.15)',  color: '#D4A853' }, // gold
};

function challengeCardStyle(tag) {
  if (!tag || !CHALLENGE_TAGS[tag]) return '';
  const t = CHALLENGE_TAGS[tag];
  return `style="--ch-bg:${t.cardBg};--ch-border:${t.cardBorder}"`;
}

function challengeTagPill(tag) {
  if (!tag || !CHALLENGE_TAGS[tag]) return '';
  const t = CHALLENGE_TAGS[tag];
  return `<span class="ch-tag" style="background:${t.pillBg};color:${t.color};border-color:${t.cardBorder}">${tag}</span>`;
}

const ARCHETYPE_COLORS = {
  Warrior:      { border: 'rgba(196,105,58,0.5)',  glow: 'rgba(196,105,58,0.06)',  icon: '#C4693A' }, // terracotta
  Monk:         { border: 'rgba(158,141,114,0.45)', glow: 'rgba(158,141,114,0.06)', icon: '#9e8d72' }, // warm sand
  Creator:      { border: 'rgba(91,138,160,0.45)', glow: 'rgba(91,138,160,0.07)',  icon: '#5B8AA0' }, // ocean blue
  Explorer:     { border: 'rgba(90,140,90,0.45)',  glow: 'rgba(90,140,90,0.06)',   icon: '#5a8c5a' }, // sage green
  Leader:       { border: 'rgba(212,168,83,0.5)',  glow: 'rgba(212,168,83,0.07)',  icon: '#D4A853' }, // amber gold
  Builder:      { border: 'rgba(130,110,90,0.45)', glow: 'rgba(130,110,90,0.06)',  icon: '#826e5a' }, // warm brown
  Protector:    { border: 'rgba(156,90,66,0.5)',   glow: 'rgba(156,90,66,0.06)',   icon: '#9c5a42' }, // rust
  Strategist:   { border: 'rgba(93,122,138,0.5)',  glow: 'rgba(93,122,138,0.06)',  icon: '#5d7a8a' }, // slate blue
  Visionary:    { border: 'rgba(122,138,82,0.5)',  glow: 'rgba(122,138,82,0.06)',  icon: '#7a8a52' }, // olive
  Communicator: { border: 'rgba(176,122,74,0.5)',  glow: 'rgba(176,122,74,0.06)',  icon: '#b07a4a' }, // copper
  Guardian:     { border: 'rgba(122,116,104,0.5)', glow: 'rgba(122,116,104,0.06)', icon: '#7a7468' }, // stone
  Sovereign:    { border: 'rgba(138,112,48,0.5)',  glow: 'rgba(138,112,48,0.06)',  icon: '#8a7030' }, // deep gold
};

const ELEMENT_COLORS = {
  Fire:  '#C4502E',
  Water: '#4A7A94',
  Air:   '#8A9AB0',
  Earth: '#7A8C52',
};

// Hand-drawn archetype+element icon set, one PNG per combo in /icons
// (e.g. icons/warrior-fire.png), supplied directly by the client.
function archetypeElementIcon(archetype, element) {
  if (archetype && element) {
    const key = `${archetype.toLowerCase()}-${element.toLowerCase()}`;
    return `<img src="icons/${key}.png" alt="${escHtml(archetype)} ${escHtml(element)}" class="arch-icon-img">`;
  }
  const core = ARCHETYPE_ICONS[archetype] || '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${core}</svg>`;
}

const ELEMENT_DESC = {
  Fire:  'Your strongest energy is passion, courage, action, and intensity.',
  Water: 'Your strongest energy is emotion, adaptability, connection, and intuition.',
  Air:   'Your strongest energy is ideas, creativity, awareness, and clarity of mind.',
  Earth: 'Your strongest energy is discipline, structure, and steady strength.',
};

const ARCHETYPE_DESC = {
  Warrior:      { primary: 'You grow through challenge, courage, discipline, and action.',          growth: 'Your next evolution is taking on hard challenges with discipline and courage.' },
  Monk:         { primary: 'You grow through calm, awareness, and inner control.',                  growth: 'Your next evolution is developing calm, awareness, and inner control.' },
  Creator:      { primary: 'You grow through expression, imagination, and making things real.',     growth: 'Your next evolution is creating boldly and trusting your imagination.' },
  Explorer:     { primary: 'You grow through curiosity, freedom, and new experience.',               growth: 'Your next evolution is stepping into the unknown and staying curious.' },
  Leader:       { primary: 'You grow through influence, energy, and lifting others up.',             growth: 'Your next evolution is stepping up and leading with purpose.' },
  Builder:      { primary: 'You grow through discipline, structure, and getting things done.',       growth: 'Your next evolution is building consistent habits and following through.' },
  Protector:    { primary: 'You grow through loyalty, responsibility, and standing for others.',     growth: 'Your next evolution is showing up for the people who depend on you.' },
  Strategist:   { primary: 'You grow through thinking, planning, and understanding how things work.',growth: 'Your next evolution is slowing down to think before you act.' },
  Visionary:    { primary: 'You grow through purpose, big ideas, and seeing what\'s possible.',       growth: 'Your next evolution is dreaming bigger and trusting your vision.' },
  Communicator: { primary: 'You grow through connection, voice, and being understood.',               growth: 'Your next evolution is speaking up and connecting honestly.' },
  Guardian:     { primary: 'You grow through stability, integrity, and consistency.',                 growth: 'Your next evolution is becoming the steady one others can count on.' },
  Sovereign:    { primary: 'You grow through presence, ownership, and self-respect.',                 growth: 'Your next evolution is owning your presence and standing on your own.' },
};

// ── ARCHETYPE ASSESSMENT ──────────────────────
const ASSESS_QUESTIONS = [
  { left: '⚔️ Gladiator — compete, fight, dominate', right: '🎨 Artist — create, express, make your mark', leftScore: { arch: 'Warrior', el: 'Fire' }, rightScore: { arch: 'Creator', el: 'Air' } },
  { left: '🔥 Just go for it — figure it out as you move', right: '🧠 Think it through — then make your move', leftScore: { arch: 'Warrior', el: 'Fire' }, rightScore: { arch: 'Strategist', el: 'Air' } },
  { left: '🌍 Explorer — new places, new challenges, no limits', right: '🏗️ Builder — plant roots, put in the work, stack it up', leftScore: { arch: 'Explorer', el: 'Air' }, rightScore: { arch: 'Builder', el: 'Earth' } },
  { left: '👑 The one hyping everyone up in the room', right: '🧘 The one quietly watching from the side', leftScore: { arch: 'Leader', el: 'Fire' }, rightScore: { arch: 'Monk', el: 'Water' } },
  { left: '🧘 Magician — go deep, get still, master yourself', right: '🚀 Captain — step up, get loud, lead the charge', leftScore: { arch: 'Monk', el: 'Water' }, rightScore: { arch: 'Leader', el: 'Fire' } },
  { left: '💪 Beast mode — train hard, get physically strong', right: '🧩 Galaxy brain — out-think, out-plan, outsmart', leftScore: { arch: 'Warrior', el: 'Earth' }, rightScore: { arch: 'Strategist', el: 'Air' } },
  { left: '🏆 Win — whatever it takes', right: '💡 Understand — why things happen the way they do', leftScore: { arch: 'Warrior', el: 'Fire' }, rightScore: { arch: 'Strategist', el: 'Air' } },
  { left: '😤 Earn respect — make people look up to you', right: '🎭 Stay real — be exactly who you are, no mask', leftScore: { arch: 'Sovereign', el: 'Fire' }, rightScore: { arch: 'Creator', el: 'Water' } },
  { left: '🛡️ Guardian — keep your people safe no matter what', right: '🗺️ Scout — go discover what\'s out there', leftScore: { arch: 'Protector', el: 'Earth' }, rightScore: { arch: 'Explorer', el: 'Air' } },
  { left: '📅 Same routine every day — locked in and consistent', right: '🌊 Go with the flow — adapt as life comes at you', leftScore: { arch: 'Builder', el: 'Earth' }, rightScore: { arch: 'Explorer', el: 'Water' } },
  { left: '🔨 Build something real you can touch and be proud of', right: '🔭 Dream up something the world hasn\'t seen yet', leftScore: { arch: 'Builder', el: 'Earth' }, rightScore: { arch: 'Visionary', el: 'Air' } },
  { left: '💪 Level up physically — be harder, faster, stronger', right: '📖 Level up mentally — wisdom, clarity, discipline of mind', leftScore: { arch: 'Warrior', el: 'Fire' }, rightScore: { arch: 'Monk', el: 'Water' } },
  { left: '🗣️ Talk it out with someone you trust', right: '🤫 Sit with it alone until you figure it out', leftScore: { arch: 'Communicator', el: 'Water' }, rightScore: { arch: 'Strategist', el: 'Air' } },
  { left: '⚓ Hold it down — steady, reliable, never moves', right: '🌅 Chase what\'s next — always moving toward something bigger', leftScore: { arch: 'Guardian', el: 'Earth' }, rightScore: { arch: 'Explorer', el: 'Water' } },
  { left: '🔭 Prophet — see it before everyone else does', right: '🧱 Architect — lay the bricks one by one until it\'s done', leftScore: { arch: 'Visionary', el: 'Air' }, rightScore: { arch: 'Builder', el: 'Earth' } },
  { left: '🛡️ Protector — nobody gets through you to your crew', right: '👑 Sovereign — own your lane, run your world', leftScore: { arch: 'Protector', el: 'Earth' }, rightScore: { arch: 'Sovereign', el: 'Fire' } },
  { left: '🎤 Break the rules — do it your way', right: '📏 Keep the standard — hold the line everyone else drops', leftScore: { arch: 'Creator', el: 'Water' }, rightScore: { arch: 'Guardian', el: 'Earth' } },
  { left: '🎙️ Speaker — move people with your words', right: '🔥 Presence — walk in and the whole energy shifts', leftScore: { arch: 'Communicator', el: 'Air' }, rightScore: { arch: 'Leader', el: 'Fire' } },
  { left: '🌌 Visionary — obsessed with what\'s coming next', right: '🧘 Monk — master what\'s right in front of you first', leftScore: { arch: 'Visionary', el: 'Air' }, rightScore: { arch: 'Monk', el: 'Water' } },
  { left: '🦁 Stand alone if you have to — you answer to yourself', right: '🐺 Stand for your pack — your people come first', leftScore: { arch: 'Sovereign', el: 'Earth' }, rightScore: { arch: 'Protector', el: 'Earth' } },
  { left: '📢 Say the hard thing — even if the room goes quiet', right: '🪨 Stay silent and steady — let your actions talk', leftScore: { arch: 'Communicator', el: 'Water' }, rightScore: { arch: 'Guardian', el: 'Earth' } },
  { left: '🎨 Create something nobody\'s ever seen before', right: '🔥 Ignite a movement — rally people around something real', leftScore: { arch: 'Creator', el: 'Air' }, rightScore: { arch: 'Leader', el: 'Fire' } },
  { left: '🌍 Change the world — go after the big picture', right: '👑 Rule your world first — master your own house', leftScore: { arch: 'Visionary', el: 'Air' }, rightScore: { arch: 'Sovereign', el: 'Fire' } },
  { left: '🪨 The rock — people come to you when things fall apart', right: '📣 The voice — people listen when you speak up', leftScore: { arch: 'Guardian', el: 'Earth' }, rightScore: { arch: 'Communicator', el: 'Air' } },
];

let assessAnswers   = new Array(ASSESS_QUESTIONS.length).fill(null);
let assessIndex     = 0;
let assessBrotherId = null;

// Core symbols only — the ring + element motif (above) form the rest of the icon
const ARCHETYPE_ICONS = {
  Warrior:      `<line x1="12" y1="4" x2="12" y2="18"/><path d="M12 4l-1.3 2.2h2.6L12 4z"/><line x1="9" y1="8" x2="15" y2="8"/>`,
  Monk:         `<circle cx="12" cy="8.5" r="1.4"/><path d="M8.7 16c.4-1.8 1.7-2.8 3.3-2.8s2.9 1 3.3 2.8"/><path d="M7.3 14.8c1.4-.7 2.9-1.1 4.7-1.1s3.3.4 4.7 1.1"/>`,
  Creator:      `<path d="M15 8l1 1-6 6-1.5.5.5-1.5 6-6z"/><line x1="13.3" y1="9.7" x2="14.3" y2="10.7"/>`,
  Explorer:     `<path d="M12 3.5l1.6 6.9 6.9 1.6-6.9 1.6-1.6 6.9-1.6-6.9-6.9-1.6 6.9-1.6z"/>`,
  Leader:       `<path d="M5.5 17V11l3 3 3.5-6 3.5 6 3-3v6z"/><line x1="5.5" y1="17" x2="18.5" y2="17"/>`,
  Builder:      `<path d="M14.3 9.2l1-1 1.4 1.4-1 1z"/><line x1="14.3" y1="9.2" x2="9.8" y2="13.7"/><line x1="9.8" y1="13.7" x2="8.3" y2="15.2"/>`,
  Protector:    `<path d="M12 5l-5 2v4c0 3.6 2.6 5.8 5 6.8 2.4-1 5-3.2 5-6.8V7l-5-2z"/><polyline points="9.7 11.5 11.2 13 14.3 9.8"/>`,
  Strategist:   `<rect x="9" y="9" width="2.6" height="2.6"/><rect x="12.4" y="9" width="2.6" height="2.6"/><rect x="9" y="12.4" width="2.6" height="2.6"/><rect x="12.4" y="12.4" width="2.6" height="2.6"/>`,
  Visionary:    `<path d="M5 12s3-4.5 7-4.5 7 4.5 7 4.5-3 4.5-7 4.5-7-4.5-7-4.5z"/><circle cx="12" cy="12" r="2"/>`,
  Communicator: `<path d="M17.5 9.8a6 6 0 01-.7 2.8 6.2 6.2 0 01-5.5 3.4 6 6 0 01-2.8-.7L6 16.5l1.4-4.1a6 6 0 01-.7-2.8 6.2 6.2 0 013.4-5.5 6 6 0 012.8-.7h.4a6.2 6.2 0 015.8 5.8v.4z"/>`,
  Guardian:     `<path d="M12 5.2l-4.5 1.8v3.6c0 3.2 2.3 5.2 4.5 6.2 2.2-1 4.5-3 4.5-6.2V7l-4.5-1.8z"/>`,
  Sovereign:    `<path d="M5 17l-1-6 3 2.3L9.5 8l2.5 3 2.5-3 2.5 5.3 3-2.3-1 6z"/><path d="M11.3 7.3l.7-1.3.7 1.3-.7.7z"/>`,
};

// ── ICONS ─────────────────────────────────────
const IC = {
  shield:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 5.5v6c0 5.5 4.5 9 8 10.5 3.5-1.5 8-5 8-10.5v-6L12 2z"/></svg>`,
  trophy:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 000 4h2"/><path d="M18 9h2a2 2 0 010 4h-2"/><path d="M6 3h12v10a6 6 0 01-12 0V3z"/><path d="M9 21h6M12 17v4"/></svg>`,
  clock:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  check:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  xmark:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  calendar:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  camera:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  flame:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C9 8 6 10 6 14a6 6 0 0012 0c0-4-3-6-6-12z"/><path d="M12 12c0 2.5-1.5 3.5-1.5 5a1.5 1.5 0 003 0c0-1.5-1.5-2.5-1.5-5z"/></svg>`,
  bolt:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  mountain:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l5.5-11L12 14l3.5-7L21 20H3z"/></svg>`,
  target:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  download:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  edit:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  clipboard: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
  photo:     `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  sword:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M2 21l4.5-4.5"/><path d="M19 5l2-2"/></svg>`,
};

// ── BROTHERHOOD SCORE ─────────────────────────
function calcBrotherhoodScore(f, m, d, c, s) {
  return (f + m + d + c + s) * 2;
}

function getBSCategory(score) {
  if (score >= 90) return { label: 'Elite',        color: '#F5D97A' };
  if (score >= 80) return { label: 'Strong',       color: '#4B72AA' };
  if (score >= 70) return { label: 'Solid',        color: '#6b8fc4' };
  if (score >= 60) return { label: 'Needs Work',   color: '#9090a0' };
  return               { label: 'Reset Needed',    color: '#5a5a6a' };
}

// ── STATE ─────────────────────────────────────
let brothers    = [];
let challenges  = [];
let submissions = [];
let currentUser = null;
let isAdmin     = false;
let isMentor    = false;
let editingId   = null;
let deletingId  = null;
let currentTab  = 'brothers';
let unsubBrothers   = null;
let unsubChallenges = null;
let unsubSubmissions = null;
let streakUpdatedThisSession = false;
let reviewingSubId = null;

// ── DOM ───────────────────────────────────────
const loginScreen   = document.getElementById('loginScreen');
const appScreen     = document.getElementById('appScreen');
const loginForm     = document.getElementById('loginForm');
const loginError    = document.getElementById('loginError');
const loginBtn      = document.getElementById('loginBtn');
const logoutBtn     = document.getElementById('logoutBtn');

// ── THEME TOGGLE ──────────────────────────
(function() {
  const saved = localStorage.getItem('stoked-theme') || 'dark';
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();
document.getElementById('themeToggleBtn').addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('stoked-theme', next);
});
const userBadge     = document.getElementById('userBadge');
const statsBar      = document.getElementById('statsBar');
const memberHero    = document.getElementById('memberHero');
const brothersGrid  = document.getElementById('brothersGrid');
const emptyState    = document.getElementById('emptyState');
const addBrotherBtn = document.getElementById('addBrotherBtn');
const exportBtn     = document.getElementById('exportBtn');
const brotherModal   = document.getElementById('brotherModal');
const xpModal        = document.getElementById('xpModal');
const deleteModal    = document.getElementById('deleteModal');
const checkInModal   = document.getElementById('checkInModal');
const coachNoteModal    = document.getElementById('coachNoteModal');
const viewCheckInModal  = document.getElementById('viewCheckInModal');
const modalTitle    = document.getElementById('modalTitle');
const brotherForm   = document.getElementById('brotherForm');

// ── AUTH ──────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    isAdmin     = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    isMentor    = false;
    if (!isAdmin) {
      // Check if this user has mentor role in their brother profile
      try {
        const snap = await getDocs(collection(db, 'brothers'));
        const profile = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .find(b => b.email && b.email.toLowerCase() === user.email.toLowerCase());
        if (profile?.role === 'mentor') isMentor = true;
      } catch (_) {}
    }
    showApp();
  } else {
    currentUser = null;
    isAdmin     = false;
    isMentor    = false;
    showLogin();
  }
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginBtn.textContent = 'Signing in…';
  loginBtn.disabled    = true;
  loginError.classList.add('hidden');

  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById('loginEmail').value.trim(),
      document.getElementById('loginPassword').value
    );
  } catch (err) {
    loginError.textContent = friendlyAuthError(err.code);
    loginError.classList.remove('hidden');
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled    = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  if (unsubBrothers) unsubBrothers();
  await signOut(auth);
});

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-credential':    'Email or password is incorrect.',
    'auth/user-not-found':        'No account found with that email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/too-many-requests':     'Too many attempts. Try again later.',
    'auth/invalid-email':         'Please enter a valid email address.',
  };
  return map[code] || 'Sign in failed. Please try again.';
}

// ── SHOW / HIDE SCREENS ───────────────────────
function showLogin() {
  if (unsubBrothers)    { unsubBrothers();    unsubBrothers    = null; }
  if (unsubChallenges)  { unsubChallenges();  unsubChallenges  = null; }
  if (unsubSubmissions) { unsubSubmissions(); unsubSubmissions = null; }
  streakUpdatedThisSession = false;
  currentTab = 'brothers';
  loginScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  loginForm.reset();
  loginBtn.textContent = 'Sign In';
  loginBtn.disabled    = false;
}

function showApp() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  userBadge.textContent = isAdmin ? '⚡ Admin' : currentUser.email;

  // Admin-only UI
  addBrotherBtn.classList.toggle('hidden', !isAdmin);
  exportBtn.classList.toggle('hidden', !isAdmin);
  statsBar.classList.toggle('hidden', !isAdmin);
  memberHero.classList.toggle('hidden', isAdmin);

  // Tab label: "Brothers" for admin, "My Card" for members
  const brothersTabLabel = document.getElementById('brothersTabLabel');
  if (brothersTabLabel) brothersTabLabel.textContent = isAdmin ? 'Brothers' : 'My Card';

  // Subscribe to brothers collection
  unsubBrothers = onSnapshot(collection(db, 'brothers'), snap => {
    brothers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });

  // Subscribe to challenges
  unsubChallenges = onSnapshot(collection(db, 'challenges'), snap => {
    challenges = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active !== false);
    if (currentTab === 'community') renderFeed();
    updateChallengesBadge();
  });

  // Subscribe to submissions
  unsubSubmissions = onSnapshot(collection(db, 'submissions'), snap => {
    submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (currentTab === 'community') renderFeed();
    updateChallengesBadge();
  });

  // Tab bar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  currentTab = tab;
  const isChallenges = tab === 'community';

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab));

  // Hide everything that belongs to the brothers view
  document.querySelector('.main').classList.toggle('hidden', isChallenges);
  statsBar.classList.toggle('hidden', isChallenges || !isAdmin);
  memberHero.classList.toggle('hidden', isChallenges || isAdmin);

  // Show/hide community section
  document.getElementById('communitySection').classList.toggle('hidden', !isChallenges);

  if (isChallenges) {
    renderFeed();
    localStorage.setItem(`lastFeedVisit_${currentUser.uid}`, new Date().toISOString());
    document.getElementById('communityBadge').classList.add('hidden');
  }
}

function updateChallengesBadge() {
  if (!currentUser) return;
  const badge = document.getElementById('communityBadge');
  if (!badge) return;
  if (isAdmin) {
    const pending = submissions.filter(s => s.status === 'pending').length;
    badge.textContent = pending;
    badge.classList.toggle('hidden', pending === 0);
  } else {
    const lastVisit = localStorage.getItem(`lastFeedVisit_${currentUser.uid}`);
    const newCount  = lastVisit
      ? challenges.filter(c => c.createdAt > lastVisit).length
      : challenges.length;
    badge.textContent = newCount;
    badge.classList.toggle('hidden', newCount === 0 || currentTab === 'community');
  }
}

// ── LEVEL LOGIC ───────────────────────────────
function getLevelInfo(xp) {
  const clamped = Math.min(Math.max(0, xp), 10000);
  if (clamped >= 10000) return { current: LEVELS[9], next: null, progress: 100, xpNeededForNext: 0 };

  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (clamped >= LEVELS[i].xpRequired - 1000) { currentLevel = LEVELS[i]; break; }
  }
  const startXP = (currentLevel.level - 1) * 1000;
  const nextXP  = currentLevel.xpRequired;
  const progress = Math.round(((clamped - startXP) / (nextXP - startXP)) * 100);
  const next = currentLevel.level < 10 ? LEVELS[currentLevel.level] : null;
  return { current: currentLevel, next, progress: Math.min(100, Math.max(0, progress)), xpNeededForNext: next ? nextXP - clamped : 0 };
}

// ── RENDER ────────────────────────────────────
function render() {
  if (isAdmin) {
    renderStats();
    renderGrid();
  } else {
    renderMemberView();
  }
}

function renderStats() {
  const count = brothers.length;
  document.getElementById('statTotalBrothers').textContent = count;
  if (!count) {
    document.getElementById('statGroupDaily').textContent  = '—';
    document.getElementById('statAvgMomentum').textContent = '—';
    document.getElementById('statTotalXP').textContent     = '0';
    document.getElementById('statTopBrother').textContent  = '—';
    return;
  }
  const checkedIn   = brothers.filter(b => b.brotherhoodScore != null);
  const avgBS       = checkedIn.length ? Math.round(checkedIn.reduce((s,b) => s+(b.brotherhoodScore||0), 0) / checkedIn.length) : null;
  const avgMomentum = brothers.reduce((s,b) => s+(b.momentum||0), 0) / count;
  const totalXP     = brothers.reduce((s,b) => s+(b.xp||0),       0);
  const top         = brothers.reduce((best,b) => (!best||(b.xp||0)>(best.xp||0)) ? b : best, null);
  document.getElementById('statGroupDaily').textContent  = avgBS != null ? avgBS : '—';
  document.getElementById('statAvgMomentum').textContent = avgMomentum.toFixed(1);
  document.getElementById('statTotalXP').textContent     = totalXP.toLocaleString();
  document.getElementById('statTopBrother').textContent  = top ? top.name : '—';
}

function renderGrid() {
  if (!brothers.length) {
    emptyState.classList.remove('hidden');
    brothersGrid.innerHTML = '';
    return;
  }
  emptyState.classList.add('hidden');
  brothersGrid.innerHTML = brothers.map(renderCard).join('');
  document.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach(btn =>
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.delete)));
  document.querySelectorAll('[data-addxp]').forEach(btn =>
    btn.addEventListener('click', () => openXPModal(btn.dataset.addxp)));
  document.querySelectorAll('[data-checkin]').forEach(btn =>
    btn.addEventListener('click', () => openCheckInModal(btn.dataset.checkin)));
  document.querySelectorAll('[data-coachnote]').forEach(btn =>
    btn.addEventListener('click', () => openCoachNoteModal(btn.dataset.coachnote)));
  document.querySelectorAll('[data-viewcheckin]').forEach(btn =>
    btn.addEventListener('click', () => openViewCheckInModal(btn.dataset.viewcheckin)));
}

function renderMemberView() {
  // Find this member's profile by matching email
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());

  if (!profile) {
    memberHero.innerHTML = `
      <div class="member-no-profile">
        <div class="empty-icon">${IC.shield}</div>
        <h2>Profile Not Set Up Yet</h2>
        <p>Your mentor hasn't added your profile yet. Check back soon.</p>
      </div>`;
    brothersGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    return;
  }

  // Update streak on login
  updateStreak(profile);

  // Show a full hero profile for the member
  const xp    = profile.xp || 0;
  const lvl   = getLevelInfo(xp);
  const maxed = xp >= 10000;
  const displayArchetype = profile.primaryArchetype || profile.archetype;
  const clr   = ARCHETYPE_COLORS[displayArchetype] || ARCHETYPE_COLORS.Warrior;
  const icon  = archetypeElementIcon(displayArchetype, profile.dominantElement);
  const elColor = ELEMENT_COLORS[profile.dominantElement];

  memberHero.innerHTML = `
    <div class="member-card" style="--arch-border:${clr.border};--arch-glow:${clr.glow};--arch-icon:${clr.icon}">
      <div class="member-card-top">
        <div>
          <div class="member-name">${escHtml(profile.name)}${profile.role === 'mentor' ? ' <span class="mentor-badge">Mentor</span>' : ''}</div>
          ${profile.age ? `<div class="card-age">Age ${profile.age}</div>` : ''}
        </div>
        ${displayArchetype ? `
          <div>
            <div class="archetype-pill">
              <span class="arch-icon">${icon}</span>
              <span class="arch-label">${escHtml(displayArchetype)}</span>
            </div>
            ${profile.dominantElement ? `<span class="element-pill" style="--el-color:${elColor};--el-border:${elColor}55;--el-bg:${elColor}15">${profile.dominantElement}</span>` : ''}
            ${profile.primaryArchetype ? `<button class="archetype-retake" data-take-assessment="${profile.id}" title="Retake Assessment">${IC.clock}</button>` : ''}
          </div>` : ''}
      </div>

      ${!profile.primaryArchetype ? `
        <div class="assess-cta">
          <div class="assess-cta-title">Discover Your Archetype</div>
          <div class="assess-cta-text">Take the 2-minute assessment to find your primary archetype, growth archetype, and dominant element.</div>
          <button class="btn-assess-cta" data-take-assessment="${profile.id}">Take Assessment</button>
        </div>` : ''}

      <div class="xp-hero">
        <div class="xp-hero-num ${maxed ? 'maxed' : ''}">${xp.toLocaleString()}</div>
        <div class="xp-hero-label">TOTAL XP</div>
      </div>

      <div class="level-section">
        <div class="level-row">
          <span class="level-name">Lvl ${lvl.current.level} — ${lvl.current.name}</span>
          <span class="level-pct">${lvl.progress}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${maxed ? 'maxed' : ''}" style="width:${lvl.progress}%"></div>
        </div>
        <div class="progress-next">${lvl.next ? `${lvl.xpNeededForNext.toLocaleString()} XP to ${lvl.next.name}` : 'MAX LEVEL ACHIEVED'}</div>
      </div>

      <div class="scores-row">
        <div class="score-chip momentum">
          <div class="score-num">${(profile.momentum??0).toFixed(1)}</div>
          <div class="score-lbl">Momentum</div>
        </div>
        ${profile.brotherhoodScore != null ? (() => {
          const cat = getBSCategory(profile.brotherhoodScore);
          return `<div class="score-chip weekly" style="--bs-color:${cat.color}">
            <div class="score-num" style="color:${cat.color}">${profile.brotherhoodScore}</div>
            <div class="score-lbl">Weekly Score</div>
            <div class="score-cat" style="color:${cat.color}">${cat.label}</div>
          </div>`;
        })() : `<div class="score-chip weekly empty">
          <div class="score-num" style="color:var(--text-muted)">—</div>
          <div class="score-lbl">Weekly Score</div>
          <div class="score-cat" style="color:var(--text-muted)">No Check-In</div>
        </div>`}
      </div>

      ${(profile.currentStreak > 0) ? `
        <div class="streak-member">
          <span class="streak-flame">${IC.flame}</span>
          <span class="streak-count">${profile.currentStreak}</span>
          <span class="streak-label">day streak</span>
          ${profile.longestStreak > 1 ? `<span class="streak-best">Best: ${profile.longestStreak}</span>` : ''}
        </div>` : ''}

      ${profile.goal ? `
        <div class="card-goal">
          <div class="goal-label">Main Goal</div>
          <div class="goal-text">${escHtml(profile.goal)}</div>
        </div>` : ''}

      ${profile.commitment ? `
        <div class="card-goal">
          <div class="goal-label">Weekly Commitment</div>
          <div class="goal-text">${escHtml(profile.commitment)}</div>
        </div>` : ''}

      ${profile.coachNote ? `
        <div class="coach-note-member">
          <div class="coach-note-member-label">— Note from ${escHtml(profile.coachNoteAuthor || 'Coach')} —</div>
          <div class="coach-note-member-text">${escHtml(profile.coachNote)}</div>
          ${profile.coachNoteDate ? `<div class="coach-note-member-date">${new Date(profile.coachNoteDate).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>` : ''}
        </div>` : ''}

      <button class="btn-checkin-member" data-checkin="${profile.id}">Weekly Check-In</button>
    </div>`;

  // Wire member check-in button
  const ciBtn = memberHero.querySelector('[data-checkin]');
  if (ciBtn) ciBtn.addEventListener('click', () => openCheckInModal(ciBtn.dataset.checkin));

  brothersGrid.innerHTML = '';
  emptyState.classList.add('hidden');
}

function renderCard(brother) {
  const xp      = brother.xp || 0;
  const lvl     = getLevelInfo(xp);
  const displayArchetype = brother.primaryArchetype || brother.archetype;
  const archIcon = archetypeElementIcon(displayArchetype, brother.dominantElement);
  const archClr  = ARCHETYPE_COLORS[displayArchetype] || { border:'var(--border)', glow:'transparent', icon:'var(--orange)' };
  const archElColor = ELEMENT_COLORS[brother.dominantElement];
  const maxed   = xp >= 10000;
  const nextText = lvl.next ? `${lvl.xpNeededForNext.toLocaleString()} XP to ${lvl.next.name}` : 'MAX LEVEL ACHIEVED';

  return `
    <div class="brother-card" id="card-${brother.id}" style="--arch-border:${archClr.border};--arch-glow:${archClr.glow};--arch-icon:${archClr.icon}">
      <div class="card-top">
        <div class="card-identity">
          <div class="card-name">${escHtml(brother.name)}${brother.role === 'mentor' ? ' <span class="mentor-badge">Mentor</span>' : ''}</div>
          ${brother.age ? `<div class="card-age">Age ${brother.age}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon" data-edit="${brother.id}" title="Edit">${IC.edit}</button>
          <button class="btn-icon danger" data-delete="${brother.id}" title="Remove">${IC.trash}</button>
        </div>
      </div>

      ${displayArchetype ? `
        <div class="archetype-pill">
          <span class="arch-icon">${archIcon}</span>
          <span class="arch-label">${escHtml(displayArchetype)}</span>
        </div>
        ${brother.dominantElement ? `<span class="element-pill" style="--el-color:${archElColor};--el-border:${archElColor}55;--el-bg:${archElColor}15">${brother.dominantElement}</span>` : ''}` : ''}

      <div class="xp-hero">
        <div class="xp-hero-num ${maxed ? 'maxed' : ''}">${xp.toLocaleString()}</div>
        <div class="xp-hero-label">TOTAL XP</div>
      </div>

      <div class="level-section">
        <div class="level-row">
          <span class="level-name">Lvl ${lvl.current.level} — ${lvl.current.name}</span>
          <span class="level-pct">${lvl.progress}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${maxed ? 'maxed' : ''}" style="width:${lvl.progress}%"></div>
        </div>
        <div class="progress-next">${nextText}</div>
      </div>

      <div class="scores-row">
        <div class="score-chip momentum">
          <div class="score-num">${(brother.momentum??0).toFixed(1)}</div>
          <div class="score-lbl">Momentum</div>
        </div>
        ${brother.brotherhoodScore != null ? (() => {
          const cat = getBSCategory(brother.brotherhoodScore);
          return `<div class="score-chip weekly" style="--bs-color:${cat.color}">
            <div class="score-num" style="color:${cat.color}">${brother.brotherhoodScore}</div>
            <div class="score-lbl">Weekly Score</div>
            <div class="score-cat" style="color:${cat.color}">${cat.label}</div>
          </div>`;
        })() : `<div class="score-chip weekly empty">
          <div class="score-num" style="color:var(--text-muted)">—</div>
          <div class="score-lbl">Weekly Score</div>
          <div class="score-cat" style="color:var(--text-muted)">No Check-In</div>
        </div>`}
      </div>

      ${(brother.currentStreak > 0) ? `
        <div class="streak-card">
          <span class="streak-flame">${IC.flame}</span>
          <span class="streak-count">${brother.currentStreak}</span>
          <span class="streak-label">day streak</span>
          ${brother.longestStreak > 1 ? `<span class="streak-best">Best: ${brother.longestStreak}</span>` : ''}
        </div>` : ''}

      ${brother.goal ? `
        <div class="card-goal">
          <div class="goal-label">Main Goal</div>
          <div class="goal-text">${escHtml(brother.goal)}</div>
        </div>` : ''}

      ${(brother.weeklyWin || brother.weeklyChallenge || brother.weeklyCommitment) ? `
        <div class="card-reflection">
          ${brother.weeklyWin ? `<div class="cr-item"><span class="cr-label">${IC.bolt} Win</span><span class="cr-text">${escHtml(brother.weeklyWin)}</span></div>` : ''}
          ${brother.weeklyChallenge ? `<div class="cr-item"><span class="cr-label">${IC.mountain} Challenge</span><span class="cr-text">${escHtml(brother.weeklyChallenge)}</span></div>` : ''}
          ${brother.weeklyCommitment ? `<div class="cr-item"><span class="cr-label">${IC.target} Commitment</span><span class="cr-text">${escHtml(brother.weeklyCommitment)}</span></div>` : ''}
        </div>` : ''}

      ${brother.coachNote ? `
        <div class="coach-note-display">
          <div class="coach-note-label">Note from ${escHtml(brother.coachNoteAuthor || 'Coach')}</div>
          <div class="coach-note-text">${escHtml(brother.coachNote)}</div>
          ${brother.coachNoteDate ? `<div class="coach-note-date">${new Date(brother.coachNoteDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>` : ''}
        </div>` : ''}

      <div class="card-btn-row">
        <button class="btn-add-xp" data-addxp="${brother.id}">${IC.bolt} Add XP</button>
        <button class="btn-checkin" data-checkin="${brother.id}" title="Weekly Check-In">Check-In</button>
        ${brother.brotherhoodScore != null ? `<button class="btn-view-checkin" data-viewcheckin="${brother.id}" title="View Check-In">📊</button>` : ''}
        <button class="btn-coach-note" data-coachnote="${brother.id}" title="Coach Note">📋</button>
      </div>
    </div>`;
}

// ── ADD / EDIT BROTHER ────────────────────────
function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Brother';
  brotherForm.reset();
  openModal(brotherModal);
}

function openEditModal(id) {
  const b = brothers.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  modalTitle.textContent = 'Edit Brother';
  document.getElementById('fieldName').value       = b.name       || '';
  document.getElementById('fieldAge').value        = b.age        || '';
  document.getElementById('fieldEmail').value      = b.email      || '';
  document.getElementById('fieldArchetype').value  = b.archetype  || '';
  document.getElementById('fieldXP').value         = b.xp         || 0;
  document.getElementById('fieldMomentum').value   = b.momentum   ?? '';
  document.getElementById('fieldGoal').value       = b.goal       || '';
  document.getElementById('fieldCommitment').value = b.commitment || '';
  document.getElementById('fieldNotes').value      = b.notes      || '';
  document.getElementById('fieldRole').value       = b.role       || 'member';
  openModal(brotherModal);
}

brotherForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    name:       document.getElementById('fieldName').value.trim(),
    age:        parseInt(document.getElementById('fieldAge').value)        || null,
    email:      document.getElementById('fieldEmail').value.trim().toLowerCase(),
    archetype:  document.getElementById('fieldArchetype').value,
    xp:         Math.min(10000, Math.max(0, parseInt(document.getElementById('fieldXP').value)       || 0)),
    momentum:   Math.min(10,    Math.max(0, parseFloat(document.getElementById('fieldMomentum').value) || 0)),
    goal:       document.getElementById('fieldGoal').value.trim(),
    commitment: document.getElementById('fieldCommitment').value.trim(),
    notes:      document.getElementById('fieldNotes').value.trim(),
    role:       document.getElementById('fieldRole').value || 'member',
    updatedAt:  new Date().toISOString(),
  };
  if (!data.name) return;

  try {
    if (editingId) {
      await updateDoc(doc(db, 'brothers', editingId), data);
      showToast('Profile updated', 'success');
    } else {
      const id = 'br_' + Date.now().toString(36);
      await setDoc(doc(db, 'brothers', id), { ...data, createdAt: new Date().toISOString() });
      showToast(`${data.name} added to the Brotherhood`, 'success');
    }
    closeModal(brotherModal);
  } catch (err) {
    showToast('Error saving: ' + err.message, 'info');
  }
});

// ── ADD XP ────────────────────────────────────
function openXPModal(id) {
  const b = brothers.find(x => x.id === id);
  if (!b) return;
  xpBrotherId.value = id;
  document.getElementById('xpBrotherName').textContent = b.name;
  document.getElementById('xpAmount').value = '';
  openModal(xpModal);
  setTimeout(() => document.getElementById('xpAmount').focus(), 120);
}

const xpForm       = document.getElementById('xpForm');
const xpBrotherId  = document.getElementById('xpBrotherId');

xpForm.addEventListener('submit', async e => {
  e.preventDefault();
  const id     = xpBrotherId.value;
  const amount = parseInt(document.getElementById('xpAmount').value) || 0;
  const reason = document.getElementById('xpReason').value;
  if (amount <= 0) return;

  const b     = brothers.find(x => x.id === id);
  const newXP = Math.min(10000, (b.xp || 0) + amount);

  try {
    await updateDoc(doc(db, 'brothers', id), { xp: newXP, updatedAt: new Date().toISOString() });
    closeModal(xpModal);
    showToast(`+${amount} XP → ${b.name} (${reason})`, 'success');
  } catch (err) {
    showToast('Error adding XP: ' + err.message, 'info');
  }
});

// ── DELETE ────────────────────────────────────
function openDeleteModal(id) {
  const b = brothers.find(x => x.id === id);
  if (!b) return;
  deletingId = id;
  document.getElementById('deleteMsg').textContent = `Remove ${b.name} from the Brotherhood? This cannot be undone.`;
  openModal(deleteModal);
}

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
  if (!deletingId) return;
  const b = brothers.find(x => x.id === deletingId);
  try {
    await deleteDoc(doc(db, 'brothers', deletingId));
    deletingId = null;
    closeModal(deleteModal);
    showToast(`${b?.name || 'Brother'} removed`, 'info');
  } catch (err) {
    showToast('Error removing: ' + err.message, 'info');
  }
});

document.getElementById('deleteCancelBtn').addEventListener('click', () => {
  deletingId = null;
  closeModal(deleteModal);
});

// ── COACH NOTES ───────────────────────────────
function openCoachNoteModal(id) {
  const b = brothers.find(x => x.id === id);
  if (!b) return;
  document.getElementById('coachNoteBrotherId').value = id;
  document.getElementById('coachNoteBrotherName').textContent = b.name;
  document.getElementById('coachNoteText').value = b.coachNote || '';
  openModal(coachNoteModal);
  setTimeout(() => document.getElementById('coachNoteText').focus(), 120);
}

document.getElementById('coachNoteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id   = document.getElementById('coachNoteBrotherId').value;
  const note = document.getElementById('coachNoteText').value.trim();
  const b    = brothers.find(x => x.id === id);
  if (!b) return;

  // Determine author name from current user's brother profile
  const authorProfile = brothers.find(x => x.email && x.email.toLowerCase() === currentUser.email.toLowerCase());
  const authorName = authorProfile?.name || (isAdmin ? 'Coach' : currentUser.email);

  try {
    await updateDoc(doc(db, 'brothers', id), {
      coachNote:       note,
      coachNoteDate:   new Date().toISOString(),
      coachNoteAuthor: authorName,
      updatedAt:       new Date().toISOString(),
    });
    closeModal(coachNoteModal);
    showToast(`Note sent to ${b.name}`, 'success');
  } catch (err) {
    showToast('Error saving note: ' + err.message, 'info');
  }
});

document.getElementById('coachNoteModalClose').addEventListener('click', () => closeModal(coachNoteModal));
document.getElementById('coachNoteCancelBtn').addEventListener('click',  () => closeModal(coachNoteModal));
coachNoteModal.addEventListener('click', e => { if (e.target === coachNoteModal) closeModal(coachNoteModal); });

// ── STREAK ────────────────────────────────────
async function updateStreak(profile) {
  if (streakUpdatedThisSession) return;
  streakUpdatedThisSession = true;

  const now      = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const last     = profile.lastLoginDate ? profile.lastLoginDate.slice(0, 10) : null;

  if (last === todayStr) return; // already logged in today, no update needed

  let streak = profile.currentStreak || 0;

  if (last) {
    const lastDate  = new Date(last + 'T00:00:00');
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    streak = (last === yesterdayStr) ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  const longest = Math.max(streak, profile.longestStreak || 0);

  try {
    await updateDoc(doc(db, 'brothers', profile.id), {
      currentStreak: streak,
      longestStreak: longest,
      lastLoginDate: now.toISOString(),
    });
  } catch (_) {}
}

// ── VIEW CHECK-IN (admin read-only) ──────────
function openViewCheckInModal(id) {
  const b = brothers.find(x => x.id === id);
  if (!b || b.brotherhoodScore == null) return;

  const cat    = getBSCategory(b.brotherhoodScore);
  const date   = b.lastCheckInDate ? new Date(b.lastCheckInDate).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : null;
  const scores = [
    { label: 'Focus',       val: b.focusScore },
    { label: 'Movement',    val: b.movementScore },
    { label: 'Discipline',  val: b.disciplineScore },
    { label: 'Composure',   val: b.composureScore },
    { label: 'Stoke',       val: b.stokeScore },
  ];

  document.getElementById('viewCheckInContent').innerHTML = `
    <div class="vci-name">${escHtml(b.name)}</div>
    ${date ? `<div class="vci-date">${date}</div>` : ''}

    <div class="vci-score-block" style="--bs-color:${cat.color}">
      <div class="vci-score-num" style="color:${cat.color}">${b.brotherhoodScore}<span class="vci-score-denom">/100</span></div>
      <div class="vci-score-cat" style="color:${cat.color}">${cat.label}</div>
      <div class="vci-score-label">Brotherhood Score</div>
    </div>

    <div class="vci-sliders">
      ${scores.map(s => {
        const pct = ((s.val - 1) / 9) * 100;
        const barColor = s.val >= 8 ? '#F5D97A' : s.val >= 6 ? '#4B72AA' : s.val >= 4 ? '#6b8fc4' : '#5a5a6a';
        return `<div class="vci-slider-row">
          <span class="vci-slider-label">${s.label}</span>
          <div class="vci-bar-track"><div class="vci-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
          <span class="vci-slider-val">${s.val}</span>
        </div>`;
      }).join('')}
    </div>

    ${(b.weeklyWin || b.weeklyChallenge || b.weeklyCommitment) ? `
    <div class="vci-reflection">
      ${b.weeklyWin ? `<div class="vci-r-item"><div class="vci-r-label">${IC.bolt} Win</div><div class="vci-r-text">${escHtml(b.weeklyWin)}</div></div>` : ''}
      ${b.weeklyChallenge ? `<div class="vci-r-item"><div class="vci-r-label">${IC.mountain} Challenge</div><div class="vci-r-text">${escHtml(b.weeklyChallenge)}</div></div>` : ''}
      ${b.weeklyCommitment ? `<div class="vci-r-item"><div class="vci-r-label">${IC.target} Commitment</div><div class="vci-r-text">${escHtml(b.weeklyCommitment)}</div></div>` : ''}
    </div>` : ''}
  `;

  openModal(viewCheckInModal);
}

document.getElementById('viewCheckInModalClose').addEventListener('click', () => closeModal(viewCheckInModal));
viewCheckInModal.addEventListener('click', e => { if (e.target === viewCheckInModal) closeModal(viewCheckInModal); });

// ── ARCHETYPE ASSESSMENT ──────────────────────
const assessModal   = document.getElementById('assessModal');
const assessContent = document.getElementById('assessContent');

function openAssessment(brotherId) {
  assessBrotherId = brotherId;
  assessAnswers   = new Array(ASSESS_QUESTIONS.length).fill(null);
  assessIndex     = 0;
  renderAssessIntro();
  openModal(assessModal);
}

function renderAssessIntro() {
  assessContent.innerHTML = `
    <div class="assess-intro">
      <div class="assess-intro-icon">${IC.target}</div>
      <div class="assess-intro-title">Find Your Archetype</div>
      <p class="assess-intro-text">24 quick questions. Pick where you naturally lean — there's no right answer, just the honest one. Takes about 4 minutes.</p>
      <button class="btn btn-primary assess-done-btn" id="assessStartBtn">Start Assessment</button>
    </div>`;
  document.getElementById('assessStartBtn').addEventListener('click', () => renderAssessQuestion());
}

function renderAssessQuestion() {
  const q   = ASSESS_QUESTIONS[assessIndex];
  const val = assessAnswers[assessIndex];
  const labels = ['Strongly Agree', 'Slightly Agree', 'Neutral', 'Slightly Agree', 'Strongly Agree'];

  assessContent.innerHTML = `
    <div class="assess-progress-track"><div class="assess-progress-fill" style="width:${((assessIndex)/ASSESS_QUESTIONS.length)*100}%"></div></div>
    <div class="assess-step-label">Question ${assessIndex + 1} of ${ASSESS_QUESTIONS.length}</div>
    <div class="assess-lean-heading">What do you lean towards more?</div>
    <div class="assess-sides">
      <div class="assess-side left">${escHtml(q.left)}</div>
      <div class="assess-side right">${escHtml(q.right)}</div>
    </div>
    <div class="assess-spectrum">
      ${[1,2,3,4,5].map(v => `<button class="spectrum-btn ${val === v ? 'selected' : ''}" data-val="${v}"></button>`).join('')}
    </div>
    <div class="assess-spectrum-labels">${labels.map(l => `<span>${l}</span>`).join('')}</div>
    <div class="assess-nav">
      <button class="btn btn-ghost" id="assessBackBtn" ${assessIndex === 0 ? 'disabled' : ''}>Back</button>
      <div class="assess-nav-spacer"></div>
      <button class="btn btn-primary" id="assessNextBtn" ${val == null ? 'disabled' : ''}>${assessIndex === ASSESS_QUESTIONS.length - 1 ? 'See Results' : 'Next'}</button>
    </div>`;

  assessContent.querySelectorAll('.spectrum-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      assessAnswers[assessIndex] = parseInt(btn.dataset.val, 10);
      renderAssessQuestion();
    });
  });
  document.getElementById('assessBackBtn').addEventListener('click', () => {
    if (assessIndex > 0) { assessIndex--; renderAssessQuestion(); }
  });
  document.getElementById('assessNextBtn').addEventListener('click', () => {
    if (assessAnswers[assessIndex] == null) return;
    if (assessIndex < ASSESS_QUESTIONS.length - 1) { assessIndex++; renderAssessQuestion(); }
    else finishAssessment();
  });
}

async function finishAssessment() {
  const archetypeScores = {};
  Object.keys(ARCHETYPE_DESC).forEach(a => archetypeScores[a] = 0);
  const elementScores = { Fire: 0, Water: 0, Air: 0, Earth: 0 };

  ASSESS_QUESTIONS.forEach((q, i) => {
    const v = assessAnswers[i];
    if (v == null) return;
    if (v === 1) { archetypeScores[q.leftScore.arch] += 5; elementScores[q.leftScore.el] += 5; }
    else if (v === 2) { archetypeScores[q.leftScore.arch] += 3; elementScores[q.leftScore.el] += 3; }
    else if (v === 3) { archetypeScores[q.leftScore.arch] += 1; elementScores[q.leftScore.el] += 1; archetypeScores[q.rightScore.arch] += 1; elementScores[q.rightScore.el] += 1; }
    else if (v === 4) { archetypeScores[q.rightScore.arch] += 3; elementScores[q.rightScore.el] += 3; }
    else if (v === 5) { archetypeScores[q.rightScore.arch] += 5; elementScores[q.rightScore.el] += 5; }
  });

  const archSorted = Object.entries(archetypeScores).sort((a, b) => b[1] - a[1]);
  const primaryArchetype = archSorted[0][0];
  const growthArchetype  = archSorted[1][0];
  const dominantElement  = Object.entries(elementScores).sort((a, b) => b[1] - a[1])[0][0];

  if (assessBrotherId) {
    // Update local state immediately so the card reflects results without waiting on the snapshot round-trip
    const local = brothers.find(b => b.id === assessBrotherId);
    if (local) Object.assign(local, { primaryArchetype, growthArchetype, dominantElement, archetypeScores, elementScores });
    render();

    try {
      await updateDoc(doc(db, 'brothers', assessBrotherId), {
        primaryArchetype, growthArchetype, dominantElement, archetypeScores, elementScores,
        assessmentCompletedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to save assessment results:', err);
      showToast('Results shown but failed to save — check your connection and retake.', 'info');
    }
  }

  renderAssessResults(primaryArchetype, growthArchetype, dominantElement);
}

function renderAssessResults(primaryArchetype, growthArchetype, dominantElement) {
  const pClr = ARCHETYPE_COLORS[primaryArchetype];
  const gClr = ARCHETYPE_COLORS[growthArchetype];
  const elColor = ELEMENT_COLORS[dominantElement];
  const pIcon = archetypeElementIcon(primaryArchetype, dominantElement);
  const gIcon = archetypeElementIcon(growthArchetype, dominantElement);

  assessContent.innerHTML = `
    <div class="assess-results">
      <div class="assess-result-card" style="--arch-border:${pClr.border};--arch-glow:${pClr.glow};--arch-icon:${pClr.icon}">
        <div class="assess-result-tag">Primary Archetype</div>
        <span class="arch-icon">${pIcon}</span>
        <div class="assess-result-name">${primaryArchetype}</div>
        <div class="assess-result-desc">${ARCHETYPE_DESC[primaryArchetype].primary}</div>
      </div>
      <div class="assess-result-card" style="--arch-border:${gClr.border};--arch-glow:${gClr.glow};--arch-icon:${gClr.icon}">
        <div class="assess-result-tag">Growth Archetype</div>
        <span class="arch-icon">${gIcon}</span>
        <div class="assess-result-name">${growthArchetype}</div>
        <div class="assess-result-desc">${ARCHETYPE_DESC[growthArchetype].growth}</div>
      </div>
      <div class="assess-result-card" style="--arch-border:${elColor}66;--arch-glow:${elColor}11;--arch-icon:${elColor}">
        <div class="assess-result-tag">Dominant Element</div>
        <div class="assess-result-name">${dominantElement}</div>
        <div class="assess-result-desc">${ELEMENT_DESC[dominantElement]}</div>
      </div>
      <p class="assess-mirror">"Your archetype is not a box. It shows your strongest natural energy right now and where you can grow next."</p>
      <button class="btn btn-primary assess-done-btn" id="assessCloseBtn">Done</button>
    </div>`;

  document.getElementById('assessCloseBtn').addEventListener('click', () => closeModal(assessModal));
}

document.getElementById('assessModalClose').addEventListener('click', () => closeModal(assessModal));
assessModal.addEventListener('click', e => { if (e.target === assessModal) closeModal(assessModal); });

memberHero.addEventListener('click', e => {
  const btn = e.target.closest('[data-take-assessment]');
  if (btn) openAssessment(btn.dataset.takeAssessment);
});

// ── WEEKLY CHECK-IN ───────────────────────────
const SLIDER_IDS = ['focus','movement','discipline','composure','stoke'];

function openCheckInModal(id) {
  const b = brothers.find(x => x.id === id);
  if (!b) return;
  document.getElementById('checkInBrotherId').value = id;
  document.getElementById('checkInBrotherName').textContent = b.name;

  // Pre-fill sliders from last check-in if available
  SLIDER_IDS.forEach(key => {
    const slider = document.getElementById(`slider-${key}`);
    const saved = b[`${key}Score`];
    slider.value = saved != null ? saved : 5;
    document.getElementById(`val-${key}`).textContent = slider.value;
    updateSliderFill(slider);
  });

  // Pre-fill reflection fields
  document.getElementById('fieldWin').value       = b.weeklyWin        || '';
  document.getElementById('fieldChallenge').value = b.weeklyChallenge  || '';
  document.getElementById('fieldCommit').value    = b.weeklyCommitment || '';

  updateBSPreview();
  openModal(checkInModal);
}

function updateSliderFill(slider) {
  const pct = ((slider.value - 1) / 9) * 100;
  slider.style.setProperty('--fill-pct', pct + '%');
}

function updateBSPreview() {
  const vals = SLIDER_IDS.map(k => parseInt(document.getElementById(`slider-${k}`).value) || 5);
  const score = calcBrotherhoodScore(...vals);
  const cat   = getBSCategory(score);

  document.getElementById('bsScoreNum').textContent = score;
  document.getElementById('bsScoreNum').style.color = cat.color;
  const catEl = document.getElementById('bsCategory');
  catEl.textContent  = cat.label;
  catEl.style.color  = cat.color;

  const labels = ['Focus','Movement','Discipline','Composure','Stoke'];
  document.getElementById('bsBreakdown').innerHTML = vals.map((v,i) =>
    `<div class="bs-row"><span class="bs-row-label">${labels[i]}</span><span class="bs-row-val">${v}</span></div>`
  ).join('');
}

// Wire slider live updates
SLIDER_IDS.forEach(key => {
  const slider = document.getElementById(`slider-${key}`);
  slider.addEventListener('input', () => {
    document.getElementById(`val-${key}`).textContent = slider.value;
    updateSliderFill(slider);
    updateBSPreview();
  });
});

document.getElementById('checkInForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('checkInBrotherId').value;
  const b  = brothers.find(x => x.id === id);
  if (!b) return;

  const focusScore      = parseInt(document.getElementById('slider-focus').value);
  const movementScore   = parseInt(document.getElementById('slider-movement').value);
  const disciplineScore = parseInt(document.getElementById('slider-discipline').value);
  const composureScore  = parseInt(document.getElementById('slider-composure').value);
  const stokeScore      = parseInt(document.getElementById('slider-stoke').value);
  const brotherhoodScore = calcBrotherhoodScore(focusScore, movementScore, disciplineScore, composureScore, stokeScore);

  const data = {
    focusScore, movementScore, disciplineScore, composureScore, stokeScore,
    brotherhoodScore,
    weeklyWin:        document.getElementById('fieldWin').value.trim(),
    weeklyChallenge:  document.getElementById('fieldChallenge').value.trim(),
    weeklyCommitment: document.getElementById('fieldCommit').value.trim(),
    lastCheckInDate:  new Date().toISOString(),
    updatedAt:        new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'brothers', id), data);
    closeModal(checkInModal);
    const cat = getBSCategory(brotherhoodScore);
    showToast(`Check-in complete · Brotherhood Score: ${brotherhoodScore}/100 — ${cat.label}`, 'success');
  } catch (err) {
    showToast('Error saving check-in: ' + err.message, 'info');
  }
});

document.getElementById('checkInModalClose').addEventListener('click', () => closeModal(checkInModal));
checkInModal.addEventListener('click', e => { if (e.target === checkInModal) closeModal(checkInModal); });

// ── COMMUNITY FEED ────────────────────────────
function renderFeed() {
  const el = document.getElementById('feedContainer');
  if (!el) return;
  if (isAdmin) renderFeedAdmin(el);
  else if (isMentor) renderFeedMentor(el);
  else renderFeedMember(el);
}

function renderFeedAdmin(el) {
  const pending = submissions.filter(s => s.status === 'pending');

  let html = `<div class="feed-header">
    <h2 class="feed-title">Challenges Challenges</h2>
    <button class="btn btn-primary" id="createChallengeBtn">+ New Challenge</button>
  </div>`;

  if (pending.length) {
    html += `<div class="feed-section">
      <div class="feed-section-title">${IC.clock} Pending Review (${pending.length})</div>
      <div class="sub-list">
        ${pending.map(s => {
          const ch = challenges.find(c => c.id === s.challengeId);
          return `<div class="sub-card pending">
            ${s.photoUrl ? `<img src="${s.photoUrl}" class="sub-photo" alt="proof" />` : '<div class="sub-no-photo">No photo</div>'}
            <div class="sub-info">
              <div class="sub-brother">${escHtml(s.brotherName)}</div>
              <div class="sub-challenge">${escHtml(ch?.title || 'Challenge')}</div>
              ${s.caption ? `<div class="sub-caption">"${escHtml(s.caption)}"</div>` : ''}
              <div class="sub-xp-badge">+${ch?.xpReward || 0} XP on approve</div>
            </div>
            <div class="sub-actions">
              <button class="btn-approve" data-subid="${s.id}">✓ Approve</button>
              <button class="btn-reject"  data-subid="${s.id}">✕ Reject</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  if (!challenges.length) {
    html += `<div class="feed-empty">No challenges yet. Create one above.</div>`;
  } else {
    html += `<div class="feed-section">
      <div class="feed-section-title">${IC.trophy} Active Challenges</div>
      <div class="challenge-list">
        ${challenges.map(ch => {
          const chSubs  = submissions.filter(s => s.challengeId === ch.id);
          const approved = chSubs.filter(s => s.status === 'approved').length;
          return `<div class="challenge-card" ${challengeCardStyle(ch.tag)}>
            <div class="ch-top">
              <div>
                ${challengeTagPill(ch.tag)}
                <div class="ch-title">${escHtml(ch.title)}</div>
                ${ch.description ? `<div class="ch-desc">${escHtml(ch.description)}</div>` : ''}
              </div>
              <div class="ch-xp-pill">+${ch.xpReward} XP</div>
            </div>
            <div class="ch-meta">
              ${ch.deadline ? `<span>${IC.calendar} ${new Date(ch.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
              ${ch.photoRequired ? `<span>${IC.camera} Photo required</span>` : ''}
              <span>${IC.check} ${approved} completed</span>
              <span>${IC.clock} ${chSubs.filter(s=>s.status==='pending').length} pending</span>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn-edit-challenge btn-ghost-sm" data-editch="${ch.id}">${IC.edit} Edit</button>
              <button class="btn-close-challenge btn-ghost-sm" data-closech="${ch.id}">Archive</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  el.innerHTML = html;

  document.getElementById('createChallengeBtn')?.addEventListener('click', openCreateChallengeModal);
  el.querySelectorAll('.btn-approve').forEach(btn =>
    btn.addEventListener('click', () => approveSubmission(btn.dataset.subid)));
  el.querySelectorAll('.btn-reject').forEach(btn =>
    btn.addEventListener('click', () => rejectSubmission(btn.dataset.subid)));
  el.querySelectorAll('.btn-close-challenge').forEach(btn =>
    btn.addEventListener('click', () => archiveChallenge(btn.dataset.closech)));
  el.querySelectorAll('.btn-edit-challenge').forEach(btn =>
    btn.addEventListener('click', () => openEditChallengeModal(btn.dataset.editch)));
}

function renderFeedMentor(el) {
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  const mySubs  = submissions.filter(s => s.brotherId === profile?.id);

  let html = `<div class="feed-header">
    <h2 class="feed-title">Challenges</h2>
    <button class="btn btn-primary" id="createChallengeBtn">+ New Challenge</button>
  </div>`;

  // Active challenges (same as member view)
  if (!challenges.length) {
    html += `<div class="feed-empty">No active challenges yet.</div>`;
  } else {
    html += `<div class="feed-section"><div class="feed-section-title">${IC.trophy} Active Challenges</div><div class="challenge-list">`;
    challenges.forEach(ch => {
      const mySub = mySubs.find(s => s.challengeId === ch.id);
      const totalApproved = submissions.filter(s => s.challengeId === ch.id && s.status === 'approved').length;
      html += `<div class="challenge-card" ${challengeCardStyle(ch.tag)}>
        <div class="ch-top">
          <div>
            ${challengeTagPill(ch.tag)}
            <div class="ch-title">${escHtml(ch.title)}</div>
            ${ch.description ? `<div class="ch-desc">${escHtml(ch.description)}</div>` : ''}
          </div>
          <div class="ch-xp-pill">+${ch.xpReward} XP</div>
        </div>
        <div class="ch-meta">
          ${ch.deadline ? `<span>${IC.calendar} Due ${new Date(ch.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
          ${ch.photoRequired ? `<span>${IC.camera} Photo required</span>` : ''}
          <span>${IC.check} ${totalApproved} completed</span>
        </div>
        ${mySub ? `<div class="sub-status-badge status-${mySub.status}">
          ${mySub.status === 'pending' ? `${IC.clock} Submitted — awaiting review` : ''}
          ${mySub.status === 'approved' ? `${IC.check} Approved — +${ch.xpReward} XP!` : ''}
          ${mySub.status === 'rejected' ? `${IC.xmark} Rejected — try again` : ''}
        </div>` : `<button class="btn btn-primary" data-submit="${ch.id}">Submit Proof</button>`}
      </div>`;
    });
    html += `</div></div>`;
  }

  // Mentor-only: coach notes section
  const otherBrothers = brothers.filter(b => b.id !== profile?.id);
  if (otherBrothers.length) {
    html += `<div class="feed-section">
      <div class="feed-section-title">${IC.clipboard} Coach Notes</div>
      <div class="challenge-list">
        ${otherBrothers.map(b => `
          <div class="challenge-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <div>
              <div style="font-weight:700;color:var(--text-primary)">${escHtml(b.name)}</div>
              ${b.coachNote ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">"${escHtml(b.coachNote.slice(0,60))}${b.coachNote.length>60?'…':''}"</div>` : `<div style="font-size:12px;color:var(--text-muted)">No note yet</div>`}
            </div>
            <button class="btn-coach-note btn btn-ghost" style="white-space:nowrap" data-coachnote="${b.id}">${IC.edit} Note</button>
          </div>`).join('')}
      </div>
    </div>`;
  }

  el.innerHTML = html;
  document.getElementById('createChallengeBtn')?.addEventListener('click', openCreateChallengeModal);
  el.querySelectorAll('[data-submit]').forEach(btn =>
    btn.addEventListener('click', () => openSubmitProofModal(btn.dataset.submit, profile)));
  el.querySelectorAll('.btn-coach-note').forEach(btn =>
    btn.addEventListener('click', () => openCoachNoteModal(btn.dataset.coachnote)));
}

function renderFeedMember(el) {
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  if (!profile) {
    el.innerHTML = `<div class="feed-empty">Your profile isn't set up yet. Check back soon.</div>`;
    return;
  }

  const mySubs = submissions.filter(s => s.brotherId === profile.id);

  let html = `<div class="feed-header"><h2 class="feed-title">Challenges Challenges</h2></div>`;

  if (!challenges.length) {
    html += `<div class="feed-empty">No active challenges right now. Check back soon! 🏆</div>`;
  } else {
    html += `<div class="feed-section"><div class="feed-section-title">${IC.trophy} Active Challenges</div><div class="challenge-list">`;
    challenges.forEach(ch => {
      const mySub = mySubs.find(s => s.challengeId === ch.id);
      const totalApproved = submissions.filter(s => s.challengeId === ch.id && s.status === 'approved').length;
      html += `<div class="challenge-card member" ${challengeCardStyle(ch.tag)}>
        <div class="ch-top">
          <div>
            ${challengeTagPill(ch.tag)}
            <div class="ch-title">${escHtml(ch.title)}</div>
            ${ch.description ? `<div class="ch-desc">${escHtml(ch.description)}</div>` : ''}
          </div>
          <div class="ch-xp-pill">+${ch.xpReward} XP</div>
        </div>
        <div class="ch-meta">
          ${ch.deadline ? `<span>${IC.calendar} Due ${new Date(ch.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
          ${ch.photoRequired ? `<span>${IC.camera} Photo required</span>` : ''}
          <span>${IC.check} ${totalApproved} completed</span>
        </div>
        ${mySub ? `
          <div class="sub-status-badge status-${mySub.status}">
            ${mySub.status === 'pending' ? `${IC.clock} Submitted — awaiting review` : ''}
            ${mySub.status === 'approved' ? `${IC.check} Approved — +${ch.xpReward} XP awarded!` : ''}
            ${mySub.status === 'rejected' ? `${IC.xmark} Rejected — try again` : ''}
          </div>
          ${mySub.status === 'rejected' ? `<button class="btn btn-primary btn-sm" data-submit="${ch.id}">Resubmit</button>` : ''}
        ` : `<button class="btn btn-primary" data-submit="${ch.id}">Submit Proof</button>`}
      </div>`;
    });
    html += `</div></div>`;
  }

  if (mySubs.length) {
    html += `<div class="feed-section"><div class="feed-section-title">${IC.clipboard} My Submissions</div><div class="sub-list">`;
    mySubs.slice().reverse().forEach(s => {
      const ch = challenges.find(c => c.id === s.challengeId) || { title: 'Challenge', xpReward: 0 };
      html += `<div class="sub-card status-${s.status}">
        ${s.photoUrl ? `<img src="${s.photoUrl}" class="sub-photo" alt="proof" />` : ''}
        <div class="sub-info">
          <div class="sub-challenge">${escHtml(ch.title)}</div>
          ${s.caption ? `<div class="sub-caption">"${escHtml(s.caption)}"</div>` : ''}
          <div class="sub-status-pill status-${s.status}">
            ${s.status === 'pending' ? `${IC.clock} Pending` : s.status === 'approved' ? `${IC.check} Approved +${ch.xpReward} XP` : `${IC.xmark} Rejected`}
          </div>
          <div class="sub-date">${new Date(s.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  el.innerHTML = html;
  el.querySelectorAll('[data-submit]').forEach(btn =>
    btn.addEventListener('click', () => openSubmitProofModal(btn.dataset.submit, profile)));
}

// ── CREATE / EDIT CHALLENGE ───────────────────
const challengeModal = document.getElementById('challengeModal');
let editingChallengeId = null;

function openCreateChallengeModal() {
  editingChallengeId = null;
  document.getElementById('challengeForm').reset();
  document.querySelector('#challengeModal .modal-title').textContent = 'New Challenge';
  document.querySelector('#challengeForm [type="submit"]').textContent = 'Post Challenge';
  openModal(challengeModal);
}

function openEditChallengeModal(id) {
  const ch = challenges.find(c => c.id === id);
  if (!ch) return;
  editingChallengeId = id;
  document.getElementById('challengeTitle').value         = ch.title        || '';
  document.getElementById('challengeDesc').value          = ch.description  || '';
  document.getElementById('challengeXP').value            = ch.xpReward     || '';
  document.getElementById('challengeTag').value           = ch.tag          || '';
  document.getElementById('challengeDeadline').value      = ch.deadline     || '';
  document.getElementById('challengePhotoRequired').checked = ch.photoRequired !== false;
  document.querySelector('#challengeModal .modal-title').textContent = 'Edit Challenge';
  document.querySelector('#challengeForm [type="submit"]').textContent = 'Save Changes';
  openModal(challengeModal);
}

document.getElementById('challengeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const title    = document.getElementById('challengeTitle').value.trim();
  const xpReward = parseInt(document.getElementById('challengeXP').value) || 0;
  if (!title || !xpReward) return;

  const btn = e.submitter;
  btn.disabled    = true;
  btn.textContent = editingChallengeId ? 'Saving…' : 'Posting…';

  const data = {
    title,
    description:   document.getElementById('challengeDesc').value.trim(),
    xpReward,
    tag:           document.getElementById('challengeTag').value || null,
    deadline:      document.getElementById('challengeDeadline').value || null,
    photoRequired: document.getElementById('challengePhotoRequired').checked,
  };

  try {
    if (editingChallengeId) {
      await updateDoc(doc(db, 'challenges', editingChallengeId), data);
      showToast(`Challenge updated!`, 'success');
    } else {
      const id = 'ch_' + Date.now().toString(36);
      await setDoc(doc(db, 'challenges', id), {
        ...data, active: true, createdAt: new Date().toISOString(), createdBy: currentUser.email,
      });
      showToast(`Challenge "${title}" posted!`, 'success');
    }
    closeModal(challengeModal);
  } catch (err) {
    showToast('Error: ' + err.message, 'info');
  } finally {
    btn.disabled    = false;
    btn.textContent = editingChallengeId ? 'Save Changes' : 'Post Challenge';
  }
});

document.getElementById('challengeModalClose').addEventListener('click', () => closeModal(challengeModal));
document.getElementById('challengeCancelBtn').addEventListener('click',  () => closeModal(challengeModal));
challengeModal.addEventListener('click', e => { if (e.target === challengeModal) closeModal(challengeModal); });

async function archiveChallenge(id) {
  await updateDoc(doc(db, 'challenges', id), { active: false });
  showToast('Challenge archived', 'info');
}

// ── SUBMIT PROOF ──────────────────────────────
const submitProofModal = document.getElementById('submitProofModal');
let submittingProfile  = null;

function openSubmitProofModal(challengeId, profile) {
  submittingProfile = profile;
  const ch = challenges.find(c => c.id === challengeId);
  if (!ch) return;
  document.getElementById('submitChallengeId').value       = challengeId;
  document.getElementById('submitChallengeTitle').textContent = ch.title;
  document.getElementById('proofPhoto').value              = '';
  document.getElementById('proofPhotoPreview').src         = '';
  document.getElementById('proofPhotoPreview').classList.add('hidden');
  document.getElementById('photoPlaceholder').classList.remove('hidden');
  document.getElementById('proofCaption').value            = '';
  document.getElementById('submitProofBtn').disabled       = false;
  openModal(submitProofModal);
}

document.getElementById('proofPhoto').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('proofPhotoPreview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  document.getElementById('photoPlaceholder').classList.add('hidden');
});

document.getElementById('submitProofForm').addEventListener('submit', async e => {
  e.preventDefault();
  const challengeId = document.getElementById('submitChallengeId').value;
  const ch          = challenges.find(c => c.id === challengeId);
  const file        = document.getElementById('proofPhoto').files[0];
  const caption     = document.getElementById('proofCaption').value.trim();
  const btn         = document.getElementById('submitProofBtn');

  if (!submittingProfile || !ch) return;
  if (ch.photoRequired && !file) { showToast('Please add a photo', 'info'); return; }

  btn.disabled    = true;
  btn.textContent = 'Submitting…';

  try {
    let photoUrl = null;
    if (file) photoUrl = await compressImage(file, 900, 0.72);

    const id = 'sub_' + Date.now().toString(36);
    await setDoc(doc(db, 'submissions', id), {
      challengeId,
      brotherId:   submittingProfile.id,
      brotherName: submittingProfile.name,
      photoUrl,
      caption,
      status:      'pending',
      submittedAt: new Date().toISOString(),
      xpReward:    ch.xpReward,
    });

    closeModal(submitProofModal);
    showToast('Proof submitted! Waiting for coach approval 🔥', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'info');
    btn.disabled    = false;
    btn.textContent = 'Submit';
  }
});

document.getElementById('submitProofModalClose').addEventListener('click', () => closeModal(submitProofModal));
document.getElementById('submitProofCancelBtn').addEventListener('click',  () => closeModal(submitProofModal));
submitProofModal.addEventListener('click', e => { if (e.target === submitProofModal) closeModal(submitProofModal); });

// ── APPROVE / REJECT ──────────────────────────
async function approveSubmission(subId) {
  const s  = submissions.find(x => x.id === subId);
  if (!s) return;
  const brother = brothers.find(b => b.id === s.brotherId);

  try {
    await updateDoc(doc(db, 'submissions', subId), { status: 'approved', reviewedAt: new Date().toISOString() });
    if (brother) {
      const newXP = Math.min(10000, (brother.xp || 0) + (s.xpReward || 0));
      await updateDoc(doc(db, 'brothers', brother.id), { xp: newXP, updatedAt: new Date().toISOString() });
    }
    showToast(`✅ Approved! +${s.xpReward} XP → ${s.brotherName}`, 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'info');
  }
}

async function rejectSubmission(subId) {
  try {
    await updateDoc(doc(db, 'submissions', subId), { status: 'rejected', reviewedAt: new Date().toISOString() });
    showToast('Submission rejected', 'info');
  } catch (err) {
    showToast('Error: ' + err.message, 'info');
  }
}

// ── EXPORT ────────────────────────────────────
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), brothers }, null, 2)], { type: 'application/json' });
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `stoked-brotherhood-${new Date().toISOString().slice(0,10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Backup downloaded', 'success');
});

// ── MODAL HELPERS ─────────────────────────────
function openModal(el)  { el.classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(el) { el.classList.remove('open'); document.body.style.overflow = '';       }

addBrotherBtn.addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click',   () => closeModal(brotherModal));
document.getElementById('cancelBtn').addEventListener('click',    () => closeModal(brotherModal));
document.getElementById('xpModalClose').addEventListener('click', () => closeModal(xpModal));
document.getElementById('xpCancelBtn').addEventListener('click',  () => closeModal(xpModal));

[brotherModal, xpModal, deleteModal].forEach(el =>
  el.addEventListener('click', e => { if (e.target === el) closeModal(el); }));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') [brotherModal, xpModal, deleteModal, checkInModal, coachNoteModal, viewCheckInModal, challengeModal, submitProofModal].forEach(closeModal);
});

// ── TOAST ─────────────────────────────────────
let toastTimer = null;
const toast = Object.assign(document.createElement('div'), { className: 'toast' });
document.body.appendChild(toast);

function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className   = `toast ${type}`;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── UTILITY ───────────────────────────────────
function compressImage(file, maxPx = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
