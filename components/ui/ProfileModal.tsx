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
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SUBSCRIPTION_PLANS } from '../../constants/themes';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'account' | 'subscription' | 'customization';

const MAX_WORDS = 150;

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
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
      <View style={[styles.customizationField, { backgroundColor: theme.backgrounds.tertiary + '30' }]}>
        <Text style={[styles.fieldLabel, { color: theme.text.primary }]}>{label}</Text>
        <TextInput
          style={[
            styles.customTextArea,
            {
              backgroundColor: 'transparent',
              borderColor: isAtLimit ? '#ef4444' + '70' : theme.borders.primary,
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
        { backgroundColor: theme.backgrounds.tertiary + '30' }
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
            Populaire
          </Text>
        )}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.accountInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                Mon profil
              </Text>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                  {user?.email || 'Non défini'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Nom</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                  {user?.displayName || 'Non défini'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Membre depuis</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                  {user?.metadata.creationTime ? 
                    new Date(user.metadata.creationTime).toLocaleDateString('fr-FR') : 
                    'Non défini'
                  }
                </Text>
              </View>

              {/* Mode clair/sombre */}
              <TouchableOpacity 
                style={[styles.themeToggle, { backgroundColor: theme.backgrounds.tertiary }]}
                onPress={toggleTheme}
              >
                <Text style={[styles.themeToggleText, { color: theme.text.primary }]}>
                  {isDark ? '☀️' : '🌙'} Mode {isDark ? 'clair' : 'sombre'}
                </Text>
              </TouchableOpacity>

              {/* Bouton de déconnexion */}
              <TouchableOpacity 
                style={[styles.logoutButton, { backgroundColor: '#ef4444' }]}
                onPress={() => {
                  onClose();
                  signOut();
                }}
              >
                <Text style={styles.logoutButtonText}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'subscription':
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Gestion de l'abonnement
            </Text>
            <SubscriptionCard plan="ESSENTIEL" />
            <SubscriptionCard plan="PERFORMANCE" isActive={true} />
            <SubscriptionCard plan="PROFESSIONNEL" />
          </ScrollView>
        );

      case 'customization':
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Personnalisation
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.text.secondary }]}>
              Personnalisez votre assistant en fournissant des informations sur votre contexte professionnel.
            </Text>
            
            <CustomTextArea
              label="Contexte professionnel"
              field="professionalContext"
              placeholder="Décrivez votre domaine d'activité, votre poste..."
            />
            
            <CustomTextArea
              label="Présentation de l'entreprise"
              field="companyPresentation"
              placeholder="Présentez votre entreprise, secteur, taille..."
            />
            
            <CustomTextArea
              label="Cas d'usage"
              field="useCases"
              placeholder="Comment comptez-vous utiliser l'assistant ?"
            />
            
            <CustomTextArea
              label="Objectifs"
              field="objectives"
              placeholder="Quels sont vos objectifs avec cet outil ?"
            />
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#1d9bf0' }]}
              onPress={() => {
                Alert.alert('Succès', 'Personnalisation sauvegardée !');
              }}
            >
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
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
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgrounds.secondary }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
              Mon Profil
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {[
              { key: 'account', label: 'Compte' },
              { key: 'subscription', label: 'Abonnement' },
              { key: 'customization', label: 'Personnalisation' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab.key as TabType)}
              >
                <Text style={[
                  styles.tabButtonText,
                  {
                    color: activeTab === tab.key ? theme.text.primary : theme.text.secondary,
                  }
                ]}>
                  {tab.label}
                </Text>
                {activeTab === tab.key && (
                  <View style={[styles.tabIndicator, { backgroundColor: '#a78bfa' }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {renderTabContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    maxWidth: '90%',
    maxHeight: '90%',
    width: 500,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    position: 'relative',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  accountInfo: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
  },
  subscriptionCard: {
    borderRadius: 12,
    padding: 24,
    marginVertical: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  popularLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  customizationField: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  customTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 20,
  },
  wordCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  themeToggle: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  themeToggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 