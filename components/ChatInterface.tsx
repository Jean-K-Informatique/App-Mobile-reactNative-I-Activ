import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserChats, type Chat } from '../services/chatService';
import { sendMessageToOpenAIStreaming, type ChatMessage, type StreamingCallbacks } from '../services/openaiService';
import { TromboneIcon, ImageIcon, ToolsIcon, SendIcon } from './icons/SvgIcons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  streaming?: boolean;
}

interface ChatInterfaceProps {
  currentAssistant: string;
  onResetRequest?: React.MutableRefObject<(() => void) | null>;
}

export default function ChatInterface({ currentAssistant, onResetRequest }: ChatInterfaceProps) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Store des conversations par assistant pour les garder séparées
  const [conversationsByAssistant, setConversationsByAssistant] = useState<{[key: string]: Message[]}>({});
  
  // Refs pour le TextInput, auto-scroll et AbortController
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // State pour le streaming optimisé
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  // Refs pour optimiser l'accumulation de texte streaming
  const streamingTextRef = useRef<string>('');
  const updateTimeoutRef = useRef<number | null>(null);

  // Fonction optimisée pour l'accumulation de chunks avec batching
  const updateStreamingMessage = useCallback((messageId: string, newChunk: string) => {
    // Accumuler le texte dans la ref
    streamingTextRef.current += newChunk;
    
    // Annuler le timeout précédent s'il existe
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Programmer une mise à jour avec debouncing (mais pas trop longtemps pour garder la fluidité)
    updateTimeoutRef.current = setTimeout(() => {
      const accumulatedText = streamingTextRef.current;
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: accumulatedText }
            : msg
        )
      );
    }, 50); // 50ms de debouncing pour éviter les updates trop fréquents
  }, []);

  // Fonction pour finaliser le streaming
  const finalizeStreamingMessage = useCallback((messageId: string, fullText: string) => {
    // Annuler tout timeout en cours
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
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
  }, []);

  // Fonction pour gérer les erreurs de streaming
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

  // Cleanup des timeouts au démontage du composant
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Fonction pour réinitialiser la conversation actuelle
  const resetCurrentConversation = () => {
    console.log('🔄 Réinitialisation de la conversation pour:', currentAssistant);
    setMessages([]);
    setConversationStarted(false);
    setInputText('');
    
    // Nettoyer aussi le store des conversations pour cet assistant
    if (currentAssistant) {
      setConversationsByAssistant(prev => ({
        ...prev,
        [currentAssistant]: []
      }));
    }
    
    // Arrêter toute génération en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsAITyping(false);
      setStreamingMessageId(null);
    }
  };

  // Exposer la fonction de reset via callback
  useEffect(() => {
    if (onResetRequest) {
      onResetRequest.current = resetCurrentConversation;
    }
  }, [onResetRequest, currentAssistant]);

  // Récupérer les chats disponibles
  useEffect(() => {
    const loadChats = async () => {
      if (user) {
        try {
          const userChats = await fetchUserChats();
          setChats(userChats);
          
          // Sélectionner automatiquement le chat correspondant à currentAssistant
          if (userChats.length > 0) {
            const matchingChat = userChats.find(chat => chat.name === currentAssistant) || userChats[0];
            setCurrentChat(matchingChat);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des chats:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadChats();
  }, [user, currentAssistant]);

  // Ref pour éviter les dépendances circulaires
  const conversationsRef = useRef<{[key: string]: Message[]}>({});

  // Synchroniser le ref avec le state
  useEffect(() => {
    conversationsRef.current = conversationsByAssistant;
  }, [conversationsByAssistant]);

  // Gérer le changement d'assistant - charger la conversation correspondante
  useEffect(() => {
    if (!currentAssistant || !chats.length) return;

    console.log('🔄 Changement d\'assistant vers:', currentAssistant);
    
    // Trouver le nouveau chat
    const newChat = chats.find(chat => chat.name === currentAssistant);
    if (newChat && newChat.id !== currentChat?.id) {
      setCurrentChat(newChat);
      
      // Charger la conversation sauvegardée pour cet assistant ou partir de zéro
      const savedMessages = conversationsRef.current[currentAssistant] || [];
      setMessages(savedMessages);
      setConversationStarted(savedMessages.length > 0);
      
      console.log(`✅ Assistant changé vers ${currentAssistant}, ${savedMessages.length} messages restaurés`);
    }
  }, [currentAssistant, chats, currentChat?.id]);

  // Sauvegarder les messages quand ils changent (pour persister les conversations par assistant)
  useEffect(() => {
    if (currentChat && messages.length > 0) {
      setConversationsByAssistant(prev => ({
        ...prev,
        [currentChat.name]: messages
      }));
    }
  }, [messages, currentChat?.name]);

  // Auto-scroll optimisé pendant le streaming
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Utiliser requestAnimationFrame pour optimiser le scroll
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages]);

  // Fonction pour arrêter la génération
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      console.log('⏹️ Arrêt de la génération demandé');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsAITyping(false);
      setStreamingMessageId(null);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentChat || isAITyping) return;

    const currentInput = inputText.trim();
    setInputText('');
    
    // Fermer le clavier immédiatement après l'envoi
    Keyboard.dismiss();
    textInputRef.current?.blur();

    // Si c'est le premier message, faire disparaître l'orbe et initialiser la conversation
    if (!conversationStarted) {
      setConversationStarted(true);
      
      // Ajouter le message de bienvenue de l'assistant s'il existe
      if (currentChat.welcomeMessage && currentChat.welcomeMessage.trim()) {
        const welcomeMessage: Message = {
          id: 'welcome',
          text: currentChat.welcomeMessage.trim(),
          isUser: false,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([welcomeMessage]);
      }
    }

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
      console.log('🚀 Démarrage streaming optimisé avec modèle:', currentChat.model);

      // Construire l'historique des messages pour OpenAI
      const openAIMessages: ChatMessage[] = [
        // System prompt avec les vraies instructions de l'assistant
        {
          role: 'system',
          content: currentChat.content || currentChat.instructions || 'Tu es un assistant IA utile.'
        },
        // Historique des messages (sans les messages de streaming)
        ...messages
          .filter(msg => !msg.streaming)
          .map(msg => ({
            role: msg.isUser ? 'user' as const : 'assistant' as const,
            content: msg.text
          })),
        // Message actuel de l'utilisateur
        {
          role: 'user',
          content: currentInput
        }
      ];

      // Callbacks optimisés pour le streaming avec batching pour éviter les boucles infinies
      const streamingCallbacks: StreamingCallbacks = {
        // Callback immédiat pour chaque chunk - optimisé avec debouncing
        onChunk: (chunk: string) => {
          updateStreamingMessage(assistantMessageId, chunk);
        },
        
        // Callback de fin de streaming
        onComplete: (fullResponse: string) => {
          console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
          
          // Finaliser le message avec le texte complet
          finalizeStreamingMessage(assistantMessageId, fullResponse);
          
          setIsAITyping(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
        },
        
        // Callback d'erreur
        onError: (error: Error) => {
          console.error('❌ Erreur streaming:', error);
          
          // Vérifier si c'est un arrêt volontaire
          if (error.message === 'RESPONSE_STOPPED') {
            console.log('⏹️ Génération arrêtée par l\'utilisateur');
            return;
          }
          
          // Gérer l'erreur avec notre fonction optimisée
          handleStreamingError(assistantMessageId, 'Désolé, une erreur est survenue. Veuillez réessayer.');
          
          setIsAITyping(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
          
          Alert.alert('Erreur', 'Impossible d\'envoyer le message. Vérifiez votre connexion.');
        }
      };

      // Démarrer le streaming optimisé avec AbortController
      await sendMessageToOpenAIStreaming(
        openAIMessages, 
        streamingCallbacks,
        currentChat.model || 'gpt-4.1-mini-2025-04-14',
        abortControllerRef.current
      );

    } catch (error: any) {
      console.error('Erreur lors du streaming:', error);
      
      // Gérer l'erreur
      if (error.message !== 'RESPONSE_STOPPED') {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? {
                  ...msg,
                  text: 'Désolé, une erreur est survenue. Veuillez réessayer.',
                  streaming: false
                }
              : msg
          )
        );
        
        Alert.alert('Erreur', 'Impossible d\'envoyer le message. Vérifiez votre connexion.');
      }
      
      setIsAITyping(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessageContainer : styles.assistantMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser 
          ? [styles.userMessageBubble, { 
              backgroundColor: theme.backgrounds.userMessage,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }]
          : [styles.assistantMessageBubble, { 
              backgroundColor: 'transparent'
            }]
      ]}>
        {item.isUser ? (
          <Text style={[
            styles.messageText,
            { color: '#ffffff' }
          ]}>
            {item.text}
          </Text>
        ) : (
          <View>
            <Markdown style={{
              body: {
                color: theme.text.primary,
                fontSize: 16,
                lineHeight: 22,
              },
              paragraph: {
                marginTop: 0,
                marginBottom: 8,
                color: theme.text.primary,
              },
              strong: {
                fontWeight: 'bold',
                color: theme.text.primary,
              },
              em: {
                fontStyle: 'italic',
                color: theme.text.primary,
              },
              code_inline: {
                backgroundColor: theme.backgrounds.secondary,
                color: theme.text.primary,
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
                fontFamily: 'monospace',
              },
              code_block: {
                backgroundColor: theme.backgrounds.secondary,
                color: theme.text.primary,
                padding: 12,
                borderRadius: 8,
                fontFamily: 'monospace',
              },
            }}>
              {item.text + (item.streaming ? ' ▊' : '')}
            </Markdown>
          </View>
        )}

      </View>
      
      {/* Bouton copier discret pour les messages de l'assistant */}
      {!item.isUser && !item.streaming && (
        <View style={styles.messageActions}>
          <TouchableOpacity 
            style={styles.copyButtonSmall}
            onPress={() => {
              // TODO: Implémenter la copie
              Alert.alert('Copié !', 'Le message a été copié dans le presse-papiers');
            }}
          >
            <Text style={styles.copyIconSmall}>📄</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Disclaimer affiché seulement pour le dernier message de l'assistant */}
      {!item.isUser && !item.streaming && messages[messages.length - 1]?.id === item.id && (
        <Text style={[styles.disclaimerTextSmall, { color: theme.text.secondary }]}>
          I-Activ peut faire des erreurs, penser à vérifier ses réponses
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.backgrounds.secondary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      {/* Zone de messages */}
      {!conversationStarted ? (
        // Affichage de l'orbe de bienvenue
        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
          <View style={styles.welcomeContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={isDark 
                  ? require('../assets/mobile-assets/LogoSombreTexte.png')
                  : require('../assets/mobile-assets/LogoSombreTexteClaire2.png')
                }
                style={styles.welcomeLogo}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.modernWelcomeCard, { 
              backgroundColor: theme.backgrounds.tertiary,
              borderColor: theme.borders.primary,
            }]}>
              <Text style={[
                styles.welcomeTitle,
                { color: theme.text.primary }
              ]}>
                Bonjour {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Jean'} !
              </Text>
              <Text style={[
                styles.welcomeSubtitle,
                { color: theme.text.secondary }
              ]}>
                Comment puis-je vous aider aujourd'hui ?
              </Text>
            </View>

          </View>
        </ScrollView>
      ) : (
        // Affichage des messages de conversation
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
      )}

      {/* Zone de saisie */}
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: theme.backgrounds.chatInput,
          borderColor: theme.borders.chatInput || theme.borders.primary,
        }
      ]}>
        {/* Toolbar avec bouton + et outils cachés */}
        {showToolbar && (
          <View style={styles.toolbar}>
            <TouchableOpacity style={[styles.toolButton, { backgroundColor: theme.backgrounds.primary }]}>
              <TromboneIcon size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toolButton, { backgroundColor: theme.backgrounds.primary }]}>
              <ImageIcon size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toolButton, { backgroundColor: theme.backgrounds.primary }]}>
              <Text style={{ color: theme.text.primary, fontSize: 16 }}>📄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toolButton, { backgroundColor: theme.backgrounds.primary }]}>
              <ToolsIcon size={18} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          {/* Bouton + style ChatGPT */}
          <TouchableOpacity
            style={[
              styles.plusButton,
              { 
                backgroundColor: showToolbar ? theme.backgrounds.primary : 'transparent',
                transform: [{ rotate: showToolbar ? '45deg' : '0deg' }]
              }
            ]}
            onPress={() => setShowToolbar(!showToolbar)}
          >
            <Text style={[
              styles.plusButtonText,
              { color: theme.text.primary }
            ]}>
              +
            </Text>
          </TouchableOpacity>

          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              { 
                color: theme.text.primary,
                backgroundColor: 'transparent'
              }
            ]}
            placeholder="Écrivez votre message..."
            placeholderTextColor={theme.text.secondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            textAlignVertical="top"
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          {/* Bouton Send/Stop intelligent */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: isAITyping ? '#FF3B30' : (isDark ? '#ffffff' : '#222422'),
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
                color={isDark ? '#000000' : '#ffffff'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeLogo: {
    width: Math.min(screenWidth * 0.8, 320),
    height: 120,
    maxWidth: '100%',
  },
  modernWelcomeCard: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  assistantReadyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesListContent: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  userMessageBubble: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  assistantMessageBubble: {
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toolButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 0,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 250,
    borderRadius: 20,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginRight: 8,
  },
  copyButtonSmall: {
    padding: 4,
    borderRadius: 4,
    opacity: 0.6,
  },
  copyIconSmall: {
    fontSize: 12,
    color: '#ffffff',
  },
  disclaimerTextSmall: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
    marginHorizontal: 20,
    opacity: 0.7,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  plusButtonText: {
    fontSize: 20,
    fontWeight: '300',
  },
}); 