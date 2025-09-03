import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

function MathsRedirectScreen() {
  const { theme } = useTheme();

  // Redirection immédiate vers l'interface unifiée
  useEffect(() => {
    router.replace('/maths-unified');
  }, []);

  // Écran de chargement pendant la redirection
  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
          Chargement de l'assistant mathématiques...
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MathsRedirectScreen;
