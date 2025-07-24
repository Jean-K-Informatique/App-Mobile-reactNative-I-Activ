import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileModal from './ui/ProfileModal';
import { HomeIcon, HistoryIcon, UserIcon } from './icons/SvgIcons';

interface SidebarProps {
  expanded: boolean;
  onClose: () => void;
  onAssistantChange: (assistant: string) => void;
}

export default function Sidebar({ expanded, onClose, onAssistantChange }: SidebarProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAssistantMenu, setShowAssistantMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [assistants, setAssistants] = useState<string[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState('Assistant dev Marc Annezo');
  const [loading, setLoading] = useState(false);

  // Récupération des assistants depuis Firebase
  useEffect(() => {
    if (user?.uid) {
      fetchAssistants();
    }
  }, [user?.uid]);

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      console.log('Récupération des assistants pour l\'utilisateur:', user?.uid);
      
      // Utiliser la même requête que chatService.ts qui fonctionne
      const chatsQuery = query(
        collection(db, 'chats'),
        where('allowedUsers', 'array-contains', user?.uid) // CORRECTION: allowedUsers au lieu de userId
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      const assistantNames: string[] = [];
      const chatTitles: string[] = [];
      
      console.log(`${querySnapshot.size} chats trouvés`);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Chat trouvé:', {
          id: doc.id,
          name: data.name,
          assistantName: data.assistantName,
          title: data.title,
          model: data.model
        });
        
        // Récupérer le nom de l'assistant depuis les données du chat
        // Essayer plusieurs champs possibles selon votre structure de données
        const assistantName = data.name || data.assistantName || data.title || data.model || 'Assistant';
        
        if (assistantName && !assistantNames.includes(assistantName)) {
          assistantNames.push(assistantName);
        }
        
        // Aussi collecter les titres pour debug
        if (data.title && !chatTitles.includes(data.title)) {
          chatTitles.push(data.title);
        }
      });
      
      console.log('Assistants trouvés:', assistantNames);
      console.log('Titres de chats:', chatTitles);
      
      // Si aucun assistant trouvé, utiliser l'assistant par défaut
      if (assistantNames.length === 0) {
        console.log('Aucun assistant trouvé, utilisation de l\'assistant par défaut');
        assistantNames.push('Assistant dev Marc Annezo');
      }
      
      setAssistants(assistantNames);
      
      // Définir le premier assistant comme assistant actuel si ce n'est pas déjà fait
      if (assistantNames.length > 0 && !assistantNames.includes(currentAssistant)) {
        setCurrentAssistant(assistantNames[0]);
        onAssistantChange(assistantNames[0]);
      }
      
    } catch (error: any) {
      console.error('Erreur lors de la récupération des assistants:', error);
      console.error('Code d\'erreur:', error.code);
      console.error('Message:', error.message);
      
      // En cas d'erreur de permissions, utiliser une solution temporaire
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        console.log('Problème de permissions Firebase - utilisation de l\'assistant par défaut');
        setAssistants(['Assistant dev Marc Annezo']);
        alert('Problème de permissions Firebase. Contactez l\'administrateur pour configurer les règles de sécurité.');
      } else {
        // Autres erreurs
        setAssistants(['Assistant dev Marc Annezo']);
      }
    } finally {
      setLoading(false);
    }
  };

  const logoSource = () => {
    if (expanded) {
      return isDark 
        ? require('../assets/mobile-assets/LogoSombreTexteClairCote.png')
        : require('../assets/mobile-assets/LogoSombreTexteClaire2.png');
    } else {
      return isDark 
        ? require('../assets/mobile-assets/LogoSombre.png')
        : require('../assets/mobile-assets/LogoClair.png');
    }
  };

  const handleAssistantSelect = (assistant: string) => {
    setCurrentAssistant(assistant);
    onAssistantChange(assistant);
    setShowAssistantMenu(false);
  };

  const handleNewChat = () => {
    if (loading) return; // Éviter de déclencher pendant le chargement
    setShowAssistantMenu(!showAssistantMenu);
  };

  if (!expanded) {
    return null;
  }

  return (
    <>
      <View style={[
        styles.container,
        {
          backgroundColor: theme.backgrounds.secondary,
          borderRightColor: theme.borders.sidebar,
          paddingTop: insets.top, // Respect de la SafeArea
        }
      ]}>
        {/* Header avec logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={logoSource()}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Bouton Nouveau Chat */}
        <TouchableOpacity
          style={[styles.newChatButton, { backgroundColor: theme.backgrounds.primary }]}
          onPress={handleNewChat}
        >
          <Text style={[styles.newChatText, { color: theme.text.primary }]}>Nouveau Chat</Text>
        </TouchableOpacity>

        {/* Menu sélection assistant */}
        {showAssistantMenu && (
          <View style={[styles.assistantMenu, { backgroundColor: theme.backgrounds.tertiary }]}>
            <Text style={[styles.menuTitle, { color: theme.text.primary }]}>
              Choisir un assistant
            </Text>
            {loading ? (
              <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
                Chargement des assistants...
              </Text>
            ) : (
              <ScrollView style={styles.assistantList}>
                {assistants.map((assistant, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.assistantItem,
                      currentAssistant === assistant && { backgroundColor: theme.backgrounds.primary }
                    ]}
                    onPress={() => handleAssistantSelect(assistant)}
                  >
                    <Text style={[styles.assistantText, { color: theme.text.primary }]}>
                      {assistant}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Navigation principale - Liste des conversations */}
        <ScrollView style={styles.navigation}>
          <TouchableOpacity style={styles.navButton}>
            <HistoryIcon size={18} />
            <Text style={[styles.navText, { color: theme.text.primary }]}>Historique</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Section inférieure */}
        <View style={styles.bottomSection}>
          {/* Menu Mon Compte */}
          {showAccountMenu && (
            <View style={[styles.accountMenuVisible, { backgroundColor: theme.backgrounds.tertiary }]}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setShowAccountMenu(false);
                  setShowProfileModal(true);
                }}
              >
                <Text style={[styles.menuItemText, { color: theme.text.primary }]}>Mon profil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
                <Text style={[styles.menuItemText, { color: theme.text.primary }]}>
                  Mode {isDark ? 'clair' : 'sombre'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setShowAccountMenu(false);
                  signOut();
                }}
              >
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bouton Mon Compte */}
          <TouchableOpacity
            style={[styles.accountButton, { backgroundColor: theme.backgrounds.primary }]}
            onPress={() => setShowAccountMenu(!showAccountMenu)}
          >
            <UserIcon size={18} />
            <Text style={[styles.accountText, { color: theme.text.primary }]}>Mon Compte</Text>
          </TouchableOpacity>


        </View>
      </View>

      {/* Modal de profil */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    borderRightWidth: 0.5,
    zIndex: 50,
    paddingVertical: 16,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  newChatButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  assistantMenu: {
    margin: 16,
    borderRadius: 8,
    padding: 16,
    maxHeight: 200,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  assistantList: {
    maxHeight: 120,
  },
  assistantItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  assistantText: {
    fontSize: 14,
  },
  navigation: {
    flex: 1,
    paddingHorizontal: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  navText: {
    marginLeft: 12,
    fontSize: 14,
  },
  bottomSection: {
    paddingHorizontal: 16,
  },
  accountMenuVisible: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemText: {
    marginLeft: 8,
    fontSize: 14,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  accountText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  logo: {
    width: 160,
    height: 40,
    maxWidth: '100%',
  },
}); 