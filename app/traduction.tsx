import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, Alert, TouchableWithoutFeedback, Keyboard, Animated, Modal, FlatList, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer, useSuckNavigator } from '../components/ScreenTransition';
import { useTheme } from '../contexts/ThemeContext';
import { sendMessageToOpenAINonStreamingResponses, DEFAULT_GPT5_MODEL, type ChatMessage } from '../services/openaiService';
import { WidgetsIcon, UserIcon } from '../components/icons/SvgIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileModal from '../components/ui/ProfileModal';

const STORAGE_INPUT = 'traduction_last_input';
const STORAGE_OUTPUT = 'traduction_last_output';
const STORAGE_LANG = 'traduction_last_lang';
const { width } = Dimensions.get('window');

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

function TraductionScreen() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [targetLang, setTargetLang] = useState('Anglais');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [customLang, setCustomLang] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Charger les données sauvegardées
    (async () => {
      try {
        const [i, o, l] = await Promise.all([
          AsyncStorage.getItem(STORAGE_INPUT),
          AsyncStorage.getItem(STORAGE_OUTPUT),
          AsyncStorage.getItem(STORAGE_LANG),
        ]);
        if (i) {
          setInput(i);
          setWordCount(i.trim().split(/\s+/).filter(w => w.length > 0).length);
        }
        if (o) {
          setOutput(o);
          setShowResult(!!o);
        }
        if (l) setTargetLang(l);
      } catch (error) {
        console.error('Erreur lors du chargement des données sauvegardées:', error);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_INPUT, input).catch(() => {});
    const words = input.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(input.trim() ? words : 0);
  }, [input]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_OUTPUT, output).catch(() => {});
  }, [output]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_LANG, targetLang).catch(() => {});
  }, [targetLang]);

  useEffect(() => {
    if (showResult) {
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
    }
  }, [showResult]);

  const traduire = async () => {
    if (!input.trim() || loading) {
      if (loading) {
        Alert.alert('⏳ Traduction en cours', 'Veuillez attendre la fin de la traduction actuelle.');
      }
      return;
    }
    
    setLoading(true);
    Keyboard.dismiss();
    
    try {
      const sys = `Tu es un traducteur professionnel expert multilingue de niveau natif.

MISSION: Traduire le texte avec la plus haute qualité vers: ${targetLang}

RÈGLES CRITIQUES:
- Traduction PARFAITE respectant les nuances culturelles
- Préserver le ton, style et intention originale
- Adapter les expressions idiomatiques naturellement
- Respecter les conventions typographiques de la langue cible
- Maintenir la formulation appropriée (formel/informel)
- JAMAIS d'explications, seulement la traduction parfaite

OBJECTIF: Livrer une traduction indistinguable d'un texte écrit nativement.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: sys },
        { role: 'user', content: input },
      ];
      
      const translated = await sendMessageToOpenAINonStreamingResponses(messages, DEFAULT_GPT5_MODEL, 'low', { maxOutputTokens: 1200 });
      setOutput(translated.trim());
      setShowResult(true);
      
    } catch (e: any) {
      console.error('Erreur lors de la traduction:', e);
      setOutput('❌ Une erreur est survenue lors de la traduction.\n\nVérifiez votre connexion internet et réessayez.\n\nSi le problème persiste, redémarrez l\'application.');
      setShowResult(true);
      Alert.alert(
        '❌ Erreur de traduction',
        'Impossible de traduire le texte. Vérifiez votre connexion internet.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const resetInput = () => {
    setInput('');
    setOutput('');
    setShowResult(false);
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
  };

  const copyToClipboard = async () => {
    if (output) {
      try {
        Clipboard.setString(output);
        Alert.alert('✅ Copié', 'La traduction a été copiée dans le presse-papier');
      } catch (error) {
        console.error('Erreur lors de la copie:', error);
        Alert.alert('❌ Erreur', 'Impossible de copier le texte');
      }
    }
  };

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

  const Header = () => (
    <View style={styles.header}> 
      <View style={styles.headerLeft}>
        <LinearGradient
          colors={isDark ? ['#f093fb', '#f5576c'] : ['#ec4899', '#f97316']}
          style={styles.titleGradient}
          start={[0, 0]}
          end={[1, 0]}
        >
          <Text style={styles.headerTitle}>Traduction IA</Text>
        </LinearGradient>
        <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>
          Traduction professionnelle instantanée
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

  const LanguageSelector = () => (
    <TouchableOpacity 
      style={[styles.languageSelector, { 
        backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa',
        borderColor: isDark ? '#444' : '#e9ecef'
      }]}
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
  );

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
            {!showResult ? (
              // Vue de saisie
              <View style={styles.inputSection}>
                <LanguageSelector />
                
                <View style={styles.inputHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                    Texte à traduire
                  </Text>
                  <View style={styles.stats}>
                    <Text style={[styles.wordCount, { color: theme.text.secondary }]}>
                      {wordCount} mot{wordCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.inputCard, { 
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  borderColor: isDark ? '#333' : '#e5e7eb',
                  shadowColor: isDark ? '#000' : '#0003'
                }]}>
                  <TextInput
                    style={[styles.textInput, { color: theme.text.primary }]}
                    placeholder="Saisissez ou collez le texte à traduire..."
                    placeholderTextColor={theme.text.secondary}
                    multiline
                    value={input}
                    onChangeText={setInput}
                    textAlignVertical="top"
                    autoFocus={false}
                  />
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { opacity: !input.trim() || loading ? 0.6 : 1 }]} 
                    onPress={traduire} 
                    disabled={!input.trim() || loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isDark ? ['#f093fb', '#f5576c'] : ['#ec4899', '#f97316']}
                      style={styles.buttonGradient}
                      start={[0, 0]}
                      end={[1, 0]}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? 'Traduction en cours...' : `Traduire en ${targetLang}`}
                      </Text>
                      {loading && (
                        <View style={styles.loadingDot}>
                          <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  {input.length > 0 && (
                    <TouchableOpacity onPress={resetInput} style={styles.clearButton}>
                      <Text style={[styles.clearButtonText, { color: theme.text.secondary }]}>
                        Effacer
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              // Vue des résultats avec animation
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
                  <View style={styles.resultHeaderLeft}>
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                      Traduction en {targetLang}
                    </Text>
                    <Text style={[styles.resultSubtitle, { color: theme.text.secondary }]}>
                      {getLanguageEmoji(targetLang)} Version traduite
                    </Text>
                  </View>
                  <View style={styles.resultActions}>
                    <TouchableOpacity 
                      onPress={copyToClipboard}
                      style={[styles.copyButton, { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }]}
                    >
                      <Text style={[styles.copyButtonText, { color: theme.text.primary }]}>
                        📋 Copier
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={[styles.resultCard, { 
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  borderColor: isDark ? '#333' : '#e5e7eb'
                }]}>
                  <ScrollView style={styles.resultScroll} nestedScrollEnabled>
                    <Text style={[styles.resultText, { color: theme.text.primary }]}>
                      {output || 'La traduction apparaîtra ici...'}
                    </Text>
                  </ScrollView>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    onPress={() => setShowResult(false)}
                    style={[styles.backButton, { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }]}
                  >
                    <Text style={[styles.backButtonText, { color: theme.text.primary }]}>
                      ← Modifier le texte
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={resetInput} style={styles.newButton}>
                    <LinearGradient
                      colors={isDark ? ['#059669', '#10b981'] : ['#059669', '#34d399']}
                      style={styles.newButtonGradient}
                      start={[0, 0]}
                      end={[1, 0]}
                    >
                      <Text style={styles.newButtonText}>+ Nouveau texte</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </ScrollView>

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
                      colors={isDark ? ['#f093fb', '#f5576c'] : ['#ec4899', '#f97316']}
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
                      backgroundColor: targetLang === item.name ? (isDark ? '#2a2a2a' : '#f0f9ff') : 'transparent',
                      borderColor: targetLang === item.name ? (isDark ? '#444' : '#bfdbfe') : 'transparent'
                    }]}
                    onPress={() => selectLanguage(item.name)}
                  >
                    <Text style={styles.languageItemEmoji}>{item.emoji}</Text>
                    <Text style={[styles.languageItemName, { color: theme.text.primary }]}>
                      {item.name}
                    </Text>
                    {targetLang === item.name && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </SafeAreaView>
          </Modal>

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
  
  inputSection: {
    flex: 1,
  },
  
  languageSelector: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  languageSelectorContent: {
    padding: 16,
  },
  languageSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  inputCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
    minHeight: 280,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  textInput: { 
    padding: 24,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 260,
    textAlignVertical: 'top',
    fontWeight: '400',
  },
  
  buttonContainer: {
    gap: 16,
  },
  actionButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: { 
    color: '#ffffff', 
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  loadingDot: {
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  resultSection: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  resultHeaderLeft: {
    flex: 1,
  },
  resultSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
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
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 250,
    marginBottom: 32,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  resultScroll: {
    padding: 24,
    maxHeight: 300,
  },
  resultText: { 
    fontSize: 16, 
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  newButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  newButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Styles de la modale
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
    color: '#10b981',
    fontWeight: '700',
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

export default memo(TraductionScreen);