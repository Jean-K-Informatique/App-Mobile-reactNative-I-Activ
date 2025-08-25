import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  onSnapshot,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// Réduire la verbosité des logs en prod
const VERBOSE_LOGS = false;

export interface ConversationMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Timestamp;
  messageIndex: number; // pour maintenir l'ordre
}

export interface Conversation {
  id: string;
  title: string;
  assistantId: string;
  assistantName: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messageCount: number;
  lastMessage?: string;
  isPrivate?: boolean; // mode navigation privée
}

/**
 * Crée une nouvelle conversation dans Firestore
 */
export async function createConversation(
  assistantId: string, 
  assistantName: string, 
  firstMessage: string,
  isPrivate: boolean = false
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  try {
    if (VERBOSE_LOGS) console.log('🆕 Création nouvelle conversation:', { assistantName, isPrivate });
    
    const conversationData: Omit<Conversation, 'id'> = {
      title: generateConversationTitle(firstMessage),
      assistantId,
      assistantName,
      userId: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      messageCount: 0,
      lastMessage: firstMessage.substring(0, 100),
      isPrivate
    };

    const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);
    if (VERBOSE_LOGS) console.log('✅ Conversation créée:', conversationRef.id);
    
    return conversationRef.id;
  } catch (error) {
    console.error('❌ Erreur création conversation:', error);
    throw error;
  }
}

/**
 * Sauvegarde un message dans une conversation
 */
export async function saveMessage(
  conversationId: string,
  text: string,
  isUser: boolean,
  messageIndex: number
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  try {
    const messageData: Omit<ConversationMessage, 'id'> = {
      text,
      isUser,
      timestamp: Timestamp.now(),
      messageIndex
    };

    // Ajouter le message à la sous-collection
    await addDoc(collection(db, `conversations/${conversationId}/messages`), messageData);
    
    // Mettre à jour les métadonnées de la conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      updatedAt: Timestamp.now(),
      messageCount: messageIndex + 1,
      lastMessage: isUser ? text.substring(0, 100) : text.substring(0, 100)
    });

    if (VERBOSE_LOGS) console.log('💾 Message sauvegardé:', { conversationId, isUser, messageIndex });
  } catch (error) {
    console.error('❌ Erreur sauvegarde message:', error);
    throw error;
  }
}

/**
 * Récupère toutes les conversations de l'utilisateur connecté
 */
export async function getUserConversations(): Promise<Conversation[]> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("Aucun utilisateur connecté");
    return [];
  }

  try {
    // ❌ SIMPLIFIÉ : Un seul log au lieu de deux
    if (VERBOSE_LOGS) console.log('📂 Récupération historique:', user.uid);
    
    // ⚠️ REQUÊTE ULTRA-SIMPLIFIÉE - Sans orderBy en attendant l'index
    // Cette requête fonctionne sans index composite
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('userId', '==', user.uid),
      limit(50)
    );

    const querySnapshot = await getDocs(conversationsQuery);
    
    // Filtrer et trier côté client
    const conversations: Conversation[] = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Conversation))
      .filter(conv => !conv.isPrivate) // Exclure les conversations privées
      .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()); // Trier par date côté client

    if (VERBOSE_LOGS) console.log(`✅ ${conversations.length} conversations récupérées`);
    return conversations;
  } catch (error) {
    console.error('❌ Erreur récupération conversations:', error);
    return [];
  }
}

/**
 * Récupère les messages d'une conversation
 */
export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  try {
    if (VERBOSE_LOGS) console.log('💬 Récupération messages pour conversation:', conversationId);
    
    const messagesQuery = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('messageIndex', 'asc')
    );

    const querySnapshot = await getDocs(messagesQuery);
    
    const messages: ConversationMessage[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ConversationMessage));

    if (VERBOSE_LOGS) console.log(`📨 ${messages.length} messages récupérés`);
    return messages;
  } catch (error) {
    console.error('❌ Erreur récupération messages:', error);
    return [];
  }
}

/**
 * Supprime une conversation et tous ses messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    if (VERBOSE_LOGS) console.log('🗑️ Suppression conversation:', conversationId);
    
    // Supprimer tous les messages de la conversation
    const messagesQuery = query(collection(db, `conversations/${conversationId}/messages`));
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const batch = writeBatch(db);
    
    // Ajouter la suppression de tous les messages au batch
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Ajouter la suppression de la conversation au batch
    batch.delete(doc(db, 'conversations', conversationId));
    
    // Exécuter toutes les suppressions en une seule transaction
    await batch.commit();
    
    if (VERBOSE_LOGS) console.log('✅ Conversation supprimée:', conversationId);
  } catch (error) {
    console.error('❌ Erreur suppression conversation:', error);
    throw error;
  }
}

/**
 * Met à jour le titre d'une conversation
 */
export async function updateConversationTitle(conversationId: string, newTitle: string): Promise<void> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      title: newTitle,
      updatedAt: Timestamp.now()
    });
    
    if (VERBOSE_LOGS) console.log('✏️ Titre conversation mis à jour:', { conversationId, newTitle });
  } catch (error) {
    console.error('❌ Erreur mise à jour titre:', error);
    throw error;
  }
}

/**
 * Supprime toutes les conversations privées de l'utilisateur
 */
export async function deletePrivateConversations(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    console.log('🗑️ Suppression conversations privées pour:', user.uid);
    
    const privateConversationsQuery = query(
      collection(db, 'conversations'),
      where('userId', '==', user.uid),
      where('isPrivate', '==', true)
    );

    const querySnapshot = await getDocs(privateConversationsQuery);
    
    const batch = writeBatch(db);
    
    // Supprimer chaque conversation privée et ses messages
    for (const conversationDoc of querySnapshot.docs) {
      const conversationId = conversationDoc.id;
      
      // Récupérer et supprimer tous les messages
      const messagesQuery = query(collection(db, `conversations/${conversationId}/messages`));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      messagesSnapshot.docs.forEach(messageDoc => {
        batch.delete(messageDoc.ref);
      });
      
      // Supprimer la conversation
      batch.delete(conversationDoc.ref);
    }
    
    await batch.commit();
    console.log(`✅ ${querySnapshot.docs.length} conversations privées supprimées`);
  } catch (error) {
    console.error('❌ Erreur suppression conversations privées:', error);
    throw error;
  }
}

/**
 * Génère un titre pour la conversation basé sur le premier message
 */
function generateConversationTitle(firstMessage: string): string {
  // Nettoyer et tronquer le message
  const cleanMessage = firstMessage.trim().replace(/\n/g, ' ').substring(0, 50);
  
  // Si le message est court, l'utiliser tel quel
  if (cleanMessage.length <= 30) {
    return cleanMessage;
  }
  
  // Sinon, tronquer et ajouter des points de suspension
  const words = cleanMessage.split(' ');
  let title = '';
  
  for (const word of words) {
    if ((title + word).length > 30) {
      break;
    }
    title += (title ? ' ' : '') + word;
  }
  
  return title + (title.length < cleanMessage.length ? '...' : '');
}

/**
 * Vérifie si une conversation existe et appartient à l'utilisateur
 */
export async function verifyConversationOwnership(conversationId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      return false;
    }
    
    const conversation = conversationDoc.data() as Conversation;
    return conversation.userId === user.uid;
  } catch (error) {
    console.error('❌ Erreur vérification propriété conversation:', error);
    return false;
  }
}

/**
 * Écoute les changements de conversations en temps réel
 */
export function subscribeToUserConversations(
  callback: (conversations: Conversation[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  const conversationsQuery = query(
    collection(db, 'conversations'),
    where('userId', '==', user.uid),
    where('isPrivate', '!=', true),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );

  return onSnapshot(conversationsQuery, (querySnapshot) => {
    const conversations: Conversation[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Conversation));
    
    callback(conversations);
  }, (error) => {
    console.error('❌ Erreur écoute conversations:', error);
    callback([]);
  });
} 

/**
 * Vérifie s'il existe déjà une conversation récente pour cet assistant
 * et la retourne au lieu de créer une nouvelle
 */
export async function getOrCreateConversation(
  assistantId: string, 
  assistantName: string, 
  firstMessage: string,
  isPrivate: boolean = false,
  forceNew: boolean = false
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  try {
    // Vérifier s'il existe une conversation récente pour cet assistant
    if (!forceNew && !isPrivate) {
      const recentConversationsQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', user.uid),
        where('assistantName', '==', assistantName),
        where('isPrivate', '!=', true),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );

      const recentSnapshot = await getDocs(recentConversationsQuery);
      
      if (!recentSnapshot.empty) {
        const recentConversation = recentSnapshot.docs[0];
        const conversationData = recentConversation.data() as Conversation;
        
        const now = new Date();
        const lastUpdate = conversationData.updatedAt.toDate();
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 1) {
          console.log('🔄 Réutilisation conversation récente:', recentConversation.id);
          return recentConversation.id;
        }
      }
    }

    // Si pas de conversation récente trouvée, créer une nouvelle
    return await createConversation(assistantId, assistantName, firstMessage, isPrivate);
  } catch (error) {
    console.error('❌ Erreur getOrCreateConversation:', error);
    return await createConversation(assistantId, assistantName, firstMessage, isPrivate);
  }
}

/**
 * Met à jour le timestamp d'une conversation pour la faire remonter en haut
 */
export async function updateConversationTimestamp(conversationId: string): Promise<void> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      updatedAt: Timestamp.now()
    });
    if (VERBOSE_LOGS) console.log('✅ Conversation remontée dans l\'historique:', conversationId);
  } catch (error) {
    console.error('❌ Erreur mise à jour timestamp conversation:', error);
  }
} 