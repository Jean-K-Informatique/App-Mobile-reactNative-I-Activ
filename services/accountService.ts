import { auth, db } from './firebaseConfig';
import { deleteUser } from 'firebase/auth';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

/**
 * Supprime toutes les conversations et messages d'un utilisateur
 */
async function deleteAllUserConversations(userId: string): Promise<void> {
  // Récupérer les conversations de l'utilisateur
  const conversationsQ = query(collection(db, 'conversations'), where('userId', '==', userId));
  const conversationsSnap = await getDocs(conversationsQ);

  // Helper pour engager par lots (éviter la limite de 500 opérations)
  const commitBatchIfNeeded = async (batchOpsCount: number, batchRef: ReturnType<typeof writeBatch>) => {
    if (batchOpsCount >= 450) {
      await batchRef.commit();
      return { count: 0, batch: writeBatch(db) };
    }
    return { count: batchOpsCount, batch: batchRef };
  };

  let batch = writeBatch(db);
  let ops = 0;

  for (const conversationDoc of conversationsSnap.docs) {
    const conversationId = conversationDoc.id;
    // Supprimer tous les messages de la sous-collection
    const messagesSnap = await getDocs(collection(db, `conversations/${conversationId}/messages`));
    for (const messageDoc of messagesSnap.docs) {
      batch.delete(messageDoc.ref);
      ops += 1;
      const res = await commitBatchIfNeeded(ops, batch);
      ops = res.count;
      batch = res.batch;
    }
    // Supprimer la conversation
    batch.delete(doc(db, 'conversations', conversationId));
    ops += 1;
    const res = await commitBatchIfNeeded(ops, batch);
    ops = res.count;
    batch = res.batch;
  }

  if (ops > 0) {
    await batch.commit();
  }
}

/**
 * Supprime les données Firestore de l'utilisateur puis son compte Firebase Auth.
 * - Si une reconnexion récente est requise, l'erreur est relancée pour être gérée en UI.
 */
export async function deleteCurrentUserAccountAndData(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');

  // 1) Supprimer les données utilisateur (conversations + messages)
  await deleteAllUserConversations(user.uid);

  // 2) Supprimer le compte Firebase Auth
  try {
    await deleteUser(user);
  } catch (e: any) {
    // Code commun: auth/requires-recent-login
    if (e?.code === 'auth/requires-recent-login') {
      throw new Error('requires-recent-login');
    }
    throw e;
  }
}


