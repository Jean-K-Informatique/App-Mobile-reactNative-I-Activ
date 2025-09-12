import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { ScreenContainer, useSuckNavigator } from '../../components/ScreenTransition';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  sendMessageToOpenAIStreamingResponses,
  DEFAULT_GPT5_MODEL,
  type ChatMessage, 
  type StreamingCallbacks
} from '../../services/openaiService';
import { SendIcon, WidgetsIcon, CopyIcon } from '../../components/icons/SvgIcons';
import { useLocalConversation } from '../../hooks/useLocalConversation';

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
  const suckTo = useSuckNavigator();
  const insets = useSafeAreaInsets();
  
  // États principaux avec hook de conversation locale
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(true); // démarré avec message d'accueil
  const [showToolbar, setShowToolbar] = useState(false);
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>('orthographe');
  
  // Refs (identiques à Cuisine)
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamingTextRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs pour le système machine à écrire ultra-optimisé (comme Cuisine)
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

  // Machine à écrire (alignée sur Cuisine)
  const updateStreamingMessage = useCallback((messageId: string, newChunk: string) => {
    typewriterQueueRef.current += newChunk;

    const tick = () => {
      const queueLen = typewriterQueueRef.current.length;
      const sliceSize = queueLen > 200 ? 20 : queueLen > 80 ? 15 : queueLen > 20 ? 8 : 3;
      const slice = typewriterQueueRef.current.slice(0, sliceSize);
      typewriterQueueRef.current = typewriterQueueRef.current.slice(sliceSize);

      streamingTextRef.current += slice;

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, text: streamingTextRef.current } : msg));
      }, 10);

      if (typewriterQueueRef.current.length === 0) {
        if (typewriterTimerRef.current) {
          clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
      }
    };

    if (!typewriterTimerRef.current) {
      typewriterTimerRef.current = setInterval(tick, 33);
    }
  }, [setMessages]);

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

  // Fonction pour copier le texte dans le presse-papiers
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('✅ Copié', 'Le texte a été copié dans le presse-papiers', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      Alert.alert('❌ Erreur', 'Impossible de copier le texte');
    }
  }, []);

  // Reset complet (bouton Nouveau) avec confirmation et hook local
  const handleNewChat = useCallback(async () => {
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
            onPress: async () => {
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
            }
          }
        ]
      );
    } else {
      await handleNewChatLocal();
    }
  }, [conversationStarted, messages.length, handleNewChatLocal]);

  // Fonction pour envoyer un message (IDENTIQUE à l'assistant cuisine)
  const sendMessage = async () => {
    console.log('📤 Correction - sendMessage appelée - inputText:', inputText.trim(), 'isAITyping:', isAITyping);
    
    if (!inputText.trim() || isAITyping) {
      console.log('❌ Correction - Conditions non remplies pour envoyer un message');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    // Créer un message assistant vide pour le streaming - EXACT Cuisine
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      text: '',
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputText('');
    
    // Fermer le clavier immédiatement après l'envoi (comme Cuisine)
    Keyboard.dismiss();
    textInputRef.current?.blur();
    
    setIsAITyping(true);
    setStreamingMessageId(assistantMessageId);
    setConversationStarted(true);

    // Vérifier les limites de stockage avant d'ajouter plus de contenu
    await checkStorageLimits();

    // Réinitialiser la ref de streaming pour ce nouveau message - EXACT Cuisine
    streamingTextRef.current = '';
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    // Affichage immédiat d'un indicateur de démarrage pour TTFR ultra-rapide
    setMessages(prev => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { ...msg, text: '•••', streaming: true }
        : msg
    ));

    // Animation des points d'attente pour impression de réactivité
    let dotCount = 3;
    const dotTimer = setInterval(() => {
      dotCount = dotCount === 3 ? 1 : dotCount + 1;
      const dots = '•'.repeat(dotCount);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId && msg.text.startsWith('•')
          ? { ...msg, text: dots }
          : msg
      ));
    }, 500); // Ralenti pour économiser les ressources

    // Créer AbortController pour pouvoir arrêter le streaming
    abortControllerRef.current = new AbortController();

    // Enhanced onChunk qui nettoie l'animation et lance le vrai streaming
    const enhancedOnChunk = (chunk: string) => {
      clearInterval(dotTimer);
      updateStreamingMessage(assistantMessageId, chunk);
    };

    const streamingCallbacks: StreamingCallbacks = {
      onChunk: enhancedOnChunk,
      onComplete: (fullResponse: string) => {
        console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
        clearInterval(dotTimer); // Nettoyer l'animation à la fin
        
        // Finaliser le message avec le texte complet - EXACT du Cuisine
        finalizeStreamingMessage(assistantMessageId, fullResponse);
        
        setIsAITyping(false);
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      },
      onError: (error: Error) => {
        console.error('❌ Erreur streaming:', error);
        clearInterval(dotTimer); // Nettoyer l'animation en cas d'erreur
        
        // Vérifier si c'est un arrêt volontaire - EXACT du Cuisine
        if (error.message === 'RESPONSE_STOPPED') {
          console.log('⏹️ Génération arrêtée par l\'utilisateur');
          return;
        }
        
        // Gérer l'erreur avec la fonction optimisée
        const errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer.';
        finalizeStreamingMessage(assistantMessageId, errorMessage);
        
        setIsAITyping(false);
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      }
    };

    try {
      const systemPrompt = getSystemPrompt(correctionMode);
      
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

  // Rendu d'un message avec bouton copier pour les réponses IA
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <View style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.assistantMessage
      ]}>
        <View style={[
          styles.messageBubble,
          item.isUser ? [
            styles.userBubble,
            { backgroundColor: isDark ? '#667eea' : '#6366f1' } // Thème bleu correction
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
          
          <View style={styles.messageFooter}>
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
            
            {/* Bouton copier uniquement pour les réponses IA */}
            {!item.isUser && item.text && item.text.length > 0 && !item.text.startsWith('•') && (
              <TouchableOpacity
                style={[styles.copyButton, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                }]}
                onPress={() => copyToClipboard(item.text)}
                activeOpacity={0.7}
              >
                <CopyIcon 
                  size={16} 
                  color={theme.text.secondary} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, [isDark, theme.text.primary, copyToClipboard]);

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

        {/* Interface de chat avec correction Android */}
        <KeyboardAvoidingView 
          style={[styles.container, { backgroundColor: theme.backgrounds.secondary }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        >
          {/* Zone de messages - TOUJOURS afficher les messages */}
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
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