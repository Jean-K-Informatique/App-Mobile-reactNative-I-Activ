import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { deleteCurrentUserAccountAndData } from '../../services/accountService';
import { SUBSCRIPTION_PLANS } from '../../constants/themes';

const { width } = Dimensions.get('window');

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'account' | 'subscription' | 'customization';

const MAX_WORDS = 150;

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmChecked2, setConfirmChecked2] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('account');
  
  // Données de personnalisation
  const [customizationData, setCustomizationData] = useState({
    professionalContext: '',
    companyPresentation: '',
    useCases: '',
    objectives: '',
  });

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const updateCustomField = (field: keyof typeof customizationData, value: string) => {
    const wordCount = countWords(value);
    if (wordCount <= MAX_WORDS) {
      setCustomizationData(prev => ({ ...prev, [field]: value }));
    }
  };

  const CustomTextArea = ({ 
    label, 
    field, 
    placeholder 
  }: { 
    label: string; 
    field: keyof typeof customizationData; 
    placeholder: string;
  }) => {
    const wordCount = countWords(customizationData[field]);
    const isAtLimit = wordCount >= MAX_WORDS;

    return (
      <View style={[styles.customizationField, { 
        backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
        borderColor: isDark ? '#333' : '#e9ecef'
      }]}>
        <Text style={[styles.fieldLabel, { color: theme.text.primary }]}>{label}</Text>
        <TextInput
          style={[
            styles.customTextArea,
            {
              backgroundColor: 'transparent',
              borderColor: isAtLimit ? '#ef4444' + '70' : (isDark ? '#444' : '#d1d5db'),
              color: theme.text.primary,
            }
          ]}
          value={customizationData[field]}
          onChangeText={(value) => updateCustomField(field, value)}
          placeholder={placeholder}
          placeholderTextColor={theme.text.secondary}
          multiline
          textAlignVertical="top"
        />
        <Text style={[
          styles.wordCounter,
          { color: wordCount > MAX_WORDS ? '#ef4444' : theme.text.secondary }
        ]}>
          {wordCount}/{MAX_WORDS} mots
        </Text>
      </View>
    );
  };

  const SubscriptionCard = ({ 
    plan, 
    isActive = false 
  }: { 
    plan: keyof typeof SUBSCRIPTION_PLANS; 
    isActive?: boolean;
  }) => {
    const planData = SUBSCRIPTION_PLANS[plan];
    
    return (
      <View style={[
        styles.subscriptionCard,
        { 
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderColor: isActive ? planData.color + '40' : (isDark ? '#333' : '#e5e7eb')
        }
      ]}>
        <View style={styles.planHeader}>
          <Text style={[styles.planName, { color: theme.text.primary }]}>{plan}</Text>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: isActive ? '#10b981' + '20' : '#f59e0b' + '20'
            }
          ]}>
            <Text style={[
              styles.statusText,
              { color: isActive ? '#10b981' : '#f59e0b' }
            ]}>
              {isActive ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>
        <Text style={[styles.planPrice, { color: planData.color }]}>
          {planData.price}/mois
        </Text>
        {plan === 'PERFORMANCE' && (
          <Text style={[styles.popularLabel, { color: '#8b5cf6' }]}>
            ⭐ Populaire
          </Text>
        )}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.accountInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                📋 Informations personnelles
              </Text>
              
              <View style={[styles.infoCard, { 
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                borderColor: isDark ? '#333' : '#e5e7eb'
              }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>✉️ Email</Text>
                  <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                    {user?.email || 'Non défini'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>👤 Nom</Text>
                  <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                    {user?.displayName || 'Non défini'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>📅 Membre depuis</Text>
                  <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                    {user?.metadata.creationTime ? 
                      new Date(user.metadata.creationTime).toLocaleDateString('fr-FR') : 
                      'Non défini'
                    }
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 32 }]}>
                ⚙️ Préférences
              </Text>

              {/* Mode clair/sombre avec design moderne */}
              <TouchableOpacity 
                style={[styles.modernToggle, { 
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  borderColor: isDark ? '#333' : '#e5e7eb'
                }]}
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <View style={styles.toggleContent}>
                  <View style={styles.toggleLeft}>
                    <Text style={styles.toggleIcon}>{isDark ? '🌙' : '☀️'}</Text>
                    <View>
                      <Text style={[styles.toggleTitle, { color: theme.text.primary }]}>
                        Mode {isDark ? 'sombre' : 'clair'}
                      </Text>
                      <Text style={[styles.toggleSubtitle, { color: theme.text.secondary }]}>
                        Interface {isDark ? 'sombre et élégante' : 'claire et lumineuse'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.toggleSwitch, { backgroundColor: isDark ? '#6366f1' : '#10b981' }]}>
                    <View style={[styles.toggleCircle, { 
                      transform: [{ translateX: isDark ? 24 : 2 }],
                      backgroundColor: '#ffffff'
                    }]} />
                  </View>
                </View>
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 32 }]}>
                🔐 Actions du compte
              </Text>

              {/* Bouton de déconnexion moderne */}
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  onClose();
                  signOut();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#f59e0b', '#f97316']}
                  style={styles.actionButtonGradient}
                  start={[0, 0]}
                  end={[1, 0]}
                >
                  <Text style={styles.actionButtonIcon}>🚪</Text>
                  <Text style={styles.actionButtonText}>Déconnexion</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Suppression de compte modernisée */}
              {!showDeleteConfirm && (
                <TouchableOpacity
                  style={styles.dangerButton}
                  disabled={deleting}
                  onPress={() => setShowDeleteConfirm(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    style={styles.actionButtonGradient}
                    start={[0, 0]}
                    end={[1, 0]}
                  >
                    <Text style={styles.actionButtonIcon}>🗑️</Text>
                    <Text style={styles.actionButtonText}>Supprimer mon compte</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {showDeleteConfirm && (
                <View style={[styles.confirmCard, { 
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  borderColor: '#ef4444'
                }]}> 
                  <Text style={[styles.confirmTitle, { color: theme.text.primary }]}>
                    ⚠️ Confirmation requise
                  </Text>
                  <Text style={[styles.confirmDescription, { color: theme.text.secondary }]}>
                    Cette action est irréversible et supprimera toutes vos données.
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setConfirmChecked(!confirmChecked)}
                    disabled={deleting}
                  >
                    <View style={[
                      styles.checkbox,
                      { 
                        borderColor: confirmChecked ? '#10b981' : (isDark ? '#555' : '#d1d5db'), 
                        backgroundColor: confirmChecked ? '#10b981' : 'transparent' 
                      }
                    ]}>
                      {confirmChecked && (<Text style={styles.checkboxTick}>✓</Text>)}
                    </View>
                    <Text style={[styles.confirmText, { color: theme.text.primary }]}>
                      Je confirme la suppression de mes conversations et informations.
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setConfirmChecked2(!confirmChecked2)}
                    disabled={deleting}
                  >
                    <View style={[
                      styles.checkbox,
                      { 
                        borderColor: confirmChecked2 ? '#10b981' : (isDark ? '#555' : '#d1d5db'), 
                        backgroundColor: confirmChecked2 ? '#10b981' : 'transparent' 
                      }
                    ]}>
                      {confirmChecked2 && (<Text style={styles.checkboxTick}>✓</Text>)}
                    </View>
                    <Text style={[styles.confirmText, { color: theme.text.primary }]}>
                      Je comprends que cette opération est irréversible.
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.outlineButton, { 
                        borderColor: isDark ? '#555' : '#d1d5db',
                        backgroundColor: isDark ? '#2a2a2a' : '#f9fafb'
                      }]}
                      onPress={() => {
                        if (deleting) return;
                        setShowDeleteConfirm(false);
                        setConfirmChecked(false);
                        setConfirmChecked2(false);
                      }}
                    >
                      <Text style={[styles.outlineButtonText, { color: theme.text.primary }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmDeleteButton}
                      disabled={!(confirmChecked && confirmChecked2) || deleting}
                      onPress={async () => {
                        if (!(confirmChecked && confirmChecked2) || deleting) return;
                        try {
                          setDeleting(true);
                          await deleteCurrentUserAccountAndData();
                          Alert.alert('Compte supprimé', 'Votre compte et vos données ont été supprimés.');
                          onClose();
                        } catch (e: any) {
                          if (e?.message === 'requires-recent-login') {
                            Alert.alert('Reconnexion requise', "Pour supprimer le compte, veuillez vous reconnecter puis réessayer.");
                          } else {
                            Alert.alert('Erreur', e?.message || 'Impossible de supprimer le compte.');
                          }
                        } finally {
                          setDeleting(false);
                        }
                      }}
                    >
                      <LinearGradient
                        colors={[(confirmChecked && confirmChecked2) ? '#ef4444' : '#ef444460', '#dc2626']}
                        style={styles.actionButtonGradient}
                      >
                        <Text style={styles.actionButtonText}>
                          {deleting ? 'Suppression…' : 'Confirmer'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'subscription':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              💳 Gestion de l'abonnement
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.text.secondary }]}>
              Gérez votre forfait et vos options d'abonnement
            </Text>
            <SubscriptionCard plan="ESSENTIEL" />
            <SubscriptionCard plan="PERFORMANCE" isActive={true} />
            <SubscriptionCard plan="PROFESSIONNEL" />
          </ScrollView>
        );

      case 'customization':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              🎨 Personnalisation
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.text.secondary }]}>
              Personnalisez votre assistant IA en fournissant des informations sur votre contexte.
            </Text>
            
            <CustomTextArea
              label="🏢 Contexte professionnel"
              field="professionalContext"
              placeholder="Décrivez votre domaine d'activité, votre poste..."
            />
            
            <CustomTextArea
              label="🏭 Présentation de l'entreprise"
              field="companyPresentation"
              placeholder="Présentez votre entreprise, secteur, taille..."
            />
            
            <CustomTextArea
              label="💡 Cas d'usage"
              field="useCases"
              placeholder="Comment comptez-vous utiliser l'assistant ?"
            />
            
            <CustomTextArea
              label="🎯 Objectifs"
              field="objectives"
              placeholder="Quels sont vos objectifs avec cet outil ?"
            />
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                Alert.alert('✅ Succès', 'Personnalisation sauvegardée avec succès !');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.actionButtonGradient}
                start={[0, 0]}
                end={[1, 0]}
              >
                <Text style={styles.actionButtonIcon}>💾</Text>
                <Text style={styles.actionButtonText}>Sauvegarder</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView edges={['top','bottom']} style={[styles.modalOverlay, { backgroundColor: theme.backgrounds.primary }]}>
        <View style={styles.modalContent}>
          {/* Header moderne */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#333' : '#e5e7eb' }]}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={isDark ? ['#8b5cf6', '#a78bfa'] : ['#6366f1', '#8b5cf6']}
                style={styles.titleGradient}
                start={[0, 0]}
                end={[1, 0]}
              >
                <Text style={styles.modalTitle}>Mon Profil</Text>
              </LinearGradient>
              <Text style={[styles.modalSubtitle, { color: theme.text.secondary }]}>
                Gérez votre compte et vos préférences
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.closeButton, { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }]}
            >
              <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs modernes */}
          <View style={[styles.tabsContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa' }]}>
            {[
              { key: 'account', label: 'Compte', icon: '👤' },
              { key: 'subscription', label: 'Abonnement', icon: '💳' },
              { key: 'customization', label: 'Personnalisation', icon: '🎨' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
                onPress={() => setActiveTab(tab.key as TabType)}
                activeOpacity={0.8}
              >
                {activeTab === tab.key ? (
                  <LinearGradient
                    colors={isDark ? ['#8b5cf6', '#a78bfa'] : ['#6366f1', '#8b5cf6']}
                    style={styles.tabGradient}
                    start={[0, 0]}
                    end={[1, 0]}
                  >
                    <Text style={styles.tabIcon}>{tab.icon}</Text>
                    <Text style={styles.activeTabText}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.inactiveTab}>
                    <Text style={[styles.tabIcon, { opacity: 0.6 }]}>{tab.icon}</Text>
                    <Text style={[styles.inactiveTabText, { color: theme.text.secondary }]}>
                      {tab.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {renderTabContent()}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
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
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 44,
  },
  activeTabButton: {},
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  inactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  tabIcon: {
    fontSize: 16,
  },
  activeTabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  inactiveTabText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  
  accountInfo: {
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoItem: {
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  modernToggle: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIcon: {
    fontSize: 24,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  subscriptionCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  popularLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  
  customizationField: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  customTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  wordCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '500',
  },
  
  // Confirmation de suppression modernisée
  confirmCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  confirmDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  confirmText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
});