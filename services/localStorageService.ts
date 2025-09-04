import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Tailles limites en caractères (approximatif)
const MAX_CONVERSATION_SIZE = 50000; // ~50KB par conversation
const MAX_TOTAL_STORAGE = 500000; // ~500KB total pour les widgets
const WARNING_THRESHOLD = 0.8; // Alerte à 80% de la capacité

export interface LocalMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export interface StorageInfo {
  totalSize: number;
  conversationSize: number;
  isNearLimit: boolean;
  shouldWarn: boolean;
}

class LocalStorageService {
  // Clés de stockage par widget
  private getStorageKey(widgetName: string): string {
    return `widget_conversation_${widgetName}`;
  }

  // Calculer la taille approximative d'une conversation
  private calculateSize(messages: LocalMessage[]): number {
    return JSON.stringify(messages).length;
  }

  // Obtenir des informations sur le stockage
  async getStorageInfo(widgetName: string): Promise<StorageInfo> {
    try {
      const messages = await this.loadConversation(widgetName);
      const conversationSize = this.calculateSize(messages);
      
      // Calculer taille totale approximative (estimation)
      const allKeys = await AsyncStorage.getAllKeys();
      const widgetKeys = allKeys.filter(key => key.startsWith('widget_conversation_'));
      
      let totalSize = 0;
      for (const key of widgetKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) totalSize += data.length;
      }

      return {
        totalSize,
        conversationSize,
        isNearLimit: conversationSize > MAX_CONVERSATION_SIZE * WARNING_THRESHOLD,
        shouldWarn: totalSize > MAX_TOTAL_STORAGE * WARNING_THRESHOLD
      };
    } catch (error) {
      console.error('Erreur calcul stockage:', error);
      return {
        totalSize: 0,
        conversationSize: 0,
        isNearLimit: false,
        shouldWarn: false
      };
    }
  }

  // Sauvegarder une conversation
  async saveConversation(widgetName: string, messages: LocalMessage[]): Promise<boolean> {
    try {
      const storageInfo = await this.getStorageInfo(widgetName);
      const newSize = this.calculateSize(messages);

      // Vérifier les limites
      if (newSize > MAX_CONVERSATION_SIZE) {
        Alert.alert(
          '⚠️ Conversation trop longue',
          'Votre conversation dépasse la limite de stockage local. Veuillez créer une nouvelle conversation.',
          [{ text: 'Compris' }]
        );
        return false;
      }

      if (storageInfo.totalSize > MAX_TOTAL_STORAGE) {
        Alert.alert(
          '⚠️ Stockage saturé',
          'Le stockage local est plein. Certaines conversations anciennes vont être supprimées.',
          [{ text: 'Compris' }]
        );
        await this.cleanupOldConversations();
      }

      const key = this.getStorageKey(widgetName);
      await AsyncStorage.setItem(key, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde conversation:', error);
      return false;
    }
  }

  // Charger une conversation
  async loadConversation(widgetName: string): Promise<LocalMessage[]> {
    try {
      const key = this.getStorageKey(widgetName);
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const messages = JSON.parse(data);
        // Vérifier la validité des données
        if (Array.isArray(messages)) {
          return messages;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Erreur chargement conversation:', error);
      return [];
    }
  }

  // Supprimer une conversation spécifique
  async clearConversation(widgetName: string): Promise<void> {
    try {
      const key = this.getStorageKey(widgetName);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Erreur suppression conversation:', error);
    }
  }

  // Nettoyer les anciennes conversations (garder les 3 plus récentes)
  private async cleanupOldConversations(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const widgetKeys = allKeys.filter(key => key.startsWith('widget_conversation_'));
      
      // Trier par date de modification (approximatif)
      const keysWithData = await Promise.all(
        widgetKeys.map(async (key) => {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            try {
              const messages = JSON.parse(data);
              const lastMessage = messages[messages.length - 1];
              return {
                key,
                timestamp: lastMessage?.timestamp || '0',
                size: data.length
              };
            } catch {
              return { key, timestamp: '0', size: 0 };
            }
          }
          return null;
        })
      );

      const validKeys = keysWithData
        .filter(item => item !== null)
        .sort((a, b) => b!.timestamp.localeCompare(a!.timestamp));

      // Supprimer les plus anciennes si plus de 3
      if (validKeys.length > 3) {
        const keysToRemove = validKeys.slice(3);
        await Promise.all(
          keysToRemove.map(item => AsyncStorage.removeItem(item!.key))
        );
      }
    } catch (error) {
      console.error('Erreur nettoyage stockage:', error);
    }
  }

  // Vérifier si on doit alerter l'utilisateur
  async checkAndWarnIfNeeded(widgetName: string): Promise<boolean> {
    const storageInfo = await this.getStorageInfo(widgetName);
    
    if (storageInfo.isNearLimit) {
      Alert.alert(
        '⚠️ Conversation longue',
        'Votre conversation commence à être longue. Pensez à créer une nouvelle conversation si elle devient trop lente.',
        [{ text: 'Compris' }]
      );
      return true;
    }

    if (storageInfo.shouldWarn) {
      Alert.alert(
        '⚠️ Stockage important',
        'Vous avez beaucoup de conversations sauvegardées. Cela peut ralentir l\'application.',
        [{ text: 'Compris' }]
      );
      return true;
    }

    return false;
  }

  // Obtenir statistiques pour le debug
  async getStats(): Promise<{[key: string]: number}> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const widgetKeys = allKeys.filter(key => key.startsWith('widget_conversation_'));
      
      const stats: {[key: string]: number} = {};
      
      for (const key of widgetKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const widgetName = key.replace('widget_conversation_', '');
          stats[widgetName] = data.length;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Erreur stats stockage:', error);
      return {};
    }
  }
}

// Instance singleton
export const localStorageService = new LocalStorageService();
