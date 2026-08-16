/* ============================================
   STOKED BROTHERHOOD COMMAND CENTER
   Firebase-powered: Auth + Firestore
   ============================================ */

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc,
         onSnapshot, setDoc, updateDoc, addDoc,
         deleteDoc, getDoc, getDocs,
         query, where, orderBy, serverTimestamp }    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
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
// 100 levels, 1000 XP each
const MAX_LEVEL = 100;
const XP_PER_LEVEL = 1000;
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => ({
  level: i + 1,
  xpRequired: i * XP_PER_LEVEL,
}));

const CHALLENGE_TAGS = {
  Move:        { cardBg: 'rgba(196,105,58,0.07)',  cardBorder: 'rgba(196,105,58,0.4)',  pillBg: 'rgba(196,105,58,0.15)',  color: '#C4693A' },
  Create:      { cardBg: 'rgba(91,138,160,0.07)',  cardBorder: 'rgba(91,138,160,0.4)',  pillBg: 'rgba(91,138,160,0.15)',  color: '#5B8AA0' },
  Reset:       { cardBg: 'rgba(90,140,90,0.07)',   cardBorder: 'rgba(90,140,90,0.4)',   pillBg: 'rgba(90,140,90,0.15)',   color: '#5a8c5a' },
  Special:     { cardBg: 'rgba(212,168,83,0.07)',  cardBorder: 'rgba(212,168,83,0.4)',  pillBg: 'rgba(212,168,83,0.15)',  color: '#D4A853' },
  Adventure:   { cardBg: 'rgba(122,138,82,0.07)',  cardBorder: 'rgba(122,138,82,0.4)',  pillBg: 'rgba(122,138,82,0.15)',  color: '#7a8a52' },
  Family:      { cardBg: 'rgba(158,141,114,0.07)', cardBorder: 'rgba(158,141,114,0.4)', pillBg: 'rgba(158,141,114,0.15)', color: '#9e8d72' },
  Brotherhood: { cardBg: 'rgba(156,90,66,0.07)',   cardBorder: 'rgba(156,90,66,0.4)',   pillBg: 'rgba(156,90,66,0.15)',   color: '#9c5a42' },
};

// ── BADGE SYSTEM ──────────────────────────────
const BADGE_CHAINS = {
  challenge_path: {
    label: 'Challenge Path',
    ids: ['first_challenge','five_challenges','ten_challenges','twenty_challenges','thirty_five_challenges','fifty_challenges','hundred_challenges'],
  },
  streak_path: {
    label: 'Streak Path',
    ids: ['seven_day_streak','two_week_streak','thirty_day_streak','sixty_day_streak'],
  },
};

const BADGE_IMG_BASE = '/stoked-command-center/Badges%20stoked%202/';
const BADGE_ICONS = {
  first_challenge:    'firstflame-badge.png',
  iron_body:          'ironbody-badge.png',
  monk_mode:          'monkmode-badge.png',
  creators_mark:      'creatorsmark-badge.png',
  clear_space:        'clearspace-badge.png',
  cold_blooded:       'coldblooded-badge.png',
  sanctuary:          'sanctuary-badge.png',
  show_your_stoke:    'showyourstoke-badge.png',
  sixty_day_streak:   '60strong-badge.png',
};
function badgeIconHtml(badgeId, size = 40, dimmed = false) {
  const file = BADGE_ICONS[badgeId];
  if (file) return `<img src="${BADGE_IMG_BASE}${file}" width="${size}" height="${size}" style="object-fit:contain;${dimmed ? 'opacity:0.25;filter:grayscale(1)' : ''}" alt="">`;
  return `<span class="badge-icon-glyph">◈</span>`;
}

// Map badge id → chain id for quick lookup
const BADGE_CHAIN_MAP = {};
for (const [chainId, chain] of Object.entries(BADGE_CHAINS)) {
  chain.ids.forEach(id => { BADGE_CHAIN_MAP[id] = chainId; });
}

const BADGE_CATEGORIES = {
  general:     { label: 'General',     color: '#D4A853' },
  move:        { label: 'Move',        color: '#C4693A', challengeTag: 'Move' },
  create:      { label: 'Create',      color: '#5B8AA0', challengeTag: 'Create' },
  reset:       { label: 'Reset',       color: '#5a8c5a', challengeTag: 'Reset' },
  adventure:   { label: 'Adventure',   color: '#7a8a52', challengeTag: 'Adventure' },
  family:      { label: 'Family',      color: '#9e8d72', challengeTag: 'Family' },
  brotherhood: { label: 'Brotherhood', color: '#9c5a42', challengeTag: 'Brotherhood' },
};

const BADGES = [
  // Challenge completion progression
  {
    id: 'first_challenge',
    name: 'First Flame',
    category: 'general',
    description: 'Complete your first challenge.',
    xpReward: 50,
    verification: 'automatic',
    requirement: { type: 'total_challenges', count: 1 },
  },
  {
    id: 'five_challenges',
    name: 'Getting Started',
    category: 'general',
    description: 'Complete 5 challenges.',
    xpReward: 100,
    verification: 'automatic',
    requirement: { type: 'total_challenges', count: 5 },
  },
  {
    id: 'ten_challenges',
    name: 'In the Groove',
    category: 'general',
    description: 'Complete 10 challenges.',
    xpReward: 150,
    verification: 'automatic',
    requirement: { type: 'total_challenges', count: 10 },
  },
  {
    id: 'twenty_challenges',
    name: 'Building Momentum',
    category: 'general',
    description: 'Complete 20 challenges.',
    xpReward: 200,
    verification: 'automatic',
    requirement: { type: 'total_challenges', count: 20 },
  },
  {
    id: 'thirty_five_challenges',
    name: 'Committed',
    category: 'general',
    description: 'Complete 35 challenges.',
    xpReward: 300,
    verification: 'automatic',
    requirement: { type: 'total_challenges', count: 35 },
  },
  {
    id: 'fifty_challenges',
    name: 'Half Century',
    category: 'general',
    description: 'Complete 50 challenges.',
    xpReward: 400,
    verification: 'automatic',
    requirement: { type: 'total_challenges', count: 50 },
  },
  {
    id: 'hundred_challenges',
    name: 'Century',
    category: 'general',
    description: 'Complete 100 challenges.',
    xpReward: 750,
    verification: 'automatic',
    requirement: { type: 'total_challenges', count: 100 },
  },
  // Login streak progression
  {
    id: 'seven_day_streak',
    name: 'Week One',
    category: 'general',
    description: 'Maintain a 7-day login streak.',
    xpReward: 150,
    verification: 'automatic',
    requirement: { type: 'login_streak', days: 7 },
  },
  {
    id: 'two_week_streak',
    name: 'Two Weeks Strong',
    category: 'general',
    description: 'Maintain a 14-day login streak.',
    xpReward: 250,
    verification: 'automatic',
    requirement: { type: 'login_streak', days: 14 },
  },
  {
    id: 'thirty_day_streak',
    name: 'Month Strong',
    category: 'general',
    description: 'Maintain a 30-day login streak.',
    xpReward: 500,
    verification: 'automatic',
    requirement: { type: 'login_streak', days: 30 },
  },
  {
    id: 'sixty_day_streak',
    name: '60 Strong',
    category: 'general',
    description: 'Maintain a 60-day login streak.',
    xpReward: 1000,
    verification: 'automatic',
    requirement: { type: 'login_streak', days: 60 },
  },
  // Category badges
  {
    id: 'iron_body',
    name: 'Iron Body',
    category: 'move',
    description: 'Complete 25 Move challenges.',
    xpReward: 750,
    verification: 'automatic',
    requirement: { type: 'category_challenges', tag: 'Move', count: 25 },
  },
  {
    id: 'monk_mode',
    name: 'Monk Mode',
    category: 'reset',
    description: 'Complete 25 Reset challenges.',
    xpReward: 750,
    verification: 'automatic',
    requirement: { type: 'category_challenges', tag: 'Reset', count: 25 },
  },
  {
    id: 'creators_mark',
    name: "Creator's Mark",
    category: 'create',
    description: 'Complete 25 Create challenges.',
    xpReward: 750,
    verification: 'automatic',
    requirement: { type: 'category_challenges', tag: 'Create', count: 25 },
  },
  {
    id: 'clear_space',
    name: 'Clear Space',
    category: 'reset',
    description: 'Complete the Room Reset challenge 10 times.',
    xpReward: 500,
    verification: 'automatic',
    requirement: { type: 'specific_challenge_title', titleMatch: 'Room Reset', count: 10 },
  },
  {
    id: 'cold_blooded',
    name: 'Cold Blooded',
    category: 'move',
    description: 'Successfully complete the Ice Bath Challenge.',
    xpReward: 300,
    verification: 'automatic',
    requirement: { type: 'specific_challenge_title', titleMatch: 'Ice Bath', count: 1 },
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    category: 'reset',
    description: 'Create a dedicated personal space at home for focus, meditation, or creativity. Submit a photo — requires mentor approval.',
    xpReward: 500,
    verification: 'mentor_approval',
    requirement: { type: 'mentor_approval' },
  },
  {
    id: 'show_your_stoke',
    name: 'Show Your Stoke',
    category: 'brotherhood',
    description: 'Create something authentic and present it during a Brotherhood call — a song, art, project, business idea, or anything personally meaningful.',
    xpReward: 750,
    verification: 'manual_award',
    requirement: { type: 'manual_award' },
  },
];

// Normalize legacy tag names from Firestore to current names
const TAG_ALIASES = { Physical: 'Move', Creator: 'Create', Regulation: 'Reset' };
function normalizeTag(tag) { return TAG_ALIASES[tag] || tag; }

function challengeCardStyle(tag) {
  const t = CHALLENGE_TAGS[normalizeTag(tag)];
  if (!t) return '';
  return `style="--ch-bg:${t.cardBg};--ch-border:${t.cardBorder};--ch-accent:${t.color}"`;
}

function challengeTagPill(tag) {
  const norm = normalizeTag(tag);
  const t = CHALLENGE_TAGS[norm];
  if (!t) return '';
  return `<span class="ch-tag" style="background:${t.color}22;color:${t.color};border-color:${t.color}44">${norm}</span>`;
}

function proofTypeLabel(p) {
  const cam = IC.camera, vid = IC.video, aud = IC.audio, lnk = IC.link;
  const map = {
    video:       `${vid} Video`,
    photo:       `${cam} Photo`,
    audio:       `${aud} Audio`,
    photo_video: `${cam} Photo or Video`,
    video_audio: `${vid} Video or Audio`,
    video_photo: `${vid} Video or Photo`,
    photo_audio: `${cam} Photo or Audio`,
  };
  return map[p] || `${lnk} Proof`;
}

function buildChallengeCard(ch, statusHtml, opts = {}) {
  const t = CHALLENGE_TAGS[normalizeTag(ch.tag)];
  const accent = t?.color || '#527A8E';
  const repeatBadge = ch.repeatType === 'daily'
    ? `<span class="ch-repeat-badge ch-repeat-daily">${IC.repeat} Daily</span>`
    : ch.repeatType === 'one_time'
      ? `<span class="ch-repeat-badge ch-repeat-once">${IC.once} One-and-Done</span>`
      : '';
  const proofBadge = ch.proofType ? `<span class="ch-repeat-badge">${proofTypeLabel(ch.proofType)}</span>` : ch.photoRequired ? `<span class="ch-repeat-badge">${IC.camera} Photo required</span>` : '';
  const coachBadge = opts.coach ? `<div class="coach-challenge-badge">${IC.coach} Personal Challenge from Coach</div>` : '';
  const assigneeBadge = opts.assignee ? `<div class="coach-challenge-assignee">${IC.coach} For ${escHtml(opts.assignee)}</div>` : '';
  const adminBtns = opts.adminBtns ? `<div class="ch-admin-btns">${opts.adminBtns}</div>` : '';
  return `<div class="ch-card ${opts.coach ? 'ch-card--coach' : ''}" ${challengeCardStyle(ch.tag)} data-chid="${ch.id}">
    ${assigneeBadge}${coachBadge}
    <div class="ch-card-header">
      <div class="ch-card-accent" style="background:${accent}"></div>
      <div class="ch-card-left">
        ${challengeTagPill(ch.tag)}
        <div class="ch-title">${escHtml(ch.title)}</div>
      </div>
      <div class="ch-card-right">
        <div class="ch-xp-pill" style="color:${accent};border-color:${accent}44;background:${accent}18">+${ch.xpReward} XP</div>
        <svg class="ch-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
    <div class="ch-card-body">
      ${ch.description ? `<div class="ch-desc">${escHtml(ch.description)}</div>` : ''}
      <div class="ch-meta">
        ${repeatBadge}${proofBadge}
        ${ch.deadline ? `<span class="ch-repeat-badge">${IC.calendar} Due ${new Date(ch.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
        ${opts.completedCount != null ? `<span class="ch-repeat-badge">${IC.check} ${opts.completedCount} completed</span>` : ''}
      </div>
      ${statusHtml}
      ${adminBtns}
    </div>
  </div>`;
}

function bindChallengeCards(el) {
  el.querySelectorAll('.ch-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.ch-card');
      card.classList.toggle('open');
    });
  });
}

const ARCHETYPE_COLORS = {
  Warrior:      { border: 'rgba(196,105,58,0.5)',  glow: 'rgba(196,105,58,0.06)',  icon: '#C4693A' }, // terracotta
  Creator:      { border: 'rgba(91,138,160,0.45)', glow: 'rgba(91,138,160,0.07)',  icon: '#5B8AA0' }, // ocean blue
  Explorer:     { border: 'rgba(90,140,90,0.45)',  glow: 'rgba(90,140,90,0.06)',   icon: '#5a8c5a' }, // sage green
  Builder:      { border: 'rgba(130,110,90,0.45)', glow: 'rgba(130,110,90,0.06)',  icon: '#826e5a' }, // warm brown
  Protector:    { border: 'rgba(156,90,66,0.5)',   glow: 'rgba(156,90,66,0.06)',   icon: '#9c5a42' }, // rust
  Visionary:    { border: 'rgba(122,138,82,0.5)',  glow: 'rgba(122,138,82,0.06)',  icon: '#7a8a52' }, // olive
  Monk:         { border: 'rgba(158,141,114,0.45)', glow: 'rgba(158,141,114,0.06)', icon: '#9e8d72' }, // warm sand
};

const ELEMENT_COLORS = {
  Fire:  '#C4502E',
  Water: '#4A7A94',
  Air:   '#8A9AB0',
  Earth: '#7A8C52',
};

// Returns a CSS class name for the icon ring based on level (1–12)
function levelRingClass(level) {
  if (!level || level < 1) return 'ring-none';
  return `ring-tier${Math.min(level, 12)}`;
}

// Hand-drawn archetype+element icon set, one PNG per combo in /icons
// (e.g. icons/warrior-fire.png), supplied directly by the client.
function archetypeElementIcon(archetype, element, xp) {
  const lvlObj = xp != null ? getLevelInfo(xp) : null;
  const ringClass = levelRingClass(lvlObj?.current?.level);
  const clr = ARCHETYPE_COLORS[archetype] || ARCHETYPE_COLORS.Warrior;
  const archClass = archetype ? `arch-${archetype.toLowerCase()}` : '';
  const elemClass = element ? `elem-${element.toLowerCase()}` : '';
  const style = `--ring-clr:${clr.icon};--ring-glow:${clr.glow.replace(/[\d.]+\)$/, '0.55)')};--ring-border:${clr.border}`;
  const aura = '<div class="elem-aura"></div>';
  // Use new flat PNG icons — no elemental variants
  const imgSrc = archetype ? `/stoked-command-center/${archetype.toLowerCase()}-icon.png` : '';
  if (imgSrc) {
    return `<div class="arch-icon-wrap ${ringClass} ${archClass} ${elemClass}" style="${style}">${aura}<img src="${imgSrc}" alt="${escHtml(archetype||'')}" class="arch-icon-img"></div>`;
  }
  return `<div class="arch-icon-wrap ${ringClass} ${archClass} ${elemClass}" style="${style}">${aura}</div>`;
}

const ELEMENT_DESC = {
  Fire:  'Your strongest energy is passion, courage, action, and intensity.',
  Water: 'Your strongest energy is emotion, adaptability, connection, and intuition.',
  Air:   'Your strongest energy is ideas, creativity, awareness, and clarity of mind.',
  Earth: 'Your strongest energy is discipline, structure, and steady strength.',
};

const ARCHETYPE_DESC = {
  Warrior: {
    primary: `The Warrior is driven by action, courage, competition, and the willingness to confront discomfort. He understands himself through direct experience — he would rather try something difficult than spend too long discussing it. The deeper Warrior quality is not physical strength or aggression. It is the willingness to face what is hard. He moves toward challenge. He does not wait for perfect conditions.`,
    Fire:   `A Fire Warrior is bold, competitive, and direct. He acts with intensity and leads from the front. He doesn't need momentum — he creates it. His energy is contagious, his commitment is total. The challenge is learning to direct the flame. Uncontrolled fire destroys. Mastered fire forges.`,
    Water:  `A Water Warrior fights from a different place. He is not driven by rage — he is driven by love. Love for his people, his purpose, and what matters. He can take a hit and keep moving because he feels deeply and channels it forward. His strength is fluid and relentless, like a river that carves through stone.`,
    Air:    `An Air Warrior is the thinking fighter. He doesn't just train his body — he studies the game. He reads people, anticipates outcomes, and moves with tactical precision. Where brute force would fail, his mind wins. He is the man in the room who looks calm and sees everything.`,
    Earth:  `An Earth Warrior is the most reliable man in any fight. He shows up. Every day. Without drama. His training is disciplined, his habits are locked in, and his endurance is built on years of consistent work. He doesn't peak — he sustains. He is the man still standing when everyone else has burned out.`,
    growth: `The Warrior is your blindspot. You have been avoiding the hard things — physical discipline, direct confrontation, uncomfortable challenge — and it is costing you. Without the Warrior's edge, you will struggle when life demands that you simply endure. Be wary of comfort-seeking, of backing down when things get hard, and of building a life that looks good but hasn't been tested. Developing this gives you backbone that no amount of thinking or feeling can replace.`,
    gFire:  `Fire is the energy you are least connected to right now — the raw heat of urgency, intensity, and bold action. Without it, you tend to overthink, delay, or soften decisions that need to be made. Learning to act before you feel fully ready, to bring intensity to what matters most — this is where a new level of you begins.`,
    gWater: `Water without the Warrior becomes passive. Your sensitivity and depth are real strengths — but without the edge of challenge, they can become excuses to avoid what is hard. The work is learning to feel deeply and still push forward. Soft-hearted and hard-working at the same time. That combination is rare.`,
    gAir:   `Air without the Warrior becomes analysis without action. You can think clearly and see the path — but the Warrior asks you to walk it, not just map it. Your growth comes from learning to execute with your body and your will, not just your mind. Physical challenge will ground your intelligence in a way nothing else can.`,
    gEarth: `Earth without the Warrior can become comfort disguised as stability. You are consistent — but are you being challenged? Your growth comes from deliberately choosing harder ground. Routine is your strength; now add resistance to it. The version of you that has also been tested will be significantly more capable.`,
  },
  Creator: {
    primary: `The Creator is driven by expression, originality, imagination, and making things that did not exist before. He may express himself through music, art, writing, film, fashion, humor, inventions, businesses, performances, or unconventional problem-solving. He sees the world as raw material and his instinct is to shape it into something better than he found it. When he is alive in his gift, the world around him shifts.`,
    Fire:   `A Fire Creator makes things that move people. He doesn't just build — he ignites. His work carries urgency and conviction. He creates as if the idea will expire if he doesn't get it out. He is the one who starts the movement, breaks the silence. His creative energy is a force, not a hobby.`,
    Water:  `A Water Creator makes things that heal and connect. His work carries emotional truth. He writes the thing that makes people feel seen. He builds the space where others exhale. His creations reflect sensitivity to beauty, to pain, to nuance. What he makes isn't just impressive — it's meaningful.`,
    Air:    `An Air Creator lives in the world of ideas and language. He thinks in stories, metaphors, systems of meaning. He can take something complex and make it clear, or take something ordinary and reveal its depth. His creativity is primarily conceptual — he invents ways of thinking, not just things.`,
    Earth:  `An Earth Creator finishes what he starts. He is not just a dreamer — he is a maker in the truest sense. He brings ideas from imagination into physical reality through discipline, craft, and patience. He builds things that last. His work is tangible, well-made, and built to endure.`,
    growth: `The Creator is your blindspot. You are more rigid and less expressive than you need to be. You may follow the expected path, execute what has been proven, or stay inside lines drawn by someone else — and in doing so, you are suppressing something real. Be wary of defaulting to the safe option, of dismissing your own ideas before they have a chance, and of mistaking practicality for wisdom. Learning to create — to express, to make, to take the unconventional path — will bring a dimension of originality to your life that discipline alone cannot produce.`,
    gFire:  `Fire without the Creator's originality can become brute force. You act boldly, but are you creating anything new? Your growth comes from learning to bring creative energy into your intensity — to not just push harder but to push differently. Stop repeating the pattern and start making something that didn't exist before.`,
    gWater: `Water without the Creator's expression can become emotion without outlet. You feel deeply, but are you making anything from it? The Creator gives your inner life a place to go. Begin expressing what is inside you — through writing, building, speaking, or making — and watch what was trapped inside you start to become something real in the world.`,
    gAir:   `Air without the Creator becomes theory without form. You see things clearly and think with sophistication — but the Creator challenges you to stop analyzing and start making. Ideas that remain in your head are not yet contributions. Begin expressing them. The gap between a thinker and a creator is simply the willingness to put something imperfect into the world.`,
    gEarth: `Earth without the Creator can produce a life that is solid but uninspired. You build with discipline, but are you building something original? The Creator's energy asks you to color outside the lines — to try the unconventional approach, to risk making something that might not work. Your reliability will give your creativity staying power.`,
  },
  Explorer: {
    primary: `The Explorer is driven by curiosity, freedom, novelty, adventure, and direct contact with the unknown. He wants to experience life for himself rather than accept someone else's description of it. He doesn't fear the unfamiliar — he is energized by it. The Explorer doesn't wait for life to come to him. He goes after it.`,
    Fire:   `A Fire Explorer doesn't explore carefully — he charges. He is bold, fast-moving, and willing to go first. He doesn't need a map. He starts the adventure before he has a plan and figures it out in motion. His confidence in motion is contagious. He does not wait for permission.`,
    Water:  `A Water Explorer moves through the world with emotional curiosity. He doesn't just explore places — he explores people, relationships, inner landscapes. He goes deep as well as wide. His journey is often inward, uncovering truths about himself through experience. He is drawn to depth, mystery, and what's beneath the surface.`,
    Air:    `An Air Explorer is the idea traveler. He explores through reading, conversation, philosophy, and connection. He collects perspectives the way other men collect gear. His range of thought is wide and his hunger to understand is constant. His mind covers vast territory.`,
    Earth:  `An Earth Explorer is the adventurer who is also reliable. He goes out, pushes limits, and keeps coming back. He builds a life of adventure without losing his roots. His exploration is purposeful — he doesn't wander, he journeys. He comes home changed and brings what he learned back to the people he loves.`,
    growth: `The Explorer is your blindspot. You are playing it too safe. You are staying in familiar territory — the same environment, the same patterns, the same version of yourself — and calling it stability when it is actually stagnation. Be wary of turning down opportunities because they feel too risky, of staying in situations that have run their course, and of letting fear of the unknown keep you from the life that is waiting for you.`,
    gFire:  `Fire without the Explorer's openness can become intensity in a box. You push hard but always in the same direction. Your growth comes from learning to apply your drive to unfamiliar ground. The Explorer's energy will expand what you are capable of by expanding where you are willing to go.`,
    gWater: `Water without the Explorer can become deep but still — feeling everything within a familiar emotional range without venturing beyond it. Your growth comes from exploring new emotional territory: new relationships, new depths of vulnerability, new experiences that challenge how you see yourself.`,
    gAir:   `Air without the Explorer becomes thinking without living. You have a sharp mind — but the Explorer asks you to take those ideas into real experience. Go somewhere you haven't been. Do something you haven't done. Your intellect will be sharpened by contact with the unfamiliar in ways that reading alone cannot produce.`,
    gEarth: `Earth without the Explorer produces a man who is grounded but not growing. Your stability is genuine — but it can become a reason to never move. The Explorer asks you to take one step beyond the edge of your comfort zone, then another. Your rootedness is the greatest asset an explorer can have. Use it as a launchpad, not an anchor.`,
  },
  Builder: {
    primary: `The Builder is driven by usefulness, structure, craftsmanship, consistency, completion, and visible results. He values things that work. He doesn't get excited about ideas — he gets to work. His results speak. He doesn't need to announce what he's building — you can see it. He is defined by follow-through.`,
    Fire:   `A Fire Builder builds with intensity and urgency. He doesn't just grind — he burns while he works. He starts early, stays late, and brings a competitive edge to everything he constructs. His drive is massive and his output is high. His challenge is learning to build for the long game, not just the next sprint.`,
    Water:  `A Water Builder builds things that serve others. His motivation is not personal glory — it is the deep satisfaction of creating something that meets a real need. He builds relationships as carefully as he builds projects. What he constructs tends to last because it is grounded in purpose, not ego.`,
    Air:    `An Air Builder builds systems of thought — ideas, frameworks, communication structures. He designs the strategy, architects the process, and gives the work its clarity. He doesn't just do — he thinks through how to do it right. His contribution is often invisible but everything would fall apart without it.`,
    Earth:  `An Earth Builder is the most consistent man in the room. He shows up the same way every day. No drama. No shortcuts. He lays the foundation properly and builds upward with patience. He is the man still working while others have already posted about their results. His life is built to last.`,
    growth: `The Builder is your blindspot. You are starting things and not finishing them — or waiting for the perfect plan before you begin. Without the Builder's discipline of consistent daily execution, your potential stays potential. Be wary of abandoning projects when the excitement fades, and of building a life based on what sounds good rather than what you are actually willing to construct.`,
    gFire:  `Fire without the Builder's discipline burns fast and leaves ash. Your intensity is real, but without follow-through, it becomes a pattern of starts without finishes. Your growth is learning to stay in the work after the excitement is gone — to build something day by day until it is actually done.`,
    gWater: `Water without the Builder's structure can become feeling without form. You care deeply and connect genuinely, but caring is not the same as building. Your growth comes from translating your emotional investment into consistent daily action. The people and things you love deserve your follow-through.`,
    gAir:   `Air without the Builder becomes ideas that never land. You think with clarity and see the path — but thinking is not building. Your growth comes from sitting down and doing the unglamorous work of making something real, brick by brick. The idea is worth nothing until it exists. Start constructing.`,
    gEarth: `Earth without the Builder can become stability without progress. You maintain well — but are you constructing anything new? Your groundedness is the perfect foundation for building. Use it. Choose one thing to build deliberately over the next season and commit to it without exception.`,
  },
  Protector: {
    primary: `The Protector is driven by loyalty, responsibility, compassion, justice, and defending those who are vulnerable. He is not only someone who physically defends others — he may protect emotional safety, friendships, younger members, communities, or what matters to the people around him. He doesn't ask what he'll get. He asks what's needed.`,
    Fire:   `A Fire Protector guards with intensity. He is not passive about protection — he is fierce. He will speak loudly, act quickly, and stand between his people and anything that threatens them without hesitation. His protection comes from heat — the burning conviction that these people matter and that he will not let them down.`,
    Water:  `A Water Protector protects emotionally as much as physically. He creates safety through presence, through listening, through being a steady place where others can fall apart without judgment. His protection is felt before it's seen. The people around him feel safe because he makes them feel understood.`,
    Air:    `An Air Protector uses his mind to shield the people around him. He anticipates threats before they arrive. He asks the questions others miss and prepares his people for what's coming. His protection is strategic — thinking through consequences so others don't have to suffer them.`,
    Earth:  `An Earth Protector is unmovable. He is the wall between his people and chaos. He doesn't promise — he proves. Year after year, season after season, he is simply there. His people know he won't leave, won't give up, and won't fail them. That consistency is his greatest act of protection.`,
    growth: `The Protector is your blindspot. You are not showing up for the people around you the way they need — or you are showing up for yourself so completely that you have little left to give. Be wary of being so consumed by your own journey that others feel unseen, of making promises you don't keep, and of underestimating how much your presence matters to the people around you.`,
    gFire:  `Fire without the Protector's loyalty burns without regard for who gets hurt. Your intensity needs to be aimed at something beyond yourself — at the people who depend on you, the things worth defending. When your fire is put in service of others, it becomes something genuinely powerful rather than just impressive.`,
    gWater: `Water without the Protector can become empathy without commitment. You feel what others feel, but do you show up when it's costly? The Protector asks you to move from feeling to covering — to actually be there in the moments that count. That shift from sensing to shielding is where your depth becomes strength.`,
    gAir:   `Air without the Protector becomes thought without loyalty. You see the situation clearly, but do you stand with anyone in it? Your growth comes from choosing your people deliberately and being unmovable in your commitment to them. Your clarity is a gift — use it to protect, not just to observe.`,
    gEarth: `Earth without the Protector can become self-sufficiency that isolates. You take care of yourself well — but who are you covering? Your groundedness is exactly the quality the best protectors are built on. Root yourself in the lives of the people who matter and let your steadiness become their security.`,
  },
  Visionary: {
    primary: `The Visionary sees patterns, possibilities, and the path ahead. He is not merely a dreamer — he sees what could happen, detects patterns, anticipates outcomes, and creates a plan around the larger picture. He asks: What is really happening? Where is this going? What are we missing? What could this become? What is the smartest path forward?`,
    Fire:   `A Fire Visionary doesn't just see the future — he declares it and dares people to join him. He moves toward his vision with urgency and conviction. He is the man who starts movements, launches missions, and pulls others into something they didn't know they needed until he named it. His passion makes the impossible feel inevitable.`,
    Water:  `A Water Visionary sees the human future — the emotional and relational landscape of what could be. His vision is not about systems or industries — it is about people. He sees who others could become and what a community could look like if it were fully alive. His vision heals and inspires.`,
    Air:    `An Air Visionary is the truest intellectual of the archetypes. He thinks across disciplines, connects distant ideas, and synthesizes patterns into new understanding. His vision is often ahead of its time. He is reading things others haven't discovered yet, thinking about things others haven't considered yet.`,
    Earth:  `An Earth Visionary brings his vision down to ground level. He doesn't just dream — he builds the path toward the dream with his own hands. He is practical about the impractical. He takes the impossibly large vision and breaks it into the next brick to lay. He is the reason big ideas actually happen.`,
    growth: `The Visionary is your blindspot. You are living too small. You have accepted a version of your life that is far below what you are actually capable of seeing — and somewhere in you, you know it. Be wary of settling for what is reasonable when what is possible is right in front of you. Be wary of dismissing your own hunches about the future. Developing this will give everything else you do a sense of direction and meaning it currently lacks.`,
    gFire:  `Fire without vision burns in circles. Your intensity needs a horizon. The Visionary asks you to lift your eyes past the immediate challenge and ask: what is this all for? Where is this going? When your fire is aimed at something genuinely worth building, it will sustain in a way it never has before.`,
    gWater: `Water without vision can become depth without direction. Your emotional intelligence and relational gifts are real — but where are you taking them? The Visionary asks you to dream forward. What could your relationships and community look like in ten years if you led them with intention? Give your care a destination.`,
    gAir:   `Air without vision thinks clearly but not boldly. Your mind is sharp — but are you using it to see further than the immediate? The Visionary's gift is the courage to believe in something that doesn't exist yet. Begin asking bigger questions. Train yourself to think in decades, not days.`,
    gEarth: `Earth without vision can produce a life that is well-built but uninspired. You work hard and you finish things — but are you building toward something that genuinely matters to you? The Visionary asks you to look up from the work and remember why you are doing it. Purpose is what turns a good life into a great one.`,
  },
  Monk: {
    primary: `The Monk is driven by discipline, self-awareness, inner calm, restraint, reflection, patience, and control over impulses. He is not passive — he is the archetype of internal strength. He wants to understand his thoughts, emotions, habits, attention, and behavior. The greatest battles, he has learned, are fought inside.`,
    Fire:   `A Monk with Fire is rare. He has the discipline of stillness and the intensity of purpose. He doesn't burn hot on the surface — his fire burns at the core. He meditates, but he is not soft. He withdraws, but only to return stronger. He is the man who appears calm but is internally ablaze with commitment.`,
    Water:  `A Monk with Water is the deepest well in the room. He feels everything but shows nothing until the moment is right. His intuition is sharp, his emotional intelligence is high, and his presence creates safety for others. He doesn't need to speak to be heard. His inner world is vast, and what comes from it is precise.`,
    Air:    `A Monk with Air is the philosophical man. He thinks in layers, asks questions others don't consider, and sees patterns in human behavior most miss. His mind is always working even when he appears still. He is the one who walks away from a conversation with insights no one else caught.`,
    Earth:  `A Monk with Earth is immovable. His peace is not something he performs — it is something he has built through consistent practice over years. He shows up the same way every day. He is the anchor. People around him calm down simply by being near him. He does not react — he responds, slowly and with full intention.`,
    growth: `The Monk is your blindspot. You are not spending enough time inside. You move fast, act loud, or stay surface-level — and as a result, you don't fully know yourself. You may struggle to regulate your emotions under pressure, to sit with discomfort without reacting, or to hear hard truths about yourself without deflecting. Be wary of avoiding solitude, of filling silence with noise, and of making decisions from impulse rather than clarity. Developing stillness and self-awareness will make every other strength you have significantly more effective.`,
    gFire:  `Fire without the Monk's stillness burns uncontrolled. You have intensity — but do you have direction? Your growth is learning to pause before you ignite. The practice of reflection before action, of sitting with your anger or your drive long enough to understand it — this is where your fire stops being reactive and starts being precise.`,
    gWater: `Water without the Monk's inner work becomes emotional reactivity. Your depth of feeling is real, but without self-awareness, emotions can pull you in directions you didn't choose. The inner work of the Monk — sitting with yourself, asking hard questions, practicing stillness — will give your emotional life a foundation it currently lacks.`,
    gAir:   `Air without the Monk becomes scattered. You think well, but do you think deeply? The Monk's practice of sustained attention and inner quiet will slow your mind down enough to produce insight rather than just information. Develop the discipline of focused reflection and your natural intelligence will reach a new level of depth.`,
    gEarth: `Earth without the Monk can become mechanical — doing the work without understanding why. Your consistency is a strength. Now pair it with self-examination. Take time to sit with what you are building and ask whether it is truly aligned with who you are. The Monk's inner work will give your outer discipline a soul.`,
  },
};

// ── ARCHETYPE ASSESSMENT ──────────────────────
const ASSESS_QUESTIONS = [
  { left: 'Just go for it — face it head on and figure it out in motion', right: 'Step back first — get still and understand what is actually happening', leftScore: { arch: 'Warrior', el: 'Fire' }, rightScore: { arch: 'Monk', el: 'Water' } },
  { left: 'Try something completely new — discover what else is out there', right: 'Go deeper with what you have already started — master the craft', leftScore: { arch: 'Explorer', el: 'Air' }, rightScore: { arch: 'Builder', el: 'Earth' } },
  { left: 'Make something that moves people emotionally', right: 'Design a vision of something that does not exist yet', leftScore: { arch: 'Creator', el: 'Water' }, rightScore: { arch: 'Visionary', el: 'Air' } },
  { left: 'Be the voice — say what needs to be said in the room', right: 'Be the presence — calm, still, and fully listening', leftScore: { arch: 'Protector', el: 'Fire' }, rightScore: { arch: 'Monk', el: 'Water' } },
  { left: 'Train hard, compete, and test your limits', right: 'Explore deeply — go places and meet people you have never experienced', leftScore: { arch: 'Warrior', el: 'Earth' }, rightScore: { arch: 'Explorer', el: 'Water' } },
  { left: 'Build something reliable, step by step, until it is done', right: 'Design the bigger picture first — imagine what it could become', leftScore: { arch: 'Builder', el: 'Earth' }, rightScore: { arch: 'Visionary', el: 'Air' } },
  { left: 'Step in because someone around you needs protecting', right: 'Step in because the challenge is there and needs to be confronted', leftScore: { arch: 'Protector', el: 'Water' }, rightScore: { arch: 'Warrior', el: 'Fire' } },
  { left: 'Explain an idea so clearly that others understand and believe in it', right: 'Show up for your people consistently, whether or not they ask', leftScore: { arch: 'Visionary', el: 'Air' }, rightScore: { arch: 'Protector', el: 'Earth' } },
  { left: 'Jump into the adventure before the plan is ready', right: 'Create the plan first — then build it right', leftScore: { arch: 'Explorer', el: 'Fire' }, rightScore: { arch: 'Builder', el: 'Air' } },
  { left: 'Sit with your thoughts until they become clear', right: 'Put your thoughts into the world in some form', leftScore: { arch: 'Monk', el: 'Water' }, rightScore: { arch: 'Creator', el: 'Air' } },
  { left: 'Defend what matters — stand between your people and what threatens them', right: 'Lead your people toward a future worth building', leftScore: { arch: 'Protector', el: 'Fire' }, rightScore: { arch: 'Visionary', el: 'Air' } },
  { left: 'Win the competition — prove what you are made of', right: 'Win the trust — make people feel genuinely understood', leftScore: { arch: 'Warrior', el: 'Fire' }, rightScore: { arch: 'Protector', el: 'Water' } },
  { left: 'Start with an original idea — even if it breaks the rules', right: 'Start with a proven plan — and execute it without cutting corners', leftScore: { arch: 'Creator', el: 'Air' }, rightScore: { arch: 'Builder', el: 'Earth' } },
  { left: 'Seek out new experiences — the unfamiliar is where you come alive', right: 'Go deeper with what is already in front of you — depth over breadth', leftScore: { arch: 'Explorer', el: 'Air' }, rightScore: { arch: 'Monk', el: 'Earth' } },
  { left: 'Help people feel heard — be the one they open up to', right: 'Be the one people can count on — reliable when it actually matters', leftScore: { arch: 'Protector', el: 'Water' }, rightScore: { arch: 'Builder', el: 'Earth' } },
  { left: 'Think several moves ahead — see what others miss', right: 'Act now — the man who moves first shapes what happens next', leftScore: { arch: 'Visionary', el: 'Air' }, rightScore: { arch: 'Warrior', el: 'Fire' } },
  { left: 'Make it work — practical, functional, and built to last', right: 'Make it mean something — express what needs to be expressed', leftScore: { arch: 'Builder', el: 'Earth' }, rightScore: { arch: 'Creator', el: 'Water' } },
  { left: 'Observe and understand yourself — your inner world is the real work', right: 'Go out and discover — experience teaches what reflection cannot', leftScore: { arch: 'Monk', el: 'Water' }, rightScore: { arch: 'Explorer', el: 'Fire' } },
  { left: 'Cover your people — loyalty, responsibility, and follow-through', right: 'Connect your people — bring them together through words and understanding', leftScore: { arch: 'Protector', el: 'Earth' }, rightScore: { arch: 'Visionary', el: 'Air' } },
  { left: 'Compete and conquer — challenge is where you are most alive', right: 'Envision and design — the real work is seeing what nobody else sees yet', leftScore: { arch: 'Warrior', el: 'Fire' }, rightScore: { arch: 'Visionary', el: 'Air' } },
  { left: 'Express it boldly and originally — put your voice out there', right: 'Build it quietly and precisely — craftsmanship over performance', leftScore: { arch: 'Creator', el: 'Fire' }, rightScore: { arch: 'Builder', el: 'Earth' } },
  { left: 'Energize the room — bring people in, make them feel something', right: 'Go out alone — discover what you find when it is just you and the world', leftScore: { arch: 'Creator', el: 'Fire' }, rightScore: { arch: 'Explorer', el: 'Air' } },
  { left: 'Master your own mind — discipline and stillness from the inside', right: 'Show up for others — discipline through loyalty and responsibility', leftScore: { arch: 'Monk', el: 'Water' }, rightScore: { arch: 'Protector', el: 'Earth' } },
  { left: 'Dream up something original — imagination is your greatest tool', right: 'See where things are heading — patterns and possibilities over inspiration', leftScore: { arch: 'Creator', el: 'Air' }, rightScore: { arch: 'Visionary', el: 'Water' } },
];

const SCENARIO_QUESTIONS = [
  {
    scenario: "Your group cannot agree on what to do. No one is stepping up.",
    question:  "What do you naturally do?",
    answers: [
      { text: "Take charge and make a call — someone has to.",                              scores: { Warrior: 2, Protector: 1, Fire: 2 } },
      { text: "Listen to everyone first, then find the words to bring them together.",      scores: { Protector: 2, Monk: 1, Water: 2 } },
      { text: "Step back, assess the situation, then propose the clearest path forward.",   scores: { Visionary: 2, Builder: 1, Air: 2 } },
      { text: "Try something creative that shifts the energy of the group entirely.",       scores: { Creator: 2, Explorer: 1, Air: 1, Water: 1 } },
    ]
  },
  {
    scenario: "Something you worked hard for did not come through.",
    question:  "What is your first instinct?",
    answers: [
      { text: "Push through. Failure is just the cost of going after something real.",    scores: { Warrior: 2, Builder: 1, Fire: 2 } },
      { text: "Pull back and rethink before making another move.",                        scores: { Visionary: 2, Monk: 1, Air: 1, Water: 1 } },
      { text: "Talk to someone — processing it out loud helps you move through it.",      scores: { Protector: 2, Monk: 1, Water: 2 } },
      { text: "Accept it, adapt, and find a new angle. Change of plan is part of it.",   scores: { Explorer: 2, Monk: 1, Earth: 1, Water: 1 } },
    ]
  },
  {
    scenario: "You have an entire weekend with no obligations.",
    question:  "What do you actually do?",
    answers: [
      { text: "Get into a project you have been putting off. Make real progress.",        scores: { Builder: 2, Warrior: 1, Earth: 2 } },
      { text: "Go somewhere new — explore, move, experience something you have not.",     scores: { Explorer: 2, Creator: 1, Fire: 1, Air: 1 } },
      { text: "Solitude — journaling, reading, prayer. Recharge from the inside out.",   scores: { Monk: 2, Visionary: 1, Water: 2 } },
      { text: "Real time with the people who matter. Deep conversations, real presence.", scores: { Protector: 2, Creator: 1, Fire: 1, Water: 1 } },
    ]
  },
  {
    scenario: "A younger guy comes to you asking for honest life advice.",
    question:  "How do you respond?",
    answers: [
      { text: "Share hard-earned lessons from your own life. Keep it direct and honest.", scores: { Warrior: 2, Protector: 1, Fire: 2 } },
      { text: "Ask him questions until he discovers his own answer.",                     scores: { Monk: 2, Visionary: 1, Water: 2 } },
      { text: "Give him a clear, practical plan he can actually follow.",                 scores: { Builder: 2, Visionary: 1, Earth: 2 } },
      { text: "Paint a larger picture of who he could become.",                           scores: { Visionary: 2, Creator: 1, Air: 2 } },
    ]
  },
  {
    scenario: "Your team needs to fill every role.",
    question:  "Which one do you naturally drift toward?",
    answers: [
      { text: "Setting the direction and making the final call.",                         scores: { Warrior: 2, Visionary: 1, Fire: 2 } },
      { text: "Making sure the work gets done — the systems and follow-through.",         scores: { Builder: 2, Protector: 1, Earth: 2 } },
      { text: "Generating original ideas — thinking in ways nobody else is.",             scores: { Creator: 2, Visionary: 1, Air: 2 } },
      { text: "Making sure every voice is heard and the group stays connected.",          scores: { Protector: 2, Monk: 1, Water: 2 } },
    ]
  },
  {
    scenario: "There is a specific kind of moment where you feel completely alive.",
    question:  "Which one is it?",
    answers: [
      { text: "Competing in something physically demanding and pushing your limits.",     scores: { Warrior: 2, Explorer: 1, Fire: 2 } },
      { text: "Finishing something you built from scratch.",                              scores: { Builder: 2, Creator: 1, Earth: 2 } },
      { text: "A real conversation where something genuinely shifts for both of you.",   scores: { Protector: 2, Monk: 1, Water: 2 } },
      { text: "Total solitude — somewhere in nature with just your thoughts.",           scores: { Monk: 2, Explorer: 1, Water: 1, Earth: 1 } },
    ]
  },
  {
    scenario: "Someone you deeply respect makes a decision you believe is wrong.",
    question:  "What do you do?",
    answers: [
      { text: "Say it directly — even if the room goes quiet.",                          scores: { Warrior: 2, Monk: 1, Fire: 2 } },
      { text: "Ask questions and try to understand their thinking first.",               scores: { Visionary: 2, Monk: 1, Air: 2 } },
      { text: "Support them publicly, then address it privately when the time is right.",scores: { Protector: 2, Builder: 1, Earth: 2 } },
      { text: "Watch what unfolds before stepping in. Trust what you observe.",          scores: { Monk: 2, Visionary: 1, Water: 1, Air: 1 } },
    ]
  },
  {
    scenario: "When it is all said and done, you are remembered for one thing.",
    question:  "What do you want it to be?",
    answers: [
      { text: "What you built — something lasting that outlives you.",                   scores: { Builder: 2, Warrior: 1, Earth: 2 } },
      { text: "How you made people feel — seen, valued, and not alone.",                 scores: { Protector: 2, Creator: 1, Water: 2 } },
      { text: "The things you created — work that changed how people see the world.",    scores: { Creator: 2, Visionary: 1, Air: 2 } },
      { text: "The life you actually lived — fully, boldly, nothing held back.",         scores: { Explorer: 2, Warrior: 1, Fire: 2 } },
    ]
  },
  {
    scenario: "The pressure is at its highest. Everyone around you is rattled.",
    question:  "What happens to you?",
    answers: [
      { text: "You get sharper. More decisive. Pressure reveals who you actually are.",  scores: { Warrior: 2, Visionary: 1, Fire: 2 } },
      { text: "You go quiet. You step back, observe, and find the clearest path.",       scores: { Monk: 2, Visionary: 1, Water: 1, Air: 1 } },
      { text: "You become the steady one. Calm and grounded while everything shakes.",   scores: { Protector: 2, Builder: 1, Earth: 2 } },
      { text: "Something unlocks in you. Pressure sparks your most creative thinking.",  scores: { Creator: 2, Explorer: 1, Air: 2 } },
    ]
  },
  {
    scenario: "A brother in your circle is struggling. He has not asked for help.",
    question:  "What do you do?",
    answers: [
      { text: "Show up uninvited. You do not wait for people to ask.",                   scores: { Protector: 2, Warrior: 1, Fire: 1, Earth: 1 } },
      { text: "Create the right moment — a conversation, a walk, a meal.",               scores: { Protector: 2, Monk: 1, Water: 2 } },
      { text: "Find the most practical way to lighten his load right now.",              scores: { Builder: 2, Protector: 1, Earth: 2 } },
      { text: "Hold space and stay present — sometimes presence is enough.",             scores: { Monk: 2, Protector: 1, Water: 2 } },
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
    question: "If you had a Saturday completely to yourself, where would you honestly want to spend it?",
    answers: [
      { icon: 'mountain',  label: 'Mountain Peak',     meaning: 'Pushing yourself, earning the view, doing something genuinely hard.', scores: { Explorer: 2, Warrior: 1, Fire: 1, Air: 1 } },
      { icon: 'forest',    label: 'Quiet Forest',      meaning: 'Slowing down, thinking, and finding peace in the stillness.',         scores: { Monk: 2, Protector: 1, Water: 2 } },
      { icon: 'workshop',  label: 'Workshop / Garage', meaning: 'Building, fixing, or creating something with your hands.',            scores: { Builder: 2, Creator: 1, Earth: 2 } },
      { icon: 'boxing',    label: 'Boxing Gym',        meaning: 'Training hard, getting stronger, and testing your limits.',           scores: { Warrior: 2, Explorer: 1, Fire: 2 } },
    ]
  },
  {
    question: "Which item would you want if life got really difficult?",
    answers: [
      { icon: 'sword',     label: 'Sword',             meaning: 'To remind yourself to face problems with courage.',                   scores: { Warrior: 2, Protector: 1, Fire: 2 } },
      { icon: 'compass',   label: 'Compass',           meaning: 'To help you find your direction when you feel lost.',                 scores: { Explorer: 2, Visionary: 1, Air: 2 } },
      { icon: 'brush',     label: 'Paintbrush',        meaning: 'To express yourself and make something meaningful from the pain.',    scores: { Creator: 2, Visionary: 1, Air: 2 } },
      { icon: 'hammer',    label: 'Hammer',            meaning: 'To remind yourself that anything worth having takes real work.',      scores: { Builder: 2, Protector: 1, Earth: 2 } },
    ]
  },
  {
    question: "Which animal do you admire the most?",
    answers: [
      { icon: 'wolf',      label: 'Wolf',              meaning: 'Loyal, protective, works with the pack, leads when needed.',         scores: { Protector: 2, Warrior: 1, Earth: 2 } },
      { icon: 'owl',       label: 'Owl',               meaning: 'Quiet, observant, and always thinking before acting.',               scores: { Visionary: 2, Monk: 1, Air: 2 } },
      { icon: 'eagle',     label: 'Eagle',             meaning: 'Sees the big picture and is not afraid to fly alone.',               scores: { Explorer: 2, Visionary: 1, Air: 2 } },
      { icon: 'bear',      label: 'Bear',              meaning: 'Strong, steady, dependable, and protective of what it loves.',       scores: { Builder: 2, Warrior: 1, Earth: 2 } },
    ]
  },
  {
    question: "Which place feels like it has something to teach you?",
    answers: [
      { icon: 'waves',     label: 'Huge Ocean Waves',  meaning: 'Learning to adapt when life refuses to go as planned.',              scores: { Explorer: 2, Creator: 1, Water: 2 } },
      { icon: 'campfire',  label: 'Campfire Circle',   meaning: 'Sharing stories, building trust, and finding real connection.',      scores: { Protector: 2, Creator: 1, Fire: 2 } },
      { icon: 'temple',    label: 'Ancient Temple',    meaning: 'Learning discipline, wisdom, and the patience to go deep.',          scores: { Monk: 2, Visionary: 1, Earth: 2 } },
      { icon: 'stars',     label: 'Sky Full of Stars', meaning: 'Thinking about your future and the scale of what is possible.',     scores: { Visionary: 2, Creator: 1, Air: 2 } },
    ]
  },
  {
    question: "Which path would you take?",
    answers: [
      { icon: 'trail',     label: 'Forest Trail',      meaning: 'Exploring the unknown without knowing exactly where it leads.',      scores: { Explorer: 2, Monk: 1, Earth: 2 } },
      { icon: 'mtnpath',   label: 'Mountain Path',     meaning: 'Taking the harder road because it makes you grow.',                  scores: { Warrior: 2, Explorer: 1, Fire: 2 } },
      { icon: 'desert',    label: 'Desert Road',       meaning: 'Alone, open, and figuring things out entirely on your own terms.',  scores: { Visionary: 2, Monk: 1, Air: 1, Earth: 1 } },
      { icon: 'coastal',   label: 'Coastal Trail',     meaning: 'Beauty, movement, and the kind of freedom that comes with flow.',   scores: { Creator: 2, Explorer: 1, Water: 2 } },
    ]
  },
  {
    question: "Which room would excite you to spend a full month in?",
    answers: [
      { icon: 'music',     label: 'Music Studio',      meaning: 'Making something from scratch, expressing what is inside you.',      scores: { Creator: 2, Visionary: 1, Air: 2 } },
      { icon: 'workshop',  label: 'Workshop',          meaning: 'Building something real and lasting with your own hands.',           scores: { Builder: 2, Creator: 1, Earth: 2 } },
      { icon: 'books',     label: 'Library',           meaning: 'Learning things that make you think differently about everything.',  scores: { Visionary: 2, Monk: 1, Air: 2 } },
      { icon: 'tent',      label: 'Outdoor Camp',      meaning: 'Survival skills, open sky, and figuring out how to stay alive.',    scores: { Explorer: 2, Warrior: 1, Fire: 2 } },
    ]
  },
  {
    question: "Which symbol feels like something you need more of right now?",
    answers: [
      { icon: 'mountain',  label: 'Mountain',          meaning: 'More discipline. More consistency. More follow-through.',            scores: { Builder: 2, Warrior: 1, Earth: 2 } },
      { icon: 'fire',      label: 'Fire',              meaning: 'More courage. More action. More willingness to go for it.',          scores: { Warrior: 2, Explorer: 1, Fire: 2 } },
      { icon: 'wave',      label: 'Wave',              meaning: 'More calm. More patience. More trust in the process.',               scores: { Monk: 2, Protector: 1, Water: 2 } },
      { icon: 'feather',   label: 'Feather',           meaning: 'More freedom. More creativity. More permission to imagine.',         scores: { Creator: 2, Visionary: 1, Air: 2 } },
    ]
  },
  {
    question: "Which challenge sounds the most rewarding to you?",
    answers: [
      { icon: 'mountain',  label: 'Climb a Mountain',  meaning: 'Push yourself physically and prove you can do something hard.',      scores: { Explorer: 2, Warrior: 1, Fire: 1, Earth: 1 } },
      { icon: 'cabin',     label: 'Build a Cabin',     meaning: 'Create something that lasts long after you are gone.',               scores: { Builder: 2, Protector: 1, Earth: 2 } },
      { icon: 'music',     label: 'Write a Song',      meaning: 'Turn your inner world into something others can actually feel.',     scores: { Creator: 2, Visionary: 1, Air: 2 } },
      { icon: 'lake',      label: 'Meditate by a Lake', meaning: 'Become genuinely comfortable with silence and your own thoughts.', scores: { Monk: 2, Visionary: 1, Water: 2 } },
    ]
  },
  {
    question: "Which weather feels the most like you lately?",
    answers: [
      { icon: 'storm',     label: 'Thunderstorm',      meaning: 'Full of energy, intensity, and ready to act.',                       scores: { Warrior: 2, Explorer: 1, Fire: 2 } },
      { icon: 'rain',      label: 'Gentle Rain',       meaning: 'Calm, thoughtful, quiet in a way people tend to underestimate.',     scores: { Monk: 2, Protector: 1, Water: 2 } },
      { icon: 'wind',      label: 'Windy Day',         meaning: 'Always generating new ideas, always moving toward something.',       scores: { Creator: 2, Explorer: 1, Air: 2 } },
      { icon: 'leaf',      label: 'Cool Autumn Morning', meaning: 'Focused, steady, and reliable when others are distracted.',        scores: { Builder: 2, Monk: 1, Earth: 2 } },
    ]
  },
  {
    question: "Sitting around a campfire — which one sounds most like you?",
    answers: [
      { icon: 'solo',      label: 'Thinking Quietly',       meaning: 'You reflect before speaking. Silence is comfortable to you.',   scores: { Monk: 2, Visionary: 1, Water: 2 } },
      { icon: 'pair',      label: 'Deep Conversation',      meaning: 'One real conversation is worth more than a hundred shallow ones.', scores: { Protector: 2, Monk: 1, Earth: 1, Water: 1 } },
      { icon: 'group',     label: 'Making Everyone Laugh',  meaning: 'You naturally draw people in and make them feel at ease.',       scores: { Creator: 2, Explorer: 1, Fire: 2 } },
      { icon: 'map',       label: "Planning the Next Adventure", meaning: "You are already thinking about what comes next.",          scores: { Visionary: 2, Explorer: 1, Air: 2 } },
    ]
  },
];

const VALUES_QUESTIONS = [
  {
    question: "Which quality do you respect most in another person?",
    answers: [
      { text: "Courage — someone who faces difficult things without backing down.", scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "Wisdom — someone who stays calm and thinks before acting.",          scores: { Monk: 2, Visionary: 1, Water: 1 } },
      { text: "Originality — someone who sees the world differently and makes new things.", scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "Reliability — someone who always does what they said they would.",   scores: { Builder: 2, Protector: 1, Earth: 1 } },
    ]
  },
  {
    question: "If people remembered you for one thing, what would you hope it is?",
    answers: [
      { text: "You gave people courage to face what scared them.", scores: { Warrior: 2, Protector: 1, Fire: 1 } },
      { text: "You made people feel seen and not alone.",           scores: { Protector: 2, Monk: 1, Water: 1 } },
      { text: "You inspired people to dream bigger.",               scores: { Visionary: 2, Creator: 1, Air: 1 } },
      { text: "You built something that lasted beyond you.",        scores: { Builder: 2, Protector: 1, Earth: 1 } },
    ]
  },
  {
    question: "When life gets hard, what matters most?",
    answers: [
      { text: "Keep moving forward — action is the answer.",                      scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "Stay calm — clarity comes from stillness.",                        scores: { Monk: 2, Protector: 1, Water: 1 } },
      { text: "Keep learning — understanding the situation is how you improve it.", scores: { Visionary: 2, Creator: 1, Air: 1 } },
      { text: "Stay disciplined — systems and habits carry you through.",          scores: { Builder: 2, Monk: 1, Earth: 1 } },
    ]
  },
  {
    question: "Which of these feels most true to you?",
    answers: [
      { text: "Courage grows when you face what scares you.",    scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "Real strength begins inside.",                    scores: { Monk: 2, Protector: 1, Water: 1 } },
      { text: "Creativity is how the world actually changes.",   scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "Small consistent actions build great lives.",     scores: { Builder: 2, Monk: 1, Earth: 1 } },
    ]
  },
  {
    question: "Looking ahead — what would make you proudest?",
    answers: [
      { text: "Becoming physically and mentally strong — someone who can handle anything.", scores: { Warrior: 2, Builder: 1, Fire: 1 } },
      { text: "Having deep, real relationships built on genuine trust.",                    scores: { Protector: 2, Monk: 1, Water: 1 } },
      { text: "Building something original and meaningful.",                                scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "Being the person in the room people truly feel safe around.",               scores: { Protector: 2, Monk: 1, Water: 1 } },
    ]
  },
  {
    question: "Which sounds hardest for you personally?",
    answers: [
      { text: "Facing your fears directly.",                               scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "Being still when everything in you wants to react.",        scores: { Monk: 2, Protector: 1, Water: 1 } },
      { text: "Finishing something after the excitement is gone.",         scores: { Builder: 2, Warrior: 1, Earth: 1 } },
      { text: "Sharing what you have made before you think it is ready.", scores: { Creator: 2, Visionary: 1, Air: 1 } },
    ]
  },
  {
    question: "Which person earns your deepest respect?",
    answers: [
      { text: "Someone who protects others without being asked or thanked.",      scores: { Protector: 2, Warrior: 1, Earth: 1 } },
      { text: "Someone who stays humble even when they are the most capable.",    scores: { Monk: 2, Builder: 1, Water: 1 } },
      { text: "Someone who sees what is possible before anyone else does.",       scores: { Visionary: 2, Creator: 1, Air: 1 } },
      { text: "Someone who always follows through, no matter what.",              scores: { Builder: 2, Protector: 1, Earth: 1 } },
    ]
  },
  {
    question: "If you could instantly master one ability, what would it be?",
    answers: [
      { text: "Staying calm and decisive under pressure.",           scores: { Warrior: 2, Monk: 1, Fire: 1 } },
      { text: "Truly understanding what another person needs.",      scores: { Protector: 2, Monk: 1, Water: 1 } },
      { text: "Seeing patterns and possibilities others miss.",      scores: { Visionary: 2, Creator: 1, Air: 1 } },
      { text: "Building anything you commit to.",                    scores: { Builder: 2, Creator: 1, Earth: 1 } },
    ]
  },
  {
    question: "What does the world need more of?",
    answers: [
      { text: "Brave people who act even when it costs them.",            scores: { Warrior: 2, Protector: 1, Fire: 1 } },
      { text: "People who genuinely see and care for others.",            scores: { Protector: 2, Monk: 1, Water: 1 } },
      { text: "Curious people who question what everyone else accepts.",  scores: { Explorer: 2, Visionary: 1, Air: 1 } },
      { text: "People who do what they say, every time.",                 scores: { Builder: 2, Monk: 1, Earth: 1 } },
    ]
  },
  {
    question: "Looking back on your life — which sentence would make you smile most?",
    answers: [
      { text: "\"I never stopped challenging myself.\"",                   scores: { Warrior: 2, Explorer: 1, Fire: 1 } },
      { text: "\"I helped people become better versions of themselves.\"", scores: { Protector: 2, Monk: 1, Water: 1 } },
      { text: "\"I created things that inspired others.\"",                scores: { Creator: 2, Visionary: 1, Air: 1 } },
      { text: "\"I built a life I was genuinely proud of.\"",              scores: { Builder: 2, Warrior: 1, Earth: 1 } },
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
  Warrior:   '/stoked-command-center/warrior-icon.png',
  Creator:   '/stoked-command-center/creator-icon.png',
  Explorer:  '/stoked-command-center/explorer-icon.png',
  Builder:   '/stoked-command-center/builder-icon.png',
  Protector: '/stoked-command-center/protector-icon.png',
  Visionary: '/stoked-command-center/visionary-icon.png',
  Monk:      '/stoked-command-center/monk-icon.png',
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
  comment:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  pin:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  megaphone: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 13"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>`,
  link:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  send:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  video:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  audio:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  repeat:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
  once:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  coach:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M16 3.5C17.5 4.5 18 6 17.5 7.5"/><path d="M18 2c2 1.5 2.5 4 1.5 6"/></svg>`,
  run:       `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5C6.5 5.12 7.62 4 9 4s2.5 1.12 2.5 2.5S10.38 9 9 9 6.5 7.88 6.5 6.5z"/><path d="M4 20c0 0 1.5-3 4-4l1 3"/><path d="M9 16l2-4 3 2 2.5-5"/><path d="M16.5 9C17.5 7.5 19 7 20 8"/></svg>`,
  bicep:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="6.5" y1="12" x2="17.5" y2="12"/><line x1="6.5" y1="8.5" x2="6.5" y2="15.5"/><line x1="17.5" y1="8.5" x2="17.5" y2="15.5"/><line x1="3.5" y1="10" x2="3.5" y2="14"/><line x1="20.5" y1="10" x2="20.5" y2="14"/></svg>`,
  brush:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 00-2.82 0L8 7l9 9 1.59-1.59a2 2 0 000-2.82L17 10l4.37-4.37a2.12 2.12 0 00-3-3z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5L4.5 15"/></svg>`,
  scale:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="9"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="6" y1="9" x2="6" y2="14"/><line x1="18" y1="9" x2="18" y2="14"/><path d="M3 14h6"/><path d="M15 14h6"/><polygon points="12,17 9.5,21 14.5,21"/><line x1="12" y1="9" x2="12" y2="17"/></svg>`,
  compass:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  users:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  handshake: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l2 2a1 1 0 003-3"/><path d="M14 14l2.5 2.5a1 1 0 003-3l-3.9-3.9a3 3 0 00-4.2 0l-.9.9a1 1 0 01-3-3l2.8-2.8a5.8 5.8 0 017.1-.9l.5.3a2 2 0 001.4.2L21 4"/><path d="M21 3l1 11h-1"/><path d="M3 3l-1 11 6.5 6.5a1 1 0 003-3"/><path d="M3 4h8"/></svg>`,
};

// ── MY PATH — ARCHETYPE MISSIONS ──────────────
// Ordered sequence of archetypes every brother walks through.
// The brother's primary archetype is placed first at render time.
// ── MY PATH — PER-ARCHETYPE CHALLENGES ────────
// 4 stages × 5 missions = 20 missions per archetype.
// Progress key format: `${arch}_s${stage}_${idx}` (stage 1-4, idx 0-4)
// ── ARCHETYPE VISUAL THEMES ───────────────────
// decorSvg: ambient art in the banner (positioned right, semi-transparent)
// trailAccent: small emoji shown next to stage headers
// trailBg: CSS background for the path trail area
const ARCHETYPE_THEMES = {
  Warrior: {
    trailAccent: '⚔',
    trailBg: 'repeating-linear-gradient(135deg,currentColor 0,currentColor 1px,transparent 0,transparent 50%) 0 0/28px 28px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 64 L22 22 L38 42 L60 8 L82 32 L100 14 L130 44 L130 64Z" fill="currentColor" opacity="0.09"/>
      <line x1="100" y1="4" x2="126" y2="58" stroke="currentColor" stroke-width="2" opacity="0.18" stroke-linecap="round"/>
      <line x1="126" y1="4" x2="100" y2="58" stroke="currentColor" stroke-width="2" opacity="0.18" stroke-linecap="round"/>
      <line x1="90" y1="31" x2="136" y2="31" stroke="currentColor" stroke-width="1.2" opacity="0.14" stroke-linecap="round"/>
    </svg>`,
  },
  Monk: {
    trailAccent: '○',
    trailBg: 'radial-gradient(circle,currentColor 1px,transparent 1px) 0 0/32px 32px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="32" r="28" stroke="currentColor" stroke-width="0.8" opacity="0.14"/>
      <circle cx="90" cy="32" r="20" stroke="currentColor" stroke-width="0.8" opacity="0.16"/>
      <circle cx="90" cy="32" r="13" stroke="currentColor" stroke-width="0.9" opacity="0.18"/>
      <circle cx="90" cy="32" r="6"  stroke="currentColor" stroke-width="1"   opacity="0.22"/>
      <circle cx="90" cy="32" r="2"  fill="currentColor" opacity="0.3"/>
      <path d="M10 55 Q30 20 50 55" stroke="currentColor" stroke-width="1" fill="none" opacity="0.12" stroke-linecap="round"/>
      <path d="M20 55 Q40 10 60 55" stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.1" stroke-linecap="round"/>
    </svg>`,
  },
  Creator: {
    trailAccent: '◈',
    trailBg: 'radial-gradient(circle,currentColor 1.5px,transparent 1.5px) 0 0/24px 24px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="10" r="2"   fill="currentColor" opacity="0.35"/>
      <circle cx="48" cy="22" r="1.5" fill="currentColor" opacity="0.3"/>
      <circle cx="32" cy="38" r="1.5" fill="currentColor" opacity="0.28"/>
      <circle cx="65" cy="12" r="2.5" fill="currentColor" opacity="0.32"/>
      <circle cx="82" cy="44" r="1.5" fill="currentColor" opacity="0.26"/>
      <line x1="18" y1="10" x2="48" y2="22" stroke="currentColor" stroke-width="0.6" opacity="0.2"/>
      <line x1="48" y1="22" x2="32" y2="38" stroke="currentColor" stroke-width="0.6" opacity="0.18"/>
      <line x1="48" y1="22" x2="65" y2="12" stroke="currentColor" stroke-width="0.6" opacity="0.18"/>
      <line x1="65" y1="12" x2="82" y2="44" stroke="currentColor" stroke-width="0.6" opacity="0.15"/>
      <path d="M90 54 Q105 28 120 48" stroke="currentColor" stroke-width="3" fill="none" opacity="0.1" stroke-linecap="round"/>
    </svg>`,
  },
  Explorer: {
    trailAccent: '✦',
    trailBg: 'repeating-linear-gradient(0deg,currentColor 0,currentColor 1px,transparent 0,transparent 40px),repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 0,transparent 40px) 0 0/40px 40px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="55" cy="44" rx="48" ry="18" stroke="currentColor" stroke-width="0.8" opacity="0.14"/>
      <ellipse cx="55" cy="44" rx="34" ry="12" stroke="currentColor" stroke-width="0.8" opacity="0.15"/>
      <ellipse cx="55" cy="44" rx="20" ry="7"  stroke="currentColor" stroke-width="0.9" opacity="0.17"/>
      <circle cx="104" cy="24" r="18" stroke="currentColor" stroke-width="0.8" opacity="0.14"/>
      <line x1="104" y1="6" x2="104" y2="42" stroke="currentColor" stroke-width="1"   opacity="0.2"/>
      <line x1="86"  y1="24" x2="122" y2="24" stroke="currentColor" stroke-width="1"   opacity="0.2"/>
      <polygon points="104,6 101,14 104,11 107,14" fill="currentColor" opacity="0.35"/>
    </svg>`,
  },
  Builder: {
    trailAccent: '■',
    trailBg: 'repeating-linear-gradient(0deg,currentColor 0,currentColor 1px,transparent 0,transparent 24px),repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 0,transparent 24px) 0 0/24px 24px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4"  y="4"  width="68" height="56" stroke="currentColor" stroke-width="1" opacity="0.14" rx="1"/>
      <line x1="4" y1="14" x2="72"  y2="14" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <line x1="4" y1="24" x2="72"  y2="24" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <line x1="4" y1="34" x2="72"  y2="34" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <line x1="4" y1="44" x2="72"  y2="44" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <line x1="24" y1="4" x2="24" y2="60" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <line x1="44" y1="4" x2="44" y2="60" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <path d="M88 48 L88 30 L100 18 L108 26 L96 38" stroke="currentColor" stroke-width="2" fill="none" opacity="0.22" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="110" cy="16" r="5" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/>
    </svg>`,
  },
  Protector: {
    trailAccent: '◉',
    trailBg: 'repeating-linear-gradient(180deg,currentColor 0,currentColor 1px,transparent 0,transparent 20px) 0 0/20px 20px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 60 L20 30 M12 38 L20 22 L28 38 M8 48 L20 28 L32 48" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.18" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M50 60 L50 35 M43 42 L50 28 L57 42" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.14" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M86 8 L110 8 L118 8 L118 36 L102 52 L86 36Z" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.2" stroke-linejoin="round"/>
      <path d="M92 28 L99 36 L116 16" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  Visionary: {
    trailAccent: '◐',
    trailBg: 'radial-gradient(circle,currentColor 1px,transparent 1px) 0 0/40px 40px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 64 L28 8 L48 38 L72 4 L92 30 L114 12 L130 36 L130 64Z" fill="currentColor" opacity="0.08"/>
      <circle cx="28"  cy="8"  r="2"   fill="currentColor" opacity="0.45"/>
      <circle cx="72"  cy="4"  r="2.5" fill="currentColor" opacity="0.5"/>
      <circle cx="114" cy="12" r="2"   fill="currentColor" opacity="0.4"/>
      <circle cx="15"  cy="20" r="1.2" fill="currentColor" opacity="0.3"/>
      <circle cx="55"  cy="15" r="1.2" fill="currentColor" opacity="0.28"/>
      <circle cx="96"  cy="22" r="1.2" fill="currentColor" opacity="0.3"/>
      <circle cx="125" cy="10" r="1.5" fill="currentColor" opacity="0.35"/>
    </svg>`,
  },
};

const ARCHETYPE_STAGE_NAMES = {
  1: ['Iron Will',   'Stillness', 'Spark',    'Wander',    'Foundation', 'Watch',  'Dream'],
  2: ['Steel Mind',  'Depth',     'Form',     'Discovery', 'Blueprint',  'Guard',  'See'],
  3: ['Brotherhood', 'Mastery',   'Flow',     'Wild',      'Build',      'Serve',  'Create'],
  4: ['The Warrior', 'The Sage',  'The Work', 'Pathfinder','Architect',  'Shield', 'Prophet'],
};
const ARCHETYPE_STAGE_NAME_MAP = {
  Warrior:      ['Iron Will','Steel Mind','Brotherhood','The Warrior'],
  Monk:         ['Stillness','Depth','Mastery','The Sage'],
  Creator:      ['Spark','Form','Flow','The Work'],
  Explorer:     ['Wander','Discovery','Wild','The Pathfinder'],
  Builder:      ['Foundation','Blueprint','Build','Architect'],
  Protector:    ['Watch','Guard','Serve','The Shield'],
  Visionary:    ['Dream','See','Create','The Prophet'],
};

const ARCHETYPE_CHALLENGES = {
  Warrior: {
    motto: 'Choose courage over comfort.',
    symbol: '⚔',
    stages: [
      [
        { title: 'Cold Shower',        task: 'Take a full cold shower. Take a selfie right after finishing.' },
        { title: '100 Push-Ups',       task: 'Complete 100 push-ups in one session. Photograph your workout spot when done.' },
        { title: 'Summit',             task: 'Find the highest point near you and climb it. Photograph the view from the top.' },
        { title: 'Sunrise',            task: 'Be somewhere outdoors before 7 AM to watch the sunrise. Photograph it.' },
        { title: 'Train With Someone', task: 'Work out with a parent or adult you respect. Take a selfie together after.' },
      ],
      [
        { title: 'Ice Bath',       task: 'Submerge in an ice bath or cold body of water for at least 3 minutes. Document the moment.' },
        { title: '5K Run',         task: 'Run a full 5K without stopping. Record your time and photograph your finish.' },
        { title: 'Fasted Workout', task: 'Train hard on an empty stomach. Log every exercise you did.' },
        { title: '5AM Week',       task: 'Wake at 5 AM every day for 5 consecutive days. Photograph the clock each morning.' },
        { title: 'Spar or Grapple',task: 'Do a sparring session, grapple, or enter any combat discipline. Face real contact.' },
      ],
      [
        { title: '30-Day Streak',     task: 'Train every single day for 30 days. One discipline, no exceptions. Log all 30.' },
        { title: 'Be the Strong One', task: 'Help a brother or family member through something physically demanding. Be their strength.' },
        { title: 'No Comfort Week',   task: '7 days: no alcohol, no junk food, cold showers only, up at 5 AM. Document Day 7.' },
        { title: 'Public Challenge',  task: 'Do something physically demanding in public you\'d normally be too self-conscious to try.' },
        { title: 'Coach Someone',     task: 'Train a beginner through a full session. Teach them what you now embody.' },
      ],
      [
        { title: 'Endurance Test',    task: 'Complete a half-marathon, 10K with heavy pack, or 24-hour fast + cold exposure. Document it.' },
        { title: 'Compete Officially',task: 'Enter and complete an official physical competition — fight, race, tournament, or event.' },
        { title: 'Warrior\'s Code',   task: 'Write your personal warrior code — 5 non-negotiable disciplines you will keep for life. Share with a brother.' },
        { title: 'Teach the Path',    task: 'Lead a group training session for 3+ people. You are now the standard.' },
        { title: 'Design Your Test',  task: 'Create your own ultimate physical challenge harder than anything you\'ve done. Complete and document it.' },
      ],
    ],
  },
  Monk: {
    motto: 'Master yourself before the world.',
    symbol: '○',
    stages: [
      [
        { title: 'Stillness',     task: 'Sit in silence and meditate for 10 minutes. Photograph the place where you did it.' },
        { title: 'Read 20 Pages', task: 'Read 20 pages of a real book. Photograph it open to today\'s page.' },
        { title: 'Phone Away',    task: 'Put your phone in another room for 1 full hour. Photograph where you left it.' },
        { title: 'Nature Sit',    task: 'Find a spot in nature and sit quietly for 15 minutes. Photograph the place.' },
        { title: 'Journal',       task: 'Fill one full page in a journal. Photograph the completed page.' },
      ],
      [
        { title: '30-Min Meditation', task: 'Sit in uninterrupted meditation for 30 minutes. Photograph your space before and after.' },
        { title: 'Read a Full Book',  task: 'Finish an entire book this week. Photograph the cover when you finish.' },
        { title: 'Digital Detox Day', task: 'Go 24 hours without social media, gaming, or streaming. Write what you noticed.' },
        { title: 'Gratitude Practice',task: 'Write 10 genuine gratitudes every day for 7 days. Photograph Day 7.' },
        { title: 'Hard Conversation', task: 'Have one honest, difficult conversation you\'ve been avoiding. Write what happened.' },
      ],
      [
        { title: 'Meditation Streak', task: 'Meditate every day for 21 consecutive days. Photograph your space on Day 21.' },
        { title: 'Teach Stillness',   task: 'Guide a friend or family member through their first meditation session.' },
        { title: 'Mind Fast',         task: 'Spend one full weekend with no entertainment — no music, no screens, no podcasts. Just presence.' },
        { title: 'Study the Masters', task: 'Study one philosopher or stoic deeply for a week. Write your 3 biggest takeaways.' },
        { title: 'Silence Day',       task: 'Spend one full day in near-complete silence. Speak only when absolutely necessary.' },
      ],
      [
        { title: 'Retreat',         task: 'Complete a 2-day solo retreat or silent retreat. Document your insights.' },
        { title: 'The Monk\'s Year', task: 'Design a 12-month inner discipline plan — what you will read, practice, and give up. Write it fully.' },
        { title: 'Teach the Path',  task: 'Lead 2+ people in a 30+ minute meditation or mindfulness practice.' },
        { title: 'Ego Inventory',   task: 'Write a complete honest inventory of your ego patterns, fears, and stories. Share one insight with a brother.' },
        { title: 'Sage\'s Letter',  task: 'Write a letter of wisdom to your 10-years-younger self and 10-years-older self. Photograph both.' },
      ],
    ],
  },
  Creator: {
    motto: 'Create instead of consume.',
    symbol: '◈',
    stages: [
      [
        { title: 'Draw Something New', task: 'Draw something you have never drawn before. Photograph it.' },
        { title: 'Build Something',    task: 'Build something using objects at home. Photograph your creation.' },
        { title: 'Create a Meal',      task: 'Make a simple meal or snack from scratch. Photograph it before eating.' },
        { title: 'Inspire Your Space', task: 'Rearrange your room to make it feel more inspiring. Photograph the result.' },
        { title: 'Make for Someone',   task: 'Create something for another person — a drawing, a meal, a note. Photograph it.' },
      ],
      [
        { title: 'Learn a New Skill', task: 'Spend 2+ hours learning one creative skill you\'ve never tried. Document your first attempt.' },
        { title: 'Create Every Day',  task: 'Create something every day for 7 days — any medium. Photograph all 7 creations.' },
        { title: 'Finish Something',  task: 'Complete a creative project you started but never finished. Photograph it done.' },
        { title: 'Collab',            task: 'Create something together with another person. Document the process.' },
        { title: 'Exhibit',           task: 'Share one of your creations publicly — post it, display it, or gift it. Document the response.' },
      ],
      [
        { title: '30-Day Create',   task: 'Create something every single day for 30 days. Any size, any medium. Photograph all 30.' },
        { title: 'The Hard Project',task: 'Start and complete a creative project that genuinely scares you in scope or difficulty.' },
        { title: 'Teach Your Craft',task: 'Teach someone else something you\'ve created or learned. Lead a 30+ minute session.' },
        { title: 'Create to Give',  task: 'Create something specifically to give away for free — to the community, a stranger, or a friend.' },
        { title: 'Remix',           task: 'Take something old or broken and transform it into something new and beautiful.' },
      ],
      [
        { title: 'Magnum Opus', task: 'Create your most ambitious work yet — something you\'ll be proud of in 10 years. Document the process.' },
        { title: 'Launch',      task: 'Launch a creative project publicly — a portfolio, a performance, a product, or an event.' },
        { title: 'Artist\'s Statement', task: 'Write your artist\'s statement: who you are, what you create, and why it matters.' },
        { title: 'Mentor a Creator',    task: 'Commit to mentoring one newer creator for at least a month. Document their growth.' },
        { title: 'Leave a Mark',        task: 'Create something permanent in the world — a mural, a published piece, a public installation. Document it.' },
      ],
    ],
  },
  Explorer: {
    motto: 'Go somewhere you\'ve never gone.',
    symbol: '✦',
    stages: [
      [
        { title: 'New Route',   task: 'Walk a route you\'ve never walked. Photograph your favourite discovery along the way.' },
        { title: 'New Place',   task: 'Visit a place in your town you\'ve never been to. Photograph it.' },
        { title: 'New Sunset',  task: 'Watch a sunset from a location you\'ve never been to before. Photograph it.' },
        { title: 'New Food',    task: 'Try a food you\'ve never eaten before. Photograph it.' },
        { title: 'Nature Find', task: 'Find something in nature you\'ve never noticed before. Photograph it.' },
      ],
      [
        { title: 'Daytrip',           task: 'Take a solo or group daytrip somewhere at least 1 hour away you\'ve never been. Document 3 discoveries.' },
        { title: 'Talk to a Stranger',task: 'Have a genuine 10-minute conversation with someone you\'ve never met. Write what you learned.' },
        { title: 'New Language',      task: 'Learn 20 phrases in a language you\'ve never spoken. Record yourself saying them.' },
        { title: 'Before Sunrise',    task: 'Be somewhere new and remarkable before the sun rises. Photograph the moment it appears.' },
        { title: 'Urban Explore',     task: 'Explore a part of your city you\'ve never set foot in. Photograph 5 things that surprise you.' },
      ],
      [
        { title: 'Overnight Alone',  task: 'Spend one night in nature alone — camping or sleeping under stars. Document the morning.' },
        { title: 'Brave the Unknown',task: 'Do something you\'ve never done that genuinely scares you. Write about the moment after.' },
        { title: 'Leave the Map',    task: 'Spend one full day with no plan, no GPS, no itinerary. Go wherever feels right. Document what happened.' },
        { title: 'Cross a Border',   task: 'Travel to a new country, city, or region you\'ve never visited. Photograph your arrival.' },
        { title: 'Extreme Nature',   task: 'Experience something raw in nature — a summit, a storm, a desert, a canyon. Document the scale of it.' },
      ],
      [
        { title: 'Epic Journey',    task: 'Plan and complete a multi-day trip somewhere you\'ve always wanted to go. Document every day.' },
        { title: 'Guide Someone',   task: 'Take someone who needs a new experience somewhere meaningful. Be their guide.' },
        { title: 'Explorer\'s Manifesto', task: 'Write your explorer\'s manifesto — the places you will go, the things you will do, the life you will live.' },
        { title: 'Your Wild Place', task: 'Discover a place in the world that feels like yours — one you\'ll return to. Photograph it and describe why.' },
        { title: 'Inspire Wandering', task: 'Share your exploration story in a way that inspires at least one other person to go somewhere new.' },
      ],
    ],
  },
  Builder: {
    motto: 'Leave things better than you found them.',
    symbol: '■',
    stages: [
      [
        { title: 'Clean Your Desk',    task: 'Clear and organize your desk completely. Photograph the finished result.' },
        { title: 'Fix Something',      task: 'Build or fix something in your home. Photograph it.' },
        { title: 'Organize Your Pack', task: 'Fully unpack, clean, and reorganize your bag or backpack. Photograph it.' },
        { title: 'Build With Someone', task: 'Assemble or build something together with a parent. Photograph the result.' },
        { title: 'Before and After',   task: 'Find something that needs improvement. Fix it. Photograph both before and after.' },
      ],
      [
        { title: 'System',            task: 'Design and implement a personal system — for your finances, schedule, or health. Document it.' },
        { title: 'Build Something Real', task: 'Build something physical from scratch that will actually be used. Photograph the process.' },
        { title: 'Repair',            task: 'Fix something broken that most people would throw away. Photograph before and after.' },
        { title: 'Deep Organization', task: 'Spend one full day organizing one major area of your life — workspace, finances, digital files.' },
        { title: 'Teach to Build',    task: 'Teach someone else a practical skill — woodwork, cooking, coding, fixing. Document the session.' },
      ],
      [
        { title: '30-Day Build',          task: 'Work on one project every day for 30 days. Photograph Day 1, Day 15, and Day 30.' },
        { title: 'Build for the Brotherhood', task: 'Create something useful for the group — a tool, a system, a resource. Present it.' },
        { title: 'The Rebuild',           task: 'Take something broken in your life — a habit, a relationship — and systematically rebuild it over 30 days.' },
        { title: 'Legacy Build',          task: 'Start a project that will outlast you — something people will use or benefit from after you\'re gone.' },
        { title: 'Audit and Upgrade',     task: 'Audit your life across 5 areas and execute a concrete upgrade in each one.' },
      ],
      [
        { title: 'Build an Enterprise',  task: 'Design and launch one real business or income-generating project. Document Month 1.' },
        { title: 'Health System',        task: 'Create a complete sustainable personal health system and follow it for 60 days. Document the blueprint.' },
        { title: 'Architect\'s Blueprint', task: 'Write the complete blueprint for your ideal life 10 years from now — finances, health, relationships, work, legacy.' },
        { title: 'Mentor a Builder',     task: 'Find someone who wants to build something and guide them through the full process.' },
        { title: 'Leave a Structure',    task: 'Create something lasting that others can use after you — a framework, a community, a physical space.' },
      ],
    ],
  },
  Protector: {
    motto: 'Use your strength to serve.',
    symbol: '◉',
    stages: [
      [
        { title: 'Carry the Load',    task: 'Help carry groceries or heavy bags without being asked. Photograph the bags.' },
        { title: 'Walk the Dog',      task: 'Walk the family dog or help a neighbour with theirs. Photograph it.' },
        { title: 'Pick Up 20 Pieces', task: 'Pick up 20 pieces of litter from your environment. Photograph your collection.' },
        { title: 'Help a Sibling',    task: 'Help a younger sibling or someone younger with something real. Photograph the moment.' },
        { title: 'Wash the Car',      task: 'Wash the family car with a parent. Photograph it clean.' },
      ],
      [
        { title: 'Community Service', task: 'Volunteer 3+ hours at an organisation that serves others. Document who you helped.' },
        { title: 'Defend Someone',    task: 'Stand up for someone who was being treated unfairly. Write what happened and how it felt.' },
        { title: 'Learn First Aid',   task: 'Learn basic first aid or CPR. Document your training.' },
        { title: 'Environment Day',   task: 'Spend a full day in service of your environment — clean, plant, restore. Photograph the impact.' },
        { title: 'Check In',          task: 'Reach out to 5 people you haven\'t spoken to in a while and genuinely check how they are.' },
      ],
      [
        { title: '30-Day Service',       task: 'Perform one act of service every day for 30 days. Log all 30. Photograph 10 of them.' },
        { title: 'Protect the Vulnerable', task: 'Identify someone vulnerable in your community and actively look out for them for a month.' },
        { title: 'Emergency Ready',      task: 'Prepare a genuine emergency kit for your household. Document everything in it.' },
        { title: 'Mentor a Younger Brother', task: 'Commit to mentoring someone younger for 30 days. Write their progress and yours.' },
        { title: 'Create Safety',        task: 'Identify a space or situation that feels unsafe and take a real step to make it better.' },
      ],
      [
        { title: 'Year of Service',   task: 'Commit to a structured community service role for at least 3 months. Document the impact.' },
        { title: 'Teach Protection',  task: 'Teach a group practical safety, self-defence, or emergency skills.' },
        { title: 'The Shield\'s Oath',task: 'Write your personal oath of protection — who you protect, what you stand for, what you will never allow. Share it.' },
        { title: 'Systemic Change',   task: 'Identify one systemic problem in your community. Take a real, documented step towards solving it.' },
        { title: 'Be the Protector',  task: 'In 90 days, be the person your family or community genuinely depends on. Document 5 real moments.' },
      ],
    ],
  },
  Visionary: {
    motto: 'Think beyond today.',
    symbol: '◐',
    stages: [
      [
        { title: 'Vision Board',          task: 'Create a vision board — paper or digital. Photograph it.' },
        { title: 'Letter to Future Self', task: 'Write a letter to yourself 5 years from now. Photograph the written letter.' },
        { title: 'Place That Inspires',   task: 'Find and photograph a place that genuinely inspires you.' },
        { title: 'Dream Space',           task: 'Draw your dream workspace or future home. Photograph the drawing.' },
        { title: 'Top 10 Dreams',         task: 'Write your top 10 dreams for your life. Photograph the page.' },
      ],
      [
        { title: 'Trend Spotter',   task: 'Research and write about 3 trends that will shape the world in 10 years. What opportunities do you see?' },
        { title: 'Ideal Day',       task: 'Write your ideal average day 5 years from now in complete detail — hour by hour.' },
        { title: 'Inspire Someone', task: 'Share your vision with one person in a way that genuinely excites them. Write their reaction.' },
        { title: 'Study a Visionary', task: 'Spend one week studying a great visionary. Write your 3 biggest insights.' },
        { title: 'The Big Question', task: 'Write the single most important question your life is trying to answer. Then write 5 paths to the answer.' },
      ],
      [
        { title: 'Present Your Vision', task: 'Present your personal vision to a group of 3+ people. Film or document the session.' },
        { title: 'Build the Prototype', task: 'Take one thing from your vision and build the very first version of it. Document the process.' },
        { title: 'The Long Game',       task: 'Write a 20-year vision for your life. Then reverse-engineer the first 90 days of steps.' },
        { title: 'Change One Mind',     task: 'Change how at least one person sees the world through a conversation, project, or creation.' },
        { title: 'The Dream Team',      task: 'Identify the 5 people you need to realize your vision. Take a real step to connect with each.' },
      ],
      [
        { title: 'The Manifesto',     task: 'Write your personal manifesto — your beliefs, your vision, your non-negotiables. Make it public.' },
        { title: 'Build What\'s New', task: 'Create something — a community, a business, a movement — that didn\'t exist before you built it.' },
        { title: 'Speak the Vision',  task: 'Give a public talk on your vision to the largest audience you\'ve ever addressed.' },
        { title: 'Recruit Believers', task: 'Find 3+ people who share your vision and commit to building it together. Document the first meeting.' },
        { title: 'Visionary\'s Legacy', task: 'Write what you want the world to be different because you were here. Share it with the Brotherhood.' },
      ],
    ],
  },
};

const ARCHETYPE_ORDER = ['Warrior','Monk','Creator','Explorer','Builder','Protector','Visionary'];


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
let feedPosts        = [];
let feedDisplayCount = 10;  // how many posts to render at once
let currentUser = null;
let isAdmin     = false;
let isMentor    = false;
let editingId   = null;
let deletingId  = null;
let currentTab  = 'brothers';
let unsubBrothers          = null;
let unsubChallenges        = null;
let unsubSubmissions       = null;
let unsubFeed              = null;
let unsubFriendChallenges  = null;
let activeFriendChallenges = []; // challenges directed at current user
let streakUpdatedThisSession = false;
let reviewingSubId = null;
let challengeFilter = 'All';
let liveCall = null;
let unsubLiveCall = null;
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
document.getElementById('badgesBtn').addEventListener('click', openBadgesOverlay);
document.getElementById('badgesBack').addEventListener('click', closeBadgesOverlay);
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

// Wrap a promise with a timeout so slow Firestore calls never block the splash screen
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms))]);
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
        const snap = await withTimeout(getDocs(collection(db, 'brothers')), 5000);
        if (snap) {
          const profile = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .find(b => b.email && b.email.toLowerCase() === user.email.toLowerCase());
          if (profile?.role === 'mentor') isMentor = true;
        }
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
  document.getElementById('authSplash')?.classList.add('hidden');
  stopPresence();
  if (unsubBrothers)         { unsubBrothers();         unsubBrothers         = null; }
  if (unsubChallenges)       { unsubChallenges();       unsubChallenges       = null; }
  if (unsubSubmissions)      { unsubSubmissions();      unsubSubmissions      = null; }
  if (unsubFriendChallenges) { unsubFriendChallenges(); unsubFriendChallenges = null; }
  liveCall = null;
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

  // Check Firestore — existing accounts may have lost their localStorage flag
  // (new device, cleared storage, etc.). Never re-onboard someone who already
  // has a profile.
  try {
    const snap = await withTimeout(getDocs(collection(db, 'brothers')), 5000);
    if (snap) {
      const existing = snap.docs.find(d => {
        const e = d.data().email;
        return e && e.toLowerCase() === currentUser.email.toLowerCase();
      });
      if (existing) {
        localStorage.setItem(key, '1');
        return false;
      }
    }
  } catch (_) {}

  const onboardEl = document.getElementById('onboardingScreen');
  loginScreen.classList.add('hidden');
  onboardEl.classList.remove('hidden');

  // ── Screen 1: Welcome ──
  showOnboardWelcome(onboardEl, () => {
    // ── Screen 2: Profile setup ──
    showOnboardProfile(onboardEl, async (profileData) => {
      // Create brother document
      let newBrotherId = null;
      newBrotherId = 'br_' + Date.now().toString(36);

      const brotherDoc = {
        ...profileData,
        id:                   newBrotherId,
        email:                currentUser.email.toLowerCase(),
        xp:                   0,
        role:                 'member',
        onboardingAccepted:   true,
        onboardingAcceptedAt: new Date().toISOString(),
        createdAt:            new Date().toISOString(),
        updatedAt:            new Date().toISOString(),
      };

      // Save to localStorage immediately so the card shows even if Firestore is slow
      localStorage.setItem('pendingProfile_' + currentUser.uid, JSON.stringify(brotherDoc));

      // Fire-and-forget with background retry — don't block the UI
      (async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await setDoc(doc(db, 'brothers', newBrotherId), brotherDoc, { merge: true });
            localStorage.removeItem('pendingProfile_' + currentUser.uid);
            return;
          } catch (err) {
            console.warn('profile save attempt', attempt + 1, 'failed:', err);
            await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          }
        }
        console.error('profile save failed after 5 attempts');
      })();

      // Mark onboarding complete in localStorage immediately so we never re-show it
      localStorage.setItem(key, '1');

      // ── Screen 3: Assessment bridge ──
      showOnboardAssessmentBridge(onboardEl, () => {
        onboardEl.classList.add('hidden');
        showApp();
        // Immediately open the assessment for the new brother
        setTimeout(() => openAssessment(newBrotherId), 400);
      });
    });
  });

  return true;
}

function showOnboardAssessmentBridge(container, onBegin) {
  container.innerHTML = `
    <div class="onboard-welcome">
      <div class="onboard-wordmark">STOKED BROTHERHOOD</div>
      <div class="onboard-body">
        <h1 class="onboard-title">Before You<br/>Enter</h1>
        <div class="onboard-divider"></div>
        <p class="onboard-line">Every man who has come before you has done this first.</p>
        <p class="onboard-line">Before we can walk beside you, we need to understand you.</p>
        <p class="onboard-line">Your strengths. Your blind spots. The way you think, respond, and see the world.</p>
        <p class="onboard-line">This assessment will surface what is already true about you — things you may have sensed but never had words for.</p>
        <p class="onboard-line onboard-line-em">It will take about 15 minutes. Answer honestly. There are no right answers.</p>
        <p class="onboard-line" style="margin-top:20px;font-size:13px;opacity:0.45">Your result will reveal your Brotherhood Archetype — the core of who you are and the frontier of where you are going.</p>
      </div>
      <div class="onboard-footer">
        <button class="btn onboard-accept-btn" id="onboardBeginAssessBtn">Begin the Assessment</button>
      </div>
    </div>`;
  container.querySelector('#onboardBeginAssessBtn').onclick = onBegin;
}

function showOnboardWelcome(container, onAccept) {
  container.innerHTML = `
    <div class="onboard-welcome">
      <div class="onboard-wordmark">STOKED BROTHERHOOD</div>
      <div class="onboard-body">
        <h1 class="onboard-title">Welcome to<br/>Stoked Brotherhood</h1>
        <div class="onboard-divider"></div>
        <p class="onboard-line">You have been invited into a space built for growth.</p>
        <p class="onboard-line">This is a place to become stronger, more disciplined, more capable, and more honest with yourself.</p>
        <p class="onboard-line">You will be challenged.</p>
        <p class="onboard-line">You will be expected to keep your word.</p>
        <p class="onboard-line">You will learn what you are capable of.</p>
        <p class="onboard-line">You will not be asked to become someone else.</p>
        <p class="onboard-line onboard-line-em">You will be challenged to become more fully who you are.</p>
      </div>
      <div class="onboard-footer">
        <button class="btn onboard-accept-btn" id="onboardAcceptBtn">I Accept</button>
      </div>
    </div>`;
  container.querySelector('#onboardAcceptBtn').onclick = onAccept;
}

function showOnboardProfile(container, onComplete) {
  container.innerHTML = `
    <div class="onboard-welcome">
      <div class="onboard-wordmark">STOKED BROTHERHOOD</div>
      <div class="onboard-body onboard-body-form">
        <h1 class="onboard-title">Set Up<br/>Your Profile</h1>
        <div class="onboard-divider"></div>
        <p class="onboard-line" style="margin-bottom:28px">This is how your brothers will know you.</p>
        <div class="onboard-form">
          <div class="onboard-field">
            <label class="onboard-label">Full Name</label>
            <input class="onboard-input" id="onboardName" type="text" placeholder="Your name" autocomplete="name" />
          </div>
          <div class="onboard-field">
            <label class="onboard-label">Age</label>
            <input class="onboard-input" id="onboardAge" type="number" placeholder="Your age" min="13" max="99" />
          </div>
          <div class="onboard-field">
            <label class="onboard-label">City</label>
            <input class="onboard-input" id="onboardCity" type="text" placeholder="Where you're based" />
          </div>
          <div class="onboard-err hidden" id="onboardErr">Please enter your name to continue.</div>
        </div>
      </div>
      <div class="onboard-footer">
        <button class="btn onboard-accept-btn" id="onboardProfileBtn">Continue</button>
      </div>
    </div>`;

  container.querySelector('#onboardProfileBtn').onclick = async () => {
    const name = container.querySelector('#onboardName').value.trim();
    const age  = parseInt(container.querySelector('#onboardAge').value) || null;
    const city = container.querySelector('#onboardCity').value.trim();
    if (!name) {
      container.querySelector('#onboardErr').classList.remove('hidden');
      container.querySelector('#onboardName').focus();
      return;
    }
    const btn = container.querySelector('#onboardProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    await onComplete({ name, age, city: city || null });
  };
  setTimeout(() => container.querySelector('#onboardName')?.focus(), 300);
}

function showApp() {
  document.getElementById('authSplash')?.classList.add('hidden');
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
  const rosterTabBtn  = document.getElementById('rosterTabBtn');
  if (rosterTabBtn) rosterTabBtn.classList.toggle('hidden', isAdmin);
  if (!isAdmin) switchTab('brothers');

  // Set up notifications (ask permission)
  setupNotifications();

  // ── PRESENCE ──────────────────────────────────
  startPresence();

  // Track member's own XP to detect approval notifications
  let prevMyXP = null;
  let firstBrothersSnap = true;
  let memberDefaultTabSet = false;

  // Subscribe to brothers collection
  unsubBrothers = onSnapshot(collection(db, 'brothers'), snap => {
    const firstLoad = brothers.length === 0;
    brothers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Clear localStorage fallback once Firestore confirms the profile is there
    if (currentUser) {
      const confirmed = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
      if (confirmed) localStorage.removeItem('pendingProfile_' + currentUser.uid);
    }
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
    // Switch to My Path on first load for members (data is now available)
    if (!isAdmin && !memberDefaultTabSet) {
      memberDefaultTabSet = true;
    }
    // Re-register FCM token now that brothers are loaded (gets correct brotherId)
    if (Notification.permission === 'granted') registerFCMToken();

    // Wire friend-challenge listener once we know this member's profile ID
    if (!isAdmin && currentUser && !unsubFriendChallenges) {
      const myProfile = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
      if (myProfile) {
        const myEmail = currentUser.email.toLowerCase();
        unsubFriendChallenges = onSnapshot(
          query(collection(db, 'friendChallenges'), orderBy('createdAt', 'desc')),
          snap => {
            const prev = activeFriendChallenges.map(c => c.id);
            const myName = myProfile.name?.toLowerCase() || '';
            activeFriendChallenges = snap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(c => c.status === 'pending' && (
                c.toUid === myProfile.id ||
                c.toEmail?.toLowerCase() === myEmail ||
                c.toName?.toLowerCase() === myName
              ));
            const newOnes = activeFriendChallenges.filter(c => !prev.includes(c.id));
            newOnes.forEach(c => {
              showNotif(`⚡ ${c.fromName} challenged you!`, `${c.description} · +${c.xp} XP`);
            });
            renderMemberView();
          }
        );
      }
    }
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

    // Catch-up badge check — runs once after submissions load so we have both brothers + subs
    if (!firstSubsSnap && !isAdmin && currentUser) {
      // already ran
    } else if (firstSubsSnap && !isAdmin && currentUser) {
      const me = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
      if (me) {
        checkAndAwardBadges(me).then(newBadges => {
          if (newBadges.length) setTimeout(() => showBadgeUnlockCelebration(newBadges), 1800);
        });
      }
    }

    firstSubsSnap = false;

    if (currentTab === 'community') renderFeed();
    updateChallengesBadge();
  });

  // Subscribe to social feed
  lastFeedSeen = parseInt(localStorage.getItem(`feedSeen_${currentUser.uid}`) || '0', 10);
  let firstFeedSnap = true;
  feedDisplayCount = 10;
  unsubFeed = onSnapshot(collection(db, 'feed'), snap => {
    const prevIds = feedPosts.map(p => p.id);
    // _liveCall_ is a reserved sentinel doc used to store live call state — not a real post
    const liveCallDoc = snap.docs.find(d => d.id === '_liveCall_');
    if (liveCallDoc) {
      const data = liveCallDoc.data();
      const wasActive = liveCall?.active;
      liveCall = data;
      if (data?.active && !wasActive) {
        // Only notify if this user is invited
        const myProfile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser?.email?.toLowerCase());
        const isInvited = data.invitedAll || (myProfile && (data.invitedBrothers || []).includes(myProfile.id));
        if (isInvited) {
          showNotif('📹 Brotherhood Call Started', `${data.startedByName || 'Coach'} started a group call — join now!`);
        }
      }
      renderLiveCallBanner();
    }
    feedPosts = snap.docs
      .filter(d => d.id !== '_liveCall_')
      .map(d => ({ id: d.id, ...d.data() }))
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

  // Live call state is stored in feed/_liveCall_ (piggybacking on feed's write rules)
  // The feed onSnapshot listener handles liveCall updates — no separate listener needed

  // Tab bar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  window.scrollTo({ top: 0, behavior: 'instant' });
  currentTab = tab;
  const isSocialFeed = tab === 'socialfeed';
  const isChallenges = tab === 'community';
  const isRoster     = tab === 'roster';
  const isGames      = tab === 'games';
  const isMain       = !isSocialFeed && !isChallenges && !isRoster && !isGames;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab));

  document.querySelector('.main').classList.toggle('hidden', !isMain || !isAdmin);
  statsBar.classList.toggle('hidden', !isMain || !isAdmin);
  memberHero.classList.toggle('hidden', !isMain || isAdmin);
  document.getElementById('socialFeedSection').classList.toggle('hidden', !isSocialFeed);
  document.getElementById('communitySection').classList.toggle('hidden', !isChallenges);
  document.getElementById('rosterSection').classList.toggle('hidden', !isRoster);
  document.getElementById('gamesSection').classList.toggle('hidden', !isGames);

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
  if (isGames) renderGamesHub();
  if (isMain && !isAdmin) renderMemberView();
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

// ── BADGES SCREEN ─────────────────────────────
function openBadgesOverlay() {
  const overlay = document.getElementById('badgesOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  renderBadgesScreen();
}

function closeBadgesOverlay() {
  const overlay = document.getElementById('badgesOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function renderBadgeCard(badge, earned, earnedData, progress, catColor, isMystery) {
  if (isMystery) {
    return `
    <div class="badge-card badge-mystery" data-badge-id="${badge.id}">
      <div class="badge-card-summary badge-mystery-summary">
        <div class="badge-icon-wrap badge-icon-mystery">
          ${badgeIconHtml(badge.id, 120, true)}
        </div>
        <div class="badge-summary-info">
          <div class="badge-name">${escHtml(badge.name)}</div>
          <span class="badge-row-status">Complete previous to unlock</span>
        </div>
      </div>
    </div>`;
  }

  let statusClass = 'badge-locked';
  let statusLabel = 'Locked';
  if (earned) { statusClass = 'badge-earned'; statusLabel = 'Earned'; }
  else if (progress && progress.current > 0) { statusClass = 'badge-in-progress'; statusLabel = 'In Progress'; }
  else if (badge.verification === 'mentor_approval') { statusLabel = 'Mentor Approval Required'; }
  else if (badge.verification === 'manual_award') { statusLabel = 'Mentor Award'; }

  const summaryRight = earned
    ? `<span class="badge-row-earned-chip">✓ Earned</span>`
    : progress
      ? `<span class="badge-row-progress">${progress.current} / ${progress.total}</span>`
      : `<span class="badge-row-status">${badge.verification === 'automatic' ? 'Locked' : 'Mentor'}</span>`;

  let detailProgressHtml = '';
  if (!earned) {
    if (progress) {
      const pct = Math.min(100, Math.round((progress.current / progress.total) * 100));
      detailProgressHtml = `
        <div class="badge-detail-progress">
          <div class="badge-progress-row">
            <span class="badge-progress-nums">${progress.current} / ${progress.total} ${escHtml(progress.label)}</span>
            <span class="badge-progress-pct">${pct}%</span>
          </div>
          <div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${pct}%;background:${catColor}"></div></div>
        </div>`;
    } else {
      const verif = badge.verification === 'mentor_approval' ? 'Requires mentor approval after proof submission.' : 'Awarded directly by a mentor.';
      detailProgressHtml = `<div class="badge-detail-verif">${verif}</div>`;
    }
  }

  return `
  <div class="badge-card ${statusClass}" data-badge-id="${badge.id}"${earned ? ` style="border-color:${catColor}40;background:${catColor}0a"` : ''}>
    <div class="badge-card-summary">
      <div class="badge-icon-wrap" style="--badge-color:${catColor}">
        ${badgeIconHtml(badge.id, 120, false)}
      </div>
      <div class="badge-summary-info">
        <div class="badge-name">${escHtml(badge.name)}</div>
        ${summaryRight}
      </div>
      <span class="badge-chevron">▾</span>
    </div>
    <div class="badge-card-detail hidden">
      <div class="badge-detail-desc">${escHtml(badge.description)}</div>
      ${detailProgressHtml}
      ${earned ? `
        <div class="badge-detail-rows">
          <div class="badge-detail-row">
            <span class="badge-detail-lbl">Earned</span>
            <span class="badge-detail-val">${new Date(earnedData.earnedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
          </div>
          <div class="badge-detail-row">
            <span class="badge-detail-lbl">XP Awarded</span>
            <span class="badge-detail-val" style="color:#C4693A">+${earnedData.xpAwarded} XP</span>
          </div>
        </div>
      ` : `
        <div class="badge-detail-rows">
          <div class="badge-detail-row">
            <span class="badge-detail-lbl">Reward</span>
            <span class="badge-detail-val" style="color:#C4693A">+${badge.xpReward} XP</span>
          </div>
          <div class="badge-detail-row">
            <span class="badge-detail-lbl">Status</span>
            <span class="badge-detail-val">${statusLabel}</span>
          </div>
        </div>
      `}
    </div>
  </div>`;
}

function renderBadgesScreen() {
  const container = document.getElementById('badgesContainer');
  if (!container) return;
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser?.email?.toLowerCase());
  const mySubs = profile ? submissions.filter(s => s.brotherId === profile.id && s.status === 'completed') : [];
  const earnedArr = profile ? (profile.badges || []) : [];
  const earnedIds = new Set(earnedArr.map(b => b.id));
  const activeFilter = container.dataset.filter || 'all';

  const filterKeys = ['all', 'general', 'move', 'create', 'reset', 'adventure', 'family', 'brotherhood'];
  const filterLabels = { all: 'All', general: 'General', move: 'Move', create: 'Create', reset: 'Reset', adventure: 'Adventure', family: 'Family', brotherhood: 'Brotherhood' };
  const earnedCount = BADGES.filter(b => earnedIds.has(b.id)).length;

  function badgeHtml(badge) {
    const earned = earnedIds.has(badge.id);
    const earnedData = earnedArr.find(b => b.id === badge.id);
    const progress = !earned ? getBadgeProgress(badge, profile || {}, mySubs) : null;
    const catData = BADGE_CATEGORIES[badge.category];
    const catColor = catData ? catData.color : '#888';
    return renderBadgeCard(badge, earned, earnedData, progress, catColor, false);
  }

  function chainSectionHtml(chainId) {
    const chain = BADGE_CHAINS[chainId];
    const chainBadges = chain.ids.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
    // Find first unearned index — everything after that is mystery
    let firstUnearnedIdx = chainBadges.findIndex(b => !earnedIds.has(b.id));
    if (firstUnearnedIdx === -1) firstUnearnedIdx = chainBadges.length; // all earned

    return `
    <div class="badge-chain-section">
      <div class="badge-chain-label">${chain.label}</div>
      ${chainBadges.map((badge, i) => {
        const earned = earnedIds.has(badge.id);
        const earnedData = earnedArr.find(b => b.id === badge.id);
        const isMystery = !earned && i > firstUnearnedIdx;
        const progress = (!earned && !isMystery) ? getBadgeProgress(badge, profile || {}, mySubs) : null;
        const catData = BADGE_CATEGORIES[badge.category];
        const catColor = catData ? catData.color : '#888';
        return renderBadgeCard(badge, earned, earnedData, progress, catColor, isMystery);
      }).join('')}
    </div>`;
  }

  // Badges that are NOT part of any chain
  const chainedIds = new Set(Object.values(BADGE_CHAINS).flatMap(c => c.ids));

  let bodyHtml = '';
  if (activeFilter === 'all' || activeFilter === 'general') {
    bodyHtml += chainSectionHtml('challenge_path');
    bodyHtml += chainSectionHtml('streak_path');
    // Non-chain general badges
    const generalOthers = BADGES.filter(b => b.category === 'general' && !chainedIds.has(b.id));
    if (generalOthers.length) bodyHtml += `<div class="badge-list">${generalOthers.map(b => badgeHtml(b)).join('')}</div>`;
    // For 'all', also render other categories
    if (activeFilter === 'all') {
      const others = BADGES.filter(b => b.category !== 'general' && !chainedIds.has(b.id));
      if (others.length) bodyHtml += `<div class="badge-list">${others.map(b => badgeHtml(b)).join('')}</div>`;
    }
  } else {
    const filtered = BADGES.filter(b => b.category === activeFilter && !chainedIds.has(b.id));
    bodyHtml = `<div class="badge-list">${filtered.map(b => badgeHtml(b)).join('')}</div>`;
  }

  container.innerHTML = `
    <div class="badge-screen">
      <div class="badge-screen-header">
        <h1 class="badge-screen-title">BADGES</h1>
        <p class="badge-screen-sub">Earned through action. Built over time.</p>
        ${earnedCount > 0 ? `<div class="badge-earned-summary">${earnedCount} / ${BADGES.length} Earned</div>` : ''}
      </div>
      <div class="badge-filter-row">
        ${filterKeys.map(k => `<button class="badge-filter-btn${activeFilter === k ? ' active' : ''}" data-filter="${k}">${filterLabels[k]}</button>`).join('')}
      </div>
      ${bodyHtml}
    </div>
  `;

  container.querySelectorAll('.badge-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { container.dataset.filter = btn.dataset.filter; renderBadgesScreen(); });
  });
  container.querySelectorAll('.badge-card:not(.badge-mystery)').forEach(card => {
    card.querySelector('.badge-card-summary').addEventListener('click', () => {
      const detail = card.querySelector('.badge-card-detail');
      const chev   = card.querySelector('.badge-chevron');
      detail.classList.toggle('hidden');
      chev.textContent = detail.classList.contains('hidden') ? '▾' : '▴';
    });
  });
}

function showBadgeUnlockCelebration(badges) {
  const badge = badges[0];
  const catData = BADGE_CATEGORIES[badge.category];
  const color = catData ? catData.color : '#D4A853';

  const overlay = document.createElement('div');
  overlay.className = 'badge-celebration-overlay';
  overlay.innerHTML = `
    <div class="badge-celebration-card">
      <div class="badge-cel-glow" style="--cel-color:${color}"></div>
      <div class="badge-cel-icon" style="${BADGE_ICONS[badge.id] ? '' : `color:${color}`}">${badgeIconHtml(badge.id, 180, false)}</div>
      <div class="badge-cel-eyebrow">Congratulations</div>
      <div class="badge-cel-name">${escHtml(badge.name)}</div>
      <div class="badge-cel-desc">${escHtml(badge.description)}</div>
      <div class="badge-cel-xp" style="color:${color}">+${badge.xpReward} XP</div>
      <button class="badge-cel-btn" style="background:${color}">Awesome</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('badge-cel-visible'));

  const dismiss = () => {
    overlay.classList.remove('badge-cel-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    // If more badges queued, show next after a short gap
    if (badges.length > 1) setTimeout(() => showBadgeUnlockCelebration(badges.slice(1)), 400);
  };
  overlay.querySelector('.badge-cel-btn').addEventListener('click', dismiss);
  overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
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
    console.warn('FCM token error:', e);
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
const MAX_XP = MAX_LEVEL * XP_PER_LEVEL;

function getLevelInfo(xp) {
  const clamped = Math.min(Math.max(0, xp), MAX_XP);
  const idx     = Math.min(Math.floor(clamped / XP_PER_LEVEL), MAX_LEVEL - 1);
  const current = LEVELS[idx];
  const next    = idx < MAX_LEVEL - 1 ? LEVELS[idx + 1] : null;
  const startXP = current.xpRequired;
  const endXP   = next ? next.xpRequired : MAX_XP;
  const progress = next ? Math.round(((clamped - startXP) / XP_PER_LEVEL) * 100) : 100;
  return { current, next, progress: Math.min(100, Math.max(0, progress)), xpNeededForNext: next ? endXP - clamped : 0 };
}

// ── BADGE HELPERS ─────────────────────────────

// Count how many of the last `weeks` weeks had at least one challenge completion
function countConsecutiveWeeks(subs, weeks) {
  let count = 0;
  const now = new Date();
  for (let w = 0; w < weeks; w++) {
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
    if (subs.some(s => { const d = new Date(s.submittedAt); return d >= start && d < end; })) count++;
    else break;
  }
  return count;
}

// Returns { current, total, label } for numeric badges; null for non-numeric
function getBadgeProgress(badge, profile, mySubs) {
  const req = badge.requirement;
  if (req.type === 'total_challenges') {
    return { current: mySubs.length, total: req.count, label: 'Challenges' };
  }
  if (req.type === 'category_challenges') {
    const count = mySubs.filter(s => { const ch = challenges.find(c => c.id === s.challengeId); return ch && normalizeTag(ch.tag) === req.tag; }).length;
    return { current: count, total: req.count, label: `${req.tag} Challenges` };
  }
  if (req.type === 'specific_challenge_title') {
    const count = mySubs.filter(s => { const ch = challenges.find(c => c.id === s.challengeId); return ch && ch.title.toLowerCase().includes(req.titleMatch.toLowerCase()); }).length;
    return { current: count, total: req.count, label: req.titleMatch + (req.count > 1 ? 's' : '') };
  }
  if (req.type === 'login_streak') {
    return { current: Math.min(profile.longestStreak || 0, req.days), total: req.days, label: 'Day Streak' };
  }
  if (req.type === 'weekly_streak') {
    return { current: countConsecutiveWeeks(mySubs, req.weeks), total: req.weeks, label: 'Consecutive Weeks' };
  }
  return null;
}

// Check all automatic badges and award any newly earned ones. newSub = just-submitted sub (may not be in memory array yet).
async function checkAndAwardBadges(profile, newSub = null) {
  if (!profile || !profile.id) return [];
  const earnedArr = profile.badges || [];
  const earnedIds = new Set(earnedArr.map(b => b.id));
  let mySubs = submissions.filter(s => s.brotherId === profile.id && s.status === 'completed');
  if (newSub && !mySubs.find(s => s.id === newSub.id)) mySubs = [...mySubs, newSub];

  const toAward = [];
  for (const badge of BADGES) {
    if (earnedIds.has(badge.id) || badge.verification !== 'automatic') continue;
    const req = badge.requirement;
    let met = false;
    if (req.type === 'total_challenges') {
      met = mySubs.length >= req.count;
    } else if (req.type === 'category_challenges') {
      met = mySubs.filter(s => { const ch = challenges.find(c => c.id === s.challengeId); return ch && normalizeTag(ch.tag) === req.tag; }).length >= req.count;
    } else if (req.type === 'specific_challenge_title') {
      met = mySubs.filter(s => { const ch = challenges.find(c => c.id === s.challengeId); return ch && ch.title.toLowerCase().includes(req.titleMatch.toLowerCase()); }).length >= req.count;
    } else if (req.type === 'login_streak') {
      met = (profile.longestStreak || 0) >= req.days;
    } else if (req.type === 'weekly_streak') {
      met = countConsecutiveWeeks(mySubs, req.weeks) >= req.weeks;
    }
    if (met) toAward.push(badge);
  }
  if (!toAward.length) return [];

  const updatedBadges = [...earnedArr];
  let xpGain = 0;
  const now = new Date().toISOString();
  for (const badge of toAward) {
    updatedBadges.push({ id: badge.id, earnedAt: now, xpAwarded: badge.xpReward });
    xpGain += badge.xpReward;
  }
  const newXP = Math.min(MAX_XP, (profile.xp || 0) + xpGain);
  await updateDoc(doc(db, 'brothers', profile.id), { badges: updatedBadges, xp: newXP, updatedAt: now });
  return toAward;
}

// Admin manually awards a badge (mentor_approval / manual_award)
async function awardBadgeManually(brotherId, badgeId) {
  const profile = brothers.find(b => b.id === brotherId);
  if (!profile) return;
  const badge = BADGES.find(b => b.id === badgeId);
  if (!badge) return;
  const earnedArr = profile.badges || [];
  if (earnedArr.find(b => b.id === badgeId)) { showToast('Badge already awarded.', 'error'); return; }
  const now = new Date().toISOString();
  const updatedBadges = [...earnedArr, { id: badge.id, earnedAt: now, xpAwarded: badge.xpReward }];
  const newXP = Math.min(MAX_XP, (profile.xp || 0) + badge.xpReward);
  await updateDoc(doc(db, 'brothers', brotherId), { badges: updatedBadges, xp: newXP, updatedAt: now });
  showToast(`${badge.name} awarded to ${profile.name} (+${badge.xpReward} XP)`, 'success');
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
  document.querySelectorAll('[data-awardbadge]').forEach(btn =>
    btn.addEventListener('click', () => openAwardBadgeModal(btn.dataset.awardbadge)));
  document.querySelectorAll('[data-badgestoggle]').forEach(btn =>
    btn.addEventListener('click', () => {
      const panel = document.getElementById(`card-badges-${btn.dataset.badgestoggle}`);
      const chev  = btn.querySelector('.card-badges-chevron');
      if (!panel) return;
      panel.classList.toggle('hidden');
      chev.textContent = panel.classList.contains('hidden') ? '▾' : '▴';
    }));
  document.querySelectorAll('.profile-snapshot-toggle').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const snap = btn.nextElementSibling;
      const nowCollapsed = snap.classList.toggle('collapsed');
      btn.querySelector('.snapshot-chevron').textContent = nowCollapsed ? '▾' : '▴';
    }));
}

function renderMemberView() {
  try { _renderMemberView(); } catch(err) {
    console.error('renderMemberView crash:', err);
    if (memberHero) memberHero.innerHTML = `<div style="padding:24px;color:red;font-size:13px">Card error: ${err.message}</div>`;
  }
}
function _renderMemberView() {
  // Find this member's profile by matching email
  let profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());

  // Firestore hasn't confirmed the write yet — use localStorage fallback
  if (!profile && currentUser) {
    const pending = localStorage.getItem('pendingProfile_' + currentUser.uid);
    if (pending) {
      try {
        profile = JSON.parse(pending);
        // Inject into brothers array so roster also shows this member
        if (!brothers.find(b => b.id === profile.id)) brothers.push(profile);
      } catch (_) {}
    }
  }

  if (!profile) {
    memberHero.innerHTML = `
      <div class="member-no-profile">
        <div class="empty-icon">${IC.shield}</div>
        <h2>Welcome, Brother</h2>
        <p>Your profile is being set up. Refresh in a moment.</p>
      </div>`;
    brothersGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    return;
  }

  if (!profile.assessmentCompletedAt) {
    memberHero.innerHTML = `
      <div class="member-no-profile">
        <div class="empty-icon">${IC.target}</div>
        <h2>Complete Your Assessment</h2>
        <p>Before you can access your card, you need to complete the Brotherhood Assessment. It will reveal your archetype and unlock your full profile.</p>
        <button class="btn btn-primary" style="margin-top:20px" id="takeAssessFromCard">Begin Assessment</button>
      </div>`;
    brothersGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    document.getElementById('takeAssessFromCard')?.addEventListener('click', () => openAssessment(profile.id));
    return;
  }

  // Update streak on login
  updateStreak(profile);

  // Auto-popup daily check-in if not yet done today
  const todayStr = new Date().toDateString();
  const lastCI   = profile.lastCheckInDate ? new Date(profile.lastCheckInDate).toDateString() : null;
  if (lastCI !== todayStr) {
    setTimeout(() => openCheckInModal(profile.id), 800);
  }

  // Show a full hero profile for the member
  const xp    = profile.xp || 0;
  const lvl   = getLevelInfo(xp);
  const maxed = xp >= MAX_XP;
  const displayArchetype = profile.primaryArchetype || profile.archetype;
  const clr   = ARCHETYPE_COLORS[displayArchetype] || ARCHETYPE_COLORS.Warrior;
  const elColor = ELEMENT_COLORS[profile.dominantElement];

  // Rank among all brothers
  const sortedByXp   = brothers.slice().sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const myRankIdx    = sortedByXp.findIndex(b => b.id === profile.id);
  const myRank       = myRankIdx >= 0 ? myRankIdx + 1 : sortedByXp.length + 1;
  const totalBros    = Math.max(sortedByXp.length, 1);

  // Podium: show up to 3 slots — always include user
  const top3   = sortedByXp.slice(0, 3);
  const inTop3 = myRank <= 3;
  const podiumSlots = inTop3 ? top3 : [...sortedByXp.slice(0, 2), profile];
  const podiumRanks = inTop3 ? [1,2,3].slice(0, top3.length) : [1, 2, myRank];
  const podiumHtml  = podiumSlots.map((b, i) => {
    const isMe = b.id === profile.id;
    const label = isMe ? 'YOU' : escHtml((b.name || '').split(' ')[0]);
    const bXp = b.xp || 0;
    return `<div class="mhv2-podium-pill${isMe ? ' is-me' : ''}">${isMe ? archetypeElementIcon(displayArchetype, profile.dominantElement, xp) : ''} ${label}${!isMe ? ` <span class="mhv2-pill-xp">${bXp.toLocaleString()}</span>` : ''}</div>`;
  }).join('');

  // Community: how many brothers completed daily challenge today
  const brosCompletedToday = brothers.filter(b => isDailyChallengeCompleted(b)).length;
  const dcText = profile.dailyChallenge || '';
  const dcDone = isDailyChallengeCompleted(profile);

  // Check-in done today
  const todayStr2  = new Date().toDateString();
  const lastCI2    = profile.lastCheckInDate ? new Date(profile.lastCheckInDate).toDateString() : null;
  const checkInDone = lastCI2 === todayStr2;

  // Archetype icon PNG for background
  const bgIconSrc = displayArchetype ? `/stoked-command-center/${displayArchetype.toLowerCase()}-icon.png` : '';

  // Weekly reflection
  const hasReflection = profile.weeklyWin || profile.weeklyChallenge || profile.weeklyCommitment;

  const nameInitial = (profile.name || '?')[0].toUpperCase();
  const pct = totalBros > 0 ? Math.round(brosCompletedToday / totalBros * 100) : 0;
  const bsScore = profile.brotherhoodScore ?? null;
  const bsCat   = bsScore != null ? getBSCategory(bsScore) : null;
  const lvlPct  = lvl.progress;
  const nextLvl = lvl.next ? lvl.next.level : null;

  memberHero.innerHTML = `
    <div class="mhv2">

      <!-- Ghost archetype icon background -->
      <div class="mhv2-arch-bg" aria-hidden="true">
        ${bgIconSrc ? `<img src="${bgIconSrc}" alt="">` : ''}
      </div>

      <!-- Header: avatar + name + mentor badge -->
      <div class="mhv2-header">
        <div class="mhv2-header-left">
          <div class="mhv2-avatar-wrap">
            ${bgIconSrc
              ? `<img class="mhv2-avatar-icon" src="${bgIconSrc}" alt="${escHtml(displayArchetype||'')}">`
              : `<div class="mhv2-avatar">${nameInitial}</div>`}
          </div>
          <div class="mhv2-name">${escHtml(profile.name || '')}</div>
        </div>
        <div class="mhv2-header-right">
          ${profile.role === 'mentor' ? '<div class="mhv2-role-badge">MENTOR</div>' : ''}
          ${profile.primaryArchetype ? `<button class="mhv2-retake-btn" data-take-assessment="${profile.id}" title="Retake">${IC.clock}</button>` : ''}
        </div>
      </div>

      <!-- Daily check-in score -->
      <div class="mhv2-score-section">
        <div class="mhv2-rank-eyebrow">Daily Check-In Score</div>
        ${bsScore != null
          ? `<div class="mhv2-rank-row">
               <div class="mhv2-rank-num" style="color:${bsCat.color}">${bsScore}</div>
               <div class="mhv2-rank-of">${bsCat.label}</div>
             </div>`
          : `<div class="mhv2-no-score">No check-in yet today</div>`}
      </div>

      <!-- Level + gold progress bar -->
      <div class="mhv2-level-section">
        <div class="mhv2-level-row">
          <span class="mhv2-level-label">Level ${lvl.current.level}${displayArchetype ? ' · ' + escHtml(displayArchetype) : ''}</span>
          <span class="mhv2-level-pct">${lvlPct}%${nextLvl ? ' to Lvl ' + nextLvl : ''}</span>
        </div>
        <div class="mhv2-level-track">
          <div class="mhv2-level-fill" style="width:${lvlPct}%"></div>
        </div>
      </div>

      <!-- Incoming friend challenges -->
      ${activeFriendChallenges.length ? activeFriendChallenges.map(fc => `
      <div class="mhv2-friend-challenge" data-fc-id="${fc.id}">
        <div class="mhv2-fc-top">
          <span class="mhv2-fc-label">⚡ CHALLENGED BY ${escHtml(fc.fromName.toUpperCase())}</span>
          <div class="mhv2-fc-top-right">
            <span class="mhv2-fc-xp">+${fc.xp} XP</span>
            <button class="mhv2-fc-dismiss-btn" data-fc-dismiss="${fc.id}" title="Decline challenge">✕</button>
          </div>
        </div>
        <div class="mhv2-fc-desc mhv2-fc-desc-clamped" data-fc-desc="${fc.id}">${escHtml(fc.description)}</div>
        ${fc.description.length > 60 ? `<button class="mhv2-fc-readmore" data-fc-readmore="${fc.id}">Read more ↓</button>` : ''}
        <button class="mhv2-fc-complete-btn" data-fc-complete="${fc.id}">COMPLETE CHALLENGE →</button>
      </div>`).join('') : ''}

      <!-- Challenge a Brother block -->
      <div class="mhv2-challenge-block">
        <div class="mhv2-mission-top">
          <span class="mhv2-mission-label">CHALLENGE A BROTHER</span>
        </div>
        <div class="mhv2-challenge-block-sub">Call out a brother. Set the task. Hold each other accountable.</div>
        <button class="mhv2-challenge-block-btn" data-open-challenge="1">⚡ SEND A CHALLENGE</button>
      </div>

      ${hasReflection ? `
      <div class="mhv2-reflection">
        ${profile.weeklyWin        ? `<div class="mhv2-r-row"><span class="mhv2-r-lbl">Win</span><span class="mhv2-r-val">${escHtml(profile.weeklyWin)}</span></div>` : ''}
        ${profile.weeklyChallenge  ? `<div class="mhv2-r-row"><span class="mhv2-r-lbl">Challenge</span><span class="mhv2-r-val">${escHtml(profile.weeklyChallenge)}</span></div>` : ''}
        ${profile.weeklyCommitment ? `<div class="mhv2-r-row"><span class="mhv2-r-lbl">Commitment</span><span class="mhv2-r-val">${escHtml(profile.weeklyCommitment)}</span></div>` : ''}
      </div>` : ''}

      <!-- Completed Challenges history -->
      ${(() => {
        const mySubs = submissions
          .filter(s => s.brotherId === profile.id && s.status === 'completed')
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        if (!mySubs.length) return '';
        const rows = mySubs.map(s => {
          const ch    = challenges.find(c => c.id === s.challengeId);
          const title = ch?.title || s.challengeTitle || 'Challenge';
          const tag   = ch?.tag   || '';
          const tagColor = tag && CHALLENGE_TAGS[tag] ? CHALLENGE_TAGS[tag].color : '#888';
          const date  = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          return `<div class="mhv2-comp-row">
            <span class="mhv2-comp-check">✓</span>
            <div class="mhv2-comp-info">
              <span class="mhv2-comp-title">${escHtml(title)}</span>
              ${tag ? `<span class="mhv2-comp-tag" style="color:${tagColor}">${escHtml(tag)}</span>` : ''}
            </div>
            <span class="mhv2-comp-date">${date}</span>
          </div>`;
        }).join('');
        return `
        <div class="mhv2-comp-section">
          <button class="mhv2-comp-toggle" data-comp-toggle>
            <span>Completed Challenges</span>
            <span class="mhv2-comp-count">${mySubs.length}</span>
            <span class="mhv2-comp-chevron">▾</span>
          </button>
          <div class="mhv2-comp-list hidden">${rows}</div>
        </div>`;
      })()}

      ${(() => {
        const myBadges = (profile.badges || [])
          .map(b => ({ ...b, def: BADGES.find(d => d.id === b.id) }))
          .filter(b => b.def)
          .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
        if (!myBadges.length) return '';
        return `
        <div class="mhv2-badge-strip-wrap">
          <div class="mhv2-badge-strip">
            ${myBadges.map(b => `
              <div class="mhv2-badge-strip-item" data-tooltip="${escHtml(b.def.name + ' — ' + b.def.description)}">
                ${badgeIconHtml(b.def.id, 120, false)}
              </div>`).join('')}
          </div>
        </div>`;
      })()}

      ${profile.coachNote ? `
      <div class="mhv2-coach-note">
        <div class="mhv2-coach-from">— ${escHtml(profile.coachNoteAuthor || 'Coach')} —</div>
        <div class="mhv2-coach-text">${escHtml(profile.coachNote)}</div>
      </div>` : ''}

      <!-- Primary CTA: terracotta -->
      ${dcText && !dcDone
        ? `<button class="mhv2-complete-btn" data-dc-complete="1">COMPLETE MISSION →</button>`
        : `<button class="mhv2-checkin-btn${checkInDone ? ' done' : ''}" data-checkin="${profile.id}">
             ${checkInDone ? '✓ CHECKED IN TODAY' : '✓ DAILY CHECK-IN'}
           </button>
           ${checkInDone ? `<button class="mhv2-recheckin-btn" data-checkin="${profile.id}">↺ Redo Check-In</button>` : ''}`}

      ${!profile.primaryArchetype ? `
      <div class="mhv2-assess-cta">
        <div class="mhv2-assess-title">Discover Your Archetype</div>
        <div class="mhv2-assess-sub">29 questions · ~6 minutes · Reveals your archetype and element</div>
        <button class="mhv2-assess-btn" data-take-assessment="${profile.id}">BEGIN ASSESSMENT →</button>
      </div>` : ''}

    </div>`;

  // Wire member check-in button
  const ciBtn = memberHero.querySelector('[data-checkin]');
  if (ciBtn) ciBtn.addEventListener('click', () => openCheckInModal(ciBtn.dataset.checkin));

  // Wire daily challenge buttons
  memberHero.querySelector('[data-dc-set]')?.addEventListener('click', () => openDailyChallengeModal(profile));
  memberHero.querySelector('[data-dc-complete]')?.addEventListener('click', () => completeDailyChallenge(profile));

  // Wire challenge-a-brother button
  memberHero.querySelector('[data-open-challenge]')?.addEventListener('click', () => openFriendChallengeModal(profile));

  // Wire completed challenges toggle
  memberHero.querySelector('[data-comp-toggle]')?.addEventListener('click', function() {
    const list = this.closest('.mhv2-comp-section').querySelector('.mhv2-comp-list');
    const chevron = this.querySelector('.mhv2-comp-chevron');
    list.classList.toggle('hidden');
    chevron.textContent = list.classList.contains('hidden') ? '▾' : '▴';
  });

  // Card-level badges button (top-left of avatar)
  memberHero.querySelector('#cardBadgesBtn')?.addEventListener('click', openBadgesOverlay);

  // Badge strip tooltips — hover on desktop, tap to toggle on mobile
  let activeBadgeTip = null;
  const hideActiveBadgeTip = () => { activeBadgeTip?.remove(); activeBadgeTip = null; };

  memberHero.querySelectorAll('.mhv2-badge-strip-item').forEach(item => {
    const text = item.dataset.tooltip;

    const showTip = (anchorRect) => {
      hideActiveBadgeTip();
      const tip = document.createElement('div');
      tip.className = 'badge-strip-tooltip';
      tip.textContent = text;
      tip.style.position = 'fixed';
      tip.style.zIndex = '9999';
      tip.style.visibility = 'hidden';
      document.body.appendChild(tip);
      // Position after paint so offsetWidth is real
      requestAnimationFrame(() => {
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        const cx = anchorRect.left + anchorRect.width / 2;
        tip.style.left = Math.min(window.innerWidth - tw - 8, Math.max(8, cx - tw / 2)) + 'px';
        tip.style.top = Math.max(8, anchorRect.top - th - 8) + 'px';
        tip.style.visibility = '';
      });
      activeBadgeTip = tip;
    };

    item.addEventListener('mouseenter', () => showTip(item.getBoundingClientRect()));
    item.addEventListener('mouseleave', hideActiveBadgeTip);
    item.addEventListener('touchstart', e => {
      e.stopPropagation();
      if (activeBadgeTip) { hideActiveBadgeTip(); return; }
      showTip(item.getBoundingClientRect());
    }, { passive: true });
  });

  // Tap anywhere else dismisses badge tooltip
  memberHero.addEventListener('touchstart', hideActiveBadgeTip, { passive: true });

  // Wire friend challenge complete buttons
  memberHero.querySelectorAll('[data-fc-complete]').forEach(btn => {
    btn.addEventListener('click', () => completeFriendChallenge(btn.dataset.fcComplete, profile));
  });

  // Wire friend challenge dismiss buttons
  memberHero.querySelectorAll('[data-fc-dismiss]').forEach(btn => {
    btn.addEventListener('click', () => dismissFriendChallenge(btn.dataset.fcDismiss));
  });

  // Wire read more toggles
  memberHero.querySelectorAll('[data-fc-readmore]').forEach(btn => {
    btn.addEventListener('click', () => {
      const desc = memberHero.querySelector(`[data-fc-desc="${btn.dataset.fcReadmore}"]`);
      const expanded = desc.classList.toggle('mhv2-fc-desc-expanded');
      btn.textContent = expanded ? 'Read less ↑' : 'Read more ↓';
    });
  });

  // Wire profile snapshot toggles in hero
  memberHero.querySelectorAll('.profile-snapshot-toggle').forEach(btn =>
    btn.addEventListener('click', () => {
      const snap = btn.nextElementSibling;
      const nowCollapsed = snap.classList.toggle('collapsed');
      btn.querySelector('.snapshot-chevron').textContent = nowCollapsed ? '▾' : '▴';
    }));

  brothersGrid.innerHTML = '';
  emptyState.classList.add('hidden');

  // Parallax ghost icon — scrolls at 50% speed relative to card
  initCardParallax();
}

function initCardParallax() {
  const bg = memberHero.querySelector('.mhv2-arch-bg');
  if (!bg) return;

  // Remove any previous listener
  if (initCardParallax._handler) {
    window.removeEventListener('scroll', initCardParallax._handler, { passive: true });
  }

  let ticking = false;
  const handler = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = memberHero.getBoundingClientRect();
      // How far the card top has scrolled past the viewport top (negative = scrolled up)
      const offset = rect.top;
      // Move icon at half speed (opposite direction to create parallax depth)
      bg.style.transform = `translateY(${-offset * 0.25}px)`;
      ticking = false;
    });
  };

  initCardParallax._handler = handler;
  window.addEventListener('scroll', handler, { passive: true });
}

function renderCard(brother) {
  const xp      = brother.xp || 0;
  const lvl     = getLevelInfo(xp);
  const displayArchetype = brother.primaryArchetype || brother.archetype;
  const archIcon = archetypeElementIcon(displayArchetype, brother.dominantElement, brother.xp);
  const archClr  = ARCHETYPE_COLORS[displayArchetype] || { border:'var(--border)', glow:'transparent', icon:'var(--orange)' };
  const archElColor = ELEMENT_COLORS[brother.dominantElement];
  const maxed   = xp >= MAX_XP;
  const nextText = lvl.next ? `${lvl.xpNeededForNext.toLocaleString()} XP to Level ${lvl.next.level}` : 'MAX LEVEL ACHIEVED';

  return `
    <div class="brother-card" id="card-${brother.id}" data-archetype="${escHtml(displayArchetype||'')}" data-element="${escHtml(brother.dominantElement||'')}" style="--arch-border:${archClr.border};--arch-glow:${archClr.glow};--arch-icon:${archClr.icon}">
      <div class="card-top">
        <div class="card-identity">
          <div class="card-name">
            ${isOnline(brother) ? '<span class="online-dot" title="Online now"></span>' : ''}
            ${escHtml(brother.name)}${brother.role === 'mentor' ? ' <span class="mentor-badge">Mentor</span>' : ''}
          </div>
          ${brother.age ? `<div class="card-age">Age ${brother.age}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon" data-assign-challenge="${brother.id}" title="Assign Personal Challenge">${IC.target}</button>
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
            ${brother.yearlyGoal ? `<div class="profile-goal"><span class="profile-label">Goal</span><span>${escHtml(brother.yearlyGoal)}</span></div>` : ''}
            ${brother.strengths ? `<div class="profile-goal"><span class="profile-label">Strong at</span><span>${escHtml(brother.strengths)}</span></div>` : ''}
            ${brother.struggles ? `<div class="profile-goal"><span class="profile-label">Working on</span><span>${escHtml(brother.struggles)}</span></div>` : ''}
            ${brother.interests && brother.interests.length ? `<div class="profile-interests">${brother.interests.map(i => {
              const found = INTERESTS_LIST.find(x => x.label === i);
              return `<span class="profile-interest-tag">${escHtml(i)}</span>`;
            }).join('')}</div>` : ''}
          </div>
        </div>` : ''}

      <div class="xp-hero">
        <div class="xp-hero-num ${maxed ? 'maxed' : ''}">${xp.toLocaleString()}</div>
        <div class="xp-hero-label">TOTAL XP</div>
      </div>

      <div class="level-section">
        <div class="level-row">
          <span class="level-name">Level ${lvl.current.level}</span>
          <span class="level-pct">${lvl.progress}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${maxed ? 'maxed' : ''}" style="width:${lvl.progress}%"></div>
        </div>
        <div class="progress-next">${nextText}</div>
      </div>

      ${brother.brotherhoodScore != null ? (() => {
        const cat = getBSCategory(brother.brotherhoodScore);
        return `<div class="scores-row scores-row-solo">
          <div class="score-chip weekly" style="--bs-color:${cat.color}">
            <div class="score-num" style="color:${cat.color}">${brother.brotherhoodScore}</div>
            <div class="score-lbl">Daily Score</div>
            <div class="score-cat" style="color:${cat.color}">${cat.label}</div>
          </div>
        </div>`;
      })() : ''}

      ${(brother.currentStreak > 0) ? `
        <div class="streak-card">
          <span class="streak-flame">${IC.flame}</span>
          <span class="streak-count">${brother.currentStreak}</span>
          <span class="streak-label">day login streak</span>
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

      ${dailyChallengeCardHtml(brother, false)}

      <div class="card-btn-row">
        <button class="btn-add-xp" data-addxp="${brother.id}">${IC.bolt} Add XP</button>
        <button class="btn-checkin" data-checkin="${brother.id}" title="Weekly Check-In">Check-In</button>
        ${brother.brotherhoodScore != null ? `<button class="btn-view-checkin" data-viewcheckin="${brother.id}" title="View Check-In">📊</button>` : ''}
        <button class="btn-coach-note" data-coachnote="${brother.id}" title="Coach Note">📋</button>
        <button class="btn-award-badge" data-awardbadge="${brother.id}" title="Award Badge">🏅</button>
      </div>
      ${(() => {
        const earnedBadges = (brother.badges || [])
          .map(b => ({ ...b, def: BADGES.find(d => d.id === b.id) }))
          .filter(b => b.def)
          .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
        const count = earnedBadges.length;
        return `
        <div class="card-badges-section">
          <button class="card-badges-toggle" data-badgestoggle="${brother.id}">
            <span>Badges</span>
            <span class="card-badges-count">${count}</span>
            <span class="card-badges-chevron">▾</span>
          </button>
          <div class="card-badges-panel hidden" id="card-badges-${brother.id}">
            ${count === 0
              ? `<div class="card-badges-empty">No badges earned yet.</div>`
              : earnedBadges.map(b => {
                  const catData = BADGE_CATEGORIES[b.def.category];
                  const color = catData ? catData.color : '#888';
                  return `<div class="card-badge-chip" style="border-color:${color}30;background:${color}0d">
                    <span class="card-badge-glyph">${badgeIconHtml(b.def.id, 28, false)}</span>
                    <div class="card-badge-info">
                      <span class="card-badge-name">${escHtml(b.def.name)}</span>
                      <span class="card-badge-date">${new Date(b.earnedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                    </div>
                    <span class="card-badge-xp" style="color:${color}">+${b.xpAwarded} XP</span>
                  </div>`;
                }).join('')
            }
          </div>
        </div>`;
      })()}
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
function openAwardBadgeModal(brotherId) {
  const b = brothers.find(x => x.id === brotherId);
  if (!b) return;
  const earnedIds = new Set((b.badges || []).map(x => x.id));
  const available = BADGES.filter(badge => !earnedIds.has(badge.id));
  if (!available.length) { showToast(`${b.name} has earned all badges.`, 'success'); return; }
  document.getElementById('awardBadgeBrotherId').value = brotherId;
  document.getElementById('awardBadgeBrotherName').textContent = b.name;
  const sel = document.getElementById('awardBadgeSelect');
  sel.innerHTML = available.map(badge =>
    `<option value="${badge.id}">${badge.name} (+${badge.xpReward} XP) — ${BADGE_CATEGORIES[badge.category]?.label || badge.category}</option>`
  ).join('');
  openModal(document.getElementById('awardBadgeModal'));
}

document.getElementById('awardBadgeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const brotherId = document.getElementById('awardBadgeBrotherId').value;
  const badgeId   = document.getElementById('awardBadgeSelect').value;
  try {
    await awardBadgeManually(brotherId, badgeId);
    closeModal(document.getElementById('awardBadgeModal'));
  } catch(err) { showToast('Error awarding badge.', 'error'); }
});
document.getElementById('awardBadgeModalClose').addEventListener('click', () => closeModal(document.getElementById('awardBadgeModal')));
document.getElementById('awardBadgeCancelBtn').addEventListener('click',  () => closeModal(document.getElementById('awardBadgeModal')));

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
  try {
  const archetypeScores = {};
  Object.keys(ARCHETYPE_DESC).forEach(a => archetypeScores[a] = 0);
  const elementScores = { Fire: 0, Water: 0, Air: 0, Earth: 0 };

  ASSESS_QUESTIONS.forEach((q, i) => {
    const v = assessAnswers[i];
    if (v == null || !q.leftScore || !q.rightScore) return;
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
    if (!chosen?.scores) return;
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
    if (!chosen?.scores) return;
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
    if (!chosen?.scores) return;
    Object.entries(chosen.scores).forEach(([key, pts]) => {
      if (key in archetypeScores) archetypeScores[key] += pts;
      else if (key in elementScores) elementScores[key] += pts;
    });
  });

  const archSorted = Object.entries(archetypeScores).sort((a, b) => b[1] - a[1]);
  const primaryArchetype = archSorted[0][0];
  const growthArchetype  = archSorted[archSorted.length - 1][0];
  const elSorted         = Object.entries(elementScores).sort((a, b) => b[1] - a[1]);
  const dominantElement  = elSorted[0][0];
  const growthElement    = elSorted[elSorted.length - 1][0];

  if (assessBrotherId) {
    const assessmentData = { primaryArchetype, growthArchetype, dominantElement, growthElement, archetypeScores, elementScores, assessmentCompletedAt: new Date().toISOString() };
    const local = brothers.find(b => b.id === assessBrotherId);
    if (local) {
      Object.assign(local, assessmentData);
    } else {
      // Brand-new brother created during onboarding — add to local array so render() sees it
      brothers.push({ id: assessBrotherId, email: currentUser?.email?.toLowerCase(), xp: 0, role: 'member', ...assessmentData });
    }
    render();

    // Save in background — don't block the UI
    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await setDoc(doc(db, 'brothers', assessBrotherId), assessmentData, { merge: true });
          return;
        } catch (err) {
          console.warn('assessment save attempt', attempt + 1, 'failed:', err);
          if (attempt < 3) await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        }
      }
      console.error('assessment failed to save after 4 attempts');
    })();
  }

  // Store archetype results for final display, then go to profile questions immediately
  profileAnswers._archetype = { primaryArchetype, growthArchetype, dominantElement, growthElement };
  profileIndex = 0;
  renderProfileQuestion();

  } catch (err) {
    console.error('finishAssessment error:', err);
    showToast('Something went wrong scoring the assessment — please try again.', 'info');
  }
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

function finishProfile() {
  const { primaryArchetype, growthArchetype, dominantElement, growthElement } = profileAnswers._archetype || {};

  if (assessBrotherId) {
    const profileSaveData = {
      yearlyGoal:  profileAnswers.yearlyGoal  || '',
      strengths:   profileAnswers.strengths   || '',
      struggles:   profileAnswers.struggles   || '',
      interests:   profileAnswers.interests   || [],
      oneWord:     profileAnswers.oneWord      || '',
      profileCompletedAt: new Date().toISOString(),
    };
    const local = brothers.find(b => b.id === assessBrotherId);
    if (local) Object.assign(local, profileSaveData);
    // Update localStorage fallback too so the card reflects profile answers
    if (currentUser) {
      const pending = localStorage.getItem('pendingProfile_' + currentUser.uid);
      if (pending) {
        try { localStorage.setItem('pendingProfile_' + currentUser.uid, JSON.stringify({ ...JSON.parse(pending), ...profileSaveData })); } catch (_) {}
      }
    }
    // Save in background — show results immediately
    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await setDoc(doc(db, 'brothers', assessBrotherId), profileSaveData, { merge: true });
          return;
        } catch (err) {
          console.warn('profile save attempt', attempt + 1, 'failed:', err);
          if (attempt < 3) await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        }
      }
      console.error('Failed to save profile after retries');
    })();
  }

  renderAssessResults(primaryArchetype, growthArchetype, dominantElement, growthElement);
}

function renderAssessResults(primaryArchetype, growthArchetype, dominantElement, growthElement) {
  const pClr    = ARCHETYPE_COLORS[primaryArchetype] || { border:'var(--border)', glow:'transparent', icon:'var(--accent)' };
  const gClr    = ARCHETYPE_COLORS[growthArchetype]  || { border:'var(--border)', glow:'transparent', icon:'var(--accent)' };
  const elColor = ELEMENT_COLORS[dominantElement]    || 'var(--accent)';
  const grElColor = ELEMENT_COLORS[growthElement]    || 'var(--accent)';
  const pIcon   = archetypeElementIcon(primaryArchetype, dominantElement);
  const gIcon   = archetypeElementIcon(growthArchetype,  growthElement);

  const primaryElDesc  = ARCHETYPE_DESC[primaryArchetype]?.[dominantElement] || ARCHETYPE_DESC[primaryArchetype]?.primary || '';
  const growthElDesc   = ARCHETYPE_DESC[growthArchetype]?.[growthElement]    || ARCHETYPE_DESC[growthArchetype]?.growth   || '';

  assessContent.innerHTML = `
    <div class="assess-results">

      <div class="assess-results-header">
        <div class="assess-results-wordmark">YOUR RESULT</div>
        <p class="assess-results-intro">This is not a label. It is a mirror — showing your strongest natural energy and the frontier where your next growth lives.</p>
      </div>

      <div class="assess-result-section-label">WHO YOU ARE</div>

      <div class="assess-result-card primary-card" style="--arch-border:${pClr.border};--arch-glow:${pClr.glow};--arch-icon:${pClr.icon}">
        <div class="assess-result-tag">Primary Archetype</div>
        <div class="assess-result-combo">
          <span class="arch-icon">${pIcon}</span>
          <div>
            <div class="assess-result-name">${primaryArchetype}</div>
            <div class="assess-result-element" style="color:${elColor}">${dominantElement} Element</div>
          </div>
        </div>
        <div class="assess-result-desc">${ARCHETYPE_DESC[primaryArchetype]?.primary || ''}</div>
        <div class="assess-result-el-label" style="border-color:${elColor}44;color:${elColor}">What ${dominantElement} means for the ${primaryArchetype}</div>
        <div class="assess-result-desc assess-result-el-desc">${primaryElDesc}</div>
      </div>

      <div class="assess-result-section-label" style="margin-top:28px">WHERE YOU GROW</div>

      <div class="assess-result-card growth-card" style="--arch-border:${gClr.border};--arch-glow:${gClr.glow};--arch-icon:${gClr.icon}">
        <div class="assess-result-tag">Growth Archetype</div>
        <div class="assess-result-combo">
          <span class="arch-icon">${gIcon}</span>
          <div>
            <div class="assess-result-name">${growthArchetype}</div>
            <div class="assess-result-element" style="color:${grElColor}">${growthElement} Element</div>
          </div>
        </div>
        <div class="assess-result-desc">${ARCHETYPE_DESC[growthArchetype]?.growth || ''}</div>
        <div class="assess-result-el-label" style="border-color:${grElColor}44;color:${grElColor}">What ${growthElement} means for the ${growthArchetype}</div>
        <div class="assess-result-desc assess-result-el-desc">${growthElDesc}</div>
      </div>

      <p class="assess-mirror">"Your archetype is not a box. It is your strongest current energy — and your growth archetype is the frontier where more of you is waiting."</p>
      <button class="btn btn-primary assess-done-btn" id="assessCloseBtn">Enter the Brotherhood</button>
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
    showToast(`Daily check-in complete · Brotherhood Score: ${brotherhoodScore}/100 — ${cat.label}`, 'success');
  } catch (err) {
    showToast('Error saving check-in: ' + err.message, 'info');
  }
});

document.getElementById('checkInModalClose').addEventListener('click', () => closeModal(checkInModal));
checkInModal.addEventListener('click', e => { if (e.target === checkInModal) closeModal(checkInModal); });

// ── COMMUNITY FEED ────────────────────────────
const CATEGORY_META = {
  Move:        { label: 'Movement',    img: '/stoked-command-center/challenges%20icon%202/movement-icon-2.png',    desc: 'Planks, push-ups, skating, sparring, pull-ups' },
  Create:      { label: 'Create',      img: '/stoked-command-center/challenges%20icon%202/create-icon-2.png',      desc: 'Music, art, cooking, writing, building' },
  Reset:       { label: 'Reset',       img: '/stoked-command-center/challenges%20icon%202/reset-icon-2.png',       desc: 'Sunrise, meditation, ice bath, room reset' },
  Adventure:   { label: 'Adventure',   img: '/stoked-command-center/challenges%20icon%202/adventure-icon-2.png',   desc: 'Hiking, camping, fishing, fire, surfing' },
  Family:      { label: 'Family',      img: '/stoked-command-center/challenges%20icon%202/family-icon-2.png',      desc: 'Chores, interviews, projects, teaching parents' },
  Brotherhood: { label: 'Brotherhood', img: '/stoked-command-center/challenges%20icon%202/brotherhood-icon-2.png', desc: 'Teach, lead, encourage, hold accountable' },
};

function renderCategoryGrid(extraFilters = [], hasPersonal = false) {
  const categories = Object.keys(CHALLENGE_TAGS).filter(k => k !== 'Special');
  const extras = extraFilters.map(f => `
    <button class="ch-category-card ch-category-extra" data-filter="${f}">
      <span class="ch-category-icon">${IC.target}</span>
      <span class="ch-category-name">${f}</span>
    </button>`).join('');
  return `<div class="ch-category-grid">
    ${categories.map(tag => {
      const t = CHALLENGE_TAGS[tag];
      const m = CATEGORY_META[tag] || {};
      const count = challenges.filter(ch => !ch.assignedTo && normalizeTag(ch.tag) === tag).length;
      const label = m.label || tag;
      const imgHtml = m.img ? `<img class="ch-category-watermark" src="${m.img}" alt="" aria-hidden="true">` : '';
      return `<button class="ch-category-card" data-filter="${tag}" style="--cat-color:${t.color}">
        ${imgHtml}
        <span class="ch-category-name">${label}</span>
        <span class="ch-category-desc">${m.desc || ''}</span>
        <span class="ch-category-count">${count} challenge${count !== 1 ? 's' : ''}</span>
      </button>`;
    }).join('')}
    ${extras}
  </div>`;
}

function renderCategoryHeader() {
  const tag = challengeFilter;
  const t = CHALLENGE_TAGS[tag];
  const m = CATEGORY_META[tag] || {};
  const svgIcon = m.iconKey ? IC[m.iconKey] || '' : '';
  return `<div class="ch-category-header" style="--cat-color:${t?.color || '#888'}">
    <button class="ch-back-btn" id="chBackBtn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      <span>Categories</span>
    </button>
    <div class="ch-category-header-inner">
      <span class="ch-category-header-icon">${svgIcon}</span>
      <span class="ch-category-header-name">${tag}</span>
    </div>
  </div>`;
}

function bindChallengeFilterBar(el) {
  el.querySelectorAll('.ch-category-card').forEach(btn => {
    btn.addEventListener('click', () => {
      challengeFilter = btn.dataset.filter;
      renderFeed();
    });
  });
  el.querySelector('#chBackBtn')?.addEventListener('click', () => {
    challengeFilter = 'All';
    renderFeed();
  });
}

function applyFilter(list) {
  if (challengeFilter === 'All') return list;
  if (challengeFilter === 'From Coach') return list;
  return list.filter(ch => normalizeTag(ch.tag) === challengeFilter);
}

function isOnCategoryGrid() {
  return challengeFilter === 'All';
}

function renderFeed() {
  // Clean up any stale badge tooltip left over from previous render
  document.querySelectorAll('.badge-strip-tooltip').forEach(t => t.remove());
  const el = document.getElementById('feedContainer');
  if (!el) return;
  if (isAdmin) renderFeedAdmin(el);
  else if (isMentor) renderFeedMentor(el);
  else renderFeedMember(el);
}

function renderFeedAdmin(el) {
  const adminHeaderHtml = `<div class="feed-header">
    <h2 class="feed-title">Challenges</h2>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" id="createChallengeBtn">+ New Challenge</button>
      <button class="btn-ghost-sm" id="seedChallengesBtn" title="Add all preset challenges">Seed DB</button>
    </div>
  </div>`;

  if (isOnCategoryGrid()) {
    // Show category grid + personal challenges section
    const personalChallenges = challenges.filter(ch => ch.assignedTo);
    let html = adminHeaderHtml + renderCategoryGrid(['Personal']);
    if (personalChallenges.length) {
      html += `<div class="feed-section" style="margin-top:20px">
        <div class="feed-section-title">${IC.coach} Personal Challenges (Coach-Assigned)</div>
        <div class="challenge-list">
          ${personalChallenges.map(ch => {
            const assigneeName = brothers.find(b => b.id === ch.assignedTo)?.name || 'Unknown';
            const completed = submissions.filter(s => s.challengeId === ch.id && s.status === 'completed').length;
            const adminBtns = `<button class="btn-edit-challenge btn-ghost-sm" data-editch="${ch.id}">${IC.edit} Edit</button>
              <button class="btn-close-challenge btn-ghost-sm" data-closech="${ch.id}">Archive</button>`;
            return buildChallengeCard(ch, '', { assignee: assigneeName, completedCount: completed, adminBtns });
          }).join('')}
        </div>
      </div>`;
    }
    el.innerHTML = html;
  } else {
    const publicChallenges = applyFilter(challenges.filter(ch => !ch.assignedTo));
    let html = adminHeaderHtml + renderCategoryHeader();
    if (!publicChallenges.length) {
      html += `<div class="feed-empty">No challenges in this category yet.</div>`;
    } else {
      html += `<div class="challenge-list" style="margin-top:12px">
        ${publicChallenges.map(ch => {
          const completed = submissions.filter(s => s.challengeId === ch.id && s.status === 'completed').length;
          const adminBtns = `<button class="btn-edit-challenge btn-ghost-sm" data-editch="${ch.id}">${IC.edit} Edit</button>
            <button class="btn-close-challenge btn-ghost-sm" data-closech="${ch.id}">Archive</button>`;
          return buildChallengeCard(ch, '', { completedCount: completed, adminBtns });
        }).join('')}
      </div>`;
    }
    el.innerHTML = html;
  }

  bindChallengeFilterBar(el);
  bindChallengeCards(el);
  document.getElementById('createChallengeBtn')?.addEventListener('click', openCreateChallengeModal);
  document.getElementById('seedChallengesBtn')?.addEventListener('click', () => {
    if (confirm(`Add ${CHALLENGE_SEED.length} preset challenges to Firestore? (Duplicates will be skipped.)`)) seedChallengesDB();
  });
  el.querySelectorAll('.btn-close-challenge').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); archiveChallenge(btn.dataset.closech); }));
  el.querySelectorAll('.btn-edit-challenge').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openEditChallengeModal(btn.dataset.editch); }));
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
  const myPersonalM = challenges.filter(ch => ch.assignedTo === profile?.id);
  const todayStrM = new Date().toISOString().slice(0, 10);

  function challengeStatusHtmlM(ch, subs) {
    const isDaily = ch.repeatType === 'daily';
    if (isDaily) {
      const doneToday = subs.some(s => s.challengeId === ch.id && s.submittedAt?.slice(0,10) === todayStrM);
      if (doneToday) {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const resetStr = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<div class="sub-status-badge status-completed daily-done">
          ${IC.check} Completed Today — +${ch.xpReward} XP<br>
          <span class="daily-reset-note">${IC.repeat} Resets ${resetStr}</span>
        </div>`;
      }
      return `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`;
    } else {
      const mySub = subs.find(s => s.challengeId === ch.id);
      return mySub
        ? `<div class="sub-status-badge status-completed">${IC.check} Challenge Complete — +${ch.xpReward} XP!</div>`
        : `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`;
    }
  }

  const mentorHeaderHtml = `<div class="feed-header">
    <h2 class="feed-title">Challenges</h2>
    <button class="btn btn-primary" id="createChallengeBtn">+ New Challenge</button>
  </div>`;

  let html;
  if (isOnCategoryGrid()) {
    html = mentorHeaderHtml + renderCategoryGrid(myPersonalM.length ? ['From Coach'] : []);
    // Coach notes always visible on grid
    const otherBrothers = brothers.filter(b => b.id !== profile?.id);
    if (otherBrothers.length) {
      html += `<div class="feed-section" style="margin-top:20px">
        <div class="feed-section-title">${IC.clipboard} Coach Notes</div>
        <div class="challenge-list">
          ${otherBrothers.map(b => `
            <div class="ch-card" style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div>
                <div style="font-weight:700;color:var(--text-primary)">${escHtml(b.name)}</div>
                ${b.coachNote ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">"${escHtml(b.coachNote.slice(0,60))}${b.coachNote.length>60?'…':''}"</div>` : `<div style="font-size:12px;color:var(--text-muted)">No note yet</div>`}
              </div>
              <button class="btn-coach-note btn btn-ghost" style="white-space:nowrap" data-coachnote="${b.id}">${IC.edit} Note</button>
            </div>`).join('')}
        </div>
      </div>`;
    }
  } else if (challengeFilter === 'From Coach') {
    html = mentorHeaderHtml + renderCategoryHeader();
    if (myPersonalM.length) {
      html += `<div class="challenge-list" style="margin-top:12px">`;
      myPersonalM.forEach(ch => { html += buildChallengeCard(ch, challengeStatusHtmlM(ch, mySubs), { coach: true }); });
      html += `</div>`;
    } else {
      html += `<div class="feed-empty">No personal challenges assigned.</div>`;
    }
  } else {
    const publicChsM = applyFilter(challenges.filter(ch => !ch.assignedTo));
    html = mentorHeaderHtml + renderCategoryHeader();
    if (!publicChsM.length) {
      html += `<div class="feed-empty">No challenges in this category yet.</div>`;
    } else {
      html += `<div class="challenge-list" style="margin-top:12px">`;
      publicChsM.forEach(ch => {
        const totalCompleted = submissions.filter(s => s.challengeId === ch.id && s.status === 'completed').length;
        html += buildChallengeCard(ch, challengeStatusHtmlM(ch, mySubs), { completedCount: totalCompleted });
      });
      html += `</div>`;
    }
  }

  el.innerHTML = html;
  bindChallengeFilterBar(el);
  bindChallengeCards(el);
  document.getElementById('createChallengeBtn')?.addEventListener('click', openCreateChallengeModal);
  el.querySelectorAll('[data-submit]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openSubmitProofModal(btn.dataset.submit, profile); }));
  el.querySelectorAll('.btn-coach-note').forEach(btn =>
    btn.addEventListener('click', () => openCoachNoteModal(btn.dataset.coachnote)));
}

function renderFeedMember(el) {
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  if (!profile) {
    el.innerHTML = `<div class="feed-empty">Your profile isn't set up yet. Check back soon.</div>`;
    return;
  }

  const mySubs    = submissions.filter(s => s.brotherId === profile.id);
  const myPersonal = challenges.filter(ch => ch.assignedTo === profile.id);
  const todayStr  = new Date().toISOString().slice(0, 10);

  function isCompletedToday(subs, challengeId) {
    return subs.some(s => s.challengeId === challengeId && s.submittedAt && s.submittedAt.slice(0, 10) === todayStr);
  }
  function challengeStatusHtml(ch, mySubs) {
    const isDaily = ch.repeatType === 'daily';
    if (isDaily) {
      const doneToday = isCompletedToday(mySubs, ch.id);
      if (doneToday) {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const resetStr = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<div class="sub-status-badge status-completed daily-done">
          ${IC.check} Completed Today — +${ch.xpReward} XP<br>
          <span class="daily-reset-note">${IC.repeat} Resets ${resetStr}</span>
        </div>`;
      }
      return `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`;
    } else {
      const mySub = mySubs.find(s => s.challengeId === ch.id);
      if (mySub) return `<div class="sub-status-badge status-completed">${IC.check} Challenge Complete — +${ch.xpReward} XP awarded!</div>`;
      return `<button class="btn btn-primary" data-submit="${ch.id}">Complete Challenge</button>`;
    }
  }

  const memberHeaderHtml = `<div class="feed-header"><h2 class="feed-title">Challenges</h2></div>`;

  let html;
  if (isOnCategoryGrid()) {
    html = memberHeaderHtml + renderCategoryGrid(myPersonal.length ? ['From Coach'] : []);
    if (mySubs.length) {
      html += `<div class="feed-section" style="margin-top:20px">
        <div class="feed-section-title">${IC.clipboard} My Submissions</div>
        <div class="sub-list">`;
      mySubs.slice().reverse().forEach(s => {
        const ch = challenges.find(c => c.id === s.challengeId) || { title: 'Challenge', xpReward: 0 };
        html += `<div class="sub-card status-${s.status}">
          ${s.photoUrl ? `<img src="${s.photoUrl}" class="sub-photo" alt="proof" />` : ''}
          <div class="sub-info">
            <div class="sub-challenge">${escHtml(ch.title)}</div>
            ${s.caption ? `<div class="sub-caption">"${escHtml(s.caption)}"</div>` : ''}
            <div class="sub-status-pill status-completed">${IC.check} Complete +${ch.xpReward} XP</div>
            <div class="sub-date">${new Date(s.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }
  } else if (challengeFilter === 'From Coach') {
    html = memberHeaderHtml + renderCategoryHeader();
    if (myPersonal.length) {
      html += `<div class="challenge-list" style="margin-top:12px">`;
      myPersonal.forEach(ch => { html += buildChallengeCard(ch, challengeStatusHtml(ch, mySubs), { coach: true }); });
      html += `</div>`;
    } else {
      html += `<div class="feed-empty">No personal challenges assigned yet.</div>`;
    }
  } else {
    const publicChs = applyFilter(challenges.filter(ch => !ch.assignedTo));
    html = memberHeaderHtml + renderCategoryHeader();
    if (!publicChs.length) {
      html += `<div class="feed-empty">No challenges in this category right now.</div>`;
    } else {
      html += `<div class="challenge-list" style="margin-top:12px">`;
      publicChs.forEach(ch => {
        const totalCompleted = submissions.filter(s => s.challengeId === ch.id && s.status === 'completed').length;
        html += buildChallengeCard(ch, challengeStatusHtml(ch, mySubs), { completedCount: totalCompleted });
      });
      html += `</div>`;
    }
  }

  el.innerHTML = html;
  bindChallengeFilterBar(el);
  bindChallengeCards(el);
  el.querySelectorAll('[data-submit]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openSubmitProofModal(btn.dataset.submit, profile); }));
}

// ── LIVE CALL ─────────────────────────────────
function renderLiveCallBanner() {
  let banner = document.getElementById('liveCallBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'liveCallBanner';
    banner.className = 'live-call-banner hidden';
    // Insert before the social feed section
    const feedSection = document.getElementById('socialFeedSection');
    if (feedSection) feedSection.parentNode.insertBefore(banner, feedSection);
  }

  if (!liveCall?.active) {
    banner.classList.add('hidden');
    return;
  }

  // Check if this user is invited
  const canEnd = isAdmin || isMentor;
  if (!liveCall.invitedAll && !canEnd) {
    const myProfile = brothers.find(b => b.email?.toLowerCase() === currentUser?.email?.toLowerCase());
    const invited = myProfile && liveCall.invitedBrothers?.includes(myProfile.id);
    if (!invited) {
      banner.classList.add('hidden');
      return;
    }
  }
  banner.innerHTML = `
    <div class="live-call-pulse"></div>
    <div class="live-call-info">
      <span class="live-call-label">Live Call</span>
      <span class="live-call-host">${escHtml(liveCall.startedByName || 'Coach')} started a Brotherhood Call</span>
    </div>
    <div class="live-call-actions">
      <button class="btn-join-call" id="joinCallBtn">Join</button>
      ${canEnd ? `<button class="btn-end-call" id="endCallBtn">End</button>` : ''}
    </div>`;
  banner.classList.remove('hidden');

  banner.querySelector('#joinCallBtn')?.addEventListener('click', () => {
    if (liveCall?.meetLink) window.open(liveCall.meetLink, '_blank');
  });
  banner.querySelector('#endCallBtn')?.addEventListener('click', endBrotherhoodCall);
}

function startBrotherhoodCall(hostProfile) {
  let sheet = document.getElementById('startCallSheet');
  if (sheet) sheet.remove();
  sheet = document.createElement('div');
  sheet.id = 'startCallSheet';
  sheet.className = 'start-call-sheet';

  // Track selected brother IDs; null = everyone
  const selectedIds = new Set();
  let inviteAll = true;

  const brotherList = brothers
    .filter(b => b.name)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const renderBrotherPicker = () => {
    const pickerEl = sheet.querySelector('#callBrotherPicker');
    if (!pickerEl) return;
    pickerEl.innerHTML = brotherList.map(b => {
      const sel = !inviteAll && selectedIds.has(b.id);
      const initials = (b.name || '?')[0].toUpperCase();
      return `<button class="call-brother-chip${sel ? ' selected' : ''}" data-brid="${b.id}">
        <span class="call-brother-avatar">${initials}</span>
        <span class="call-brother-name">${escHtml(b.name)}</span>
        ${sel ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </button>`;
    }).join('');
    pickerEl.querySelectorAll('[data-brid]').forEach(btn => {
      btn.addEventListener('click', () => {
        inviteAll = false;
        const id = btn.dataset.brid;
        if (selectedIds.has(id)) selectedIds.delete(id);
        else selectedIds.add(id);
        sheet.querySelector('#callAllToggle').classList.remove('active');
        renderBrotherPicker();
        updateGoLabel();
      });
    });
  };

  const updateGoLabel = () => {
    const goBtn = sheet.querySelector('#startCallGo');
    if (!goBtn) return;
    if (inviteAll) goBtn.textContent = `Go Live — All Brothers`;
    else if (selectedIds.size === 0) goBtn.textContent = `Select brothers above`;
    else goBtn.textContent = `Go Live — ${selectedIds.size} Brother${selectedIds.size > 1 ? 's' : ''}`;
  };

  sheet.innerHTML = `
    <div class="start-call-backdrop" id="startCallBackdrop"></div>
    <div class="start-call-panel">
      <div class="start-call-header">
        <span class="start-call-title">Start Brotherhood Call</span>
        <button class="start-call-close" id="startCallClose">${IC.xmark}</button>
      </div>
      <p class="start-call-hint">Open <strong>meet.google.com</strong>, start a new meeting, copy the link, and paste it below.</p>
      <input class="start-call-input" id="startCallLinkInput" placeholder="https://meet.google.com/abc-defg-hij" type="url" />
      <div class="call-invite-section">
        <div class="call-invite-label">Invite</div>
        <div class="call-invite-row">
          <button class="call-all-toggle active" id="callAllToggle">Everyone</button>
          <div class="call-brother-picker" id="callBrotherPicker"></div>
        </div>
      </div>
      <button class="btn btn-primary start-call-go" id="startCallGo">Go Live — All Brothers</button>
    </div>`;
  document.body.appendChild(sheet);

  renderBrotherPicker();

  sheet.querySelector('#callAllToggle').addEventListener('click', () => {
    inviteAll = true;
    selectedIds.clear();
    sheet.querySelector('#callAllToggle').classList.add('active');
    renderBrotherPicker();
    updateGoLabel();
  });

  const close = () => sheet.remove();
  sheet.querySelector('#startCallBackdrop').addEventListener('click', close);
  sheet.querySelector('#startCallClose').addEventListener('click', close);

  sheet.querySelector('#startCallGo').addEventListener('click', async () => {
    if (!inviteAll && selectedIds.size === 0) return;
    const link = sheet.querySelector('#startCallLinkInput').value.trim();
    if (!link || !link.startsWith('http')) {
      sheet.querySelector('#startCallLinkInput').focus();
      return;
    }
    const hostName = isAdmin ? 'Coach' : (hostProfile?.name || 'Mentor');
    const callData = {
      active: true,
      meetLink: link,
      startedByName: hostName,
      startedAt: Date.now(),
      invitedAll: inviteAll,
      invitedBrothers: inviteAll ? [] : [...selectedIds],
    };
    liveCall = callData;
    try {
      await setDoc(doc(db, 'feed', '_liveCall_'), callData);
    } catch (err) {
      console.error('startBrotherhoodCall error:', err);
      alert('Could not start call: ' + err.message);
      return;
    }
    sheet.remove();
    window.open(link, '_blank');
  });
}

async function endBrotherhoodCall() {
  await setDoc(doc(db, 'feed', '_liveCall_'), { active: false });
}

// ── SOCIAL FEED ───────────────────────────────
function renderSocialFeed() {
  const el = document.getElementById('socialFeedContainer');
  if (!el) return;

  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser?.email?.toLowerCase());

  const callActive = liveCall?.active;
  let html = `<div class="feed-header-wrap">
    <div class="feed-header">
      <h2 class="feed-title">Brotherhood Feed</h2>
      <div class="feed-header-actions">
        ${(isAdmin || isMentor) && !callActive ? `<button class="feed-action-icon" id="startCallBtn" title="Start Call"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></button>` : ''}
        ${(isAdmin || isMentor) ? `<button class="feed-action-icon" id="openPollBtn" title="Create Poll"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></button>` : ''}
        ${(isAdmin || isMentor) ? `<button class="feed-action-icon" id="openAnnouncementBtn" title="Post">${IC.megaphone}</button>` : ''}
      </div>
    </div>
    ${!isAdmin && profile ? `<button class="btn-share-stoke" id="openStokeBtn">Share Your Stoke</button>` : ''}
  </div>`;

  if (!feedPosts.length) {
    html += `<div class="feed-empty">No posts yet — complete a challenge to share your first win.</div>`;
    el.innerHTML = html;
    if (isAdmin || isMentor) bindAnnouncementBtn(el);
    document.getElementById('startCallBtn')?.addEventListener('click', () => startBrotherhoodCall(profile));
    return;
  }

  const visiblePosts = feedPosts.slice(0, feedDisplayCount);
  visiblePosts.forEach(post => {
    const ago = timeAgo(post.createdAt);
    const brother = brothers.find(b => b.id === post.brotherId);
    const icon = brother ? archetypeElementIcon(brother.primaryArchetype || brother.archetype, brother.dominantElement, brother.xp) : '';
    const commentCount = (post.comments || []).length;
    const commentLabel = commentCount ? `${commentCount}` : '';
    const mentorTag = (b) => b?.role === 'mentor' ? ' <span class="mentor-badge">Mentor</span>' : '';

    if (post.type === 'announcement') {
      const posterName = post.authorName || 'Coach';
      const posterBrother = post.authorId ? brothers.find(b => b.id === post.authorId) : null;
      const pArch = post.authorArchetype || posterBrother?.primaryArchetype || posterBrother?.archetype;
      const pElem = post.authorElement  || posterBrother?.dominantElement;
      const posterIconHtml = pArch
        ? archetypeElementIcon(pArch, pElem || null, posterBrother?.xp)
        : IC.megaphone;
      const canDelete  = isAdmin || (isMentor && post.authorId === profile?.id);
      const pinnedCh   = post.pinnedChallengeId ? challenges.find(c => c.id === post.pinnedChallengeId) : null;
      const myPinnedSub = pinnedCh ? submissions.find(s => s.challengeId === pinnedCh.id && s.brotherId === profile?.id) : null;
      html += `<div class="sf-post sf-announcement">
        <div class="sf-post-header">
          <div class="sf-avatar sf-avatar-coach">${posterIconHtml}</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">${escHtml(posterName)}${mentorTag(posterBrother)}</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${canDelete ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">${IC.xmark}</button>` : ''}
        </div>
        <div class="sf-announcement-text">${linkify(post.text || '')}</div>
        ${post.photoUrl ? `<img src="${post.photoUrl}" class="sf-photo sf-media-bleed" alt="" />` : ''}
        ${post.videoUrl ? `<video class="sf-video sf-media-bleed" src="${post.videoUrl}#t=0.001" controls playsinline preload="metadata"></video>` : ''}
        ${pinnedCh ? `<div class="sf-pinned-challenge">
          <div class="sf-pinned-label">${IC.pin} Pinned Challenge</div>
          <div class="sf-pinned-title">${escHtml(pinnedCh.title)}</div>
          ${pinnedCh.description ? `<div class="sf-pinned-desc">${escHtml(pinnedCh.description)}</div>` : ''}
          <div class="sf-pinned-xp">+${pinnedCh.xpReward} XP</div>
          ${myPinnedSub
            ? `<div class="sub-status-badge status-completed" style="margin-top:8px">${IC.check} Completed</div>`
            : `<button class="btn btn-primary sf-pinned-complete-btn" data-submit="${pinnedCh.id}">Complete Challenge</button>`}
        </div>` : ''}
        <div class="sf-post-footer">
          <button class="sf-comment-toggle" data-comment-toggle="${post.id}">${IC.comment}${commentLabel ? ` <span class="sf-comment-count">${commentLabel}</span>` : ''}</button>
        </div>
        <div class="sf-comments" data-post-id="${post.id}">
          ${renderComments(post.comments || [], profile)}
        </div>
        <div class="sf-comment-form hidden" data-comment-form="${post.id}">
          <input class="sf-comment-input" data-comment-post="${post.id}" placeholder="Add a comment…" maxlength="300" />
          <button class="sf-comment-send" data-comment-send="${post.id}">${IC.send}</button>
        </div>
      </div>`;
    } else if (post.type === 'poll') {
      const canDelete = isAdmin || (isMentor && post.authorId === profile?.id);
      const options   = post.options || [];
      const votes     = post.votes  || {};  // { optionIndex: [brotherId, ...] }
      const myVote    = Object.entries(votes).find(([, ids]) => ids.includes(profile?.id))?.[0];
      const totalVotes = Object.values(votes).reduce((s, ids) => s + ids.length, 0);
      const hasVoted  = myVote !== undefined;
      html += `<div class="sf-post sf-poll-post">
        <div class="sf-post-header">
          <div class="sf-avatar sf-avatar-coach">${IC.megaphone}</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">${escHtml(post.authorName || 'Coach')}${mentorTag(brothers.find(b => b.id === post.authorId))}</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${canDelete ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">${IC.xmark}</button>` : ''}
        </div>
        <div class="sf-poll-question">${escHtml(post.question || '')}</div>
        <div class="sf-poll-options">
          ${options.map((opt, i) => {
            const voteCount = (votes[i] || []).length;
            const pct       = totalVotes ? Math.round(voteCount / totalVotes * 100) : 0;
            const isMyVote  = String(i) === String(myVote);
            return hasVoted
              ? `<div class="sf-poll-result ${isMyVote ? 'sf-poll-result-mine' : ''}">
                  <div class="sf-poll-result-bar" style="width:${pct}%"></div>
                  <span class="sf-poll-result-label">${escHtml(opt)}</span>
                  <span class="sf-poll-result-pct">${pct}%</span>
                </div>`
              : `<button class="sf-poll-option-btn" data-poll="${post.id}" data-option="${i}">${escHtml(opt)}</button>`;
          }).join('')}
        </div>
        <div class="sf-poll-meta">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}${hasVoted ? ' · tap to see results' : ''}</div>
        <div class="sf-post-footer">
          <button class="sf-comment-toggle" data-comment-toggle="${post.id}">${IC.comment}${commentLabel ? ` <span class="sf-comment-count">${commentLabel}</span>` : ''}</button>
        </div>
        <div class="sf-comments" data-post-id="${post.id}">
          ${renderComments(post.comments || [], profile)}
        </div>
        <div class="sf-comment-form hidden" data-comment-form="${post.id}">
          <input class="sf-comment-input" data-comment-post="${post.id}" placeholder="Add a comment…" maxlength="300" />
          <button class="sf-comment-send" data-comment-send="${post.id}">${IC.send}</button>
        </div>
      </div>`;
    } else if (post.type === 'stoke') {
      const stokeLevel = post.stokeLevel ?? 100;
      const activityTag = post.activityTag || '';
      const tagline = post.tagline || '';
      html += `<div class="sf-post sf-stoke-post" data-post-id="${post.id}">
        <div class="sf-stoke-media-wrap">
          ${post.photoUrl ? `<img src="${post.photoUrl}" class="sf-stoke-photo" alt="" />` : ''}
          <div class="sf-stoke-overlay">
            ${tagline ? `<div class="sf-stoke-tagline">${escHtml(tagline)}</div>` : ''}
            <img src="/stoked-command-center/STOKED-WATERMARK.png" class="sf-stoke-watermark" alt="STOKED." />
            ${activityTag ? `<div class="sf-stoke-activity-tag">${escHtml(activityTag)}</div>` : ''}
          </div>
          <div class="sf-stoke-bar-wrap">
            <div class="sf-stoke-bar" style="width:${stokeLevel}%"></div>
          </div>
        </div>
        <div class="sf-post-header sf-stoke-meta">
          <div class="sf-avatar">${icon || escHtml((post.brotherName || '?')[0].toUpperCase())}</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">${escHtml(post.brotherName || 'Brother')}${mentorTag(brother)}</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${isAdmin ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">${IC.xmark}</button>` : ''}
        </div>
        <div class="sf-post-footer">
          <button class="sf-comment-toggle" data-comment-toggle="${post.id}">${IC.comment}${commentLabel ? ` <span class="sf-comment-count">${commentLabel}</span>` : ''}</button>
          <div class="sf-footer-right"><span class="sf-stoke-level-label">🔥 ${stokeLevel}%</span></div>
        </div>
        <div class="sf-comments" data-post-id="${post.id}">${renderComments(post.comments || [], profile)}</div>
        <div class="sf-comment-form hidden" data-comment-form="${post.id}">
          <input class="sf-comment-input" data-comment-post="${post.id}" placeholder="Add a comment…" maxlength="300" />
          <button class="sf-comment-send" data-comment-send="${post.id}">${IC.send}</button>
        </div>
      </div>`;
    } else if (post.type === 'friend_challenge_win') {
      html += `<div class="sf-post sf-friend-challenge-post">
        <div class="sf-post-header">
          <div class="sf-avatar">${icon || escHtml((post.brotherName || '?')[0].toUpperCase())}</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">${escHtml(post.brotherName || 'Brother')}${mentorTag(brother)}</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${isAdmin ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">${IC.xmark}</button>` : ''}
        </div>
        <div class="sf-win-banner sf-friend-challenge-banner">
          <span class="sf-win-label">⚡ Friend Challenge Complete</span>
        </div>
        <div class="sf-fc-context">
          <strong>${escHtml(post.challengerName)}</strong>&nbsp;challenged&nbsp;<strong>${escHtml(post.brotherName)}</strong>
        </div>
        <div class="sf-challenge-title">"${escHtml(post.description || '')}"</div>
        ${post.caption ? `<div class="sf-caption">${escHtml(post.caption)}</div>` : ''}
        ${post.photoUrl ? `<div class="sf-win-media-wrap sf-media-bleed">
          <img src="${post.photoUrl}" class="sf-photo" alt="proof" />
          <div class="sf-win-overlay" aria-hidden="true">
            <div class="sf-win-overlay-text">CHALLENGE<br>COMPLETED</div>
          </div>
        </div>` : ''}
        ${post.videoUrl ? `<div class="sf-win-media-wrap sf-media-bleed">
          <video class="sf-video" src="${post.videoUrl}#t=0.001" controls playsinline preload="metadata"></video>
          <div class="sf-win-overlay" aria-hidden="true">
            <div class="sf-win-overlay-text">CHALLENGE<br>COMPLETED</div>
          </div>
        </div>` : ''}
        ${post.proofLink ? `<a class="sf-link" href="${escHtml(post.proofLink)}" target="_blank" rel="noopener">${IC.link} ${escHtml(post.proofLink)}</a>` : ''}
        <div class="sf-post-footer">
          <button class="sf-comment-toggle" data-comment-toggle="${post.id}">${IC.comment}${commentLabel ? ` <span class="sf-comment-count">${commentLabel}</span>` : ''}</button>
          <span class="sf-xp-badge">+${post.xpAwarded} XP</span>
        </div>
        <div class="sf-comments" data-post-id="${post.id}">${renderComments(post.comments || [], profile)}</div>
        <div class="sf-comment-form hidden" data-comment-form="${post.id}">
          <input class="sf-comment-input" data-comment-post="${post.id}" placeholder="Add a comment…" maxlength="300" />
          <button class="sf-comment-send" data-comment-send="${post.id}">${IC.send}</button>
        </div>
      </div>`;
    } else {
      const tagColor = post.challengeTag && CHALLENGE_TAGS[post.challengeTag] ? CHALLENGE_TAGS[post.challengeTag].color : '#888';
      const feedCh = post.challengeId ? challenges.find(c => c.id === post.challengeId) : null;
      const todayStrFeed = new Date().toISOString().slice(0, 10);
      const alreadyDone = post.challengeId && profile
        ? (feedCh?.repeatType === 'daily'
            ? submissions.find(s => s.challengeId === post.challengeId && s.brotherId === profile.id && s.submittedAt?.slice(0,10) === todayStrFeed)
            : submissions.find(s => s.challengeId === post.challengeId && s.brotherId === profile.id))
        : null;
      html += `<div class="sf-post">
        <div class="sf-post-header">
          <div class="sf-avatar">${icon || escHtml((post.brotherName || '?')[0].toUpperCase())}</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">${escHtml(post.brotherName || 'Brother')}${mentorTag(brother)}</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${isAdmin ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">${IC.xmark}</button>` : ''}
        </div>
        <div class="sf-win-banner">
          <span class="sf-win-label">${IC.check} Challenge Complete</span>
          ${post.challengeTag ? `<span class="sf-tag-pill" style="background:${tagColor}22;color:${tagColor};border-color:${tagColor}44">${post.challengeTag}</span>` : ''}
        </div>
        <div class="sf-challenge-title">${escHtml(post.challengeTitle || '')}</div>
        ${post.caption ? `<div class="sf-caption">${escHtml(post.caption)}</div>` : ''}
        ${(post.photoUrl || post.photoUrl2) ? `<div class="sf-win-media-wrap sf-media-bleed">
          ${post.photoUrl  ? `<img src="${post.photoUrl}"  class="sf-photo" alt="proof" />` : ''}
          ${post.photoUrl2 ? `<img src="${post.photoUrl2}" class="sf-photo" alt="proof 2" />` : ''}
          <div class="sf-win-overlay" aria-hidden="true">
            <div class="sf-win-overlay-text">CHALLENGE<br>COMPLETED</div>
          </div>
        </div>` : ''}
        ${post.videoUrl ? `<div class="sf-win-media-wrap sf-media-bleed">
          <video class="sf-video" src="${post.videoUrl}#t=0.001" controls playsinline preload="metadata"></video>
          <div class="sf-win-overlay" aria-hidden="true">
            <div class="sf-win-overlay-text">CHALLENGE<br>COMPLETED</div>
          </div>
        </div>` : ''}
        ${post.audioUrl ? `<audio class="sf-audio" controls src="${post.audioUrl}"></audio>` : ''}
        ${post.proofLink ? `<a class="sf-link" href="${escHtml(post.proofLink)}" target="_blank" rel="noopener">${IC.link} ${escHtml(post.proofLink)}</a>` : ''}
        <div class="sf-post-footer">
          <button class="sf-comment-toggle" data-comment-toggle="${post.id}">${IC.comment}${commentLabel ? ` <span class="sf-comment-count">${commentLabel}</span>` : ''}</button>
          <div class="sf-footer-right">
            <span class="sf-xp-badge">+${post.xpAwarded} XP</span>
            ${alreadyDone
              ? `<span class="sf-already-done">${IC.check} Done</span>`
              : (post.challengeId ? `<button class="sf-complete-too-btn btn btn-ghost btn-sm" data-submit="${post.challengeId}">Complete too</button>` : '')}
          </div>
        </div>
        <div class="sf-comments" data-post-id="${post.id}">
          ${renderComments(post.comments || [], profile)}
        </div>
        <div class="sf-comment-form hidden" data-comment-form="${post.id}">
          <input class="sf-comment-input" data-comment-post="${post.id}" placeholder="Add a comment…" maxlength="300" />
          <button class="sf-comment-send" data-comment-send="${post.id}">${IC.send}</button>
        </div>
      </div>`;
    }
  });

  if (feedPosts.length > feedDisplayCount) {
    html += `<button class="btn-load-more-feed" id="loadMoreFeedBtn">Load more posts</button>`;
  }

  el.innerHTML = html;
  if (isAdmin || isMentor) bindAnnouncementBtn(el);

  document.getElementById('startCallBtn')?.addEventListener('click', () => startBrotherhoodCall(profile));
  document.getElementById('openStokeBtn')?.addEventListener('click', () => openStokeSheet(profile));
  document.getElementById('openPollBtn')?.addEventListener('click', () => openModal(document.getElementById('pollModal')));

  document.getElementById('loadMoreFeedBtn')?.addEventListener('click', loadMoreFeedPosts);

  // Tap feed photo to open fullscreen (overlay-free)
  el.querySelectorAll('.sf-win-media-wrap').forEach(wrap => {
    wrap.addEventListener('click', e => {
      if (e.target.closest('video') || e.target.closest('.sf-win-overlay')) {
        // clicking overlay itself also opens lightbox; video handles itself
        if (e.target.closest('video')) return;
      }
      const img = wrap.querySelector('.sf-photo');
      if (img) {
        const imgs = Array.from(wrap.querySelectorAll('.sf-photo'));
        openPhotoLightbox(imgs[0].src, null, '', '', 0, imgs[1]?.src || null, null);
      }
    });
  });
  el.querySelectorAll('.sf-photo:not(.sf-win-media-wrap .sf-photo)').forEach(img => {
    img.addEventListener('click', () => {
      const wrap = img.closest('.sf-photos-wrap');
      const imgs = wrap ? Array.from(wrap.querySelectorAll('.sf-photo')) : [img];
      openPhotoLightbox(img.src, null, '', '', 0, imgs[1]?.src || null, null);
    });
  });

  // Poll vote buttons
  el.querySelectorAll('[data-poll]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!profile) return;
      const postId = btn.dataset.poll;
      const optionIdx = btn.dataset.option;
      const post = feedPosts.find(p => p.id === postId);
      if (!post) return;
      const votes = { ...(post.votes || {}) };
      // Remove any existing vote by this user
      Object.keys(votes).forEach(k => {
        votes[k] = (votes[k] || []).filter(id => id !== profile.id);
      });
      votes[optionIdx] = [...(votes[optionIdx] || []), profile.id];
      await updateDoc(doc(db, 'feed', postId), { votes });
    });
  });

  // Delete post buttons
  el.querySelectorAll('[data-delete-post]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return;
      await deleteDoc(doc(db, 'feed', btn.dataset.deletePost));
    });
  });

  // Complete challenge buttons (pinned on post, and "complete this too" on win posts)
  el.querySelectorAll('[data-submit]').forEach(btn => {
    btn.addEventListener('click', () => openSubmitProofModal(btn.dataset.submit, profile));
  });

  // Comment toggle buttons — reveal/hide the comment input
  el.querySelectorAll('[data-comment-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.commentToggle;
      const form = el.querySelector(`[data-comment-form="${postId}"]`);
      if (!form) return;
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        form.querySelector('input')?.focus();
      }
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

  // Admin: delete individual comments
  if (isAdmin) {
    el.querySelectorAll('[data-comment-del-idx]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postDiv = btn.closest('[data-post-id]');
        if (!postDiv) return;
        const postId = postDiv.dataset.postId;
        const idx    = parseInt(btn.dataset.commentDelIdx, 10);
        const post   = feedPosts.find(p => p.id === postId);
        if (!post) return;
        btn.disabled = true;
        const updated = (post.comments || []).filter((_, i) => i !== idx);
        await updateDoc(doc(db, 'feed', postId), { comments: updated });
      });
    });

    // Admin: clear ALL comments on a post
    el.querySelectorAll('[data-clear-comments]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postDiv = btn.closest('[data-post-id]');
        if (!postDiv) return;
        const postId = postDiv.dataset.postId;
        if (!confirm('Remove ALL comments on this post?')) return;
        btn.disabled = true;
        await updateDoc(doc(db, 'feed', postId), { comments: [] });
      });
    });
  }
}

function loadMoreFeedPosts() {
  feedDisplayCount += 10;
  renderSocialFeed();
}

function renderComments(comments, profile) {
  if (!comments || !comments.length) return '';
  const clearAll = isAdmin
    ? `<button class="sf-comments-clear-all" data-clear-comments>Clear all comments</button>`
    : '';
  const rows = comments.map((c, i) => `
    <div class="sf-comment" data-comment-idx="${i}">
      <span class="sf-comment-author">${escHtml(c.authorName || 'Brother')}</span>
      <span class="sf-comment-text">${escHtml(c.text || '')}</span>
      ${isAdmin ? `<button class="sf-comment-delete" data-comment-del-idx="${i}" title="Remove comment">×</button>` : ''}
    </div>`).join('');
  return clearAll + rows;
}

async function postComment(postId, el, profile) {
  const input = el.querySelector(`[data-comment-post="${postId}"]`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const post = feedPosts.find(p => p.id === postId);
  if (!post) return;

  // Rate limit: max 3 comments per user per post (admins exempt)
  if (!isAdmin && profile) {
    const myComments = (post.comments || []).filter(c => c.authorName === (profile.name || 'Brother'));
    if (myComments.length >= 3) {
      showToast('Max 3 comments per post', 'error');
      return;
    }
  }

  const authorName = isAdmin ? 'Coach' : (profile?.name || 'Brother');
  const updated = [...(post.comments || []), { authorName, text, createdAt: Date.now() }];
  input.value = '';
  await updateDoc(doc(db, 'feed', postId), { comments: updated });
}

const STOKE_ACTIVITY_TAGS = ['SURFED','HIKED','TRAINED','BUILT','PLAYED','TRAVELED','SKIED','DROVE','CLIMBED','SHOT'];

async function openStokeSheet(profile) {
  // Check daily limit using lastStokeDate stored on the brother doc (always in sync via onSnapshot)
  const today = new Date().toDateString();
  if (profile?.lastStokeDate && new Date(profile.lastStokeDate).toDateString() === today) {
    alert('You already shared your stoke today — come back tomorrow!');
    return;
  }

  const existing = document.getElementById('stokeSheet');
  if (existing) { existing.remove(); return; }

  const sheet = document.createElement('div');
  sheet.id = 'stokeSheet';
  sheet.className = 'stoke-sheet';
  sheet.innerHTML = `
    <div class="stoke-sheet-backdrop"></div>
    <div class="stoke-sheet-panel">
      <div class="stoke-sheet-header">
        <span class="stoke-sheet-title">Share Your Stoke</span>
        <button class="stoke-sheet-close" id="stokeSheetClose">✕</button>
      </div>

      <div class="stoke-photo-preview-wrap" id="stokePhotoPreview">
        <label class="stoke-photo-upload-label" for="stokePhotoInput">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>Tap to add photo</span>
        </label>
        <input type="file" id="stokePhotoInput" accept="image/*" style="display:none" />
      </div>

      <input class="stoke-tagline-input" id="stokeTagline" placeholder="Short tagline… (max 6 words)" maxlength="60" />

      <div class="stoke-section-label">What are you doing?</div>
      <div class="stoke-activity-tags">
        ${STOKE_ACTIVITY_TAGS.map(t => `<button class="stoke-activity-chip" data-tag="${t}">${t}</button>`).join('')}
      </div>

      <div class="stoke-section-label">Stoke Level <span id="stokeLevelVal">100</span>%</div>
      <input type="range" class="stoke-level-slider" id="stokeLevelSlider" min="0" max="100" value="100" />

      <button class="stoke-submit-btn" id="stokeSubmitBtn">🔥 Post Your Stoke</button>
    </div>`;

  document.body.appendChild(sheet);

  // Photo preview
  const photoInput = sheet.querySelector('#stokePhotoInput');
  const previewWrap = sheet.querySelector('#stokePhotoPreview');
  let photoFile = null;
  photoInput.addEventListener('change', () => {
    photoFile = photoInput.files[0];
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    previewWrap.innerHTML = `<img src="${url}" class="stoke-preview-img" /><label class="stoke-change-photo" for="stokePhotoInput2">Change</label><input type="file" id="stokePhotoInput2" accept="image/*" style="display:none" />`;
    previewWrap.querySelector('#stokePhotoInput2')?.addEventListener('change', e => {
      photoFile = e.target.files[0];
      if (photoFile) previewWrap.querySelector('img').src = URL.createObjectURL(photoFile);
    });
  });

  // Tagline word limit
  const taglineInput = sheet.querySelector('#stokeTagline');
  taglineInput.addEventListener('input', () => {
    const words = taglineInput.value.trim().split(/\s+/).filter(Boolean);
    if (words.length > 6) taglineInput.value = words.slice(0, 6).join(' ');
  });

  // Activity tag selection
  let selectedTag = '';
  sheet.querySelectorAll('.stoke-activity-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sheet.querySelectorAll('.stoke-activity-chip').forEach(c => c.classList.remove('active'));
      if (selectedTag === chip.dataset.tag) { selectedTag = ''; } else {
        chip.classList.add('active');
        selectedTag = chip.dataset.tag;
      }
    });
  });

  // Stoke level
  const slider = sheet.querySelector('#stokeLevelSlider');
  const valLabel = sheet.querySelector('#stokeLevelVal');
  slider.addEventListener('input', () => { valLabel.textContent = slider.value; });

  // Close
  sheet.querySelector('#stokeSheetClose').addEventListener('click', () => sheet.remove());
  sheet.querySelector('.stoke-sheet-backdrop').addEventListener('click', () => sheet.remove());

  // Submit
  sheet.querySelector('#stokeSubmitBtn').addEventListener('click', async () => {
    const btn = sheet.querySelector('#stokeSubmitBtn');
    if (!photoFile) { alert('Add a photo first!'); return; }
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    try {
      const photoUrl = await uploadPhoto(photoFile, `feed/stoke_${Date.now()}_${photoFile.name}`);
      await addDoc(collection(db, 'feed'), {
        type:        'stoke',
        brotherId:   profile.id,
        brotherName: profile.name,
        photoUrl,
        tagline:     taglineInput.value.trim(),
        activityTag: selectedTag,
        stokeLevel:  parseInt(slider.value),
        comments:    [],
        createdAt:   Date.now(),
      });
      // Update stoke streak on brother doc
      const lastDate = profile.lastStokeDate;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const streakContinues = lastDate && new Date(lastDate).toDateString() === yesterday.toDateString();
      const newStreak = streakContinues ? (profile.stokeStreak || 0) + 1 : 1;
      await updateDoc(doc(db, 'brothers', profile.id), {
        lastStokeDate: Date.now(),
        stokeStreak:   newStreak,
      });
      sheet.remove();
    } catch(e) {
      btn.disabled = false;
      btn.textContent = '🔥 Post Your Stoke';
      alert('Could not post: ' + e.message);
    }
  });
}

function bindAnnouncementBtn(el) {
  const btn = el.querySelector('#openAnnouncementBtn');
  if (btn) btn.addEventListener('click', () => {
    // Populate challenge picker with public challenges
    const sel = document.getElementById('announcementPinChallenge');
    sel.innerHTML = '<option value="">— No pinned challenge —</option>';
    challenges.filter(c => !c.assignedTo).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.title} (+${c.xpReward} XP)`;
      sel.appendChild(opt);
    });
    openModal(document.getElementById('announcementModal'));
  });
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

// ── DAILY CHALLENGE ───────────────────────────

function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // "2026-07-17"
}

function isDailyChallengeCompleted(b) {
  return b.dailyChallengeCompletedDate === getTodayStr();
}

// Shared HTML block for displaying a challenge on any card
function dailyChallengeCardHtml(b, isOwn) {
  const text  = b.dailyChallenge || '';
  const done  = isDailyChallengeCompleted(b);
  const clr   = ARCHETYPE_COLORS[b.primaryArchetype || b.archetype] || { icon: 'var(--orange)', glow: 'transparent' };

  if (!text && !isOwn) return '';   // other brothers with no challenge set: skip

  return `<div class="dc-block${done ? ' dc-done' : ''}${isOwn ? ' dc-own' : ''}" style="--dc-clr:${clr.icon}">
    <div class="dc-header">
      <span class="dc-label">DAILY CHALLENGE</span>
      <span class="dc-badge${done ? ' dc-badge-done' : ' dc-badge-pending'}">${done ? '✓ Done · +50 XP' : 'Pending'}</span>
    </div>
    ${text
      ? `<div class="dc-text">${escHtml(text)}</div>`
      : `<div class="dc-empty">No challenge set for today.</div>`}
    ${isOwn ? `<div class="dc-actions">
      <button class="dc-btn-set" data-dc-set="1">${text ? 'Edit' : 'Set Challenge'}</button>
      ${text && !done ? `<button class="dc-btn-complete" data-dc-complete="1">✓ Mark Done — +50 XP</button>` : ''}
    </div>` : ''}
  </div>`;
}

// Lightweight badge for roster list
function dailyChallengeRosterBadge(b) {
  if (!b.dailyChallenge) return '';
  const done = isDailyChallengeCompleted(b);
  return `<span class="dc-roster-badge${done ? ' dc-roster-done' : ''}" title="${escHtml(b.dailyChallenge)}">${done ? '✓' : '◎'} Daily</span>`;
}

// Modal for setting / editing the challenge
function openDailyChallengeModal(profile) {
  let overlay = document.getElementById('dcModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dcModal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="dcModalTitle">
        <div class="modal-header">
          <h2 class="modal-title" id="dcModalTitle">Daily Challenge</h2>
          <button class="modal-close" id="dcModalClose" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <p class="dc-modal-sub">Set one commitment you will complete today. It resets at midnight and is worth <strong>+50 XP</strong> when done.</p>
          <div class="form-group">
            <label class="form-label" for="dcInput">Your challenge</label>
            <textarea id="dcInput" class="form-control" rows="3" maxlength="200" placeholder="e.g. 100 push-ups before noon. No phone until 10am. Cold shower."></textarea>
            <div class="dc-char-count"><span id="dcCharCount">0</span> / 200</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="dcCancelBtn">Cancel</button>
          <button class="btn btn-primary" id="dcSaveBtn">Save Challenge</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('dcModalClose').addEventListener('click', () => closeModal(overlay));
    document.getElementById('dcCancelBtn').addEventListener('click', () => closeModal(overlay));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });

    const input = document.getElementById('dcInput');
    const counter = document.getElementById('dcCharCount');
    input.addEventListener('input', () => { counter.textContent = input.value.length; });
  }

  const input = document.getElementById('dcInput');
  const counter = document.getElementById('dcCharCount');
  input.value = profile.dailyChallenge || '';
  counter.textContent = input.value.length;

  const saveBtn = document.getElementById('dcSaveBtn');
  const newSave = saveBtn.cloneNode(true);
  saveBtn.replaceWith(newSave);
  newSave.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) { showToast('Enter your challenge first.', 'info'); return; }
    newSave.disabled = true;
    newSave.textContent = 'Saving…';
    try {
      await updateDoc(doc(db, 'brothers', profile.id), { dailyChallenge: text });
      profile.dailyChallenge = text;
      closeModal(overlay);
      showToast('Daily challenge set. Now go do it.', 'success');
      renderMemberView();
    } catch (err) {
      showToast('Could not save — check connection.', 'info');
    } finally {
      newSave.disabled = false;
      newSave.textContent = 'Save Challenge';
    }
  });

  openModal(overlay);
  setTimeout(() => input.focus(), 100);
}

async function completeDailyChallenge(profile) {
  if (isDailyChallengeCompleted(profile)) return;
  if (!profile.dailyChallenge) { showToast('Set your challenge first.', 'info'); return; }
  const newXp = Math.min(MAX_XP, (profile.xp || 0) + 50);
  try {
    await updateDoc(doc(db, 'brothers', profile.id), {
      dailyChallengeCompletedDate: getTodayStr(),
      xp: newXp,
    });
    profile.dailyChallengeCompletedDate = getTodayStr();
    profile.xp = newXp;
    showToast('Daily challenge complete! +50 XP', 'success');
    renderMemberView();
  } catch (err) {
    showToast('Could not save — check connection.', 'info');
  }
}

// ── FRIEND CHALLENGES ─────────────────────────

function openFriendChallengeModal(profile) {
  const othBrothers = brothers.filter(b => b.id !== profile.id && b.name);

  let overlay = document.getElementById('fcModal');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'fcModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-sm" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">⚡ Challenge a Brother</h2>
        <button class="modal-close" id="fcModalClose">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Who are you challenging?</label>
          <select id="fcTarget" class="form-control">
            <option value="">— pick a brother —</option>
            ${othBrothers.map(b => `<option value="${b.id}">${escHtml(b.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">The challenge</label>
          <textarea id="fcDesc" class="form-control" rows="3" maxlength="200" placeholder="e.g. 50 push-ups before midnight"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">XP reward</label>
          <select id="fcXp" class="form-control">
            <option value="25">25 XP</option>
            <option value="50" selected>50 XP</option>
            <option value="100">100 XP</option>
            <option value="150">150 XP</option>
            <option value="200">200 XP</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="fcCancelBtn">Cancel</button>
        <button class="btn btn-primary" id="fcSendBtn">Send Challenge ⚡</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('fcModalClose').addEventListener('click', () => closeModal(overlay));
  document.getElementById('fcCancelBtn').addEventListener('click', () => closeModal(overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });

  document.getElementById('fcSendBtn').addEventListener('click', async () => {
    const toUid = document.getElementById('fcTarget').value;
    const desc  = document.getElementById('fcDesc').value.trim();
    const xp    = parseInt(document.getElementById('fcXp').value);
    if (!toUid) { showToast('Pick a brother first.', 'info'); return; }
    if (!desc)  { showToast('Write the challenge first.', 'info'); return; }
    const toProfile = brothers.find(b => b.id === toUid);
    const btn = document.getElementById('fcSendBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await addDoc(collection(db, 'friendChallenges'), {
        fromUid:   profile.id,
        fromName:  profile.name,
        fromEmail: profile.email?.toLowerCase() || '',
        toUid,
        toName:    toProfile?.name || 'Brother',
        toEmail:   toProfile?.email?.toLowerCase() || '',
        description: desc,
        xp,
        status:    'pending',
        createdAt: Date.now(),
      });
      closeModal(overlay);
      showToast(`Challenge sent to ${toProfile?.name || 'Brother'}! ⚡`, 'success');
    } catch (err) {
      console.error('friendChallenge send error:', err);
      showToast('Error: ' + (err.message || err.code || 'unknown'), 'info');
      btn.disabled = false;
      btn.textContent = 'Send Challenge ⚡';
    }
  });

  openModal(overlay);
}

async function completeFriendChallenge(fcId, profile) {
  const fc = activeFriendChallenges.find(c => c.id === fcId);
  if (!fc) return;

  // Open proof modal
  let overlay = document.getElementById('fcProofModal');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'fcProofModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-sm" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">Complete Challenge</h2>
        <button class="modal-close" id="fcProofClose">✕</button>
      </div>
      <div class="modal-body">
        <div class="fc-proof-challenge-text">"${escHtml(fc.description)}"</div>
        <p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px">Upload proof — photo, video, or a link.</p>
        <div class="form-group">
          <label class="form-label">Photo / Video</label>
          <input type="file" id="fcProofFile" accept="image/*,video/*" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label">or Link (YouTube, etc.)</label>
          <input type="url" id="fcProofLink" class="form-control" placeholder="https://…">
        </div>
        <div class="form-group">
          <label class="form-label">Caption (optional)</label>
          <input type="text" id="fcProofCaption" class="form-control" maxlength="200" placeholder="Say something…">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="fcProofCancel">Cancel</button>
        <button class="btn btn-primary" id="fcProofSubmit">Submit Proof ⚡</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('fcProofClose').addEventListener('click', () => closeModal(overlay));
  document.getElementById('fcProofCancel').addEventListener('click', () => closeModal(overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });

  document.getElementById('fcProofSubmit').addEventListener('click', async () => {
    const file    = document.getElementById('fcProofFile').files[0];
    const link    = document.getElementById('fcProofLink').value.trim();
    const caption = document.getElementById('fcProofCaption').value.trim();
    if (!file && !link) { showToast('Add a photo, video, or link.', 'info'); return; }

    const btn = document.getElementById('fcProofSubmit');
    btn.disabled = true;
    btn.textContent = 'Uploading…';

    try {
      let photoUrl = null;
      let videoUrl = null;
      if (file) {
        const isVideo = file.type.startsWith('video/');
        if (isVideo) {
          btn.textContent = 'Uploading video…';
          videoUrl = await uploadVideo(file, `friendChallenges/${fcId}_${Date.now()}_${file.name}`,
            pct => { btn.textContent = `Uploading video ${pct}%…`; });
        } else {
          btn.textContent = 'Uploading…';
          photoUrl = await uploadPhoto(file, `friendChallenges/${fcId}_${Date.now()}_${file.name}`);
        }
      }

      // Award XP
      const newXp = Math.min(MAX_XP, (profile.xp || 0) + fc.xp);
      await updateDoc(doc(db, 'brothers', profile.id), { xp: newXp });

      // Mark challenge completed
      await updateDoc(doc(db, 'friendChallenges', fcId), {
        status: 'completed',
        completedAt: Date.now(),
        photoUrl:  photoUrl || null,
        videoUrl:  videoUrl || null,
        proofLink: link || null,
      });

      // Post to feed
      await addDoc(collection(db, 'feed'), {
        type:           'friend_challenge_win',
        brotherId:      profile.id,
        brotherName:    profile.name,
        challengerId:   fc.fromUid,
        challengerName: fc.fromName,
        description:    fc.description,
        xpAwarded:      fc.xp,
        photoUrl:       photoUrl || null,
        videoUrl:       videoUrl || null,
        proofLink:      link || null,
        caption:        caption || null,
        comments:       [],
        createdAt:      Date.now(),
      });

      closeModal(overlay);
      showToast(`Challenge complete! +${fc.xp} XP 🔥`, 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'info');
      btn.disabled = false;
      btn.textContent = 'Submit Proof ⚡';
    }
  });

  openModal(overlay);
}

async function dismissFriendChallenge(fcId) {
  const confirmed = await showConfirm('Decline this challenge? This can\'t be undone.');
  if (!confirmed) return;
  try {
    await updateDoc(doc(db, 'friendChallenges', fcId), { status: 'declined' });
  } catch (err) {
    showToast('Could not remove — try again.', 'info');
  }
}

function showConfirm(message) {
  return new Promise(resolve => {
    let overlay = document.getElementById('confirmModal');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'confirmModal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-sm confirm-modal" role="dialog" aria-modal="true">
        <div class="modal-body" style="padding:24px 20px 8px">
          <p class="confirm-msg">${escHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirmNo">Cancel</button>
          <button class="btn btn-danger" id="confirmYes">Yes, remove it</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    const cleanup = (result) => {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      overlay.remove();
      resolve(result);
    };
    document.getElementById('confirmYes').addEventListener('click', () => cleanup(true));
    document.getElementById('confirmNo').addEventListener('click',  () => cleanup(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });
  });
}

// ── ROSTER (member view of all brothers) ──────
// ── GLOBE / MY PATH ───────────────────────────

let globePathTab      = 'globe';  // 'globe' | 'mypath'
let globeSelectedArch = null;
let globeScale        = 1;
let globeTranslateX   = 0;
let globeTranslateY   = 0;
let globeDragMoved    = false;

const ARCHETYPE_VIRTUE = {
  Warrior:      'Courage',
  Monk:         'Discipline',
  Creator:      'Expression',
  Explorer:     'Curiosity',
  Builder:      'Perseverance',
  Protector:    'Loyalty',
  Visionary:    'Intuition',
};

const ARCHETYPE_GLOBE_MISSION = {
  Warrior:      'Complete one difficult action before you feel ready.',
  Monk:         'Eliminate one distraction this week. Go deeper into what matters.',
  Creator:      'Finish one thing you started. Ship it before it is perfect.',
  Explorer:     'Step into unfamiliar territory. Report back what you found.',
  Builder:      'Show up to your highest-priority habit every day this week.',
  Protector:    'Check in on one brother who has gone quiet.',
  Visionary:    'Write down one idea that feels too big. Then take the first step.',
};

function computeGlobeStats() {
  const stats = {};
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const arch of ARCHETYPE_ORDER) {
    stats[arch] = { memberCount: 0, totalXp: 0, activeThisWeek: 0, challengesCompleted: 0, avgLevel: 0, momentum: 0, recentMembers: [], _levels: [] };
  }
  for (const b of brothers) {
    const arch = b.primaryArchetype || b.archetype;
    if (!arch || !stats[arch]) continue;
    const s = stats[arch];
    s.memberCount++;
    s.totalXp += b.xp || 0;
    if (b.lastSeen && new Date(b.lastSeen).getTime() > weekAgo) s.activeThisWeek++;
    for (const val of Object.values(b.pathProgress || {})) {
      if (val?.completedAt) s.challengesCompleted++;
    }
    s._levels.push(getLevelInfo(b.xp || 0).current.level);
    if (s.recentMembers.length < 3) s.recentMembers.push({ name: b.name, xp: b.xp || 0, element: b.dominantElement, arch });
  }
  for (const arch of ARCHETYPE_ORDER) {
    const s = stats[arch];
    s.avgLevel = s._levels.length ? +( s._levels.reduce((a, v) => a + v, 0) / s._levels.length).toFixed(1) : 0;
    s.momentum = s.memberCount ? Math.round((s.activeThisWeek / s.memberCount) * 100) : 0;
    delete s._levels;
  }
  return stats;
}

function computeBrotherhoodTotals(stats) {
  let totalXp = 0, activeThisWeek = 0, challengesCompleted = 0;
  for (const s of Object.values(stats)) {
    totalXp          += s.totalXp;
    activeThisWeek   += s.activeThisWeek;
    challengesCompleted += s.challengesCompleted;
  }
  const totalBrothers = brothers.length;
  return {
    totalBrothers,
    totalXp,
    activeThisWeek,
    challengesCompleted,
    weeklyActivityPct: totalBrothers ? Math.round(activeThisWeek / totalBrothers * 100) : 0,
  };
}

function renderGlobeNodeHtml(arch, idx, stats, userArch) {
  const n = ARCHETYPE_ORDER.length;
  const angle = (idx / n * 360 - 90) * Math.PI / 180;
  const R = 45;
  const cx = (50 + R * Math.cos(angle)).toFixed(2);
  const cy = (50 + R * Math.sin(angle)).toFixed(2);
  const s    = stats[arch];
  const aClr = ARCHETYPE_COLORS[arch] || { icon: '#888', glow: 'transparent' };
  const isMine = arch === userArch;
  const iconSrc = `/stoked-command-center/${arch.toLowerCase()}-icon.png`;
  return `<div class="globe-node${isMine ? ' globe-node-mine' : ''}"
      data-arch="${escHtml(arch)}"
      style="left:${cx}%;top:${cy}%;--node-clr:${aClr.icon}"
      tabindex="0" role="button"
      aria-label="${escHtml(arch)} archetype, ${s.memberCount} member${s.memberCount !== 1 ? 's' : ''}">
    <div class="globe-node-ring" style="border-color:${aClr.icon};${isMine ? `box-shadow:0 0 0 2px ${aClr.icon}40,0 0 12px ${aClr.icon}40` : ''}">
      <img src="${iconSrc}" alt="${escHtml(arch)}" class="globe-node-img">
      <span class="globe-node-count">${s.memberCount}</span>
    </div>
    <div class="globe-node-label">${arch.slice(0, 5).toUpperCase()}</div>
    ${isMine ? `<div class="globe-node-mine-dot" style="background:${aClr.icon}"></div>` : ''}
  </div>`;
}

function renderGlobeStatsCommunity(totals) {
  const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
  return `
    <div class="globe-stats-eyebrow">Brotherhood</div>
    <div class="globe-stats-heading">ONE BROTHERHOOD</div>
    <div class="globe-stat-grid">
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${totals.totalBrothers}</span>
        <span class="globe-stat-lbl">Brothers</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${fmt(totals.totalXp)}</span>
        <span class="globe-stat-lbl">Total XP</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${totals.activeThisWeek}</span>
        <span class="globe-stat-lbl">Active / Week</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${totals.challengesCompleted}</span>
        <span class="globe-stat-lbl">Missions Done</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${totals.weeklyActivityPct}%</span>
        <span class="globe-stat-lbl">Weekly Activity</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">12</span>
        <span class="globe-stat-lbl">Paths</span>
      </div>
    </div>
    <div class="globe-stats-hint">Select an archetype to explore its circle</div>`;
}

function renderGlobeStatsArch(arch, s, aClr) {
  const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
  const sym = ARCHETYPE_CHALLENGES[arch]?.symbol || '';
  return `
    <div class="globe-stats-eyebrow">Archetype</div>
    <div class="globe-stats-heading" style="color:${aClr.icon}">${escHtml(sym)} ${escHtml(arch).toUpperCase()}</div>
    <div class="globe-stat-grid">
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${s.memberCount}</span>
        <span class="globe-stat-lbl">Members</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${fmt(s.totalXp)}</span>
        <span class="globe-stat-lbl">Total XP</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${s.activeThisWeek}</span>
        <span class="globe-stat-lbl">Active / Week</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${s.challengesCompleted}</span>
        <span class="globe-stat-lbl">Missions Done</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${s.avgLevel}</span>
        <span class="globe-stat-lbl">Avg Level</span>
      </div>
      <div class="globe-stat-cell">
        <span class="globe-stat-val">${s.momentum}%</span>
        <span class="globe-stat-lbl">Momentum</span>
      </div>
    </div>
    <div class="globe-momentum-bar">
      <div class="globe-momentum-fill" style="width:${s.momentum}%;background:${aClr.icon}"></div>
    </div>`;
}

function renderGlobeDetail(arch, s, aClr) {
  const virtue  = ARCHETYPE_VIRTUE[arch] || '';
  const mission = ARCHETYPE_GLOBE_MISSION[arch] || '';
  const desc    = (ARCHETYPE_DESC[arch]?.primary || '').split('.')[0] + '.';
  const iconSrc = `/stoked-command-center/${arch.toLowerCase()}-icon.png`;
  const membersHtml = s.recentMembers.length
    ? s.recentMembers.map(m => `<div class="globe-detail-member">
        <span class="globe-detail-member-name">${escHtml(m.name)}</span>
        <span class="globe-detail-member-level">Lv ${getLevelInfo(m.xp || 0).current.level}</span>
      </div>`).join('')
    : `<div class="globe-detail-empty">No members yet</div>`;

  return `<div class="globe-detail-inner">
    <div class="globe-detail-hd">
      <img src="${iconSrc}" alt="${escHtml(arch)}" class="globe-detail-icon-img" style="border-color:${aClr.icon}40">
      <div>
        <div class="globe-detail-name" style="color:${aClr.icon}">${escHtml(arch).toUpperCase()}</div>
        <div class="globe-detail-virtue">Core Virtue · ${escHtml(virtue)}</div>
      </div>
    </div>
    <div class="globe-detail-desc">"${escHtml(desc)}"</div>
    <div class="globe-detail-section-label">Circle Mission</div>
    <div class="globe-detail-mission">${escHtml(mission)}</div>
    <div class="globe-detail-section-label">Recent Members</div>
    <div class="globe-detail-members">${membersHtml}</div>
    <button class="globe-detail-cta" data-view-arch="${escHtml(arch)}">View ${escHtml(arch)} Members</button>
  </div>`;
}

function globeUpdateSelection(arch, stats, profile) {
  document.querySelectorAll('.globe-node').forEach(n => {
    n.classList.toggle('globe-node-selected', n.dataset.arch === arch);
  });

  const statsEl  = document.getElementById('globeStatsPanel');
  const detailEl = document.getElementById('globeDetailPanel');
  if (!statsEl) return;

  const closeBtn = `<button class="globe-panel-close" id="globePanelClose" aria-label="Close">✕</button>`;

  if (!arch) {
    statsEl.classList.remove('visible');
    statsEl.innerHTML = '';
    if (detailEl) detailEl.style.display = 'none';
  } else {
    const aClr = ARCHETYPE_COLORS[arch] || { icon: 'var(--orange)', glow: 'transparent' };
    // Show stats panel with arch info
    statsEl.innerHTML = closeBtn + renderGlobeStatsArch(arch, stats[arch], aClr);
    statsEl.classList.add('visible');
    statsEl.querySelector('#globePanelClose')?.addEventListener('click', () => {
      globeSelectedArch = null;
      globeUpdateSelection(null, stats, profile);
    });
    if (detailEl) {
      detailEl.innerHTML = closeBtn + renderGlobeDetail(arch, stats[arch], aClr);
      detailEl.style.display = 'block';
      detailEl.querySelector('[data-view-arch]')?.addEventListener('click', () => switchTab('brothers'));
      detailEl.querySelector('#globePanelClose')?.addEventListener('click', () => {
        globeSelectedArch = null;
        globeUpdateSelection(null, stats, profile);
      });
    }
  }
}

function initGlobeInteraction(stats, profile) {
  const viewport = document.getElementById('globeViewport');
  const canvas   = document.getElementById('globeCanvas');
  if (!viewport || !canvas) return;

  const applyTransform = () => {
    canvas.style.transform = `translate(${globeTranslateX}px,${globeTranslateY}px) scale(${globeScale})`;
  };
  applyTransform();

  // Zoom controls
  document.getElementById('globeZoomIn')?.addEventListener('click', e => {
    e.stopPropagation();
    globeScale = Math.min(3, globeScale * 1.35);
    applyTransform();
  });
  document.getElementById('globeZoomOut')?.addEventListener('click', e => {
    e.stopPropagation();
    globeScale = Math.max(0.5, globeScale / 1.35);
    applyTransform();
  });
  document.getElementById('globeZoomReset')?.addEventListener('click', e => {
    e.stopPropagation();
    globeScale = 1; globeTranslateX = 0; globeTranslateY = 0;
    applyTransform();
  });

  // Mouse wheel zoom
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    globeScale = Math.min(3, Math.max(0.5, globeScale * delta));
    applyTransform();
  }, { passive: false });

  // Drag to pan (mouse)
  let isDragging = false, startX, startY, startTX, startTY;
  viewport.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    isDragging  = true;
    globeDragMoved = false;
    startX = e.clientX; startY = e.clientY;
    startTX = globeTranslateX; startTY = globeTranslateY;
    viewport.style.cursor = 'grabbing';
  });
  const onMouseMove = e => {
    if (!isDragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) globeDragMoved = true;
    globeTranslateX = Math.max(-200, Math.min(200, startTX + dx));
    globeTranslateY = Math.max(-200, Math.min(200, startTY + dy));
    applyTransform();
  };
  const onMouseUp = () => { isDragging = false; if (viewport) viewport.style.cursor = 'grab'; };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // Touch pinch + drag
  let t0dist = null, t0tx, t0ty, t0startX, t0startY;
  viewport.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      t0startX = e.touches[0].clientX; t0startY = e.touches[0].clientY;
      t0tx = globeTranslateX; t0ty = globeTranslateY;
      globeDragMoved = false;
    }
    if (e.touches.length === 2) {
      t0dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  viewport.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - t0startX, dy = e.touches[0].clientY - t0startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) globeDragMoved = true;
      globeTranslateX = Math.max(-200, Math.min(200, t0tx + dx));
      globeTranslateY = Math.max(-200, Math.min(200, t0ty + dy));
      applyTransform();
    }
    if (e.touches.length === 2 && t0dist) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      globeScale = Math.min(3, Math.max(0.5, globeScale * (dist / t0dist)));
      t0dist = dist;
      applyTransform();
    }
  }, { passive: false });
  viewport.addEventListener('touchend', () => { t0dist = null; });

  // Node selection
  document.querySelectorAll('.globe-node').forEach(node => {
    const onClick = () => {
      if (globeDragMoved) { globeDragMoved = false; return; }
      const arch = node.dataset.arch;
      if (!arch) return;
      globeSelectedArch = globeSelectedArch === arch ? null : arch;
      globeUpdateSelection(globeSelectedArch, stats, profile);
    };
    node.addEventListener('click', onClick);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
  });

  // Set initial selection
  if (!globeSelectedArch) {
    const userArch = profile?.primaryArchetype || profile?.archetype;
    globeSelectedArch = userArch || null;
  }
  globeUpdateSelection(globeSelectedArch, stats, profile);
}

function buildGlobeHtml(stats, profile) {
  const userArch = profile?.primaryArchetype || profile?.archetype;
  const nodesHtml = ARCHETYPE_ORDER.map((arch, i) => renderGlobeNodeHtml(arch, i, stats, userArch)).join('');

  // Dodecagon vertices at R=43 and R=18 (inner), center=(50,50), starting at top (-90°)
  const pts = (R) => Array.from({length: 12}, (_, i) => {
    const a = (i * 30 - 90) * Math.PI / 180;
    return `${(50 + R * Math.cos(a)).toFixed(2)},${(50 + R * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  const outerPts = pts(47);
  const innerPts = pts(18);
  // Spokes from center to each outer vertex
  const spokes = Array.from({length: 12}, (_, i) => {
    const a = (i * 30 - 90) * Math.PI / 180;
    const x = (50 + 47 * Math.cos(a)).toFixed(2);
    const y = (50 + 47 * Math.sin(a)).toFixed(2);
    return `<line x1="50" y1="50" x2="${x}" y2="${y}" stroke="var(--globe-spoke)" stroke-width="0.4" stroke-dasharray="1.5,1.5"/>`;
  }).join('');

  return `<div class="globe-wrap">
    <div class="globe-map-outer" id="globeViewport" aria-label="Archetype map. Drag to pan, scroll to zoom.">
      <div class="globe-map-canvas" id="globeCanvas">
        <div class="globe-canvas-inner" id="globeInner">
          <svg class="globe-dodecagon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            ${spokes}
            <polygon points="${outerPts}" fill="none" stroke="var(--globe-line)" stroke-width="0.7"/>
            <polygon points="${innerPts}" fill="none" stroke="var(--globe-line-inner)" stroke-width="0.4"/>
          </svg>
          <div class="globe-center" aria-hidden="true">
            <div class="globe-center-line1">STOKED</div>
            <div class="globe-center-line2">BROTHERHOOD</div>
          </div>
          ${nodesHtml}
        </div>
      </div>
      <div class="globe-zoom-controls" aria-label="Zoom controls">
        <button class="globe-zoom-btn" id="globeZoomIn" aria-label="Zoom in">+</button>
        <button class="globe-zoom-btn" id="globeZoomReset" aria-label="Reset view">◎</button>
        <button class="globe-zoom-btn" id="globeZoomOut" aria-label="Zoom out">−</button>
      </div>
    </div>
    <div class="globe-stats-panel" id="globeStatsPanel"></div>
    <div class="globe-detail-panel" id="globeDetailPanel" style="display:none"></div>
  </div>`;
}

// ── MY PATH ───────────────────────────────────
function renderMyPath() {
  const el = document.getElementById('mypathContainer');
  if (!el) return;
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  // Admin may not have a brother doc — show globe-only view
  if (!profile) {
    const globeStats = computeGlobeStats();
    el.innerHTML = buildGlobeHtml(globeStats, null);
    initGlobeInteraction(globeStats, null);
    return;
  }

  // ── Tab switcher wrapper ──────────────────────
  const tabBar = `<div class="gp-tab-bar" role="tablist" aria-label="View switcher">
    <button class="gp-tab${globePathTab === 'globe'  ? ' gp-tab-active' : ''}" data-gptab="globe"  role="tab" aria-selected="${globePathTab === 'globe'}">The Globe</button>
    <button class="gp-tab${globePathTab === 'mypath' ? ' gp-tab-active' : ''}" data-gptab="mypath" role="tab" aria-selected="${globePathTab === 'mypath'}">My Path</button>
  </div>`;

  // ── Early-exit cases still show Globe tab ────
  const _showGlobeOnly = (pathContent) => {
    const globeStats = computeGlobeStats();
    const globeHtml  = buildGlobeHtml(globeStats, profile);
    el.innerHTML = tabBar
      + `<div id="globeTabView"  class="gp-view${globePathTab === 'globe'  ? '' : ' gp-hidden'}">${globeHtml}</div>`
      + `<div id="mypathTabView" class="gp-view${globePathTab === 'mypath' ? '' : ' gp-hidden'}">${pathContent}</div>`;
    el.querySelectorAll('[data-gptab]').forEach(btn => btn.addEventListener('click', () => { globePathTab = btn.dataset.gptab; renderMyPath(); }));
    if (globePathTab === 'globe') initGlobeInteraction(globeStats, profile);
  };

  if (!profile.assessmentCompletedAt) {
    _showGlobeOnly(`<div class="path-gate"><div class="path-gate-icon">◎</div><h2 class="path-gate-title">Your Path Awaits</h2><p class="path-gate-text">Complete the Brotherhood Assessment first to unlock your personal mission path.</p></div>`);
    return;
  }

  const currentArch = profile.currentPathArchetype || profile.primaryArchetype;
  const archData    = ARCHETYPE_CHALLENGES[currentArch];
  if (!archData) { _showGlobeOnly(`<div class="feed-empty">Archetype data not found.</div>`); return; }

  const aClr        = ARCHETYPE_COLORS[currentArch] || { icon: 'var(--terra)', glow: 'transparent' };
  const progress    = profile.pathProgress || {};
  const stageNames  = ARCHETYPE_STAGE_NAME_MAP[currentArch] || ['I','II','III','IV'];
  const earned      = profile.earnedBadges || [];
  const unlocked    = profile.unlockedArchetypes || [currentArch];
  const archetypeStages = profile.archetypeStages || {};
  const currentStage = archetypeStages[currentArch] || 1; // 1-4, or 5 = fully complete

  // Count total done across all stages
  const totalMissions = archData.stages.length * archData.stages[0].length;
  let totalDone = 0;
  for (let s = 1; s <= archData.stages.length; s++) {
    for (let i = 0; i < archData.stages[s-1].length; i++) {
      if (progress[`${currentArch}_s${s}_${i}`]?.completedAt) totalDone++;
    }
  }
  const pct = Math.round(totalDone / totalMissions * 100);

  const archIconHtml = archetypeElementIcon(currentArch, profile.dominantElement);
  const archFullyComplete = earned.includes(currentArch);
  const theme = ARCHETYPE_THEMES[currentArch] || { decorSvg: '', trailAccent: '', trailBg: 'none' };

  // ── Badge rack (all 12 archetypes)
  const badgeRack = ARCHETYPE_ORDER.map(a => {
    const hasIt = earned.includes(a);
    const aData = ARCHETYPE_CHALLENGES[a];
    const bClr  = ARCHETYPE_COLORS[a] || { icon: '#888', glow: 'transparent' };
    return `<div class="path-badge-slot ${hasIt ? 'path-badge-earned' : 'path-badge-locked'}" title="${a}${hasIt ? ' — Complete' : ''}">
      <div class="path-badge-icon" style="${hasIt ? `color:${bClr.icon};border-color:${bClr.icon};background:${bClr.glow}` : ''}">${aData?.symbol || '?'}</div>
      <div class="path-badge-name">${a.slice(0,4)}</div>
    </div>`;
  }).join('');

  // ── Archetype switcher chips (unlocked archetypes, not current)
  const switcherChips = unlocked.filter(a => a !== currentArch).map(a => {
    const bClr = ARCHETYPE_COLORS[a] || { icon: '#888' };
    const bData = ARCHETYPE_CHALLENGES[a];
    const isEarned = earned.includes(a);
    return `<button class="path-switch-chip${isEarned ? ' path-switch-earned' : ''}" data-switch-arch="${a}" style="border-color:${bClr.icon}40;color:${bClr.icon}">
      ${bData?.symbol || ''} ${a}${isEarned ? ' ✓' : ''}
    </button>`;
  }).join('');

  let html = `<div class="path-screen" data-arch="${currentArch}">
    <div class="path-sticky-header">
      <div class="path-badge-rack">${badgeRack}</div>
      <div class="path-badge-count-row"><span>${earned.length}</span> / 12 badges collected</div>

      <div class="path-arch-banner" style="--path-clr:${aClr.icon};--path-glow:${aClr.glow}">
        <div class="path-banner-decor" style="color:${aClr.icon}">${theme.decorSvg}</div>
        <div class="path-banner-icon-wrap" style="border-color:${aClr.icon}33;background:${aClr.glow}">${archIconHtml}</div>
        <div class="path-arch-info">
          <div class="path-arch-label">YOUR PATH</div>
          <div class="path-arch-name" style="color:${aClr.icon}">${currentArch} ${archFullyComplete ? '★' : ''}</div>
          <div class="path-arch-motto">${escHtml(archData.motto)}</div>
        </div>
        <div class="path-arch-counter">
          <svg class="path-xp-ring" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" stroke-width="3"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="${aClr.icon}" stroke-width="3"
              stroke-dasharray="${Math.round(2*Math.PI*18*pct/100)} ${Math.round(2*Math.PI*18*(100-pct)/100)}"
              stroke-dashoffset="${Math.round(2*Math.PI*18*0.25)}"
              stroke-linecap="round"/>
            <text x="22" y="26" text-anchor="middle" font-size="10" font-weight="700" fill="${aClr.icon}">${totalDone}/${totalMissions}</text>
          </svg>
        </div>
      </div>
      <div class="path-arch-progress"><div class="path-arch-fill" style="width:${pct}%;background:${aClr.icon}"></div></div>
      <div class="path-xp-row">
        <span class="path-xp-earned" style="color:${aClr.icon}">+${totalDone * 100} XP earned</span>
        <span class="path-xp-remain">Stage ${Math.min(currentStage, 4)} · ${stageNames[Math.min(currentStage,4)-1]}</span>
      </div>
      ${switcherChips ? `<div class="path-switcher"><div class="path-switcher-label">Switch Path</div><div class="path-switcher-chips">${switcherChips}</div></div>` : ''}
    </div>

    <div class="path-trail" id="pathTrail" style="--trail-clr:${aClr.icon};--trail-bg:${(theme.trailBg||'none').replace(/currentColor/g, aClr.icon)}">`;

  // Render stages 4 → 1 (top = hardest/future, bottom = first/completed)
  for (let stageNum = archData.stages.length; stageNum >= 1; stageNum--) {
    const stageChallenges = archData.stages[stageNum - 1];
    const stageName = stageNames[stageNum - 1];
    const stageLabel = `${currentArch} ${['I','II','III','IV'][stageNum-1]}`;
    const stageDone = stageChallenges.filter((_, i) => progress[`${currentArch}_s${stageNum}_${i}`]?.completedAt).length;
    const stageAllDone = stageDone === stageChallenges.length;
    const stageIsActive = stageNum === currentStage;
    const stageIsLocked = stageNum > currentStage;

    html += `<div class="pz-stage-header ${stageIsLocked ? 'pz-stage-locked' : stageAllDone ? 'pz-stage-complete' : 'pz-stage-active'}" style="${!stageIsLocked ? `--stage-clr:${aClr.icon}` : ''}">
      <div class="pz-stage-badge" style="${!stageIsLocked ? `background:${aClr.icon}` : ''}">${stageAllDone ? '★' : stageIsLocked ? '🔒' : ['I','II','III','IV'][stageNum-1]}</div>
      <div class="pz-stage-info">
        <div class="pz-stage-label">${stageLabel} <span class="pz-stage-accent">${theme.trailAccent}</span></div>
        <div class="pz-stage-name">${stageName}</div>
      </div>
      <div class="pz-stage-progress">${stageIsLocked ? 'Locked' : stageAllDone ? 'Complete ✓' : `${stageDone}/5`}</div>
    </div>`;

    // Render missions within this stage in reverse (5 at top, 1 at bottom)
    const reversed = [...stageChallenges].map((c, i) => ({ ...c, idx: i })).reverse();

    // Find active mission index within this stage
    const stageActiveIdx = stageIsActive
      ? (stageAllDone ? stageChallenges.length : stageChallenges.findIndex((_, i) => !progress[`${currentArch}_s${stageNum}_${i}`]?.completedAt))
      : -1;

    reversed.forEach(({ title, task, idx }) => {
      const key     = `${currentArch}_s${stageNum}_${idx}`;
      const done    = !!progress[key]?.completedAt;
      const isActive = idx === stageActiveIdx;
      const isLocked = stageIsLocked || (!done && idx > stageActiveIdx);
      const side    = (stageNum * 5 + idx) % 2 === 0 ? 'right' : 'left';
      const completedDate = done ? new Date(progress[key].completedAt).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : null;
      const reflection = progress[key]?.reflection || '';
      const photoUrl   = progress[key]?.photoUrl   || '';
      const mp3Link    = progress[key]?.mp3Link    || '';
      const num = idx + 1;
      const stateClass = done ? 'pz-done' : isActive ? 'pz-active' : 'pz-locked';

      const dotContent = done
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        : isLocked
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`
        : `<span class="pz-num">${num}</span>`;

      html += `<div class="pz-node ${stateClass} pz-${side}" id="pznode-s${stageNum}-${idx}">
        <div class="pz-card" style="${isActive ? `--card-clr:${aClr.icon};--card-glow:${aClr.glow}` : ''}">
          ${isActive ? `<div class="pz-active-badge" style="background:${aClr.icon}">NOW</div>` : ''}
          ${done     ? `<div class="pz-done-badge">✓ ${completedDate}</div>` : ''}
          ${isLocked ? `<div class="pz-locked-badge">🔒 Locked</div>` : ''}
          <div class="pz-num-label">Mission ${num}</div>
          <div class="pz-title">${escHtml(title)}</div>
          ${isActive ? `<div class="pz-task">${escHtml(task)}</div>
            <div class="pz-xp-pill" style="color:${aClr.icon};border-color:${aClr.icon}40">+100 XP</div>
            <button class="pz-complete-btn" data-pz-stage="${stageNum}" data-pz-idx="${idx}" style="background:${aClr.icon}">Mark Complete</button>` : ''}
          ${done && photoUrl ? `<img src="${escHtml(photoUrl)}" class="pz-proof-thumb" alt="proof">` : ''}
          ${done && mp3Link  ? `<a href="${escHtml(mp3Link)}" target="_blank" rel="noopener" class="pz-mp3-link">🎵 Listen</a>` : ''}
          ${done && reflection ? `<div class="pz-reflection">"${escHtml(reflection)}"</div>` : ''}
        </div>
        <div class="pz-axis">
          <div class="pz-line pz-line-top"></div>
          <div class="pz-dot${done ? ' pz-dot-done' : isActive ? ' pz-dot-active' : ''}" style="${!isLocked ? `background:${aClr.icon};color:#fff` : ''}">${dotContent}</div>
          <div class="pz-line pz-line-bot"></div>
        </div>
        <div class="pz-spacer"></div>
      </div>`;
    });
  }

  html += `</div></div>`;

  // ── Assemble full page with tab switcher ─────
  const globeStats = computeGlobeStats();
  const globeHtml  = buildGlobeHtml(globeStats, profile);
  el.innerHTML = tabBar
    + `<div id="globeTabView"  class="gp-view${globePathTab === 'globe'  ? '' : ' gp-hidden'}">${globeHtml}</div>`
    + `<div id="mypathTabView" class="gp-view${globePathTab === 'mypath' ? '' : ' gp-hidden'}">${html}</div>`;

  // ── Tab switching ─────────────────────────────
  el.querySelectorAll('[data-gptab]').forEach(btn => {
    btn.addEventListener('click', () => {
      globePathTab = btn.dataset.gptab;
      renderMyPath();
    });
  });

  // ── Globe interaction (only init when tab visible) ──
  if (globePathTab === 'globe') initGlobeInteraction(globeStats, profile);

  // ── My Path events ───────────────────────────
  // Scroll to active mission
  const activeStageMission = document.getElementById(`pznode-s${currentStage}-${
    archData.stages[currentStage-1]?.findIndex((_, i) => !progress[`${currentArch}_s${currentStage}_${i}`]?.completedAt) ?? 0
  }`);
  if (globePathTab === 'mypath' && activeStageMission) {
    setTimeout(() => activeStageMission.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  // Bind complete buttons
  el.querySelectorAll('[data-pz-stage]').forEach(btn => {
    btn.addEventListener('click', () => openMissionModal(currentArch, parseInt(btn.dataset.pzStage), parseInt(btn.dataset.pzIdx), profile));
  });

  // Bind switcher chips
  el.querySelectorAll('[data-switch-arch]').forEach(chip => {
    chip.addEventListener('click', async () => {
      const newArch = chip.dataset.switchArch;
      try {
        await updateDoc(doc(db, 'brothers', profile.id), { currentPathArchetype: newArch });
        profile.currentPathArchetype = newArch;
        renderMyPath();
      } catch (err) { showToast('Could not switch path.', 'info'); }
    });
  });
}

let pendingMissionArchetype = null;
let pendingMissionStage     = null;
let pendingMissionIdx       = null;

function openMissionModal(archetype, stage, idx, profile) {
  const archData  = ARCHETYPE_CHALLENGES[archetype];
  const challenge = archData?.stages?.[stage - 1]?.[idx];
  if (!challenge) return;
  const aClr = ARCHETYPE_COLORS[archetype] || { icon: 'var(--terra)' };
  pendingMissionArchetype = archetype;
  pendingMissionStage     = stage;
  pendingMissionIdx       = idx;
  document.getElementById('missionModalTitle').textContent = challenge.title;
  document.getElementById('missionModalBody').innerHTML = `
    <div class="mission-modal-arch" style="color:${aClr.icon}">${archetype} ${['I','II','III','IV'][stage-1]} · Mission ${idx + 1}</div>
    <div class="mission-modal-task">${escHtml(challenge.task)}</div>
    <div class="form-group" style="margin-top:18px">
      <label class="form-label">Reflection (optional)</label>
      <textarea id="missionReflection" class="form-control" rows="3" placeholder="What did you notice or discover?" maxlength="500"></textarea>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Photo or Video proof (optional)</label>
      <label class="mission-upload-label" id="missionPhotoLabel">
        <span id="missionPhotoLabelText">📷 Add Photo</span>
        <input type="file" id="missionPhoto" accept="image/*" style="display:none">
      </label>
      <label class="mission-upload-label" id="missionVideoLabel" style="margin-top:6px">
        <span id="missionVideoLabelText">🎬 Add Video <span style="font-size:11px;opacity:0.6">(max 30s · 50MB)</span></span>
        <input type="file" id="missionVideo" accept="video/*" style="display:none">
      </label>
      <div id="missionPhotoPreview" style="display:none;margin-top:8px">
        <img id="missionPhotoImg" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px">
      </div>
      <div id="missionVideoPreview" style="display:none;margin-top:8px">
        <video id="missionVideoEl" style="width:100%;max-height:180px;border-radius:8px;background:#000" controls playsinline muted></video>
      </div>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Music / MP3 link (optional)</label>
      <input type="url" id="missionMp3" class="form-control" placeholder="Paste a Spotify, SoundCloud or MP3 URL…">
    </div>
    <div class="mission-modal-xp">+100 XP awarded</div>
  `;
  document.getElementById('missionPhoto').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('missionPhotoLabelText').textContent = '✅ ' + file.name;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('missionPhotoImg').src = ev.target.result;
      document.getElementById('missionPhotoPreview').style.display = '';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('missionVideo').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('missionVideoLabelText').innerHTML = `🎬 ${file.name}`;
    const url = URL.createObjectURL(file);
    const vid = document.getElementById('missionVideoEl');
    vid.src = url;
    document.getElementById('missionVideoPreview').style.display = '';
  });
  openModal(document.getElementById('missionModal'));
}

function openEvolveModal(profile) {
  const completedArchetypes = profile.completedPathArchetypes || [];
  if (profile.currentPathArchetype) completedArchetypes.push(profile.currentPathArchetype);
  const available = ARCHETYPE_ORDER.filter(a => !completedArchetypes.includes(a));
  if (!available.length) {
    showToast('You have walked every path. You are complete.', 'success');
    return;
  }
  document.getElementById('missionModalTitle').textContent = 'Choose Your Next Path';
  document.getElementById('missionModalBody').innerHTML = `
    <p class="mission-modal-desc">You have completed the ${profile.currentPathArchetype || profile.primaryArchetype} path. Choose the next archetype to walk.</p>
    <div class="evolve-grid">
      ${available.map(a => {
        const aClr = ARCHETYPE_COLORS[a] || { icon: 'var(--terra)' };
        const archData = ARCHETYPE_CHALLENGES[a];
        return `<button class="evolve-option" data-evolve-arch="${a}" style="--ev-clr:${aClr.icon}">
          <div class="evolve-symbol">${archData?.symbol || '◎'}</div>
          <div class="evolve-name">${a}</div>
        </button>`;
      }).join('')}
    </div>`;
  document.getElementById('missionSubmitBtn').style.display = 'none';
  document.getElementById('missionCancelBtn').textContent = 'Not Yet';
  openModal(document.getElementById('missionModal'));
  document.querySelectorAll('[data-evolve-arch]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newArch = btn.dataset.evolveArch;
      const completed = [...(profile.completedPathArchetypes || [])];
      if (profile.currentPathArchetype && !completed.includes(profile.currentPathArchetype)) {
        completed.push(profile.currentPathArchetype);
      }
      try {
        await updateDoc(doc(db, 'brothers', profile.id), {
          currentPathArchetype: newArch,
          completedPathArchetypes: completed,
        });
        profile.currentPathArchetype = newArch;
        profile.completedPathArchetypes = completed;
        closeModal(document.getElementById('missionModal'));
        renderMyPath();
        showToast(`New path unlocked: ${newArch}`, 'success');
      } catch (err) {
        showToast('Failed to save — check connection.', 'info');
      }
    });
  });
}

document.getElementById('missionModalClose').addEventListener('click', () => {
  document.getElementById('missionSubmitBtn').style.display = '';
  document.getElementById('missionCancelBtn').textContent = 'Cancel';
  closeModal(document.getElementById('missionModal'));
});
document.getElementById('missionCancelBtn').addEventListener('click',  () => {
  document.getElementById('missionSubmitBtn').style.display = '';
  document.getElementById('missionCancelBtn').textContent = 'Cancel';
  closeModal(document.getElementById('missionModal'));
});
document.getElementById('missionModal').addEventListener('click', e => {
  if (e.target === document.getElementById('missionModal')) {
    document.getElementById('missionSubmitBtn').style.display = '';
    document.getElementById('missionCancelBtn').textContent = 'Cancel';
    closeModal(document.getElementById('missionModal'));
  }
});

document.getElementById('missionSubmitBtn').addEventListener('click', async () => {
  const archetype = pendingMissionArchetype;
  const stage     = pendingMissionStage;
  const idx       = pendingMissionIdx;
  if (!archetype || !stage || idx === null) return;
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  if (!profile) return;

  const reflection = document.getElementById('missionReflection')?.value?.trim() || '';
  const mp3Link    = document.getElementById('missionMp3')?.value?.trim() || '';
  const photoFile  = document.getElementById('missionPhoto')?.files?.[0] || null;
  const videoFile  = document.getElementById('missionVideo')?.files?.[0] || null;
  const btn = document.getElementById('missionSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const now = new Date().toISOString();
  const key = `${archetype}_s${stage}_${idx}`;
  let photoUrl = '';
  let videoUrl = '';

  if (photoFile) {
    try {
      photoUrl = await uploadPhoto(photoFile, `missionProof/${profile.id}/${key}_${Date.now()}`);
    } catch (uploadErr) { console.warn('Photo upload failed', uploadErr); }
  }
  if (videoFile) {
    try {
      btn.textContent = 'Uploading video…';
      videoUrl = await uploadVideo(videoFile, `missionProof/${profile.id}/${key}_vid_${Date.now()}`,
        pct => { btn.textContent = `Uploading video ${pct}%…`; });
    } catch (uploadErr) {
      showToast(uploadErr.message || 'Video upload failed', 'info');
      btn.disabled = false;
      btn.textContent = 'Complete Mission';
      return;
    }
  }
  btn.textContent = 'Saving…';

  const entry = { completedAt: now, reflection };
  if (photoUrl) entry.photoUrl = photoUrl;
  if (videoUrl) entry.videoUrl = videoUrl;
  if (mp3Link)  entry.mp3Link  = mp3Link;

  const newProgress = { ...(profile.pathProgress || {}), [key]: entry };

  // ── Check if this completes the current stage ──
  const archData = ARCHETYPE_CHALLENGES[archetype];
  const stageChallenges = archData?.stages?.[stage - 1] || [];
  const stageNowDone = stageChallenges.every((_, i) => {
    const k = `${archetype}_s${stage}_${i}`;
    return k === key || newProgress[k]?.completedAt;
  });

  const archetypeStages = { ...(profile.archetypeStages || {}) };
  let newUnlocked = [...(profile.unlockedArchetypes || [archetype])];
  let newBadges   = [...(profile.earnedBadges || [])];
  let didEvolve   = false;
  let didBadge    = false;
  let newlyUnlockedArchetypes = [];

  if (stageNowDone) {
    const nextStage = stage + 1;
    const totalStages = archData.stages.length;
    didEvolve = true;

    if (nextStage <= totalStages) {
      archetypeStages[archetype] = nextStage;
    } else {
      // All 4 stages done → badge earned
      archetypeStages[archetype] = totalStages + 1;
      if (!newBadges.includes(archetype)) {
        newBadges.push(archetype);
        didBadge = true;
      }
    }

    // Unlock 2 new archetypes on completing Stage 1
    if (stage === 1) {
      const allArchetypes = ARCHETYPE_ORDER;
      const available = allArchetypes.filter(a => !newUnlocked.includes(a));
      // shuffle
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }
      newlyUnlockedArchetypes = available.slice(0, 2);
      newUnlocked = [...newUnlocked, ...newlyUnlockedArchetypes];
    }
  }

  const updatePayload = {
    pathProgress: newProgress,
    xp: (profile.xp || 0) + 100,
  };
  if (stageNowDone) {
    updatePayload.archetypeStages   = archetypeStages;
    updatePayload.unlockedArchetypes = newUnlocked;
    updatePayload.earnedBadges       = newBadges;
  }

  try {
    await updateDoc(doc(db, 'brothers', profile.id), updatePayload);
    profile.pathProgress    = newProgress;
    profile.xp              = (profile.xp || 0) + 100;
    if (stageNowDone) {
      profile.archetypeStages    = archetypeStages;
      profile.unlockedArchetypes = newUnlocked;
      profile.earnedBadges       = newBadges;
    }
    closeModal(document.getElementById('missionModal'));

    if (didBadge) {
      showToast(`🏆 ${archetype} badge earned! All 4 stages complete.`, 'success');
      setTimeout(() => showToast(`Collect all 12 badges to master the Brotherhood Path.`, 'info'), 2000);
    } else if (didEvolve) {
      const newStageName = ARCHETYPE_STAGE_NAME_MAP[archetype]?.[archetypeStages[archetype]-1] || '';
      showToast(`⬆️ Evolved to ${archetype} ${['I','II','III','IV'][archetypeStages[archetype]-1]} — ${newStageName}!`, 'success');
      if (newlyUnlockedArchetypes.length > 0) {
        setTimeout(() => showToast(`🔓 Unlocked new paths: ${newlyUnlockedArchetypes.join(' & ')}`, 'info'), 2200);
      }
    } else {
      showToast(`Mission complete! +100 XP`, 'success');
    }

    renderMyPath();
  } catch (err) {
    console.error(err);
    showToast('Failed to save — check connection.', 'info');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Mark Complete';
  }
});

let rosterActiveFilter = 'All';

function renderRoster() {
  const container = document.getElementById('rosterContainer');
  if (!container) return;
  const me = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  const sorted = brothers.slice().sort((a, b) => (b.xp || 0) - (a.xp || 0));

  if (!sorted.length) {
    container.innerHTML = `<div class="feed-empty">No brothers yet.</div>`;
    return;
  }

  // Collect archetypes that exist in the roster
  const presentArchetypes = [...new Set(
    sorted.map(b => b.primaryArchetype || b.archetype).filter(Boolean)
  )].sort();

  const chips = ['All', ...presentArchetypes].map(a => {
    const clr = a === 'All' ? null : (ARCHETYPE_COLORS[a] || null);
    const isActive = rosterActiveFilter === a;
    return `<button class="roster-filter-chip ${isActive ? 'active' : ''}" data-archetype="${a}" ${clr ? `style="--chip-arch-color:${clr.icon}"` : ''}>${escHtml(a)}</button>`;
  }).join('');

  container.innerHTML = `
    <div class="feed-header">
      <h2 class="feed-title">The Brotherhood</h2>
      <button class="btn-dm-inbox" id="dmInboxBtn">💬 Messages</button>
    </div>
    <div class="roster-filters">${chips}</div>
    <div class="roster-list">
      ${sorted.map((b, i) => {
        const xp  = b.xp || 0;
        const lvl = getLevelInfo(xp);
        const displayArchetype = b.primaryArchetype || b.archetype;
        const icon = archetypeElementIcon(displayArchetype, b.dominantElement, xp);
        const archClr = ARCHETYPE_COLORS[displayArchetype] || { border: 'var(--border)', glow: 'transparent', icon: 'var(--orange)' };
        const elColor = ELEMENT_COLORS[b.dominantElement];
        const isMe = b.id === me?.id;
        const bsCat = b.brotherhoodScore != null ? getBSCategory(b.brotherhoodScore) : null;
        const hidden = rosterActiveFilter !== 'All' && displayArchetype !== rosterActiveFilter ? 'style="display:none"' : '';
        return `
          <div class="roster-card ${isMe ? 'roster-card-me' : ''}" data-archetype="${escHtml(displayArchetype||'')}" data-element="${escHtml(b.dominantElement||'')}" data-bro-id="${b.id}" style="--arch-border:${archClr.border};--arch-glow:${archClr.glow};--arch-icon:${archClr.icon}" ${hidden}>
            <div class="roster-rank">#${i + 1}</div>
            <div class="roster-icon">${icon}</div>
            <div class="roster-info">
              <div class="roster-name">
                ${isOnline(b) ? '<span class="online-dot"></span>' : ''}
                ${escHtml(b.name)}${isMe ? ' <span class="roster-you">you</span>' : ''}
              </div>
              <div class="roster-meta">
                ${displayArchetype ? `<span class="roster-arch" style="color:${archClr.icon}">${escHtml(displayArchetype)}</span>` : ''}
                ${b.dominantElement ? `<span class="roster-el" style="color:${elColor}">${escHtml(b.dominantElement)}</span>` : ''}
                ${dailyChallengeRosterBadge(b)}
              </div>
              <div class="roster-xp-row">
                <div class="roster-progress-track">
                  <div class="roster-progress-fill" style="width:${lvl.progress}%;background:${archClr.icon}"></div>
                </div>
                <span class="roster-xp-num">${xp.toLocaleString()} XP</span>
              </div>
            </div>
            ${bsCat ? `<div class="roster-score" style="color:${bsCat.color}">${b.brotherhoodScore}<span class="roster-score-lbl">BS</span></div>` : ''}
            ${!isMe ? `<button class="roster-dm-btn" data-dm="${b.id}" title="Message ${escHtml(b.name)}">💬</button>` : ''}
          </div>`;
      }).join('')}
    </div>`;

  // Filter chips
  container.querySelectorAll('.roster-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      rosterActiveFilter = chip.dataset.archetype;
      container.querySelectorAll('.roster-filter-chip').forEach(c => c.classList.toggle('active', c.dataset.archetype === rosterActiveFilter));
      const cards = container.querySelectorAll('.roster-card');
      cards.forEach(card => {
        const match = rosterActiveFilter === 'All' || card.dataset.archetype === rosterActiveFilter;
        card.style.display = match ? '' : 'none';
      });
    });
  });

  // Clickable roster cards — open profile view (not for own card)
  container.querySelectorAll('.roster-card:not(.roster-card-me)').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('[data-dm]')) return;
      const match = sorted.find(b => b.id === card.dataset.broId);
      if (match) openBrotherProfile(match);
    });
  });

  // Wire DM buttons
  container.querySelectorAll('[data-dm]').forEach(btn => {
    btn.addEventListener('click', () => openDM(btn.dataset.dm));
  });
  document.getElementById('dmInboxBtn')?.addEventListener('click', openDMInbox);
}

function openBrotherProfile(b) {
  const xp    = b.xp || 0;
  const lvl   = getLevelInfo(xp);
  const displayArchetype = b.primaryArchetype || b.archetype;
  const clr   = ARCHETYPE_COLORS[displayArchetype] || { border: 'var(--border)', glow: 'transparent', icon: 'var(--orange)' };
  const elColor = ELEMENT_COLORS[b.dominantElement] || 'var(--text-muted)';
  const nameInitial = (b.name || '?')[0].toUpperCase();
  const bgIconSrc = displayArchetype ? `/stoked-command-center/${displayArchetype.toLowerCase()}-icon.png` : '';
  const bsCat = b.brotherhoodScore != null ? getBSCategory(b.brotherhoodScore) : null;
  const dcDone = isDailyChallengeCompleted(b);
  const sortedByXp = brothers.slice().sort((a, bb) => (bb.xp || 0) - (a.xp || 0));
  const rank = sortedByXp.findIndex(bb => bb.id === b.id) + 1;
  const hasReflection = b.weeklyWin || b.weeklyChallenge || b.weeklyCommitment;

  let overlay = document.getElementById('brotherProfileModal');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'brotherProfileModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal bro-profile-modal" role="dialog" aria-modal="true">
      <div class="bro-profile-arch-bg" aria-hidden="true">
        ${bgIconSrc ? `<img src="${bgIconSrc}" alt="">` : ''}
      </div>
      <button class="modal-close bro-profile-close" id="broProfileClose">✕</button>

      <div class="bro-profile-header">
        <div class="bro-profile-avatar" style="--arch-icon:${clr.icon}">${nameInitial}</div>
        <div class="bro-profile-name">${escHtml(b.name || '')}</div>
        ${b.role === 'mentor' ? '<div class="mhv2-role-badge">MENTOR</div>' : ''}
        <div class="bro-profile-arch-row">
          ${displayArchetype ? `<span class="bro-profile-arch" style="color:${clr.icon}">${escHtml(displayArchetype)}</span>` : ''}
          ${b.dominantElement ? `<span class="bro-profile-el" style="color:${elColor}">${escHtml(b.dominantElement)}</span>` : ''}
        </div>
        <div class="bro-profile-rank">#${rank} in Brotherhood · ${xp.toLocaleString()} XP</div>
      </div>

      <div class="bro-profile-level">
        <div class="bro-profile-level-row">
          <span>Level ${lvl.current.level}</span>
          <span>${lvl.progress}%${lvl.next ? ' to Lvl ' + lvl.next.level : ' · MAX'}</span>
        </div>
        <div class="bro-profile-track">
          <div class="bro-profile-fill" style="width:${lvl.progress}%;background:${clr.icon}"></div>
        </div>
      </div>

      ${bsCat ? `
      <div class="bro-profile-section">
        <div class="bro-profile-section-label">Daily Check-In Score</div>
        <div class="bro-profile-score" style="color:${bsCat.color}">${b.brotherhoodScore} <span class="bro-profile-score-cat">${bsCat.label}</span></div>
      </div>` : ''}

      <div class="bro-profile-section">
        <div class="bro-profile-section-label">Today's Mission</div>
        ${b.dailyChallenge
          ? `<div class="bro-profile-mission-text">${escHtml(b.dailyChallenge)}</div>
             <div class="bro-profile-mission-status ${dcDone ? 'done' : 'pending'}">${dcDone ? '✓ Completed' : '⏳ In Progress'}</div>`
          : `<div class="bro-profile-mission-empty">No mission set today</div>`}
      </div>

      ${b.currentStreak ? `
      <div class="bro-profile-section bro-profile-streak">
        <span>🔥 ${b.currentStreak}-day streak</span>
        ${b.longestStreak > 1 ? `<span class="bro-profile-streak-best">Best: ${b.longestStreak}</span>` : ''}
      </div>` : ''}

      ${hasReflection ? `
      <div class="bro-profile-section">
        <div class="bro-profile-section-label">Weekly Reflection</div>
        ${b.weeklyWin        ? `<div class="bro-profile-r-row"><span class="bro-profile-r-lbl">Win</span><span class="bro-profile-r-val">${escHtml(b.weeklyWin)}</span></div>` : ''}
        ${b.weeklyChallenge  ? `<div class="bro-profile-r-row"><span class="bro-profile-r-lbl">Challenge</span><span class="bro-profile-r-val">${escHtml(b.weeklyChallenge)}</span></div>` : ''}
        ${b.weeklyCommitment ? `<div class="bro-profile-r-row"><span class="bro-profile-r-lbl">Commitment</span><span class="bro-profile-r-val">${escHtml(b.weeklyCommitment)}</span></div>` : ''}
      </div>` : ''}

      <button class="bro-profile-dm-btn" data-dm="${b.id}">💬 Send Message</button>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => {
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  };
  document.getElementById('broProfileClose').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-dm]').addEventListener('click', () => { close(); openDM(b.id); });
}

// ── PRIVATE DM CHAT ──────────────────────────
let dmUnsub = null;
let activeDMId = null;

function dmConvoId(idA, idB) {
  return [idA, idB].sort().join('_');
}

async function openDM(brotherId) {
  const me = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
  if (!me) return;
  const them = brothers.find(b => b.id === brotherId);
  if (!them) return;

  const convoId = dmConvoId(me.id, them.id);
  activeDMId = convoId;

  const archClr = ARCHETYPE_COLORS[them.primaryArchetype || them.archetype] || ARCHETYPE_COLORS.Warrior;

  document.getElementById('dmHeaderName').textContent = them.name;
  document.getElementById('dmHeaderArch').textContent = them.primaryArchetype || them.archetype || '';
  document.getElementById('dmHeaderArch').style.color = archClr.icon;
  const dot = document.getElementById('dmOnlineDot');
  dot.classList.toggle('hidden', !isOnline(them));

  document.getElementById('dmMessages').innerHTML = '<div class="dm-loading">Loading…</div>';
  document.getElementById('dmInput').value = '';
  document.getElementById('dmForm').classList.remove('hidden');

  const overlay = document.getElementById('dmOverlay');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('dm-open'));

  // Unsubscribe previous listener
  if (dmUnsub) { dmUnsub(); dmUnsub = null; }

  // Subscribe to messages — sort client-side to avoid needing a composite index
  const msgsRef = collection(db, 'dms', convoId, 'messages');
  dmUnsub = onSnapshot(msgsRef, snap => {
    const msgs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.sentAt?.toMillis ? a.sentAt.toMillis() : (a.sentAt || 0);
        const tb = b.sentAt?.toMillis ? b.sentAt.toMillis() : (b.sentAt || 0);
        return ta - tb;
      });
    renderDMMessages(msgs, me.id);
  }, err => {
    console.error('[DM] snapshot error:', err);
    document.getElementById('dmMessages').innerHTML =
      `<div class="dm-empty">Chat unavailable — Firestore rules may need updating.<br><span style="font-size:11px;opacity:0.6">${err.code}</span></div>`;
  });
}

function renderDMMessages(msgs, myId) {
  const container = document.getElementById('dmMessages');
  if (!msgs.length) {
    container.innerHTML = '<div class="dm-empty">No messages yet. Say something.</div>';
    return;
  }
  container.innerHTML = msgs.map(m => {
    const mine = m.senderId === myId;
    const time = m.sentAt?.toDate ? m.sentAt.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    return `<div class="dm-msg ${mine ? 'dm-mine' : 'dm-theirs'}">
      <div class="dm-bubble">${escHtml(m.text)}</div>
      <div class="dm-time">${time}</div>
    </div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function closeDM() {
  const overlay = document.getElementById('dmOverlay');
  overlay.classList.remove('dm-open');
  setTimeout(() => overlay.classList.add('hidden'), 280);
  if (dmUnsub) { dmUnsub(); dmUnsub = null; }
  activeDMId = null;
}

document.getElementById('dmBack').addEventListener('click', closeDM);

document.getElementById('dmForm').addEventListener('submit', async e => {
  e.preventDefault();
  const input = document.getElementById('dmInput');
  const text = input.value.trim();
  if (!text || !activeDMId) return;

  const me = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
  if (!me) return;

  input.value = '';
  try {
    await addDoc(collection(db, 'dms', activeDMId, 'messages'), {
      text,
      senderId: me.id,
      senderName: me.name,
      sentAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[DM] send error:', err);
    showToast('Could not send — check Firestore rules (' + err.code + ')', 'info');
    input.value = text;
  }
});

// Inbox: show list of conversations this user is part of
async function openDMInbox() {
  const me = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
  if (!me) return;

  // Find all DM conversations involving this user by scanning brothers
  const overlay = document.getElementById('dmOverlay');
  document.getElementById('dmHeaderName').textContent = 'Messages';
  document.getElementById('dmHeaderArch').textContent = '';
  document.getElementById('dmOnlineDot').classList.add('hidden');

  const msgEl = document.getElementById('dmMessages');
  msgEl.innerHTML = '<div class="dm-loading">Loading…</div>';
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('dm-open'));

  // Build inbox: one row per brother (whether or not there's a message)
  const others = brothers.filter(b => b.id !== me.id);
  msgEl.innerHTML = `<div class="dm-inbox">
    ${others.map(b => {
      const archClr = ARCHETYPE_COLORS[b.primaryArchetype || b.archetype] || ARCHETYPE_COLORS.Warrior;
      const icon = archetypeElementIcon(b.primaryArchetype || b.archetype, b.dominantElement, b.xp);
      return `<div class="dm-inbox-row" data-dm="${b.id}">
        <span class="dm-inbox-icon" style="color:${archClr.icon}">${icon}</span>
        <div class="dm-inbox-info">
          <div class="dm-inbox-name">${escHtml(b.name)}</div>
          <div class="dm-inbox-arch" style="color:${archClr.icon}">${escHtml(b.primaryArchetype || b.archetype || '')}</div>
        </div>
        ${isOnline(b) ? '<span class="online-dot"></span>' : ''}
        <span class="dm-inbox-arrow">→</span>
      </div>`;
    }).join('')}
  </div>`;

  // Wire rows
  msgEl.querySelectorAll('[data-dm]').forEach(row => {
    row.addEventListener('click', () => openDM(row.dataset.dm));
  });

  // Hide the send form for inbox view
  document.getElementById('dmForm').classList.add('hidden');
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

function setRepeatType(value) {
  document.getElementById('challengeRepeatType').value = value;
  document.querySelectorAll('.repeat-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

document.getElementById('repeatTypeToggle').addEventListener('click', e => {
  const btn = e.target.closest('.repeat-type-btn');
  if (btn) setRepeatType(btn.dataset.value);
});

function openCreateChallengeModal(preAssignId) {
  editingChallengeId = null;
  document.getElementById('challengeForm').reset();
  setRepeatType('one_time');
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
  setRepeatType(ch.repeatType || 'one_time');
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
    repeatType:    document.getElementById('challengeRepeatType').value || 'one_time',
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

// ── CHALLENGE SEED DATABASE ────────────────────
const CHALLENGE_SEED = [
  // MOVE
  { title: 'Plank Challenge',       tag: 'Move',        xpReward: 100, repeatType: 'daily',    proofType: 'video',       description: 'Hold a plank as long as you can. Every second past "I want to stop" is the rep that actually counts.' },
  { title: '40 Jumping Jacks',      tag: 'Move',        xpReward: 100, repeatType: 'daily',    proofType: 'video',       description: '40 jumping jacks, no breaks. Small, boring, every day — that\'s what builds a body that doesn\'t quit.' },
  { title: 'Skate Concrete Waves',  tag: 'Move',        xpReward: 100, repeatType: 'daily',    proofType: 'photo_video', description: 'Skate the waves. Flow isn\'t given, it\'s earned one fall at a time.' },
  { title: 'Handstand Challenge',   tag: 'Move',        xpReward:  50, repeatType: 'daily',    proofType: 'video',       description: 'Hold a handstand as long as you can. Being upside down teaches you balance works the same right-side up.' },
  { title: '20 Push-Ups',           tag: 'Move',        xpReward: 100, repeatType: 'daily',    proofType: 'video',       description: '20 push-ups. Strength you can\'t fake and can\'t skip.' },
  { title: 'Dead Hang Challenge',   tag: 'Move',        xpReward: 100, repeatType: 'daily',    proofType: 'video',       description: 'Hang from a bar as long as you can. Grip strength is a metaphor you\'ll actually feel — hanging on when it burns.' },
  { title: 'Spar Challenge',        tag: 'Move',        xpReward: 100, repeatType: 'daily',    proofType: 'video',       description: 'Spar with a parent or friend. Real contact, real respect — you learn control by testing it.' },
  { title: 'Obstacle Challenge',    tag: 'Move',        xpReward: 200, repeatType: 'daily',    proofType: 'video',       description: 'Build and run your own obstacle course. You built the hard thing, then you beat the hard thing — that\'s the whole game.' },
  { title: 'Max Pull-Ups Challenge',tag: 'Move',        xpReward: 150, repeatType: 'daily',    proofType: 'video',       description: 'Most pull-ups in 60 seconds. Numbers don\'t lie. Neither does your back off the bar.' },
  // CREATIVE
  { title: 'Build Something Challenge',    tag: 'Create', xpReward: 100, repeatType: 'daily',    proofType: 'photo_video', description: 'Build something with your hands that fixes a problem. You made something exist that didn\'t before — that\'s a different kind of confidence.' },
  { title: 'Draw Something Challenge',     tag: 'Create', xpReward:  50, repeatType: 'daily',    proofType: 'photo',       description: 'Draw something authentic from your own imagination — something you\'ve never drawn before. Nobody can grade your imagination. This one\'s just yours.' },
  { title: 'Instrument Challenge',         tag: 'Create', xpReward: 100, repeatType: 'daily',    proofType: 'video_audio', description: 'Practice an instrument for 15 minutes — piano, drums, bass, guitar, singing, rapping, whatever. Consistency on an instrument is the same muscle as consistency anywhere else.' },
  { title: 'Make Your Own Song',           tag: 'Create', xpReward: 350, repeatType: 'daily',    proofType: 'audio',       description: 'Write and record your own song. You made something people can actually listen to — that\'s real output, not a school project.' },
  { title: 'Fix Something Challenge',      tag: 'Create', xpReward: 100, repeatType: 'daily',    proofType: 'photo',       description: 'Fix something in your house — anything, wherever it\'s needed. You\'re becoming the guy who doesn\'t just wait for someone else to fix it.' },
  { title: 'Cook a Meal Challenge',        tag: 'Create', xpReward: 100, repeatType: 'daily',    proofType: 'photo_video', description: 'Cook a full meal, entirely by yourself. Feeding yourself and others is a skill, not an accident.' },
  { title: 'Write Something Challenge',    tag: 'Create', xpReward: 100, repeatType: 'daily',    proofType: 'photo',       description: 'Write a piece of poetry, a story, whatever\'s real to you. Getting it out of your head and onto paper is its own kind of strength.' },
  { title: 'Make a Short Film',            tag: 'Create', xpReward: 500, repeatType: 'one_time', proofType: 'video',       description: 'Make a short film about something you really love. This is a real finished thing with your name on it — most adults never finish one.' },
  { title: 'Scratch Challenge',            tag: 'Create', xpReward: 200, repeatType: 'daily',    proofType: 'video',       description: 'Build a simple game in Scratch. Writing real code that actually does something is a different kind of making.' },
  { title: 'Design Something Challenge',   tag: 'Create', xpReward: 100, repeatType: 'daily',    proofType: 'photo',       description: 'Sketch an invention, logo, or product idea. Getting a vision out of your head and onto paper is the first step to making it real.' },
  // RESET / REGULATION
  { title: 'Sunrise Challenge',    tag: 'Reset', xpReward: 200, repeatType: 'daily',    proofType: 'photo', description: 'Wake up early, watch the sunrise. Most people never see this — you\'ll start the day already ahead of everyone still asleep.' },
  { title: 'Room Reset Challenge', tag: 'Reset', xpReward: 150, repeatType: 'daily',    proofType: 'photo', description: 'Clean and organize your room. Your space is the easiest thing in your control — control it.' },
  { title: 'Ice Bath Challenge',   tag: 'Reset', xpReward: 400, repeatType: 'one_time', proofType: 'video', description: 'Take a full ice bath. If you can sit still in the cold, you can sit still in anything hard.' },
  { title: 'Read Challenge',       tag: 'Reset', xpReward: 150, repeatType: 'daily',    proofType: 'photo', description: 'Read a book, then explain why you chose it and what you got from it — photo of the book plus a written reflection.' },
  { title: 'Plant a Seed Challenge',tag: 'Reset',xpReward: 150, repeatType: 'daily',    proofType: 'photo', description: 'Plant a seed, water it, watch it grow. Something that only grows if you actually show up for it, day after day.' },
  { title: 'Yoga Challenge',       tag: 'Reset', xpReward: 100, repeatType: 'daily',    proofType: 'video', description: '15 minutes of yoga — don\'t rush, find the relaxation in the effort. Strength isn\'t always pushing. Sometimes it\'s holding still on purpose.' },
  { title: 'Statue Challenge',     tag: 'Reset', xpReward: 100, repeatType: 'daily',    proofType: 'video', description: 'Sit still, meditate, focus on your breath for 5 minutes. Five minutes of nothing is harder than it sounds — and that\'s the point.' },
  { title: 'Tai Chi Challenge',    tag: 'Reset', xpReward: 100, repeatType: 'daily',    proofType: 'video', description: 'Practice tai chi for 10 minutes — slower is better, find relaxation in your effort. Control at slow speed is harder than control at full speed.' },
  // ADVENTURE
  { title: 'Hiking Challenge',         tag: 'Adventure', xpReward: 150, repeatType: 'daily',    proofType: 'photo_video', description: 'Go for a hike. The trail doesn\'t care how you feel about it — you finish anyway.' },
  { title: 'Fire Challenge',           tag: 'Adventure', xpReward: 250, repeatType: 'daily',    proofType: 'photo_video', description: 'Build and keep a fire going, with supervision. One of the oldest skills there is — every guy should know how to do this.' },
  { title: 'Camping Challenge',        tag: 'Adventure', xpReward: 400, repeatType: 'daily',    proofType: 'photo_video', description: 'Go camping. A night outside resets something a night on your phone never will.' },
  { title: 'Fishing Challenge',        tag: 'Adventure', xpReward: 300, repeatType: 'daily',    proofType: 'photo',       description: 'Catch a fish. Patience with a payoff you can actually hold up and show people.' },
  { title: 'Surf Challenge',           tag: 'Adventure', xpReward: 200, repeatType: 'daily',    proofType: 'video_photo', description: 'Catch a wave. The ocean doesn\'t negotiate — you adjust to it, not the other way around.' },
  { title: 'Cook Over Fire Challenge', tag: 'Adventure', xpReward: 200, repeatType: 'daily',    proofType: 'photo_video', description: 'Cook a full meal over an open flame. Same meal, way harder mode — that\'s the whole point.' },
  { title: 'Shelter Challenge',        tag: 'Adventure', xpReward: 250, repeatType: 'daily',    proofType: 'photo',       description: 'Build a survival shelter or fort. You can build something that keeps you protected — remember that.' },
  { title: 'Outdoor Shot Challenge',   tag: 'Adventure', xpReward: 100, repeatType: 'daily',    proofType: 'photo',       description: 'Get one genuinely great outdoor photo. Slowing down enough to actually see where you are.' },
  // FAMILY
  { title: 'Unasked Chore Challenge',    tag: 'Family', xpReward: 200, repeatType: 'daily',    proofType: 'photo',       description: 'Do a chore nobody asked you to do. Watch how differently your parents treat you when you don\'t have to be told — that\'s earned trust, not given trust.' },
  { title: 'Family Interview Challenge', tag: 'Family', xpReward: 300, repeatType: 'daily',    proofType: 'video',       description: 'Ask a parent or grandparent about their childhood — rapid-fire, as many questions as you can. You\'ll learn where you actually come from. Most guys never ask.' },
  { title: 'Game Night Challenge',       tag: 'Family', xpReward: 300, repeatType: 'one_time', proofType: 'photo_video', description: 'Host a game night for your family or friends. You ran the room — that\'s leadership, not just a fun night.' },
  { title: 'House Project Challenge',    tag: 'Family', xpReward: 150, repeatType: 'daily',    proofType: 'photo',       description: 'Fix something in the house with a parent. Working next to your dad or mom on something real builds a different kind of respect than a conversation does.' },
  { title: 'Yard Work Challenge',        tag: 'Family', xpReward: 150, repeatType: 'daily',    proofType: 'photo',       description: 'Yard work — mow, rake, whatever needs doing. Nobody sees this one happen. It still counts.' },
  { title: 'Teach a Parent Challenge',   tag: 'Family', xpReward: 200, repeatType: 'daily',    proofType: 'video',       description: 'Teach a parent something you\'re actually good at. The roles flip for five minutes — that\'s a real moment, not a gimmick.' },
  // BROTHERHOOD
  { title: 'Teach a Brother',    tag: 'Brotherhood', xpReward: 200, repeatType: 'daily',    proofType: 'video',       description: 'Teach another brother a skill you have. The best way to lock in knowledge is to pass it on.' },
  { title: 'Invite a Friend',    tag: 'Brotherhood', xpReward: 150, repeatType: 'daily',    proofType: 'photo',       description: 'Bring someone new into the group — introduce them, vouch for them. Your circle grows when you grow it.' },
  { title: 'Say It to His Face', tag: 'Brotherhood', xpReward: 150, repeatType: 'daily',    proofType: 'video',       description: 'Tell a brother something real — something you respect about him or something honest he needs to hear. Say it directly, not over text.' },
  { title: 'Team Challenge',     tag: 'Brotherhood', xpReward: 200, repeatType: 'daily',    proofType: 'photo_video', description: 'Do something together as a team — a workout, a project, a game. Brotherhood isn\'t built in conversations. It\'s built doing things.' },
  { title: 'Reach Out',         tag: 'Brotherhood', xpReward: 100, repeatType: 'daily',    proofType: 'photo',       description: 'Check in on a brother who\'s been quiet. A real message, not a reaction. You noticed — that already matters.' },
  { title: 'Accountability Challenge', tag: 'Brotherhood', xpReward: 150, repeatType: 'daily', proofType: 'video',  description: 'Hold a brother accountable to something he said he\'d do. Remind him. Show up for him. That\'s what the brotherhood is for.' },
  { title: 'Mentor Challenge',   tag: 'Brotherhood', xpReward: 250, repeatType: 'daily',    proofType: 'video',       description: 'Spend real time with someone younger — teach something, listen, be present. What you model matters more than what you say.' },
  { title: 'Lead the Group',     tag: 'Brotherhood', xpReward: 300, repeatType: 'daily',    proofType: 'video',       description: 'Lead a Brotherhood session, call, or activity. Running something real for others is different than just showing up for it.' },
  { title: 'Shoutout Challenge', tag: 'Brotherhood', xpReward: 100, repeatType: 'daily',    proofType: 'photo',       description: 'Give a genuine public shoutout to a brother — not a reaction, a real one. Specific, honest, said in front of the group.' },
  { title: 'Level Up a Brother', tag: 'Brotherhood', xpReward: 200, repeatType: 'daily',    proofType: 'video',       description: 'Help a brother get better at something concrete — a skill, a habit, a challenge. Come back with proof it actually happened.' },
];

async function seedChallengesDB() {
  if (!isAdmin) return;
  const existing = new Set(challenges.map(c => c.title.toLowerCase().trim()));
  let added = 0, skipped = 0;
  for (const ch of CHALLENGE_SEED) {
    if (existing.has(ch.title.toLowerCase().trim())) { skipped++; continue; }
    const id = 'ch_' + ch.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) + '_' + Date.now().toString(36);
    await setDoc(doc(db, 'challenges', id), {
      ...ch,
      photoRequired: true,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: 'seed',
    });
    added++;
  }
  showToast(`Seeded ${added} challenges (${skipped} already existed)`, 'success');
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

function resetVideoSlot() {
  const input = document.getElementById('proofVideo');
  if (input) input.value = '';
  document.getElementById('videoPreview')?.classList.add('hidden');
  document.getElementById('videoPlaceholder')?.classList.remove('hidden');
  document.getElementById('videoFileName').textContent = '';
  document.getElementById('videoPreviewFull')?.classList.add('hidden');
  const vid = document.getElementById('videoPreviewEl');
  if (vid) { vid.src = ''; vid.load(); }
  document.getElementById('videoDurationError')?.classList.add('hidden');
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
  resetVideoSlot();
  document.getElementById('proofLink').value     = '';
  document.getElementById('proofLinkGroup')?.classList.add('hidden');
  document.getElementById('proofCaption').value  = '';
  document.getElementById('submitProofBtn').disabled = false;
  openModal(submitProofModal);
}

document.getElementById('proofLinkBtn')?.addEventListener('click', e => {
  e.preventDefault();
  const g = document.getElementById('proofLinkGroup');
  const showing = !g.classList.contains('hidden');
  g.classList.toggle('hidden', showing);
  if (!showing) document.getElementById('proofLink').focus();
});

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

document.getElementById('proofVideo').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const vid = document.getElementById('videoPreviewEl');
  vid.src = url;
  vid.onloadedmetadata = () => {
    const errEl = document.getElementById('videoDurationError');
    if (vid.duration > 30) {
      errEl.classList.remove('hidden');
      document.getElementById('submitProofBtn').disabled = true;
    } else {
      errEl.classList.add('hidden');
      document.getElementById('submitProofBtn').disabled = false;
      const shortName = file.name.length > 18 ? file.name.slice(0,16) + '…' : file.name;
      document.getElementById('videoFileName').textContent = shortName;
      document.getElementById('videoPreview').classList.remove('hidden');
      document.getElementById('videoPlaceholder').classList.add('hidden');
      document.getElementById('videoPreviewFull')?.classList.remove('hidden');
    }
  };
});

document.getElementById('videoRemoveBtn').addEventListener('click', e => {
  e.preventDefault();
  resetVideoSlot();
  document.getElementById('submitProofBtn').disabled = false;
});

document.getElementById('submitProofForm').addEventListener('submit', async e => {
  e.preventDefault();
  const challengeId = document.getElementById('submitChallengeId').value;
  const ch          = challenges.find(c => c.id === challengeId);
  const file1       = document.getElementById('proofPhoto1').files[0];
  const file2       = document.getElementById('proofPhoto2').files[0];
  const audioFile   = document.getElementById('proofAudio').files[0];
  const videoFile   = document.getElementById('proofVideo').files[0];
  const proofLink   = document.getElementById('proofLink').value.trim();
  const caption     = document.getElementById('proofCaption').value.trim();
  const btn         = document.getElementById('submitProofBtn');

  if (!submittingProfile || !ch) return;
  if (ch.photoRequired && !file1 && !audioFile && !videoFile && !proofLink) { showToast('Please add a photo, video, voice note, or link', 'info'); return; }

  btn.disabled    = true;
  btn.textContent = 'Completing…';

  try {
    let photoUrl  = null;
    let photoUrl2 = null;
    let audioUrl  = null;
    let videoUrl  = null;

    if (file1) photoUrl  = await compressImage(file1, 900, 0.72);
    if (file2) photoUrl2 = await compressImage(file2, 900, 0.72);
    if (audioFile) {
      const aRef = storageRef(storage, `submissions/audio/${Date.now()}_${audioFile.name}`);
      await uploadBytes(aRef, audioFile);
      audioUrl = await getDownloadURL(aRef);
    }
    if (videoFile) {
      btn.textContent = 'Uploading video…';
      const vRef = storageRef(storage, `submissions/video/${Date.now()}_${videoFile.name}`);
      await uploadBytes(vRef, videoFile);
      videoUrl = await getDownloadURL(vRef);
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
      videoUrl:    videoUrl  || null,
      proofLink:   proofLink || null,
      caption,
      status:      'completed',
      submittedAt: new Date().toISOString(),
      xpReward:    xpWon,
    });

    // Award XP immediately
    const newXP = Math.min(MAX_XP, (submittingProfile.xp || 0) + xpWon);
    await updateDoc(doc(db, 'brothers', submittingProfile.id), { xp: newXP, updatedAt: new Date().toISOString() });

    // Check badge eligibility — pass the new sub since memory array may not reflect it yet
    const newSub = { id, challengeId, brotherId: submittingProfile.id, status: 'completed', submittedAt: new Date().toISOString() };
    const newBadges = await checkAndAwardBadges({ ...submittingProfile, xp: newXP }, newSub);
    if (newBadges.length) {
      setTimeout(() => showBadgeUnlockCelebration(newBadges), 1400);
    }

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
      videoUrl:       videoUrl  || null,
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

// ── STORAGE UPLOAD HELPERS ────────────────────
async function uploadPhoto(file, path) {
  const r = storageRef(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

const VIDEO_MAX_DURATION = 30;  // seconds
const VIDEO_MAX_BYTES    = 50 * 1024 * 1024; // 50 MB

// Validate duration + size, then upload original (already compressed by phone camera)
async function validateVideo(file) {
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error(`Video must be under 50 MB (yours is ${(file.size/1024/1024).toFixed(1)} MB)`);
  }
  const duration = await new Promise((res, rej) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res(v.duration); };
    v.onerror = rej;
    v.src = URL.createObjectURL(file);
  });
  if (duration > VIDEO_MAX_DURATION) {
    throw new Error(`Video must be 30 seconds or less (yours is ${Math.round(duration)}s)`);
  }
}

async function uploadVideo(file, path, onProgress) {
  await validateVideo(file);
  const ext = file.name.split('.').pop() || 'mp4';
  const r   = storageRef(storage, `${path}.${ext}`);
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
  document.getElementById('lbBrother').textContent = brotherName || '';
  document.getElementById('lbChallenge').textContent = challengeTitle || '';
  document.getElementById('lbXp').textContent = xp ? `+${xp} XP` : '';
  document.getElementById('photoLightbox').querySelector('.lb-meta').style.display =
    (brotherName || challengeTitle || xp) ? '' : 'none';
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
  const text       = document.getElementById('announcementText').value.trim();
  const photoInput = document.getElementById('announcementPhoto');
  const videoInput = document.getElementById('announcementVideo');
  const photoFile  = photoInput.files[0];
  const videoFile  = videoInput.files[0];
  if (!text) return;

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting…';

  try {
    let photoUrl = null;
    let videoUrl = null;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile, `feed/${Date.now()}_${photoFile.name}`);
    }
    if (videoFile) {
      submitBtn.textContent = 'Uploading video…';
      videoUrl = await uploadVideo(videoFile, `feed/vid_${Date.now()}`,
        pct => { submitBtn.textContent = `Uploading video ${pct}%…`; });
    }
    const me = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
    const pinnedChallengeId = document.getElementById('announcementPinChallenge').value || null;
    await addDoc(collection(db, 'feed'), {
      type:             'announcement',
      text,
      photoUrl:         photoUrl || null,
      videoUrl:         videoUrl || null,
      pinnedChallengeId,
      authorId:         me?.id || null,
      authorName:       me?.name || (isAdmin ? 'Coach' : 'Mentor'),
      authorIcon:       isAdmin ? '🏆' : '⚡',
      authorArchetype:  me?.primaryArchetype || me?.archetype || null,
      authorElement:    me?.dominantElement || null,
      comments:         [],
      createdAt:        Date.now(),
    });
    document.getElementById('announcementText').value = '';
    photoInput.value = '';
    videoInput.value = '';
    document.getElementById('announcementPhotoPreview').innerHTML = '';
    document.getElementById('announcementVideoPreview').innerHTML = '';
    document.getElementById('announcementPinChallenge').value = '';
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

// ── POLL MODAL WIRING ─────────────────────────
const pollModal = document.getElementById('pollModal');
document.getElementById('pollModalClose').addEventListener('click',  () => closeModal(pollModal));
document.getElementById('pollCancelBtn').addEventListener('click',   () => closeModal(pollModal));
pollModal.addEventListener('click', e => { if (e.target === pollModal) closeModal(pollModal); });
document.getElementById('pollForm').addEventListener('submit', async e => {
  e.preventDefault();
  const question = document.getElementById('pollQuestion').value.trim();
  const options  = Array.from(document.querySelectorAll('.poll-option-input'))
    .map(i => i.value.trim()).filter(Boolean);
  if (!question || options.length < 2) {
    showToast('Add a question and at least 2 options', 'info');
    return;
  }
  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting…';
  try {
    const me = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
    await addDoc(collection(db, 'feed'), {
      type:       'poll',
      question,
      options,
      votes:      {},
      authorId:   me?.id || null,
      authorName: me?.name || (isAdmin ? 'Coach' : 'Mentor'),
      comments:   [],
      createdAt:  Date.now(),
    });
    document.getElementById('pollQuestion').value = '';
    document.querySelectorAll('.poll-option-input').forEach(i => i.value = '');
    closeModal(pollModal);
    switchTab('socialfeed');
    showToast('Poll posted!', 'success');
  } catch (err) {
    showToast('Error posting poll: ' + err.message, 'info');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Poll';
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

// Video preview for announcement
document.getElementById('announcementVideo').addEventListener('change', function() {
  const preview = document.getElementById('announcementVideoPreview');
  const file = this.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<video src="${url}" style="width:100%;max-height:200px;border-radius:8px;margin-top:8px;background:#000" controls playsinline muted></video>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Max 30s · 50MB</div>`;
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
  if (e.key === 'Escape') {
    [brotherModal, xpModal, deleteModal, checkInModal, coachNoteModal, viewCheckInModal, challengeModal, submitProofModal, archetypeModal, document.getElementById('awardBadgeModal')].forEach(closeModal);
    closeBadgesOverlay();
  }
});

// ── ARCHETYPE INFO MODAL ────────────────────────
const archetypeModal     = document.getElementById('archetypeModal');
const archetypeModalBody = document.getElementById('archetypeModalBody');
document.getElementById('archetypeModalClose').addEventListener('click', () => closeModal(archetypeModal));
archetypeModal.addEventListener('click', e => { if (e.target === archetypeModal) closeModal(archetypeModal); });

function openArchetypeModal(archetype, element) {
  const desc  = ARCHETYPE_DESC[archetype];
  if (!desc) return;
  const clr   = ARCHETYPE_COLORS[archetype] || { border: '#888', glow: '#888', icon: '#888' };
  const elColor = ELEMENT_COLORS[element] || '#888';
  const icon  = archetypeElementIcon(archetype, element);
  const elDesc = element && desc[element] ? `
    <div class="arch-modal-el-label" style="border-color:${elColor}44;color:${elColor}">${element} Element</div>
    <p class="arch-modal-el-desc">${desc[element]}</p>
  ` : '';
  document.getElementById('archetypeModalTitle').textContent = `${archetype}${element ? ' · ' + element : ''}`;
  archetypeModalBody.innerHTML = `
    <div class="arch-modal-hero" style="--arch-border:${clr.border};--arch-glow:${clr.glow};--arch-icon:${clr.icon}">
      <span class="arch-icon arch-modal-icon">${icon}</span>
      <div class="arch-modal-name">${archetype}</div>
      ${element ? `<div class="arch-modal-element" style="color:${elColor}">${element} Element</div>` : ''}
    </div>
    <p class="arch-modal-primary">${desc.primary || ''}</p>
    ${elDesc}
  `;
  openModal(archetypeModal);
}

// Delegate clicks on arch-icon elements anywhere in the page
document.addEventListener('click', e => {
  const trigger = e.target.closest('.archetype-pill, .arch-icon-wrap, .arch-icon, .arch-icon-img');
  if (!trigger) return;
  const card = trigger.closest('[data-archetype]');
  if (!card) return;
  const archetype = card.dataset.archetype;
  const element   = card.dataset.element;
  if (archetype) openArchetypeModal(archetype, element);
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

// ─────────────────────────────────────────────────────────────────────────────
// GAMES HUB
// ─────────────────────────────────────────────────────────────────────────────

async function renderGamesHub() {
  const el = document.getElementById('gamesContainer');
  el.innerHTML = `
    <div class="games-hub">
      <div class="games-hub-header">
        <div class="games-hub-title">Games</div>
        <div class="games-hub-sub">Mental performance — track your sharpness over time</div>
      </div>
      <div class="games-list">

        <!-- Sync Check card -->
        <div class="game-card game-card--sync" id="syncCheckCard">
          <div class="game-card-banner">
            <div class="game-card-banner-icon">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
                <circle cx="32" cy="32" r="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                <circle cx="32" cy="32" r="4" fill="white"/>
                <line x1="32" y1="10" x2="32" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="32" y1="44" x2="32" y2="54" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="10" y1="32" x2="20" y2="32" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="44" y1="32" x2="54" y2="32" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M32 32 L32 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M32 32 L42 38" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="game-card-banner-text">
              <div class="game-card-name">Sync Check</div>
              <div class="game-card-type">Reaction · Go/No-Go · 20 rounds</div>
            </div>
            <button class="game-card-play-btn" id="playSyncCheckBtn">▶ Play</button>
          </div>
          <div class="game-card-body">
            <div class="game-card-desc">React fast to green. Stay locked on red. The back half gets faster and more chaotic.</div>
            <div class="game-card-lb-inline">
              <div class="game-card-lb-label">Top Scores</div>
              <div id="gamesLbList" class="game-card-lb-rows"><div class="games-lb-loading">Loading…</div></div>
            </div>
          </div>
        </div>

        <!-- Chess card -->
        <div class="game-card game-card--chess" id="chessCard">
          <div class="game-card-banner">
            <div class="game-card-banner-icon">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
                <rect x="14" y="46" width="36" height="6" rx="3" fill="rgba(255,255,255,0.9)"/>
                <rect x="18" y="40" width="28" height="7" rx="2" fill="rgba(255,255,255,0.8)"/>
                <rect x="24" y="26" width="16" height="15" rx="2" fill="rgba(255,255,255,0.8)"/>
                <rect x="22" y="22" width="20" height="6" rx="2" fill="rgba(255,255,255,0.9)"/>
                <rect x="28" y="12" width="8" height="12" rx="2" fill="rgba(255,255,255,0.9)"/>
                <circle cx="32" cy="10" r="4" fill="white"/>
              </svg>
            </div>
            <div class="game-card-banner-text">
              <div class="game-card-name">Chess</div>
              <div class="game-card-type">Strategy · vs Bot or Brother</div>
            </div>
            <button class="game-card-play-btn" id="playChessBtn">▶ Play</button>
          </div>
          <div class="game-card-body">
            <div class="game-card-desc">Battle 3 bot difficulty levels or challenge a brother to a live match. Win by checkmate to earn XP.</div>
            <div class="game-card-xp-badges">
              <span class="game-xp-badge">Easy · 50 XP</span>
              <span class="game-xp-badge">Medium · 150 XP</span>
              <span class="game-xp-badge game-xp-badge--gold">Hard · 500 XP</span>
            </div>
          </div>
        </div>

      </div>
    </div>
    <div class="sync-check-game hidden" id="syncCheckGame"></div>
    <div class="chess-game-container hidden" id="chessGame"></div>
  `;

  document.getElementById('playSyncCheckBtn').addEventListener('click', launchSyncCheck);
  document.getElementById('playChessBtn').addEventListener('click', launchChess);
  await loadGamesLeaderboard('sync_check');
}

// ── Sync Check — Go/No-Go Reaction Game ──────────────────────────────────────

const SYNC_TOTAL_ROUNDS = 20;

// Escalating phases — every 5 rounds gets faster with more red
// Rounds 16-20: shapes also spawn at random screen positions
const SYNC_PHASES = [
  { minDelay: 1400, maxDelay: 2400, redPct: 0.25, expireMs: 1200, roam: false }, // rounds  1–5
  { minDelay:  900, maxDelay: 1800, redPct: 0.35, expireMs: 1000, roam: false }, // rounds  6–10
  { minDelay:  600, maxDelay: 1300, redPct: 0.45, expireMs:  850, roam: false }, // rounds 11–15
  { minDelay:  300, maxDelay:  900, redPct: 0.60, expireMs:  650, roam: true  }, // rounds 16–20
];

const SYNC_COACH_LINES = [
  { speedOk: true,  ctrlOk: true,  line: 'Locked in — speed and discipline held all the way through.' },
  { speedOk: true,  ctrlOk: false, line: 'Fast, but discipline slipped. Speed without control isn\'t an edge — it\'s a liability.' },
  { speedOk: false, ctrlOk: true,  line: 'Discipline held. Sharpen the reaction time and nothing will touch you.' },
  { speedOk: false, ctrlOk: false, line: 'Room to grow on both ends. Slower and sloppier than your best — come back sharper.' },
];

// Save score to Firestore — keeps each brother's personal best per game
async function submitScore(compositeScore, avgMs, falseTapRate, gameId) {
  if (!currentUser) return;
  const profile = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
  if (!profile) return;

  const docId = `${gameId}_${profile.id}`;
  const existing = await getDoc(doc(db, 'gameScores', docId));

  if (existing.exists() && existing.data().score >= compositeScore) return;

  await setDoc(doc(db, 'gameScores', docId), {
    gameId,
    brotherId:   profile.id,
    brotherName: profile.name,
    score:       compositeScore,
    avgMs,
    falseTapRate,
    submittedAt: new Date().toISOString(),
  });
}

async function loadGamesLeaderboard(gameId) {
  const lbEl = document.getElementById('gamesLbList');
  if (!lbEl) return;
  try {
    const snap = await getDocs(query(
      collection(db, 'gameScores'),
      where('gameId', '==', gameId)
    ));

    if (snap.empty) {
      lbEl.innerHTML = `<div class="games-lb-empty">No scores yet — be the first to play.</div>`;
      return;
    }

    // Keep only each brother's highest score across all levels they played
    const bestByBrother = {};
    snap.docs.forEach(d => {
      const s = d.data();
      if (!bestByBrother[s.brotherId] || s.score > bestByBrother[s.brotherId].score) {
        bestByBrother[s.brotherId] = s;
      }
    });

    const sorted = Object.values(bestByBrother).sort((a, b) => b.score - a.score);
    const myId = brothers.find(b => b.email?.toLowerCase() === currentUser?.email?.toLowerCase())?.id;

    lbEl.innerHTML = sorted.map((s, i) => {
      const isMe = s.brotherId === myId;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      const brother = brothers.find(b => b.id === s.brotherId);
      const archIcon = brother?.primaryArchetype || brother?.archetype
        ? `<img src="/stoked-command-center/${(brother.primaryArchetype || brother.archetype).toLowerCase()}-icon.png" width="22" height="22" style="object-fit:contain;opacity:0.7" alt="">`
        : '';
      return `
        <div class="games-lb-row${isMe ? ' games-lb-row-me' : ''}">
          <div class="games-lb-rank">${medal}</div>
          <div class="games-lb-arch">${archIcon}</div>
          <div class="games-lb-info">
            <div class="games-lb-name">${escHtml(s.brotherName)}${isMe ? ' <span class="games-lb-you">YOU</span>' : ''}</div>
            <div class="games-lb-meta">${s.avgMs} ms speed · ${Math.round(s.falseTapRate * 100)}% false taps</div>
          </div>
          <div class="games-lb-score">${s.score}</div>
        </div>`;
    }).join('');
  } catch (err) {
    lbEl.innerHTML = `<div class="games-lb-empty">Error: ${err.code || err.message}</div>`;
  }
}

let syncState  = null;
let syncTimeout = null;
let syncShapeStart = null;

function syncRand(min, max) {
  const skewed = Math.random() < 0.25 ? Math.random() * Math.random() : Math.random();
  return min + skewed * (max - min);
}

function syncPhaseForRound(round) {
  return SYNC_PHASES[Math.min(Math.floor((round - 1) / 5), SYNC_PHASES.length - 1)];
}

function launchSyncCheck() {
  document.getElementById('syncCheckCard').closest('.games-hub').classList.add('hidden');
  const gameEl = document.getElementById('syncCheckGame');
  gameEl.classList.remove('hidden');

  syncState = {
    round: 0,
    reactionTimes: [],
    falseCount: 0,
    redShownCount: 0,
    currentColor: null,
    shapeVisible: false,
    waiting: false,
  };

  gameEl.innerHTML = `
    <div class="sc-wrap">
      <div class="sc-top-bar">
        <button class="sc-back-btn" id="scBackBtn">← Games</button>
        <div class="sc-round-label" id="scRoundLabel">Round 1 / ${SYNC_TOTAL_ROUNDS}</div>
      </div>
      <div class="sc-arena" id="scArena">
        <div class="sc-instruction" id="scInstruction">
          <div class="sc-inst-title">Sync Check</div>
          <div class="sc-inst-rules">
            <span class="sc-inst-go">GREEN</span> — tap fast<br>
            <span class="sc-inst-stop">RED</span> — do NOT tap<br>
            <span class="sc-inst-roam-hint">Rounds 16–20: watch everywhere</span>
          </div>
          <button class="sc-start-btn" id="scStartBtn">Go</button>
        </div>
        <div class="sc-shape hidden" id="scShape"></div>
        <div class="sc-feedback hidden" id="scFeedback"></div>
      </div>
    </div>
  `;

  document.getElementById('scBackBtn').addEventListener('click', exitSyncCheck);
  document.getElementById('scStartBtn').addEventListener('click', syncNextRound);
  document.getElementById('scArena').addEventListener('click', syncHandleTap);
}

function exitSyncCheck() {
  clearTimeout(syncTimeout);
  syncState = null;
  const gameEl = document.getElementById('syncCheckGame');
  gameEl.classList.add('hidden');
  gameEl.innerHTML = '';
  document.getElementById('syncCheckCard').closest('.games-hub').classList.remove('hidden');
}

function syncNextRound() {
  if (!syncState) return;
  syncState.round++;
  syncState.shapeVisible = false;
  syncState.waiting = true;
  syncState.currentColor = null;

  document.getElementById('scInstruction')?.classList.add('hidden');
  const shape = document.getElementById('scShape');
  shape.classList.add('hidden');
  shape.style.removeProperty('left');
  shape.style.removeProperty('top');
  shape.style.removeProperty('transform');
  shape.style.removeProperty('position');
  document.getElementById('scFeedback').classList.add('hidden');
  document.getElementById('scRoundLabel').textContent = `Round ${syncState.round} / ${SYNC_TOTAL_ROUNDS}`;

  const phase = syncPhaseForRound(syncState.round);
  const delay = syncRand(phase.minDelay, phase.maxDelay);

  syncTimeout = setTimeout(() => {
    if (!syncState) return;
    const isRed = Math.random() < phase.redPct;
    syncState.currentColor = isRed ? 'red' : 'green';
    syncState.shapeVisible = true;
    syncState.waiting = false;
    syncShapeStart = performance.now();

    if (isRed) syncState.redShownCount++;

    shape.className = `sc-shape sc-shape-${isRed ? 'red' : 'green'}`;

    // Rounds 16-20: random position within arena bounds
    if (phase.roam) {
      const arena = document.getElementById('scArena');
      const aw = arena.clientWidth  || 360;
      const ah = arena.clientHeight || 500;
      const shapeSize = 120;
      const pad = 24;
      const rx = pad + Math.random() * (aw - shapeSize - pad * 2);
      const ry = pad + Math.random() * (ah - shapeSize - pad * 2);
      shape.style.position  = 'absolute';
      shape.style.left      = `${rx}px`;
      shape.style.top       = `${ry}px`;
      shape.style.transform = 'none';
    }

    shape.classList.remove('hidden');
    syncTimeout = setTimeout(() => syncExpire(), phase.expireMs);
  }, delay);
}

function syncHandleTap() {
  if (!syncState) return;

  if (syncState.waiting) {
    syncState.falseCount++;
    syncState.redShownCount++;
    syncShowFeedback('early', null);
    return;
  }

  if (!syncState.shapeVisible) return;
  clearTimeout(syncTimeout);

  const rt = performance.now() - syncShapeStart;
  syncState.shapeVisible = false;

  if (syncState.currentColor === 'green') {
    syncState.reactionTimes.push(rt);
    syncShowFeedback('hit', rt);
  } else {
    syncState.falseCount++;
    syncShowFeedback('false', null);
  }
}

function syncExpire() {
  if (!syncState || !syncState.shapeVisible) return;
  syncState.shapeVisible = false;
  const wasGreen = syncState.currentColor === 'green';
  document.getElementById('scShape').classList.add('hidden');
  syncShowFeedback(wasGreen ? 'miss' : 'hold', null);
}

function syncShowFeedback(type, rt) {
  document.getElementById('scShape').classList.add('hidden');
  const fb = document.getElementById('scFeedback');
  const msgs = {
    hit:   `<span class="sc-fb-hit">${Math.round(rt)} ms</span>`,
    miss:  `<span class="sc-fb-miss">Too slow</span>`,
    false: `<span class="sc-fb-false">False tap</span>`,
    early: `<span class="sc-fb-false">Too early</span>`,
    hold:  `<span class="sc-fb-hold">✓ Held</span>`,
  };
  fb.innerHTML = msgs[type] || '';
  fb.classList.remove('hidden');

  setTimeout(() => {
    if (!syncState) return;
    if (syncState.round >= SYNC_TOTAL_ROUNDS) {
      syncShowResults();
    } else {
      syncNextRound();
    }
  }, 600);
}

function syncShowResults() {
  clearTimeout(syncTimeout);
  if (!syncState) return;

  const { reactionTimes, falseCount, redShownCount } = syncState;
  const avgMs = reactionTimes.length
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 999;
  const falseTapRate = redShownCount > 0 ? falseCount / redShownCount : 0;

  const speedPenalty   = Math.max(0, avgMs - 200) * 0.5;
  const controlPenalty = falseTapRate * 600;
  const composite = Math.max(0, Math.round(1000 - speedPenalty - controlPenalty));

  const speedOk = avgMs < 380;
  const ctrlOk  = falseTapRate < 0.15;
  const coachLine = SYNC_COACH_LINES.find(l => l.speedOk === speedOk && l.ctrlOk === ctrlOk)?.line
    || SYNC_COACH_LINES[0].line;

  function speedLabel(ms) {
    if (ms < 250) return 'Elite';
    if (ms < 320) return 'Sharp';
    if (ms < 400) return 'Good';
    if (ms < 500) return 'Average';
    return 'Slow';
  }
  function ctrlLabel(rate) {
    if (rate === 0)  return 'Perfect';
    if (rate < 0.10) return 'Strong';
    if (rate < 0.20) return 'Moderate';
    if (rate < 0.35) return 'Shaky';
    return 'Poor';
  }

  submitScore(composite, avgMs, falseTapRate, 'sync_check');

  const gameEl = document.getElementById('syncCheckGame');
  gameEl.innerHTML = `
    <div class="sc-wrap">
      <div class="sc-top-bar">
        <button class="sc-back-btn" id="scBackBtnResult">← Games</button>
        <div class="sc-round-label">Sync Check · Results</div>
      </div>
      <div class="sc-results">
        <div class="sc-composite-wrap">
          <div class="sc-composite-num">${composite}</div>
          <div class="sc-composite-label">Composite Score</div>
        </div>
        <div class="sc-stat-row">
          <div class="sc-stat-block">
            <div class="sc-stat-value">${avgMs} <span class="sc-stat-unit">ms</span></div>
            <div class="sc-stat-name">Speed</div>
            <div class="sc-stat-grade sc-grade-${speedOk ? 'good' : 'bad'}">${speedLabel(avgMs)}</div>
          </div>
          <div class="sc-stat-divider"></div>
          <div class="sc-stat-block">
            <div class="sc-stat-value">${Math.round(falseTapRate * 100)}<span class="sc-stat-unit">%</span></div>
            <div class="sc-stat-name">Control</div>
            <div class="sc-stat-grade sc-grade-${ctrlOk ? 'good' : 'bad'}">${ctrlLabel(falseTapRate)}</div>
          </div>
        </div>
        <div class="sc-coach-note">${coachLine}</div>
        <div class="sc-sub-stats">
          ${reactionTimes.length} green hits · ${falseCount} false tap${falseCount !== 1 ? 's' : ''} · ${redShownCount} red shown
        </div>
        <div class="sc-result-btns">
          <button class="sc-play-again-btn" id="scPlayAgainBtn">Play Again</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('scBackBtnResult').addEventListener('click', exitSyncCheck);
  document.getElementById('scPlayAgainBtn').addEventListener('click', () => {
    gameEl.innerHTML = '';
    launchSyncCheck();
  });
  syncState = null;
}

// ── Chess Game ────────────────────────────────────────────────────────────────

let _ChessClass = null;

async function getChessClass() {
  if (_ChessClass) return _ChessClass;
  const mod = await import('https://cdn.jsdelivr.net/npm/chess.js@1.0.0/+esm');
  _ChessClass = mod.Chess;
  return _ChessClass;
}

const CHESS_UNICODE = {
  wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
  bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟',
};
const CHESS_PIECE_VALUES = { p:100, n:320, b:330, r:500, q:900, k:20000 };

// Piece-square tables — white perspective, index = rank*8+file, rank 1 = index 0–7
// Higher = better square for that piece. Black mirrors vertically.
const CHESS_PST = {
  p: [  0,  0,  0,  0,  0,  0,  0,  0,   5, 10, 10,-20,-20, 10, 10,  5,
        5, -5,-10,  0,  0,-10, -5,  5,   0,  0,  0, 20, 20,  0,  0,  0,
        5,  5, 10, 25, 25, 10,  5,  5,  10, 10, 20, 30, 30, 20, 10, 10,
       50, 50, 50, 50, 50, 50, 50, 50,   0,  0,  0,  0,  0,  0,  0,  0 ],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,  0,  5,  5,  0,-20,-40,
      -30,  5, 10, 15, 15, 10,  5,-30, -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30, -30,  0, 10, 15, 15, 10,  0,-30,
      -40,-20,  0,  0,  0,  0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50 ],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,  5,  0,  0,  0,  0,  5,-10,
      -10, 10, 10, 10, 10, 10, 10,-10, -10,  0, 10, 10, 10, 10,  0,-10,
      -10,  5,  5, 10, 10,  5,  5,-10, -10,  0,  5, 10, 10,  5,  0,-10,
      -10,  0,  0,  0,  0,  0,  0,-10, -20,-10,-10,-10,-10,-10,-10,-20 ],
  r: [  0,  0,  0,  5,  5,  0,  0,  0,  -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,  -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,  -5,  0,  0,  0,  0,  0,  0, -5,
        5, 10, 10, 10, 10, 10, 10,  5,   0,  0,  0,  0,  0,  0,  0,  0 ],
  q: [-20,-10,-10, -5, -5,-10,-10,-20, -10,  0,  5,  0,  0,  0,  0,-10,
      -10,  5,  5,  5,  5,  5,  0,-10,   0,  0,  5,  5,  5,  5,  0, -5,
       -5,  0,  5,  5,  5,  5,  0, -5, -10,  0,  5,  5,  5,  5,  0,-10,
      -10,  0,  0,  0,  0,  0,  0,-10, -20,-10,-10, -5, -5,-10,-10,-20 ],
  k: [ 20, 30, 10,  0,  0, 10, 30, 20,  20, 20,  0,  0,  0,  0, 20, 20,
      -10,-20,-20,-20,-20,-20,-20,-10, -20,-30,-30,-40,-40,-30,-30,-20,
      -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30 ],
};

// Board skins
const CHESS_SKINS = {
  classic:  { name: 'Classic',  light: '#f0d9b5', dark: '#b58863', sel: '#f6f669', tgtL: '#cdd16a', tgtD: '#aaa23a' },
  ocean:    { name: 'Ocean',    light: '#aedfe8', dark: '#2980a8', sel: '#7ef0f0', tgtL: '#5dc8d8', tgtD: '#1a7090' },
  forest:   { name: 'Forest',   light: '#d4edda', dark: '#2d6a4f', sel: '#b0e8b0', tgtL: '#80c880', tgtD: '#1e5e3a' },
  midnight: { name: 'Night',    light: '#5a5a8a', dark: '#1e1e3c', sel: '#9b59b6', tgtL: '#6a3a8a', tgtD: '#3a1a5a' },
  walnut:   { name: 'Walnut',   light: '#d4b483', dark: '#7a4e2d', sel: '#f0e060', tgtL: '#c8a830', tgtD: '#8a6020' },
};
let chessSkin = localStorage.getItem('chess_skin') || 'classic';

const CHESS_PIECE_SKINS = {
  classic: { name: 'Classic' },
  bold:    { name: 'Bold' },
  carved:  { name: 'Carved' },
  neon:    { name: 'Neon' },
  elite:   { name: 'Elite' },
};
let chessPieceSkin = localStorage.getItem('chess_piece_skin') || 'classic';

let chessInst = null;
let chessSelected = null;
let chessPlayerColor = 'w';
let chessBotDiff = 'medium';
let chessMode = null;
let chessGameId = null;
let chessUnsub = null;

// ── Entry / Exit ──────────────────────────────────────────────────────────────

function launchChess() {
  document.querySelector('.games-hub').classList.add('hidden');
  document.getElementById('chessGame').classList.remove('hidden');
  renderChessModeScreen();
}

function exitChess() {
  if (chessUnsub) { chessUnsub(); chessUnsub = null; }
  chessInst = null; chessSelected = null; chessGameId = null;
  document.getElementById('chessGame').classList.add('hidden');
  document.querySelector('.games-hub').classList.remove('hidden');
}

// ── Mode Selection ────────────────────────────────────────────────────────────

async function renderChessModeScreen() {
  const el = document.getElementById('chessGame');
  el.innerHTML = `<div class="chess-loading">Loading…</div>`;

  const myProfile = brothers.find(b => b.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  // Load pending challenges
  let invitesHtml = '';
  if (myProfile) {
    try {
      const snap = await getDocs(query(
        collection(db, 'chessGames'),
        where('challengedId', '==', myProfile.id),
        where('status', '==', 'pending')
      ));
      if (!snap.empty) {
        invitesHtml = `<div class="chess-invites-section">
          <div class="chess-section-label">Challenges Waiting</div>
          ${snap.docs.map(d => {
            const g = d.data();
            return `<div class="chess-invite-row">
              <span class="chess-invite-who">${escHtml(g.challengerName)} challenged you</span>
              <button class="btn btn-primary chess-accept-btn" data-id="${d.id}">Accept</button>
            </div>`;
          }).join('')}
        </div>`;
      }
    } catch(e) {}
  }

  const brotherList = brothers
    .filter(b => b.email?.toLowerCase() !== currentUser?.email?.toLowerCase())
    .map(b => `<button class="chess-brother-btn" data-id="${b.id}" data-name="${escHtml(b.name)}">${escHtml(b.name)}</button>`)
    .join('');

  el.innerHTML = `
    <div class="chess-mode-screen">
      <div class="chess-screen-header">
        <button class="chess-back-btn" id="chessBackToHub">← Games</button>
        <div class="chess-screen-title">♟ Chess</div>
      </div>

      ${invitesHtml}

      <div class="chess-mode-section">
        <div class="chess-section-label">Play vs Bot</div>
        <div class="chess-diff-row">
          <button class="chess-diff-btn" data-diff="easy">🤖 Easy</button>
          <button class="chess-diff-btn" data-diff="medium">⚡ Medium</button>
          <button class="chess-diff-btn" data-diff="hard">💀 Hard</button>
        </div>
      </div>

      <div class="chess-mode-section">
        <div class="chess-section-label">Challenge a Brother</div>
        <div class="chess-brothers-list">
          ${brotherList || '<div class="chess-no-brothers">No brothers online</div>'}
        </div>
      </div>
    </div>
  `;

  el.querySelector('#chessBackToHub').addEventListener('click', exitChess);

  el.querySelectorAll('.chess-diff-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      chessBotDiff = btn.dataset.diff;
      chessMode = 'bot';
      chessPlayerColor = 'w';
      const C = await getChessClass();
      chessInst = new C();
      chessSelected = null;
      renderChessGameScreen();
    });
  });

  el.querySelectorAll('.chess-brother-btn').forEach(btn => {
    btn.addEventListener('click', () => chessChallengeBrother(btn.dataset.id, btn.dataset.name));
  });

  el.querySelectorAll('.chess-accept-btn').forEach(btn => {
    btn.addEventListener('click', () => chessAcceptChallenge(btn.dataset.id));
  });
}

// ── Brother Challenge via Firestore ───────────────────────────────────────────

async function chessChallengeBrother(brotherId, brotherName) {
  const myProfile = brothers.find(b => b.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  if (!myProfile) return;

  const ref = await addDoc(collection(db, 'chessGames'), {
    challengerId: myProfile.id,
    challengerName: myProfile.name,
    challengedId: brotherId,
    challengedName: brotherName,
    whiteId: myProfile.id,
    whiteName: myProfile.name,
    blackId: brotherId,
    blackName: brotherName,
    moves: [],
    status: 'pending',
    result: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  chessGameId = ref.id;
  chessMode = 'brother';
  chessPlayerColor = 'w';
  const C = await getChessClass();
  chessInst = new C();
  chessSelected = null;
  renderChessGameScreen();
  chessWatchGame(ref.id);
}

async function chessAcceptChallenge(gameId) {
  await updateDoc(doc(db, 'chessGames', gameId), {
    status: 'active',
    updatedAt: new Date().toISOString(),
  });
  chessGameId = gameId;
  chessMode = 'brother';
  chessPlayerColor = 'b';
  const C = await getChessClass();
  chessInst = new C();
  chessSelected = null;
  renderChessGameScreen();
  chessWatchGame(gameId);
}

function chessWatchGame(gameId) {
  if (chessUnsub) chessUnsub();
  chessUnsub = onSnapshot(doc(db, 'chessGames', gameId), async snap => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (!chessInst) {
      const C = await getChessClass();
      chessInst = new C();
    }
    chessInst.reset();
    for (const mv of (data.moves || [])) chessInst.move(mv);
    chessRenderBoard();
    chessUpdateStatus(data);
    if (data.status === 'complete') { if (chessUnsub) { chessUnsub(); chessUnsub = null; } }
  });
}

// ── Game Screen ───────────────────────────────────────────────────────────────

function renderChessGameScreen() {
  const el = document.getElementById('chessGame');
  const modeLabel = chessMode === 'bot' ? `vs Bot · ${chessBotDiff}` : 'vs Brother';
  const skinSwatches = Object.entries(CHESS_SKINS).map(([key, s]) =>
    `<button class="chess-skin-swatch${chessSkin === key ? ' active' : ''}" data-skin="${key}" title="${s.name}" style="background:linear-gradient(135deg,${s.light} 50%,${s.dark} 50%)"></button>`
  ).join('');
  const pieceSkinBtns = Object.entries(CHESS_PIECE_SKINS).map(([key, p]) =>
    `<button class="chess-piece-skin-btn cps-${key}${chessPieceSkin === key ? ' active' : ''}" data-pskin="${key}" title="${p.name}"><span class="chess-pc chess-pc-w">♔</span><span class="chess-pc chess-pc-b">♚</span></button>`
  ).join('');

  el.innerHTML = `
    <div class="chess-game-wrap">
      <div class="chess-game-header">
        <button class="chess-back-btn" id="chessGameBack">← Back</button>
        <div class="chess-game-title">♟ Chess ${modeLabel}</div>
        <div class="chess-skin-row">${skinSwatches}</div>
      </div>
      <div class="chess-piece-skin-row">${pieceSkinBtns}</div>
      <div class="chess-opponent-bar">
        <div class="chess-player-label">${chessPlayerColor === 'w' ? '⬛ Opponent' : '⬜ Opponent'}</div>
        <div class="chess-captured" id="chessCapturedTop"></div>
      </div>
      <div class="chess-board-wrap">
        <div class="chess-board cps-${chessPieceSkin}" id="chessBoard"></div>
      </div>
      <div class="chess-player-bar">
        <div class="chess-player-label">${chessPlayerColor === 'w' ? '⬜ You (White)' : '⬛ You (Black)'}</div>
        <div class="chess-captured" id="chessCapturedBot"></div>
      </div>
      <div class="chess-status" id="chessStatus">${chessMode === 'brother' && chessPlayerColor === 'w' ? 'Waiting for opponent to accept…' : 'Your turn'}</div>
      <div class="chess-actions" id="chessActions">
        <button class="chess-action-btn" id="chessResignBtn">Resign</button>
      </div>
    </div>
  `;
  el.querySelector('#chessGameBack').addEventListener('click', exitChess);
  el.querySelector('#chessResignBtn').addEventListener('click', chessResign);
  el.querySelectorAll('.chess-skin-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      chessSkin = btn.dataset.skin;
      localStorage.setItem('chess_skin', chessSkin);
      el.querySelectorAll('.chess-skin-swatch').forEach(b => b.classList.toggle('active', b.dataset.skin === chessSkin));
      chessRenderBoard();
    });
  });
  el.querySelectorAll('.chess-piece-skin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chessPieceSkin = btn.dataset.pskin;
      localStorage.setItem('chess_piece_skin', chessPieceSkin);
      el.querySelectorAll('.chess-piece-skin-btn').forEach(b => b.classList.toggle('active', b.dataset.pskin === chessPieceSkin));
      const boardEl = document.getElementById('chessBoard');
      if (boardEl) {
        Object.keys(CHESS_PIECE_SKINS).forEach(k => boardEl.classList.remove('cps-' + k));
        boardEl.classList.add('cps-' + chessPieceSkin);
      }
    });
  });
  chessRenderBoard();
}

// ── Board Rendering ───────────────────────────────────────────────────────────

function chessRenderBoard() {
  const boardEl = document.getElementById('chessBoard');
  if (!boardEl || !chessInst) return;

  const board = chessInst.board();
  const flipped = chessPlayerColor === 'b';
  const legalTargets = chessSelected
    ? chessInst.moves({ square: chessSelected, verbose: true }).map(m => m.to)
    : [];

  const ranks = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const files = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  let html = '';
  for (const r of ranks) {
    for (const f of files) {
      const sq = 'abcdefgh'[f] + (r + 1);
      const piece = board[7 - r]?.[f];
      const isLight = (r + f) % 2 === 0;
      const isSel = sq === chessSelected;
      const isTarget = legalTargets.includes(sq);
      const sym = piece ? CHESS_UNICODE[piece.color + piece.type] : '';
      const pc = piece?.color || '';
      const skin = CHESS_SKINS[chessSkin] || CHESS_SKINS.classic;
      let bg = isLight ? skin.light : skin.dark;
      if (isSel) bg = skin.sel;
      else if (isTarget) bg = isLight ? skin.tgtL : skin.tgtD;
      html += `<div class="chess-sq" style="background:${bg}" data-sq="${sq}">${
        sym ? `<span class="chess-pc chess-pc-${pc}">${sym}</span>` : ''
      }${isTarget && !sym ? '<span class="chess-dot"></span>' : ''}${isTarget && sym ? '<span class="chess-cap-ring"></span>' : ''}</div>`;
    }
  }
  boardEl.innerHTML = html;
  boardEl.querySelectorAll('.chess-sq').forEach(sq =>
    sq.addEventListener('click', () => chessSquareClick(sq.dataset.sq))
  );
  chessUpdateStatusFromInst();
}

// ── Move Logic ────────────────────────────────────────────────────────────────

function chessSquareClick(sq) {
  if (!chessInst) return;
  if (chessInst.isGameOver()) return;
  if (chessInst.turn() !== chessPlayerColor) return;

  if (chessSelected) {
    const targets = chessInst.moves({ square: chessSelected, verbose: true }).map(m => m.to);
    if (targets.includes(sq)) {
      chessExecuteMove(chessSelected, sq);
      return;
    }
  }
  const piece = chessInst.get(sq);
  chessSelected = (piece && piece.color === chessPlayerColor) ? sq : null;
  chessRenderBoard();
}

async function chessExecuteMove(from, to) {
  const piece = chessInst.get(from);
  let promotion;
  if (piece?.type === 'p') {
    const rank = parseInt(to[1]);
    if ((piece.color === 'w' && rank === 8) || (piece.color === 'b' && rank === 1)) promotion = 'q';
  }
  const move = chessInst.move({ from, to, promotion });
  if (!move) return;
  chessSelected = null;
  chessRenderBoard();

  if (chessMode === 'brother' && chessGameId) {
    const gameRef = doc(db, 'chessGames', chessGameId);
    const snap = await getDoc(gameRef);
    if (snap.exists()) {
      const moves = [...(snap.data().moves || []), move.san];
      const over = chessInst.isGameOver();
      await updateDoc(gameRef, {
        moves,
        status: over ? 'complete' : 'active',
        result: over ? chessGetResult() : null,
        updatedAt: new Date().toISOString(),
      });
    }
  } else if (chessMode === 'bot') {
    if (chessInst.isGameOver()) { chessHandleGameOver(); return; }
    document.getElementById('chessStatus').textContent = 'Bot thinking…';
    setTimeout(chessBotMove, 350);
  }
}

// ── Bot AI ────────────────────────────────────────────────────────────────────

function chessBotMove() {
  if (!chessInst || chessInst.isGameOver()) return;
  // Yield to browser first so the "Bot thinking…" label renders
  setTimeout(() => {
    let move;
    if (chessBotDiff === 'easy') {
      const moves = chessInst.moves({ verbose: true });
      move = moves[Math.floor(Math.random() * moves.length)];
    } else {
      const depth = chessBotDiff === 'hard' ? 3 : 2;
      move = chessFindBest(depth);
    }
    // Fallback: if search returned nothing, pick a random legal move
    if (!move) {
      const legal = chessInst.moves({ verbose: true });
      if (legal.length) move = legal[Math.floor(Math.random() * legal.length)];
    }
    if (move) {
      chessInst.move(move);
      chessSelected = null;
      chessRenderBoard();
      if (chessInst.isGameOver()) chessHandleGameOver();
    }
  }, 50);
}

let _chessCutoff = false;
let _chessDeadline = 0;

function chessMoveScore(move) {
  let s = 0;
  if (move.captured) s += CHESS_PIECE_VALUES[move.captured] * 10 - (CHESS_PIECE_VALUES[move.piece] || 0);
  if (move.flags && move.flags.includes('p')) s += 800;
  if (move.san && move.san.includes('+')) s += 50;
  return s;
}

// Iterative deepening — always return a complete result at some depth
function chessFindBest(maxDepth) {
  _chessDeadline = Date.now() + (chessBotDiff === 'hard' ? 1800 : 900);
  let bestMove = null;
  for (let d = 1; d <= maxDepth; d++) {
    _chessCutoff = false;
    const move = chessFindBestAtDepth(d);
    if (!_chessCutoff && move) bestMove = move; // only keep completed searches
    if (_chessCutoff || Date.now() > _chessDeadline) break;
  }
  return bestMove;
}

function chessFindBestAtDepth(depth) {
  const moves = chessInst.moves({ verbose: true })
    .sort((a, b) => chessMoveScore(b) - chessMoveScore(a));
  let best = moves[0] || null, bestScore = -Infinity;
  for (const move of moves) {
    if (_chessCutoff) break;
    chessInst.move(move);
    const score = -chessNegamax(depth - 1, -Infinity, Infinity);
    chessInst.undo();
    if (score > bestScore) { bestScore = score; best = move; }
  }
  return best;
}

function chessNegamax(depth, alpha, beta) {
  if (Date.now() > _chessDeadline) { _chessCutoff = true; return 0; }
  if (chessInst.isGameOver()) return chessEval();
  if (depth === 0) return chessQuiesce(alpha, beta, 1);
  const moves = chessInst.moves({ verbose: true })
    .sort((a, b) => chessMoveScore(b) - chessMoveScore(a));
  let best = -Infinity;
  for (const m of moves) {
    if (_chessCutoff) break;
    chessInst.move(m);
    const score = -chessNegamax(depth - 1, -beta, -alpha);
    chessInst.undo();
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

function chessQuiesce(alpha, beta, limit) {
  if (_chessCutoff || Date.now() > _chessDeadline) { _chessCutoff = true; return 0; }
  const stand = chessEval();
  if (stand >= beta || limit <= 0) return stand;
  alpha = Math.max(alpha, stand);
  const captures = chessInst.moves({ verbose: true }).filter(m => m.captured);
  for (const m of captures) {
    if (_chessCutoff) break;
    chessInst.move(m);
    const score = -chessQuiesce(-beta, -alpha, limit - 1);
    chessInst.undo();
    alpha = Math.max(alpha, score);
    if (alpha >= beta) return beta;
  }
  return alpha;
}

// IMPORTANT: returns positive = good for the side currently to move (negamax convention)
function chessEval() {
  if (chessInst.isCheckmate()) return -15000; // side to move is mated
  if (chessInst.isDraw()) return 0;
  const turn = chessInst.turn();
  let score = 0;
  const board = chessInst.board();
  for (let boardRow = 0; boardRow < 8; boardRow++) {
    for (let col = 0; col < 8; col++) {
      const p = board[boardRow][col];
      if (!p) continue;
      const base = CHESS_PIECE_VALUES[p.type] || 0;
      const pstIdx = p.color === 'w' ? (7 - boardRow) * 8 + col : boardRow * 8 + col;
      const pst = CHESS_PST[p.type]?.[pstIdx] || 0;
      // Add if this piece belongs to side-to-move, subtract if opponent
      score += p.color === turn ? (base + pst) : -(base + pst);
    }
  }
  return score;
}

// ── Status & Game Over ────────────────────────────────────────────────────────

function chessGetResult() {
  if (chessInst.isCheckmate()) return chessInst.turn() === 'w' ? '0-1' : '1-0';
  if (chessInst.isDraw()) return '1/2-1/2';
  return null;
}

function chessUpdateStatusFromInst() {
  if (!chessInst) return;
  if (chessInst.isGameOver()) { chessHandleGameOver(); return; }
  const myTurn = chessInst.turn() === chessPlayerColor;
  const inCheck = chessInst.isCheck();
  let msg = myTurn ? (inCheck ? 'Check — your move!' : 'Your turn') : (chessMode === 'bot' ? 'Bot thinking…' : 'Opponent\'s turn…');
  const el = document.getElementById('chessStatus');
  if (el) el.textContent = msg;
}

function chessUpdateStatus(gameData) {
  const el = document.getElementById('chessStatus');
  if (!el) return;
  if (gameData.status === 'pending') { el.textContent = 'Waiting for opponent to accept…'; return; }
  if (gameData.status === 'complete') {
    const r = gameData.result;
    el.textContent = r === '1/2-1/2' ? 'Draw!' :
      (r === '1-0' ? (chessPlayerColor === 'w' ? 'You win!' : 'Opponent wins.') : (chessPlayerColor === 'b' ? 'You win!' : 'Opponent wins.'));
    chessShowEndButtons();
    return;
  }
  const myTurn = chessInst.turn() === chessPlayerColor;
  el.textContent = myTurn ? 'Your turn' : 'Opponent\'s turn…';
}

const CHESS_BOT_XP = { easy: 50, medium: 150, hard: 500 };

async function chessAwardBotWinXP() {
  if (!currentUser) return;
  const profile = brothers.find(b => b.email?.toLowerCase() === currentUser.email.toLowerCase());
  if (!profile) return;
  const xpGain = CHESS_BOT_XP[chessBotDiff] || 0;
  if (!xpGain) return;
  const newXP = Math.min(MAX_XP, (profile.xp || 0) + xpGain);
  await updateDoc(doc(db, 'brothers', profile.id), { xp: newXP, updatedAt: new Date().toISOString() });
  profile.xp = newXP;
  showToast(`Checkmate! +${xpGain} XP`, 'success');
}

function chessHandleGameOver() {
  let msg = 'Game over';
  let playerWonByCheckmate = false;

  if (chessInst.isCheckmate()) {
    const winnerIsWhite = chessInst.turn() === 'b';
    if (chessMode === 'bot') {
      const playerWon = winnerIsWhite === (chessPlayerColor === 'w');
      msg = playerWon ? 'Checkmate — You win! 🏆' : 'Checkmate — Bot wins.';
      if (playerWon) playerWonByCheckmate = true;
    } else {
      msg = winnerIsWhite === (chessPlayerColor === 'w') ? 'Checkmate — You win! 🏆' : 'Checkmate — Opponent wins.';
    }
  } else if (chessInst.isStalemate()) msg = 'Stalemate — Draw. (No XP awarded)';
  else if (chessInst.isDraw()) msg = 'Draw! (No XP awarded)';

  const el = document.getElementById('chessStatus');
  if (el) el.textContent = msg;

  if (playerWonByCheckmate) chessAwardBotWinXP();
  chessShowEndButtons();
}

function chessShowEndButtons() {
  const el = document.getElementById('chessActions');
  if (!el) return;
  el.innerHTML = `
    <button class="chess-action-btn chess-play-again-btn" id="chessPlayAgain">Play Again</button>
    <button class="chess-action-btn" id="chessEndBack">Back to Games</button>
  `;
  document.getElementById('chessPlayAgain').addEventListener('click', async () => {
    if (chessMode === 'bot') {
      const C = await getChessClass();
      chessInst = new C();
      chessSelected = null;
      renderChessGameScreen();
    } else {
      renderChessModeScreen();
    }
  });
  document.getElementById('chessEndBack').addEventListener('click', exitChess);
}

function chessResign() {
  if (chessMode === 'brother' && chessGameId) {
    updateDoc(doc(db, 'chessGames', chessGameId), {
      status: 'complete',
      result: chessPlayerColor === 'w' ? '0-1' : '1-0',
      updatedAt: new Date().toISOString(),
    });
  }
  const el = document.getElementById('chessStatus');
  if (el) el.textContent = 'You resigned.';
  chessShowEndButtons();
}
