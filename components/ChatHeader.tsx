import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { NavbarIcon } from './icons/SvgIcons';

interface ChatHeaderProps {
  currentAssistant: string;
  onNewChat: () => void; // Renommé de onReset à onNewChat
  onToggleSidebar: () => void;
  onOpenAssistantPicker?: () => void;
}

// Icône Plus pour nouveau chat
function PlusIcon({ size = 20, color }: { size?: number; color?: string }) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M12 2V22" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M2 12H22" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Icône Save
function SaveIcon({ size = 20, color }: { size?: number; color?: string }) {
  const { theme } = useTheme();
  const iconColor = color || theme.text.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M17 21V13H7V21" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M7 3V8H15" 
        stroke={iconColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ChatHeader({ currentAssistant, onNewChat, onToggleSidebar, onOpenAssistantPicker }: ChatHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      {/* Bouton hamburger à gauche */}
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={onToggleSidebar}
      >
        <NavbarIcon size={20} />
      </TouchableOpacity>

      {/* Nom de l'assistant (cliquable pour picker) */}
      <TouchableOpacity style={styles.assistantInfo} onPress={onOpenAssistantPicker}>
        <Text style={[styles.assistantName, { color: theme.text.primary }]}>
          {currentAssistant}
        </Text>
      </TouchableOpacity>

      {/* Boutons d'action */}
      <View style={styles.actions}>
        {/* Ouvrir sélection d'assistant */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.backgrounds.secondary }]}
          onPress={onOpenAssistantPicker}
        >
          <Text style={styles.actionIcon}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.backgrounds.secondary }]}
          onPress={onNewChat}
        >
          <PlusIcon size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    height: 60,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantInfo: {
    flex: 1,
    alignItems: 'center',
  },
  assistantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 16,
  },
}); 