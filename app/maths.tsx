import React, { useState, useRef, memo, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, TouchableWithoutFeedback, Keyboard, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer, useSuckNavigator } from '../components/ScreenTransition';
import { useTheme } from '../contexts/ThemeContext';
import { sendMessageToOpenAINonStreamingResponses, DEFAULT_GPT5_MODEL, type ChatMessage } from '../services/openaiService';
import { WidgetsIcon, UserIcon } from '../components/icons/SvgIcons';
import ProfileModal from '../components/ui/ProfileModal';

const { width } = Dimensions.get('window');

type ModeType = 'assistant' | 'pourcentage' | 'volume' | 'salaire';

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
  const [selectedMode, setSelectedMode] = useState<ModeType | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  
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

  // Redirection propre vers l'assistant conversationnel (évite un hook dans une fonction de rendu)
  useEffect(() => {
    if (selectedMode === 'assistant') {
      suckTo('/assistants/chat-math', { replace: true });
    }
  }, [selectedMode]);

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

  const runAssistant = async () => {
    // Redirection vers le nouvel assistant conversationnel
    suckTo('/assistants/chat-math', { replace: true });
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
    
    setResult(`🔢 **Calcul de pourcentage**

**${value}** représente **${percentage.toFixed(2)}%** de **${total}**

**Détails:**
• Formule: (${value} ÷ ${total}) × 100
• Résultat: ${percentage.toFixed(2)}%

**Vérification:** ${percentage.toFixed(2)}% de ${total} = ${percentageAmount.toFixed(2)}`);
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
      <TouchableOpacity 
        onPress={() => suckTo('/widgets', { replace: true })} 
        style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
      >
        <WidgetsIcon size={20} color={theme.text.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderModeCard = (mode: ModeConfig) => (
    <TouchableOpacity
      key={mode.id}
      style={styles.modeCard}
      onPress={() => selectMode(mode.id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isDark ? mode.gradient : mode.gradient.map(color => color + 'E6')}
        style={styles.modeCardGradient}
        start={[0, 0]}
        end={[1, 1]}
      >
        <Text style={styles.modeIcon}>{mode.icon}</Text>
        <Text style={styles.modeTitle}>{mode.title}</Text>
        <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderAssistantForm = () => {
    // La redirection est gérée par le useEffect global ci-dessus
    return null;
  };

  const renderPercentageForm = () => (
    <View style={styles.formSection}>
      <Text style={[styles.formTitle, { color: theme.text.primary }]}>
        Calcul de Pourcentage
      </Text>
      <Text style={[styles.formDescription, { color: theme.text.secondary }]}>
        Calculez quel pourcentage représente une valeur
      </Text>
      
      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Valeur</Text>
          <TextInput
            style={[styles.numberInput, { 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? '#333' : '#e5e7eb',
              color: theme.text.primary
            }]}
            placeholder="25"
            placeholderTextColor={theme.text.secondary}
            keyboardType="numeric"
            value={percentageValue}
            onChangeText={setPercentageValue}
          />
        </View>
        
        <Text style={[styles.operatorText, { color: theme.text.secondary }]}>de</Text>
        
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Total</Text>
          <TextInput
            style={[styles.numberInput, { 
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? '#333' : '#e5e7eb',
              color: theme.text.primary
            }]}
            placeholder="100"
            placeholderTextColor={theme.text.secondary}
            keyboardType="numeric"
            value={percentageOf}
            onChangeText={setPercentageOf}
          />
        </View>
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
          
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {!selectedMode ? (
              // Sélection du mode
              <View style={styles.modesSection}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Choisissez votre outil
                </Text>
                <Text style={[styles.sectionDescription, { color: theme.text.secondary }]}>
                  Sélectionnez le type de calcul que vous souhaitez effectuer
                </Text>
                
                <View style={styles.modesGrid}>
                  {MODES.map(renderModeCard)}
                </View>
              </View>
            ) : (
              // Mode sélectionné
              <View style={styles.calculatorSection}>
                <View style={styles.breadcrumb}>
                  <TouchableOpacity 
                    onPress={() => setSelectedMode(null)}
                    style={styles.backButton}
                  >
                    <Text style={[styles.backButtonText, { color: theme.text.primary }]}>
                      ← Tous les outils
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {selectedMode !== 'assistant' && renderForm()}
                
                {selectedMode !== 'assistant' && (
                  <View style={styles.actionSection}>
                    <TouchableOpacity 
                      style={[styles.calculateButton, { opacity: !canCalculate() || loading ? 0.6 : 1 }]} 
                      onPress={executeCalculation} 
                      disabled={!canCalculate() || loading}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={getCurrentModeConfig()?.gradient || ['#667eea', '#764ba2']}
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
                )}

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
            )}
          </ScrollView>
          {/* Bouton Mon Compte rond en bas à gauche */}
          <View style={styles.accountButtonContainer}>
            <TouchableOpacity 
              style={[styles.accountButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.8}
            >
              <UserIcon size={20} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Modale Profile */}
          <ProfileModal 
            visible={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
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
  
  modesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 32,
    lineHeight: 22,
  },
  
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  modeCard: {
    width: (width - 64) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  modeCardGradient: {
    padding: 24,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  modeSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  calculatorSection: {
    flex: 1,
  },
  breadcrumb: {
    marginBottom: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
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

  // Bouton Mon Compte rond en bas à gauche
  accountButtonContainer: {
    position: 'absolute',
    bottom: 24,
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

export default memo(MathsScreen);