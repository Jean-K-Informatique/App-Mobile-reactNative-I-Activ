import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard 
} from 'react-native';
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

export default function ChatInterface() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  
  // Refs pour le TextInput, auto-scroll et AbortController
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // State pour le streaming optimisé
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Récupérer les chats disponibles
  useEffect(() => {
    const loadChats = async () => {
      if (user) {
        try {
          const userChats = await fetchUserChats();
          setChats(userChats);
          
          // Sélectionner automatiquement le premier chat disponible
          if (userChats.length > 0) {
            const firstChat = userChats[0];
            setCurrentChat(firstChat);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des chats:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadChats();
  }, [user]);

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

      // Callbacks optimisés pour le streaming (inspirés du guide technique)
      const streamingCallbacks: StreamingCallbacks = {
        // Callback immédiat pour chaque chunk - CRUCIAL pour la rapidité
        onChunk: (chunk: string) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, text: msg.text + chunk } // Accumulation simple et immédiate
                : msg
            )
          );
        },
        
        // Callback de fin de streaming
        onComplete: (fullResponse: string) => {
          console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
          
          // Finaliser le message et arrêter les indicateurs
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, text: fullResponse, streaming: false }
                : msg
            )
          );
          
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
          
          // Remplacer le message streaming par un message d'erreur
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
          ? [styles.userMessageBubble, { backgroundColor: theme.backgrounds.userMessage }]
          : [styles.assistantMessageBubble, { backgroundColor: theme.backgrounds.tertiary }]
      ]}>
        <Text style={[
          styles.messageText,
          { color: item.isUser ? '#ffffff' : theme.text.primary }
        ]}>
          {item.text}
          {/* Indicateur de frappe pendant le streaming */}
          {item.streaming && (
            <Text style={{ color: theme.text.secondary }}>▊</Text>
          )}
        </Text>
        <Text style={[
          styles.messageTime,
          { color: item.isUser ? 'rgba(255,255,255,0.7)' : theme.text.secondary }
        ]}>
          {item.timestamp}
        </Text>
      </View>
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
            <View style={[styles.welcomeOrb, { 
              backgroundColor: isDark ? '#4c1d95' : '#6366f1',
            }]}>
              <Text style={[
                styles.welcomeText,
                { 
                  color: isDark ? '#ffffff' : '#1f2937',
                  textShadowColor: isDark ? 'rgba(124,58,237,0.7)' : 'rgba(255,255,255,0.9)',
                }
              ]}>
                Bonjour Jean{'\n\n'}
                Comment puis-je vous{'\n'}
                aider aujourd'hui ?
              </Text>
            </View>
            <Text style={[
              styles.noQuestionText,
              { color: theme.text.secondary }
            ]}>
              {currentChat 
                ? `Prêt à discuter avec ${currentChat.name}`
                : 'Chargement de votre assistant...'
              }
            </Text>
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

        <View style={styles.inputRow}>
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
  welcomeOrb: {
    width: Math.min(screenWidth * 0.6, 300),
    aspectRatio: 1,
    borderRadius: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  noQuestionText: {
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
    borderRadius: 24,
  },
  assistantMessageBubble: {
    borderRadius: 16,
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
    padding: 12,
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
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 52,
    maxHeight: 250,
    borderRadius: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 