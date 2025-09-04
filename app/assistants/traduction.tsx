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
  Modal
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

// Langues les plus populaires avec emojis et codes
const POPULAR_LANGUAGES = [
  { code: 'fr', name: 'Français', emoji: '🇫🇷' },
  { code: 'en', name: 'Anglais', emoji: '🇺🇸' },
  { code: 'es', name: 'Espagnol', emoji: '🇪🇸' },
  { code: 'de', name: 'Allemand', emoji: '🇩🇪' },
  { code: 'it', name: 'Italien', emoji: '🇮🇹' },
  { code: 'pt', name: 'Portugais', emoji: '🇵🇹' },
  { code: 'ru', name: 'Russe', emoji: '🇷🇺' },
  { code: 'ja', name: 'Japonais', emoji: '🇯🇵' },
  { code: 'ko', name: 'Coréen', emoji: '🇰🇷' },
  { code: 'zh', name: 'Chinois', emoji: '🇨🇳' },
  { code: 'ar', name: 'Arabe', emoji: '🇸🇦' },
  { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
  { code: 'nl', name: 'Néerlandais', emoji: '🇳🇱' },
  { code: 'sv', name: 'Suédois', emoji: '🇸🇪' },
  { code: 'da', name: 'Danois', emoji: '🇩🇰' },
  { code: 'no', name: 'Norvégien', emoji: '🇳🇴' },
  { code: 'fi', name: 'Finnois', emoji: '🇫🇮' },
  { code: 'pl', name: 'Polonais', emoji: '🇵🇱' },
  { code: 'tr', name: 'Turc', emoji: '🇹🇷' },
  { code: 'he', name: 'Hébreu', emoji: '🇮🇱' },
];

export default function AssistantTraduction() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const suckTo = useSuckNavigator();
  const insets = useSafeAreaInsets();
  
  // États principaux avec hook de conversation locale
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(true); // Déjà démarré avec message d'accueil
  const [showToolbar, setShowToolbar] = useState(false);
  const [targetLang, setTargetLang] = useState('Anglais');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [customLang, setCustomLang] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Refs (identiques à correction)
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
    const welcomeText = `👋 Bonjour ! Je suis votre assistant de **traduction professionnelle**.

Envoyez-moi le texte que vous souhaitez traduire vers **${targetLang}**, et je vous fournirai une traduction de qualité professionnelle.`;
    
    return {
      id: `welcome-traduction-${Date.now()}`,
      text: welcomeText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  }, [targetLang]);

  // Hook de conversation locale
  const { messages, setMessages, handleNewChat: handleNewChatLocal, checkStorageLimits } = useLocalConversation({
    widgetName: 'traduction',
    getWelcomeMessage
  });

  // Prompt spécialisé traduction
  const getSystemPrompt = (lang: string): string => {
    return `Tu es un traducteur professionnel expert multilingue de niveau natif.

MISSION: Traduire le texte avec la plus haute qualité vers: ${lang}

RÈGLES CRITIQUES:
- Traduction PARFAITE respectant les nuances culturelles
- Préserver le ton, style et intention originale
- Adapter les expressions idiomatiques naturellement
- Respecter les conventions typographiques de la langue cible
- Maintenir la formulation appropriée (formel/informel)
- RÉPONDS de manière conversationnelle et explique tes choix de traduction

OBJECTIF: Livrer une traduction indistinguable d'un texte écrit nativement.

STYLE DE RÉPONSE: Réponds de manière concise et directe pour une traduction rapide.`;
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

  // Finaliser le message de streaming (SIMPLE ET DIRECT)
  const finalizeStreamingMessage = useCallback((messageId: string, finalText: string) => {
    // Nettoyer tous les timers
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    
    // Mise à jour finale immédiate
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: finalText, streaming: false }
          : msg
      )
    );
    
    // Reset immédiat
    setIsAITyping(false);
    setStreamingMessageId(null);
    abortControllerRef.current = null;
  }, []);

  // Fonction d'arrêt de génération (identique à correction)
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('⏹️ Arrêt de la génération demandé');
      abortControllerRef.current.abort();
      if (streamingMessageId) {
        finalizeStreamingMessage(streamingMessageId, streamingTextRef.current || '⏹ Génération interrompue');
      }
    }
  }, [streamingMessageId, finalizeStreamingMessage]);

  // Reset complet (bouton Nouveau)
  const handleNewChat = useCallback(() => {
    if (conversationStarted && messages.length > 0) {
      Alert.alert(
        '🔄 Nouvelle conversation',
        'Êtes-vous sûr de vouloir commencer une nouvelle conversation ? Votre conversation actuelle sera perdue.',
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
              setStreamingMessageId(null);
              streamingTextRef.current = '';
              streamingBufferRef.current = '';
              if (streamingTimerRef.current) {
                clearTimeout(streamingTimerRef.current);
                streamingTimerRef.current = null;
              }
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
      console.log('🚀 Démarrage streaming traduction via Responses API (gpt-5-nano)');

      // Préparer l'historique pour OpenAI
      const openAIMessages: ChatMessage[] = [
        {
          role: 'system',
          content: getSystemPrompt(targetLang)
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

  // Sélecteur de langue
  const selectLanguage = (lang: string) => {
    setTargetLang(lang);
    setShowLanguageModal(false);
    setCustomLang('');
  };

  const useCustomLanguage = () => {
    if (customLang.trim()) {
      setTargetLang(customLang.trim());
      setShowLanguageModal(false);
      setCustomLang('');
    }
  };

  const getLanguageEmoji = (langName: string) => {
    const found = POPULAR_LANGUAGES.find(l => l.name.toLowerCase() === langName.toLowerCase());
    return found ? found.emoji : '🌐';
  };

  // Rendu d'un message (identique à correction)
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <View style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          item.isUser 
            ? [styles.userMessage, { backgroundColor: isDark ? '#ef4444' : '#f87171' }] // Rouge léger pour traduction
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
        {/* Header avec titre et sélecteur de langue */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
          <View style={styles.headerContent}>
            {/* Ligne du titre avec boutons alignés */}
            <View style={styles.headerTitleRow}>
              <LinearGradient
                colors={isDark ? ['#ef4444', '#dc2626'] : ['#f87171', '#ef4444']} // Rouge léger
                style={styles.titleGradient}
                start={[0, 0]}
                end={[1, 0]}
              >
                <Text style={styles.headerTitle}>Assistant Traduction</Text>
              </LinearGradient>
              
              <View style={styles.headerActions}>
                {/* Bouton Nouveau (même style que correction) */}
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
            
            {/* Sélecteur de langue en dessous du titre */}
            <TouchableOpacity 
              style={[styles.languageSelector, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => setShowLanguageModal(true)}
            >
              <View style={styles.languageSelectorContent}>
                <Text style={[styles.languageSelectorLabel, { color: theme.text.secondary }]}>
                  Traduire vers
                </Text>
                <View style={styles.selectedLanguage}>
                  <Text style={styles.languageEmoji}>{getLanguageEmoji(targetLang)}</Text>
                  <Text style={[styles.languageName, { color: theme.text.primary }]}>
                    {targetLang}
                  </Text>
                  <Text style={[styles.chevron, { color: theme.text.secondary }]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interface de chat (identique à correction) */}
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

          {/* Zone de saisie (couleurs app de base + bouton rouge) */}
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
                placeholder="Écrivez votre texte à traduire..."
                placeholderTextColor={theme.text.secondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              
              {/* Bouton Send/Stop avec couleur rouge traduction */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: isAITyping ? '#FF3B30' : (isDark ? '#ef4444' : '#f87171'), // Rouge léger
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

        {/* Modal de sélection de langue */}
        <Modal
          visible={showLanguageModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.backgrounds.primary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Choisir la langue cible
              </Text>
              <TouchableOpacity 
                onPress={() => setShowLanguageModal(false)}
                style={[styles.closeButton, { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }]}
              >
                <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Saisie personnalisée */}
            <View style={styles.customSection}>
              <Text style={[styles.customLabel, { color: theme.text.primary }]}>
                Ou saisissez une langue personnalisée :
              </Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={[styles.customInput, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    borderColor: isDark ? '#333' : '#e5e7eb',
                    color: theme.text.primary
                  }]}
                  placeholder="Ex: Créole, Latin, etc."
                  placeholderTextColor={theme.text.secondary}
                  value={customLang}
                  onChangeText={setCustomLang}
                />
                <TouchableOpacity 
                  onPress={useCustomLanguage}
                  style={[styles.useButton, { opacity: !customLang.trim() ? 0.5 : 1 }]}
                  disabled={!customLang.trim()}
                >
                  <LinearGradient
                    colors={isDark ? ['#ef4444', '#dc2626'] : ['#f87171', '#ef4444']}
                    style={styles.useButtonGradient}
                  >
                    <Text style={styles.useButtonText}>Utiliser</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Liste des langues populaires */}
            <FlatList
              data={POPULAR_LANGUAGES}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.languageItem, { 
                    backgroundColor: targetLang === item.name ? (isDark ? '#2a2a2a' : '#fef2f2') : 'transparent',
                    borderColor: targetLang === item.name ? (isDark ? '#444' : '#fecaca') : 'transparent'
                  }]}
                  onPress={() => selectLanguage(item.name)}
                >
                  <Text style={styles.languageItemEmoji}>{item.emoji}</Text>
                  <Text style={[styles.languageItemName, { color: theme.text.primary }]}>
                    {item.name}
                  </Text>
                  {targetLang === item.name && (
                    <Text style={[styles.checkmark, { color: isDark ? '#ef4444' : '#f87171' }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>


      </ScreenContainer>
    </SafeAreaView>
  );
}

// Styles adaptés de correction avec couleurs rouge léger
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center', // Alignement centré pour aligner avec les boutons
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
  languageSelector: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  languageSelectorContent: {},
  languageSelectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    fontWeight: '300',
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
  
  // Messages (identiques à correction)
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

  // Input (identique à correction)
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

  // Modal de langue (adapté de l'ancien widget traduction)
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  customLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  useButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  useButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 1,
    marginHorizontal: 24,
    marginVertical: 2,
    borderRadius: 12,
  },
  languageItemEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  languageItemName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
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
