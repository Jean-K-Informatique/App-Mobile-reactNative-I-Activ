import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Platform, 
  Alert, 
  KeyboardAvoidingView,
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { ScreenContainer, useSuckNavigator } from '../components/ScreenTransition';
import { useTheme } from '../contexts/ThemeContext';
import { sendMessageToOpenAIStreaming } from '../services/openaiService';
import { WidgetsIcon, SendIcon } from '../components/icons/SvgIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Types pour les messages
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  streaming?: boolean;
}

// Types pour les modes mathématiques
type MathMode = 'assistant' | 'percentage' | 'volume' | 'salary';

interface ModeConfig {
  id: MathMode;
  title: string;
  icon: string;
  gradient: string[];
}

const MATH_MODES: ModeConfig[] = [
  {
    id: 'assistant',
    title: 'Chat Math',
    icon: '🧮',
    gradient: ['#10b981', '#059669']
  },
  {
    id: 'percentage',
    title: 'Pourcentage',
    icon: '📊',
    gradient: ['#3b82f6', '#1d4ed8']
  },
  {
    id: 'volume',
    title: 'Volume',
    icon: '📦',
    gradient: ['#8b5cf6', '#7c3aed']
  },
  {
    id: 'salary',
    title: 'Brut/Net',
    icon: '💰',
    gradient: ['#f59e0b', '#d97706']
  }
];

function MathsUnifiedScreen() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();
  const insets = useSafeAreaInsets();
  
  // État du mode actuel (démarrer sur assistant)
  const [currentMode, setCurrentMode] = useState<MathMode>('assistant');
  
  // États pour l'assistant conversationnel
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  
  // États pour les calculatrices
  const [percentageValue, setPercentageValue] = useState('');
  const [percentageOf, setPercentageOf] = useState('');
  const [volumeLength, setVolumeLength] = useState('');
  const [volumeWidth, setVolumeWidth] = useState('');
  const [volumeHeight, setVolumeHeight] = useState('');
  const [salaryBrut, setSalaryBrut] = useState('');
  const [calculationResult, setCalculationResult] = useState('');
  
  // Refs pour l'assistant
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Message d'accueil de l'assistant
  const getWelcomeMessage = useCallback((): Message => {
    const welcomeText = `🧮 Bonjour ! Je suis votre **assistant mathématiques**.

Posez-moi vos questions mathématiques : équations, calculs, géométrie, probabilités, analyse... Je résous et j'explique étape par étape !`;
    
    return {
      id: `welcome-math-${Date.now()}`,
      text: welcomeText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  }, []);

  // Initialiser l'assistant avec message d'accueil
  useEffect(() => {
    if (currentMode === 'assistant' && messages.length === 0) {
      const welcomeMessage = getWelcomeMessage();
      setMessages([welcomeMessage]);
    }
  }, [currentMode, getWelcomeMessage]);

  // Prompt spécialisé mathématiques
  const getMathPrompt = useCallback((): string => {
    return `Tu es un assistant mathématiques expert et pédagogue. 

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
  }, []);

  // Finaliser un message streaming
  const finalizeStreamingMessage = useCallback((messageId: string, finalText: string) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, text: finalText, streaming: false }
          : msg
      )
    );
    setIsAITyping(false);
    
    // Nettoyer les refs de streaming
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    streamingBufferRef.current = '';
  }, []);

  // Fonction d'envoi de message (assistant)
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
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      streaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputText('');
    setIsAITyping(true);

    // Préparer les messages pour l'API
    const allMessages = [...messages, userMessage];
    const contextMessages = [
      { role: 'system' as const, content: getMathPrompt() },
      ...allMessages.map(msg => ({
        role: (msg.isUser ? 'user' : 'assistant') as const,
        content: msg.text
      }))
    ];

    // Configuration streaming avec buffer
    streamingBufferRef.current = '';
    
    const flushBuffer = () => {
      if (streamingBufferRef.current) {
        const textToAdd = streamingBufferRef.current;
        streamingBufferRef.current = '';
        
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, text: msg.text + textToAdd }
              : msg
          )
        );
      }
    };

    streamingTimerRef.current = setInterval(flushBuffer, 12);

    try {
      abortControllerRef.current = new AbortController();
      
      await sendMessageToOpenAIStreaming(
        contextMessages,
        DEFAULT_GPT5_MODEL,
        {
          onStart: () => setIsAITyping(true),
          onChunk: (chunk: string) => {
            streamingBufferRef.current += chunk;
          },
          onError: (error: Error) => {
            console.error('❌ Erreur streaming:', error);
            finalizeStreamingMessage(assistantMessageId, '❌ Désolé, une erreur est survenue. Veuillez réessayer.');
          }
        },
        abortControllerRef.current.signal
      );

      // Finaliser avec le contenu du buffer
      flushBuffer();
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
      }
      setIsAITyping(false);

    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      const errorMessage = error.message?.includes('RESPONSE_STOPPED') 
        ? '⏹ Génération interrompue'
        : '❌ Désolé, une erreur est survenue. Veuillez réessayer.';
      finalizeStreamingMessage(assistantMessageId, errorMessage);
    }
  };

  // Gestion du clavier
  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Enter') {
      sendMessage();
    }
  };

  // Arrêter la génération IA
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAITyping(false);
    }
  };

  // Nouveau chat
  const handleNewChat = () => {
    if (messages.length > 1) { // Plus que le message d'accueil
      Alert.alert(
        "Nouvelle conversation",
        "Voulez-vous vraiment commencer une nouvelle conversation ? La conversation actuelle sera perdue.",
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Nouveau", 
            style: "destructive",
            onPress: () => {
              stopGeneration();
              const welcomeMessage = getWelcomeMessage();
              setMessages([welcomeMessage]);
            }
          }
        ]
      );
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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

  // Calculatrices
  const calculatePercentage = () => {
    const value = parseFloat(percentageValue.replace(',', '.'));
    const total = parseFloat(percentageOf.replace(',', '.'));
    
    if (!isFinite(value) || !isFinite(total) || total === 0) {
      setCalculationResult('⚠️ Veuillez saisir des nombres valides');
      return;
    }
    
    const result = (value / total) * 100;
    setCalculationResult(`📊 ${value} représente ${result.toFixed(2)}% de ${total}`);
  };

  const calculateVolume = () => {
    const length = parseFloat(volumeLength.replace(',', '.'));
    const width = parseFloat(volumeWidth.replace(',', '.'));
    const height = parseFloat(volumeHeight.replace(',', '.'));
    
    if (!isFinite(length) || !isFinite(width) || !isFinite(height) || 
        length <= 0 || width <= 0 || height <= 0) {
      setCalculationResult('⚠️ Veuillez saisir des dimensions valides');
      return;
    }
    
    const volume = length * width * height;
    setCalculationResult(`📦 Volume : ${volume.toFixed(2)} unités³`);
  };

  const calculateSalary = () => {
    const brut = parseFloat(salaryBrut.replace(',', '.'));
    
    if (!isFinite(brut) || brut <= 0) {
      setCalculationResult('⚠️ Veuillez saisir un salaire valide');
      return;
    }
    
    // Calcul simplifié (approximation France)
    const charges = brut * 0.22; // ~22% charges salariales
    const net = brut - charges;
    
    setCalculationResult(`💰 Brut : ${brut.toFixed(2)}€\n💵 Net : ${net.toFixed(2)}€\n📉 Charges : ${charges.toFixed(2)}€`);
  };

  // Reset des calculs lors du changement de mode
  const resetCalculations = () => {
    setPercentageValue('');
    setPercentageOf('');
    setVolumeLength('');
    setVolumeWidth('');
    setVolumeHeight('');
    setSalaryBrut('');
    setCalculationResult('');
  };

  // Changement de mode
  const switchMode = (mode: MathMode) => {
    if (mode !== currentMode) {
      setCurrentMode(mode);
      resetCalculations();
      
      // Si on retourne à l'assistant et qu'il n'y a pas de messages, ajouter l'accueil
      if (mode === 'assistant' && messages.length === 0) {
        const welcomeMessage = getWelcomeMessage();
        setMessages([welcomeMessage]);
      }
    }
  };

  // Rendu des boutons de modes
  const renderModeButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.modesContainer}
      contentContainerStyle={styles.modesContent}
    >
      {MATH_MODES.map((mode) => (
        <TouchableOpacity
          key={mode.id}
          onPress={() => switchMode(mode.id)}
          style={[
            styles.modeButton,
            currentMode === mode.id && styles.activeModeButton
          ]}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={currentMode === mode.id ? mode.gradient : ['transparent', 'transparent']}
            style={[
              styles.modeButtonGradient,
              currentMode !== mode.id && { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
              }
            ]}
          >
            <Text style={styles.modeIcon}>{mode.icon}</Text>
            <Text style={[
              styles.modeTitle,
              { 
                color: currentMode === mode.id 
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

  // Rendu du contenu selon le mode
  const renderContent = () => {
    switch (currentMode) {
      case 'assistant':
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

      case 'percentage':
        return (
          <ScrollView style={styles.calculatorContainer}>
            <View style={styles.calculatorCard}>
              <Text style={[styles.calculatorTitle, { color: theme.text.primary }]}>
                📊 Calcul de Pourcentage
              </Text>
              <Text style={[styles.calculatorDesc, { color: theme.text.secondary }]}>
                Calculez quel pourcentage représente une valeur
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Valeur</Text>
                <TextInput
                  style={[styles.calculatorInput, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    color: theme.text.primary
                  }]}
                  value={percentageValue}
                  onChangeText={setPercentageValue}
                  placeholder="25"
                  placeholderTextColor={theme.text.secondary}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Total</Text>
                <TextInput
                  style={[styles.calculatorInput, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    color: theme.text.primary
                  }]}
                  value={percentageOf}
                  onChangeText={setPercentageOf}
                  placeholder="100"
                  placeholderTextColor={theme.text.secondary}
                  keyboardType="numeric"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: '#3b82f6' }]}
                onPress={calculatePercentage}
              >
                <Text style={styles.calculateButtonText}>Calculer</Text>
              </TouchableOpacity>
              
              {calculationResult ? (
                <Text style={[styles.result, { color: theme.text.primary }]}>
                  {calculationResult}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        );

      case 'volume':
        return (
          <ScrollView style={styles.calculatorContainer}>
            <View style={styles.calculatorCard}>
              <Text style={[styles.calculatorTitle, { color: theme.text.primary }]}>
                📦 Calcul de Volume
              </Text>
              <Text style={[styles.calculatorDesc, { color: theme.text.secondary }]}>
                Calculez le volume d'un parallélépipède rectangle
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Longueur</Text>
                <TextInput
                  style={[styles.calculatorInput, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    color: theme.text.primary
                  }]}
                  value={volumeLength}
                  onChangeText={setVolumeLength}
                  placeholder="10"
                  placeholderTextColor={theme.text.secondary}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Largeur</Text>
                <TextInput
                  style={[styles.calculatorInput, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    color: theme.text.primary
                  }]}
                  value={volumeWidth}
                  onChangeText={setVolumeWidth}
                  placeholder="5"
                  placeholderTextColor={theme.text.secondary}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Hauteur</Text>
                <TextInput
                  style={[styles.calculatorInput, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    color: theme.text.primary
                  }]}
                  value={volumeHeight}
                  onChangeText={setVolumeHeight}
                  placeholder="3"
                  placeholderTextColor={theme.text.secondary}
                  keyboardType="numeric"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: '#8b5cf6' }]}
                onPress={calculateVolume}
              >
                <Text style={styles.calculateButtonText}>Calculer</Text>
              </TouchableOpacity>
              
              {calculationResult ? (
                <Text style={[styles.result, { color: theme.text.primary }]}>
                  {calculationResult}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        );

      case 'salary':
        return (
          <ScrollView style={styles.calculatorContainer}>
            <View style={styles.calculatorCard}>
              <Text style={[styles.calculatorTitle, { color: theme.text.primary }]}>
                💰 Conversion Brut/Net
              </Text>
              <Text style={[styles.calculatorDesc, { color: theme.text.secondary }]}>
                Estimation du salaire net à partir du brut (France)
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Salaire Brut (€)</Text>
                <TextInput
                  style={[styles.calculatorInput, { 
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    color: theme.text.primary
                  }]}
                  value={salaryBrut}
                  onChangeText={setSalaryBrut}
                  placeholder="3000"
                  placeholderTextColor={theme.text.secondary}
                  keyboardType="numeric"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: '#f59e0b' }]}
                onPress={calculateSalary}
              >
                <Text style={styles.calculateButtonText}>Calculer</Text>
              </TouchableOpacity>
              
              {calculationResult ? (
                <Text style={[styles.result, { color: theme.text.primary }]}>
                  {calculationResult}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <ScreenContainer>
        {/* Header avec titre et boutons d'action */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#e5e7eb' }]}>
          <View style={styles.headerContent}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.titleGradient}
              start={[0, 0]}
              end={[1, 0]}
            >
              <Text style={styles.headerTitle}>
                Mathématiques
              </Text>
            </LinearGradient>
            
            <View style={styles.headerActions}>
              {/* Bouton Nouveau (seulement pour l'assistant) */}
              {currentMode === 'assistant' && (
                <TouchableOpacity 
                  onPress={handleNewChat}
                  style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
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
          
          {/* Boutons de modes */}
          {renderModeButtons()}
        </View>

        {/* Contenu selon le mode */}
        {renderContent()}
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  titleGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modesContainer: {
    marginTop: 12,
    maxHeight: 60,
  },
  modesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  modeButton: {
    minWidth: 100,
  },
  activeModeButton: {
    // Styles supplémentaires pour le mode actif si nécessaire
  },
  modeButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Styles pour l'assistant conversationnel
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
  
  // Styles pour les calculatrices
  calculatorContainer: {
    flex: 1,
    padding: 16,
  },
  calculatorCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  calculatorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  calculatorDesc: {
    fontSize: 14,
    marginBottom: 20,
    opacity: 0.8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  calculatorInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  calculateButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default memo(MathsUnifiedScreen);
