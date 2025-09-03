import React, { memo, useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer, useSuckNavigator } from '../components/ScreenTransition';
import { useTheme } from '../contexts/ThemeContext';
import { UserIcon } from '../components/icons/SvgIcons';
import ProfileModal from '../components/ui/ProfileModal';
import { testGPT5ChatCompletions, sendMessageToGPT5ChatCompletions, ChatMessage } from '../services/openaiService';


const { width: screenWidth } = Dimensions.get('window');

type Tile = {
  id: string;
  title: string;
  subtitle: string;
  image: any;
  route: string;
  gradient: string[];
};

// Composant Tile mémorisé pour éviter les re-renders
const TileComponent = memo(({ tile, onPress }: { tile: Tile; onPress: (route: string) => void }) => {
  const { theme } = useTheme();
  const handlePress = useCallback(() => {
    onPress(tile.route);
  }, [tile.route, onPress]);

  return (
    <View style={styles.tileContainer}>
      <TouchableOpacity
        style={styles.tile}
        activeOpacity={0.85}
        onPress={handlePress}
      >
        <Image 
          source={tile.image} 
          style={styles.tileImageFull} 
          resizeMode="cover"
          fadeDuration={0}
          // Optimisations natives React Native
          cache="force-cache"
          loadingIndicatorSource={undefined}
        />
      </TouchableOpacity>
      
      {/* Titres sous la carte - Adaptatifs au thème */}
      <View style={styles.tileTextBelow}>
        <Text style={[styles.tileTitle, { color: theme.text.primary }]}>{tile.title}</Text>
        <Text style={[styles.tileSubtitle, { color: theme.text.secondary }]}>{tile.subtitle}</Text>
      </View>
    </View>
  );
});

TileComponent.displayName = 'TileComponent';

const TILES: Tile[] = [
  {
    id: 'chat',
    title: 'Chat IA',
    subtitle: 'Conversations intelligentes',
    image: require('../assets/images/chat-IA.png'),
    route: '/main',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    id: 'orthographe',
    title: 'Correction',
    subtitle: 'Perfectionner votre français',
    image: require('../assets/images/orthographe.png'),
    route: '/orthographe',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    id: 'cuisine',
    title: 'Cuisine',
    subtitle: 'Assistant recettes',
    image: require('../assets/images/cuisine.png'),
    route: '/cuisine',
    gradient: ['#f59e0b', '#d97706'],
  },
  {
    id: 'resume',
    title: 'Résumé',
    subtitle: 'Synthèse de textes',
    image: require('../assets/images/resume.png'),
    route: '/resume',
    gradient: ['#8b5cf6', '#7c3aed'],
  },
  {
    id: 'traduction',
    title: 'Traduction',
    subtitle: 'Traduire instantanément',
    image: require('../assets/images/traduction.png'),
    route: '/traduction',
    gradient: ['#4facfe', '#00f2fe'],
  },
  {
    id: 'maths',
    title: 'Calculatrice',
    subtitle: 'Assistant mathématiques',
    image: require('../assets/images/math.png'),
    route: '/maths-unified',
    gradient: ['#43e97b', '#38f9d7'],
  },
];

function WidgetsScreen() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isTestingGPT5, setIsTestingGPT5] = useState(false);

  // Test GPT-5 Chat Completions
  const handleTestGPT5 = async () => {
    console.log('🔥 TEST GPT-5 CLIQUÉ depuis widgets !');
    setIsTestingGPT5(true);
    try {
      const result = await testGPT5ChatCompletions();
      Alert.alert(
        '✅ GPT-5 Test Réussi !', 
        `Réponse: ${result.slice(0, 100)}${result.length > 100 ? '...' : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        '❌ Test GPT-5 Échoué', 
        `Erreur: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsTestingGPT5(false);
    }
  };

  const renderTile = useCallback((tile: Tile) => (
    <TileComponent key={tile.id} tile={tile} onPress={suckTo} />
  ), [suckTo]);

  // Logo adaptatif selon le thème
  const logoImage = useMemo(() => (
    <Image 
      source={isDark 
        ? require('../assets/images/LogoTexteBlanc.png')
        : require('../assets/images/LogoTexteNoir.png')
      } 
      style={styles.logoImage} 
      resizeMode="contain"
      fadeDuration={0}
      cache="force-cache"
    />
  ), [isDark]);

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}> 
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header avec même fond que la page */}
          <View style={styles.headerSection}>
            <View style={styles.headerContent}>
              {logoImage}
              <Text style={[styles.pageSubtitle, { color: theme.text.secondary }]}>Votre assistant intelligent</Text>
            </View>
          </View>

          {/* Grille moderne */}
          <View style={styles.grid}>
            {TILES.map(renderTile)}
          </View>
          
          {/* Footer décoratif */}
          <View style={styles.footerSection}>
            <Text style={[styles.footerText, { color: theme.text.secondary }]}>Tapez sur une carte pour commencer</Text>
          </View>
        </ScrollView>

        {/* Menu fixe en bas (style Instagram) - Version opaque */}
        <View style={[styles.bottomMenu, { 
          backgroundColor: isDark ? theme.backgrounds.primary : '#ffffff',
          borderTopColor: isDark ? '#2a2a2a' : '#e5e7eb'
        }]}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.7}
          >
            <UserIcon size={24} color={theme.text.primary} />
            <Text style={[styles.menuButtonText, { color: theme.text.primary }]}>
              Compte
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => {/* TODO: Actualités */}}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuIcon, { color: theme.text.primary }]}>📰</Text>
            <Text style={[styles.menuButtonText, { color: theme.text.primary }]}>
              Actualités
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => {/* TODO: Provisoire 1 */}}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuIcon, { color: theme.text.primary }]}>⭐</Text>
            <Text style={[styles.menuButtonText, { color: theme.text.primary }]}>
              Favoris
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleTestGPT5}
            activeOpacity={0.7}
            disabled={isTestingGPT5}
          >
            <Text style={[styles.menuIcon, { 
              color: isTestingGPT5 ? '#999' : '#007AFF',
              opacity: isTestingGPT5 ? 0.6 : 1 
            }]}>
              🧪
            </Text>
            <Text style={[styles.menuButtonText, { 
              color: isTestingGPT5 ? '#999' : '#007AFF',
              opacity: isTestingGPT5 ? 0.6 : 1 
            }]}>
              {isTestingGPT5 ? 'Test...' : 'GPT-5'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modale Profile */}
        <ProfileModal 
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      </ScreenContainer>
    </SafeAreaView>
  );
}

const gap = 12; // Réduit pour 6 widgets
const columns = 2;
const tileWidth = Math.floor((screenWidth - (gap * (columns + 1))) / columns);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: { 
    padding: gap,
    paddingTop: 24,
    paddingBottom: 100, // Espace pour le menu fixe
  },
  
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerContent: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    width: '100%',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  logoImage: {
    width: 200,
    height: 60,
    marginBottom: 8,
  },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: gap,
  },
  tileContainer: {
    width: tileWidth,
    marginBottom: gap,
  },
  tile: { 
    width: '100%',
    height: tileWidth * 1.0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8
  },
  tileImageFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  tileTextBelow: {
    paddingTop: 12,
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  tileSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },

  
  footerSection: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Menu fixe en bas (style Instagram) - Version compacte et opaque
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  menuButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  menuIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  menuButtonText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

});

// Exportation mémorisée du composant principal
export default memo(WidgetsScreen);