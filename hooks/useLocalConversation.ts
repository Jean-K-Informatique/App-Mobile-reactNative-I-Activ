import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { localStorageService, type LocalMessage } from '../services/localStorageService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface UseLocalConversationOptions {
  widgetName: string;
  getWelcomeMessage: () => Message;
}

interface UseLocalConversationReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  handleNewChat: () => Promise<void>;
  checkStorageLimits: () => Promise<void>;
}

export function useLocalConversation({ 
  widgetName, 
  getWelcomeMessage 
}: UseLocalConversationOptions): UseLocalConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Chargement initial
  useEffect(() => {
    const loadSavedConversation = async () => {
      try {
        const savedMessages = await localStorageService.loadConversation(widgetName);
        
        if (savedMessages.length > 0) {
          // Convertir LocalMessage vers Message
          const convertedMessages: Message[] = savedMessages.map(msg => ({
            id: msg.id,
            text: msg.text,
            isUser: msg.isUser,
            timestamp: msg.timestamp
          }));
          setMessages(convertedMessages);
        } else {
          // Pas de conversation sauvée, créer message d'accueil
          const welcomeMessage = getWelcomeMessage();
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error(`Erreur chargement conversation ${widgetName}:`, error);
        // Fallback sur message d'accueil
        const welcomeMessage = getWelcomeMessage();
        setMessages([welcomeMessage]);
      } finally {
        setIsLoaded(true);
      }
    };

    if (!isLoaded) {
      loadSavedConversation();
    }
  }, [widgetName, getWelcomeMessage, isLoaded]);

  // Sauvegarde automatique
  useEffect(() => {
    if (!isLoaded) return; // Ne pas sauvegarder pendant le chargement initial

    const saveConversation = async () => {
      if (messages.length > 0) {
        // Convertir Message vers LocalMessage
        const localMessages: LocalMessage[] = messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: msg.timestamp
        }));
        
        const success = await localStorageService.saveConversation(widgetName, localMessages);
        if (!success) {
          console.warn(`Impossible de sauvegarder la conversation ${widgetName}`);
        }
      }
    };

    // Délai pour éviter les sauvegardes trop fréquentes pendant le streaming
    const timeoutId = setTimeout(saveConversation, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, widgetName, isLoaded]);

  // Gérer nouvelle conversation
  const handleNewChat = useCallback(async () => {
    const hasContent = messages.length > 1;
    
    if (hasContent) {
      Alert.alert(
        'Nouvelle conversation',
        'Votre conversation actuelle sera réinitialisée. Voulez-vous continuer ?',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Confirmer',
            style: 'destructive',
            onPress: async () => {
              // Nettoyer la conversation locale
              await localStorageService.clearConversation(widgetName);
              
              // Reset avec nouveau message d'accueil
              const welcomeMessage = getWelcomeMessage();
              setMessages([welcomeMessage]);
            }
          }
        ]
      );
    } else {
      // Si pas de conversation, reset directement
      await localStorageService.clearConversation(widgetName);
      const welcomeMessage = getWelcomeMessage();
      setMessages([welcomeMessage]);
    }
  }, [messages.length, widgetName, getWelcomeMessage]);

  // Vérifier les limites de stockage
  const checkStorageLimits = useCallback(async () => {
    await localStorageService.checkAndWarnIfNeeded(widgetName);
  }, [widgetName]);

  return {
    messages,
    setMessages,
    handleNewChat,
    checkStorageLimits
  };
}
