import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Constants from 'expo-constants';
import ProfileModal from './ui/ProfileModal';
import { HomeIcon, HistoryIcon, UserIcon } from './icons/SvgIcons';
import Svg, { Path } from 'react-native-svg';
import { 
  getUserConversations, 
  deleteConversation,
  updateConversationTitle,
  getConversationMessages,
  type Conversation 
} from '../services/conversationService';

interface SidebarProps {
  expanded: boolean;
  onClose: () => void;
  onAssistantChange: (assistant: string) => void;
  onConversationLoad?: (conversationId: string, assistantName: string) => void;
  onRefreshRequest?: React.MutableRefObject<(() => void) | null>; // 🆕
  onNewChat?: () => void; // New prop to trigger new chat
}

// Icône de recherche
function SearchIcon({ size = 20, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M21 21L15 15L21 21ZM17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function Sidebar({ expanded, onClose, onAssistantChange, onConversationLoad, onRefreshRequest, onNewChat }: SidebarProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAssistantMenu, setShowAssistantMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assistants, setAssistants] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState('Assistant IA');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true); // 🆕 Différencier premier chargement
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const logoSource = () => {
    return isDark 
      ? require('../assets/mobile-assets/LogoClair.png')
      : require('../assets/mobile-assets/LogoSombre.png');
  };

  // Récupération des assistants depuis Firebase
  useEffect(() => {
    if (user?.uid) {
      fetchAssistants();
    }
  }, [user?.uid]);

  // Récupération des conversations au démarrage (plus besoin d'attendre un clic)
  useEffect(() => {
    if (user?.uid) {
      fetchConversations();
    }
  }, [user?.uid]);

  // 🆕 Mise à jour automatique de l'historique (réduite à 30 secondes)
  useEffect(() => {
    if (!user?.uid) return;

    const interval = setInterval(() => {
      fetchConversations();
    }, 30000); // 30 secondes au lieu de 10

    return () => clearInterval(interval);
  }, [user?.uid]);

  // 🆕 Refetch quand la sidebar s'ouvre
  useEffect(() => {
    if (expanded && user?.uid) {
      fetchConversations();
    }
  }, [expanded, user?.uid]);

  // 🆕 Exposer fetchConversations via la ref
  useEffect(() => {
    if (onRefreshRequest) {
      onRefreshRequest.current = fetchConversations;
    }
  }, [onRefreshRequest]);

  // Filtrage des conversations en temps réel avec recherche dans tous les messages
  useEffect(() => {
    const performSearch = async () => {
      const queryText = searchQuery.trim().toLowerCase();
      if (queryText === '') {
        setFilteredConversations(conversations);
        return;
      }

      setIsSearching(true);

      try {
        const quickFiltered = conversations.filter(conv =>
          conv.title.toLowerCase().includes(queryText) ||
          (conv.lastMessage?.toLowerCase() || '').includes(queryText)
        );

        const remaining = conversations.filter(c => !quickFiltered.find(q => q.id === c.id));
        const matchesIds: Set<string> = new Set(quickFiltered.map(c => c.id));

        await Promise.all(remaining.map(async (conv) => {
          try {
            const msgs = await getConversationMessages(conv.id);
            const found = msgs.some(m => (m.text || '').toLowerCase().includes(queryText));
            if (found) {
              matchesIds.add(conv.id);
            }
          } catch {}
        }));

        setFilteredConversations(conversations.filter(c => matchesIds.has(c.id)));
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [conversations, searchQuery]);

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      console.log('🔍 Récupération des assistants pour l\'utilisateur:', user?.uid);
      
      const chatsQuery = query(
        collection(db, 'chats'),
        where('allowedUsers', 'array-contains', user?.uid)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      const assistantNames: string[] = [];
      
      console.log(`✅ ${querySnapshot.size} chats trouvés`);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const assistantName = data.name || data.assistantName || data.title || data.model || 'Assistant';
        
        if (assistantName && !assistantNames.includes(assistantName)) {
          assistantNames.push(assistantName);
        }
      });
      
      // ✅ Free tier en fallback si aucune autorisation
      const FREE_CHAT_ID = (process.env.EXPO_PUBLIC_FREE_CHAT_ID || 
                           Constants.expoConfig?.extra?.EXPO_PUBLIC_FREE_CHAT_ID) as string | undefined;
      if (assistantNames.length === 0 && FREE_CHAT_ID) {
        try {
          const freeRef = collection(db, 'chats');
          const snap = await getDocs(query(freeRef, where('isGlobalAccess', '==', true)));
          snap.forEach((d) => {
            if (d.id === FREE_CHAT_ID) {
              const data = d.data();
              const name = data.name || data.assistantName || 'Assistant';
              assistantNames.push(name);
            }
          });
        } catch {}
      }
      
      console.log('📋 Assistants trouvés:', assistantNames);
      
      if (assistantNames.length === 0) {
        console.log('⚠️ Aucun assistant trouvé, utilisation de l\'assistant par défaut');
        assistantNames.push('Assistant IA');
      }
      
      setAssistants(assistantNames);
      
      if (assistantNames.length > 0 && !assistantNames.includes(currentAssistant)) {
        setCurrentAssistant(assistantNames[0]);
        onAssistantChange(assistantNames[0]);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des assistants:', error);
      console.log('⚠️ Problème de permissions Firebase - utilisation de l\'assistant par défaut');
      setAssistants(['Assistant IA']);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      // Montrer le loading seulement au premier chargement
      if (isFirstLoad) {
        setLoadingConversations(true);
      }
      
      const fetchedConversations = await getUserConversations();
      setConversations(fetchedConversations);
      
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    } catch (error) {
      console.error('❌ Erreur récupération conversations sidebar:', error);
      setConversations([]);
    } finally {
      if (loadingConversations) {
        setLoadingConversations(false);
      }
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    console.log('📝 Sélection conversation:', conversation.title);
    
    // Changer d'assistant si nécessaire
    if (conversation.assistantName !== currentAssistant) {
      setCurrentAssistant(conversation.assistantName);
      onAssistantChange(conversation.assistantName);
    }
    
    // Charger la conversation si le callback est fourni
    if (onConversationLoad) {
      onConversationLoad(conversation.id, conversation.assistantName);
    }
    
    onClose(); // Fermer la sidebar
  };

  const handleDeleteConversation = async (conversationId: string, event?: any) => {
    if (event?.stopPropagation) event.stopPropagation();
    try {
      await deleteConversation(conversationId);
      await fetchConversations();
      setOpenMenuId(null);
      console.log('✅ Conversation supprimée');
    } catch (error) {
      console.error('❌ Erreur suppression conversation:', error);
      alert('Impossible de supprimer la conversation');
    }
  };

  const handleOpenMenu = (conversationId: string, event: any) => {
    event.stopPropagation();
    setOpenMenuId(prev => prev === conversationId ? null : conversationId);
  };

  const handleOpenRename = (conversationId: string, currentTitle: string) => {
    setRenameConversationId(conversationId);
    setRenameDraft(currentTitle);
    setShowRenameModal(true);
    setOpenMenuId(null);
  };

  const handleConfirmRename = async () => {
    if (!renameConversationId) return;
    const newTitle = renameDraft.trim();
    if (newTitle.length === 0) {
      setShowRenameModal(false);
      return;
    }
    try {
      await updateConversationTitle(renameConversationId, newTitle);
      await fetchConversations();
    } catch (e) {
      console.error(e);
    } finally {
      setShowRenameModal(false);
      setRenameConversationId(null);
    }
  };

  const handleNewChat = () => {
    if (loading) return;
    setShowAssistantMenu(!showAssistantMenu);
  };

  const handleSearchToggle = () => {
    setSearchQuery('');
  };

  const formatConversationDate = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 24 * 7) {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      }
    } catch (error) {
      return '';
    }
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
          paddingTop: insets.top,
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
              <ActivityIndicator size="small" color={theme.text.secondary} />
            ) : (
              assistants.map((assistant, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.assistantItem}
                  onPress={() => {
                    setCurrentAssistant(assistant);
                    onAssistantChange(assistant);
                    setShowAssistantMenu(false);
                    if (onNewChat) {
                      onNewChat(); // Trigger new chat creation
                    }
                  }}
                >
                  <Text style={[styles.assistantText, { color: theme.text.primary }]}>
                    {assistant}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section Historique - Toujours visible */}
          <View style={styles.historySection}>
            {/* Header avec titre et bouton recherche */}
            <View style={styles.historyHeader}>
              <View style={styles.historyTitleContainer}>
                <HistoryIcon size={18} />
                <Text style={[styles.historyTitleText, { color: theme.text.primary }]}>Conversations</Text>
              </View>
              <TouchableOpacity style={styles.searchButton} onPress={handleSearchToggle}>
                <SearchIcon size={16} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Champ de recherche */}
            {showSearchInput && (
              <View style={[styles.searchContainer, { backgroundColor: theme.backgrounds.primary }]}> 
                <TextInput
                  style={[styles.searchInput, { color: theme.text.primary }]}
                  placeholder="Rechercher..."
                  placeholderTextColor={theme.text.secondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}

            {/* Liste des conversations */}
            <View style={styles.conversationsContainer}>
              {loadingConversations && conversations.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.text.secondary} />
                  <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
                    Chargement...
                  </Text>
                </View>
              ) : isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.text.secondary} />
                  <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Recherche...</Text>
                </View>
              ) : filteredConversations.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation sauvegardée'}
                </Text>
              ) : (
                filteredConversations.map((conversation) => (
                  <TouchableOpacity
                    key={conversation.id}
                    style={[
                      styles.conversationItem,
                      { borderBottomColor: theme.borders.primary },
                      openMenuId === conversation.id ? styles.conversationItemRaised : null,
                    ]}
                    onPress={openMenuId === conversation.id ? undefined : () => handleConversationSelect(conversation)}
                    activeOpacity={openMenuId === conversation.id ? 1 : 0.2}
                  >
                    <View style={styles.conversationHeader}>
                      <Text style={[styles.conversationTitle, { color: theme.text.primary }]} numberOfLines={1}>
                        {conversation.title}
                      </Text>
                      <View style={{ position: 'relative' }}>
                        <TouchableOpacity style={styles.moreButton} onPress={(event) => handleOpenMenu(conversation.id, event)}>
                          <Text style={[styles.moreIcon, { color: theme.text.primary }]}>⋯</Text>
                        </TouchableOpacity>
                        {openMenuId === conversation.id && (
                          <View style={[styles.itemMenu, { backgroundColor: theme.backgrounds.primary, borderColor: theme.borders.primary }]}> 
                            <TouchableOpacity style={styles.itemMenuBtn} onPress={(e) => { e.stopPropagation(); handleOpenRename(conversation.id, conversation.title); }}>
                              <Text style={[styles.itemMenuText, { color: theme.text.primary }]}>Renommer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.itemMenuBtn} onPress={(e) => handleDeleteConversation(conversation.id, e)}>
                              <Text style={[styles.itemMenuText, { color: '#ef4444' }]}>Supprimer</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.conversationDateCompact, { color: theme.text.secondary }]}>
                      {formatConversationDate(conversation.updatedAt)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
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

      {/* Modale renommer */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.renameModal, { backgroundColor: theme.backgrounds.secondary }]}> 
            <Text style={[styles.renameTitle, { color: theme.text.primary }]}>Renommer la conversation</Text>
            <View style={[styles.searchContainer, { backgroundColor: theme.backgrounds.primary, marginBottom: 12 }]}> 
              <TextInput
                style={[styles.searchInput, { color: theme.text.primary }]}
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder="Nouveau titre"
                placeholderTextColor={theme.text.secondary}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.modalBtn, { marginRight: 8 }]} onPress={() => setShowRenameModal(false)}>
                <Text style={{ color: theme.text.secondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleConfirmRename}>
                <Text style={{ color: theme.text.primary }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    zIndex: 60,
    paddingVertical: 16,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  logoContainer: {
    height: 40,
    justifyContent: 'center',
  },
  logo: {
    height: 30,
    width: 120,
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
  scrollContent: {
    flex: 1,
  },
  historySection: {
    paddingHorizontal: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitleText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchButton: {
    padding: 8,
    borderRadius: 6,
  },
  searchContainer: {
    marginBottom: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    paddingVertical: 8,
    fontSize: 14,
  },
  conversationsContainer: {
    paddingBottom: 20,
  },
  conversationItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderRadius: 8,
    marginBottom: 2,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  conversationTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  moreIcon: {
    fontSize: 20,
    lineHeight: 16,
  },
  itemMenu: {
    position: 'absolute',
    top: -6,
    right: 0,
    borderWidth: 0.5,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  conversationItemRaised: {
    zIndex: 90,
  },
  itemMenuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 140,
  },
  itemMenuText: {
    fontSize: 13,
  },
  conversationDateCompact: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  renameModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    padding: 18,
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assistantMenu: {
    marginHorizontal: 16,
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assistantItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assistantText: {
    fontSize: 14,
  },
  bottomSection: {
    paddingHorizontal: 16,
  },
  accountMenuVisible: {
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 14,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  accountText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
}); 