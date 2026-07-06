/* ============================================
   STOKED BROTHERHOOD COMMAND CENTER — APP JS
   ============================================
   Data structure designed to be portable to
   Supabase, Firebase, Airtable, or Google Sheets.
   Each brother object maps 1:1 to a DB row/record.

   FUTURE FEATURES (not yet built):
   - Individual brother login & private profiles
   - Parent view (read-only portal)
   - Badge system (milestone achievements)
   - Monthly progress reports (PDF export)
   - Attendance tracking per session
   - Challenge board & leaderboard
   ============================================ */

'use strict';

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

const ARCHETYPE_ICONS = {
  Warrior: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="21" x2="15" y2="9"/><line x1="9.5" y1="14.5" x2="14" y2="19"/>
    <path d="M14 4l6 6-2 2-6-6z"/><line x1="19" y1="5" x2="21" y2="3"/>
  </svg>`,
  Monk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
    <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
  </svg>`,
  Creator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>`,
  Explorer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>`,
  Leader: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2l3 5h4l-3.5 4 1.5 5L12 13.5 7 16l1.5-5L5 7h4z"/>
  </svg>`,
  Builder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z"/>
  </svg>`,
  Guardian: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`,
  Pathfinder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>`,
};

const XP_REASONS = [
  'Attended session',
  'Completed weekly commitment',
  'Helped another brother',
  'Earned badge',
  'Led an exercise',
  'Completed challenge',
  'Personal breakthrough',
  'Other',
];

// ── DATA LAYER ────────────────────────────────
// Swap out these two functions to connect to any backend.

function loadBrothers() {
  try {
    const raw = localStorage.getItem('stoked_brothers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBrothers(brothers) {
  localStorage.setItem('stoked_brothers', JSON.stringify(brothers));
}

function generateId() {
  return 'br_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── LEVEL LOGIC ───────────────────────────────

function getLevelInfo(xp) {
  const clamped = Math.min(Math.max(0, xp), 10000);

  if (clamped >= 10000) {
    return {
      current:  LEVELS[9],
      next:     null,
      progress: 100,
      xpIntoLevel: 1000,
      xpNeededForNext: 0,
    };
  }

  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (clamped >= LEVELS[i].xpRequired - 1000) {
      currentLevel = LEVELS[i];
      break;
    }
  }

  // Re-derive cleanly: level N starts at (N-1)*1000 XP
  const levelIndex = currentLevel.level - 1;
  const startXP    = levelIndex * 1000;
  const nextXP     = currentLevel.xpRequired;
  const xpIntoLevel   = clamped - startXP;
  const xpForLevel    = nextXP - startXP;
  const progress      = Math.round((xpIntoLevel / xpForLevel) * 100);

  const next = currentLevel.level < 10 ? LEVELS[currentLevel.level] : null;

  return {
    current: currentLevel,
    next,
    progress: Math.min(100, Math.max(0, progress)),
    xpIntoLevel,
    xpNeededForNext: next ? nextXP - clamped : 0,
  };
}

// ── STATE ─────────────────────────────────────

let brothers = loadBrothers();
let editingId = null;
let deletingId = null;

// ── DOM REFS ──────────────────────────────────

const brothersGrid   = document.getElementById('brothersGrid');
const emptyState     = document.getElementById('emptyState');
const brotherModal   = document.getElementById('brotherModal');
const xpModal        = document.getElementById('xpModal');
const deleteModal    = document.getElementById('deleteModal');

// Stats
const statTotalBrothers = document.getElementById('statTotalBrothers');
const statGroupDaily    = document.getElementById('statGroupDaily');
const statAvgMomentum   = document.getElementById('statAvgMomentum');
const statTotalXP       = document.getElementById('statTotalXP');
const statTopBrother    = document.getElementById('statTopBrother');

// Brother form
const brotherForm   = document.getElementById('brotherForm');
const fieldName     = document.getElementById('fieldName');
const fieldAge      = document.getElementById('fieldAge');
const fieldArchetype= document.getElementById('fieldArchetype');
const fieldXP       = document.getElementById('fieldXP');
const fieldMomentum = document.getElementById('fieldMomentum');
const fieldDaily    = document.getElementById('fieldDaily');
const fieldGoal     = document.getElementById('fieldGoal');
const fieldCommitment = document.getElementById('fieldCommitment');
const fieldNotes    = document.getElementById('fieldNotes');
const modalTitle    = document.getElementById('modalTitle');

// XP form
const xpForm        = document.getElementById('xpForm');
const xpBrotherId   = document.getElementById('xpBrotherId');
const xpBrotherName = document.getElementById('xpBrotherName');
const xpAmount      = document.getElementById('xpAmount');
const xpReason      = document.getElementById('xpReason');

// ── RENDER ────────────────────────────────────

function render() {
  renderStats();
  renderGrid();
}

function renderStats() {
  const count = brothers.length;
  statTotalBrothers.textContent = count;

  if (count === 0) {
    statGroupDaily.textContent  = '—';
    statAvgMomentum.textContent = '—';
    statTotalXP.textContent     = '0';
    statTopBrother.textContent  = '—';
    return;
  }

  const avgDaily    = brothers.reduce((s, b) => s + (b.dailyScore || 0), 0) / count;
  const avgMomentum = brothers.reduce((s, b) => s + (b.momentum || 0), 0) / count;
  const totalXP     = brothers.reduce((s, b) => s + (b.xp || 0), 0);

  const top = brothers.reduce((best, b) => {
    if (!best || (b.xp || 0) > (best.xp || 0)) return b;
    return best;
  }, null);

  statGroupDaily.textContent  = avgDaily.toFixed(1);
  statAvgMomentum.textContent = avgMomentum.toFixed(1);
  statTotalXP.textContent     = totalXP.toLocaleString();
  statTopBrother.textContent  = top ? top.name : '—';
}

function renderGrid() {
  if (brothers.length === 0) {
    emptyState.classList.remove('hidden');
    brothersGrid.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  brothersGrid.innerHTML = brothers.map(renderCard).join('');

  // Bind card buttons after render
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.edit));
  });
  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.delete));
  });
  document.querySelectorAll('[data-addxp]').forEach(btn => {
    btn.addEventListener('click', () => openXPModal(btn.dataset.addxp));
  });
}

function renderCard(brother) {
  const xp       = brother.xp || 0;
  const lvl      = getLevelInfo(xp);
  const archIcon = ARCHETYPE_ICONS[brother.archetype] || '';
  const momentum = (brother.momentum ?? 0).toFixed(1);
  const daily    = (brother.dailyScore ?? 0).toFixed(1);
  const maxed    = xp >= 10000;

  const nextText = lvl.next
    ? `${lvl.xpNeededForNext.toLocaleString()} XP to ${lvl.next.name}`
    : 'MAX LEVEL ACHIEVED';

  return `
    <div class="brother-card" id="card-${brother.id}">
      <div class="card-top">
        <div class="card-identity">
          <div class="card-name">${escHtml(brother.name)}</div>
          ${brother.age ? `<div class="card-age">Age ${brother.age}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon" data-edit="${brother.id}" title="Edit profile">✏️</button>
          <button class="btn-icon danger" data-delete="${brother.id}" title="Remove brother">🗑</button>
        </div>
      </div>

      ${brother.archetype ? `
        <div class="archetype-pill"><span class="arch-icon">${archIcon}</span>${escHtml(brother.archetype)}</div>
      ` : ''}

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
          <div class="progress-fill ${maxed ? 'maxed' : ''}" style="width: ${lvl.progress}%"></div>
        </div>
        <div class="progress-next">${nextText}</div>
      </div>

      <div class="scores-row">
        <div class="score-chip momentum">
          <div class="score-num">${momentum}</div>
          <div class="score-lbl">Momentum</div>
        </div>
        <div class="score-chip daily">
          <div class="score-num">${daily}</div>
          <div class="score-lbl">Daily Score</div>
        </div>
      </div>

      ${brother.goal ? `
        <div class="card-goal">
          <div class="goal-label">Main Goal</div>
          <div class="goal-text">${escHtml(brother.goal)}</div>
        </div>
      ` : ''}

      <button class="btn-add-xp" data-addxp="${brother.id}">⚡ Add XP</button>
    </div>
  `;
}

// ── MODAL: ADD / EDIT BROTHER ─────────────────

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Brother';
  brotherForm.reset();
  openModal(brotherModal);
}

function openEditModal(id) {
  const brother = brothers.find(b => b.id === id);
  if (!brother) return;

  editingId = id;
  modalTitle.textContent = 'Edit Brother';

  fieldName.value       = brother.name || '';
  fieldAge.value        = brother.age  || '';
  fieldArchetype.value  = brother.archetype || '';
  fieldXP.value         = brother.xp || 0;
  fieldMomentum.value   = brother.momentum ?? '';
  fieldDaily.value      = brother.dailyScore ?? '';
  fieldGoal.value       = brother.goal || '';
  fieldCommitment.value = brother.commitment || '';
  fieldNotes.value      = brother.notes || '';

  openModal(brotherModal);
}

brotherForm.addEventListener('submit', e => {
  e.preventDefault();

  const data = {
    name:       fieldName.value.trim(),
    age:        parseInt(fieldAge.value) || null,
    archetype:  fieldArchetype.value,
    xp:         Math.min(10000, Math.max(0, parseInt(fieldXP.value) || 0)),
    momentum:   Math.min(10, Math.max(0, parseFloat(fieldMomentum.value) || 0)),
    dailyScore: Math.min(10, Math.max(0, parseFloat(fieldDaily.value) || 0)),
    goal:       fieldGoal.value.trim(),
    commitment: fieldCommitment.value.trim(),
    notes:      fieldNotes.value.trim(),
  };

  if (!data.name) return;

  if (editingId) {
    brothers = brothers.map(b => b.id === editingId ? { ...b, ...data } : b);
    showToast('Profile updated', 'success');
  } else {
    brothers.push({ id: generateId(), createdAt: new Date().toISOString(), ...data });
    showToast(`${data.name} added to the Brotherhood`, 'success');
  }

  saveBrothers(brothers);
  closeModal(brotherModal);
  render();
});

// ── MODAL: ADD XP ─────────────────────────────

function openXPModal(id) {
  const brother = brothers.find(b => b.id === id);
  if (!brother) return;

  xpBrotherId.value   = id;
  xpBrotherName.textContent = brother.name;
  xpAmount.value = '';
  xpReason.value = XP_REASONS[0];

  openModal(xpModal);
  setTimeout(() => xpAmount.focus(), 120);
}

xpForm.addEventListener('submit', e => {
  e.preventDefault();

  const id     = xpBrotherId.value;
  const amount = parseInt(xpAmount.value) || 0;
  const reason = xpReason.value;

  if (amount <= 0) return;

  brothers = brothers.map(b => {
    if (b.id !== id) return b;
    const newXP = Math.min(10000, (b.xp || 0) + amount);
    return { ...b, xp: newXP };
  });

  const brother = brothers.find(b => b.id === id);
  saveBrothers(brothers);
  closeModal(xpModal);
  render();
  showToast(`+${amount} XP added to ${brother.name} (${reason})`, 'success');
});

// ── MODAL: DELETE ─────────────────────────────

function openDeleteModal(id) {
  const brother = brothers.find(b => b.id === id);
  if (!brother) return;
  deletingId = id;
  document.getElementById('deleteMsg').textContent =
    `Remove ${brother.name} from the Brotherhood? This cannot be undone.`;
  openModal(deleteModal);
}

document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
  if (!deletingId) return;
  const brother = brothers.find(b => b.id === deletingId);
  brothers = brothers.filter(b => b.id !== deletingId);
  deletingId = null;
  saveBrothers(brothers);
  closeModal(deleteModal);
  render();
  showToast(`${brother?.name || 'Brother'} removed`, 'info');
});

document.getElementById('deleteCancelBtn').addEventListener('click', () => {
  deletingId = null;
  closeModal(deleteModal);
});

// ── MODAL HELPERS ─────────────────────────────

function openModal(el)  { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { el.classList.remove('open'); document.body.style.overflow = ''; }

// Close buttons
document.getElementById('modalClose').addEventListener('click',   () => closeModal(brotherModal));
document.getElementById('cancelBtn').addEventListener('click',    () => closeModal(brotherModal));
document.getElementById('xpModalClose').addEventListener('click', () => closeModal(xpModal));
document.getElementById('xpCancelBtn').addEventListener('click',  () => closeModal(xpModal));

// Click overlay to close
[brotherModal, xpModal, deleteModal].forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay);
  });
});

// ESC to close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    [brotherModal, xpModal, deleteModal].forEach(closeModal);
  }
});

// Header "Add Brother" button
document.getElementById('addBrotherBtn').addEventListener('click', openAddModal);

// ── EXPORT / IMPORT ───────────────────────────

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {
    exportedAt: new Date().toISOString(),
    version: 1,
    brothers,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `stoked-brotherhood-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup saved to your Downloads folder', 'success');
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      const imported = Array.isArray(data) ? data : (data.brothers || []);

      if (!Array.isArray(imported) || imported.length === 0) {
        showToast('Invalid backup file', 'info');
        return;
      }

      // Merge: keep existing brothers, add any new ones by ID
      const existingIds = new Set(brothers.map(b => b.id));
      const newOnes     = imported.filter(b => !existingIds.has(b.id));
      // For existing IDs, imported data wins (overwrite)
      const updated     = brothers.map(b => {
        const match = imported.find(i => i.id === b.id);
        return match ? { ...b, ...match } : b;
      });

      brothers = [...updated, ...newOnes];
      saveBrothers(brothers);
      render();
      showToast(`Loaded ${imported.length} brother${imported.length !== 1 ? 's' : ''} from backup`, 'success');
    } catch {
      showToast('Could not read file — make sure it\'s a valid backup', 'info');
    }
    // Reset so same file can be re-imported if needed
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ── TOAST ─────────────────────────────────────

let toastTimer = null;
const toast = (() => {
  const el = document.createElement('div');
  el.className = 'toast';
  document.body.appendChild(el);
  return el;
})();

function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className   = `toast ${type}`;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── UTILITY ───────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── INIT ──────────────────────────────────────

render();
