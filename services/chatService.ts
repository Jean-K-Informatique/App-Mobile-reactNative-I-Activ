import { collection, query, where, getDocs, QueryDocumentSnapshot, DocumentData, getDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import Constants from 'expo-constants';

export interface Chat {
  id: string;
  name: string;
  description?: string;
  welcomeMessage?: string;
  model?: string;
  provider?: string;
  allowedUsers: string[];
  [key: string]: any; // pour les autres champs possibles
}

/**
 * Récupère les chats accessibles à l'utilisateur connecté
 * @returns Promise<Chat[]> - Liste des chats où l'utilisateur est autorisé
 */
export async function fetchUserChats(): Promise<Chat[]> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("Aucun utilisateur connecté.");
    return [];
  }
  
  try {
    const uid = user.uid;
    const VERBOSE = false;
    if (VERBOSE) console.log('🔍 Récupération des chats pour l\'utilisateur:', uid);
    
    // Référence à la collection "chats"
    const chatsRef = collection(db, 'chats');
    
    // Requête filtrant les chats où allowedUsers contient l'UID
    const q = query(chatsRef, where('allowedUsers', 'array-contains', uid));
    
    const querySnapshot = await getDocs(q);
    
    // Extraire les données des documents
    const chatList: Chat[] = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      } as Chat;
    });
    
    if (VERBOSE) {
      console.log(`✅ ${chatList.length} chats trouvés`);
      chatList.forEach((chat, index) => {
        console.log(`📋 Chat ${index + 1}: "${chat.name}" (${chat.model || 'modèle non spécifié'})`);
      });
    }

    // ✅ Ajouter le chat gratuit global si configuré et accessible publiquement
    const FREE_CHAT_ID = process.env.EXPO_PUBLIC_FREE_CHAT_ID || 
                         Constants.expoConfig?.extra?.EXPO_PUBLIC_FREE_CHAT_ID;
    if (FREE_CHAT_ID && !chatList.some(c => c.id === FREE_CHAT_ID)) {
      try {
        const freeSnap = await getDoc(doc(db, 'chats', FREE_CHAT_ID));
        if (freeSnap.exists()) {
          const freeData = freeSnap.data() as DocumentData;
          if (freeData?.isGlobalAccess === true) {
            chatList.unshift({ id: freeSnap.id, ...(freeData as any) });
            if (VERBOSE) console.log('✅ Free tier ajouté:', freeSnap.id);
          }
        }
      } catch (e) {
        if (VERBOSE) console.warn('⚠️ Free tier indisponible:', e);
      }
    }
    
    return chatList;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des chats :", error);
    return [];
  }
}

// Hook supprimé pour éviter les boucles infinies
// Utilisez fetchUserChats() directement dans les composants 