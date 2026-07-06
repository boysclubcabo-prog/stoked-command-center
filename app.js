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

// All archetypes use the same brand palette — no rainbow
const ARCHETYPE_COLORS = {
  Warrior:    { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
  Monk:       { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
  Creator:    { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
  Explorer:   { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
  Leader:     { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
  Builder:    { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
  Guardian:   { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
  Pathfinder: { border: 'rgba(75,114,170,0.4)', glow: 'rgba(75,114,170,0.07)', icon: '#F5D97A' },
};

const ARCHETYPE_ICONS = {
  Warrior: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="15" y2="9"/><line x1="9.5" y1="14.5" x2="14" y2="19"/><path d="M14 4l6 6-2 2-6-6z"/><line x1="19" y1="5" x2="21" y2="3"/></svg>`,
  Monk:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>`,
  Creator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  Explorer:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  Leader:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2l3 5h4l-3.5 4 1.5 5L12 13.5 7 16l1.5-5L5 7h4z"/></svg>`,
  Builder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z"/></svg>`,
  Guardian:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  Pathfinder:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
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
const brotherModal  = document.getElementById('brotherModal');
const xpModal       = document.getElementById('xpModal');
const deleteModal   = document.getElementById('deleteModal');
const checkInModal  = document.getElementById('checkInModal');
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

      ${brother.goal ? `
        <div class="card-goal">
          <div class="goal-label">Main Goal</div>
          <div class="goal-text">${escHtml(brother.goal)}</div>
        </div>` : ''}

      <div class="card-btn-row">
        <button class="btn-add-xp" data-addxp="${brother.id}">⚡ Add XP</button>
        <button class="btn-checkin" data-checkin="${brother.id}" title="Weekly Check-In">Check-In</button>
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
  if (e.key === 'Escape') [brotherModal, xpModal, deleteModal, checkInModal].forEach(closeModal);
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
