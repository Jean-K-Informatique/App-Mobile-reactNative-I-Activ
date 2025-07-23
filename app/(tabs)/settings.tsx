import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, Alert } from 'react-native';
import { 
  Bell, 
  Shield, 
  Moon, 
  Globe, 
  CircleHelp as HelpCircle, 
  Info,
  ChevronRight 
} from 'lucide-react-native';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  const settingsOptions = [
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Gérer vos notifications',
      hasSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled,
    },
    {
      icon: Moon,
      title: 'Mode sombre',
      subtitle: 'Activer le thème sombre',
      hasSwitch: true,
      switchValue: darkModeEnabled,
      onSwitchChange: setDarkModeEnabled,
    },
    {
      icon: Shield,
      title: 'Confidentialité',
      subtitle: 'Paramètres de confidentialité',
      onPress: () => Alert.alert('Confidentialité', 'Paramètres de confidentialité'),
    },
    {
      icon: Globe,
      title: 'Langue',
      subtitle: 'Français',
      onPress: () => Alert.alert('Langue', 'Sélection de la langue'),
    },
    {
      icon: HelpCircle,
      title: 'Aide',
      subtitle: 'FAQ et support',
      onPress: () => Alert.alert('Aide', 'Centre d\'aide'),
    },
    {
      icon: Info,
      title: 'À propos',
      subtitle: 'Version 1.0.0',
      onPress: () => Alert.alert('À propos', 'Application React Native v1.0.0'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <View style={styles.settingsSection}>
        {settingsOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.settingItem}
            onPress={option.onPress}
            disabled={option.hasSwitch}
          >
            <View style={styles.settingIcon}>
              <option.icon size={24} color="#6B7280" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{option.title}</Text>
              <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
            </View>
            {option.hasSwitch ? (
              <Switch
                value={option.switchValue}
                onValueChange={option.onSwitchChange}
                trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            ) : (
              <ChevronRight size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Développé avec ❤️ en React Native
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  settingsSection: {
    flex: 1,
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});