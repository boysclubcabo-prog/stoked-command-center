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
    `${challenge.title} — ${challenge.xp || 0} XP`
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
