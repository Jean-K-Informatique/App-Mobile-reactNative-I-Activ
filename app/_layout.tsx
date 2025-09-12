import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

function AppContent() {
  const { isDark, theme } = require('../contexts/ThemeContext').useTheme();
  
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="account" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="main" />
        <Stack.Screen name="widgets" />
        <Stack.Screen name="orthographe" />
        <Stack.Screen name="traduction" />
        <Stack.Screen name="maths" />
        <Stack.Screen name="assistants/correction" />
        <Stack.Screen name="assistants/traduction" />
        <Stack.Screen name="assistants/chat-math" />
        <Stack.Screen name="assistants/resume" />
        <Stack.Screen name="assistants/cuisine" />
        <Stack.Screen name="resume" />
        <Stack.Screen name="cuisine" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar 
        style={isDark ? "light" : "dark"} 
        backgroundColor={isDark ? '#0f1115' : '#0f1115'}
      />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}