import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, useSuckNavigator } from '../../components/ScreenTransition';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  sendMessageToOpenAIStreaming,
  type StreamingCallbacks
} from '../../services/openaiService';
import { SendIcon, WidgetsIcon } from '../../components/icons/SvgIcons';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export default function AssistantCuisine() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();
  const insets = useSafeAreaInsets();
  
  // États identiques aux autres assistants
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Refs pour la gestion du streaming optimisé
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Générer message d'accueil initial
  const getWelcomeMessage = useCallback((): Message => {
    const welcomeText = `🍽️ Bonjour ! Je suis votre **assistant cuisine**.

Je peux vous aider à :
• 🥘 Créer des recettes personnalisées
• 🛒 Calculer les proportions et ingrédients  
• 🍳 Adapter des recettes selon vos goûts
• ⏱️ Optimiser vos temps de cuisson
• 🌿 Suggérer des alternatives et substitutions

Décrivez-moi ce que vous souhaitez cuisiner !`;
    
    return {
      id: `welcome-cuisine-${Date.now()}`,
      text: welcomeText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  }, []);

  // Initialiser avec message d'accueil (SEULEMENT au premier chargement)
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = getWelcomeMessage();
      setMessages([welcomeMessage]);
    }
  }, []); // Pas de dépendance pour éviter la réinitialisation

  // Prompt spécialisé cuisine
  const getSystemPrompt = (): string => {
    return `Tu es un chef cuisinier expert et pédagogue, spécialisé dans l'accompagnement culinaire personnalisé.

**MISSION :** Aider l'utilisateur dans tous ses besoins culinaires avec expertise et créativité.

**DOMAINES D'EXPERTISE :**
- Création de recettes originales et adaptées
- Calculs de proportions et conversions d'unités
- Techniques de cuisson et astuces professionnelles
- Substitutions d'ingrédients (allergies, régimes, disponibilité)
- Optimisation nutritionnelle et équilibrage des saveurs
- Cuisines du monde et spécialités régionales
- Présentation et dressage des plats

**STYLE DE RÉPONSE :**
- Toujours inclure des émojis culinaires pertinents 🍳🥘🍅
- Structurer clairement : ingrédients, étapes, astuces
- Donner des temps de préparation/cuisson précis
- Proposer des variantes et alternatives
- Inclure des conseils pratiques et astuces de chef
- Adapter selon le niveau culinaire apparent

**FORMAT POUR LES RECETTES :**
🍽️ **[Nom de la recette]**

⏱️ **Temps :** Préparation + Cuisson
👥 **Portions :** X personnes

🛒 **Ingrédients :**
• [Quantité précise] [Ingrédient] 
• ...

🍳 **Étapes :**
1. [Instruction détaillée]
2. ...

💡 **Astuces du chef :**
• [Conseil pratique]

🔄 **Variantes :**
• [Alternative possible]

**RÈGLES :**
- Toujours donner des quantités précises
- Mentionner les allergènes potentiels
- Proposer des substitutions végétariennes/véganes si pertinent
- Adapter le vocabulaire technique au niveau de l'utilisateur
- Encourager la créativité et l'expérimentation

Sois passionné, inspirant et pratique dans tes conseils culinaires !`;
  };

  // Gestion du nouveau chat avec confirmation
  const handleNewChat = useCallback(() => {
    if (conversationStarted && messages.length > 1) {
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
            onPress: () => {
              // Reset avec nouveau message d'accueil
              const welcomeMessage = getWelcomeMessage();
              setMessages([welcomeMessage]);
              setConversationStarted(true);
              setInputText('');
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
              }
              setIsAITyping(false);
              setShowToolbar(false);
            }
          }
        ]
      );
    } else {
      // Si pas de conversation, reset avec message d'accueil
      const welcomeMessage = getWelcomeMessage();
      setMessages([welcomeMessage]);
      setConversationStarted(true);
      setInputText('');
      setShowToolbar(false);
    }
  }, [conversationStarted, messages.length, getWelcomeMessage]);

  // Fonction pour envoyer un message (identique à correction)
  const sendMessage = async () => {
    if (!inputText.trim() || isAITyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      text: '',
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputText('');
    setIsAITyping(true);
    setConversationStarted(true);

    // Préparer l'AbortController
    abortControllerRef.current = new AbortController();

    // Nettoyer le buffer de streaming
    streamingBufferRef.current = '';
    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }

    const streamingCallbacks: StreamingCallbacks = {
      onStart: () => {
        setIsAITyping(true);
      },
      onChunk: (chunk: string) => {
        // Utiliser le système de buffer optimisé (12ms comme les autres assistants)
        streamingBufferRef.current += chunk;
        if (streamingTimerRef.current) {
          clearTimeout(streamingTimerRef.current);
        }
        streamingTimerRef.current = setTimeout(() => {
          const buffer = streamingBufferRef.current;
          streamingBufferRef.current = '';
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, text: msg.text + buffer }
                : msg
            )
          );
        }, 12); // Vitesse d'écriture optimisée
      },
      onComplete: (fullResponse: string) => {
        // Finaliser le message avec le texte complet
        finalizeStreamingMessage(assistantMessageId, fullResponse);
        setIsAITyping(false);
        abortControllerRef.current = null;
      },
      onError: (error: Error) => {
        console.error('Erreur streaming:', error);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, text: 'Désolé, une erreur est survenue. Veuillez réessayer.' }
              : msg
          )
        );
        setIsAITyping(false);
        abortControllerRef.current = null;
      }
    };

    try {
      const systemPrompt = getSystemPrompt();
      
      await sendMessageToOpenAIStreaming(
        userMessage.text,
        streamingCallbacks,
        'gpt-4o-mini', // Modèle rapide pour TTFT optimisé
        systemPrompt,
        abortControllerRef.current.signal
      );
    } catch (error) {
      console.error('Erreur envoi message:', error);
      streamingCallbacks.onError?.(error as Error);
    }
  };

  // Finaliser le message de streaming
  const finalizeStreamingMessage = (messageId: string, finalText: string) => {
    // Nettoyer les timers
    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    streamingBufferRef.current = '';
    
    // Assurer que le texte final est affiché
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, text: finalText }
          : msg
      )
    );
  };

  // Arrêter la génération
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAITyping(false);
    
    // Nettoyer le streaming
    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    streamingBufferRef.current = '';
  };

  // Scroll automatique vers le bas
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Rendu d'un message
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.assistantMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? [
          styles.userBubble,
          { backgroundColor: isDark ? '#f59e0b' : '#d97706' } // Thème orange cuisine
        ] : [
          styles.assistantBubble,
          { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }
        ]
      ]}>
        <Text style={[
          styles.messageText,
          { 
            color: item.isUser ? '#ffffff' : theme.text.primary
          }
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTime,
          { 
            color: item.isUser 
              ? 'rgba(255,255,255,0.7)' 
              : theme.text.secondary
          }
        ]}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <ScreenContainer>
        {/* Header avec titre */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <LinearGradient
                colors={isDark ? ['#f59e0b', '#d97706'] : ['#fbbf24', '#f59e0b']} // Thème orange cuisine
                style={styles.titleGradient}
                start={[0, 0]}
                end={[1, 0]}
              >
                <Text style={styles.headerTitle}>Assistant Cuisine</Text>
              </LinearGradient>
              
              <View style={styles.headerActions}>
                {/* Bouton Nouveau */}
                <TouchableOpacity 
                  onPress={handleNewChat}
                  style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                >
                  <Text style={[styles.actionButtonText, { color: theme.text.primary }]}>
                    +
                  </Text>
                </TouchableOpacity>
                
                {/* Bouton Widgets */}
                <TouchableOpacity 
                  onPress={() => suckTo('/widgets', { replace: true })} 
                  style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                >
                  <WidgetsIcon size={20} color={theme.text.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Interface de chat (identique à correction) */}
        <KeyboardAvoidingView 
          style={[styles.container, { backgroundColor: theme.backgrounds.secondary }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Liste des messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />

          {/* Zone de saisie (couleurs app de base + bouton orange) */}
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgrounds.primary, // Même fond que la page
            }
          ]}>
            <View style={styles.inputRow}>
              <TextInput
                ref={textInputRef}
                style={[
                  styles.textInput,
                  { 
                    color: theme.text.primary,
                    backgroundColor: isDark ? '#374151' : '#ffffff'
                  }
                ]}
                placeholder="Décrivez votre projet culinaire..."
                placeholderTextColor={theme.text.secondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              
              {/* Bouton Send/Stop avec couleur orange cuisine */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: isAITyping ? '#FF3B30' : (isDark ? '#f59e0b' : '#d97706'), // Orange
                    opacity: (!inputText.trim() && !isAITyping) ? 0.5 : 1
                  }
                ]}
                onPress={isAITyping ? stopGeneration : sendMessage}
                disabled={!inputText.trim() && !isAITyping}
              >
                {isAITyping ? (
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>⏹</Text>
                ) : (
                  <SendIcon 
                    size={16}
                    color="#ffffff"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

// Styles adaptés de correction avec couleurs orange cuisine
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Input (identique à ChatInterface)
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
