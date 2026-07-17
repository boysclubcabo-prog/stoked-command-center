const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp }                         = require('firebase-admin/app');
const { getFirestore }                          = require('firebase-admin/firestore');
const { getMessaging }                          = require('firebase-admin/messaging');

initializeApp();
const db  = getFirestore();
const msg = getMessaging();

// ── HELPERS ───────────────────────────────────
const ADMIN_EMAIL = 'boysclubcabo@gmail.com';

async function getAllTokens() {
  const snap = await db.collection('fcmTokens').get();
  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  return [...new Set(tokens)];
}

async function getTokensForBrother(brotherId) {
  const snap = await db.collection('fcmTokens').where('brotherId', '==', brotherId).get();
  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  return [...new Set(tokens)];
}

async function getAdminTokens() {
  const snap = await db.collection('fcmTokens').where('email', '==', ADMIN_EMAIL).get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

async function sendToTokens(tokens, title, body, data = {}) {
  if (!tokens.length) return;
  const messages = tokens.map(token => ({
    token,
    notification: { title, body },
    webpush: {
      notification: {
        title, body,
        icon:  'https://boysclubcabo-prog.github.io/stoked-command-center/icon-192.png',
        badge: 'https://boysclubcabo-prog.github.io/stoked-command-center/icon-192.png',
        vibrate: [200, 100, 200],
      },
      fcmOptions: { link: 'https://boysclubcabo-prog.github.io/stoked-command-center/' },
    },
    data,
  }));
  try {
    await msg.sendEach(messages);
  } catch (e) {
    console.error('FCM send error:', e);
  }
}

// ── TRIGGER: New submission → notify admin ────
exports.onNewSubmission = onDocumentCreated('submissions/{subId}', async event => {
  const sub = event.data.data();
  if (!sub) return;
  const tokens = await getAdminTokens();
  await sendToTokens(tokens,
    '📬 New Submission',
    `${sub.brotherName} submitted proof for a challenge`
  );
});

// ── TRIGGER: Submission approved → notify brother ──
exports.onSubmissionUpdated = onDocumentUpdated('submissions/{subId}', async event => {
  const before = event.data.before.data();
  const after  = event.data.after.data();
  if (before.status === after.status) return;
  if (after.status !== 'approved') return;

  const tokens = await getTokensForBrother(after.brotherId);
  await sendToTokens(tokens,
    '✅ Submission Approved!',
    `You earned +${after.xpReward} XP — keep going brother! 🔥`
  );
});

// ── TRIGGER: New challenge → notify everyone ──
exports.onNewChallenge = onDocumentCreated('challenges/{challengeId}', async event => {
  const challenge = event.data.data();
  if (!challenge) return;
  const tokens = await getAllTokens();
  await sendToTokens(tokens,
    '⚡ New Challenge Posted',
    `${challenge.title} — ${challenge.xpReward || 0} XP`
  );
});

// ── TRIGGER: New feed post → notify everyone ──
exports.onNewFeedPost = onDocumentCreated('feed/{postId}', async event => {
  const post = event.data.data();
  if (!post) return;

  let title, body;
  if (post.type === 'announcement') {
    title = '📣 Coach Posted';
    body  = (post.text || '').slice(0, 100);
  } else {
    title = '🏆 Brotherhood Win!';
    body  = `${post.brotherName} completed ${post.challengeTitle}`;
  }

  const tokens = await getAllTokens();
  await sendToTokens(tokens, title, body);
});

// ── TRIGGER: New DM → notify recipient ───────
exports.onNewDM = onDocumentCreated('dms/{convoId}/messages/{msgId}', async event => {
  const msg = event.data.data();
  if (!msg || !msg.senderId || !msg.text) return;

  // convoId = [brotherIdA, brotherIdB].sort().join('_')
  // Firestore auto-IDs are alphanumeric (no underscores), so one '_' splits cleanly
  const convoId = event.params.convoId;
  const parts = convoId.split('_');
  if (parts.length !== 2) return;
  const [idA, idB] = parts;

  // The recipient is whoever didn't send it
  const recipientId = msg.senderId === idA ? idB : idA;

  const tokens = await getTokensForBrother(recipientId);
  await sendToTokens(
    tokens,
    `💬 ${msg.senderName || 'Message'}`,
    msg.text.slice(0, 120),
    { type: 'dm', convoId }
  );
});

// ── TRIGGER: Brother XP updated → notify anyone they passed ──
exports.onXPUpdated = onDocumentUpdated('brothers/{brotherId}', async event => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  const xpBefore = before.xp || 0;
  const xpAfter  = after.xp  || 0;

  // Only care about XP increases
  if (xpAfter <= xpBefore) return;

  const climberName = after.name || 'A brother';
  const climberId   = event.params.brotherId;

  // Find all brothers who were ahead before but are now behind
  const brothersSnap = await db.collection('brothers').get();
  const passed = brothersSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(b =>
      b.id !== climberId &&
      (b.xp || 0) >= xpBefore &&   // was ahead of or tied with climber before
      (b.xp || 0) <  xpAfter        // now behind the climber
    );

  for (const brother of passed) {
    const tokens = await getTokensForBrother(brother.id);
    const gap    = xpAfter - (brother.xp || 0);
    await sendToTokens(
      tokens,
      `⚠️ ${climberName} just passed you!`,
      `You're now ${gap} XP behind — complete a challenge and take back your spot 🔥`
    );
  }
});
