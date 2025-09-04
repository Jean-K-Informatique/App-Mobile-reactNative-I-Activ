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
  ActionSheetIOS,
  Image
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
import { localStorageService, type LocalMessage } from '../../services/localStorageService';

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
  
  // État pour la prévisualisation d'image
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Refs pour la gestion du streaming optimisé
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<number | null>(null);

  // Refs pour le système machine à écrire EXACT du ChatIA
  const typewriterTimerRef = useRef<number | null>(null);
  const typewriterQueueRef = useRef<string>('');
  const streamingTextRef = useRef<string>('');
  const updateTimeoutRef = useRef<number | null>(null);
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

  // Chargement initial avec conservation locale
  useEffect(() => {
    const loadSavedConversation = async () => {
      try {
        const savedMessages = await localStorageService.loadConversation('cuisine');
        
        if (savedMessages.length > 0) {
          // Convertir LocalMessage vers Message
          const convertedMessages: Message[] = savedMessages.map(msg => ({
            id: msg.id,
            text: msg.text,
            isUser: msg.isUser,
            timestamp: msg.timestamp
          }));
          setMessages(convertedMessages);
        } else {
          // Pas de conversation sauvée, créer message d'accueil
          const welcomeMessage = getWelcomeMessage();
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('Erreur chargement conversation cuisine:', error);
        // Fallback sur message d'accueil
        const welcomeMessage = getWelcomeMessage();
        setMessages([welcomeMessage]);
      }
    };

    loadSavedConversation();
  }, []); // Chargement unique au montage

  // Prompt spécialisé cuisine
  const getSystemPrompt = (): string => {
    return 'Tu es un chef cuisinier expert. Aide avec les recettes et conseils culinaires. Utilise des émojis 🍳';
  };

  // Sauvegarde automatique des messages
  useEffect(() => {
    const saveConversation = async () => {
      if (messages.length > 0) {
        // Convertir Message vers LocalMessage
        const localMessages: LocalMessage[] = messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: msg.timestamp
        }));
        
        const success = await localStorageService.saveConversation('cuisine', localMessages);
        if (!success) {
          console.warn('Impossible de sauvegarder la conversation cuisine');
        }
      }
    };

    // Délai pour éviter les sauvegardes trop fréquentes pendant le streaming
    const timeoutId = setTimeout(saveConversation, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Gestion du nouveau chat avec confirmation et nettoyage local
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
              // Nettoyer la conversation locale
              await localStorageService.clearConversation('cuisine');
              
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
      await localStorageService.clearConversation('cuisine');
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
      }, 10);

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
    console.log('📤 Cuisine - sendMessage appelée - inputText:', inputText.trim(), 'selectedImageBase64:', !!selectedImageBase64, 'isAITyping:', isAITyping);
    
    if ((!inputText.trim() && !selectedImageBase64) || isAITyping) {
      console.log('❌ Cuisine - Conditions non remplies pour envoyer un message');
      return;
    }

    // Si une image est sélectionnée, envoyer avec l'image
    if (selectedImageBase64) {
      console.log('📷 Cuisine - Envoi avec image détecté');
      const currentInput = inputText.trim();
      setInputText('');
      removeSelectedImage();
      await sendMessageWithImage(currentInput, selectedImageBase64);
      return;
    }

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

    // Vérifier les limites de stockage avant d'ajouter plus de contenu
    await localStorageService.checkAndWarnIfNeeded('cuisine');

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

  const pickAndSelectImage = useCallback(async () => {
    const runWithBase64AndUri = async (base64: string, uri: string) => {
      setSelectedImageBase64(base64);
      setSelectedImageUri(uri);
      console.log('📷 Image sélectionnée (cuisine), prête pour envoi');
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
                if (!result.canceled && result.assets?.[0]?.base64 && result.assets?.[0]?.uri) {
                  await runWithBase64AndUri(result.assets[0].base64 as string, result.assets[0].uri);
                }
              }, 150);
            } else if (buttonIndex === 2) {
              setTimeout(async () => {
                const camPerm = await ImagePicker.requestCameraPermissionsAsync();
                if (camPerm.status !== 'granted') { Alert.alert('Permission requise', 'Autorisez l’accès à la caméra.'); return; }
                const result = await ImagePicker.launchCameraAsync({ quality: 0.85, base64: true });
                if (!result.canceled && result.assets?.[0]?.base64 && result.assets?.[0]?.uri) {
                  await runWithBase64AndUri(result.assets[0].base64 as string, result.assets[0].uri);
                }
              }, 150);
            }
          }
        );
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libPerm.status !== 'granted') { Alert.alert('Permission requise', "Autorisez l'accès aux photos."); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, base64: true });
        if (!result.canceled && result.assets?.[0]?.base64 && result.assets?.[0]?.uri) {
          await runWithBase64AndUri(result.assets[0].base64 as string, result.assets[0].uri);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec de sélection de la photo.');
    }
  }, []);

  // Fonction pour supprimer l'image sélectionnée
  const removeSelectedImage = useCallback(() => {
    console.log('🗑️ Suppression image sélectionnée');
    setSelectedImageBase64(null);
    setSelectedImageUri(null);
  }, []);

  // Fonction pour envoyer un message avec image
  const sendMessageWithImage = async (message: string, imageBase64: string) => {
    console.log('🚀 Cuisine - sendMessageWithImage appelée avec message:', message, 'imageBase64 length:', imageBase64.length);
    
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      text: '',
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    console.log('📝 Cuisine - Ajout des messages dans l\'interface');
    setMessages(prev => [...prev, 
      { 
        id: `user-${Date.now()}`, 
        text: `${message}\n\n📷 [Image jointe]`, 
        isUser: true, 
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
      }, 
      assistantMessage
    ]);

    abortControllerRef.current = new AbortController();

    console.log('🤖 Cuisine - Début analyse image avec OpenAI');
    try {
      await analyzeImageWithOpenAIStreaming(
        imageBase64,
        message || "Voici une photo d'ingrédients. Décris-les et propose 3 recettes simples et 2 recettes créatives possibles avec instructions et quantités.",
        {
          onChunk: (chunk: string) => {
            // Streaming direct comme ChatInterface pour de meilleures performances
            setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, text: msg.text + chunk } : msg));
          },
          onComplete: (full: string) => {
            console.log('✅ Cuisine - Vision analyse terminée, texte complet:', full.length, 'caractères');
            // Le streaming direct a déjà mis à jour le texte, on s'assure juste que c'est complet
            setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, text: full } : msg));
          },
          onError: (error) => {
            console.error('❌ Cuisine - Vision onError:', error);
            setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, text: 'Impossible d\'analyser l\'image.' } : msg));
          }
        },
        DEFAULT_GPT5_MODEL,
        abortControllerRef.current
      );
    } catch (error) {
      console.error('❌ Cuisine - Erreur dans analyzeImageWithOpenAIStreaming:', error);
      setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, text: 'Erreur lors de l\'analyse de l\'image.' } : msg));
    }
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

          {/* Prévisualisation d'image sélectionnée */}
          {(() => {
            // Logs seulement quand il y a un changement significatif
            if (selectedImageUri || selectedImageBase64) {
              console.log('🔍 Cuisine - Image state - selectedImageUri:', !!selectedImageUri, 'selectedImageBase64:', !!selectedImageBase64);
            }
            return null;
          })()}
          {selectedImageUri && (
            <View style={[styles.imagePreviewContainer, { backgroundColor: theme.backgrounds.primary }]}>
              <View style={styles.imagePreviewContent}>
                <Image 
                  source={{ uri: selectedImageUri }} 
                  style={styles.imagePreview} 
                  resizeMode="cover"
                  onLoad={() => console.log('🖼️ Cuisine - Image chargée avec succès')}
                  onError={(error: any) => console.log('❌ Cuisine - Erreur chargement image:', error)}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeSelectedImage}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.imagePreviewLabel, { color: theme.text.secondary }]}>
                📷 Image prête à envoyer
              </Text>
            </View>
          )}

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
                onPress={pickAndSelectImage}
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
                placeholder="Ecrivez votre message..."
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
                    opacity: ((!inputText.trim() && !selectedImageBase64) && !isAITyping) ? 0.5 : 1
                  }
                ]}
                onPress={isAITyping ? stopGeneration : sendMessage}
                disabled={(!inputText.trim() && !selectedImageBase64) && !isAITyping}
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  // Styles pour la prévisualisation d'image
  imagePreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  imagePreviewContent: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  imagePreviewLabel: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
});
