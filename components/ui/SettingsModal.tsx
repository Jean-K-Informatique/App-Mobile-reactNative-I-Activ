import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenLegalPage: (pageType: 'privacy' | 'terms' | 'legal' | 'cookies') => void;
}

export default function SettingsModal({ visible, onClose, onOpenLegalPage }: SettingsModalProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  const legalOptions = [
    {
      id: 'privacy' as const,
      title: 'Politique de confidentialité',
      icon: '🔒',
    },
    {
      id: 'terms' as const,
      title: 'Conditions générales d\'utilisation',
      icon: '📄',
    },
    {
      id: 'legal' as const,
      title: 'Mentions légales',
      icon: '⚖️',
    },
    {
      id: 'cookies' as const,
      title: 'Politique en matière de cookies',
      icon: '🍪',
    },
  ];

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
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Réglages</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section Apparence */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Apparence</Text>
            
            <View style={[styles.settingItem, { borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb' }]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🌙</Text>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text.primary }]}>
                    Mode sombre
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: theme.text.secondary }]}>
                    Activez le thème sombre pour réduire la fatigue oculaire
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#e5e7eb', true: '#007AFF' }}
                thumbColor={isDark ? '#ffffff' : '#ffffff'}
              />
            </View>
          </View>

          {/* Section Informations légales */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Informations légales</Text>
            
            {legalOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.settingItem,
                  { borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb' },
                  index === legalOptions.length - 1 && styles.lastSettingItem
                ]}
                onPress={() => onOpenLegalPage(option.id)}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>{option.icon}</Text>
                  <Text style={[styles.settingTitle, { color: theme.text.primary }]}>
                    {option.title}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.text.secondary }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section À propos */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Application</Text>
            
            <View style={[styles.infoItem, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Version</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>1.0.0</Text>
            </View>
            
            <View style={[styles.infoItem, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Développé par</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>I-Activ</Text>
            </View>
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
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
  },
});
