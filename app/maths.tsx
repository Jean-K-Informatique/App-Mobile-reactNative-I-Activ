import React, { useState, useRef, memo, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, TouchableWithoutFeedback, Keyboard, Animated, Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer, useSuckNavigator } from '../components/ScreenTransition';
import { useTheme } from '../contexts/ThemeContext';
import { sendMessageToOpenAIStreamingResponses, DEFAULT_GPT5_MODEL, type StreamingCallbacks } from '../services/openaiService';
import { WidgetsIcon, SendIcon } from '../components/icons/SvgIcons';
import Markdown from 'react-native-markdown-display';
import { localStorageService, type LocalMessage } from '../services/localStorageService';

const { width } = Dimensions.get('window');

type ModeType = 'assistant' | 'pourcentage' | 'volume' | 'salaire';

// Type pour les messages de chat
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  streaming?: boolean;
}

interface ModeConfig {
  id: ModeType;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string[];
}

const MODES: ModeConfig[] = [
  {
    id: 'assistant',
    title: 'Chat Math',
    subtitle: 'Assistant conversationnel IA',
    icon: '🧮',
    gradient: ['#10b981', '#059669']
  },
  {
    id: 'pourcentage',
    title: 'Pourcentage',
    subtitle: 'Calculs de pourcentages rapides',
    icon: '%',
    gradient: ['#f093fb', '#f5576c']
  },
  {
    id: 'volume',
    title: 'Volume',
    subtitle: 'Volumes et conversions',
    icon: '📦',
    gradient: ['#4facfe', '#00f2fe']
  },
  {
    id: 'salaire',
    title: 'Brut→Net',
    subtitle: 'Calcul salaire français',
    icon: '💰',
    gradient: ['#43e97b', '#38f9d7']
  }
];

function MathsScreen() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();
  const [selectedMode, setSelectedMode] = useState<ModeType>('assistant');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  
  // États pour les différents modes
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [percentageValue, setPercentageValue] = useState('');
  const [percentageOf, setPercentageOf] = useState('');
  const [volumeLength, setVolumeLength] = useState('');
  const [volumeWidth, setVolumeWidth] = useState('');
  const [volumeHeight, setVolumeHeight] = useState('');
  const [salaireBrut, setSalaireBrut] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const resetAllInputs = () => {
    setAssistantQuestion('');
    setPercentageValue('');
    setPercentageOf('');
    setVolumeLength('');
    setVolumeWidth('');
    setVolumeHeight('');
    setSalaireBrut('');
    setResult('');
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
  };

  const selectMode = (mode: ModeType) => {
    setSelectedMode(mode);
    resetAllInputs();
  };

  // États pour l'assistant conversationnel
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Refs pour le streaming optimisé - EXACT Cuisine  
  const streamingTextRef = useRef<string>('');
  const updateTimeoutRef = useRef<any>(null);

  const animateResult = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Message d'accueil pour l'assistant
  const getWelcomeMessage = useCallback((): Message => {
    return {
      id: `welcome-${Date.now()}`,
      text: `🧮 Bonjour ! Je suis votre **assistant mathématiques**.

Posez-moi vos questions mathématiques : équations, calculs, géométrie, probabilités, analyse... Je résous et j'explique étape par étape !`,
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  }, []);

  // Charger la conversation sauvegardée au démarrage (comme cuisine.tsx)
  useEffect(() => {
    if (selectedMode === 'assistant') {
      const loadSavedConversation = async () => {
        try {
          const savedMessages = await localStorageService.loadConversation('maths');
          
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
            // Pas de conversation sauvegardée, message d'accueil
            setMessages([getWelcomeMessage()]);
          }
        } catch (error) {
          console.error('Erreur chargement conversation math:', error);
          // En cas d'erreur, message d'accueil par défaut
          setMessages([getWelcomeMessage()]);
        }
      };
      
      loadSavedConversation();
    }
  }, [selectedMode, getWelcomeMessage]);

  // Auto-scroll lors de nouveaux messages
  useEffect(() => {
    if (messages.length > 0 && selectedMode === 'assistant') {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, selectedMode]);

  // Sauvegarde automatique des messages (comme cuisine.tsx)
  useEffect(() => {
    if (selectedMode === 'assistant' && messages.length > 0) {
      const saveConversation = async () => {
        try {
          // Convertir Message vers LocalMessage
          const localMessages: LocalMessage[] = messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            isUser: msg.isUser,
            timestamp: msg.timestamp
          }));
          
          const success = await localStorageService.saveConversation('maths', localMessages);
          if (!success) {
            console.warn('Impossible de sauvegarder la conversation maths');
          }
        } catch (error) {
          console.error('Erreur sauvegarde conversation math:', error);
        }
      };

      // Délai pour éviter les sauvegardes trop fréquentes pendant le streaming
      const timeoutId = setTimeout(saveConversation, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, selectedMode]);

  // Fonction de mise à jour optimisée - EXACT Cuisine
  const updateStreamingMessage = useCallback((messageId: string, chunk: string) => {
    streamingTextRef.current += chunk;
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? { ...msg, text: streamingTextRef.current }
            : msg
        )
      );
    }, 12); // 12ms pour fluidité maximale
  }, []);

  // Fonction de finalisation - EXACT Cuisine
  const finalizeStreamingMessage = useCallback((messageId: string, finalText: string) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, text: finalText, streaming: false }
          : msg
      )
    );
    setIsAITyping(false);
    
    // Nettoyer les refs
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    streamingTextRef.current = '';
  }, []);

  // Gestion du nouveau chat avec confirmation (comme les autres assistants)
  const handleNewChat = useCallback(() => {
    if (messages.length > 1) { // Plus que le message d'accueil
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
              // Arrêter la génération en cours
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                setIsAITyping(false);
                abortControllerRef.current = null;
              }
              
              // Nettoyer SEULEMENT la conversation math (pas les autres widgets)
              await localStorageService.clearConversation('maths');
              
              // Reset avec nouveau message d'accueil
              const welcomeMessage = getWelcomeMessage();
              setMessages([welcomeMessage]);
              setInputText('');
              
              // Nettoyer les refs de streaming
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }
              streamingTextRef.current = '';
            }
          }
        ]
      );
    }
  }, [messages.length, getWelcomeMessage]);

  // Fonction d'envoi de message (IDENTIQUE aux assistants qui marchent)
  const sendMessage = async () => {
    console.log('📤 Math - sendMessage appelée - inputText:', inputText.trim(), 'isAITyping:', isAITyping);
    
    if (!inputText.trim() || isAITyping) {
      console.log('❌ Math - Conditions non remplies pour envoyer un message');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    // Créer un message assistant vide pour le streaming - EXACT Cuisine
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      text: '',
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      streaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputText('');
    setIsAITyping(true);

    // Prompt spécialisé mathématiques
    const getSystemPrompt = () => `Tu es un assistant mathématiques expert et pédagogue. 

RÔLE : Aider avec tous types de problèmes mathématiques.

SPÉCIALITÉS :
- Arithmétique et algèbre
- Géométrie et trigonométrie  
- Calcul différentiel et intégral
- Statistiques et probabilités
- Mathématiques financières
- Physique mathématique

MÉTHODE :
1. **Comprendre** le problème posé
2. **Expliquer** la méthode étape par étape
3. **Calculer** avec précision
4. **Vérifier** le résultat
5. **Contextualiser** si pertinent

STYLE :
- Explications claires et structurées
- Étapes numérotées
- Utilise des exemples concrets
- Formate avec **gras** pour les points clés
- Reste bienveillant et encourageant

Réponds en français, sois précis et pédagogue !`;

    // Réinitialiser la ref de streaming pour ce nouveau message - EXACT Cuisine
    streamingTextRef.current = '';
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    // Créer AbortController pour pouvoir arrêter le streaming
    abortControllerRef.current = new AbortController();

    // Enhanced onChunk qui nettoie l'animation et lance le vrai streaming
    const enhancedOnChunk = (chunk: string) => {
      updateStreamingMessage(assistantMessageId, chunk);
    };

    const streamingCallbacks: StreamingCallbacks = {
      onChunk: enhancedOnChunk,
      onComplete: (fullResponse: string) => {
        console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
        
        // Finaliser le message avec le texte complet - EXACT du Cuisine
        finalizeStreamingMessage(assistantMessageId, fullResponse);
        
        abortControllerRef.current = null;
      },
      onError: (error: Error) => {
        console.error('❌ Erreur streaming:', error);
        
        // Vérifier si c'est un arrêt volontaire - EXACT du Cuisine
        if (error.message === 'RESPONSE_STOPPED') {
          console.log('⏹️ Génération arrêtée par l\'utilisateur');
          return;
        }
        
        // Gérer l'erreur avec la fonction optimisée
        const errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer.';
        finalizeStreamingMessage(assistantMessageId, errorMessage);
        
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

  // Arrêter la génération IA
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAITyping(false);
      abortControllerRef.current = null;
    }
  };

  // Gestion du clavier
  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Enter') {
      sendMessage();
    }
  };

  const runAssistant = async () => {
    // Fonction conservée pour compatibilité mais ne fait plus rien
    // L'assistant est maintenant intégré directement
  };

  const calcPourcentage = () => {
    const value = parseFloat(percentageValue.replace(',', '.'));
    const total = parseFloat(percentageOf.replace(',', '.'));
    
    if (!isFinite(value) || !isFinite(total) || total === 0) {
      setResult('⚠️ Veuillez saisir des nombres valides');
      animateResult();
      return;
    }
    
    const percentage = (value / total) * 100;
    const percentageAmount = (percentage * total) / 100;
    const remainder = total - value;
    const remainderPercent = (remainder / total) * 100;
    
    // Calculs additionnels utiles
    const doubleValue = value * 2;
    const halfValue = value / 2;
    
    setResult(`🧮 **Analyse Complète des Pourcentages**

📊 **Résultat Principal**
**${value}** représente **${percentage.toFixed(2)}%** de **${total}**

🔍 **Détails du Calcul**
• Formule : (${value} ÷ ${total}) × 100
• Calcul : ${(value/total).toFixed(4)} × 100 = ${percentage.toFixed(2)}%

✅ **Vérification**
${percentage.toFixed(2)}% de ${total} = ${percentageAmount.toFixed(2)}

📈 **Informations Complémentaires**
• Reste : ${remainder} (soit ${remainderPercent.toFixed(2)}%)
• Double valeur : ${doubleValue} = ${((doubleValue/total)*100).toFixed(2)}%
• Moitié valeur : ${halfValue} = ${((halfValue/total)*100).toFixed(2)}%

💡 **Applications Pratiques**
• Si c'est une remise : vous économisez ${percentage.toFixed(2)}%
• Si c'est une note : vous avez ${percentage.toFixed(2)}/100
• Si c'est une progression : +${percentage.toFixed(2)}% d'augmentation`);
    animateResult();
  };

  const calcVolume = () => {
    const l = parseFloat(volumeLength.replace(',', '.'));
    const w = parseFloat(volumeWidth.replace(',', '.'));
    const h = parseFloat(volumeHeight.replace(',', '.'));
    
    if (!isFinite(l) || !isFinite(w) || !isFinite(h) || l <= 0 || w <= 0 || h <= 0) {
      setResult('⚠️ Veuillez saisir des dimensions valides (supérieures à 0)');
      animateResult();
      return;
    }
    
    const volume = l * w * h;
    const volumeL = volume / 1000; // cm³ vers litres
    
    setResult(`📦 **Calcul de volume**

**Dimensions:** ${l} × ${w} × ${h} cm

**Résultats:**
• **Volume:** ${volume.toLocaleString()} cm³
• **En litres:** ${volumeL.toFixed(3)} L
• **En mètres cubes:** ${(volume / 1000000).toFixed(6)} m³

**Formule:** Longueur × Largeur × Hauteur`);
    animateResult();
  };

  const calcSalaire = () => {
    const brut = parseFloat(salaireBrut.replace(',', '.'));
    
    if (!isFinite(brut) || brut <= 0) {
      setResult('⚠️ Veuillez saisir un salaire brut valide');
      animateResult();
      return;
    }
    
    // Calculs simplifiés pour la France (approximation)
    const cotisationsSalariales = brut * 0.22; // Environ 22%
    const net = brut - cotisationsSalariales;
    const netApresImpots = net * 0.87; // Estimation après prélèvement à la source
    
    setResult(`💰 **Conversion Brut → Net (France)**

**Salaire brut:** ${brut.toLocaleString()} €

**Déductions estimées:**
• Cotisations salariales (~22%): -${cotisationsSalariales.toFixed(2)} €

**Résultats:**
• **Net avant impôts:** ${net.toFixed(2)} €
• **Net après impôts (estim.):** ${netApresImpots.toFixed(2)} €

*⚠️ Estimation indicative - Consultez un expert comptable pour un calcul précis*`);
    animateResult();
  };

  const executeCalculation = () => {
    switch (selectedMode) {
      case 'assistant':
        runAssistant();
        break;
      case 'pourcentage':
        calcPourcentage();
        break;
      case 'volume':
        calcVolume();
        break;
      case 'salaire':
        calcSalaire();
        break;
    }
  };

  const canCalculate = () => {
    switch (selectedMode) {
      case 'assistant':
        return assistantQuestion.trim().length > 0;
      case 'pourcentage':
        return percentageValue.trim().length > 0 && percentageOf.trim().length > 0;
      case 'volume':
        return volumeLength.trim().length > 0 && volumeWidth.trim().length > 0 && volumeHeight.trim().length > 0;
      case 'salaire':
        return salaireBrut.trim().length > 0;
      default:
        return false;
    }
  };

  const Header = () => (
    <View style={styles.header}> 
      <View style={styles.headerLeft}>
        <LinearGradient
          colors={isDark ? ['#43e97b', '#38f9d7'] : ['#10b981', '#34d399']}
          style={styles.titleGradient}
          start={[0, 0]}
          end={[1, 0]}
        >
          <Text style={styles.headerTitle}>Calculatrice IA</Text>
        </LinearGradient>
        <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>
          Assistant mathématiques intelligent
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        {/* Bouton Nouveau (seulement pour l'assistant) */}
        {selectedMode === 'assistant' && (
          <TouchableOpacity 
            onPress={handleNewChat}
            style={styles.actionButton}
          >
            <Text style={[styles.actionButtonText, { color: theme.text.primary }]}>
              +
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Bouton Widgets */}
        <TouchableOpacity 
          onPress={() => suckTo('/widgets', { replace: true })} 
          style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <WidgetsIcon size={20} color={theme.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ModeNavigationTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {MODES.map((mode) => (
        <TouchableOpacity
          key={mode.id}
          onPress={() => selectMode(mode.id)}
          style={[
            styles.tabButton,
            selectedMode === mode.id && styles.activeTabButton
          ]}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={selectedMode === mode.id ? mode.gradient as any : ['transparent', 'transparent']}
            style={[
              styles.tabButtonGradient,
              selectedMode !== mode.id && { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
              }
            ]}
            start={[0, 0]}
            end={[1, 0]}
          >
            <Text style={styles.tabIcon}>{mode.icon}</Text>
            <Text style={[
              styles.tabTitle,
              { 
                color: selectedMode === mode.id 
                  ? '#ffffff' 
                  : theme.text.primary 
              }
            ]}>
              {mode.title}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );


  // Rendu d'un message
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <View style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          item.isUser 
            ? [styles.userMessage, { backgroundColor: isDark ? '#10b981' : '#059669' }]
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

  const renderAssistantForm = () => {
    return (
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />
        
        <View style={[styles.inputContainer, { backgroundColor: theme.backgrounds.primary }]}>
          <View style={[
            styles.inputWrapper,
            { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }
          ]}>
            <TextInput
              style={[styles.messageInput, { color: theme.text.primary }]}
              value={inputText}
              onChangeText={setInputText}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question mathématique..."
              placeholderTextColor={theme.text.secondary}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: '#10b981' }
              ]}
              onPress={isAITyping ? stopGeneration : sendMessage}
              disabled={!inputText.trim() && !isAITyping}
            >
              {isAITyping ? (
                <Text style={styles.stopIcon}>⏹</Text>
              ) : (
                <SendIcon size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  const renderPercentageForm = () => (
    <View style={styles.formSection}>
      <Text style={[styles.formTitle, { color: theme.text.primary }]}>
        🧮 Calculateur de Pourcentages Avancé
      </Text>
      <Text style={[styles.formDescription, { color: theme.text.secondary }]}>
        Calculs de pourcentages complets avec détails et exemples pratiques
      </Text>
      
      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>💰 Valeur</Text>
          <TextInput
            style={[styles.numberInput, { 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? '#333' : '#e5e7eb',
              color: theme.text.primary
            }]}
            placeholder="Ex: 350 (euros, unités...)"
            placeholderTextColor={theme.text.secondary}
            keyboardType="numeric"
            value={percentageValue}
            onChangeText={setPercentageValue}
            onFocus={() => setPercentageValue('')}
            selectTextOnFocus={true}
          />
        </View>
        
        <Text style={[styles.operatorText, { color: theme.text.secondary }]}>de</Text>
        
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>📊 Total</Text>
          <TextInput
            style={[styles.numberInput, { 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? '#333' : '#e5e7eb',
              color: theme.text.primary
            }]}
            placeholder="Ex: 1500 (prix total...)"
            placeholderTextColor={theme.text.secondary}
            keyboardType="numeric"
            value={percentageOf}
            onChangeText={setPercentageOf}
            onFocus={() => setPercentageOf('')}
            selectTextOnFocus={true}
          />
        </View>
      </View>
      
      {/* Exemples pratiques */}
      <View style={styles.examplesContainer}>
        <Text style={[styles.examplesTitle, { color: theme.text.primary }]}>
          💡 Exemples pratiques
        </Text>
        <Text style={[styles.exampleText, { color: theme.text.secondary }]}>
          • Remise : 50€ de réduction sur 200€
        </Text>
        <Text style={[styles.exampleText, { color: theme.text.secondary }]}>
          • Notes : 15/20 en pourcentage
        </Text>
        <Text style={[styles.exampleText, { color: theme.text.secondary }]}>
          • TVA : 120€ TTC pour 100€ HT
        </Text>
      </View>
    </View>
  );

  const renderVolumeForm = () => (
    <View style={styles.formSection}>
      <Text style={[styles.formTitle, { color: theme.text.primary }]}>
        Calcul de Volume
      </Text>
      <Text style={[styles.formDescription, { color: theme.text.secondary }]}>
        Volume d'un parallélépipède (en centimètres)
      </Text>
      
      <View style={styles.dimensionsGrid}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Longueur (cm)</Text>
          <TextInput
            style={[styles.numberInput, { 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? '#333' : '#e5e7eb',
              color: theme.text.primary
            }]}
            placeholder="10"
            placeholderTextColor={theme.text.secondary}
            keyboardType="numeric"
            value={volumeLength}
            onChangeText={setVolumeLength}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Largeur (cm)</Text>
          <TextInput
            style={[styles.numberInput, { 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? '#333' : '#e5e7eb',
              color: theme.text.primary
            }]}
            placeholder="5"
            placeholderTextColor={theme.text.secondary}
            keyboardType="numeric"
            value={volumeWidth}
            onChangeText={setVolumeWidth}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Hauteur (cm)</Text>
          <TextInput
            style={[styles.numberInput, { 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? '#333' : '#e5e7eb',
              color: theme.text.primary
            }]}
            placeholder="8"
            placeholderTextColor={theme.text.secondary}
            keyboardType="numeric"
            value={volumeHeight}
            onChangeText={setVolumeHeight}
          />
        </View>
      </View>
    </View>
  );

  const renderSalaireForm = () => (
    <View style={styles.formSection}>
      <Text style={[styles.formTitle, { color: theme.text.primary }]}>
        Conversion Brut → Net
      </Text>
      <Text style={[styles.formDescription, { color: theme.text.secondary }]}>
        Calcul estimatif pour un salarié en France
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Salaire brut mensuel (€)</Text>
        <TextInput
          style={[styles.numberInput, { 
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#333' : '#e5e7eb',
            color: theme.text.primary
          }]}
          placeholder="3000"
          placeholderTextColor={theme.text.secondary}
          keyboardType="numeric"
          value={salaireBrut}
          onChangeText={setSalaireBrut}
        />
      </View>
    </View>
  );

  const renderForm = () => {
    switch (selectedMode) {
      case 'assistant':
        return renderAssistantForm();
      case 'pourcentage':
        return renderPercentageForm();
      case 'volume':
        return renderVolumeForm();
      case 'salaire':
        return renderSalaireForm();
      default:
        return null;
    }
  };

  const getCurrentModeConfig = () => {
    return MODES.find(m => m.id === selectedMode);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}> 
        <ScreenContainer>
          <Header />
          
          <View style={styles.tabsWrapper}>
            <ModeNavigationTabs />
          </View>
          
          {selectedMode === 'assistant' ? (
            // Interface de chat pour l'assistant
            renderAssistantForm()
          ) : (
            // Interface de calculatrices pour les autres modes
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.calculatorSection}>
                {renderForm()}
                
                <View style={styles.actionSection}>
                  <TouchableOpacity 
                    style={[styles.calculateButton, { opacity: !canCalculate() || loading ? 0.6 : 1 }]} 
                    onPress={executeCalculation} 
                    disabled={!canCalculate() || loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={(getCurrentModeConfig()?.gradient || ['#667eea', '#764ba2']) as any}
                      style={styles.calculateButtonGradient}
                      start={[0, 0]}
                      end={[1, 0]}
                    >
                      <Text style={styles.calculateButtonText}>
                        {loading ? 'Calcul en cours...' : 'Calculer'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {result.length > 0 && (
                  <Animated.View 
                    style={[
                      styles.resultSection,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                      }
                    ]}
                  >
                    <View style={styles.resultHeader}>
                      <Text style={[styles.resultTitle, { color: theme.text.primary }]}>
                        Résultat
                      </Text>
                      <TouchableOpacity 
                        onPress={() => {
                          // Copier le résultat sans le formatage
                          const cleanResult = result.replace(/\*\*/g, '').replace(/•/g, '-');
                          Alert.alert('✅ Copié', 'Le résultat a été copié');
                        }}
                        style={[styles.copyButton, { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }]}
                      >
                        <Text style={[styles.copyButtonText, { color: theme.text.primary }]}>
                          📋 Copier
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={[styles.resultCard, { 
                      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                      borderColor: isDark ? '#333' : '#e5e7eb'
                    }]}>
                      <ScrollView style={styles.resultScroll} nestedScrollEnabled>
                        <Text style={[styles.resultText, { color: theme.text.primary }]}>
                          {result}
                        </Text>
                      </ScrollView>
                    </View>
                  </Animated.View>
                )}
              </View>
            </ScrollView>
          )}
        </ScreenContainer>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  titleGradient: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
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
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
  },
  
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  
  tabsWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabsContainer: {
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: 8,
    gap: 12,
  },
  tabButton: {
    minWidth: 100,
  },
  activeTabButton: {
    // Styles supplémentaires pour l'onglet actif si nécessaire
  },
  tabButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  calculatorSection: {
    flex: 1,
  },
  
  formSection: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 24,
    lineHeight: 22,
  },
  
  inputCard: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  textArea: {
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  numberInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  operatorText: {
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 12,
  },
  examplesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  
  dimensionsGrid: {
    gap: 16,
  },
  
  actionSection: {
    marginBottom: 24,
  },
  calculateButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  calculateButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  
  resultSection: {
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  copyButtonText: { 
    fontWeight: '600',
    fontSize: 14,
  },
  
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  resultScroll: {
    padding: 20,
    maxHeight: 300,
  },
  resultText: { 
    fontSize: 16, 
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
  },

  // Styles pour l'interface de chat
  chatContainer: {
    flex: 1,
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
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMessage: {
    borderBottomRightRadius: 6,
  },
  aiMessage: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default memo(MathsScreen);