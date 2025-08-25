import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import ChatHeader from '../components/ChatHeader';
import AssistantPickerModal from '../components/ui/AssistantPickerModal';
import type { Chat } from '../services/chatService';

const { width: screenWidth } = Dimensions.get('window');

export default function MainScreen() {
  const { theme } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [currentAssistant, setCurrentAssistant] = useState('Assistant dev Marc Annezo');
  const [assistantPickerVisible, setAssistantPickerVisible] = useState(false);
  const [loadConversationId, setLoadConversationId] = useState<string | null>(null);
  
  // Ref pour pouvoir déclencher le reset depuis le header
  const resetChatRef = useRef<((forceNew?: boolean) => void) | null>(null);
  // 🆕 Ref pour rafraîchir l'historique de la sidebar
  const refreshHistoryRef = useRef<(() => void) | null>(null);

  // Redirection si non authentifié
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[MainScreen] Utilisateur non authentifié, redirection vers login');
      router.replace('/login');
    }
  }, [isAuthenticated, loading]);

  const handleNewChat = () => {
    console.log('➕ Création d\'un nouveau chat avec:', currentAssistant);
    setLoadConversationId(null); // Reset du chargement de conversation
    if (resetChatRef.current) {
      resetChatRef.current(true); // force new
    } else {
      console.warn('⚠️ Fonction de reset non disponible');
    }
  };

  const handleToggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleConversationLoad = (conversationId: string, assistantName: string) => {
    console.log('📝 Chargement conversation:', { conversationId, assistantName });
    
    // Changer l'assistant si nécessaire
    if (assistantName !== currentAssistant) {
      setCurrentAssistant(assistantName);
    }
    
    // Déclencher le chargement de la conversation
    setLoadConversationId(conversationId);
  };

  // 🆕 Fonction pour rafraîchir l'historique
  const handleNewConversationCreated = () => {
    console.log('🔄 Rafraîchissement historique suite à nouvelle conversation');
    if (refreshHistoryRef.current) {
      refreshHistoryRef.current();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <View style={styles.content}>
        {/* Interface principale */}
        <View style={styles.mainContent}>
          {/* Barre d'en-tête */}
          <ChatHeader
            currentAssistant={currentAssistant}
            onNewChat={handleNewChat}
            onToggleSidebar={handleToggleSidebar}
            onOpenAssistantPicker={() => setAssistantPickerVisible(true)}
          />
          
          {/* Interface de chat */}
          <ChatInterface 
            currentAssistant={currentAssistant}
            onResetRequest={resetChatRef}
            loadConversationId={loadConversationId}
            onConversationLoaded={() => setLoadConversationId(null)}
            onNewConversationCreated={handleNewConversationCreated}
          />

          {/* Modale de sélection d'assistant (respect des accès via fetchUserChats) */}
          <AssistantPickerModal
            visible={assistantPickerVisible}
            onClose={() => setAssistantPickerVisible(false)}
            onSelect={(chat: Chat) => {
              setAssistantPickerVisible(false);
              setCurrentAssistant(chat.name);
              // Reset conversation pour le nouvel assistant
              if (resetChatRef.current) {
                resetChatRef.current(true);
              }
            }}
          />
        </View>

        {/* Sidebar en overlay */}
        <Sidebar 
          expanded={sidebarExpanded}
          onClose={() => setSidebarExpanded(false)}
          onAssistantChange={setCurrentAssistant}
          onConversationLoad={handleConversationLoad}
          onRefreshRequest={refreshHistoryRef}
          onNewChat={handleNewChat} // Pass the new chat handler
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
    position: 'relative',
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