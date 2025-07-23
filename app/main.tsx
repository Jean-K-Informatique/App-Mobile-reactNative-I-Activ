import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import ChatHeader from '../components/ChatHeader';

const { width: screenWidth } = Dimensions.get('window');

export default function MainScreen() {
  const { theme } = useTheme();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [currentAssistant, setCurrentAssistant] = useState('Assistant dev Marc Annezo');

  const handleResetChat = () => {
    // Logique de réinitialisation du chat à implémenter
    console.log('Réinitialisation du chat');
  };

  const handleSaveChat = () => {
    // Logique de sauvegarde du chat à implémenter
    console.log('Sauvegarde du chat');
  };

  const handleToggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <View style={styles.content}>
        {/* Interface principale */}
        <View style={styles.mainContent}>
          {/* Barre d'en-tête */}
          <ChatHeader
            currentAssistant={currentAssistant}
            onReset={handleResetChat}
            onSave={handleSaveChat}
            onToggleSidebar={handleToggleSidebar}
          />
          
          {/* Interface de chat */}
          <ChatInterface />
        </View>

        {/* Sidebar en overlay */}
        <Sidebar 
          expanded={sidebarExpanded}
          onClose={() => setSidebarExpanded(false)}
          onAssistantChange={setCurrentAssistant}
        />

        {/* Overlay sombre quand sidebar ouverte */}
        {sidebarExpanded && (
          <View 
            style={styles.overlay} 
            onTouchStart={() => setSidebarExpanded(false)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 40,
  },
}); 