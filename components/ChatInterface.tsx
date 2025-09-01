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
  Image,
  Linking
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserChats, type Chat } from '../services/chatService';
import { 
  sendMessageToOpenAIStreamingResponses,
  sendMessageToOpenAINonStreamingResponses,
  DEFAULT_GPT5_MODEL,
  type ChatMessage, 
  type StreamingCallbacks,
  type ReasoningEffort
} from '../services/openaiService';
import { TromboneIcon, ImageIcon, ToolsIcon, SendIcon } from './icons/SvgIcons';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
// @ts-ignore - styles import from react-syntax-highlighter
import { atomOneDark } from 'react-syntax-highlighter/styles/hljs';
// @ts-ignore - styles import from react-syntax-highlighter
import { github } from 'react-syntax-highlighter/styles/hljs';
import { 
  getOrCreateConversation, 
  createConversation, 
  saveMessage, 
  getUserConversations, 
  getConversationMessages,
  deletePrivateConversations,
  verifyConversationOwnership,
  updateConversationTimestamp,
  type Conversation 
} from '../services/conversationService';
import { perplexitySearch, buildWebContextMarkdown, type PerplexitySearchResultItem } from '../services/perplexityService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  streaming?: boolean;
  ephemeral?: boolean; // messages d'état temporaires (non sauvegardés / non envoyés à OpenAI)
}

interface ChatInterfaceProps {
  currentAssistant: string;
  onResetRequest?: React.MutableRefObject<(() => void) | null>;
  loadConversationId?: string | null;
  onConversationLoaded?: () => void;
  onNewConversationCreated?: () => void; // 🆕 Callback pour notifier la création
}

export default function ChatInterface({ 
  currentAssistant, 
  onResetRequest, 
  loadConversationId, 
  onConversationLoaded,
  onNewConversationCreated 
}: ChatInterfaceProps) {
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
  
  // Mode navigation privée
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
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

  const [forceNewConversation, setForceNewConversation] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('low');
  // Désactivation visuelle et fonctionnelle du raisonnement
  const reasoningDisabled = true;
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [webSourcesByMessageId, setWebSourcesByMessageId] = useState<{[id: string]: PerplexitySearchResultItem[]}>({});
  const reasoningTimerRef = useRef<number | null>(null);
  const [reasoningSeconds, setReasoningSeconds] = useState(0);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const webTimerRef = useRef<number | null>(null);
  const [webSeconds, setWebSeconds] = useState(0);

  // Contrôleur d'effet machine à écrire
  const typewriterTimerRef = useRef<number | null>(null);
  const typewriterQueueRef = useRef<string>('');

  // Pré-formatage léger pour améliorer le rendu Markdown lorsque l'IA n'utilise pas les #/listes
  const formatForMarkdown = useCallback((raw: string): string => {
    // 1) Convertir HTML <pre><code> / <code> en Markdown pur pour éviter le rendu d'un composant natif 'code'
    const decode = (s: string) => s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    let text = raw
      .replace(/<pre>\s*<code(?:\s+class=["']language-([^"']+)["'])?\s*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
        (_m, lang, code) => `\n\n\
\`\`\`${(lang || '').trim()}\n${decode(code)}\n\`\`\``)
      .replace(/<code>([\s\S]*?)<\/code>/gi, (_m, code) => `\`${decode(code)}\``);

    const lines = text.split('\n');
    const formatted: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // Titre: ... => ## ...
      const mTitle = line.match(/^\s*(Titre|Title)\s*[:\-]\s*(.+)$/i);
      if (mTitle) {
        formatted.push(`## ${mTitle[2]}`);
        continue;
      }
      // Puces "• " => "- "
      if (/^\s*•\s+/.test(line)) {
        line = line.replace(/^\s*•\s+/, '- ');
      }
      // Listes numérotées "1)" => "1."
      line = line.replace(/^(\s*\d+)\)\s+/, '$1. ');
      formatted.push(line);
    }
    return formatted.join('\n');
  }, []);

  // Styles et règles Markdown améliorés (code blocks lisibles + scroll horizontal)
  const codeFontFamily = useMemo(() => Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), []);
  const markdownRules = useMemo(() => ({
    code_block: (node: any) => (
      <ScrollView key={node?.key || `cb-${Math.random()}`} horizontal bounces={false} showsHorizontalScrollIndicator style={{ marginVertical: 8 }}>
        <SyntaxHighlighter
          language={(node?.info || 'text').trim()}
          style={isDark ? atomOneDark : github}
          highlighter="hljs"
          customStyle={{
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.borders.primary,
            minWidth: '100%'
          }}
        >
          {node.content}
        </SyntaxHighlighter>
      </ScrollView>
    ),
    fence: (node: any) => (
      <ScrollView key={node?.key || `fn-${Math.random()}`} horizontal bounces={false} showsHorizontalScrollIndicator style={{ marginVertical: 8 }}>
        <SyntaxHighlighter
          language={(node?.info || 'text').trim()}
          style={isDark ? atomOneDark : github}
          highlighter="hljs"
          customStyle={{
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.borders.primary,
            minWidth: '100%'
          }}
        >
          {node.content}
        </SyntaxHighlighter>
      </ScrollView>
    ),
    code_inline: (node: any) => (
      <Text
        key={node?.key || `ci-${Math.random()}`}
        style={{
          backgroundColor: isDark ? '#0f1117' : '#f3f4f6',
          color: isDark ? '#e5e7eb' : '#111827',
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 6,
          fontFamily: codeFontFamily || 'monospace',
        }}
      >
        {node?.content}
      </Text>
    ),
  }), [isDark, theme.borders.primary]);

  // Effet pour charger une conversation spécifique depuis Firestore
  useEffect(() => {
    if (loadConversationId && currentChat) {
      loadConversationFromFirestore(loadConversationId);
    }
  }, [loadConversationId, currentChat]);

  // Set forceNew for initial conversation on app start
  useEffect(() => {
    if (!conversationStarted && !loadConversationId && messages.length === 0) {
      setForceNewConversation(true);
    }
  }, []);

  // Fonction pour charger une conversation depuis Firestore
  const loadConversationFromFirestore = async (conversationId: string) => {
    try {
      console.log('📖 Chargement conversation depuis Firestore:', conversationId);
      
      // Vérifier la propriété de la conversation
      const hasAccess = await verifyConversationOwnership(conversationId);
      if (!hasAccess) {
        console.error('❌ Accès refusé à la conversation:', conversationId);
        return;
      }

      // Récupérer les messages de la conversation
      const conversationMessages = await getConversationMessages(conversationId);
      
      if (conversationMessages.length > 0) {
        // Convertir les messages Firestore en messages locaux
        const localMessages: Message[] = conversationMessages.map(msg => ({
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: msg.timestamp.toDate().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }));

        // Mettre à jour l'état
        setMessages(localMessages);
        setConversationStarted(true);
        setCurrentConversationId(conversationId);
        
        // Faire remonter la conversation dans l'historique
        await updateConversationTimestamp(conversationId);
        
        // Sauvegarder dans le store local aussi
        if (currentChat) {
          setConversationsByAssistant(prev => ({
            ...prev,
            [currentChat.name]: localMessages
          }));
        }

        console.log(`✅ ${localMessages.length} messages chargés depuis Firestore`);
        console.log('⬆️ Conversation remontée dans l\'historique');
        
        // Notifier que le chargement est terminé
        if (onConversationLoaded) {
          onConversationLoaded();
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement conversation:', error);
      if (onConversationLoaded) {
        onConversationLoaded();
      }
    }
  };

  // Fonction optimisée pour l'accumulation de chunks avec batching
  const updateStreamingMessage = useCallback((messageId: string, newChunk: string) => {
    // Alimente une file et anime au fil de l'eau (machine à écrire)
    typewriterQueueRef.current += newChunk;

    const tick = () => {
      // Vitesse adaptative (plus la file est longue, plus on écrit vite)
      const queueLen = typewriterQueueRef.current.length;
      const sliceSize = queueLen > 200 ? 12 : queueLen > 80 ? 8 : queueLen > 20 ? 4 : 2;
      const slice = typewriterQueueRef.current.slice(0, sliceSize);
      typewriterQueueRef.current = typewriterQueueRef.current.slice(sliceSize);

      streamingTextRef.current += slice;
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, text: streamingTextRef.current } : msg));

      if (typewriterQueueRef.current.length === 0) {
        // Arrêter le timer si plus rien à écrire
        if (typewriterTimerRef.current) {
          clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
      }
    };

    // Démarrer le timer si nécessaire
    if (!typewriterTimerRef.current) {
      typewriterTimerRef.current = setInterval(tick, 16); // ~60fps
    }
  }, []);

  // Fonction pour finaliser le streaming
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
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }
    };
  }, []);

  // Fonction pour basculer le mode privé
  const togglePrivateMode = () => {
    if (!isPrivateMode) {
      // Activation du mode privé
      Alert.alert(
        "🕵️ Mode Navigation Privée",
        "En mode navigation privée :\n\n• Vos conversations ne seront PAS sauvegardées\n• Aucun historique ne sera conservé\n• Les messages seront supprimés à la fermeture\n\nContinuer ?",
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Activer le Mode Privé", 
            style: "default",
            onPress: () => {
              setIsPrivateMode(true);
              console.log('🕵️ Mode navigation privée activé');
            }
          }
        ]
      );
    } else {
      // Désactivation du mode privé
      if (conversationStarted && messages.length > 0) {
        Alert.alert(
          "🔓 Quitter le Mode Privé",
          "Cette conversation sera définitivement supprimée.\n\nQue souhaitez-vous faire ?",
          [
            { 
              text: "Supprimer", 
              style: "destructive",
              onPress: () => {
                setIsPrivateMode(false);
                resetCurrentConversation();
                console.log('🔓 Mode navigation privée désactivé - conversation supprimée');
              }
            },
            { 
              text: "Sauvegarder et Quitter", 
              style: "default",
              onPress: async () => {
                setIsPrivateMode(false);
                if (currentChat && messages.length > 0) {
                  await saveCurrentConversation();
                }
                console.log('🔓 Mode navigation privée désactivé - conversation sauvegardée');
              }
            },
            { text: "Annuler", style: "cancel" }
          ]
        );
      } else {
        setIsPrivateMode(false);
        console.log('🔓 Mode navigation privée désactivé');
      }
    }
  };

  // Fonction pour gérer la création d'une nouvelle conversation en mode privé
  const handleNewPrivateConversation = () => {
    if (isPrivateMode && conversationStarted && messages.length > 0) {
      Alert.alert(
        "⚠️ Nouvelle Conversation Privée",
        "Attention ! Vous êtes en mode navigation privée.\n\nSi vous commencez une nouvelle conversation, la conversation actuelle sera définitivement perdue.\n\nContinuer ?",
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Continuer", 
            style: "destructive",
            onPress: () => {
              resetCurrentConversation();
              console.log('🗑️ Conversation privée précédente supprimée pour nouvelle conversation');
            }
          }
        ]
      );
      return false; // Bloquer l'envoi du message
    }
    return true; // Autoriser l'envoi
  };

  // Effet pour nettoyer les conversations privées au changement d'assistant
  useEffect(() => {
    if (isPrivateMode && conversationStarted && messages.length > 0) {
      const cleanup = async () => {
        try {
          await deletePrivateConversations();
          console.log('🧹 Conversations privées nettoyées');
        } catch (error) {
          console.error('❌ Erreur nettoyage conversations privées:', error);
        }
      };
      
      // Nettoyer après un délai pour éviter les conflits
      const timeoutId = setTimeout(cleanup, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentAssistant, isPrivateMode]);

  // Effet pour avertir l'utilisateur lors de la fermeture de l'app en mode privé
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' && isPrivateMode && conversationStarted && messages.length > 0) {
        // L'application passe en arrière-plan avec une conversation privée active
        console.log('⚠️ Application en arrière-plan avec conversation privée active');
        
        // Programmer la suppression des conversations privées
        setTimeout(async () => {
          try {
            await deletePrivateConversations();
            console.log('🧹 Conversations privées supprimées (arrière-plan)');
          } catch (error) {
            console.error('❌ Erreur suppression conversations privées:', error);
          }
        }, 5000); // Attendre 5 secondes avant suppression
      }
    };

    // Note: Dans un vrai projet, vous utiliseriez AppState de React Native
    // AppState.addEventListener('change', handleAppStateChange);
    // return () => AppState.removeEventListener('change', handleAppStateChange);
  }, [isPrivateMode, conversationStarted, messages.length]);

  // Fonction pour sauvegarder la conversation actuelle
  const saveCurrentConversation = async () => {
    if (!currentChat || !conversationStarted || isPrivateMode) return;

    try {
      let conversationId = currentConversationId;
      
      // Créer ou récupérer une conversation existante si nécessaire
      if (!conversationId && messages.length > 0) {
        const firstUserMessage = messages.find(msg => msg.isUser);
        if (firstUserMessage) {
          // Utiliser getOrCreateConversation pour éviter les duplications
          conversationId = await getOrCreateConversation(
            currentChat.id,
            currentChat.name,
            firstUserMessage.text,
            false,
            forceNewConversation
          );
          setCurrentConversationId(conversationId);
          
          // 🆕 Rafraîchir l'historique seulement lors de la première création
          if (onNewConversationCreated) {
            onNewConversationCreated();
          }

          // Reset forceNew after creation
          setForceNewConversation(false);
        }
      }

      // Sauvegarder tous les messages non encore sauvegardés
      if (conversationId) {
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          if (message.id !== 'welcome' && !message.streaming) {
            await saveMessage(conversationId, message.text, message.isUser, i);
          }
        }
        console.log('💾 Conversation sauvegardée:', conversationId);
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde conversation:', error);
    }
  };

  // Fonction pour réinitialiser la conversation actuelle
  const resetCurrentConversation = () => {
    console.log('🔄 Réinitialisation de la conversation pour:', currentAssistant);
    setMessages([]);
    setConversationStarted(false);
    setInputText('');
    setCurrentConversationId(null);
    
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
      onResetRequest.current = (forceNew = false) => {
        console.log('🔄 Reset conversation with forceNew:', forceNew);
        resetCurrentConversation();
        setForceNewConversation(forceNew);
      };
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

      // Sauvegarder automatiquement si pas en mode privé
      if (!isPrivateMode && conversationStarted) {
        const timeoutId = setTimeout(() => {
          saveCurrentConversation();
        }, 2000); // Attendre 2 secondes après la dernière modification

        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, currentChat?.name, isPrivateMode, conversationStarted]);

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
    if (!inputText.trim() || isAITyping) return;

    // Vérifier si on peut envoyer le message en mode privé
    if (!handleNewPrivateConversation()) {
      return; // L'utilisateur a annulé
    }

    const currentInput = inputText.trim();
    setInputText('');
    
    // Fermer le clavier immédiatement après l'envoi
    Keyboard.dismiss();
    textInputRef.current?.blur();

    // Si c'est le premier message, faire disparaître l'orbe et initialiser la conversation
    if (!conversationStarted) {
      setConversationStarted(true);
      
      // Ajouter le message de bienvenue de l'assistant s'il existe
      if (currentChat?.welcomeMessage && currentChat.welcomeMessage.trim()) {
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
      console.log('🚀 Démarrage streaming optimisé avec modèle:', currentChat?.model || DEFAULT_GPT5_MODEL);
      console.log('🕵️ Mode privé actif:', isPrivateMode);

      // Optionnel: activer la recherche web si demandé ou si l'utilisateur a saisi /chercher
      let webContext: string | null = null;
      const isExplicitSearch = currentInput.trim().startsWith('/chercher ');
      const willSearch = webSearchEnabled || isExplicitSearch;
      if (willSearch) {
        try {
          console.log('🔎 Appel Perplexity (proxy) – enabled:', webSearchEnabled, 'explicit:', isExplicitSearch);
          // Animation éphémère "Recherche en cours"
          const webMsgId = (Date.now() + 3).toString();
          const webEphemeral: Message = {
            id: webMsgId,
            text: 'Recherche en cours… • 0s\n\nNous recherchons sur Internet pour vous, veuillez patienter',
            isUser: false,
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            streaming: true,
            ephemeral: true,
          };
          setMessages(prev => [...prev, webEphemeral]);
          setWebSeconds(0);
          if (webTimerRef.current) clearInterval(webTimerRef.current);
          webTimerRef.current = setInterval(() => {
            setWebSeconds(prev => {
              const next = prev + 1;
              const dots = '.'.repeat((next % 3) + 1);
              setMessages(m => m.map(msg => msg.id === webMsgId ? { ...msg, text: `Recherche en cours… • ${next}s\n\nNous recherchons sur Internet pour vous, veuillez patienter${dots}` } : msg));
              return next;
            });
          }, 1000) as unknown as number;
          const query = isExplicitSearch ? currentInput.replace(/^\/chercher\s+/i, '') : currentInput;
          const resp = await perplexitySearch(query, { web_search_options: { search_context_size: 'low' } });
          console.log('🔎 Perplexity OK – sources:', (resp.search_results || []).length);
          webContext = buildWebContextMarkdown(resp);
          // Attacher les sources à ce message assistant en cours
          setWebSourcesByMessageId(prev => ({ ...prev, [assistantMessageId]: resp.search_results || [] }));
          console.log('🔎 Sources attachées au message:', assistantMessageId);
          // Nettoyage animation recherche
          if (webTimerRef.current) { clearInterval(webTimerRef.current); webTimerRef.current = null; }
          setMessages(prev => prev.filter(m => !(m.ephemeral)));
        } catch (e: any) {
          console.warn('⚠️ Recherche web impossible:', e?.message || e);
          // Surface visuelle dans le message assistant si l'appel échoue
          updateStreamingMessage(assistantMessageId, `\n\n> Recherche web indisponible: ${e?.message || 'erreur inconnue'}.\n`);
          if (webTimerRef.current) { clearInterval(webTimerRef.current); webTimerRef.current = null; }
          setMessages(prev => prev.filter(m => !(m.ephemeral)));
        }
      }

      // Si raisonnement haut: afficher une animation éphémère avec timer
      let reasoningMsgId: string | null = null;
      if (reasoningEffort === 'high' && !reasoningDisabled) {
        reasoningMsgId = (Date.now() + 2).toString();
        const ephemeral: Message = {
          id: reasoningMsgId,
          text: 'Réflexion en cours… • 0s',
          isUser: false,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          streaming: true,
          ephemeral: true,
        };
        setMessages(prev => [...prev, ephemeral]);
        setReasoningSeconds(0);
        if (reasoningTimerRef.current) clearInterval(reasoningTimerRef.current);
        reasoningTimerRef.current = setInterval(() => {
          setReasoningSeconds(prev => {
            const next = prev + 1;
            let label = 'Réflexion en cours…';
            if (next >= 15) label = 'Préparation de votre réponse…';
            else if (next >= 10) label = 'Analyse approfondie…';
            else if (next >= 5) label = 'Analyse de votre demande…';
            setMessages(m => m.map(msg => msg.id === reasoningMsgId ? { ...msg, text: `${label} • ${next}s` } : msg));
            return next;
          });
        }, 1000) as unknown as number;
      }

      // Construire l'historique des messages pour OpenAI
      const openAIMessages: ChatMessage[] = [
        // System prompt avec les vraies instructions de l'assistant
        {
          role: 'system',
          content: (
            (currentChat?.content || currentChat?.instructions || 'Tu es un assistant IA utile.')
            + (webContext ? ('\n\n' + webContext) : '')
          )
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
          // Nettoyer l'animation de raisonnement si présente
          if (reasoningTimerRef.current) {
            clearInterval(reasoningTimerRef.current);
            reasoningTimerRef.current = null;
          }
          setMessages(prev => prev.filter(m => !m.ephemeral));
          
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
          if (reasoningTimerRef.current) {
            clearInterval(reasoningTimerRef.current);
            reasoningTimerRef.current = null;
          }
          setMessages(prev => prev.filter(m => !m.ephemeral));
          
          setIsAITyping(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
          
          Alert.alert('Erreur', 'Impossible d\'envoyer le message. Vérifiez votre connexion.');
        }
      };

      // Si raisonnement élevé: certains environnements RN ne streament pas les deltas -> utiliser chat.completions non-stream (comme web)
      if (reasoningEffort === 'high' && !reasoningDisabled) {
        console.log('🧠 Mode raisonnement élevé: Responses non-stream');
        // Renforcer le message système pour forcer une sortie textuelle
        openAIMessages[0] = {
          role: 'system',
          content: ((currentChat?.content || currentChat?.instructions || 'Tu es un assistant IA utile.')
            + (webContext ? ('\n\n' + webContext) : '')
            + '\n\nConsigne: fournis une réponse finale textuelle claire et complète, sans outils ni appels externes.').slice(0, 12000)
        };

        const final = await sendMessageToOpenAINonStreamingResponses(
          openAIMessages,
          (currentChat?.model || DEFAULT_GPT5_MODEL),
          reasoningEffort,
          { maxOutputTokens: 2048 }
        );
        console.log('🧠 Réponse non-stream longueur:', final?.length || 0, 'aperçu:', (final || '').slice(0, 120));
        finalizeStreamingMessage(assistantMessageId, final || '');
        if (reasoningTimerRef.current) { clearInterval(reasoningTimerRef.current); reasoningTimerRef.current = null; }
        setMessages(prev => prev.filter(m => !m.ephemeral));
        setIsAITyping(false);
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      } else {
        // Démarrer le streaming avec AbortController
        await sendMessageToOpenAIStreamingResponses(
          openAIMessages,
          streamingCallbacks,
          (currentChat?.model || DEFAULT_GPT5_MODEL),
          reasoningDisabled ? 'low' : reasoningEffort,
          abortControllerRef.current,
          { maxOutputTokens: 1000 }
        );
      }

      // Désactiver la recherche web et revenir en raisonnement bas après l'envoi
      if (webSearchEnabled) setWebSearchEnabled(false);
      if (reasoningEffort === 'high') setReasoningEffort('low');

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
                lineHeight: 24,
                letterSpacing: 0.1,
              },
              paragraph: {
                marginTop: 0,
                marginBottom: 8,
                color: theme.text.primary,
              },
              heading1: {
                fontSize: 24,
                fontWeight: '700',
                marginTop: 8,
                marginBottom: 8,
                color: theme.text.primary,
              },
              heading2: {
                fontSize: 20,
                fontWeight: '700',
                marginTop: 8,
                marginBottom: 6,
                color: theme.text.primary,
              },
              heading3: {
                fontSize: 18,
                fontWeight: '600',
                marginTop: 6,
                marginBottom: 4,
                color: theme.text.primary,
              },
              bullet_list: {
                marginVertical: 6,
              },
              ordered_list: {
                marginVertical: 6,
              },
              list_item: {
                marginVertical: 2,
              },
              blockquote: {
                borderLeftWidth: 3,
                borderLeftColor: theme.borders.primary,
                paddingLeft: 10,
                marginVertical: 8,
                opacity: 0.9,
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
                backgroundColor: isDark ? '#0f1117' : '#f3f4f6',
                color: isDark ? '#e5e7eb' : '#111827',
                paddingHorizontal: 6,
                paddingVertical: 3,
                borderRadius: 6,
                fontFamily: codeFontFamily || 'monospace',
              },
              code_block: {
                backgroundColor: isDark ? '#0f1117' : '#f3f4f6',
                color: isDark ? '#e5e7eb' : '#111827',
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.borders.primary,
                fontFamily: codeFontFamily || 'monospace',
                overflow: 'hidden',
              },
              link: {
                color: '#60a5fa',
                textDecorationLine: 'underline',
              }
            }} rules={markdownRules}>
              {formatForMarkdown(item.text) + (item.streaming ? ' ▊' : '')}
            </Markdown>
          </View>
        )}

      </View>
      
      {/* Sources Perplexity: afficher les URL cliquables */}
      {!item.isUser && !item.streaming && webSourcesByMessageId[item.id] && webSourcesByMessageId[item.id].length > 0 && (
        <View style={styles.sourcesList}>
          <Text style={[styles.sourcesTitle, { color: theme.text.secondary }]}>Sources</Text>
          {webSourcesByMessageId[item.id].slice(0, 8).map((s, idx) => (
            <TouchableOpacity
              key={`${item.id}-src-${idx}`}
              style={styles.sourceRow}
              onPress={() => s.url && Linking.openURL(s.url)}
            >
              <Text style={styles.sourceIndex}>[{idx + 1}] </Text>
              <Text
                style={styles.sourceLink}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {s.url || s.title || 'Lien'}
              </Text>
            </TouchableOpacity>
          ))}
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
          <View style={[styles.sheet, { backgroundColor: theme.backgrounds.tertiary, borderColor: theme.borders.primary }]}>
            <Text style={[styles.sheetTitle, { color: theme.text.primary }]}>Outils</Text>
            {false && (
              <TouchableOpacity style={[
                  styles.sheetItemFull,
                  { backgroundColor: theme.backgrounds.primary },
                  pressedItem === 'doc' && styles.sheetItemPressed
                ]}
                onPressIn={() => setPressedItem('doc')}
                onPressOut={() => setPressedItem(null)}
                onPress={() => {}}
              >
                <Text style={styles.sheetIcon}>📄</Text>
                <Text style={[styles.sheetLabel, { color: theme.text.primary }]}>Ajouter document</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[
                styles.sheetItemFull,
                { backgroundColor: theme.backgrounds.primary },
                pressedItem === 'photo' && styles.sheetItemPressed
              ]}
              onPressIn={() => setPressedItem('photo')}
              onPressOut={() => setPressedItem(null)}
              onPress={() => { Alert.alert('Image', 'Sélection d\'image à venir'); setShowToolbar(false); }}
            >
              <ImageIcon size={18} />
              <Text style={[styles.sheetLabel, { color: theme.text.primary }]}>Ajouter photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[
                styles.sheetItemFull,
                { backgroundColor: theme.backgrounds.primary },
                pressedItem === 'web' && styles.sheetItemPressed
              ]}
              onPressIn={() => setPressedItem('web')}
              onPressOut={() => setPressedItem(null)}
              onPress={() => {
                setWebSearchEnabled(prev => {
                  const next = !prev;
                  if (next) setReasoningEffort('low'); // exclusivité: activer web => désactiver raisonnement
                  return next;
                });
                setShowToolbar(false);
              }}
            >
              <Text style={styles.sheetIcon}>🔎</Text>
              <Text style={[styles.sheetLabel, { color: theme.text.primary }]}>Recherche web: {webSearchEnabled ? 'activée' : 'désactivée'}</Text>
            </TouchableOpacity>

            {/* Raisonnement désactivé visuellement */}
            {false && (
              <TouchableOpacity style={[
                  styles.sheetItemFull,
                  { backgroundColor: theme.backgrounds.primary },
                  pressedItem === 'brain' && styles.sheetItemPressed
                ]}
                onPressIn={() => setPressedItem('brain')}
                onPressOut={() => setPressedItem(null)}
                onPress={() => {}}
              >
                <Text style={styles.sheetIcon}>🧠</Text>
                <Text style={[styles.sheetLabel, { color: theme.text.primary }]}>Raisonnement: désactivé</Text>
              </TouchableOpacity>
            )}

            {false && (
              <TouchableOpacity style={[
                  styles.sheetItemFull,
                  { backgroundColor: theme.backgrounds.primary, justifyContent: 'space-between' },
                  pressedItem === 'private' && styles.sheetItemPressed
                ]}
                onPressIn={() => setPressedItem('private')}
                onPressOut={() => setPressedItem(null)}
                onPress={() => {}}
              >
                <Text style={[styles.sheetLabel, { color: theme.text.primary }]}>Conversation privée</Text>
                <View style={[styles.switchBase, { borderColor: theme.borders.primary, backgroundColor: isPrivateMode ? (isDark ? '#4A5568' : '#E2E8F0') : 'transparent' }]}> 
                  <View style={[styles.switchKnob, { alignSelf: isPrivateMode ? 'flex-end' : 'flex-start' }]} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Barre d'état des options actives (au-dessus du champ) */}
        {(webSearchEnabled || (!reasoningDisabled && reasoningEffort === 'high') || isPrivateMode) && (
          <View style={styles.activeBar}>
            {webSearchEnabled && (
              <View style={styles.activePill}><Text style={styles.activePillText}>Rechercher</Text></View>
            )}
            {!reasoningDisabled && reasoningEffort === 'high' && (
              <View style={styles.activePill}><Text style={styles.activePillText}>Raisonnement</Text></View>
            )}
            {isPrivateMode && (
              <View style={styles.activePill}><Text style={styles.activePillText}>Privé</Text></View>
            )}
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
          {/* Boutons cerveau/incognito déplacés dans le sheet */}
          
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

        {/* Indicateur mode privé */}
        {isPrivateMode && (
          <View style={[styles.privateModeIndicator, { backgroundColor: theme.backgrounds.tertiary }]}>
            <Text style={[styles.privateModeText, { color: theme.text.secondary }]}>
              🕵️ Mode navigation privée actif - Cette conversation ne sera pas sauvegardée
            </Text>
          </View>
        )}
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
    maxWidth: '96%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userMessageBubble: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: '78%',
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
  activeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  activePill: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 56,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    zIndex: 5,
  },
  sheetTitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 6,
  },
  sheetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sheetItem: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetItemFull: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sheetIcon: {
    fontSize: 16,
  },
  sheetLabel: {
    fontSize: 14,
  },
  sheetItemPressed: {
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  switchBase: {
    width: 42,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#9CA3AF',
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
  privateModeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  privateModeIcon: {
    fontSize: 16,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  privateModeIndicator: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  privateModeText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
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
  sourceChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 6,
  },
  sourceChipText: {
    color: '#ffffff',
    fontSize: 12,
  },
  sourcesList: {
    marginTop: 6,
    paddingRight: 8,
  },
  sourcesTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.7,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceIndex: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  sourceLink: {
    color: '#60a5fa',
    fontSize: 12,
    textDecorationLine: 'underline',
    flexShrink: 1,
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
  activeTag: {
    height: 24,
    minWidth: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  activeTagText: {
    color: '#ffffff',
    fontSize: 12,
  },
}); 