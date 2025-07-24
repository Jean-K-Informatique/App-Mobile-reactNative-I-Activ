import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import ChatHeader from '../components/ChatHeader';

const { width: screenWidth } = Dimensions.get('window');

export default function MainScreen() {
  const { theme } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [currentAssistant, setCurrentAssistant] = useState('Assistant dev Marc Annezo');
  
  // Ref pour pouvoir déclencher le reset depuis le header
  const resetChatRef = useRef<(() => void) | null>(null);

  // Redirection si non authentifié
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[MainScreen] Utilisateur non authentifié, redirection vers login');
      router.replace('/login');
    }
  }, [isAuthenticated, loading]);

  const handleResetChat = () => {
    console.log('🔄 Demande de réinitialisation du chat');
    if (resetChatRef.current) {
      resetChatRef.current();
    } else {
      console.warn('⚠️ Fonction de reset non disponible');
    }
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
            onToggleSidebar={handleToggleSidebar}
          />
          
          {/* Interface de chat */}
          <ChatInterface 
            currentAssistant={currentAssistant}
            onResetRequest={resetChatRef}
          />
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