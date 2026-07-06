/* ============================================
   STOKED BROTHERHOOD COMMAND CENTER
   Firebase-powered: Auth + Firestore
   ============================================ */

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc,
         onSnapshot, setDoc, updateDoc,
         deleteDoc, getDoc }                      from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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

const ARCHETYPE_COLORS = {
  Warrior:  { border: 'rgba(232,121,58,0.45)',  glow: 'rgba(232,121,58,0.08)',  icon: '#E8793A' },
  Monk:     { border: 'rgba(160,160,176,0.4)',  glow: 'rgba(160,160,176,0.07)', icon: '#b0b0c0' },
  Creator:  { border: 'rgba(75,114,170,0.45)',  glow: 'rgba(75,114,170,0.09)',  icon: '#4B72AA' },
  Explorer: { border: 'rgba(74,154,74,0.45)',   glow: 'rgba(74,154,74,0.08)',   icon: '#4a9a4a' },
  Leader:   { border: 'rgba(245,217,122,0.45)', glow: 'rgba(245,217,122,0.08)', icon: '#F5D97A' },
  Builder:  { border: 'rgba(130,148,166,0.4)',  glow: 'rgba(130,148,166,0.07)', icon: '#8294a6' },
};

const ARCHETYPE_ICONS = {
  // Shield with sword through center
  Warrior: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L4 5.5v6c0 5.5 4.5 9 8 10.5 3.5-1.5 8-5 8-10.5v-6L12 2z"/>
    <line x1="12" y1="5" x2="12" y2="18"/>
    <line x1="9" y1="8.5" x2="15" y2="8.5"/>
  </svg>`,

  // Circle with seated meditating figure
  Monk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="8.5" r="1.5"/>
    <path d="M8.5 16.5c.5-2 1.8-3 3.5-3s3 1 3.5 3"/>
    <path d="M7 15c1.5-.8 3-1.2 5-1.2s3.5.4 5 1.2"/>
  </svg>`,

  // Circle with pencil/pen
  Creator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M15 8.5l1 1-6 6-1.5.5.5-1.5 6-6z"/>
    <line x1="13.5" y1="10" x2="14.5" y2="11"/>
  </svg>`,

  // Circle with mountain peaks and winding path
  Explorer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="5.5 16.5 9 10.5 12 14 15 10.5 18.5 16.5"/>
    <path d="M7.5 16.5 Q10.5 15 13.5 15.5 Q16 16 16.5 16.5"/>
  </svg>`,

  // Crown with base line
  Leader: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3.5" y1="19" x2="20.5" y2="19"/>
    <path d="M5 19V12l3.5 3.5L12 7l3.5 8.5L19 12v7"/>
  </svg>`,

  // Hexagon with hammer
  Builder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2.5l8.5 4.9v9.8L12 22.1l-8.5-4.9V7.4z"/>
    <path d="M14 9.5l1-1 1.5 1.5-1 1z"/>
    <line x1="14" y1="9.5" x2="9.5" y2="14"/>
    <line x1="9.5" y1="14" x2="8" y2="15.5"/>
  </svg>`,
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
let currentUser = null;
let isAdmin     = false;
let editingId   = null;
let deletingId  = null;
let unsubBrothers = null;
let streakUpdatedThisSession = false;

// ── DOM ───────────────────────────────────────
const loginScreen   = document.getElementById('loginScreen');
const appScreen     = document.getElementById('appScreen');
const loginForm     = document.getElementById('loginForm');
const loginError    = document.getElementById('loginError');
const loginBtn      = document.getElementById('loginBtn');
const logoutBtn     = document.getElementById('logoutBtn');
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
    showApp();
  } else {
    currentUser = null;
    isAdmin     = false;
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
  if (unsubBrothers) { unsubBrothers(); unsubBrothers = null; }
  streakUpdatedThisSession = false;
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

  // Subscribe to brothers collection
  unsubBrothers = onSnapshot(collection(db, 'brothers'), snap => {
    brothers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
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
        <div class="empty-icon">⚔️</div>
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
  const clr   = ARCHETYPE_COLORS[profile.archetype] || ARCHETYPE_COLORS.Warrior;
  const icon  = ARCHETYPE_ICONS[profile.archetype]  || '';

  memberHero.innerHTML = `
    <div class="member-card" style="--arch-border:${clr.border};--arch-glow:${clr.glow};--arch-icon:${clr.icon}">
      <div class="member-card-top">
        <div>
          <div class="member-name">${escHtml(profile.name)}</div>
          ${profile.age ? `<div class="card-age">Age ${profile.age}</div>` : ''}
        </div>
        ${profile.archetype ? `
          <div class="archetype-pill">
            <span class="arch-icon">${icon}</span>
            <span class="arch-label">${escHtml(profile.archetype)}</span>
          </div>` : ''}
      </div>

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
          <span class="streak-flame">🔥</span>
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
          <div class="coach-note-member-label">— Coach Note —</div>
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
  const archIcon = ARCHETYPE_ICONS[brother.archetype] || '';
  const archClr  = ARCHETYPE_COLORS[brother.archetype] || { border:'var(--border)', glow:'transparent', icon:'var(--orange)' };
  const maxed   = xp >= 10000;
  const nextText = lvl.next ? `${lvl.xpNeededForNext.toLocaleString()} XP to ${lvl.next.name}` : 'MAX LEVEL ACHIEVED';

  return `
    <div class="brother-card" id="card-${brother.id}" style="--arch-border:${archClr.border};--arch-glow:${archClr.glow};--arch-icon:${archClr.icon}">
      <div class="card-top">
        <div class="card-identity">
          <div class="card-name">${escHtml(brother.name)}</div>
          ${brother.age ? `<div class="card-age">Age ${brother.age}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon" data-edit="${brother.id}" title="Edit">✏️</button>
          <button class="btn-icon danger" data-delete="${brother.id}" title="Remove">🗑</button>
        </div>
      </div>

      ${brother.archetype ? `
        <div class="archetype-pill">
          <span class="arch-icon">${archIcon}</span>
          <span class="arch-label">${escHtml(brother.archetype)}</span>
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
          <span class="streak-flame">🔥</span>
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
          ${brother.weeklyWin ? `<div class="cr-item"><span class="cr-label">💪 Win</span><span class="cr-text">${escHtml(brother.weeklyWin)}</span></div>` : ''}
          ${brother.weeklyChallenge ? `<div class="cr-item"><span class="cr-label">⚡ Challenge</span><span class="cr-text">${escHtml(brother.weeklyChallenge)}</span></div>` : ''}
          ${brother.weeklyCommitment ? `<div class="cr-item"><span class="cr-label">🎯 Commitment</span><span class="cr-text">${escHtml(brother.weeklyCommitment)}</span></div>` : ''}
        </div>` : ''}

      ${brother.coachNote ? `
        <div class="coach-note-display">
          <div class="coach-note-label">Coach Note</div>
          <div class="coach-note-text">${escHtml(brother.coachNote)}</div>
          ${brother.coachNoteDate ? `<div class="coach-note-date">${new Date(brother.coachNoteDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>` : ''}
        </div>` : ''}

      <div class="card-btn-row">
        <button class="btn-add-xp" data-addxp="${brother.id}">⚡ Add XP</button>
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

  try {
    await updateDoc(doc(db, 'brothers', id), {
      coachNote:     note,
      coachNoteDate: new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
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
      ${b.weeklyWin ? `<div class="vci-r-item"><div class="vci-r-label">💪 Win</div><div class="vci-r-text">${escHtml(b.weeklyWin)}</div></div>` : ''}
      ${b.weeklyChallenge ? `<div class="vci-r-item"><div class="vci-r-label">⚡ Challenge</div><div class="vci-r-text">${escHtml(b.weeklyChallenge)}</div></div>` : ''}
      ${b.weeklyCommitment ? `<div class="vci-r-item"><div class="vci-r-label">🎯 Commitment</div><div class="vci-r-text">${escHtml(b.weeklyCommitment)}</div></div>` : ''}
    </div>` : ''}
  `;

  openModal(viewCheckInModal);
}

document.getElementById('viewCheckInModalClose').addEventListener('click', () => closeModal(viewCheckInModal));
viewCheckInModal.addEventListener('click', e => { if (e.target === viewCheckInModal) closeModal(viewCheckInModal); });

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
  if (e.key === 'Escape') [brotherModal, xpModal, deleteModal, checkInModal, coachNoteModal, viewCheckInModal].forEach(closeModal);
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
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
