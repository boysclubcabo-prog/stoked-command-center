/* ============================================
   STOKED BROTHERHOOD COMMAND CENTER
   Firebase-powered: Auth + Firestore
   ============================================ */

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc,
         onSnapshot, setDoc, updateDoc, addDoc,
         deleteDoc, getDoc, getDocs }             from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, ref as storageRef,
         uploadBytes, getDownloadURL }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { getMessaging, getToken, onMessage }      from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

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
const storage     = getStorage(firebaseApp);
const messaging   = getMessaging(firebaseApp);

// ── ADMIN EMAIL ───────────────────────────────
// Only this email gets full admin access
const ADMIN_EMAIL = 'boysclubcabo@gmail.com';

// ── LEVEL SYSTEM ──────────────────────────────
// xpRequired = XP threshold to ENTER this level
const LEVELS = [
  { level: 1,  name: 'Recruit',    xpRequired: 0     },
  { level: 2,  name: 'Initiate',   xpRequired: 1000  },
  { level: 3,  name: 'Apprentice', xpRequired: 2000  },
  { level: 4,  name: 'Challenger', xpRequired: 3000  },
  { level: 5,  name: 'Pathfinder', xpRequired: 4000  },
  { level: 6,  name: 'Ascender',   xpRequired: 5000  },
  { level: 7,  name: 'Vanguard',   xpRequired: 6000  },
  { level: 8,  name: 'Captain',    xpRequired: 7000  },
  { level: 9,  name: 'Commander',  xpRequired: 8500  },
  { level: 10, name: 'King',       xpRequired: 10000 },
  { level: 11, name: 'Mentor',     xpRequired: 12500 },
  { level: 12, name: 'Legend',     xpRequired: 15000 },
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

const SCENARIO_QUESTIONS = [
  {
    scenario: "Your group can't agree on what to do. No one is stepping up.",
    question:  "What do you naturally do?",
    answers: [
      { text: "Take charge and make a call — someone has to.",                              scores: { Warrior: 1, Leader: 2, Fire: 2 } },
      { text: "Suggest something creative that everyone might actually enjoy.",             scores: { Creator: 2, Communicator: 1, Air: 2 } },
      { text: "Listen to what everyone wants before you say anything.",                     scores: { Communicator: 2, Guardian: 1, Water: 2 } },
      { text: "Step back, read the room, then speak when you know what to say.",            scores: { Strategist: 2, Monk: 1, Air: 1, Earth: 1 } },
    ]
  },
  {
    scenario: "You hit a serious setback. Something you worked hard for didn't come through.",
    question:  "What's your first instinct?",
    answers: [
      { text: "Push through. Failure is just the cost of going after something real.",       scores: { Warrior: 2, Leader: 1, Fire: 2 } },
      { text: "Pull back and rethink your strategy before making another move.",             scores: { Strategist: 2, Builder: 1, Air: 1, Water: 1 } },
      { text: "Talk to someone you trust. You don't carry things alone.",                   scores: { Communicator: 1, Guardian: 2, Water: 2 } },
      { text: "Accept it, recalibrate, and adapt. That's how you move.",                    scores: { Explorer: 2, Monk: 1, Earth: 1, Water: 1 } },
    ]
  },
  {
    scenario: "You have an entire weekend with no obligations and nowhere to be.",
    question:  "What do you actually do?",
    answers: [
      { text: "Start a project you've been putting off. Finally make progress on it.",      scores: { Builder: 2, Warrior: 1, Earth: 2 } },
      { text: "Go somewhere you've never been. Explore something completely new.",          scores: { Explorer: 2, Creator: 1, Air: 2 } },
      { text: "Go deep — solitude, prayer, journaling. Recharge from the inside.",         scores: { Monk: 2, Strategist: 1, Water: 2 } },
      { text: "Invest in the people who matter. Real time, real conversations.",            scores: { Communicator: 1, Protector: 1, Guardian: 1, Water: 2 } },
    ]
  },
  {
    scenario: "A younger man comes to you and asks for honest life advice.",
    question:  "How do you respond?",
    answers: [
      { text: "Share hard-earned lessons from your own failures. Keep it real.",            scores: { Sovereign: 2, Warrior: 1, Fire: 2 } },
      { text: "Ask him questions until he discovers his own answer.",                       scores: { Monk: 2, Communicator: 1, Water: 2 } },
      { text: "Give him a clear, practical plan he can actually follow.",                   scores: { Builder: 2, Strategist: 1, Earth: 2 } },
      { text: "Paint a bigger picture of who he could become.",                             scores: { Visionary: 2, Leader: 1, Air: 2 } },
    ]
  },
  {
    scenario: "You're in a group and every role needs to be filled.",
    question:  "Which one do you naturally drift toward?",
    answers: [
      { text: "Setting the direction. Making the final call when no one else will.",        scores: { Leader: 2, Sovereign: 1, Fire: 2 } },
      { text: "Keeping everything running. Making sure the work actually gets done.",       scores: { Builder: 2, Guardian: 1, Earth: 2 } },
      { text: "Bringing the original ideas. Thinking in ways no one else is.",             scores: { Creator: 2, Visionary: 1, Air: 2 } },
      { text: "Making sure every voice is heard. Holding the group together.",             scores: { Communicator: 2, Protector: 1, Water: 2 } },
    ]
  },
  {
    scenario: "There's a specific kind of moment where you feel completely alive.",
    question:  "Which one is it for you?",
    answers: [
      { text: "Competing or conquering something physically demanding.",                    scores: { Warrior: 2, Explorer: 1, Fire: 2 } },
      { text: "Building or creating something that didn't exist before.",                   scores: { Creator: 2, Builder: 1, Air: 1, Earth: 1 } },
      { text: "A real conversation — the kind where something actually shifts.",            scores: { Communicator: 2, Guardian: 1, Water: 2 } },
      { text: "Total solitude — a mountain, a trail, a quiet room. Just you.",             scores: { Monk: 2, Explorer: 1, Earth: 1, Water: 1 } },
    ]
  },
  {
    scenario: "Someone you deeply respect makes a decision you believe is wrong.",
    question:  "What do you do?",
    answers: [
      { text: "Say it directly. Even if the room goes quiet.",                             scores: { Warrior: 1, Sovereign: 2, Fire: 2 } },
      { text: "Ask questions. Understand their thinking before you react.",                scores: { Strategist: 2, Communicator: 1, Air: 2 } },
      { text: "Back them publicly. Address it privately when the time is right.",          scores: { Guardian: 2, Protector: 1, Earth: 2 } },
      { text: "Trust the process. Watch what unfolds before stepping in.",                 scores: { Monk: 2, Builder: 1, Water: 1, Earth: 1 } },
    ]
  },
  {
    scenario: "If it's all said and done and you're remembered for one thing...",
    question:  "What do you want it to be?",
    answers: [
      { text: "What you built — something lasting that outlives you.",                     scores: { Builder: 2, Sovereign: 1, Earth: 2 } },
      { text: "How you led — the men you raised up and the fire you lit in them.",        scores: { Leader: 1, Sovereign: 2, Fire: 2 } },
      { text: "How you made people feel — seen, valued, and not alone.",                  scores: { Communicator: 2, Protector: 1, Water: 2 } },
      { text: "The life you actually lived — fully, boldly, with no held back.",          scores: { Explorer: 2, Warrior: 1, Air: 1, Fire: 1 } },
    ]
  },
  {
    scenario: "The pressure is at its highest. Everyone around you is rattled.",
    question:  "What happens to you?",
    answers: [
      { text: "You get sharper. More decisive. Pressure is fuel.",                         scores: { Warrior: 1, Leader: 2, Fire: 2 } },
      { text: "You go quiet. Calculated. You play the longer game.",                      scores: { Strategist: 2, Sovereign: 1, Water: 1, Air: 1 } },
      { text: "You become the anchor. Calm and steady while everything shakes.",           scores: { Protector: 2, Guardian: 2, Earth: 2 } },
      { text: "Something unlocks. Pressure sparks your best ideas.",                      scores: { Creator: 2, Visionary: 1, Air: 2 } },
    ]
  },
  {
    scenario: "A brother in your circle is going through a hard season. He hasn't asked for help.",
    question:  "What do you do?",
    answers: [
      { text: "Show up uninvited. You don't wait for people to ask.",                      scores: { Protector: 2, Guardian: 1, Fire: 1, Earth: 1 } },
      { text: "Create the right moment — a conversation, a meal, a walk.",                scores: { Communicator: 2, Leader: 1, Water: 2 } },
      { text: "Find the most practical way to take a burden off him right now.",          scores: { Builder: 2, Guardian: 1, Earth: 2 } },
      { text: "Hold him in prayer and stay present — sometimes presence is enough.",      scores: { Monk: 2, Protector: 1, Water: 2 } },
    ]
  },
];

const PI = {
  mountain:  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,36 20,7 38,36"/><polyline points="10,36 20,20 30,36"/><line x1="2" y1="36" x2="38" y2="36"/></svg>`,
  forest:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,4 28,16 24,16 30,26 22,26 22,36 18,36 18,26 10,26 16,16 12,16 20,4"/><line x1="6" y1="36" x2="34" y2="36"/></svg>`,
  workshop:  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,20 20,6 36,20"/><rect x="6" y="20" width="28" height="14"/><rect x="15" y="26" width="10" height="8"/></svg>`,
  boxing:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10,16 Q10,8 20,8 Q30,8 30,16 L30,24 Q30,30 24,30 L16,30 Q10,30 10,24 Z"/><line x1="10" y1="18" x2="30" y2="18"/><path d="M10,24 Q8,26 8,30 Q8,34 12,34 L28,34 Q32,34 32,28 L30,24"/></svg>`,
  sword:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="20" y1="4" x2="20" y2="30"/><line x1="12" y1="22" x2="28" y2="22"/><polyline points="16,30 20,36 24,30"/></svg>`,
  compass:   `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="14"/><polygon points="20,10 23,20 20,30 17,20" fill="currentColor" stroke="none"/><line x1="6" y1="20" x2="11" y2="20"/><line x1="29" y1="20" x2="34" y2="20"/></svg>`,
  brush:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="8" x2="26" y2="26"/><path d="M26,26 Q34,30 32,36 Q28,40 24,34 Q22,30 26,26"/></svg>`,
  hammer:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="28" x2="8" y2="36"/><line x1="12" y1="28" x2="26" y2="14"/><polyline points="22,8 34,20 26,28 14,16 22,8"/></svg>`,
  wolf:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8,28 Q8,16 16,12 Q20,10 24,12 Q32,16 32,28"/><path d="M8,20 L4,10 L12,16"/><path d="M32,20 L36,10 L28,16"/><path d="M16,24 Q20,28 24,24"/><circle cx="15" cy="19" r="1.5" fill="currentColor" stroke="none"/><circle cx="25" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  owl:       `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10,28 Q8,20 12,12 Q16,6 20,8 Q24,6 28,12 Q32,20 30,28 Q26,34 20,32 Q14,34 10,28 Z"/><circle cx="15" cy="18" r="4"/><circle cx="25" cy="18" r="4"/><path d="M17,28 Q20,30 23,28"/><polyline points="14,8 17,14"/><polyline points="26,8 23,14"/></svg>`,
  eagle:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4,18 Q12,10 20,14 Q28,10 36,18"/><path d="M20,14 L20,30"/><path d="M14,30 Q20,28 26,30"/><circle cx="20" cy="12" r="3"/><path d="M20,15 Q22,12 24,14"/></svg>`,
  bear:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="11" r="4"/><circle cx="27" cy="11" r="4"/><path d="M10,15 Q8,22 10,28 Q14,36 20,36 Q26,36 30,28 Q32,22 30,15 Q26,10 20,12 Q14,10 10,15 Z"/><circle cx="16" cy="22" r="1.5" fill="currentColor" stroke="none"/><circle cx="24" cy="22" r="1.5" fill="currentColor" stroke="none"/><path d="M16,28 Q20,31 24,28"/></svg>`,
  waves:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2,14 Q8,8 14,14 Q20,20 26,14 Q32,8 38,14"/><path d="M2,22 Q8,16 14,22 Q20,28 26,22 Q32,16 38,22"/><path d="M2,30 Q8,24 14,30 Q20,36 26,30 Q32,24 38,30"/></svg>`,
  campfire:  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20,6 Q24,12 22,18 Q26,12 24,22 Q28,16 26,24 Q28,30 20,34 Q12,30 14,24 Q12,16 16,22 Q14,12 18,18 Q16,12 20,6"/><line x1="8" y1="34" x2="32" y2="34"/><line x1="12" y1="34" x2="20" y2="26"/><line x1="28" y1="34" x2="20" y2="26"/></svg>`,
  temple:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="36" x2="36" y2="36"/><line x1="4" y1="32" x2="36" y2="32"/><line x1="4" y1="14" x2="36" y2="14"/><polyline points="20,4 4,14 36,14 20,4"/><line x1="11" y1="14" x2="11" y2="32"/><line x1="20" y1="14" x2="20" y2="32"/><line x1="29" y1="14" x2="29" y2="32"/></svg>`,
  stars:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="20,6 22.5,14 30,14 24,18.5 26.5,26 20,22 13.5,26 16,18.5 10,14 17.5,14"/><circle cx="6" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="34" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="26" r="1" fill="currentColor" stroke="none"/><circle cx="36" cy="26" r="1" fill="currentColor" stroke="none"/></svg>`,
  trail:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,36 6,26 2,26 10,14 7,14 16,4 22,12 19,12 28,24 25,24 34,36"/><path d="M12,36 Q20,28 28,36"/></svg>`,
  mtnpath:   `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,36 20,8 36,36"/><line x1="4" y1="36" x2="36" y2="36"/><polyline points="12,36 16,28 22,32 26,22 30,28 34,36"/></svg>`,
  desert:    `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2,28 Q10,16 20,20 Q30,24 38,28"/><line x1="2" y1="36" x2="38" y2="36"/><circle cx="30" cy="10" r="5"/><line x1="30" y1="2" x2="30" y2="4"/><line x1="36" y1="4" x2="38" y2="2"/><line x1="38" y1="10" x2="40" y2="10"/><line x1="36" y1="16" x2="38" y2="18"/></svg>`,
  coastal:   `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2,26 Q10,20 18,26 Q26,32 34,26"/><line x1="2" y1="34" x2="38" y2="34"/><path d="M8,8 L8,22"/><path d="M8,8 L16,12 L8,16"/><path d="M4,26 Q10,20 16,26"/></svg>`,
  music:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14,32 Q14,20 18,10 L32,6 L32,18 M18,10 L32,6"/><path d="M32,18 Q28,18 26,22 Q24,26 26,30 Q28,34 32,32 Q36,30 34,26 Q32,22 28,22 Q24,22 22,28 Q20,32 22,36 Q14,36 14,30"/><circle cx="11" cy="34" r="4"/></svg>`,
  books:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="8" height="24" rx="1"/><rect x="15" y="8" width="10" height="26" rx="1"/><rect x="28" y="12" width="8" height="22" rx="1"/><line x1="4" y1="36" x2="36" y2="36"/></svg>`,
  tent:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,34 20,6 38,34"/><polyline points="12,34 20,16 28,34"/><line x1="2" y1="34" x2="38" y2="34"/><line x1="20" y1="6" x2="20" y2="2"/></svg>`,
  fire:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20,6 Q24,12 22,18 Q26,12 24,20 Q28,14 26,22 Q30,30 22,36 Q14,36 12,28 Q10,18 14,22 Q12,12 16,18 Q14,10 20,6"/></svg>`,
  wave:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2,16 Q8,8 14,16 Q20,24 26,16 Q32,8 38,16"/><path d="M2,26 Q8,18 14,26 Q20,34 26,26 Q32,18 38,26"/></svg>`,
  feather:   `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M30,6 Q18,8 12,18 Q8,26 12,34"/><line x1="12" y1="34" x2="30" y2="6"/><line x1="12" y1="18" x2="26" y2="14"/><line x1="10" y1="24" x2="22" y2="20"/></svg>`,
  cabin:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,20 20,6 36,20"/><rect x="6" y="20" width="28" height="16"/><rect x="14" y="28" width="12" height="8"/><rect x="8" y="22" width="8" height="8" rx="1"/><rect x="24" y="22" width="8" height="8" rx="1"/><line x1="22" y1="10" x2="22" y2="6"/><path d="M22,6 Q24,2 26,6"/></svg>`,
  lake:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4,32 Q12,26 20,32 Q28,38 36,32"/><circle cx="20" cy="14" r="4"/><line x1="20" y1="18" x2="20" y2="24"/><line x1="14" y1="24" x2="26" y2="24"/><line x1="14" y1="30" x2="20" y2="24"/><line x1="26" y1="30" x2="20" y2="24"/></svg>`,
  storm:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8,20 Q8,10 16,10 Q18,4 26,6 Q34,8 32,18 Q38,18 36,24 Q34,28 28,26 L12,26 Q6,26 8,20"/><polyline points="18,26 14,34 20,30 16,38"/></svg>`,
  rain:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8,18 Q8,10 16,10 Q18,4 24,6 Q30,8 30,16 Q36,16 34,22 Q32,26 26,24 L12,24 Q6,24 8,18"/><line x1="12" y1="28" x2="10" y2="36"/><line x1="18" y1="28" x2="16" y2="36"/><line x1="24" y1="28" x2="22" y2="36"/><line x1="30" y1="28" x2="28" y2="36"/></svg>`,
  wind:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2,14 Q14,14 18,10 Q22,6 20,2 Q16,0 14,4 Q12,8 18,10"/><path d="M2,20 Q20,20 26,16 Q32,12 30,8 Q26,4 22,8 Q20,12 26,16"/><path d="M2,26 Q16,26 20,30 Q22,34 20,38 Q16,40 14,36 Q12,32 20,30"/></svg>`,
  leaf:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20,34 Q8,34 8,20 Q8,8 20,6 Q32,6 32,20 Q32,34 20,34 Z"/><line x1="20" y1="34" x2="20" y2="8"/><line x1="20" y1="16" x2="28" y2="10"/><line x1="20" y1="24" x2="12" y2="18"/></svg>`,
  solo:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="11" r="6"/><path d="M8,36 Q8,24 20,24 Q32,24 32,36"/></svg>`,
  pair:      `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="11" r="5"/><path d="M2,36 Q2,26 13,26 Q24,26 24,36"/><circle cx="29" cy="13" r="4"/><path d="M21,36 Q21,28 29,28 Q37,28 37,36"/></svg>`,
  group:     `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="9" r="5"/><circle cx="7" cy="13" r="4"/><circle cx="33" cy="13" r="4"/><path d="M9,36 Q9,24 20,24 Q31,24 31,36"/><path d="M2,36 Q2,26 7,26"/><path d="M38,36 Q38,26 33,26"/></svg>`,
  map:       `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="2,8 14,6 26,10 38,8 38,32 26,34 14,30 2,32"/><line x1="14" y1="6" x2="14" y2="30"/><line x1="26" y1="10" x2="26" y2="34"/><path d="M6,14 Q10,18 14,14 Q18,10 22,14 Q26,18 30,14 Q34,12 36,16"/></svg>`,
};

const PERCEPTION_QUESTIONS = [
  {
    question: "If you had an entire Saturday to yourself, where would you honestly want to spend it?",
    answers: [
      { icon: 'mountain',  label: 'Mountain Peak',     meaning: 'Pushing yourself, earning the view, doing something challenging.', scores: { Explorer: 2, Visionary: 1, Air: 1, Fire: 1 } },
      { icon: 'forest',    label: 'Quiet Forest',      meaning: 'Slowing down, thinking, and enjoying the peace.',                   scores: { Monk: 2, Guardian: 1, Water: 2 } },
      { icon: 'workshop',  label: 'Workshop / Garage', meaning: 'Building, fixing, or creating something with your hands.',          scores: { Builder: 2, Creator: 1, Earth: 2 } },
      { icon: 'boxing',    label: 'Boxing Gym',        meaning: 'Training hard, getting stronger, and pushing your limits.',          scores: { Warrior: 2, Leader: 1, Fire: 2 } },
    ]
  },
  {
    question: "Which item would you want with you if life got really difficult?",
    answers: [
      { icon: 'sword',     label: 'Sword',             meaning: 'To remind yourself to face problems with courage.',                  scores: { Warrior: 2, Protector: 1, Fire: 2 } },
      { icon: 'compass',   label: 'Compass',           meaning: 'To help you stay on the right path even when lost.',                 scores: { Explorer: 2, Visionary: 1, Air: 2 } },
      { icon: 'brush',     label: 'Paintbrush',        meaning: 'To express yourself and create something meaningful.',               scores: { Creator: 2, Communicator: 1, Air: 2 } },
      { icon: 'hammer',    label: 'Hammer',            meaning: 'To remind yourself that anything worth having takes work.',          scores: { Builder: 2, Guardian: 1, Earth: 2 } },
    ]
  },
  {
    question: "Which animal do you admire the most?",
    answers: [
      { icon: 'wolf',      label: 'Wolf',              meaning: 'Works with the pack, protects others, and leads when needed.',       scores: { Leader: 2, Protector: 1, Fire: 2 } },
      { icon: 'owl',       label: 'Owl',               meaning: 'Quiet, observant, and always thinking before acting.',              scores: { Strategist: 2, Monk: 1, Air: 2 } },
      { icon: 'eagle',     label: 'Eagle',             meaning: "Sees the big picture and isn't afraid to fly alone.",               scores: { Visionary: 2, Explorer: 1, Air: 2 } },
      { icon: 'bear',      label: 'Bear',              meaning: 'Strong, calm, dependable, and protective of those it loves.',       scores: { Guardian: 2, Builder: 1, Earth: 2 } },
    ]
  },
  {
    question: "Which place feels like it has something to teach you?",
    answers: [
      { icon: 'waves',     label: 'Huge Ocean Waves',  meaning: 'Learning to adapt when life refuses to go as planned.',             scores: { Explorer: 2, Creator: 1, Water: 2 } },
      { icon: 'campfire',  label: 'Campfire Circle',   meaning: 'Sharing stories, building trust, and finding brotherhood.',         scores: { Communicator: 2, Leader: 1, Fire: 2 } },
      { icon: 'temple',    label: 'Ancient Temple',    meaning: 'Learning discipline, wisdom, and the patience to go deep.',         scores: { Monk: 2, Strategist: 1, Earth: 2 } },
      { icon: 'stars',     label: 'Sky Full of Stars', meaning: 'Thinking about your future and how big what is possible is.',       scores: { Visionary: 2, Creator: 1, Air: 2 } },
    ]
  },
  {
    question: "Which path would you take?",
    answers: [
      { icon: 'trail',     label: 'Forest Trail',      meaning: 'You like exploring the unknown without knowing where it leads.',     scores: { Explorer: 2, Guardian: 1, Earth: 2 } },
      { icon: 'mtnpath',   label: 'Mountain Path',     meaning: "You'd rather take the harder road if it helps you grow.",           scores: { Warrior: 2, Explorer: 1, Fire: 2 } },
      { icon: 'desert',    label: 'Desert Road',       meaning: 'You enjoy being alone and figuring things out on your own terms.',  scores: { Monk: 2, Visionary: 1, Earth: 2 } },
      { icon: 'coastal',   label: 'Coastal Trail',     meaning: 'You enjoy beauty and the kind of freedom that comes with movement.', scores: { Creator: 2, Communicator: 1, Water: 2 } },
    ]
  },
  {
    question: "Which room would excite you to spend a full month in?",
    answers: [
      { icon: 'music',     label: 'Music Studio',      meaning: 'Making songs, creating from scratch, expressing what is inside.',   scores: { Creator: 2, Communicator: 1, Air: 2 } },
      { icon: 'workshop',  label: 'Workshop',          meaning: 'Building something real and lasting with your own hands.',          scores: { Builder: 2, Guardian: 1, Earth: 2 } },
      { icon: 'books',     label: 'Library',           meaning: 'Learning things that make you think differently.',                  scores: { Strategist: 2, Monk: 1, Air: 2 } },
      { icon: 'tent',      label: 'Outdoor Camp',      meaning: 'Survival skills, open sky, and figuring out how to stay alive.',   scores: { Explorer: 2, Warrior: 1, Fire: 2 } },
    ]
  },
  {
    question: "Which symbol feels like something you need more of right now?",
    answers: [
      { icon: 'mountain',  label: 'Mountain',          meaning: 'More discipline. More consistency. More follow-through.',           scores: { Builder: 2, Warrior: 1, Earth: 2 } },
      { icon: 'fire',      label: 'Fire',              meaning: 'More courage. More action. More willingness to go for it.',         scores: { Warrior: 2, Leader: 1, Fire: 2 } },
      { icon: 'wave',      label: 'Wave',              meaning: 'More calm. More patience. More trust in the process.',              scores: { Monk: 2, Explorer: 1, Water: 2 } },
      { icon: 'feather',   label: 'Feather',           meaning: 'More freedom. More creativity. More permission to imagine.',        scores: { Visionary: 2, Creator: 1, Air: 2 } },
    ]
  },
  {
    question: "Which challenge sounds the most rewarding to you?",
    answers: [
      { icon: 'mountain',  label: 'Climb a Mountain',  meaning: 'Prove to yourself you can do something genuinely hard.',            scores: { Explorer: 2, Warrior: 1, Fire: 2 } },
      { icon: 'cabin',     label: 'Build a Cabin',     meaning: 'Create something that lasts long after you leave.',                 scores: { Builder: 2, Guardian: 1, Earth: 2 } },
      { icon: 'music',     label: 'Write a Song',      meaning: 'Turn your inner world into something other people can actually feel.', scores: { Creator: 2, Communicator: 1, Air: 2 } },
      { icon: 'lake',      label: 'Meditate by a Lake', meaning: 'Become genuinely comfortable with silence and your own thoughts.', scores: { Monk: 2, Visionary: 1, Water: 2 } },
    ]
  },
  {
    question: "Which weather feels the most like you lately?",
    answers: [
      { icon: 'storm',     label: 'Thunderstorm',      meaning: 'Full of energy, intensity, and ready to act.',                      scores: { Warrior: 2, Leader: 1, Fire: 2 } },
      { icon: 'rain',      label: 'Gentle Rain',       meaning: 'Calm, thoughtful, and quiet in a way people underestimate.',        scores: { Monk: 2, Protector: 1, Water: 2 } },
      { icon: 'wind',      label: 'Windy Day',         meaning: 'Always generating new ideas, always moving toward something.',      scores: { Creator: 2, Explorer: 1, Air: 2 } },
      { icon: 'leaf',      label: 'Cool Autumn Morning', meaning: 'Focused, steady, and reliable when others are distracted.',       scores: { Builder: 2, Guardian: 1, Earth: 2 } },
    ]
  },
  {
    question: "Imagine sitting around a campfire. Which sounds most like you?",
    answers: [
      { icon: 'solo',      label: 'Thinking Quietly',  meaning: 'You reflect before speaking. Silence is comfortable.',              scores: { Monk: 2, Visionary: 1, Water: 2 } },
      { icon: 'pair',      label: 'Deep Conversation', meaning: 'One real conversation beats a hundred shallow ones.',               scores: { Protector: 2, Communicator: 1, Water: 2 } },
      { icon: 'group',     label: 'Making Everyone Laugh', meaning: 'You naturally draw people in and make them feel at ease.',      scores: { Leader: 2, Communicator: 1, Fire: 2 } },
      { icon: 'map',       label: "Planning Tomorrow's Adventure", meaning: "You're already thinking about what comes next.",        scores: { Explorer: 2, Strategist: 1, Air: 2 } },
    ]
  },
];

const VALUES_QUESTIONS = [
  {
    question: "Which quality do you respect the most in another person?",
    answers: [
      { text: "Courage — Someone who faces difficult things instead of running away.",  scores: { Warrior: 2, Leader: 1, Fire: 1 } },
      { text: "Wisdom — Someone who stays calm and thinks before acting.",               scores: { Monk: 2, Strategist: 1, Water: 1 } },
      { text: "Creativity — Someone who sees the world differently and makes new things.", scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "Reliability — Someone who always keeps their word.",                      scores: { Builder: 2, Guardian: 1, Earth: 1 } },
    ]
  },
  {
    question: "If people remembered you for one thing, what would you hope it is?",
    answers: [
      { text: "I gave people courage.",                 scores: { Warrior: 2, Protector: 1, Fire: 1 } },
      { text: "I helped people feel understood.",       scores: { Protector: 2, Communicator: 1, Water: 1 } },
      { text: "I inspired people to dream bigger.",     scores: { Visionary: 2, Creator: 1, Air: 1 } },
      { text: "I built something that lasted.",         scores: { Builder: 2, Guardian: 1, Earth: 1 } },
    ]
  },
  {
    question: "When life gets hard, what do you believe matters most?",
    answers: [
      { text: "Keep moving forward.",    scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "Stay calm.",              scores: { Monk: 2, Guardian: 1, Water: 1 } },
      { text: "Keep learning.",          scores: { Strategist: 2, Visionary: 1, Air: 1 } },
      { text: "Stay disciplined.",       scores: { Builder: 2, Sovereign: 1, Earth: 1 } },
    ]
  },
  {
    question: "Which of these feels the most true to you?",
    answers: [
      { text: "Courage grows when you face fear.",      scores: { Warrior: 2, Leader: 1, Fire: 1 } },
      { text: "Peace begins within.",                   scores: { Monk: 2, Protector: 1, Water: 1 } },
      { text: "Creativity changes the world.",          scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "Small actions build great lives.",       scores: { Builder: 2, Guardian: 1, Earth: 1 } },
    ]
  },
  {
    question: "Imagine you're 30 years old. What would make you the proudest?",
    answers: [
      { text: "Becoming mentally and physically strong.",    scores: { Warrior: 2, Builder: 1, Fire: 1 } },
      { text: "Having deep, real relationships.",            scores: { Protector: 2, Communicator: 1, Water: 1 } },
      { text: "Building something meaningful and original.", scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "Becoming someone others can truly depend on.", scores: { Guardian: 2, Builder: 1, Earth: 1 } },
    ]
  },
  {
    question: "Which of these challenges sounds the hardest for you personally?",
    answers: [
      { text: "Facing your fears.",             scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "Being patient.",                 scores: { Monk: 2, Guardian: 1, Water: 1 } },
      { text: "Finishing what you start.",      scores: { Builder: 2, Sovereign: 1, Earth: 1 } },
      { text: "Sharing your ideas with others.", scores: { Creator: 2, Communicator: 1, Air: 1 } },
    ]
  },
  {
    question: "Which type of person naturally earns your deepest respect?",
    answers: [
      { text: "Someone who protects others without being asked.", scores: { Protector: 2, Warrior: 1, Fire: 1 } },
      { text: "Someone who stays humble even when they're great.", scores: { Monk: 2, Guardian: 1, Water: 1 } },
      { text: "Someone who thinks in ways nobody else does.",      scores: { Visionary: 2, Strategist: 1, Air: 1 } },
      { text: "Someone who always follows through on their word.", scores: { Builder: 2, Sovereign: 1, Earth: 1 } },
    ]
  },
  {
    question: "If you could instantly master one ability, what would it be?",
    answers: [
      { text: "Staying calm and courageous under pressure.",   scores: { Warrior: 2, Leader: 1, Fire: 1 } },
      { text: "Understanding what people truly need.",         scores: { Protector: 2, Communicator: 1, Water: 1 } },
      { text: "Solving problems others can't figure out.",     scores: { Strategist: 2, Visionary: 1, Air: 1 } },
      { text: "Building anything you put your mind to.",       scores: { Builder: 2, Creator: 1, Earth: 1 } },
    ]
  },
  {
    question: "What do you honestly think the world needs more of?",
    answers: [
      { text: "Brave people who act even when it's hard.",     scores: { Warrior: 2, Leader: 1, Fire: 1 } },
      { text: "Kind people who genuinely look out for others.", scores: { Protector: 2, Monk: 1, Water: 1 } },
      { text: "Curious people who question everything.",        scores: { Explorer: 2, Visionary: 1, Air: 1 } },
      { text: "Responsible people who do what they say.",       scores: { Guardian: 2, Builder: 1, Earth: 1 } },
    ]
  },
  {
    question: "Many years from now, looking back on your life — which sentence would make you smile the most?",
    answers: [
      { text: "\"I never stopped challenging myself.\"",        scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "\"I helped people become better versions of themselves.\"", scores: { Protector: 2, Leader: 1, Water: 1 } },
      { text: "\"I created things that inspired others.\"",     scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "\"I built a life I was genuinely proud of.\"",   scores: { Builder: 2, Sovereign: 1, Earth: 1 } },
    ]
  },
];

let assessAnswers     = new Array(ASSESS_QUESTIONS.length).fill(null);
let scenarioAnswers   = new Array(SCENARIO_QUESTIONS.length).fill(null);
let perceptionAnswers = new Array(PERCEPTION_QUESTIONS.length).fill(null);
let valuesAnswers     = new Array(VALUES_QUESTIONS.length).fill(null);
let assessIndex       = 0;
let scenarioIndex     = 0;
let perceptionIndex   = 0;
let valuesIndex       = 0;
let assessBrotherId   = null;

// ── PROFILE QUESTIONS (after archetype questions) ──
const INTERESTS_LIST = [
  { emoji: '🏋️', label: 'Training' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🌊', label: 'Surfing' },
  { emoji: '🥋', label: 'Martial Arts' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '🔨', label: 'Building' },
  { emoji: '💻', label: 'Technology' },
  { emoji: '📚', label: 'Learning' },
  { emoji: '🧩', label: 'Solving Problems' },
  { emoji: '🍳', label: 'Cooking' },
  { emoji: '🌲', label: 'Nature' },
  { emoji: '🐶', label: 'Animals' },
  { emoji: '🎥', label: 'Creating Videos' },
  { emoji: '📸', label: 'Photography' },
  { emoji: '💼', label: 'Business' },
  { emoji: '🤝', label: 'Helping People' },
  { emoji: '🧘', label: 'Mindfulness' },
  { emoji: '🎤', label: 'Speaking' },
  { emoji: '✈️', label: 'Adventure' },
];

const PROFILE_QUESTIONS = [
  {
    id: 'yearlyGoal',
    type: 'text',
    title: 'What is your #1 goal for this year?',
    placeholder: 'e.g. Get my black belt, Start my own business, Become a better surfer, Learn to produce music...',
    hint: 'Think big — what would make this year one you never forget?',
  },
  {
    id: 'strengths',
    type: 'text',
    title: 'What are you naturally good at?',
    placeholder: 'e.g. I\'m good at staying calm under pressure, I pick up new skills fast, I\'m a great listener...',
    hint: 'Think about what comes easy to you that\'s hard for others.',
  },
  {
    id: 'struggles',
    type: 'text',
    title: 'What is something you find challenging?',
    placeholder: 'e.g. Staying consistent, Managing my anger, Believing in myself, Finishing what I start...',
    hint: 'Be honest — your struggles are where your growth lives.',
  },
  {
    id: 'interests',
    type: 'multiselect',
    title: 'What are you into? Pick everything that fits.',
    hint: 'Select as many as you want.',
  },
  {
    id: 'oneWord',
    type: 'text',
    title: 'One word that describes you right now.',
    placeholder: 'e.g. Hungry, Focused, Lost, Rising, Raw, Determined, Searching...',
    hint: 'Don\'t overthink it — first word that comes to mind.',
  },
];

let profileAnswers = {};  // { yearlyGoal, strengths, struggles, interests: [], oneWord }
let profileIndex   = 0;
let selectedInterests = [];

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
let feedPosts   = [];
let currentUser = null;
let isAdmin     = false;
let isMentor    = false;
let editingId   = null;
let deletingId  = null;
let currentTab  = 'brothers';
let unsubBrothers    = null;
let unsubChallenges  = null;
let unsubSubmissions = null;
let unsubFeed        = null;
let streakUpdatedThisSession = false;
let reviewingSubId = null;
let challengeFilter = 'All';
let lastFeedSeen = 0;

// ── DOM ───────────────────────────────────────
const loginScreen   = document.getElementById('loginScreen');
const appScreen     = document.getElementById('appScreen');
const loginForm     = document.getElementById('loginForm');
const loginError    = document.getElementById('loginError');
const loginBtn      = document.getElementById('loginBtn');
const logoutBtn     = document.getElementById('logoutBtn');

// ── THEME TOGGLE ──────────────────────────
(function() {
  const saved = localStorage.getItem('stoked-theme') || 'light';
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

// ── PRESENCE ──────────────────────────────────
let presenceInterval = null;

async function pingPresence() {
  if (!currentUser) return;
  const brother = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
  if (!brother) { console.log('[presence] no brother found for', currentUser.email); return; }
  try {
    await updateDoc(doc(db, 'brothers', brother.id), { lastSeen: new Date().toISOString() });
    console.log('[presence] pinged for', brother.name);
  } catch (e) {
    console.error('[presence] error:', e.message);
  }
}

async function clearPresence() {
  if (!currentUser) return;
  const brother = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
  if (!brother) return;
  try {
    await updateDoc(doc(db, 'brothers', brother.id), { lastSeen: null });
  } catch (_) {}
}

function startPresence() {
  stopPresence();
  pingPresence();
  presenceInterval = setInterval(pingPresence, 30000);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', clearPresence);
}

function stopPresence() {
  if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('beforeunload', clearPresence);
  clearPresence();
}

function onVisibilityChange() {
  if (document.hidden) clearPresence();
  else pingPresence();
}

function isOnline(brother) {
  if (!brother.lastSeen) return false;
  return (Date.now() - new Date(brother.lastSeen).getTime()) < 90000; // 90 seconds
}

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
    const handledByOnboarding = await maybeShowOnboarding();
    if (!handledByOnboarding) showApp();
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
  stopPresence();
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

async function maybeShowOnboarding() {
  if (isAdmin) return false;
  const key = `onboardingAccepted_${currentUser.uid}`;
  if (localStorage.getItem(key)) return false;

  // Show welcome screen
  const onboardEl = document.getElementById('onboardingScreen');
  loginScreen.classList.add('hidden');
  onboardEl.classList.remove('hidden');

  document.getElementById('onboardAcceptBtn').onclick = async () => {
    localStorage.setItem(key, '1');
    onboardEl.classList.add('hidden');
    // Best-effort write to Firestore if profile exists
    try {
      const snap = await getDocs(collection(db, 'brothers'));
      const me = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
      if (me) {
        await updateDoc(doc(db, 'brothers', me.id), {
          onboardingAccepted: true,
          onboardingAcceptedAt: new Date().toISOString(),
        });
      }
    } catch (_) {}
    showApp();
  };
  return true;
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

  // Show the Brothers roster tab only for non-admin members
  const rosterTabBtn = document.getElementById('rosterTabBtn');
  if (rosterTabBtn) rosterTabBtn.classList.toggle('hidden', isAdmin);

  // Set up notifications (ask permission)
  setupNotifications();

  // ── PRESENCE ──────────────────────────────────
  startPresence();

  // Track member's own XP to detect approval notifications
  let prevMyXP = null;
  let firstBrothersSnap = true;

  // Subscribe to brothers collection
  unsubBrothers = onSnapshot(collection(db, 'brothers'), snap => {
    const firstLoad = brothers.length === 0;
    brothers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (firstLoad) pingPresence();

    // Notify member when their XP goes up (submission approved)
    if (!isAdmin) {
      const me = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
      if (me) {
        if (prevMyXP !== null && me.xp > prevMyXP) {
          const gained = me.xp - prevMyXP;
          showNotif('✅ Submission Approved!', `You earned +${gained} XP — keep going brother! 🔥`);
        }
        if (!firstBrothersSnap) prevMyXP = me.xp;
        else { prevMyXP = me.xp; firstBrothersSnap = false; }
      }
    }

    render();
    // Re-register FCM token now that brothers are loaded (gets correct brotherId)
    if (Notification.permission === 'granted') registerFCMToken();
  });

  // Subscribe to challenges
  unsubChallenges = onSnapshot(collection(db, 'challenges'), snap => {
    challenges = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active !== false);
    if (currentTab === 'community') renderFeed();
    updateChallengesBadge();
  });

  // Subscribe to submissions
  let firstSubsSnap = true;
  unsubSubmissions = onSnapshot(collection(db, 'submissions'), snap => {
    const prev = submissions.map(s => s.id);
    submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Notify admin of new completions
    if (isAdmin && !firstSubsSnap) {
      const newCompleted = submissions.filter(s => s.status === 'completed' && !prev.includes(s.id));
      newCompleted.forEach(s => showNotif('🔥 Challenge Complete', `${s.brotherName} completed a challenge`));
    }
    firstSubsSnap = false;

    if (currentTab === 'community') renderFeed();
    updateChallengesBadge();
  });

  // Subscribe to social feed
  lastFeedSeen = parseInt(localStorage.getItem(`feedSeen_${currentUser.uid}`) || '0', 10);
  let firstFeedSnap = true;
  unsubFeed = onSnapshot(collection(db, 'feed'), snap => {
    const prevIds = feedPosts.map(p => p.id);
    feedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Notify members of new feed posts (not on first load)
    if (!firstFeedSnap && currentTab !== 'socialfeed') {
      const newPosts = feedPosts.filter(p => !prevIds.includes(p.id));
      newPosts.forEach(p => {
        if (p.type === 'announcement') {
          showNotif('📣 Coach Posted', p.text?.slice(0, 80) || 'New message on the feed');
        } else if (!isAdmin) {
          showNotif('🏆 Brotherhood Win!', `${p.brotherName} completed ${p.challengeTitle}`);
        }
      });
    }
    firstFeedSnap = false;

    if (currentTab === 'socialfeed') renderSocialFeed();
    updateFeedBadge();
  });

  // Tab bar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  currentTab = tab;
  const isSocialFeed = tab === 'socialfeed';
  const isChallenges = tab === 'community';
  const isRoster     = tab === 'roster';
  const isMain       = !isSocialFeed && !isChallenges && !isRoster;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab));

  document.querySelector('.main').classList.toggle('hidden', !isMain);
  statsBar.classList.toggle('hidden', !isMain || !isAdmin);
  memberHero.classList.toggle('hidden', !isMain || isAdmin);
  document.getElementById('socialFeedSection').classList.toggle('hidden', !isSocialFeed);
  document.getElementById('communitySection').classList.toggle('hidden', !isChallenges);
  document.getElementById('rosterSection').classList.toggle('hidden', !isRoster);

  if (isSocialFeed) {
    renderSocialFeed();
    lastFeedSeen = Date.now();
    localStorage.setItem(`feedSeen_${currentUser.uid}`, lastFeedSeen);
    document.getElementById('feedBadge').classList.add('hidden');
  }
  if (isChallenges) {
    renderFeed();
    localStorage.setItem(`lastFeedVisit_${currentUser.uid}`, new Date().toISOString());
    document.getElementById('communityBadge').classList.add('hidden');
  }
  if (isRoster) renderRoster();
}

function updateChallengesBadge() {
  if (!currentUser) return;
  const badge = document.getElementById('communityBadge');
  if (!badge) return;
  if (isAdmin) {
    const pending = 0;
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

// ── NOTIFICATIONS ─────────────────────────────
const VAPID_KEY = 'BM-mZg5-MULah6xcJgmfFbtVkGSJ59IhKO-bkVYTkbd9nMbt-vxCP-frE1zp672JTcss8mv8cx5RqYK5J_A296s';
let fcmSetupDone = false;

async function setupNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied') return;

  // Ask on first user interaction (required by browsers, especially Safari PWA)
  if (Notification.permission === 'default') {
    const askOnTap = async () => {
      document.removeEventListener('click', askOnTap);
      const permission = await Notification.requestPermission();
      if (permission === 'granted') await registerFCMToken();
    };
    document.addEventListener('click', askOnTap);
  } else if (Notification.permission === 'granted') {
    await registerFCMToken();
  }

  // Handle foreground messages (app is open)
  onMessage(messaging, payload => {
    const { title, body } = payload.notification || {};
    if (title) showNotif(title, body);
  });
}

async function registerFCMToken() {
  if (fcmSetupDone || !currentUser) return;
  try {
    // Register the Firebase messaging SW separately at the root scope
    const msgSWReg = await navigator.serviceWorker.register(
      '/stoked-command-center/firebase-messaging-sw.js',
      { scope: '/stoked-command-center/' }
    );
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: msgSWReg });
    if (!token) { showToast('FCM: no token returned', 'info'); return; }
    const brother = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
    await setDoc(doc(db, 'fcmTokens', token), {
      token,
      brotherId: brother?.id || null,
      email:     currentUser.email,
      updatedAt: new Date().toISOString(),
    });
    fcmSetupDone = true;
    showToast('Notifications enabled ✓', 'success');
  } catch (e) {
    showToast('Notif error: ' + e.message, 'info');
    console.error('FCM token error:', e);
  }
}

function showNotif(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon:  '/stoked-command-center/icon-192.png',
        badge: '/stoked-command-center/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: window.location.href },
      });
    });
  } else {
    new Notification(title, { body, icon: '/stoked-command-center/icon-192.png' });
  }
}

function updateFeedBadge() {
  if (!currentUser) return;
  const badge = document.getElementById('feedBadge');
  if (!badge) return;
  const newCount = feedPosts.filter(p => (p.createdAt || 0) > lastFeedSeen).length;
  badge.textContent = newCount;
  badge.classList.toggle('hidden', newCount === 0 || currentTab === 'socialfeed');
}

// ── LEVEL LOGIC ───────────────────────────────
const MAX_XP = 15000;

function getLevelInfo(xp) {
  const clamped = Math.min(Math.max(0, xp), MAX_XP);
  // Find current level: highest level whose entry threshold is <= xp
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (clamped >= LEVELS[i].xpRequired) { idx = i; break; }
  }
  const current = LEVELS[idx];
  const next    = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  const startXP = current.xpRequired;
  const endXP   = next ? next.xpRequired : MAX_XP;
  const progress = next ? Math.round(((clamped - startXP) / (endXP - startXP)) * 100) : 100;
  return { current, next, progress: Math.min(100, Math.max(0, progress)), xpNeededForNext: next ? endXP - clamped : 0 };
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
  document.querySelectorAll('[data-assign-challenge]').forEach(btn =>
    btn.addEventListener('click', () => openCreateChallengeModal(btn.dataset.assignChallenge)));
  document.querySelectorAll('[data-addxp]').forEach(btn =>
    btn.addEventListener('click', () => openXPModal(btn.dataset.addxp)));
  document.querySelectorAll('[data-checkin]').forEach(btn =>
    btn.addEventListener('click', () => openCheckInModal(btn.dataset.checkin)));
  document.querySelectorAll('[data-coachnote]').forEach(btn =>
    btn.addEventListener('click', () => openCoachNoteModal(btn.dataset.coachnote)));
  document.querySelectorAll('[data-viewcheckin]').forEach(btn =>
    btn.addEventListener('click', () => openViewCheckInModal(btn.dataset.viewcheckin)));
  document.querySelectorAll('.profile-snapshot-toggle').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const snap = btn.nextElementSibling;
      const nowCollapsed = snap.classList.toggle('collapsed');
      btn.querySelector('.snapshot-chevron').textContent = nowCollapsed ? '▾' : '▴';
    }));
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
  const maxed = xp >= MAX_XP;
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
          <div class="assess-cta-text">29 questions to discover your archetype, element, and build your personal profile. Takes about 6 minutes.</div>
          <button class="btn-assess-cta" data-take-assessment="${profile.id}">Take Assessment</button>
        </div>` : ''}

      ${profile.yearlyGoal || profile.oneWord || (profile.interests && profile.interests.length) ? `
        <div class="profile-snapshot-wrap">
          <button class="profile-snapshot-toggle" type="button">Profile <span class="snapshot-chevron">▾</span></button>
          <div class="profile-snapshot collapsed">
            ${profile.oneWord ? `<div class="profile-one-word">"${escHtml(profile.oneWord)}"</div>` : ''}
            ${profile.yearlyGoal ? `<div class="profile-goal"><span class="profile-label">🎯 Goal</span><span>${escHtml(profile.yearlyGoal)}</span></div>` : ''}
            ${profile.strengths ? `<div class="profile-goal"><span class="profile-label">💪 Strong</span><span>${escHtml(profile.strengths)}</span></div>` : ''}
            ${profile.struggles ? `<div class="profile-goal"><span class="profile-label">🔥 Working on</span><span>${escHtml(profile.struggles)}</span></div>` : ''}
            ${profile.interests && profile.interests.length ? `<div class="profile-interests">${profile.interests.map(i => {
              const found = INTERESTS_LIST.find(x => x.label === i);
              return `<span class="profile-interest-tag">${found ? found.emoji : ''} ${escHtml(i)}</span>`;
            }).join('')}</div>` : ''}
          </div>
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

  // Wire profile snapshot toggles in hero
  memberHero.querySelectorAll('.profile-snapshot-toggle').forEach(btn =>
    btn.addEventListener('click', () => {
      const snap = btn.nextElementSibling;
      const nowCollapsed = snap.classList.toggle('collapsed');
      btn.querySelector('.snapshot-chevron').textContent = nowCollapsed ? '▾' : '▴';
    }));

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
  const maxed   = xp >= MAX_XP;
  const nextText = lvl.next ? `${lvl.xpNeededForNext.toLocaleString()} XP to ${lvl.next.name}` : 'MAX LEVEL ACHIEVED';

  return `
    <div class="brother-card" id="card-${brother.id}" style="--arch-border:${archClr.border};--arch-glow:${archClr.glow};--arch-icon:${archClr.icon}">
      <div class="card-top">
        <div class="card-identity">
          <div class="card-name">
            ${isOnline(brother) ? '<span class="online-dot" title="Online now"></span>' : ''}
            ${escHtml(brother.name)}${brother.role === 'mentor' ? ' <span class="mentor-badge">Mentor</span>' : ''}
          </div>
          ${brother.age ? `<div class="card-age">Age ${brother.age}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon" data-assign-challenge="${brother.id}" title="Assign Personal Challenge">🎯</button>
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

      ${brother.yearlyGoal || brother.oneWord || (brother.interests && brother.interests.length) ? `
        <div class="profile-snapshot-wrap">
          <button class="profile-snapshot-toggle" type="button">Profile <span class="snapshot-chevron">▾</span></button>
          <div class="profile-snapshot collapsed">
            ${brother.oneWord ? `<div class="profile-one-word">"${escHtml(brother.oneWord)}"</div>` : ''}
            ${brother.yearlyGoal ? `<div class="profile-goal"><span class="profile-label">🎯 Goal</span><span>${escHtml(brother.yearlyGoal)}</span></div>` : ''}
            ${brother.strengths ? `<div class="profile-goal"><span class="profile-label">💪 Strong at</span><span>${escHtml(brother.strengths)}</span></div>` : ''}
            ${brother.struggles ? `<div class="profile-goal"><span class="profile-label">🔥 Working on</span><span>${escHtml(brother.struggles)}</span></div>` : ''}
            ${brother.interests && brother.interests.length ? `<div class="profile-interests">${brother.interests.map(i => {
              const found = INTERESTS_LIST.find(x => x.label === i);
              return `<span class="profile-interest-tag">${found ? found.emoji : ''} ${escHtml(i)}</span>`;
            }).join('')}</div>` : ''}
          </div>
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
    xp:         Math.min(MAX_XP, Math.max(0, parseInt(document.getElementById('fieldXP').value)       || 0)),
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
  const newXP = Math.min(MAX_XP, (b.xp || 0) + amount);

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
  assessBrotherId   = brotherId;
  assessAnswers     = new Array(ASSESS_QUESTIONS.length).fill(null);
  scenarioAnswers   = new Array(SCENARIO_QUESTIONS.length).fill(null);
  perceptionAnswers = new Array(PERCEPTION_QUESTIONS.length).fill(null);
  valuesAnswers     = new Array(VALUES_QUESTIONS.length).fill(null);
  assessIndex       = 0;
  scenarioIndex     = 0;
  perceptionIndex   = 0;
  valuesIndex       = 0;
  profileAnswers    = {};
  profileIndex      = 0;
  selectedInterests = [];
  renderAssessIntro();
  openModal(assessModal);
}

function renderAssessIntro() {
  assessContent.innerHTML = `
    <div class="assess-intro">
      <div class="assess-intro-icon">${IC.target}</div>
      <div class="assess-intro-title">Brotherhood Assessment</div>
      <p class="assess-intro-text">This isn't a personality quiz. It's a discovery — designed to surface what's already true about who you are.</p>
      <div class="assess-stages-preview">
        <div class="stage-preview-item">
          <div class="stage-preview-num">I</div>
          <div>
            <div class="stage-preview-label">Instinct</div>
            <div class="stage-preview-sub">24 questions</div>
          </div>
        </div>
        <div class="stage-preview-divider"></div>
        <div class="stage-preview-item">
          <div class="stage-preview-num">II</div>
          <div>
            <div class="stage-preview-label">Decisions</div>
            <div class="stage-preview-sub">10 scenarios</div>
          </div>
        </div>
        <div class="stage-preview-divider"></div>
        <div class="stage-preview-item">
          <div class="stage-preview-num">III</div>
          <div>
            <div class="stage-preview-label">Perception</div>
            <div class="stage-preview-sub">10 visuals</div>
          </div>
        </div>
        <div class="stage-preview-divider"></div>
        <div class="stage-preview-item">
          <div class="stage-preview-num">IV</div>
          <div>
            <div class="stage-preview-label">Values</div>
            <div class="stage-preview-sub">10 questions</div>
          </div>
        </div>
      </div>
      <p class="assess-intro-text" style="opacity:0.55;font-size:0.82rem;margin-top:4px">No right answers. No wrong ones. Just honest ones.</p>
      <button class="btn btn-primary assess-done-btn" id="assessStartBtn">Begin</button>
    </div>`;
  document.getElementById('assessStartBtn').addEventListener('click', () => renderAssessQuestion());
}

function assessStagePills(active) {
  const stages = ['Instinct', 'Decisions', 'Perception', 'Values', 'Result'];
  return `<div class="assess-stage-pills">
    ${stages.map((s, i) => `<div class="assess-stage-pill ${i === active ? 'active' : i < active ? 'done' : ''}">${s}</div>`).join('<div class="assess-stage-connector"></div>')}
  </div>`;
}

function renderAssessQuestion() {
  const q   = ASSESS_QUESTIONS[assessIndex];
  const val = assessAnswers[assessIndex];
  const labels = ['Strongly Agree', 'Slightly Agree', 'Neutral', 'Slightly Agree', 'Strongly Agree'];
  const pct = ((assessIndex + 1) / ASSESS_QUESTIONS.length) * 100;
  const isLast = assessIndex === ASSESS_QUESTIONS.length - 1;

  assessContent.innerHTML = `
    ${assessStagePills(0)}
    <div class="assess-part-label">Part I — Instinct</div>
    <div class="assess-progress-track"><div class="assess-progress-fill" style="width:${pct}%"></div></div>
    <div class="assess-step-label">${assessIndex + 1} of ${ASSESS_QUESTIONS.length}</div>
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
      <button class="btn btn-primary" id="assessNextBtn" ${val == null ? 'disabled' : ''}>${isLast ? 'Continue' : 'Next'}</button>
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
    else renderPart1Bridge();
  });
}

function renderPart1Bridge() {
  assessContent.innerHTML = `
    <div class="assess-bridge">
      <div class="assess-bridge-badge">I</div>
      <div class="assess-bridge-title">Part I Complete</div>
      <p class="assess-bridge-text">Your instincts have been recorded. Now we go deeper.</p>
      <p class="assess-bridge-text">Part II places you inside real situations — the kind where who you actually are gets revealed under pressure.</p>
      <div class="assess-bridge-next-label">NEXT</div>
      <div class="assess-bridge-next-name">Part II — Decisions</div>
      <div class="assess-bridge-next-sub">10 Scenarios</div>
      <button class="btn btn-primary assess-done-btn" id="part2StartBtn">Enter Part II</button>
    </div>`;
  document.getElementById('part2StartBtn').addEventListener('click', () => {
    scenarioIndex = 0;
    renderScenarioQuestion();
  });
}

function renderScenarioQuestion() {
  const q   = SCENARIO_QUESTIONS[scenarioIndex];
  const sel = scenarioAnswers[scenarioIndex];
  const pct = ((scenarioIndex + 1) / SCENARIO_QUESTIONS.length) * 100;
  const isLast = scenarioIndex === SCENARIO_QUESTIONS.length - 1;

  const choiceLetters = ['A', 'B', 'C', 'D'];
  assessContent.innerHTML = `
    ${assessStagePills(1)}
    <div class="assess-part-label">Part II — Decisions</div>
    <div class="assess-progress-track"><div class="assess-progress-fill" style="width:${pct}%"></div></div>
    <div class="assess-step-label">${scenarioIndex + 1} of ${SCENARIO_QUESTIONS.length}</div>
    <div class="scenario-setup">${escHtml(q.scenario)}</div>
    <div class="assess-lean-heading">${escHtml(q.question)}</div>
    <div class="scenario-choices">
      ${q.answers.map((a, i) => `
        <button class="scenario-choice ${sel === i ? 'selected' : ''}" data-idx="${i}">
          <span class="scenario-choice-letter">${choiceLetters[i]}</span>
          <span class="scenario-choice-text">${escHtml(a.text)}</span>
        </button>`).join('')}
    </div>
    <div class="assess-nav">
      <button class="btn btn-ghost" id="scenBackBtn">${scenarioIndex === 0 ? 'Back to Part I' : 'Back'}</button>
      <div class="assess-nav-spacer"></div>
      <button class="btn btn-primary" id="scenNextBtn" ${sel == null ? 'disabled' : ''}>${isLast ? 'See My Archetype' : 'Next'}</button>
    </div>`;

  assessContent.querySelectorAll('.scenario-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      scenarioAnswers[scenarioIndex] = parseInt(btn.dataset.idx, 10);
      renderScenarioQuestion();
    });
  });
  document.getElementById('scenBackBtn').addEventListener('click', () => {
    if (scenarioIndex > 0) { scenarioIndex--; renderScenarioQuestion(); }
    else renderPart1Bridge();
  });
  document.getElementById('scenNextBtn').addEventListener('click', () => {
    if (scenarioAnswers[scenarioIndex] == null) return;
    if (scenarioIndex < SCENARIO_QUESTIONS.length - 1) { scenarioIndex++; renderScenarioQuestion(); }
    else renderPart2Bridge();
  });
}

function renderPart2Bridge() {
  assessContent.innerHTML = `
    <div class="assess-bridge">
      <div class="assess-bridge-badge">II</div>
      <div class="assess-bridge-title">Part II Complete</div>
      <p class="assess-bridge-text">Your decisions have been mapped. There is one final layer.</p>
      <p class="assess-bridge-text">Part III goes beyond logic and language — it reads what you're drawn to instinctively.</p>
      <div class="assess-bridge-next-label">FINAL PART</div>
      <div class="assess-bridge-next-name">Part III — Perception</div>
      <div class="assess-bridge-next-sub">10 Visual Questions</div>
      <button class="btn btn-primary assess-done-btn" id="part3StartBtn">Enter Part III</button>
    </div>`;
  document.getElementById('part3StartBtn').addEventListener('click', () => {
    perceptionIndex = 0;
    renderPerceptionQuestion();
  });
}

function renderPerceptionQuestion() {
  const q   = PERCEPTION_QUESTIONS[perceptionIndex];
  const sel = perceptionAnswers[perceptionIndex];
  const pct = ((perceptionIndex + 1) / PERCEPTION_QUESTIONS.length) * 100;
  const isLast = perceptionIndex === PERCEPTION_QUESTIONS.length - 1;

  assessContent.innerHTML = `
    ${assessStagePills(2)}
    <div class="assess-part-label">Part III — Perception</div>
    <div class="assess-progress-track"><div class="assess-progress-fill" style="width:${pct}%"></div></div>
    <div class="assess-step-label">${perceptionIndex + 1} of ${PERCEPTION_QUESTIONS.length}</div>
    <div class="assess-lean-heading">${escHtml(q.question)}</div>
    <div class="percep-grid">
      ${q.answers.map((a, i) => `
        <button class="percep-card ${sel === i ? 'selected' : ''}" data-idx="${i}">
          <div class="percep-icon">${PI[a.icon] || ''}</div>
          <div class="percep-label">${escHtml(a.label)}</div>
          <div class="percep-meaning">${escHtml(a.meaning)}</div>
        </button>`).join('')}
    </div>
    <div class="assess-nav">
      <button class="btn btn-ghost" id="percepBackBtn">${perceptionIndex === 0 ? 'Back to Part II' : 'Back'}</button>
      <div class="assess-nav-spacer"></div>
      <button class="btn btn-primary" id="percepNextBtn" ${sel == null ? 'disabled' : ''}>${isLast ? 'Reveal My Archetype' : 'Next'}</button>
    </div>`;

  assessContent.querySelectorAll('.percep-card').forEach(card => {
    card.addEventListener('click', () => {
      perceptionAnswers[perceptionIndex] = parseInt(card.dataset.idx, 10);
      renderPerceptionQuestion();
    });
  });
  document.getElementById('percepBackBtn').addEventListener('click', () => {
    if (perceptionIndex > 0) { perceptionIndex--; renderPerceptionQuestion(); }
    else renderPart2Bridge();
  });
  document.getElementById('percepNextBtn').addEventListener('click', () => {
    if (perceptionAnswers[perceptionIndex] == null) return;
    if (perceptionIndex < PERCEPTION_QUESTIONS.length - 1) { perceptionIndex++; renderPerceptionQuestion(); }
    else renderPart3Bridge();
  });
}

function renderPart3Bridge() {
  assessContent.innerHTML = `
    <div class="assess-bridge">
      <div class="assess-bridge-badge">III</div>
      <div class="assess-bridge-title">Part III Complete</div>
      <p class="assess-bridge-text">Three layers down. One to go.</p>
      <p class="assess-bridge-text">The final part doesn't ask what you do or what you see. It asks what you believe — and what kind of man you actually want to become.</p>
      <div class="assess-bridge-next-label">FINAL SECTION</div>
      <div class="assess-bridge-next-name">Part IV — Values</div>
      <div class="assess-bridge-next-sub">10 Questions · No Right Answers</div>
      <button class="btn btn-primary assess-done-btn" id="part4StartBtn">Enter Part IV</button>
    </div>`;
  document.getElementById('part4StartBtn').addEventListener('click', () => {
    valuesIndex = 0;
    renderValuesQuestion();
  });
}

function renderValuesQuestion() {
  const q   = VALUES_QUESTIONS[valuesIndex];
  const sel = valuesAnswers[valuesIndex];
  const pct = ((valuesIndex + 1) / VALUES_QUESTIONS.length) * 100;
  const isLast = valuesIndex === VALUES_QUESTIONS.length - 1;
  const letters = ['A', 'B', 'C', 'D'];

  assessContent.innerHTML = `
    ${assessStagePills(3)}
    <div class="assess-part-label">Part IV — Values</div>
    <div class="assess-progress-track"><div class="assess-progress-fill" style="width:${pct}%"></div></div>
    <div class="assess-step-label">${valuesIndex + 1} of ${VALUES_QUESTIONS.length}</div>
    <div class="assess-lean-heading">${escHtml(q.question)}</div>
    <div class="scenario-choices">
      ${q.answers.map((a, i) => `
        <button class="scenario-choice values-choice ${sel === i ? 'selected' : ''}" data-idx="${i}">
          <span class="scenario-choice-letter">${letters[i]}</span>
          <span class="scenario-choice-text">${escHtml(a.text)}</span>
        </button>`).join('')}
    </div>
    <div class="assess-nav">
      <button class="btn btn-ghost" id="valBackBtn">${valuesIndex === 0 ? 'Back to Part III' : 'Back'}</button>
      <div class="assess-nav-spacer"></div>
      <button class="btn btn-primary" id="valNextBtn" ${sel == null ? 'disabled' : ''}>${isLast ? 'Reveal My Archetype' : 'Next'}</button>
    </div>`;

  assessContent.querySelectorAll('.scenario-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      valuesAnswers[valuesIndex] = parseInt(btn.dataset.idx, 10);
      renderValuesQuestion();
    });
  });
  document.getElementById('valBackBtn').addEventListener('click', () => {
    if (valuesIndex > 0) { valuesIndex--; renderValuesQuestion(); }
    else renderPart3Bridge();
  });
  document.getElementById('valNextBtn').addEventListener('click', () => {
    if (valuesAnswers[valuesIndex] == null) return;
    if (valuesIndex < VALUES_QUESTIONS.length - 1) { valuesIndex++; renderValuesQuestion(); }
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

  // Scenario answers — multi-point scoring
  SCENARIO_QUESTIONS.forEach((q, i) => {
    const choiceIdx = scenarioAnswers[i];
    if (choiceIdx == null) return;
    const chosen = q.answers[choiceIdx];
    Object.entries(chosen.scores).forEach(([key, pts]) => {
      if (key in archetypeScores) archetypeScores[key] += pts;
      else if (key in elementScores) elementScores[key] += pts;
    });
  });

  // Values answers
  VALUES_QUESTIONS.forEach((q, i) => {
    const choiceIdx = valuesAnswers[i];
    if (choiceIdx == null) return;
    const chosen = q.answers[choiceIdx];
    Object.entries(chosen.scores).forEach(([key, pts]) => {
      if (key in archetypeScores) archetypeScores[key] += pts;
      else if (key in elementScores) elementScores[key] += pts;
    });
  });

  // Perception answers — visual/instinct scoring
  PERCEPTION_QUESTIONS.forEach((q, i) => {
    const choiceIdx = perceptionAnswers[i];
    if (choiceIdx == null) return;
    const chosen = q.answers[choiceIdx];
    Object.entries(chosen.scores).forEach(([key, pts]) => {
      if (key in archetypeScores) archetypeScores[key] += pts;
      else if (key in elementScores) elementScores[key] += pts;
    });
  });

  const archSorted = Object.entries(archetypeScores).sort((a, b) => b[1] - a[1]);
  const primaryArchetype = archSorted[0][0];
  const growthArchetype  = archSorted[1][0];
  const dominantElement  = Object.entries(elementScores).sort((a, b) => b[1] - a[1])[0][0];

  if (assessBrotherId) {
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

  // Store archetype results for final display, then go to profile questions
  profileAnswers._archetype = { primaryArchetype, growthArchetype, dominantElement };
  profileIndex = 0;
  renderProfileQuestion();
}

function renderProfileQuestion() {
  const q = PROFILE_QUESTIONS[profileIndex];
  const totalQ = ASSESS_QUESTIONS.length + PROFILE_QUESTIONS.length;
  const qNum   = ASSESS_QUESTIONS.length + profileIndex + 1;
  const progressPct = (qNum / totalQ) * 100;

  if (q.type === 'text') {
    const saved = profileAnswers[q.id] || '';
    assessContent.innerHTML = `
      <div class="assess-progress-track"><div class="assess-progress-fill" style="width:${progressPct}%"></div></div>
      <div class="assess-step-label">Question ${qNum} of ${totalQ} — Know Yourself</div>
      <div class="assess-lean-heading">${escHtml(q.title)}</div>
      <p class="assess-profile-hint">${escHtml(q.hint)}</p>
      <textarea class="assess-profile-input" id="profileInput" placeholder="${escHtml(q.placeholder)}" rows="4">${escHtml(saved)}</textarea>
      <div class="assess-nav">
        <button class="btn btn-ghost" id="profileBackBtn">Back</button>
        <div class="assess-nav-spacer"></div>
        <button class="btn btn-primary" id="profileNextBtn">${profileIndex === PROFILE_QUESTIONS.length - 1 ? 'See Results' : 'Next'}</button>
      </div>`;

    document.getElementById('profileBackBtn').addEventListener('click', () => {
      profileAnswers[q.id] = document.getElementById('profileInput').value.trim();
      if (profileIndex > 0) { profileIndex--; renderProfileQuestion(); }
      else { assessIndex = ASSESS_QUESTIONS.length - 1; renderAssessQuestion(); }
    });
    document.getElementById('profileNextBtn').addEventListener('click', () => {
      const val = document.getElementById('profileInput').value.trim();
      profileAnswers[q.id] = val;
      if (profileIndex < PROFILE_QUESTIONS.length - 1) { profileIndex++; renderProfileQuestion(); }
      else finishProfile();
    });

  } else if (q.type === 'multiselect') {
    assessContent.innerHTML = `
      <div class="assess-progress-track"><div class="assess-progress-fill" style="width:${progressPct}%"></div></div>
      <div class="assess-step-label">Question ${qNum} of ${totalQ} — Know Yourself</div>
      <div class="assess-lean-heading">${escHtml(q.title)}</div>
      <p class="assess-profile-hint">${escHtml(q.hint)}</p>
      <div class="assess-interests-grid" id="interestsGrid">
        ${INTERESTS_LIST.map(i => `
          <button class="interest-chip ${selectedInterests.includes(i.label) ? 'selected' : ''}" data-interest="${escHtml(i.label)}">
            <span class="interest-emoji">${i.emoji}</span>
            <span class="interest-label">${escHtml(i.label)}</span>
          </button>`).join('')}
      </div>
      <div class="assess-nav">
        <button class="btn btn-ghost" id="profileBackBtn">Back</button>
        <div class="assess-nav-spacer"></div>
        <button class="btn btn-primary" id="profileNextBtn">${profileIndex === PROFILE_QUESTIONS.length - 1 ? 'See Results' : 'Next'}</button>
      </div>`;

    document.getElementById('interestsGrid').addEventListener('click', e => {
      const chip = e.target.closest('.interest-chip');
      if (!chip) return;
      const label = chip.dataset.interest;
      if (selectedInterests.includes(label)) {
        selectedInterests = selectedInterests.filter(x => x !== label);
        chip.classList.remove('selected');
      } else {
        selectedInterests.push(label);
        chip.classList.add('selected');
      }
    });
    document.getElementById('profileBackBtn').addEventListener('click', () => {
      profileAnswers.interests = [...selectedInterests];
      if (profileIndex > 0) { profileIndex--; renderProfileQuestion(); }
      else { assessIndex = ASSESS_QUESTIONS.length - 1; renderAssessQuestion(); }
    });
    document.getElementById('profileNextBtn').addEventListener('click', () => {
      profileAnswers.interests = [...selectedInterests];
      if (profileIndex < PROFILE_QUESTIONS.length - 1) { profileIndex++; renderProfileQuestion(); }
      else finishProfile();
    });
  }
}

async function finishProfile() {
  const { primaryArchetype, growthArchetype, dominantElement } = profileAnswers._archetype || {};

  if (assessBrotherId) {
    try {
      await updateDoc(doc(db, 'brothers', assessBrotherId), {
        yearlyGoal:  profileAnswers.yearlyGoal  || '',
        strengths:   profileAnswers.strengths   || '',
        struggles:   profileAnswers.struggles   || '',
        interests:   profileAnswers.interests   || [],
        oneWord:     profileAnswers.oneWord      || '',
        profileCompletedAt: new Date().toISOString(),
      });
      const local = brothers.find(b => b.id === assessBrotherId);
      if (local) Object.assign(local, {
        yearlyGoal:  profileAnswers.yearlyGoal  || '',
        strengths:   profileAnswers.strengths   || '',
        struggles:   profileAnswers.struggles   || '',
        interests:   profileAnswers.interests   || [],
        oneWord:     profileAnswers.oneWord      || '',
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
      showToast('Profile shown but failed to save — check connection.', 'info');
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
function challengeFilterBar(extraFilters = []) {
  const tags = ['All', ...Object.keys(CHALLENGE_TAGS), ...extraFilters];
  return `<div class="ch-filter-bar">
    ${tags.map(t => `<button class="ch-filter-btn ${challengeFilter === t ? 'active' : ''}" data-filter="${t}">${t}</button>`).join('')}
  </div>`;
}

function bindChallengeFilterBar(el) {
  el.querySelectorAll('.ch-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      challengeFilter = btn.dataset.filter;
      renderFeed();
    });
  });
}

function applyFilter(list) {
  if (challengeFilter === 'All') return list;
  if (challengeFilter === 'From Coach') return list; // personal list handled separately
  return list.filter(ch => ch.tag === challengeFilter);
}

function renderFeed() {
  const el = document.getElementById('feedContainer');
  if (!el) return;
  if (isAdmin) renderFeedAdmin(el);
  else if (isMentor) renderFeedMentor(el);
  else renderFeedMember(el);
}

function renderFeedAdmin(el) {
  let html = `<div class="feed-header">
    <h2 class="feed-title">Challenges</h2>
    <button class="btn btn-primary" id="createChallengeBtn">+ New Challenge</button>
  </div>
  ${challengeFilterBar(['Personal'])}`;

  const publicChallenges   = applyFilter(challenges.filter(ch => !ch.assignedTo));
  const personalChallenges = challenges.filter(ch => ch.assignedTo);
  const showPersonal = challengeFilter === 'All' || challengeFilter === 'Personal';
  const showPublic   = challengeFilter !== 'Personal';

  if (showPublic && !publicChallenges.length) {
    html += `<div class="feed-empty">No challenges in this category yet.</div>`;
  } else if (showPublic) {
    html += `<div class="feed-section">
      <div class="feed-section-title">${IC.trophy} Active Challenges</div>
      <div class="challenge-list">
        ${publicChallenges.map(ch => {
          const chSubs  = submissions.filter(s => s.challengeId === ch.id);
          const completed = chSubs.filter(s => s.status === 'completed').length;
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
              <span>${IC.check} ${completed} completed</span>
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

  if (showPersonal && personalChallenges.length) {
    html += `<div class="feed-section">
      <div class="feed-section-title">🎯 Personal Challenges (Coach-Assigned)</div>
      <div class="challenge-list">
        ${personalChallenges.map(ch => {
          const assigneeName = brothers.find(b => b.id === ch.assignedTo)?.name || 'Unknown';
          const chSubs  = submissions.filter(s => s.challengeId === ch.id);
          const completed = chSubs.filter(s => s.status === 'completed').length;
          return `<div class="challenge-card" ${challengeCardStyle(ch.tag)}>
            <div class="coach-challenge-assignee">🎯 For ${escHtml(assigneeName)}</div>
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
              <span>${IC.check} ${completed} completed</span>
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

  bindChallengeFilterBar(el);
  document.getElementById('createChallengeBtn')?.addEventListener('click', openCreateChallengeModal);
  el.querySelectorAll('.btn-close-challenge').forEach(btn =>
    btn.addEventListener('click', () => archiveChallenge(btn.dataset.closech)));
  el.querySelectorAll('.btn-edit-challenge').forEach(btn =>
    btn.addEventListener('click', () => openEditChallengeModal(btn.dataset.editch)));

  // Tap photo to open lightbox
  el.querySelectorAll('.sub-photo-tap').forEach(img => {
    img.addEventListener('click', () => openPhotoLightbox(
      img.dataset.lightbox, img.dataset.subid,
      img.dataset.brother, img.dataset.challenge, parseInt(img.dataset.xp),
      img.dataset.lightbox2 || null, img.dataset.audio || null
    ));
  });
}

function renderFeedMentor(el) {
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  const mySubs  = submissions.filter(s => s.brotherId === profile?.id);

  let html = `<div class="feed-header">
    <h2 class="feed-title">Challenges</h2>
    <button class="btn btn-primary" id="createChallengeBtn">+ New Challenge</button>
  </div>
  ${challengeFilterBar(['From Coach'])}`;

  const myPersonalM = challenges.filter(ch => ch.assignedTo === profile?.id);
  const publicChsM  = applyFilter(challenges.filter(ch => !ch.assignedTo));
  const showCoach   = challengeFilter === 'All' || challengeFilter === 'From Coach';
  const showPubM    = challengeFilter !== 'From Coach';

  if (showCoach && myPersonalM.length) {
    html += `<div class="feed-section"><div class="feed-section-title">🎯 Challenge from Coach</div><div class="challenge-list">`;
    myPersonalM.forEach(ch => {
      const mySub = mySubs.find(s => s.challengeId === ch.id);
      html += `<div class="challenge-card coach-challenge" ${challengeCardStyle(ch.tag)}>
        <div class="coach-challenge-badge">🎯 Personal Challenge from Coach</div>
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
        </div>
        ${mySub ? `<div class="sub-status-badge status-completed">
          ${IC.check} Challenge Complete — +${ch.xpReward} XP!
        </div>` : `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`}
      </div>`;
    });
    html += `</div></div>`;
  }

  if (showPubM && !publicChsM.length) {
    html += `<div class="feed-empty">No challenges in this category yet.</div>`;
  } else if (showPubM) {
    html += `<div class="feed-section"><div class="feed-section-title">${IC.trophy} Active Challenges</div><div class="challenge-list">`;
    publicChsM.forEach(ch => {
      const mySub = mySubs.find(s => s.challengeId === ch.id);
      const totalCompleted = submissions.filter(s => s.challengeId === ch.id && s.status === 'completed').length;
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
          <span>${IC.check} ${totalCompleted} completed</span>
        </div>
        ${mySub ? `<div class="sub-status-badge status-completed">
          ${IC.check} Challenge Complete — +${ch.xpReward} XP!
        </div>` : `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`}
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
  bindChallengeFilterBar(el);
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

  const myPersonal = challenges.filter(ch => ch.assignedTo === profile.id);
  const publicChs  = applyFilter(challenges.filter(ch => !ch.assignedTo));
  const showCoachM = challengeFilter === 'All' || challengeFilter === 'From Coach';
  const showPubCh  = challengeFilter !== 'From Coach';

  let html = `<div class="feed-header"><h2 class="feed-title">Challenges</h2></div>
  ${challengeFilterBar(myPersonal.length ? ['From Coach'] : [])}`;

  if (showCoachM && myPersonal.length) {
    html += `<div class="feed-section"><div class="feed-section-title">🎯 Challenge from Coach</div><div class="challenge-list">`;
    myPersonal.forEach(ch => {
      const mySub = mySubs.find(s => s.challengeId === ch.id);
      html += `<div class="challenge-card member coach-challenge" ${challengeCardStyle(ch.tag)}>
        <div class="coach-challenge-badge">🎯 Personal Challenge from Coach</div>
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
        </div>
        ${mySub ? `
          <div class="sub-status-badge status-completed">
            ${IC.check} Challenge Complete — +${ch.xpReward} XP awarded!
          </div>
        ` : `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`}
      </div>`;
    });
    html += `</div></div>`;
  }

  if (showPubCh && !publicChs.length) {
    html += `<div class="feed-empty">No challenges in this category right now. 🏆</div>`;
  } else if (showPubCh) {
    html += `<div class="feed-section"><div class="feed-section-title">${IC.trophy} Active Challenges</div><div class="challenge-list">`;
    publicChs.forEach(ch => {
      const mySub = mySubs.find(s => s.challengeId === ch.id);
      const totalCompleted = submissions.filter(s => s.challengeId === ch.id && s.status === 'completed').length;
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
          <span>${IC.check} ${totalCompleted} completed</span>
        </div>
        ${mySub ? `
          <div class="sub-status-badge status-completed">
            ${IC.check} Challenge Complete — +${ch.xpReward} XP awarded!
          </div>
        ` : `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`}
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
          <div class="sub-status-pill status-completed">
            ${IC.check} Complete +${ch.xpReward} XP
          </div>
          <div class="sub-date">${new Date(s.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  el.innerHTML = html;
  bindChallengeFilterBar(el);
  el.querySelectorAll('[data-submit]').forEach(btn =>
    btn.addEventListener('click', () => openSubmitProofModal(btn.dataset.submit, profile)));
  el.querySelectorAll('.profile-snapshot-toggle').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const snap = btn.nextElementSibling;
      const nowCollapsed = snap.classList.toggle('collapsed');
      btn.querySelector('.snapshot-chevron').textContent = nowCollapsed ? '▾' : '▴';
    }));
}

// ── SOCIAL FEED ───────────────────────────────
function renderSocialFeed() {
  const el = document.getElementById('socialFeedContainer');
  if (!el) return;

  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser?.email?.toLowerCase());

  let html = `<div class="feed-header">
    <h2 class="feed-title">Brotherhood Feed</h2>
    ${isAdmin ? `<button class="btn btn-primary btn-sm" id="openAnnouncementBtn">📣 Post</button>` : ''}
  </div>`;

  if (!feedPosts.length) {
    html += `<div class="feed-empty">No posts yet — complete a challenge to post your first win! 🏆</div>`;
    el.innerHTML = html;
    if (isAdmin) bindAnnouncementBtn(el);
    return;
  }

  feedPosts.forEach(post => {
    const ago = timeAgo(post.createdAt);
    const brother = brothers.find(b => b.id === post.brotherId);
    const icon = brother ? archetypeElementIcon(brother.primaryArchetype || brother.archetype, brother.dominantElement) : '';

    if (post.type === 'announcement') {
      html += `<div class="sf-post sf-announcement">
        <div class="sf-post-header">
          <div class="sf-avatar sf-avatar-coach">🏆</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">Coach</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${isAdmin ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">✕</button>` : ''}
        </div>
        <div class="sf-announcement-text">${linkify(post.text || '')}</div>
        ${post.photoUrl ? `<img src="${post.photoUrl}" class="sf-photo" alt="" />` : ''}
        <div class="sf-comments" data-post-id="${post.id}">
          ${renderComments(post.comments || [], profile)}
        </div>
        <div class="sf-comment-form">
          <input class="sf-comment-input" data-comment-post="${post.id}" placeholder="Say something…" maxlength="300" />
          <button class="sf-comment-send" data-comment-send="${post.id}">↑</button>
        </div>
      </div>`;
    } else {
      const tagColor = post.challengeTag && CHALLENGE_TAGS[post.challengeTag] ? CHALLENGE_TAGS[post.challengeTag].color : '#888';
      html += `<div class="sf-post">
        <div class="sf-post-header">
          <div class="sf-avatar">${icon || escHtml((post.brotherName || '?')[0].toUpperCase())}</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">${escHtml(post.brotherName || 'Brother')}</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${isAdmin ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">✕</button>` : ''}
        </div>
        <div class="sf-win-banner">
          <span class="sf-win-label">✅ Challenge Complete</span>
          ${post.challengeTag ? `<span class="sf-tag-pill" style="background:${tagColor}22;color:${tagColor};border-color:${tagColor}44">${post.challengeTag}</span>` : ''}
        </div>
        <div class="sf-challenge-title">${escHtml(post.challengeTitle || '')}</div>
        ${post.caption ? `<div class="sf-caption">"${escHtml(post.caption)}"</div>` : ''}
        ${(post.photoUrl || post.photoUrl2) ? `<div class="sf-photos-wrap">
          ${post.photoUrl  ? `<img src="${post.photoUrl}"  class="sf-photo" alt="proof" />` : ''}
          ${post.photoUrl2 ? `<img src="${post.photoUrl2}" class="sf-photo" alt="proof 2" />` : ''}
        </div>` : ''}
        ${post.audioUrl ? `<audio class="sf-audio" controls src="${post.audioUrl}"></audio>` : ''}
        ${post.proofLink ? `<a class="sf-link" href="${escHtml(post.proofLink)}" target="_blank" rel="noopener">🔗 ${escHtml(post.proofLink)}</a>` : ''}
        <div class="sf-xp-row"><span class="sf-xp-badge">+${post.xpAwarded} XP</span></div>
        <div class="sf-comments" data-post-id="${post.id}">
          ${renderComments(post.comments || [], profile)}
        </div>
        <div class="sf-comment-form">
          <input class="sf-comment-input" data-comment-post="${post.id}" placeholder="Say something…" maxlength="300" />
          <button class="sf-comment-send" data-comment-send="${post.id}">↑</button>
        </div>
      </div>`;
    }
  });

  el.innerHTML = html;
  if (isAdmin) bindAnnouncementBtn(el);

  // Delete post buttons
  el.querySelectorAll('[data-delete-post]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return;
      await deleteDoc(doc(db, 'feed', btn.dataset.deletePost));
    });
  });

  // Comment send buttons
  el.querySelectorAll('[data-comment-send]').forEach(btn => {
    btn.addEventListener('click', () => postComment(btn.dataset.commentSend, el, profile));
  });
  el.querySelectorAll('[data-comment-post]').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') postComment(input.dataset.commentPost, el, profile);
    });
  });
}

function renderComments(comments, profile) {
  if (!comments || !comments.length) return '';
  return comments.map(c => `
    <div class="sf-comment">
      <span class="sf-comment-author">${escHtml(c.authorName || 'Brother')}</span>
      <span class="sf-comment-text">${escHtml(c.text || '')}</span>
    </div>`).join('');
}

async function postComment(postId, el, profile) {
  const input = el.querySelector(`[data-comment-post="${postId}"]`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const post = feedPosts.find(p => p.id === postId);
  if (!post) return;
  const authorName = isAdmin ? 'Coach' : (profile?.name || 'Brother');
  const updated = [...(post.comments || []), { authorName, text, createdAt: Date.now() }];
  input.value = '';
  await updateDoc(doc(db, 'feed', postId), { comments: updated });
}

function bindAnnouncementBtn(el) {
  const btn = el.querySelector('#openAnnouncementBtn');
  if (btn) btn.addEventListener('click', () => openModal(document.getElementById('announcementModal')));
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── ROSTER (member view of all brothers) ──────
function renderRoster() {
  const container = document.getElementById('rosterContainer');
  if (!container) return;
  const me = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  const sorted = brothers.slice().sort((a, b) => (b.xp || 0) - (a.xp || 0));

  if (!sorted.length) {
    container.innerHTML = `<div class="feed-empty">No brothers yet.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="feed-header"><h2 class="feed-title">The Brotherhood</h2></div>
    <div class="roster-list">
      ${sorted.map((b, i) => {
        const xp  = b.xp || 0;
        const lvl = getLevelInfo(xp);
        const displayArchetype = b.primaryArchetype || b.archetype;
        const icon = archetypeElementIcon(displayArchetype, b.dominantElement);
        const archClr = ARCHETYPE_COLORS[displayArchetype] || { border: 'var(--border)', glow: 'transparent', icon: 'var(--orange)' };
        const elColor = ELEMENT_COLORS[b.dominantElement];
        const isMe = b.id === me?.id;
        const bsCat = b.brotherhoodScore != null ? getBSCategory(b.brotherhoodScore) : null;
        return `
          <div class="roster-card ${isMe ? 'roster-card-me' : ''}" style="--arch-border:${archClr.border};--arch-glow:${archClr.glow};--arch-icon:${archClr.icon}">
            <div class="roster-rank">#${i + 1}</div>
            <span class="arch-icon roster-icon">${icon}</span>
            <div class="roster-info">
              <div class="roster-name">
                ${isOnline(b) ? '<span class="online-dot"></span>' : ''}
                ${escHtml(b.name)}${isMe ? ' <span class="roster-you">you</span>' : ''}
              </div>
              <div class="roster-meta">
                ${displayArchetype ? `<span class="roster-arch" style="color:${archClr.icon}">${escHtml(displayArchetype)}</span>` : ''}
                ${b.dominantElement ? `<span class="roster-el" style="color:${elColor}">${escHtml(b.dominantElement)}</span>` : ''}
              </div>
              <div class="roster-xp-row">
                <div class="roster-progress-track">
                  <div class="roster-progress-fill" style="width:${lvl.progress}%;background:${archClr.icon}"></div>
                </div>
                <span class="roster-xp-num">${xp.toLocaleString()} XP</span>
              </div>
            </div>
            ${bsCat ? `<div class="roster-score" style="color:${bsCat.color}">${b.brotherhoodScore}<span class="roster-score-lbl">WK</span></div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

// ── CREATE / EDIT CHALLENGE ───────────────────
const challengeModal = document.getElementById('challengeModal');
let editingChallengeId = null;

function populateAssignSelect(preAssignId) {
  const sel = document.getElementById('challengeAssignTo');
  sel.innerHTML = '<option value="">Everyone (public challenge)</option>';
  brothers.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    if (b.id === preAssignId) opt.selected = true;
    sel.appendChild(opt);
  });
  const hint = document.getElementById('challengeAssignHint');
  hint.style.display = preAssignId ? '' : 'none';
  sel.addEventListener('change', () => {
    hint.style.display = sel.value ? '' : 'none';
  });
}

function openCreateChallengeModal(preAssignId) {
  editingChallengeId = null;
  document.getElementById('challengeForm').reset();
  document.querySelector('#challengeModal .modal-title').textContent = preAssignId
    ? `Personal Challenge — ${brothers.find(b => b.id === preAssignId)?.name || ''}`
    : 'New Challenge';
  document.querySelector('#challengeForm [type="submit"]').textContent = 'Post Challenge';
  populateAssignSelect(preAssignId || null);
  openModal(challengeModal);
}

function openEditChallengeModal(id) {
  const ch = challenges.find(c => c.id === id);
  if (!ch) return;
  editingChallengeId = id;
  document.getElementById('challengeTitle').value           = ch.title        || '';
  document.getElementById('challengeDesc').value            = ch.description  || '';
  document.getElementById('challengeXP').value              = ch.xpReward     || '';
  document.getElementById('challengeTag').value             = ch.tag          || '';
  document.getElementById('challengeDeadline').value        = ch.deadline     || '';
  document.getElementById('challengePhotoRequired').checked = ch.photoRequired !== false;
  populateAssignSelect(ch.assignedTo || null);
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

  const assignedTo = document.getElementById('challengeAssignTo').value || null;
  const data = {
    title,
    description:   document.getElementById('challengeDesc').value.trim(),
    xpReward,
    tag:           document.getElementById('challengeTag').value || null,
    deadline:      document.getElementById('challengeDeadline').value || null,
    photoRequired: document.getElementById('challengePhotoRequired').checked,
    assignedTo,
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

function resetPhotoSlot(n) {
  document.getElementById(`proofPhoto${n}`).value = '';
  document.getElementById(`proofPhotoPreview${n}`).src = '';
  document.getElementById(`proofPhotoPreview${n}`).classList.add('hidden');
  document.getElementById(`photoPlaceholder${n}`).classList.remove('hidden');
}

function resetAudioSlot() {
  document.getElementById('proofAudio').value = '';
  document.getElementById('audioPreview').classList.add('hidden');
  document.getElementById('audioPlaceholder').classList.remove('hidden');
  document.getElementById('audioFileName').textContent = '';
}

function openSubmitProofModal(challengeId, profile) {
  submittingProfile = profile;
  const ch = challenges.find(c => c.id === challengeId);
  if (!ch) return;
  document.getElementById('submitChallengeId').value          = challengeId;
  document.getElementById('submitChallengeTitle').textContent = ch.title;
  resetPhotoSlot(1);
  resetPhotoSlot(2);
  resetAudioSlot();
  document.getElementById('proofLink').value     = '';
  document.getElementById('proofCaption').value  = '';
  document.getElementById('submitProofBtn').disabled = false;
  openModal(submitProofModal);
}

[1, 2].forEach(n => {
  document.getElementById(`proofPhoto${n}`).addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById(`proofPhotoPreview${n}`);
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
    document.getElementById(`photoPlaceholder${n}`).classList.add('hidden');
  });
});

document.getElementById('proofAudio').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('audioFileName').textContent = file.name;
  document.getElementById('audioPreview').classList.remove('hidden');
  document.getElementById('audioPlaceholder').classList.add('hidden');
});

document.getElementById('audioRemoveBtn').addEventListener('click', e => {
  e.preventDefault();
  resetAudioSlot();
});

document.getElementById('submitProofForm').addEventListener('submit', async e => {
  e.preventDefault();
  const challengeId = document.getElementById('submitChallengeId').value;
  const ch          = challenges.find(c => c.id === challengeId);
  const file1       = document.getElementById('proofPhoto1').files[0];
  const file2       = document.getElementById('proofPhoto2').files[0];
  const audioFile   = document.getElementById('proofAudio').files[0];
  const proofLink   = document.getElementById('proofLink').value.trim();
  const caption     = document.getElementById('proofCaption').value.trim();
  const btn         = document.getElementById('submitProofBtn');

  if (!submittingProfile || !ch) return;
  if (ch.photoRequired && !file1 && !audioFile && !proofLink) { showToast('Please add a photo, voice note, or link', 'info'); return; }

  btn.disabled    = true;
  btn.textContent = 'Completing…';

  try {
    let photoUrl  = null;
    let photoUrl2 = null;
    let audioUrl  = null;

    if (file1) photoUrl  = await compressImage(file1, 900, 0.72);
    if (file2) photoUrl2 = await compressImage(file2, 900, 0.72);
    if (audioFile) {
      const aRef = storageRef(storage, `submissions/audio/${Date.now()}_${audioFile.name}`);
      await uploadBytes(aRef, audioFile);
      audioUrl = await getDownloadURL(aRef);
    }

    const id    = 'sub_' + Date.now().toString(36);
    const xpWon = ch.xpReward || 0;

    // Save completion record
    await setDoc(doc(db, 'submissions', id), {
      challengeId,
      brotherId:   submittingProfile.id,
      brotherName: submittingProfile.name,
      photoUrl,
      photoUrl2:   photoUrl2 || null,
      audioUrl:    audioUrl  || null,
      proofLink:   proofLink || null,
      caption,
      status:      'completed',
      submittedAt: new Date().toISOString(),
      xpReward:    xpWon,
    });

    // Award XP immediately
    const newXP = Math.min(MAX_XP, (submittingProfile.xp || 0) + xpWon);
    await updateDoc(doc(db, 'brothers', submittingProfile.id), { xp: newXP, updatedAt: new Date().toISOString() });

    // Post to feed immediately
    await addDoc(collection(db, 'feed'), {
      type:           'win',
      brotherId:      submittingProfile.id,
      brotherName:    submittingProfile.name,
      challengeId,
      challengeTitle: ch.title,
      challengeTag:   ch.tag   || null,
      xpAwarded:      xpWon,
      photoUrl:       photoUrl  || null,
      photoUrl2:      photoUrl2 || null,
      audioUrl:       audioUrl  || null,
      proofLink:      proofLink || null,
      caption:        caption   || null,
      comments:       [],
      createdAt:      Date.now(),
    });

    closeModal(submitProofModal);
    showToast(`Challenge complete! +${xpWon} XP 🔥`, 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'info');
    btn.disabled    = false;
    btn.textContent = 'Complete Challenge';
  }
});

document.getElementById('submitProofModalClose').addEventListener('click', () => closeModal(submitProofModal));
document.getElementById('submitProofCancelBtn').addEventListener('click',  () => closeModal(submitProofModal));
submitProofModal.addEventListener('click', e => { if (e.target === submitProofModal) closeModal(submitProofModal); });


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

// ── STORAGE UPLOAD HELPER ─────────────────────
async function uploadPhoto(file, path) {
  const r = storageRef(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

// ── PHOTO LIGHTBOX ────────────────────────────
function openPhotoLightbox(photoUrl, subId, brotherName, challengeTitle, xp, photoUrl2, audioUrl) {
  const lb = document.getElementById('photoLightbox');
  document.getElementById('lbImg').src = photoUrl;
  const lbImg2 = document.getElementById('lbImg2');
  if (photoUrl2) { lbImg2.src = photoUrl2; lbImg2.classList.remove('hidden'); }
  else           { lbImg2.src = ''; lbImg2.classList.add('hidden'); }
  const lbAudio = document.getElementById('lbAudio');
  if (audioUrl) { lbAudio.src = audioUrl; lbAudio.classList.remove('hidden'); }
  else          { lbAudio.src = ''; lbAudio.classList.add('hidden'); }
  document.getElementById('lbBrother').textContent = brotherName;
  document.getElementById('lbChallenge').textContent = challengeTitle;
  document.getElementById('lbXp').textContent = `+${xp} XP`;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closePhotoLightbox() {
  document.getElementById('photoLightbox').classList.remove('open');
  document.body.style.overflow = '';
  const audio = document.getElementById('lbAudio');
  audio.pause();
  audio.currentTime = 0;
}
document.getElementById('photoLightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('photoLightbox')) closePhotoLightbox();
});
document.getElementById('lbClose').addEventListener('click', closePhotoLightbox);

// ── ANNOUNCEMENT MODAL WIRING ─────────────────
const announcementModal = document.getElementById('announcementModal');
document.getElementById('announcementModalClose').addEventListener('click', () => closeModal(announcementModal));
document.getElementById('announcementCancelBtn').addEventListener('click',  () => closeModal(announcementModal));
announcementModal.addEventListener('click', e => { if (e.target === announcementModal) closeModal(announcementModal); });
document.getElementById('announcementForm').addEventListener('submit', async e => {
  e.preventDefault();
  const text     = document.getElementById('announcementText').value.trim();
  const fileInput = document.getElementById('announcementPhoto');
  const file     = fileInput.files[0];
  if (!text) return;

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting…';

  try {
    let photoUrl = null;
    if (file) {
      photoUrl = await uploadPhoto(file, `feed/${Date.now()}_${file.name}`);
    }
    await addDoc(collection(db, 'feed'), {
      type:      'announcement',
      text,
      photoUrl:  photoUrl || null,
      comments:  [],
      createdAt: Date.now(),
    });
    document.getElementById('announcementText').value = '';
    fileInput.value = '';
    document.getElementById('announcementPhotoPreview').innerHTML = '';
    closeModal(announcementModal);
    switchTab('socialfeed');
    showToast('Posted to feed!', 'success');
  } catch (err) {
    showToast('Error posting: ' + err.message, 'info');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post';
  }
});

// Photo preview for announcement
document.getElementById('announcementPhoto').addEventListener('change', function() {
  const preview = document.getElementById('announcementPhotoPreview');
  const file = this.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-top:8px;" />`;
  } else {
    preview.innerHTML = '';
  }
});

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

function linkify(str) {
  if (!str) return '';
  const escaped = escHtml(str);
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, url =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="sf-link">${url}</a>`
  );
}
