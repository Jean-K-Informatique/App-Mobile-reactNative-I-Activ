import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function HomeScreen() {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();

  // Redirection automatique selon l'état d'authentification
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        console.log('Utilisateur connecté, redirection vers widgets');
        router.replace('/widgets');
      } else {
        console.log('Utilisateur non connecté, redirection vers login');
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading]);

  // Écran de chargement pendant la vérification de l'auth
  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
          Vérification de l'authentification...
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