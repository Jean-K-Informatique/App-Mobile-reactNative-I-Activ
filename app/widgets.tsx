import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer, useSuckNavigator } from '../components/ScreenTransition';
import { useTheme } from '../contexts/ThemeContext';
import { getCachedImage } from '../utils/performance';


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
          source={getCachedImage(tile.image)} 
          style={styles.tileImageFull} 
          resizeMode="cover"
          fadeDuration={0} // Supprime l'animation de fade pour plus de fluidité
        />
      </TouchableOpacity>
      
      {/* Titres sous la carte */}
      <View style={styles.tileTextBelow}>
        <Text style={styles.tileTitle}>{tile.title}</Text>
        <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
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
    route: '/maths',
    gradient: ['#43e97b', '#38f9d7'],
  },
];

function WidgetsScreen() {
  const { theme, isDark } = useTheme();
  const suckTo = useSuckNavigator();

  const renderTile = useCallback((tile: Tile) => (
    <TileComponent key={tile.id} tile={tile} onPress={suckTo} />
  ), [suckTo]);

  // Mémoriser le logo pour éviter les re-renders
  const logoImage = useMemo(() => (
    <Image 
      source={getCachedImage(require('../assets/images/LogoTexteBlanc.png'))} 
      style={styles.logoImage} 
      resizeMode="contain"
      fadeDuration={0}
    />
  ), []);

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: '#0a0b0f' }]}> 
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header avec même fond que la page */}
          <View style={styles.headerSection}>
            <View style={styles.headerContent}>
              {logoImage}
              <Text style={styles.pageSubtitle}>Votre assistant intelligent</Text>
            </View>
          </View>

          {/* Grille moderne */}
          <View style={styles.grid}>
            {TILES.map(renderTile)}
          </View>
          
          {/* Footer décoratif */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>Tapez sur une carte pour commencer</Text>
          </View>
        </ScrollView>


      </ScreenContainer>
    </SafeAreaView>
  );
}

const gap = 16;
const columns = 2;
const tileWidth = Math.floor((screenWidth - (gap * (columns + 1))) / columns);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: { 
    padding: gap,
    paddingTop: 24,
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
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
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
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  tileSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
});

// Exportation mémorisée du composant principal
export default memo(WidgetsScreen);