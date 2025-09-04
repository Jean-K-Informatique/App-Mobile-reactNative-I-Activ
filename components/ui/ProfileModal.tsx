import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { deleteCurrentUserAccountAndData } from '../../services/accountService';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { theme, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmChecked2, setConfirmChecked2] = useState(false);

  const handleDeleteAccount = async () => {
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb' }]}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Mon Profil</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section Informations personnelles */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Informations personnelles</Text>
            
            <View style={[styles.infoItem, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                {user?.email || 'Non défini'}
              </Text>
            </View>
            
            <View style={[styles.infoItem, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Nom</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                {user?.displayName || 'Non défini'}
              </Text>
            </View>
            
            <View style={[styles.infoItem, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Membre depuis</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                {user?.metadata.creationTime ? 
                  new Date(user.metadata.creationTime).toLocaleDateString('fr-FR') : 
                  'Non défini'
                }
              </Text>
            </View>
          </View>

          {/* Section Actions du compte */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Actions du compte</Text>
            
            <TouchableOpacity 
              style={[
                styles.actionItem,
                { borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb' }
              ]}
              onPress={() => {
                onClose();
                signOut();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <Text style={styles.actionIcon}>🚪</Text>
                <Text style={[styles.actionTitle, { color: theme.text.primary }]}>
                  Déconnexion
                </Text>
              </View>
              <Text style={[styles.chevron, { color: theme.text.secondary }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Section Suppression de compte */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Zone de danger</Text>
            
            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={[
                  styles.actionItem,
                  styles.dangerItem,
                  { borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb' }
                ]}
                disabled={deleting}
                onPress={() => setShowDeleteConfirm(true)}
                activeOpacity={0.7}
              >
                <View style={styles.actionLeft}>
                  <Text style={styles.actionIcon}>🗑️</Text>
                  <Text style={[styles.actionTitle, { color: '#ef4444' }]}>
                    Supprimer mon compte
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: '#ef4444' }]}>›</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.confirmCard, { 
                backgroundColor: isDark ? '#2a1a1a' : '#fef2f2',
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
                  activeOpacity={0.7}
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
                  activeOpacity={0.7}
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
                    style={[styles.cancelButton, { 
                      borderColor: isDark ? '#555' : '#d1d5db',
                      backgroundColor: isDark ? '#2a2a2a' : '#f9fafb'
                    }]}
                    onPress={() => {
                      if (deleting) return;
                      setShowDeleteConfirm(false);
                      setConfirmChecked(false);
                      setConfirmChecked2(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.text.primary }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      { 
                        backgroundColor: (confirmChecked && confirmChecked2) ? '#ef4444' : '#ef444460',
                        opacity: (confirmChecked && confirmChecked2) ? 1 : 0.6
                      }
                    ]}
                    disabled={!(confirmChecked && confirmChecked2) || deleting}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.confirmButtonText}>
                      {deleting ? 'Suppression…' : 'Confirmer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  actionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  confirmCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  confirmDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
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
    marginTop: 16,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});