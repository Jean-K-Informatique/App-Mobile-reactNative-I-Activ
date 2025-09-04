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
  Platform,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, useSuckNavigator } from '../../components/ScreenTransition';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  sendMessageToOpenAIStreamingResponses,
  type StreamingCallbacks,
  DEFAULT_GPT5_MODEL
} from '../../services/openaiService';
import { SendIcon, WidgetsIcon } from '../../components/icons/SvgIcons';
import { useLocalConversation } from '../../hooks/useLocalConversation';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

type ResumeMode = 'detaille' | 'condense';

export default function AssistantResume() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();
  const insets = useSafeAreaInsets();
  
  // États avec hook de conversation locale
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [resumeMode, setResumeMode] = useState<ResumeMode>('detaille');
  
  // Refs pour la gestion du streaming optimisé
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs pour le système machine à écrire ultra-optimisé (comme ChatIA)
  const typewriterTimerRef = useRef<number | null>(null);
  const typewriterQueueRef = useRef<string>('');

  // Générer message d'accueil initial
  const getWelcomeMessage = useCallback((): Message => {
    const welcomeText = `📄 Bonjour ! Je suis votre **assistant de résumé**.

Envoyez-moi le texte que vous souhaitez résumer, et je vous fournirai une synthèse ${resumeMode === 'detaille' ? 'détaillée avec les points clés' : 'condensée et concise'}. Vous pouvez changer le type de résumé ci-dessus.`;
    
    return {
      id: `welcome-resume-${Date.now()}`,
      text: welcomeText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  }, [resumeMode]);

  // Hook de conversation locale
  const { messages, setMessages, handleNewChat: handleNewChatLocal, checkStorageLimits } = useLocalConversation({
    widgetName: 'resume',
    getWelcomeMessage
  });

  // Prompt spécialisé résumé
  const getSystemPrompt = (mode: ResumeMode): string => {
    if (mode === 'detaille') {
      return `Tu es un expert en synthèse et analyse de textes. Ta mission est de créer des résumés détaillés et structurés.

**STYLE DE RÉSUMÉ : DÉTAILLÉ**

**RÈGLES:**
- Analyse le texte de manière approfondie
- Conserve les nuances importantes et le contexte
- Structure en sections claires (Introduction, Points principaux, Conclusions)
- Inclus les exemples et données significatives
- Longueur : 25-40% du texte original
- Utilise des listes à puces pour les points clés
- Préserve le ton et l'intention de l'auteur

**FORMAT:**
📋 **Résumé détaillé**

**🎯 Sujet principal :**
[Thème central en 1-2 phrases]

**📍 Points principaux :**
• [Point clé 1 avec contexte]
• [Point clé 2 avec contexte]
• [Point clé 3 avec contexte]

**📊 Éléments importants :**
• [Données, exemples, citations significatives]

**💭 Conclusion :**
[Synthèse finale et implications]

Sois précis, informatif et fidèle au contenu original.`;
    } else {
      return `Tu es un expert en synthèse ultra-concise. Ta mission est de créer des résumés condensés à l'essentiel.

**STYLE DE RÉSUMÉ : CONDENSÉ**

**RÈGLES:**
- Va droit à l'essentiel, sans détails superflus
- Maximum 3-4 phrases principales
- Longueur : 10-15% du texte original
- Concentre-toi sur l'information cruciale uniquement
- Style télégraphique mais clair
- Évite les exemples sauf s'ils sont critiques

**FORMAT:**
⚡ **Résumé condensé**

**En bref :** [1-2 phrases sur le sujet principal]

**L'essentiel :** [2-3 points clés absolument critiques]

**Conclusion :** [Impact ou résultat principal en 1 phrase]

Sois ultra-synthétique, percutant et précis.`;
    }
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
    textInputRef.current?.blur();
    
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
      const systemPrompt = getSystemPrompt(resumeMode);
      
      await sendMessageToOpenAIStreamingResponses(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage.text }
        ],
        streamingCallbacks,
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

  // Scroll automatique vers le bas
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

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
          { backgroundColor: isDark ? '#8b5cf6' : '#7c3aed' } // Thème violet
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
        {/* Header avec titre et sélecteur de mode */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
          <View style={styles.headerContent}>
            {/* Ligne du titre avec boutons alignés */}
            <View style={styles.headerTitleRow}>
              <LinearGradient
                colors={isDark ? ['#8b5cf6', '#7c3aed'] : ['#a78bfa', '#8b5cf6']} // Thème violet
                style={styles.titleGradient}
                start={[0, 0]}
                end={[1, 0]}
              >
                <Text style={styles.headerTitle}>Assistant Résumé</Text>
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
            
            {/* Sélecteur de mode en dessous du titre */}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.switchOption,
                  resumeMode === 'detaille' && [styles.switchOptionActive, { backgroundColor: isDark ? '#8b5cf6' : '#7c3aed' }]
                ]}
                onPress={() => setResumeMode('detaille')}
              >
                <Text style={[
                  styles.switchText,
                  { color: resumeMode === 'detaille' ? '#ffffff' : theme.text.secondary }
                ]}>
                  Résumé détaillé
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.switchOption,
                  resumeMode === 'condense' && [styles.switchOptionActive, { backgroundColor: isDark ? '#8b5cf6' : '#7c3aed' }]
                ]}
                onPress={() => setResumeMode('condense')}
              >
                <Text style={[
                  styles.switchText,
                  { color: resumeMode === 'condense' ? '#ffffff' : theme.text.secondary }
                ]}>
                  Résumé condensé
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Interface de chat (identique à correction) */}
        <KeyboardAvoidingView 
          style={[styles.container, { backgroundColor: theme.backgrounds.secondary }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
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

          {/* Zone de saisie (couleurs app de base + bouton violet) */}
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
                placeholder="Collez ici le texte à résumer..."
                placeholderTextColor={theme.text.secondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              
              {/* Bouton Send/Stop avec couleur violette résumé */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: isAITyping ? '#FF3B30' : (isDark ? '#8b5cf6' : '#7c3aed'), // Violet
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

// Styles adaptés de correction avec couleurs violet
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

  // Mode selector (identique au switch correction)
  modeSelector: {
    flexDirection: 'row',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  switchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  switchOptionActive: {
    borderColor: 'transparent',
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
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
