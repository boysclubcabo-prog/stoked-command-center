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
         query, orderBy, serverTimestamp }         from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
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
  const style = `--ring-clr:${clr.icon};--ring-glow:${clr.glow.replace(/[\d.]+\)$/, '0.55)')};--ring-border:${clr.border}`;
  if (archetype && element) {
    const key = `${archetype.toLowerCase()}-${element.toLowerCase()}`;
    return `<div class="arch-icon-wrap ${ringClass} ${archClass}" style="${style}"><img src="icons/${key}.png" alt="${escHtml(archetype)} ${escHtml(element)}" class="arch-icon-img"></div>`;
  }
  const core = ARCHETYPE_ICONS[archetype] || '';
  return `<div class="arch-icon-wrap ${ringClass} ${archClass}" style="${style}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${core}</svg></div>`;
}

const ELEMENT_DESC = {
  Fire:  'Your strongest energy is passion, courage, action, and intensity.',
  Water: 'Your strongest energy is emotion, adaptability, connection, and intuition.',
  Air:   'Your strongest energy is ideas, creativity, awareness, and clarity of mind.',
  Earth: 'Your strongest energy is discipline, structure, and steady strength.',
};

const ARCHETYPE_DESC = {
  Warrior: {
    primary: `The Warrior is the man who does not wait for perfect conditions. He trains when he doesn't feel like it, competes when the odds are against him, and gets back up every single time. His growth lives inside difficulty. He understands that pain is not the enemy — softness is. He does not need to be angry to be dangerous. The Warrior is disciplined, focused, and relentless. He is not reckless — he is forged. His weapon is will.`,
    Fire:   `Fire is the element of ignition. A Warrior with Fire doesn't just fight — he burns. He leads with intensity, acts before others are ready, and refuses to let the moment die. His energy is contagious and his commitment is total. The challenge is learning to direct the flame. Uncontrolled fire destroys. Mastered fire forges.`,
    Water:  `A Warrior with Water fights from a different place. He is not driven by rage — he is driven by love. Love for his people, his purpose, and the things that matter. He can take a hit and keep moving because he feels deeply and channels it forward. His strength is not hard — it is fluid and relentless, like a river that carves through stone.`,
    Air:    `A Warrior with Air is the thinking fighter. He doesn't just train his body — he studies the game. He reads people, anticipates outcomes, and moves with strategic precision. Where brute force would fail, his mind wins. He is the man in the room who looks calm and sees everything.`,
    Earth:  `A Warrior with Earth is the most reliable man in any fight. He shows up. Every day. Without drama. His training is disciplined, his habits are locked in, and his endurance is built on years of consistent work. He doesn't peak — he sustains. He is the man still standing when everyone else has burned out.`,
    growth: `The Warrior is your blindspot. You have been avoiding the hard things — the physical discipline, the direct confrontation, the uncomfortable challenge — and it is costing you. You may move through life with strategy, creativity, or warmth, but without the Warrior's edge, you will struggle when life demands that you simply endure. Be wary of comfort-seeking, of backing down when things get hard, and of building a life that looks good but hasn't been tested. Developing this will give you backbone that no amount of thinking or feeling can replace.`,
    gFire:  `Fire is the energy you are least connected to right now — the raw heat of urgency, intensity, and bold action. Without it, you tend to overthink, delay, or soften decisions that need to be made. Learning to act before you feel fully ready, to compete without apology, and to bring intensity to what matters most — this is where a new level of you begins.`,
    gWater: `Water without the Warrior becomes passive. Your sensitivity and depth are real strengths — but without the edge of discipline and challenge, they can become excuses to avoid what is hard. The work is learning to feel deeply and still push forward. To be soft-hearted and hard-working at the same time. That combination is rare and it will make everything else you do more powerful.`,
    gAir:   `Air without the Warrior becomes analysis without action. You can think clearly and see the path — but the Warrior asks you to walk it, not just map it. Your growth comes from learning to execute with your body and your will, not just your mind. The discipline of physical challenge will ground your intelligence in a way nothing else can.`,
    gEarth: `Earth without the Warrior can become comfort disguised as stability. You are consistent — but are you being challenged? Your growth comes from deliberately choosing harder ground. Routine is your strength; now add resistance to it. The version of you that has also been tested will be significantly more capable than the one who has simply maintained.`,
  },
  Monk: {
    primary: `The Monk is the man who has learned that the greatest battles are fought inside. He is not passive — he is precise. He has trained himself to observe before reacting, to listen before speaking, to be still when everything else is moving. His self-mastery is not weakness — it is the highest form of discipline. He knows who he is because he has sat with himself long enough to find out.`,
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
  Creator: {
    primary: `The Creator cannot help but make things. He sees the world as raw material — a conversation, a room, a problem, a relationship — and his instinct is to shape it into something better than he found it. He is driven by expression and originates ideas that others follow. His art is not always on a canvas. It is in how he lives, leads, builds, and communicates. When he is alive in his gift, the world around him shifts.`,
    Fire:   `A Creator with Fire makes things that move people. He doesn't just build — he ignites. His work carries intensity and purpose. He creates with urgency, as if the idea will expire if he doesn't get it out. He is the one who starts the movement, launches the project, breaks the silence. His creative energy is a force, not a hobby.`,
    Water:  `A Creator with Water makes things that heal and connect. His work carries emotional truth. He writes the thing that makes people feel seen. He builds the space where others exhale. He is sensitive to beauty, to pain, to nuance, and his creations reflect all of it. What he makes isn't just impressive — it's meaningful.`,
    Air:    `A Creator with Air lives in the world of ideas and language. He thinks in stories, in metaphors, in systems of meaning. He can take something complex and make it clear, or take something ordinary and reveal its depth. His creativity is primarily of the mind — conceptual, philosophical, visionary.`,
    Earth:  `A Creator with Earth finishes what he starts. He is not just a dreamer — he is a maker in the truest sense. He brings ideas from imagination into physical reality through discipline, craft, and patience. He builds things that last. His work is tangible, well-made, and built to endure.`,
    growth: `The Creator is your blindspot. You are more rigid and less expressive than you need to be. You may follow the expected path, execute what's been proven, or stay inside lines that were drawn by someone else — and in doing so, you are suppressing something real. Be wary of defaulting to the safe option, of dismissing your own ideas before they have a chance, and of mistaking practicality for wisdom. Learning to create — to express, to make, to take the unconventional path — will bring a dimension of originality to your life that discipline alone cannot produce.`,
    gFire:  `Fire without the Creator's originality can become brute force. You act boldly, but are you creating anything new? Your growth comes from learning to bring creative energy into your intensity — to not just push harder but to push differently. The Creator asks you to stop repeating the pattern and start making something that didn't exist before.`,
    gWater: `Water without the Creator's expression can become emotion without outlet. You feel deeply, but are you making anything from it? The Creator gives your inner life a place to go. Begin expressing what is inside you — through writing, building, speaking, or making — and watch what was trapped inside you start to become something real in the world.`,
    gAir:   `Air without the Creator becomes theory without form. You see things clearly and think with sophistication — but the Creator challenges you to stop analyzing and start making. Ideas that remain in your head are not yet contributions. Begin expressing them. The gap between a thinker and a creator is simply the willingness to put something imperfect into the world.`,
    gEarth: `Earth without the Creator can produce a life that is solid but uninspired. You build with discipline, but are you building something original? The Creator's energy asks you to color outside the lines — to try the unconventional approach, to risk making something that might not work. Your reliability will give your creativity staying power. Together, they make something remarkable.`,
  },
  Explorer: {
    primary: `The Explorer is the man who was not made for standing still. He is drawn toward the unknown — new places, new ideas, new versions of himself. He doesn't fear the unfamiliar; he's energized by it. The Explorer doesn't wait for life to come to him — he goes after it. His courage is quiet but constant. He is the one who walks into rooms others avoid, tries things others dismiss, and keeps moving when others settle.`,
    Fire:   `An Explorer with Fire doesn't explore carefully — he charges. He is bold, fast-moving, and willing to go first. He doesn't need a map. He is the man who starts an adventure before he has a plan and figures it out along the way. His confidence in motion is contagious. He does not wait for permission.`,
    Water:  `An Explorer with Water moves through the world with emotional curiosity. He doesn't just explore places — he explores people, relationships, inner landscapes. He goes deep as well as wide. His journey is often inward, uncovering truths about himself through experience. He is drawn to depth, to mystery, to what's beneath the surface.`,
    Air:    `An Explorer with Air is the idea traveler. He explores through reading, conversation, philosophy, and connection. He collects perspectives the way other men collect gear. His range of thought is wide and his hunger to understand is constant. He might not travel far physically — but his mind covers vast territory.`,
    Earth:  `An Explorer with Earth is the adventurer who is also reliable. He goes out, pushes limits, and keeps coming back. He builds a life of adventure without losing his roots. His exploration is purposeful — he doesn't wander, he journeys. He comes home changed, and he brings what he learned back to the people he loves.`,
    growth: `The Explorer is your blindspot. You are playing it too safe. You are staying in familiar territory — the same environment, the same patterns, the same version of yourself — and calling it stability when it is actually stagnation. Be wary of turning down opportunities because they feel too risky, of staying in situations that have run their course, and of letting fear of the unknown keep you from the life that is waiting for you. Developing the courage to explore — new experiences, new challenges, new versions of yourself — will break you out of ceilings you may not even see yet.`,
    gFire:  `Fire without the Explorer's openness can become intensity in a box. You push hard but always in the same direction. Your growth comes from learning to apply your drive to unfamiliar ground — to take your intensity somewhere new. The Explorer's energy will expand what you are capable of by expanding where you are willing to go.`,
    gWater: `Water without the Explorer can become deep but still — feeling everything within a familiar emotional range without ever venturing beyond it. Your growth comes from exploring new emotional territory: new relationships, new depths of vulnerability, new experiences that challenge how you see yourself. Growth requires movement, even for the man who lives in feeling.`,
    gAir:   `Air without the Explorer becomes thinking without living. You have a rich inner world and a sharp mind — but the Explorer asks you to take those ideas into real experience. Go somewhere you haven't been. Do something you haven't done. Your intellect will be sharpened by contact with the unfamiliar in ways that reading and thinking alone cannot produce.`,
    gEarth: `Earth without the Explorer produces a man who is grounded but not growing. Your stability is genuine — but it can become a reason to never move. The Explorer asks you to take one step beyond the edge of your comfort zone, then another. Your rootedness is the greatest asset an explorer can have. Use it as a launchpad, not an anchor.`,
  },
  Leader: {
    primary: `The Leader is the man the room reorganizes around when he walks in. He doesn't need a title. He has presence, conviction, and the rare ability to make people believe in something bigger than themselves. His power is in what he inspires, not what he demands. He sees people clearly — their strengths, their limits, their potential — and he calls it out of them. He is not in it for the credit. He is in it for the outcome.`,
    Fire:   `A Leader with Fire is impossible to ignore. His energy fills the room before he says a word. He moves fast, decides boldly, and rallies people with his conviction. He doesn't wait for momentum — he creates it. His challenge is learning when to slow down, because the people behind him need time to follow.`,
    Water:  `A Leader with Water leads by feeling. He is deeply attuned to the people around him and earns loyalty through understanding, not authority. He listens with full presence. He notices who is struggling before they say anything. His team follows him not because they have to, but because they trust him completely.`,
    Air:    `A Leader with Air leads through vision and clarity. He can articulate where they're going better than anyone. He makes complex things simple. He gives people a picture of the future that makes them want to show up. His leadership is persuasive and inspiring — built on ideas and communication more than force.`,
    Earth:  `A Leader with Earth is the steady hand. He doesn't panic. He doesn't perform. He shows up every day and sets the standard through how he lives, not just what he says. His leadership is earned through consistency. People follow him because he has already proven he will do the work regardless of who is watching.`,
    growth: `The Leader is your blindspot. You are not stepping up — and people around you are paying for it. Whether through hesitation, self-doubt, or a preference to follow rather than direct, you are leaving influence on the table that belongs to you. Be wary of deferring when you should decide, of shrinking when the room needs someone to stand, and of waiting for permission that is never going to come. Developing your leadership will not just change your outcomes — it will change what the people around you are capable of.`,
    gFire:  `Fire without leadership becomes intensity with no direction — energy that moves fast but not together. Your growth is learning to point that heat at something larger than yourself and bring others with you. The moment you stop performing and start genuinely leading — even one person — your fire will find its purpose.`,
    gWater: `Water without leadership can become support that never steps forward. You are emotionally present for others but rarely the one who sets the direction. Your growth comes from learning to lead from your depth — to make the call, name the direction, and trust that your sensitivity to people makes you more qualified to lead, not less.`,
    gAir:   `Air without leadership becomes ideas without a champion. You see the vision, you understand the strategy — but someone else is always the one who steps up. Your growth comes from owning the room with your clarity. Stop advising and start leading. The insight you've been offering from the side belongs at the front.`,
    gEarth: `Earth without leadership becomes steadiness that never scales. You hold things together but rarely choose the direction. Your growth comes from stepping into the decision seat — from being not just the reliable one, but the responsible one. Your consistency and groundedness make you exactly the kind of leader people need. Step forward.`,
  },
  Builder: {
    primary: `The Builder is the man who makes things real. He doesn't get excited about ideas — he gets to work. He is defined by follow-through: setting a plan, doing the next thing, and keeping going when the novelty has worn off and the grind is all that's left. His results speak. He doesn't need to announce what he's building — you can see it. He is the architect of his own life and the foundation of every team he's part of.`,
    Fire:   `A Builder with Fire builds with intensity and urgency. He doesn't just grind — he burns while he works. He starts early, stays late, and brings a competitive edge to everything he constructs. His drive is massive and his output is high. His challenge is learning to build for the long game, not just the next sprint.`,
    Water:  `A Builder with Water builds things that serve others. His motivation is not personal glory — it is the deep satisfaction of creating something that meets a real need. He builds relationships as carefully as he builds projects. What he constructs tends to last because it is grounded in purpose, not ego.`,
    Air:    `A Builder with Air builds systems of thought — ideas, frameworks, communication structures. He is the man who designs the strategy, architects the process, and gives the work its clarity. He doesn't just do — he thinks through how to do it right. His contribution is often invisible but everything would fall apart without it.`,
    Earth:  `A Builder with Earth is the most consistent man in the room. He shows up the same way every day. No drama. No shortcuts. He lays the foundation properly and builds upward with patience. He is the man still working while others have already posted about their results. His life is built to last.`,
    growth: `The Builder is your blindspot. You are starting things and not finishing them — or you are waiting for the perfect plan before you begin. You may be strong in vision, in feeling, in strategy, but without the Builder's discipline of consistent daily execution, your potential stays potential. Be wary of abandoning projects when the excitement fades, of confusing motion with progress, and of building a life based on what sounds good rather than what you are actually willing to construct. Developing follow-through will close the gap between who you are and who you say you want to be.`,
    gFire:  `Fire without the Builder's discipline burns fast and leaves ash. Your intensity is real, but without follow-through, it becomes a pattern of starts without finishes. Your growth is learning to stay in the work after the excitement is gone — to build something day by day until it is actually done. Intensity that sustains is the rarest and most powerful combination.`,
    gWater: `Water without the Builder's structure can become feeling without form. You care deeply and connect genuinely, but caring is not the same as building. Your growth comes from translating your emotional investment into consistent daily action. The people and things you love deserve more than your feeling — they deserve your follow-through.`,
    gAir:   `Air without the Builder becomes ideas that never land. You think with clarity and see the path — but thinking is not building. Your growth comes from sitting down and doing the unglamorous work of making something real, brick by brick, day after day. The idea is worth nothing until it exists. Start constructing.`,
    gEarth: `Earth without the Builder can become stability without progress. You maintain well — but are you constructing anything new? Your groundedness is the perfect foundation for building. Use it. Choose one thing to build deliberately over the next season and commit to it without exception. Stability in motion is what the Builder brings.`,
  },
  Protector: {
    primary: `The Protector's identity is built around the people he is responsible for. He doesn't ask what he'll get — he asks what's needed. His loyalty is total and his presence is a form of safety. He is the man who steps between danger and the people he loves without thinking twice. He doesn't seek conflict, but he does not flinch from it when the people he loves are at stake. His strength is not worn for show — it is reserved for the moment it matters.`,
    Fire:   `A Protector with Fire guards with intensity. He is not passive about protection — he is fierce about it. He will speak loudly, act quickly, and stand between his people and anything that threatens them without hesitation. His protection comes from heat — the burning conviction that these people matter and that he will not let them down.`,
    Water:  `A Protector with Water protects emotionally as much as physically. He creates safety through presence, through listening, through being a steady place where others can fall apart without judgment. His protection is felt before it's seen. The people around him feel safe because he makes them feel understood.`,
    Air:    `A Protector with Air uses his mind to shield the people around him. He anticipates threats before they arrive. He sees around corners, asks the questions others miss, and prepares his people for what's coming. His protection is strategic — thinking through consequences so others don't have to suffer them.`,
    Earth:  `A Protector with Earth is unmovable. He is the wall between his family and chaos. He doesn't promise — he proves. Year after year, season after season, he is simply there. His people know he won't leave, won't give up, and won't fail them. That consistency is his greatest act of protection.`,
    growth: `The Protector is your blindspot. You are not showing up for the people around you the way they need — or you are showing up for yourself so completely that you have little left to give. You may be self-focused, emotionally unavailable, or simply unaware of the weight others are carrying that you could help carry. Be wary of being so consumed by your own journey that others feel unseen, of making promises you don't keep, and of underestimating how much your presence matters to the people around you. Developing the Protector in you will make you a man others can actually count on.`,
    gFire:  `Fire without the Protector's loyalty burns without regard for who gets hurt. Your intensity needs to be aimed at something beyond yourself — at the people who depend on you, the things worth defending, the men beside you. When your fire is put in service of others, it becomes something genuinely powerful rather than just impressive.`,
    gWater: `Water without the Protector can become empathy without commitment. You feel what others feel, but do you show up when it's costly? The Protector asks you to move from feeling to covering — to actually be there, physically and emotionally, in the moments that count. That shift from sensing to shielding is where your depth becomes strength.`,
    gAir:   `Air without the Protector becomes thought without loyalty. You see the situation clearly, but do you stand with anyone in it? Your growth comes from choosing your people deliberately and being unmovable in your commitment to them. Your clarity is a gift — use it to protect, not just to observe.`,
    gEarth: `Earth without the Protector can become self-sufficiency that isolates. You take care of yourself well — but who are you covering? Your groundedness is the exact quality the best protectors are built on. Root yourself in the lives of the people who matter and let your steadiness become their security.`,
  },
  Strategist: {
    primary: `The Strategist sees the board three moves ahead. While others react, he analyzes. While others debate, he has already mapped the options. He is not cold — he is precise. He understands that the quality of a decision matters far more than the speed of it, and he does not allow emotion or pressure to push him into a bad move. He is the man others want in the room when things get complicated. He finds the path others miss.`,
    Fire:   `A Strategist with Fire acts on his analysis with total conviction. He doesn't just plan — he executes boldly. He is the man who thinks it through and then goes hard. He doesn't second-guess once the decision is made. His strategic mind and his fire combine into something rare: a man who is both precise and decisive.`,
    Water:  `A Strategist with Water uses emotional intelligence as his primary strategic tool. He reads people with precision — their motivations, their fears, what they need. He plans around how humans actually behave, not how they should. His strategy is built on understanding, empathy, and deep observation of the people involved.`,
    Air:    `A Strategist with Air is the purest version of the archetype. His mind is his domain. He thinks in systems, in probability, in leverage points. He is highly adaptable because he processes information faster than others. He changes the plan when the data changes, without ego. He is always learning, always refining.`,
    Earth:  `A Strategist with Earth is the long-game player. He doesn't think in days — he thinks in years. He builds his plans with patience and implements them with consistent daily action. He doesn't chase the shortcut. He understands that the real leverage is in doing the unsexy thing, every day, for as long as it takes.`,
    growth: `The Strategist is your blindspot. You are reacting instead of thinking. You are making decisions from impulse, emotion, or habit rather than from a clear-eyed assessment of what is actually happening and what would actually work. Be wary of jumping to conclusions, of letting urgency replace wisdom, and of confusing decisiveness with clarity. Developing the Strategist's ability to pause, assess, and choose deliberately will stop you from paying the same price for the same avoidable mistakes.`,
    gFire:  `Fire without the Strategist's mind acts without counting the cost. Your urgency is a strength — but urgency in the wrong direction is expensive. Your growth is learning to think before you ignite. Not to slow down permanently, but to build the habit of a brief, sharp assessment before you act. One clear question before you move: is this the right direction?`,
    gWater: `Water without the Strategist can become emotional decision-making dressed as intuition. Your feelings are real data — but they are not the only data. Your growth comes from developing the discipline of stepping back from your emotional response to ask: what is actually true here? What is the most intelligent path forward? That distance between feeling and deciding is where wisdom lives.`,
    gAir:   `Air without the Strategist can be fast thinking that lacks depth. You see things quickly — but are you seeing them fully? The Strategist's practice of slowing down, mapping the situation, and testing assumptions will take your natural sharpness and give it substance. Think slower. Decide better.`,
    gEarth: `Earth without the Strategist can produce consistency without optimization. You show up every day — but are you doing the right things? Your growth comes from stepping back periodically to assess the entire system: what is working, what is not, and what should change. Your discipline plus strategic clarity will make your effort dramatically more effective.`,
  },
  Visionary: {
    primary: `The Visionary sees what isn't there yet and believes in it anyway. He lives in the possible. His greatest contribution is not what he does today but the picture he paints of what tomorrow could be. He is the man who changes the trajectory of a conversation, a company, or a community by asking "what if?" and meaning it. He is not a dreamer in the passive sense — he is a prophet in the truest sense: a man who sees ahead and moves accordingly.`,
    Fire:   `A Visionary with Fire doesn't just see the future — he declares it and dares people to join him. He moves toward his vision with urgency and charisma. He is the man who starts movements, launches missions, and pulls others into something they didn't know they needed until he named it. His passion makes the impossible feel inevitable.`,
    Water:  `A Visionary with Water sees the human future — the emotional and relational landscape of what could be. His vision is not about systems or industries — it is about people. He sees who others could become and what a family, a community, or a generation could look like if it were fully alive. His vision heals and inspires.`,
    Air:    `A Visionary with Air is the truest intellectual of the archetypes. He thinks across disciplines, connects distant ideas, and synthesizes patterns into new understanding. His vision is often ahead of its time. He is the man reading things others haven't discovered yet, thinking about things others haven't considered yet.`,
    Earth:  `A Visionary with Earth brings his vision down to ground level. He doesn't just dream — he builds the path toward the dream with his own hands. He is practical about the impractical. He takes the impossibly large vision and breaks it into the next brick to lay. He is the reason big ideas actually happen.`,
    growth: `The Visionary is your blindspot. You are living too small. You have accepted a version of your life that is far below what you are actually capable of seeing — and somewhere in you, you know it. You may be practical to a fault, afraid to say out loud what you actually want, or simply unaware that a bigger picture is available to you. Be wary of settling for what is reasonable when what is possible is right in front of you. Be wary of dismissing your own hunches about the future. Developing the Visionary in you will give everything else you do a sense of direction and meaning it currently lacks.`,
    gFire:  `Fire without vision burns in circles. Your intensity needs a horizon. The Visionary asks you to lift your eyes past the immediate challenge and ask: what is this all for? Where is this going? When your fire is aimed at something genuinely worth building, it will sustain in a way it never has before.`,
    gWater: `Water without vision can become depth without direction. Your emotional intelligence and relational gifts are real — but where are you taking them? The Visionary asks you to dream forward. What could your relationships, your family, your community look like in ten years if you led them with intention? Give your care a destination.`,
    gAir:   `Air without vision thinks clearly but not boldly. Your mind is sharp — but are you using it to see further than the immediate? The Visionary's gift is not just cleverness — it is the courage to believe in something that doesn't exist yet. Begin asking bigger questions. Train yourself to think in decades, not days.`,
    gEarth: `Earth without vision can produce a life that is well-built but uninspired. You work hard and you finish things — but are you building toward something that genuinely matters to you? The Visionary asks you to look up from the work and remember why you are doing it. Purpose is what turns a good life into a great one.`,
  },
  Communicator: {
    primary: `The Communicator holds people together through the power of his words and presence. He is the one who says the thing that needed to be said, who hears what others miss, and who builds trust through honest, real conversation. He doesn't just talk — he connects. His ability to articulate what others feel but cannot express is rare and powerful. When he uses his voice well, rooms shift. Relationships deepen. People feel less alone.`,
    Fire:   `A Communicator with Fire speaks with conviction and boldness. He is the one who says the hard thing directly, who rallies people with his words, and who is not afraid to take up space. His voice carries weight because his conviction is real. He doesn't soften things to be liked — he speaks truth because he cares about what happens when people hear it.`,
    Water:  `A Communicator with Water is the most emotionally intelligent man in the room. He listens at a level others rarely reach. He hears the feeling beneath the words. He can sit with someone in their pain without trying to fix it, and that presence is its own form of power. When he speaks, it is because he has something worth saying. And people feel it.`,
    Air:    `A Communicator with Air moves through words and ideas with natural ease. He articulates complex things clearly, expresses thoughts with precision, and makes people feel understood with language. He is the writer, the teacher, the voice that translates the difficult into the accessible. His gift is clarity — and clarity changes things.`,
    Earth:  `A Communicator with Earth speaks with weight and reliability. His words are grounded. He doesn't exaggerate, doesn't perform, doesn't oversell. When he says something, he means it. His communication is built over time through consistency and follow-through. People trust what he says because he always does what he said he would.`,
    growth: `The Communicator is your blindspot. You are not saying what needs to be said — or you are not listening the way the people around you need to be heard. You may avoid hard conversations, go quiet when your voice is most needed, or communicate on the surface while keeping your real thoughts and feelings locked away. Be wary of using silence as a shield, of letting relationships stay shallow because depth feels risky, and of hoping people will understand you without doing the work of actually being understood. Developing your communication will change every relationship you have.`,
    gFire:  `Fire without communication becomes force without connection. You act boldly — but do people around you understand why? Your growth comes from learning to speak your conviction clearly, to explain not just what you are doing but what it means and why it matters. The man who can act and articulate is unstoppable.`,
    gWater: `Water without communication stays internal. Your emotional depth is real, but unspoken depth serves no one. Your growth comes from learning to give your feelings words — not to perform vulnerability, but to build the kind of honest connection that your inner life is capable of creating. Say the true thing. It will change things.`,
    gAir:   `Air without communication becomes thought that never reaches anyone. Your clarity and insight deserve an audience. Your growth comes from learning to bring your ideas into conversation — to speak them, share them, and let them be tested. The man who thinks clearly and speaks clearly becomes one of the most valuable people in any room.`,
    gEarth: `Earth without communication can become reliability without intimacy. People count on you — but do they know you? Your growth comes from learning to let people in through honest conversation. Your steadiness makes you trustworthy. Your willingness to open up will make you irreplaceable.`,
  },
  Guardian: {
    primary: `The Guardian is the man who holds the line. He doesn't need applause or recognition — he needs to know that what he is responsible for is safe, strong, and standing. He is the keeper of standards, the reliable one, the man who shows up without being asked and leaves only when the job is done. His consistency is not a personality trait — it is a discipline he has chosen. He knows that his presence, his integrity, and his dependability are among the greatest gifts he can give.`,
    Fire:   `A Guardian with Fire protects with passion. He is not a passive presence — he is actively, intensely committed to keeping what he values safe. He will fight for what he guards. He will speak up when things are threatened. He doesn't just hold the line — he draws it boldly and stands on it.`,
    Water:  `A Guardian with Water keeps people safe through emotional presence. He creates environments where people feel held, heard, and seen. His steadiness is not cold — it is warm and deep. He guards the relational health of those around him with the same care a physical guardian would guard physical safety. He is the emotional anchor.`,
    Air:    `A Guardian with Air protects through awareness and foresight. He sees problems coming. He pays attention to what others dismiss. His vigilance is mental — he is always thinking about how to maintain what matters and prevent what threatens it. His protection is quiet and anticipatory rather than reactive.`,
    Earth:  `A Guardian with Earth is the most elemental version of the archetype. He is consistent, grounded, and utterly dependable. He doesn't shift with the mood or bend with the pressure. He is the same man in public that he is in private. His integrity is structural. What he guards, he guards for good.`,
    growth: `The Guardian is your blindspot. You are inconsistent in ways that are eroding trust — in yourself and in others. You may say one thing and do another, show up sometimes and disappear at others, or maintain your integrity selectively depending on who is watching. Be wary of letting your standards slip when things are comfortable, of making commitments you don't honor, and of building a reputation for reliability without doing the actual work of being reliable. Developing the Guardian in you will make your word mean something, and that changes everything.`,
    gFire:  `Fire without the Guardian's consistency is enthusiasm with no backbone. You bring energy — but can people count on you when the energy is gone? Your growth is learning to show up the same way when you don't feel like it as when you do. That consistency is what transforms intensity into trust.`,
    gWater: `Water without the Guardian can become care that cannot be counted on. You feel deeply and show up in the emotional moments — but do you hold the line in the practical ones? Your growth comes from pairing your relational warmth with structural reliability. Be the person who is emotionally present and always does what they said they would.`,
    gAir:   `Air without the Guardian becomes ideas without follow-through. You can see the right path clearly — now walk it consistently, even when it is boring. Your growth comes from developing the discipline of showing up the same way every day, regardless of how interesting it is. Clarity without consistency is just commentary.`,
    gEarth: `Earth without the Guardian can feel stable but lack true integrity. You are consistent in your habits — but are you consistent in your word? In your standards? In who you are when no one is watching? The Guardian asks you to hold the same line in every context. That is what turns consistency into character.`,
  },
  Sovereign: {
    primary: `The Sovereign is the man who has taken full ownership of his life. He does not blame, defer, or wait for permission. He has decided what he stands for and he lives accordingly. His authority is not given — it is earned through self-mastery and consistency. He is the man others look to not because of his title but because of how he carries himself. His presence communicates something that cannot be faked: a man who is at home in himself, accountable to his values, and unwilling to compromise his integrity.`,
    Fire:   `A Sovereign with Fire is commanding. He does not ask for the room — he takes it. His presence is felt immediately. He is bold, self-possessed, and deeply confident without arrogance. He knows what he stands for and he doesn't apologize for it. His authority comes from the inside and radiates outward. People follow him because he is already leading himself.`,
    Water:  `A Sovereign with Water leads himself through deep self-knowledge. He has sat with his own darkness, his own desires, his own wounds — and he has taken responsibility for all of them. His sovereignty is not loud — it is quiet and total. He is at peace with who he is and who he is not. He doesn't need validation because he has already done the hard work of knowing himself.`,
    Air:    `A Sovereign with Air governs through clarity of thought and principle. He has built a philosophy by which he lives and he does not deviate from it under pressure. His self-rule is intellectual and ethical. He thinks before he acts, speaks before he reacts, and makes decisions rooted in his values rather than his emotions.`,
    Earth:  `A Sovereign with Earth has built his authority over years of consistency. He is the man who has shown up day after day, kept his word season after season, and built a life he can stand behind. His sovereignty is not declared — it is demonstrated. It is visible in how he lives. He has earned the right to lead himself, and that earns him the trust of others.`,
    growth: `The Sovereign is your blindspot. You are giving your power away — to other people's opinions, to circumstances outside your control, or to habits and patterns you haven't yet chosen to break. You may blame your situation, wait for others to change first, or live by a standard that was handed to you rather than one you deliberately chose. Be wary of excuses, of victimhood disguised as awareness, and of knowing what you should do while still not doing it. Developing the Sovereign in you begins with one decision: to take total ownership of your life, starting now.`,
    gFire:  `Fire without sovereignty becomes reactivity. You burn — but who is in control? Your growth is learning to be the source of your own fire, not just a responder to what ignites you. The Sovereign asks you to decide your direction, your standard, and your identity — and then let your intensity serve that decision rather than override it.`,
    gWater: `Water without sovereignty can become being shaped by everyone else's emotional current. You are sensitive to others — but whose life are you actually living? Your growth comes from developing the interior clarity to know what you stand for, independent of who you are around. Emotional depth is only as powerful as the self it is rooted in.`,
    gAir:   `Air without sovereignty becomes perpetual analysis of a life you're not fully owning. You see yourself clearly — but seeing is not deciding. The Sovereign asks you to stop observing your life and start governing it. Take your self-awareness and make it actionable. Decide. Commit. Own the outcome.`,
    gEarth: `Earth without sovereignty can become following the same path because it has always been the path. Your reliability is real — but is this life yours? The Sovereign asks you to step back and choose deliberately: your values, your direction, your standards. A man who builds with intention on ground he has chosen is a different man entirely.`,
  },
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
  Leader: {
    trailAccent: '▲',
    trailBg: 'repeating-linear-gradient(60deg,currentColor 0,currentColor 1px,transparent 0,transparent 30px) 0 0/30px 52px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="95" cy="32" r="26" stroke="currentColor" stroke-width="0.9" opacity="0.13"/>
      <circle cx="95" cy="32" r="18" stroke="currentColor" stroke-width="0.7" opacity="0.11"/>
      <line x1="95" y1="6" x2="95" y2="58" stroke="currentColor" stroke-width="1.2" opacity="0.2"/>
      <line x1="69" y1="32" x2="121" y2="32" stroke="currentColor" stroke-width="1.2" opacity="0.2"/>
      <line x1="77" y1="14" x2="113" y2="50" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <line x1="113" y1="14" x2="77" y2="50" stroke="currentColor" stroke-width="0.7" opacity="0.12"/>
      <polygon points="95,6 91,18 95,14 99,18" fill="currentColor" opacity="0.4"/>
      <polygon points="121,32 109,28 113,32 109,36" fill="currentColor" opacity="0.25"/>
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
  Strategist: {
    trailAccent: '◎',
    trailBg: 'repeating-linear-gradient(0deg,currentColor 0,currentColor 1px,transparent 0,transparent 16px),repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 0,transparent 16px) 0 0/16px 16px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="72" y="4"  width="12" height="12" fill="currentColor" opacity="0.1"/>
      <rect x="84" y="4"  width="12" height="12" fill="currentColor" opacity="0.07"/>
      <rect x="72" y="16" width="12" height="12" fill="currentColor" opacity="0.07"/>
      <rect x="84" y="16" width="12" height="12" fill="currentColor" opacity="0.1"/>
      <rect x="96" y="4"  width="12" height="12" fill="currentColor" opacity="0.1"/>
      <rect x="96" y="16" width="12" height="12" fill="currentColor" opacity="0.07"/>
      <rect x="72" y="28" width="12" height="12" fill="currentColor" opacity="0.1"/>
      <rect x="84" y="28" width="12" height="12" fill="currentColor" opacity="0.07"/>
      <rect x="96" y="28" width="12" height="12" fill="currentColor" opacity="0.1"/>
      <path d="M10 10 L50 10 L50 50 L10 50 Z" stroke="currentColor" stroke-width="1" fill="none" opacity="0.14"/>
      <line x1="10" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="0.8" opacity="0.13"/>
      <line x1="30" y1="10" x2="30" y2="50" stroke="currentColor" stroke-width="0.8" opacity="0.13"/>
      <circle cx="30" cy="30" r="6" stroke="currentColor" stroke-width="1" fill="none" opacity="0.16"/>
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
  Communicator: {
    trailAccent: '◇',
    trailBg: 'repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 0,transparent 20px) 0 0/20px 20px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="18" width="10" height="18" rx="5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.24"/>
      <path d="M39 32 Q39 46 49 46 Q59 46 59 32" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.24" stroke-linecap="round"/>
      <line x1="49" y1="46" x2="49" y2="54" stroke="currentColor" stroke-width="1.5" opacity="0.22" stroke-linecap="round"/>
      <line x1="43" y1="54" x2="55" y2="54" stroke="currentColor" stroke-width="1.5" opacity="0.2" stroke-linecap="round"/>
      <path d="M70 32 Q80 20 80 32 Q80 44 70 32" stroke="currentColor" stroke-width="1.3" fill="none" opacity="0.28" stroke-linecap="round"/>
      <path d="M65 32 Q84 14 84 32 Q84 50 65 32" stroke="currentColor" stroke-width="1"   fill="none" opacity="0.2"  stroke-linecap="round"/>
      <path d="M60 32 Q88 8 88 32 Q88 56 60 32"  stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.14" stroke-linecap="round"/>
      <path d="M95 32 Q105 20 105 32 Q105 44 95 32" stroke="currentColor" stroke-width="1.3" fill="none" opacity="0.22" stroke-linecap="round"/>
      <path d="M90 32 Q109 10 109 32 Q109 54 90 32"  stroke="currentColor" stroke-width="0.8" fill="none" opacity="0.14" stroke-linecap="round"/>
    </svg>`,
  },
  Guardian: {
    trailAccent: '⬡',
    trailBg: 'repeating-linear-gradient(60deg,currentColor 0,currentColor 1px,transparent 0,transparent 20px),repeating-linear-gradient(-60deg,currentColor 0,currentColor 1px,transparent 0,transparent 20px) 0 0/20px 34px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="82" cy="28" r="26" stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.12"/>
      <circle cx="82" cy="28" r="20" stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.14"/>
      <circle cx="82" cy="28" r="14" stroke="currentColor" stroke-width="0.8" fill="none" opacity="0.16"/>
      <circle cx="82" cy="28" r="8"  stroke="currentColor" stroke-width="0.9" fill="none" opacity="0.18"/>
      <circle cx="82" cy="28" r="3"  fill="currentColor" opacity="0.25"/>
      <path d="M82 54 Q68 62 56 58" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.15" stroke-linecap="round"/>
      <path d="M82 54 Q94 62 106 58" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.15" stroke-linecap="round"/>
      <path d="M10 20 L10 56 M22 14 L22 56 M34 20 L34 56" stroke="currentColor" stroke-width="1.5" opacity="0.13" stroke-linecap="round"/>
      <path d="M6 20 Q16 6 28 14 Q40 6 40 20" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.14" stroke-linecap="round"/>
    </svg>`,
  },
  Sovereign: {
    trailAccent: '♔',
    trailBg: 'repeating-linear-gradient(45deg,currentColor 0,currentColor 1px,transparent 0,transparent 22px),repeating-linear-gradient(-45deg,currentColor 0,currentColor 1px,transparent 0,transparent 22px) 0 0/22px 22px',
    decorSvg: `<svg viewBox="0 0 130 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M70 38 L76 10 L86 28 L96 4 L106 28 L116 10 L122 38 Z" stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.2" stroke-linejoin="round"/>
      <line x1="68" y1="42" x2="124" y2="42" stroke="currentColor" stroke-width="1.4" opacity="0.18" stroke-linecap="round"/>
      <rect x="78" y="42" width="36" height="16" stroke="currentColor" stroke-width="1" fill="none" opacity="0.14"/>
      <rect x="10" y="18" width="8" height="40" stroke="currentColor" stroke-width="1" fill="none" opacity="0.16" rx="1"/>
      <rect x="28" y="12" width="8" height="46" stroke="currentColor" stroke-width="1" fill="none" opacity="0.16" rx="1"/>
      <path d="M6 18 Q14 4 22 12 Q30 4 40 18" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.18" stroke-linecap="round"/>
    </svg>`,
  },
};

const ARCHETYPE_STAGE_NAMES = {
  1: ['Iron Will',   'Stillness',  'Spark',     'Wander',    'Lead Yourself', 'Foundation', 'Watch',  'Observe',   'Dream',   'Voice',    'Roots',    'Claim'],
  2: ['Steel Mind',  'Depth',      'Form',      'Discovery', 'Lead Others',   'Blueprint',  'Guard',  'Plan',      'See',     'Connect',  'Stand',    'Rule'],
  3: ['Brotherhood', 'Mastery',    'Flow',      'Wild',      'Build a Team',  'Build',      'Serve',  'Execute',   'Create',  'Influence','Preserve', 'Wisdom'],
  4: ['Sovereign',   'The Sage',   'The Work',  'Pathfinder','The Commander', 'Architect',  'Shield', 'The Master','Prophet', 'Orator',   'The Elder','The King'],
};
const ARCHETYPE_STAGE_NAME_MAP = {
  Warrior:      ['Iron Will','Steel Mind','Brotherhood','Sovereign Warrior'],
  Monk:         ['Stillness','Depth','Mastery','The Sage'],
  Creator:      ['Spark','Form','Flow','The Work'],
  Explorer:     ['Wander','Discovery','Wild','The Pathfinder'],
  Leader:       ['Lead Yourself','Lead Others','Build a Team','The Commander'],
  Builder:      ['Foundation','Blueprint','Build','The Architect'],
  Protector:    ['Watch','Guard','Serve','The Shield'],
  Strategist:   ['Observe','Plan','Execute','The Master'],
  Visionary:    ['Dream','See','Create','The Prophet'],
  Communicator: ['Voice','Connect','Influence','The Orator'],
  Guardian:     ['Roots','Stand','Preserve','The Elder'],
  Sovereign:    ['Claim','Rule','Wisdom','The King'],
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
  Leader: {
    motto: 'Lead through action.',
    symbol: '▲',
    stages: [
      [
        { title: 'Family Game Night',     task: 'Organize a family game night. You plan it. Take one group photo.' },
        { title: 'Cook Together',         task: 'Cook dinner alongside a parent. Photograph the finished meal.' },
        { title: 'Lead a Workout',        task: 'Lead a 10-minute workout for at least one other person. Photograph the group.' },
        { title: 'Plan Tomorrow',         task: 'Write tomorrow\'s full schedule tonight. Photograph your written plan.' },
        { title: 'Organize Unprompted',   task: 'Organize one room in your home before anyone asks you to. Photograph the result.' },
      ],
      [
        { title: 'Run a Meeting',         task: 'Organize and run a real meeting with an agenda — family, team, or group. Document the outcome.' },
        { title: 'Delegate',              task: 'Assign a task to someone and trust them to do it. Write what you delegated and the result.' },
        { title: 'Resolve a Conflict',    task: 'Mediate or resolve a real disagreement between two people. Write how you did it.' },
        { title: 'Public Speaking',       task: 'Speak in front of 5+ people on any topic. Record a clip or photograph the room.' },
        { title: 'Accountability Partner',task: 'Make a commitment with someone and hold each other to it for 2 weeks.' },
      ],
      [
        { title: 'Recruit',            task: 'Bring 3+ people together around a shared mission or project. Lead the first meeting.' },
        { title: 'Feedback Session',   task: 'Ask 3 people who know you well for honest feedback on your leadership. Write what you heard.' },
        { title: 'Lead Under Pressure',task: 'Take charge in a high-stress situation — solve a real problem others are struggling with.' },
        { title: 'Vision Cast',        task: 'Present a vision for something you want to build or change to at least 3 people. Document their response.' },
        { title: 'Develop Someone',    task: 'Intentionally invest in helping one person grow over 30 days. Write their progress.' },
      ],
      [
        { title: 'Complete a Project', task: 'Conceive, plan, and complete a real project with a team. Document every phase.' },
        { title: 'The Hard Call',      task: 'Make a genuinely difficult leadership decision that affects others. Write your reasoning and the outcome.' },
        { title: 'Leader\'s Legacy',   task: 'Write what you want to be remembered for as a leader. Share it with your team.' },
        { title: 'Build the Next Leader', task: 'Identify someone with leadership potential. Spend 30 days actively developing them.' },
        { title: 'Keynote',            task: 'Give a 10+ minute talk to the largest audience you\'ve ever addressed. Film it.' },
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
  Strategist: {
    motto: 'Think first.',
    symbol: '◎',
    stages: [
      [
        { title: 'Solve a Puzzle',  task: 'Solve a puzzle, Rubik\'s cube, or logic challenge. Photograph it completed.' },
        { title: 'Top 3 Goals',     task: 'Write your top 3 goals for the week. Photograph the list.' },
        { title: 'Morning Routine', task: 'Write your ideal morning routine in full. Photograph it.' },
        { title: 'Weekly Calendar', task: 'Plan and organize your calendar for the entire week. Photograph it.' },
        { title: 'Strategy Game',   task: 'Play one strategy game with a family member. Photograph the game in progress.' },
      ],
      [
        { title: 'SWOT Yourself', task: 'Write a full personal SWOT analysis — strengths, weaknesses, opportunities, threats. Photograph it.' },
        { title: '90-Day Plan',   task: 'Write a complete 90-day personal development plan with goals, milestones, and actions.' },
        { title: 'Both Sides',    task: 'Prepare and argue both sides of a complex issue. Write your strongest points for each.' },
        { title: 'Chess — 10 Games', task: 'Play 10 games of chess or go. Record your wins, losses, and what you learned.' },
        { title: 'Pre-Mortem',    task: 'Pick one major goal and write every possible way it could fail. Then write how you\'d prevent each.' },
      ],
      [
        { title: 'Execute the Plan',      task: 'Complete the full 90-day plan you designed in Stage II. Document what happened.' },
        { title: 'War Room',              task: 'Set up a dedicated space for thinking, planning, and strategy. Photograph and document its purpose.' },
        { title: 'Study a Strategist',    task: 'Spend one week studying Sun Tzu, Napoleon, or another great strategist. Write your 5 biggest lessons.' },
        { title: 'Solve a Real Problem',  task: 'Identify a real problem in your life or community. Write a complete strategic solution with steps and timeline.' },
        { title: 'After-Action Review',   task: 'Review the last 90 days of your life in detail — what worked, what failed, what you\'re changing.' },
      ],
      [
        { title: 'The Grand Strategy', task: 'Write your complete life strategy — a 10-year plan covering every domain. Specific and actionable.' },
        { title: 'Teach Strategy',     task: 'Teach 3+ people how to think and plan strategically. Lead a 1-hour session.' },
        { title: 'Turn a Loss',        task: 'Take your biggest recent failure and execute a complete strategic reversal within 90 days.' },
        { title: 'Change the Game',    task: 'Identify one area where you\'re playing the wrong game entirely. Change the game. Document the shift.' },
        { title: 'Predict and Win',    task: 'Make 5 bold predictions about your life in the next year. Document them now. Check back in 12 months.' },
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
  Communicator: {
    motto: 'Connect honestly.',
    symbol: '◇',
    stages: [
      [
        { title: '20-Minute Talk',    task: 'Have a real 20-minute conversation with a parent. Take a selfie together after.' },
        { title: 'Thank-You Note',    task: 'Write a genuine thank-you note to someone. Photograph it before giving it.' },
        { title: 'Ask a Grandparent', task: 'Ask a grandparent or elder about their childhood. Photograph together or photograph your notes.' },
        { title: '3 Compliments',     task: 'Give three genuine, specific compliments today. Write the names and photograph the list.' },
        { title: 'Interview Someone', task: 'Interview someone you admire with at least 5 questions. Photograph your notes.' },
      ],
      [
        { title: 'Cold Outreach',    task: 'Reach out to someone you\'ve never met but admire. Write what happened.' },
        { title: 'Public Speaking',  task: 'Speak in front of 10+ people on any topic. Record the moment.' },
        { title: 'Write and Send',   task: 'Write a letter or message to someone who changed your life. Send it.' },
        { title: 'Active Listening', task: 'Spend one full conversation only listening — no advice, no stories about yourself. Write what you heard.' },
        { title: 'Clear the Air',    task: 'Have an honest conversation that resolves something unresolved. Write the outcome.' },
      ],
      [
        { title: 'Give a Talk',      task: 'Give a 10-minute prepared talk to a real audience on something you care about. Film it.' },
        { title: 'Publish',          task: 'Publish something — an essay, a post, an article — that expresses a real opinion. Share it.' },
        { title: 'Deep Listen Week', task: 'Spend one full week prioritizing listening in every conversation. Journal what changed.' },
        { title: 'Build a Bridge',   task: 'Connect two people who need to know each other. Write what happened.' },
        { title: 'Hard Feedback',    task: 'Deliver difficult feedback to someone in a way that strengthens rather than damages the relationship.' },
      ],
      [
        { title: 'Keynote',         task: 'Deliver a keynote or major talk to the largest audience you\'ve ever addressed. Film the whole thing.' },
        { title: 'Publish Your Voice', task: 'Create and publish a body of work — a series, a podcast, a blog — over 30 days. Document the reach.' },
        { title: 'Mediate',         task: 'Mediate a real, serious conflict between two parties. Write the outcome and what you learned.' },
        { title: 'Communicator\'s Code', task: 'Write your personal code of communication — how you speak, listen, and connect. Share it with the Brotherhood.' },
        { title: 'Change the Room', task: 'Enter a situation where people are confused or arguing and change the energy through words alone.' },
      ],
    ],
  },
  Guardian: {
    motto: 'Consistency builds trust.',
    symbol: '⬡',
    stages: [
      [
        { title: 'Make Your Bed — 7 Days',  task: 'Make your bed every morning for 7 consecutive days. Photograph it on Day 7.' },
        { title: 'Water Plants — 7 Days',   task: 'Water plants consistently for 7 days. Photograph them on Day 7.' },
        { title: 'Care for a Pet',          task: 'Take full responsibility for feeding and caring for a pet for one week. Photograph on Day 7.' },
        { title: 'Prepare the Night Before',task: 'Lay out tomorrow\'s clothes and prepare your bag the night before for 5 days. Photograph on Day 5.' },
        { title: 'Clean a Shared Space',    task: 'Clean one shared space in your home that others use. Photograph the result.' },
      ],
      [
        { title: '30-Day Habit',   task: 'Choose one positive daily habit and execute it every day for 30 days. Log every day.' },
        { title: 'Keep Your Word', task: 'Make 3 commitments to 3 different people and keep all three without being reminded. Document each.' },
        { title: 'Reliability Test', task: 'Ask 3 people who know you well: "Can you count on me?" Write what they honestly say.' },
        { title: 'Own a Responsibility', task: 'Take ownership of one household responsibility. Hold it for 30 days without being reminded.' },
        { title: 'Ancestors\' Night',    task: 'Learn and document the stories of 3 family members across 2+ generations. Write what you discovered.' },
      ],
      [
        { title: '90-Day Stack',    task: 'Maintain a stack of 3+ daily habits every day for 90 days. Log all 90.' },
        { title: 'Integrity Audit', task: 'Review the last 30 days: where did you say one thing and do another? Write it honestly and fix one.' },
        { title: 'Community Pillar',task: 'Become a reliable presence in one community — show up consistently for 30+ days. Document it.' },
        { title: 'The Family Tree', task: 'Build a documented family tree going back at least 3 generations. Photograph your research.' },
        { title: 'Protect the Ritual', task: 'Establish a recurring ritual with people you love. Hold it consistently for 30 days.' },
      ],
      [
        { title: 'Guardian\'s Year', task: 'For 12 consecutive months, maintain your core habits, rituals, and commitments without breaking them.' },
        { title: 'Pass It Down',    task: 'Teach something you know — a skill, a value, a tradition — to someone at least 10 years younger.' },
        { title: 'Write the Family Story', task: 'Document your family\'s complete story as far back as you can research. Preserve it for the next generation.' },
        { title: 'Guardian\'s Oath', task: 'Write your personal oath of consistency — what you commit to doing, being, and protecting forever. Share it.' },
        { title: 'Legacy Ritual',   task: 'Create a ritual you will pass to your children or community. Hold it once and document why it matters.' },
      ],
    ],
  },
  Sovereign: {
    motto: 'Serve before you lead.',
    symbol: '♔',
    stages: [
      [
        { title: 'Cook a Full Meal',       task: 'Cook a full meal for your family from scratch. Photograph the table set and ready.' },
        { title: 'Family Meeting',         task: 'Organize and lead a family dinner or meeting. Photograph everyone together.' },
        { title: 'Personal Code',          task: 'Write your personal code — 5 rules you want to live by. Photograph the written page.' },
        { title: 'Help Someone\'s Goal',   task: 'Help one person make real progress on their goal this week. Photograph the moment or your notes.' },
        { title: 'Unforgettable Moment',   task: 'Create one unforgettable family moment — a game night, a hike, a dessert evening. Take one photo together.' },
      ],
      [
        { title: 'Lead the Room',   task: 'Take command in a social or professional setting and leave it better than you found it. Write what you did.' },
        { title: 'Royal Generosity',task: 'Give something significant — time, money, resources — to someone without expecting anything back. Document it.' },
        { title: 'Own the Outcome', task: 'Take full responsibility for something that went wrong in your life. Write what you did to fix it.' },
        { title: 'The King\'s Table', task: 'Host a gathering — dinner, event, or meeting — for at least 5 people. You organize everything. Photograph it.' },
        { title: 'Discipline Check', task: 'Review your daily habits. Where are you acting like a servant of comfort? Fix one thing for 30 days.' },
      ],
      [
        { title: 'Study Great Kings',  task: 'Spend one week studying two great kings or leaders. Write 5 principles you\'re adopting.' },
        { title: 'Kingdom Audit',      task: 'Audit your life: finances, health, relationships, environment, legacy. Write what needs a king\'s attention.' },
        { title: 'Mentor Without Credit', task: 'Spend 30 days investing in someone else\'s growth while seeking zero credit or acknowledgment.' },
        { title: 'Sacrifice',          task: 'Give up something you enjoy for 30 days in service of your bigger mission. Document the impact.' },
        { title: 'Sovereign Decision', task: 'Make one major decision you\'ve been avoiding. Own it completely. Write your reasoning.' },
      ],
      [
        { title: 'The Kingdom',         task: 'Define your kingdom — the people, places, and domains you are responsible for. Write a complete inventory.' },
        { title: 'Legacy Speech',       task: 'Write the speech you want delivered at your funeral — to clarify how you must live, not to be morbid.' },
        { title: 'Rule for Others',     task: 'For 90 days, put someone else\'s growth or success before your own in every decision. Document it.' },
        { title: 'Crown a Successor',   task: 'Identify someone you are developing to lead after you. Invest 60 days in them. Write their progress.' },
        { title: 'The Final Trial',     task: 'Face the single hardest thing in your life right now with full sovereignty — no excuses, no escape. Document the outcome.' },
      ],
    ],
  },
};

const ARCHETYPE_ORDER = ['Warrior','Monk','Creator','Explorer','Leader','Builder','Protector','Strategist','Visionary','Communicator','Guardian','Sovereign'];

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

  // Check Firestore — existing accounts may have lost their localStorage flag
  // (new device, cleared storage, etc.). Never re-onboard someone who already
  // has a profile.
  try {
    const snap = await getDocs(collection(db, 'brothers'));
    const existing = snap.docs.find(d => {
      const e = d.data().email;
      return e && e.toLowerCase() === currentUser.email.toLowerCase();
    });
    if (existing) {
      localStorage.setItem(key, '1');
      return false;
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
      try {
        newBrotherId = 'br_' + Date.now().toString(36);
        await setDoc(doc(db, 'brothers', newBrotherId), {
          ...profileData,
          email:                currentUser.email.toLowerCase(),
          xp:                   0,
          role:                 'member',
          onboardingAccepted:   true,
          onboardingAcceptedAt: new Date().toISOString(),
          createdAt:            new Date().toISOString(),
          updatedAt:            new Date().toISOString(),
        });
      } catch (err) {
        showToast('Error saving profile: ' + err.message, 'info');
        return;
      }
      // ── Screen 3: Assessment bridge ──
      showOnboardAssessmentBridge(onboardEl, () => {
        localStorage.setItem(key, '1');
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
  const mypathTabBtn  = document.getElementById('mypathTabBtn');
  if (mypathTabBtn) mypathTabBtn.classList.toggle('hidden', isAdmin);

  // Members land on My Path by default — but wait for first data load
  if (!isAdmin) switchTab('brothers'); // show skeleton while loading

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
      switchTab('mypath');
    }
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
  const isMyPath     = tab === 'mypath';
  const isMain       = !isSocialFeed && !isChallenges && !isRoster && !isMyPath;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab));

  document.querySelector('.main').classList.toggle('hidden', !isMain);
  statsBar.classList.toggle('hidden', !isMain || !isAdmin);
  memberHero.classList.toggle('hidden', !isMain || isAdmin);
  document.getElementById('socialFeedSection').classList.toggle('hidden', !isSocialFeed);
  document.getElementById('communitySection').classList.toggle('hidden', !isChallenges);
  document.getElementById('rosterSection').classList.toggle('hidden', !isRoster);
  document.getElementById('mypathSection').classList.toggle('hidden', !isMyPath);

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
  if (isMyPath)  renderMyPath();
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
  const icon  = archetypeElementIcon(displayArchetype, profile.dominantElement, profile.xp);
  const elColor = ELEMENT_COLORS[profile.dominantElement];

  memberHero.innerHTML = `
    <div class="member-card" data-archetype="${escHtml(displayArchetype||'')}" data-element="${escHtml(profile.dominantElement||'')}" style="--arch-border:${clr.border};--arch-glow:${clr.glow};--arch-icon:${clr.icon}">
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
            <div class="score-lbl">Daily Score</div>
            <div class="score-cat" style="color:${cat.color}">${cat.label}</div>
          </div>`;
        })() : `<div class="score-chip weekly empty">
          <div class="score-num" style="color:var(--text-muted)">—</div>
          <div class="score-lbl">Daily Score</div>
          <div class="score-cat" style="color:var(--text-muted)">No Check-In Today</div>
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

      <button class="btn-checkin-member" data-checkin="${profile.id}">✓ Daily Check-In</button>
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
  const archIcon = archetypeElementIcon(displayArchetype, brother.dominantElement, brother.xp);
  const archClr  = ARCHETYPE_COLORS[displayArchetype] || { border:'var(--border)', glow:'transparent', icon:'var(--orange)' };
  const archElColor = ELEMENT_COLORS[brother.dominantElement];
  const maxed   = xp >= MAX_XP;
  const nextText = lvl.next ? `${lvl.xpNeededForNext.toLocaleString()} XP to ${lvl.next.name}` : 'MAX LEVEL ACHIEVED';

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
            <div class="score-lbl">Daily Score</div>
            <div class="score-cat" style="color:${cat.color}">${cat.label}</div>
          </div>`;
        })() : `<div class="score-chip weekly empty">
          <div class="score-num" style="color:var(--text-muted)">—</div>
          <div class="score-lbl">Daily Score</div>
          <div class="score-cat" style="color:var(--text-muted)">No Check-In Today</div>
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
      brothers.push({ id: assessBrotherId, email: currentUser.email.toLowerCase(), xp: 0, role: 'member', ...assessmentData });
    }
    render();

    try {
      await updateDoc(doc(db, 'brothers', assessBrotherId), assessmentData);
    } catch (err) {
      console.error('Failed to save assessment results:', err);
      showToast('Results shown but failed to save — check your connection and retake.', 'info');
    }
  }

  // Store archetype results for final display, then go to profile questions
  profileAnswers._archetype = { primaryArchetype, growthArchetype, dominantElement, growthElement };
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
  const { primaryArchetype, growthArchetype, dominantElement, growthElement } = profileAnswers._archetype || {};

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
      const profileData = {
        yearlyGoal:  profileAnswers.yearlyGoal  || '',
        strengths:   profileAnswers.strengths   || '',
        struggles:   profileAnswers.struggles   || '',
        interests:   profileAnswers.interests   || [],
        oneWord:     profileAnswers.oneWord      || '',
      };
      if (local) Object.assign(local, profileData);
    } catch (err) {
      console.error('Failed to save profile:', err);
      showToast('Profile shown but failed to save — check connection.', 'info');
    }
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
    ${(isAdmin || isMentor) ? `<button class="btn btn-primary btn-sm" id="openAnnouncementBtn">📣 Post</button>` : ''}
  </div>`;

  if (!feedPosts.length) {
    html += `<div class="feed-empty">No posts yet — complete a challenge to post your first win! 🏆</div>`;
    el.innerHTML = html;
    if (isAdmin || isMentor) bindAnnouncementBtn(el);
    return;
  }

  feedPosts.forEach(post => {
    const ago = timeAgo(post.createdAt);
    const brother = brothers.find(b => b.id === post.brotherId);
    const icon = brother ? archetypeElementIcon(brother.primaryArchetype || brother.archetype, brother.dominantElement, brother.xp) : '';

    if (post.type === 'announcement') {
      const posterName = post.authorName || 'Coach';
      const posterBrother = post.authorId ? brothers.find(b => b.id === post.authorId) : null;
      const pArch = post.authorArchetype || posterBrother?.primaryArchetype || posterBrother?.archetype;
      const pElem = post.authorElement  || posterBrother?.dominantElement;
      const posterIconHtml = pArch
        ? archetypeElementIcon(pArch, pElem || null, posterBrother?.xp)
        : (post.authorIcon || '🏆');
      const canDelete  = isAdmin || (isMentor && post.authorId === profile?.id);
      // Find pinned challenge if any
      const pinnedCh   = post.pinnedChallengeId ? challenges.find(c => c.id === post.pinnedChallengeId) : null;
      const myPinnedSub = pinnedCh ? submissions.find(s => s.challengeId === pinnedCh.id && s.brotherId === profile?.id) : null;
      html += `<div class="sf-post sf-announcement">
        <div class="sf-post-header">
          <div class="sf-avatar sf-avatar-coach">${posterIconHtml}</div>
          <div class="sf-post-meta">
            <div class="sf-post-author">${escHtml(posterName)}</div>
            <div class="sf-post-time">${ago}</div>
          </div>
          ${canDelete ? `<button class="sf-delete-btn" data-delete-post="${post.id}" title="Delete">✕</button>` : ''}
        </div>
        <div class="sf-announcement-text">${linkify(post.text || '')}</div>
        ${post.photoUrl ? `<img src="${post.photoUrl}" class="sf-photo" alt="" />` : ''}
        ${post.videoUrl ? `<video class="sf-video" src="${post.videoUrl}#t=0.001" controls playsinline preload="metadata"></video>` : ''}
        ${pinnedCh ? `<div class="sf-pinned-challenge">
          <div class="sf-pinned-label">📌 Challenge</div>
          <div class="sf-pinned-title">${escHtml(pinnedCh.title)}</div>
          ${pinnedCh.description ? `<div class="sf-pinned-desc">${escHtml(pinnedCh.description)}</div>` : ''}
          <div class="sf-pinned-xp">+${pinnedCh.xpReward} XP</div>
          ${myPinnedSub
            ? `<div class="sub-status-badge status-completed" style="margin-top:8px">✅ You completed this!</div>`
            : `<button class="btn btn-primary sf-pinned-complete-btn" data-submit="${pinnedCh.id}">Complete Challenge</button>`}
        </div>` : ''}
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
        ${post.videoUrl ? `<video class="sf-video" src="${post.videoUrl}#t=0.001" controls playsinline preload="metadata"></video>` : ''}
        ${post.audioUrl ? `<audio class="sf-audio" controls src="${post.audioUrl}"></audio>` : ''}
        ${post.proofLink ? `<a class="sf-link" href="${escHtml(post.proofLink)}" target="_blank" rel="noopener">🔗 ${escHtml(post.proofLink)}</a>` : ''}
        <div class="sf-xp-row">
          <span class="sf-xp-badge">+${post.xpAwarded} XP</span>
          ${(() => {
            if (!post.challengeId || !profile) return '';
            const alreadyDone = submissions.find(s => s.challengeId === post.challengeId && s.brotherId === profile.id);
            if (alreadyDone) return `<span class="sf-already-done">✅ You did this</span>`;
            return `<button class="sf-complete-too-btn btn btn-ghost btn-sm" data-submit="${post.challengeId}">+ Complete this challenge</button>`;
          })()}
        </div>
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
  if (isAdmin || isMentor) bindAnnouncementBtn(el);

  // Tap feed photo to open fullscreen
  el.querySelectorAll('.sf-photo').forEach(img => {
    img.addEventListener('click', () => {
      const wrap = img.closest('.sf-photos-wrap');
      const imgs = wrap ? Array.from(wrap.querySelectorAll('.sf-photo')) : [img];
      const photoUrl2 = imgs[1]?.src || null;
      openPhotoLightbox(img.src, null, '', '', 0, photoUrl2, null);
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

// ── ROSTER (member view of all brothers) ──────
// ── MY PATH ───────────────────────────────────
function renderMyPath() {
  const el = document.getElementById('mypathContainer');
  if (!el) return;
  const profile = brothers.find(b => b.email && b.email.toLowerCase() === currentUser.email.toLowerCase());
  if (!profile) { el.innerHTML = `<div class="feed-empty">Profile not found.</div>`; return; }

  if (!profile.assessmentCompletedAt) {
    el.innerHTML = `<div class="path-gate"><div class="path-gate-icon">◎</div><h2 class="path-gate-title">Your Path Awaits</h2><p class="path-gate-text">Complete the Brotherhood Assessment first to unlock your personal mission path.</p></div>`;
    return;
  }

  const currentArch = profile.currentPathArchetype || profile.primaryArchetype;
  const archData    = ARCHETYPE_CHALLENGES[currentArch];
  if (!archData) { el.innerHTML = `<div class="feed-empty">Archetype data not found.</div>`; return; }

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
  el.innerHTML = html;

  // Scroll to active mission
  const activeStageMission = document.getElementById(`pznode-s${currentStage}-${
    archData.stages[currentStage-1]?.findIndex((_, i) => !progress[`${currentArch}_s${currentStage}_${i}`]?.completedAt) ?? 0
  }`);
  if (activeStageMission) setTimeout(() => activeStageMission.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);

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
    <div class="feed-header">
      <h2 class="feed-title">The Brotherhood</h2>
      <button class="btn-dm-inbox" id="dmInboxBtn">💬 Messages</button>
    </div>
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
        return `
          <div class="roster-card ${isMe ? 'roster-card-me' : ''}" data-archetype="${escHtml(displayArchetype||'')}" data-element="${escHtml(b.dominantElement||'')}" style="--arch-border:${archClr.border};--arch-glow:${archClr.glow};--arch-icon:${archClr.icon}">
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

  // Wire DM buttons
  container.querySelectorAll('[data-dm]').forEach(btn => {
    btn.addEventListener('click', () => openDM(btn.dataset.dm));
  });
  document.getElementById('dmInboxBtn')?.addEventListener('click', openDMInbox);
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
  if (e.key === 'Escape') [brotherModal, xpModal, deleteModal, checkInModal, coachNoteModal, viewCheckInModal, challengeModal, submitProofModal, archetypeModal].forEach(closeModal);
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
