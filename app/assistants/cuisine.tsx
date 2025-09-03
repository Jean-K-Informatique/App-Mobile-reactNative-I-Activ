import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
  Keyboard,
  ActionSheetIOS
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
import { SendIcon, WidgetsIcon, ImageIcon } from '../../components/icons/SvgIcons';
import * as ImagePicker from 'expo-image-picker';
import { analyzeImageWithOpenAIStreaming } from '../../services/openaiService';

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

  // Refs pour le système machine à écrire EXACT du ChatIA
  const typewriterTimerRef = useRef<number | null>(null);
  const typewriterQueueRef = useRef<string>('');
  const streamingTextRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

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
    return 'Tu es un chef cuisinier expert. Aide avec les recettes et conseils culinaires. Utilise des émojis 🍳';
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

  // COPIE EXACTE du updateStreamingMessage du ChatIA qui fonctionne
  const updateStreamingMessage = useCallback((messageId: string, newChunk: string) => {
    // Alimente une file et anime au fil de l'eau (machine à écrire)
    typewriterQueueRef.current += newChunk;

    const tick = () => {
      // Vitesse adaptative optimisée pour affichage plus rapide
      const queueLen = typewriterQueueRef.current.length;
      const sliceSize = queueLen > 200 ? 20 : queueLen > 80 ? 15 : queueLen > 20 ? 8 : 3;
      const slice = typewriterQueueRef.current.slice(0, sliceSize);
      typewriterQueueRef.current = typewriterQueueRef.current.slice(sliceSize);

      streamingTextRef.current += slice;
      
      // Debounce léger pour optimiser les re-renders
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, text: streamingTextRef.current } : msg));
      }, 10) as unknown as number;

      if (typewriterQueueRef.current.length === 0) {
        // Arrêter le timer si plus rien à écrire
        if (typewriterTimerRef.current) {
          clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
      }
    };

    // Démarrer le timer si nécessaire - Optimisé pour 30fps (meilleure perf)
    if (!typewriterTimerRef.current) {
      typewriterTimerRef.current = setInterval(tick, 33); // ~30fps pour économiser les ressources
    }
  }, []);

  // COPIE EXACTE du finalizeStreamingMessage du ChatIA
  const finalizeStreamingMessage = useCallback((messageId: string, fullText: string) => {
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
          ? { ...msg, text: fullText, streaming: false }
          : msg
      )
    );
    
    // Réinitialiser la ref
    streamingTextRef.current = '';
    typewriterQueueRef.current = '';
  }, []);

  // COPIE EXACTE du handleStreamingError du ChatIA
  const handleStreamingError = useCallback((messageId: string, errorMessage: string) => {
    // Annuler tout timeout en cours
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    // Remplacer le message par le message d'erreur
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: errorMessage, streaming: false }
          : msg
      )
    );
    
    // Réinitialiser la ref
    streamingTextRef.current = '';
  }, []);

  // Fonction pour envoyer un message (identique à correction)
  const sendMessage = async () => {
    if (!inputText.trim() || isAITyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    // Créer un message assistant vide pour le streaming - EXACT ChatIA
    const assistantMessageId = (Date.now() + 1).toString();
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
    setStreamingMessageId(assistantMessageId);
    setConversationStarted(true);

    // Réinitialiser la ref de streaming pour ce nouveau message - EXACT ChatIA
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
        
        // Finaliser le message avec le texte complet - EXACT du ChatIA
        finalizeStreamingMessage(assistantMessageId, fullResponse);
        
        setIsAITyping(false);
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      },
      onError: (error: Error) => {
        console.error('❌ Erreur streaming:', error);
        clearInterval(dotTimer); // Nettoyer l'animation en cas d'erreur
        
        // Vérifier si c'est un arrêt volontaire - EXACT du ChatIA
        if (error.message === 'RESPONSE_STOPPED') {
          console.log('⏹️ Génération arrêtée par l\'utilisateur');
          return;
        }
        
        // Gérer l'erreur avec la fonction optimisée
        handleStreamingError(assistantMessageId, 'Désolé, une erreur est survenue. Veuillez réessayer.');
        
        setIsAITyping(false);
        setStreamingMessageId(null);
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

  const pickAndSendImage = useCallback(async () => {
    const runWithBase64 = async (base64: string) => {
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        text: '',
        isUser: false,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, text: '[Image envoyée] Analyse en cours…', isUser: true, timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }, assistantMessage]);

      abortControllerRef.current = new AbortController();
      streamingBufferRef.current = '';
      if (streamingTimerRef.current) { clearTimeout(streamingTimerRef.current); streamingTimerRef.current = null; }

      await analyzeImageWithOpenAIStreaming(
        base64,
        "Voici une photo d'ingrédients. Décris-les et propose 3 recettes simples et 2 recettes créatives possibles avec instructions et quantités.",
        {
          onChunk: (chunk: string) => {
            streamingBufferRef.current += chunk;
            if (streamingTimerRef.current) clearTimeout(streamingTimerRef.current);
            streamingTimerRef.current = setTimeout(() => {
              const buffer = streamingBufferRef.current; streamingBufferRef.current = '';
              setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, text: msg.text + buffer } : msg));
            }, 12);
          },
          onComplete: (full: string) => {
            if (streamingTimerRef.current) { clearTimeout(streamingTimerRef.current); streamingTimerRef.current = null; }
            setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, text: full } : msg));
          },
          onError: () => {
            console.error('❌ Vision onError (cuisine): image non analysée');
            setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, text: 'Impossible d’analyser l’image.' } : msg));
          }
        },
        DEFAULT_GPT5_MODEL,
        abortControllerRef.current
      );
    };

    try {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Annuler', 'Bibliothèque', 'Caméra'],
            cancelButtonIndex: 0,
          },
          async (buttonIndex) => {
            if (buttonIndex === 1) {
              setTimeout(async () => {
                const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (libPerm.status !== 'granted') { Alert.alert('Permission requise', "Autorisez l'accès aux photos."); return; }
                const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, base64: true });
                if (!result.canceled && result.assets?.[0]?.base64) await runWithBase64(result.assets[0].base64 as string);
              }, 150);
            } else if (buttonIndex === 2) {
              setTimeout(async () => {
                const camPerm = await ImagePicker.requestCameraPermissionsAsync();
                if (camPerm.status !== 'granted') { Alert.alert('Permission requise', 'Autorisez l’accès à la caméra.'); return; }
                const result = await ImagePicker.launchCameraAsync({ quality: 0.85, base64: true });
                if (!result.canceled && result.assets?.[0]?.base64) await runWithBase64(result.assets[0].base64 as string);
              }, 150);
            }
          }
        );
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libPerm.status !== 'granted') { Alert.alert('Permission requise', "Autorisez l'accès aux photos."); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.IMAGE], quality: 0.85, base64: true });
        if (!result.canceled && result.assets?.[0]?.base64) await runWithBase64(result.assets[0].base64 as string);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec de sélection de la photo.');
    }
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

          {/* Zone de saisie (couleurs app de base + bouton orange) */}
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgrounds.primary, // Même fond que la page
            }
          ]}>
            <View style={styles.inputRow}>
              {/* Coachmark retiré à la demande */}
              <TouchableOpacity 
                onPress={pickAndSendImage}
                style={[styles.sendButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              >
                <ImageIcon size={20} color={isDark ? '#ffffff' : '#111827'} />
              </TouchableOpacity>
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
