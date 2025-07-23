import { collection, query, where, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

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
    console.log('Récupération des chats pour l\'utilisateur:', uid);
    
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
    
    console.log(`${chatList.length} chats trouvés pour l'utilisateur:`, chatList);
    
    // Log détaillé pour debugging - toutes les données nécessaires pour OpenAI
    chatList.forEach((chat, index) => {
      console.log(`📋 Chat ${index + 1} - Données complètes:`, {
        id: chat.id,
        name: chat.name,
        description: chat.description,
        welcomeMessage: chat.welcomeMessage,
        model: chat.model,
        provider: chat.provider,
        instructions: chat.instructions || chat.systemPrompt || 'Aucune instruction',
        allowedUsersCount: chat.allowedUsers?.length || 0,
        // Afficher tous les autres champs disponibles
        ...Object.fromEntries(
          Object.entries(chat).filter(([key]) => 
            !['id', 'name', 'description', 'welcomeMessage', 'model', 'provider', 'allowedUsers'].includes(key)
          )
        )
      });
    });
    
    return chatList;
  } catch (error) {
    console.error("Erreur lors de la récupération des chats :", error);
    return [];
  }
}

// Hook supprimé pour éviter les boucles infinies
// Utilisez fetchUserChats() directement dans les composants 