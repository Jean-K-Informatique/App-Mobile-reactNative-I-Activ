import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, User } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserChats, type Chat } from '../../services/chatService';
import { useRouter } from 'expo-router';
import Button from '@/components/ui/Button';

export default function HomeScreen() {
  const { user, signOut, isAuthenticated } = useAuth();
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  // Rediriger vers login si pas connecté
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  // Charger les chats une seule fois quand l'utilisateur est connecté
  useEffect(() => {
    let mounted = true;
    
    const loadUserChats = async () => {
      if (!isAuthenticated || !user) return;
      
      setLoading(true);
      setError(null);
      try {
        const userChats = await fetchUserChats();
        if (mounted) {
          setChats(userChats);
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
          setError(errorMessage);
          console.error('Erreur lors du chargement des chats:', errorMessage);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (isAuthenticated && user) {
      loadUserChats();
    }

    return () => { mounted = false; };
  }, [isAuthenticated, user?.uid]); // Seulement quand l'auth change VRAIMENT

  // Fonction pour recharger les chats
  const refetch = async () => {
    if (!isAuthenticated || !user) return;
    
    setLoading(true);
    setError(null);
    try {
      const userChats = await fetchUserChats();
      setChats(userChats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors du rechargement des chats:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChatPress = (chat: Chat) => {
    console.log('Chat sélectionné:', chat.name);
    // TODO: Navigation vers l'écran de chat
    router.push(`/chat/${chat.id}`);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.chatIcon}>
        <MessageCircle size={24} color="#007AFF" />
      </View>
      <View style={styles.chatContent}>
        <Text style={styles.chatName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.chatDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.chatModel}>
          {item.model || 'Modèle non spécifié'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top','bottom']} style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Vérification de l'authentification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top','bottom']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <User size={24} color="#007AFF" />
          <Text style={styles.userName}>
            {user?.displayName || user?.email || 'Utilisateur'}
          </Text>
        </View>
        <Button
          title="Déconnexion"
          onPress={handleSignOut}
          variant="outline"
          size="small"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Mes Assistants IA</Text>
        
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Chargement des chats...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Erreur: {error}</Text>
            <Button
              title="Réessayer"
              onPress={refetch}
              variant="primary"
              size="medium"
            />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.centerContent}>
            <MessageCircle size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Aucun assistant disponible</Text>
            <Text style={styles.emptySubtext}>
              Vous n'avez accès à aucun assistant IA pour le moment.
            </Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refetch} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  chatDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  chatModel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});