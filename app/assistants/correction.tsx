import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Dimensions,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { ScreenContainer, useSuckNavigator } from '../../components/ScreenTransition';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  sendMessageToOpenAIStreamingResponses,
  DEFAULT_GPT5_MODEL,
  type ChatMessage, 
  type StreamingCallbacks
} from '../../services/openaiService';
import { TromboneIcon, ImageIcon, ToolsIcon, SendIcon, WidgetsIcon, UserIcon } from '../../components/icons/SvgIcons';
import ProfileModal from '../../components/ui/ProfileModal';
import { useLocalConversation } from '../../hooks/useLocalConversation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  streaming?: boolean;
}

type CorrectionMode = 'orthographe' | 'grammaire';

export default function AssistantCorrection() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const suckTo = useSuckNavigator();
  const insets = useSafeAreaInsets();
  
  // États principaux avec hook de conversation locale
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(true); // Déjà démarré avec message d'accueil
  const [showToolbar, setShowToolbar] = useState(false);
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>('orthographe');
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Refs (identiques à ChatInterface)
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamingTextRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs pour le système machine à écrire ultra-optimisé (comme ChatIA)
  const typewriterTimerRef = useRef<number | null>(null);
  const typewriterQueueRef = useRef<string>('');

  // Générer message d'accueil initial
  const getWelcomeMessage = useCallback((): Message => {
    const welcomeText = correctionMode === 'orthographe' 
      ? "👋 Bonjour ! Je suis votre assistant de **correction orthographique**.\n\nEnvoyez-moi le texte que vous souhaitez corriger, et je vous aiderai à éliminer toutes les fautes d'orthographe tout en vous expliquant les règles appliquées."
      : "👋 Bonjour ! Je suis votre assistant **grammaire et style**.\n\nEnvoyez-moi votre texte et je l'améliorerai au niveau grammatical et stylistique, en vous expliquant les modifications apportées pour un français plus élégant.";
    
    return {
      id: `welcome-correction-${Date.now()}`,
      text: welcomeText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  }, [correctionMode]);

  // Hook de conversation locale
  const { messages, setMessages, handleNewChat: handleNewChatLocal, checkStorageLimits } = useLocalConversation({
    widgetName: 'correction',
    getWelcomeMessage
  });

  // Prompts selon le mode sélectionné
  const getSystemPrompt = (mode: CorrectionMode): string => {
    if (mode === 'orthographe') {
      return `Tu es un expert en correction orthographique française de niveau universitaire.

MISSION: Corriger et perfectionner l'orthographe française avec la plus haute qualité.

RÈGLES STRICTES:
- Corrige TOUTES les fautes d'orthographe, d'accord, de conjugaison
- Respecte parfaitement les règles de l'Académie française
- Garde le ton et le style de l'auteur (formel/informel)
- Améliore la lisibilité sans dénaturer le sens
- Respecte les règles typographiques françaises
- RÉPONDS de manière conversationnelle et explique tes corrections

OBJECTIF: Aider l'utilisateur à améliorer son orthographe tout en expliquant les règles.

STYLE DE RÉPONSE: Réponds de manière concise et directe pour une correction rapide.`;
    } else {
      return `Tu es un expert en grammaire française et en amélioration stylistique.

MISSION: Améliorer la grammaire, la syntaxe et le style du français avec expertise.

RÈGLES STRICTES:
- Corrige la grammaire, syntaxe, concordance des temps
- Améliore la fluidité et l'élégance des phrases
- Propose des tournures plus sophistiquées si approprié
- Garde le ton et l'intention de l'auteur
- Optimise la clarté et l'impact du message
- RÉPONDS de manière conversationnelle et explique tes améliorations

OBJECTIF: Transformer le texte en version grammaticalement parfaite et stylée tout en éduquant l'utilisateur.

STYLE DE RÉPONSE: Réponds de manière concise et directe pour une amélioration rapide.`;
    }
  };

  // STREAMING ULTRA-SIMPLE ET INSTANTANÉ
  const updateStreamingMessage = useCallback((messageId: string, newChunk: string) => {
    // AFFICHAGE IMMÉDIAT - pas de queue, pas de délai
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, text: (msg.text || '') + newChunk }
        : msg
    ));
  }, []);

  // Finaliser le message de streaming (identique à ChatIA)
  const finalizeStreamingMessage = useCallback((messageId: string, finalText: string) => {
    // Annuler tout timeout en cours
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    
    // Faire la mise à jour finale
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: finalText, streaming: false }
          : msg
      )
    );
    
    // Réinitialiser la ref
    streamingTextRef.current = '';
    typewriterQueueRef.current = '';
    streamingBufferRef.current = '';
    
    setIsAITyping(false);
    setStreamingMessageId(null);
    abortControllerRef.current = null;
  }, []);

  // Fonction d'arrêt de génération (identique à ChatInterface)
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('⏹️ Arrêt de la génération demandé');
      abortControllerRef.current.abort();
      if (streamingMessageId) {
        finalizeStreamingMessage(streamingMessageId, streamingTextRef.current || '⏹ Génération interrompue');
      }
    }
  }, [streamingMessageId, finalizeStreamingMessage]);

  // Reset complet (bouton Nouveau) avec hook local
  const handleNewChat = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAITyping(false);
    setStreamingMessageId(null);
    streamingTextRef.current = '';
    streamingBufferRef.current = '';
    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    setInputText('');
    setShowToolbar(false);
    setConversationStarted(true);
    
    await handleNewChatLocal();
  }, [handleNewChatLocal]);

  // Fonction pour envoyer un message (adaptée de ChatInterface)
  const sendMessage = async () => {
    if (!inputText.trim() || isAITyping) return;

    const currentInput = inputText.trim();
    setInputText('');
    
    // Fermer le clavier immédiatement après l'envoi (comme ChatIA)
    Keyboard.dismiss();
    textInputRef.current?.blur();

    // Conversation déjà démarrée avec message d'accueil

    // Ajouter le message de l'utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput,
      isUser: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);

    // Vérifier les limites de stockage
    await checkStorageLimits();

    // Créer un message assistant vide pour le streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      text: '',
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      streaming: true
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsAITyping(true);
    setStreamingMessageId(assistantMessageId);

    // Réinitialiser la ref de streaming pour ce nouveau message
    streamingTextRef.current = '';
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    // Créer AbortController pour pouvoir arrêter le streaming
    abortControllerRef.current = new AbortController();

    try {
      console.log('🚀 Démarrage streaming correction via Responses API (gpt-5-nano)');

      // Préparer l'historique pour OpenAI
      const openAIMessages: ChatMessage[] = [
        {
          role: 'system',
          content: getSystemPrompt(correctionMode)
        },
        // Ajouter l'historique (sans les messages d'accueil)
        ...messages
          .filter(msg => !msg.text.includes('👋 Bonjour !'))
          .map(msg => ({
            role: msg.isUser ? 'user' as const : 'assistant' as const,
            content: msg.text
          })),
        // Message actuel
        {
          role: 'user',
          content: currentInput
        }
      ];

      // Callbacks de streaming (ULTRA-SIMPLE ET RAPIDE)
      const streamingCallbacks: StreamingCallbacks = {
        onChunk: (chunk: string) => {
          // AFFICHAGE IMMÉDIAT - zéro délai
          updateStreamingMessage(assistantMessageId, chunk);
        },
        onComplete: (fullResponse: string) => {
          console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
          finalizeStreamingMessage(assistantMessageId, fullResponse);
        },
        onError: (error: Error) => {
          console.error('❌ Erreur streaming:', error);
          
          // Vérifier si c'est un arrêt volontaire
          if (error.message === 'RESPONSE_STOPPED') {
            console.log('⏹️ Génération arrêtée par l\'utilisateur');
            return;
          }
          
          const errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer.';
          finalizeStreamingMessage(assistantMessageId, errorMessage);
        }
      };

      // Démarrer le streaming ultra-optimisé via Responses API
      await sendMessageToOpenAIStreamingResponses(
        openAIMessages,
        streamingCallbacks,
        DEFAULT_GPT5_MODEL,
        'low', // Reasoning effort pour vitesse maximale
        abortControllerRef.current,
        { maxOutputTokens: 2048 }
      );

    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      const errorMessage = error.message?.includes('RESPONSE_STOPPED') 
        ? '⏹ Génération interrompue'
        : '❌ Désolé, une erreur est survenue. Veuillez réessayer.';
      finalizeStreamingMessage(assistantMessageId, errorMessage);
    }
  };

  // Rendu d'un message (adapté de ChatInterface)
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <View style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          item.isUser 
            ? [styles.userMessage, { backgroundColor: isDark ? '#667eea' : '#6366f1' }]
            : [styles.aiMessage, { 
                backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                borderColor: isDark ? '#374151' : '#e5e7eb'
              }]
        ]}>
          <Markdown
            style={{
              body: {
                color: item.isUser ? '#ffffff' : theme.text.primary,
                fontSize: 16,
                lineHeight: 22,
                margin: 0
              },
              paragraph: {
                marginBottom: 8,
                marginTop: 0
              },
              strong: {
                fontWeight: '700',
                color: item.isUser ? '#ffffff' : theme.text.primary
              }
            }}
          >
            {item.text || (item.streaming ? '...' : '')}
          </Markdown>
          
          {!item.isUser && (
            <Text style={[
              styles.timestamp,
              { color: isDark ? '#9CA3AF' : '#6B7280' }
            ]}>
              {item.timestamp}
            </Text>
          )}
        </View>
      </View>
    );
  }, [isDark, theme.text.primary]);

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <ScreenContainer>
        {/* Header avec titre et switch */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={isDark ? ['#667eea', '#764ba2'] : ['#6366f1', '#8b5cf6']}
              style={styles.titleGradient}
              start={[0, 0]}
              end={[1, 0]}
            >
              <Text style={styles.headerTitle}>Assistant Correction</Text>
            </LinearGradient>
            
            {/* Switch Mode */}
            <View style={[styles.switchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <TouchableOpacity
                style={[
                  styles.switchOption,
                  correctionMode === 'orthographe' && [styles.switchOptionActive, { backgroundColor: isDark ? '#667eea' : '#6366f1' }]
                ]}
                onPress={() => setCorrectionMode('orthographe')}
              >
                <Text style={[
                  styles.switchText,
                  { color: correctionMode === 'orthographe' ? '#ffffff' : theme.text.secondary }
                ]}>
                  Correction orthographe
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.switchOption,
                  correctionMode === 'grammaire' && [styles.switchOptionActive, { backgroundColor: isDark ? '#667eea' : '#6366f1' }]
                ]}
                onPress={() => setCorrectionMode('grammaire')}
              >
                <Text style={[
                  styles.switchText,
                  { color: correctionMode === 'grammaire' ? '#ffffff' : theme.text.secondary }
                ]}>
                  Grammaire
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            {/* Bouton Nouveau (même style que ChatInterface) */}
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

        {/* Interface de chat (identique à ChatInterface) */}
        <KeyboardAvoidingView 
          style={[styles.container, { backgroundColor: theme.backgrounds.secondary }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          {/* Zone de messages - TOUJOURS afficher les messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Auto-scroll optimisé à chaque changement de contenu
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              });
            }}
          />

          {/* Zone de saisie (couleurs app de base) */}
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
                placeholder={`Écrivez votre texte à ${correctionMode === 'orthographe' ? 'corriger' : 'améliorer'}...`}
                placeholderTextColor={theme.text.secondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              
              {/* Bouton Send/Stop avec couleur bleue correction */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: isAITyping ? '#FF3B30' : (isDark ? '#667eea' : '#6366f1'),
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

// Styles adaptés de ChatInterface
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  titleGradient: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  switchContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    alignSelf: 'flex-start',
  },
  switchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 0,
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
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 22,
    fontWeight: '300',
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
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Messages (identiques à ChatInterface)
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: screenWidth * 0.8,
    padding: 16,
    borderRadius: 18,
  },
  userMessage: {
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
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
  accountButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 24,
  },
  accountButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});