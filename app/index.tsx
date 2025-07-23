import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const { isAuthenticated, loading } = useAuth();

  // Redirection automatique selon l'état d'authentification
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        console.log('Utilisateur connecté, redirection vers les onglets');
        router.replace('/(tabs)');
      } else {
        console.log('Utilisateur non connecté, redirection vers login');
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading]);

  // Écran de chargement pendant la vérification de l'auth
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          Vérification de l'authentification...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});