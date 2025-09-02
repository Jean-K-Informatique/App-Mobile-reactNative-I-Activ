import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, Alert, TouchableWithoutFeedback, Keyboard, Animated, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer, useSuckNavigator } from '../components/ScreenTransition';
import { useTheme } from '../contexts/ThemeContext';
import { sendMessageToOpenAINonStreamingResponses, DEFAULT_GPT5_MODEL, type ChatMessage } from '../services/openaiService';
import { WidgetsIcon, UserIcon } from '../components/icons/SvgIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileModal from '../components/ui/ProfileModal';

const STORAGE_KEY_INPUT = 'orthographe_last_input';
const STORAGE_KEY_OUTPUT = 'orthographe_last_output';
const { width } = Dimensions.get('window');

function OrthographeScreen() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();

  // Redirection immédiate vers le nouvel assistant conversationnel
  useEffect(() => {
    suckTo('/assistants/correction', { replace: true });
  }, []);

  // Retour vide pendant la redirection
  return null;
  
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Charger les données sauvegardées
    (async () => {
      try {
        const [i, o] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_INPUT),
          AsyncStorage.getItem(STORAGE_KEY_OUTPUT),
        ]);
        if (i) {
          setInput(i);
          setWordCount(i.trim().split(/\s+/).filter(w => w.length > 0).length);
        }
        if (o) {
          setOutput(o);
          setShowResult(!!o);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données sauvegardées:', error);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_INPUT, input).catch(() => {});
    const words = input.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(input.trim() ? words : 0);
  }, [input]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_OUTPUT, output).catch(() => {});
  }, [output]);

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

  const corriger = async () => {
    if (!input.trim() || loading) {
      if (loading) {
        Alert.alert('⏳ Correction en cours', 'Veuillez attendre la fin de la correction actuelle.');
      }
      return;
    }
    
    setLoading(true);
    Keyboard.dismiss();
    
    try {
      const sys = `Tu es un expert en correction française de niveau universitaire.

MISSION: Corriger et perfectionner le texte en français avec la plus haute qualité.

RÈGLES STRICTES:
- Corrige TOUTES les fautes d'orthographe, grammaire, conjugaison, ponctuation
- Améliore la fluidité et l'élégance sans dénaturer le sens
- Garde le ton et le style de l'auteur (formel/informel)
- Optimise la clarté et la lisibilité
- Respecte les règles typographiques françaises
- JAMAIS d'explications, seulement le texte parfait

OBJECTIF: Transformer le texte en version impeccable et naturelle.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: sys },
        { role: 'user', content: input },
      ];
      
      const corrected = await sendMessageToOpenAINonStreamingResponses(messages, DEFAULT_GPT5_MODEL, 'low', { maxOutputTokens: 1200 });
      setOutput(corrected.trim());
      setShowResult(true);
      
    } catch (e: any) {
      console.error('Erreur lors de la correction:', e);
      setOutput('❌ Une erreur est survenue lors de la correction.\n\nVérifiez votre connexion internet et réessayez.\n\nSi le problème persiste, redémarrez l\'application.');
      setShowResult(true);
      Alert.alert(
        '❌ Erreur de correction',
        'Impossible de corriger le texte. Vérifiez votre connexion internet.',
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

  const copyToClipboard = useCallback(async () => {
    if (output) {
      try {
        Clipboard.setString(output);
        Alert.alert('✅ Copié', 'Le texte corrigé a été copié dans le presse-papier');
      } catch (error) {
        console.error('Erreur lors de la copie:', error);
        Alert.alert('❌ Erreur', 'Impossible de copier le texte');
      }
    }
  }, [output]);

  const handleResetInput = useCallback(() => {
    setInput('');
    setOutput('');
    setShowResult(false);
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
  }, [fadeAnim, slideAnim]);

  const Header = () => (
    <View style={styles.header}> 
      <View style={styles.headerLeft}>
        <LinearGradient
          colors={isDark ? ['#667eea', '#764ba2'] : ['#6366f1', '#8b5cf6']}
          style={styles.titleGradient}
          start={[0, 0]}
          end={[1, 0]}
        >
          <Text style={styles.headerTitle}>Correction IA</Text>
        </LinearGradient>
        <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>
          Perfectionnez votre français
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
                <View style={styles.inputHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                    Votre texte
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
                    placeholder="Collez ou saisissez votre texte à corriger..."
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
                    onPress={corriger} 
                    disabled={!input.trim() || loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isDark ? ['#667eea', '#764ba2'] : ['#6366f1', '#8b5cf6']}
                      style={styles.buttonGradient}
                      start={[0, 0]}
                      end={[1, 0]}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? 'Correction en cours...' : 'Corriger le texte'}
                      </Text>
                      {loading && (
                        <View style={styles.loadingDot}>
                          <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  {input.length > 0 && (
                                      <TouchableOpacity onPress={handleResetInput} style={styles.clearButton}>
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
                      Texte corrigé
                    </Text>
                    <Text style={[styles.resultSubtitle, { color: theme.text.secondary }]}>
                      Version perfectionnée
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
                      {output || 'Le résultat apparaîtra ici...'}
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
                  
                  <TouchableOpacity onPress={handleResetInput} style={styles.newButton}>
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
    shadowColor: '#6366f1',
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

export default memo(OrthographeScreen);