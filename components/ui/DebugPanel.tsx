import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Clipboard } from 'react-native';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '../../services/firebaseConfig';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';

interface DebugResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export function DebugPanel() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Test 1: Configuration Expo
  const testExpoConfig = async () => {
    try {
      const config = {
        appOwnership: Constants.appOwnership,
        platform: Constants.platform,
        isExpoGo: Constants.appOwnership === 'expo',
        isDevice: Constants.isDevice,
        installationId: Constants.installationId,
      };

      addResult({
        test: 'Configuration Expo',
        status: 'success',
        message: 'Configuration récupérée',
        details: config
      });
    } catch (error) {
      addResult({
        test: 'Configuration Expo',
        status: 'error',
        message: 'Erreur configuration Expo',
        details: error
      });
    }
  };

  // Test 2: Redirect URI Generation
  const testRedirectUri = async () => {
    try {
      const uri1 = makeRedirectUri({ useProxy: false });
      const uri2 = makeRedirectUri({ useProxy: false, scheme: 'myapp' });
      const uri3 = makeRedirectUri({ useProxy: false, scheme: 'com.jeankiactiv.boltexponativewind' });

      addResult({
        test: 'Génération Redirect URI',
        status: 'success',
        message: 'URIs générés avec succès',
        details: {
          default: uri1,
          myapp: uri2,
          bundle: uri3
        }
      });
    } catch (error) {
      addResult({
        test: 'Génération Redirect URI',
        status: 'error',
        message: 'Erreur génération URI',
        details: error
      });
    }
  };

  // Test 3: Google Auth Hook Configuration
  const testGoogleAuthHook = async () => {
    try {
      const redirectUri = makeRedirectUri({ useProxy: false });
      
      // Test de la configuration sans utiliser le hook
      const config = {
        clientId: '741599469385-08a1ikm22jlrm3d756effve28c9967bu.apps.googleusercontent.com',
        iosClientId: '741599469385-2mvps552mdbu0fjimvim0qvti0jfrh5o.apps.googleusercontent.com',
        redirectUri,
        hasWebBrowser: !!WebBrowser,
        hasGoogle: !!Google,
      };

      addResult({
        test: 'Configuration Google Auth',
        status: 'success',
        message: 'Configuration Google disponible',
        details: config
      });
    } catch (error) {
      addResult({
        test: 'Configuration Google Auth',
        status: 'error',
        message: 'Erreur configuration Google Auth',
        details: error
      });
    }
  };

  // Test 4: Firebase Network Test
  const testFirebaseNetwork = async () => {
    try {
      // Test de connexion Firebase simple
      const testEmail = 'test@nonexistent-domain-12345.com';
      const testPassword = 'wrongpassword';
      
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      
      addResult({
        test: 'Réseau Firebase',
        status: 'warning',
        message: 'Connexion réussie (inattendu)',
        details: 'La connexion test a réussi'
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        addResult({
          test: 'Réseau Firebase',
          status: 'success',
          message: 'Réseau Firebase OK',
          details: 'Erreur attendue reçue: ' + error.code
        });
      } else if (error.code === 'auth/network-request-failed') {
        addResult({
          test: 'Réseau Firebase',
          status: 'error',
          message: 'PROBLÈME RÉSEAU FIREBASE',
          details: {
            code: error.code,
            message: error.message,
            suggestion: 'Problème de configuration réseau iOS'
          }
        });
      } else {
        addResult({
          test: 'Réseau Firebase',
          status: 'warning',
          message: 'Erreur Firebase inattendue',
          details: error
        });
      }
    }
  };

  // Test 5: WebBrowser Test
  const testWebBrowser = async () => {
    try {
      const result = await WebBrowser.openBrowserAsync('https://google.com');
      
      addResult({
        test: 'WebBrowser',
        status: 'success',
        message: 'WebBrowser fonctionne',
        details: result
      });
    } catch (error) {
      addResult({
        test: 'WebBrowser',
        status: 'error',
        message: 'Erreur WebBrowser',
        details: error
      });
    }
  };

  // Test 6: URL Scheme Test
  const testURLSchemes = async () => {
    try {
      // Test des schémas d'URL disponibles
      const schemes = [
        'myapp://',
        'com.jeankiactiv.boltexponativewind://',
        'com.googleusercontent.apps.741599469385-2mvps552mdbu0fjimvim0qvti0jfrh5o://'
      ];

      addResult({
        test: 'Schémas URL',
        status: 'success',
        message: 'Schémas configurés',
        details: {
          schemes,
          note: 'Vérifiez Info.plist pour confirmation'
        }
      });
    } catch (error) {
      addResult({
        test: 'Schémas URL',
        status: 'error',
        message: 'Erreur schémas URL',
        details: error
      });
    }
  };

  // Test 7: Test connectivité réseau simple
  const testBasicNetwork = async () => {
    try {
      const testUrl = 'https://www.google.com';
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        timeout: 5000,
      });

      addResult({
        test: 'Connectivité réseau',
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'Connexion réseau OK' : 'Problème de connexion réseau',
        details: {
          status: response.status,
          statusText: response.statusText,
          url: testUrl
        }
      });
    } catch (error: any) {
      addResult({
        test: 'Connectivité réseau',
        status: 'error',
        message: 'AUCUNE CONNEXION RÉSEAU',
        details: {
          error: error.message,
          suggestion: 'Problème de connectivité du simulateur iOS'
        }
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();

    addResult({
      test: 'Début des tests',
      status: 'success',
      message: '🔄 Début du diagnostic complet...',
    });

    await testExpoConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testRedirectUri();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testURLSchemes();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testBasicNetwork();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGoogleAuthHook();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testFirebaseNetwork();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testWebBrowser();

    addResult({
      test: 'Tests terminés',
      status: 'success',
      message: '✅ Diagnostic terminé',
    });

    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const copyReportToClipboard = async () => {
    try {
      const timestamp = new Date().toISOString();
      const deviceInfo = {
        platform: Constants.platform,
        appOwnership: Constants.appOwnership,
        isDevice: Constants.isDevice,
        expoVersion: Constants.expoVersion,
        installationId: Constants.installationId,
      };

      let report = `=== RAPPORT DIAGNOSTIC CONNEXION ===\n`;
      report += `Date: ${timestamp}\n`;
      report += `Device Info: ${JSON.stringify(deviceInfo, null, 2)}\n\n`;
      
      results.forEach((result, index) => {
        report += `${index + 1}. ${result.test}\n`;
        report += `   Status: ${result.status.toUpperCase()}\n`;
        report += `   Message: ${result.message}\n`;
        if (result.details) {
          report += `   Détails: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}\n`;
        }
        report += `\n`;
      });

      report += `=== FIN DU RAPPORT ===\n`;

      Clipboard.setString(report);
      Alert.alert('✅ Copié', 'Le rapport complet a été copié dans le presse-papiers');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de copier le rapport');
      console.error('Erreur copie rapport:', error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f9fafb' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        🔧 Diagnostic Connexion
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <TouchableOpacity
          onPress={runAllTests}
          disabled={isRunning}
          style={{
            flex: 1,
            backgroundColor: isRunning ? '#9ca3af' : '#3b82f6',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {isRunning ? '⏳ Tests en cours...' : '🚀 Lancer tous les tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={clearResults}
          style={{
            backgroundColor: '#6b7280',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            minWidth: 80
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Bouton Copier le rapport */}
      {results.length > 0 && (
        <TouchableOpacity
          onPress={copyReportToClipboard}
          style={{
            backgroundColor: '#22c55e',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 20
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            📋 Copier le rapport complet
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView style={{ flex: 1 }}>
        {results.map((result, index) => (
          <View
            key={index}
            style={{
              backgroundColor: 'white',
              marginBottom: 10,
              padding: 15,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: getStatusColor(result.status),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{result.test}</Text>
              <Text style={{ color: getStatusColor(result.status), fontWeight: 'bold' }}>
                {result.status.toUpperCase()}
              </Text>
            </View>
            
            <Text style={{ color: '#374151', marginBottom: 10 }}>{result.message}</Text>
            
            {result.details && (
              <View style={{ backgroundColor: '#f3f4f6', padding: 10, borderRadius: 4 }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#1f2937' }}>
                  {typeof result.details === 'string' 
                    ? result.details 
                    : JSON.stringify(result.details, null, 2)
                  }
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
