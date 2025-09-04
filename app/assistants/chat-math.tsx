import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Platform, Alert, KeyboardAvoidingView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer, useSuckNavigator } from '../../components/ScreenTransition';
import { useTheme } from '../../contexts/ThemeContext';
import { sendMessageToOpenAIStreamingResponses, DEFAULT_GPT5_MODEL } from '../../services/openaiService';
import { WidgetsIcon, SendIcon } from '../../components/icons/SvgIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalConversation } from '../../hooks/useLocalConversation';

// Types identiques aux autres assistants
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface StreamingCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

function ChatMathScreen() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();
  const insets = useSafeAreaInsets();
  
  // États avec hook de conversation locale
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Refs pour la gestion du streaming optimisé
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs pour le système machine à écrire ultra-optimisé (comme ChatIA)
  const typewriterTimerRef = useRef<number | null>(null);
  const typewriterQueueRef = useRef<string>('');

  // Générer message d'accueil initial
  const getWelcomeMessage = useCallback((): Message => {
    const welcomeText = `🧮 Bonjour ! Je suis votre **assistant mathématiques**.

Posez-moi vos questions mathématiques : équations, calculs, géométrie, probabilités, analyse... Je résous et j'explique étape par étape !`;
    
    return {
      id: `welcome-math-${Date.now()}`,
      text: welcomeText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  }, []);

  // Hook de conversation locale
  const { messages, setMessages, handleNewChat: handleNewChatLocal, checkStorageLimits } = useLocalConversation({
    widgetName: 'chat-math',
    getWelcomeMessage
  });

  // Prompt spécialisé mathématiques
  const getSystemPrompt = (): string => {
    return `Tu es un professeur de mathématiques expert et pédagogue de niveau universitaire.

**MISSION :** Résoudre tout problème mathématique avec excellence pédagogique.

**DOMAINES D'EXPERTISE :**
- Algèbre (équations, systèmes, polynômes)
- Analyse (dérivées, intégrales, limites, fonctions)
- Géométrie (euclidienne, analytique, trigonométrie)
- Probabilités et statistiques
- Arithmétique et théorie des nombres
- Mathématiques appliquées (physique, économie)
- Calculs numériques et approximations

**MÉTHODE DE RÉSOLUTION :**
1. **Analyse** : Identifier le type de problème et les concepts impliqués
2. **Stratégie** : Expliquer l'approche de résolution choisie
3. **Calculs** : Détailler chaque étape avec justifications
4. **Résultat** : Donner la réponse finale claire et formatée
5. **Vérification** : Proposer une méthode de contrôle si pertinent

**RÈGLES STRICTES :**
- Explications claires et progressives
- Formules mathématiques bien formatées
- Étapes intermédiaires détaillées
- Justification de chaque manipulation
- Adaptation au niveau apparent de la question
- Exemples concrets si nécessaire
- Mise en garde sur les domaines de validité

**OBJECTIF :** Enseigner ET résoudre avec rigueur maximale.`;
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
    
    // Fermer le clavier immédiatement après l'envoi (comme ChatIA)
    Keyboard.dismiss();
    
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

    // STREAMING ULTRA-SIMPLE ET INSTANTANÉ
    const updateStreamingMessage = useCallback((messageId: string, newChunk: string) => {
      // AFFICHAGE IMMÉDIAT - pas de queue, pas de délai
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: (msg.text || '') + newChunk }
          : msg
      ));
    }, []);

    const streamingCallbacks: StreamingCallbacks = {
      onStart: () => {
        setIsAITyping(true);
      },
      onChunk: (chunk: string) => {
        // AFFICHAGE IMMÉDIAT - zéro délai
        updateStreamingMessage(assistantMessageId, chunk);
      },
      onComplete: (fullResponse: string) => {
        console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
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
      
      await sendMessageToOpenAIStreamingResponses(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage.text }
        ],
        {
          onStart: streamingCallbacks.onStart,
          onChunk: streamingCallbacks.onChunk,
          onComplete: streamingCallbacks.onComplete,
          onError: streamingCallbacks.onError,
        },
        DEFAULT_GPT5_MODEL,
        'low', // Reasoning effort pour vitesse maximale
        abortControllerRef.current,
        { maxOutputTokens: 2048 }
      );
    } catch (error) {
      console.error('Erreur envoi message:', error);
      streamingCallbacks.onError?.(error as Error);
    }
  };

  // Finaliser le message de streaming (identique à ChatIA)
  const finalizeStreamingMessage = useCallback((messageId: string, finalText: string) => {
    // Annuler tout timeout en cours
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    
    // Faire la mise à jour finale
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: finalText }
          : msg
      )
    );
    
    // Réinitialiser les refs
    typewriterQueueRef.current = '';
    streamingBufferRef.current = '';
    setIsAITyping(false);
  }, []);

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

  // Gérer l'envoi avec Enter
  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
          { backgroundColor: isDark ? '#10b981' : '#059669' } // Thème vert-cyan
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

  // Scroll automatique vers le bas
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Icône d'envoi/stop  
  const SendIconComponent = useMemo(() => {
    return ({ size, color }: { size: number; color: string }) => (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {isAITyping ? (
          <Text style={{ color, fontSize: 12, fontWeight: 'bold' }}>⏹</Text>
        ) : (
          <SendIcon size={16} color={color} />
        )}
      </View>
    );
  }, [isAITyping]);

  // Icône Math (au lieu de BackIcon)
  const MathIcon = useMemo(() => {
    return ({ size, color }: { size: number; color: string }) => (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color, fontSize: size * 0.8, fontWeight: '600' }}>
          🧮
        </Text>
      </View>
    );
  }, [isDark, theme.text.primary]);

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <ScreenContainer>
        {/* Header avec titre et boutons */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <LinearGradient
                colors={isDark ? ['#10b981', '#059669'] : ['#34d399', '#10b981']} // Thème vert-cyan
                style={styles.titleGradient}
                start={[0, 0]}
                end={[1, 0]}
              >
                <Text style={styles.headerTitle}>Chat Math</Text>
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
                
                {/* Bouton retour vers Menu Math */}
                <TouchableOpacity 
                  onPress={() => suckTo('/maths', { replace: true })} 
                  style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                >
                  <MathIcon size={20} color={theme.text.primary} />
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

          {/* Barre de saisie (identique aux autres assistants) */}
          <View style={[styles.inputContainer, { backgroundColor: theme.backgrounds.primary }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    color: theme.text.primary,
                    backgroundColor: isDark ? '#374151' : '#ffffff'
                  }
                ]}
                placeholder="Posez votre question mathématique..."
                placeholderTextColor={theme.text.secondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                maxLength={2000}
                editable={!isAITyping}
                onKeyPress={handleKeyPress}
                onFocus={() => setShowToolbar(true)}
                onBlur={() => setShowToolbar(false)}
                blurOnSubmit={false}
              />
              
              <TouchableOpacity 
                onPress={isAITyping ? stopGeneration : sendMessage}
                style={[
                  styles.sendButton,
                  { 
                    backgroundColor: isAITyping ? '#FF3B30' : (isDark ? '#10b981' : '#059669'), // Thème vert-cyan
                    opacity: (!inputText.trim() && !isAITyping) ? 0.5 : 1
                  }
                ]}
                disabled={!inputText.trim() && !isAITyping}
              >
                <SendIconComponent size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

// Styles adaptés de correction avec couleurs vert-cyan
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
  
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default memo(ChatMathScreen);
