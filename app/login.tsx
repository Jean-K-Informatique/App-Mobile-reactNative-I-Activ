import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isDesktop = screenWidth > 768;

export default function LoginScreen() {
  const { signInWithEmailPassword, signInWithGoogle, signInWithTestAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailPassword(email, password);
      router.replace('/main');
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Erreur', 'Erreur lors de la connexion Google');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setLoading(true);
    try {
      await signInWithTestAccount();
      router.replace('/main');
    } catch (error: any) {
      Alert.alert('Erreur', 'Erreur lors de la connexion test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        {/* Logo Section */}
        <View style={[styles.logoSection, { flex: isDesktop ? 1 : 0 }]}>
          <Image
            source={require('../assets/mobile-assets/LogoSombreTexte.png')}
            style={[
              styles.logo,
              {
                width: isDesktop ? 500 : 60,
                height: isDesktop ? 500 : 60,
              }
            ]}
            resizeMode="contain"
          />
        </View>

        {/* Form Section */}
        <View style={[styles.formSection, { flex: isDesktop ? 1 : 0 }]}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Se connecter</Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#d3d3d3"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#d3d3d3"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>ou</Text>

            {/* Google Login Button */}
            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.linkText}>Mot de passe oublié</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => router.push('/account')}>
                <Text style={styles.linkText}>Pas de compte ? Créer un compte</Text>
              </TouchableOpacity>
            </View>


          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222422', // Couleur unifiée avec le thème
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isDesktop ? 0 : 20,
  },
  logo: {
    maxWidth: '90%',
    maxHeight: isDesktop ? 500 : 80,
  },
  formSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: isDesktop ? 0 : screenHeight * 0.6,
  },
  formContainer: {
    backgroundColor: '#222422',
    borderRadius: 25,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 35,
    marginBottom: 16,
    paddingHorizontal: 20,
    shadowColor: 'rgb(5, 5, 5)',
    shadowOffset: { width: 2, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
  },
  inputIcon: {
    fontSize: 16,
    color: '#d3d3d3',
    marginRight: 12,
    width: 20,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#d3d3d3',
  },
  loginButton: {
    backgroundColor: '#1d9bf0',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  orText: {
    color: '#d3d3d3',
    fontSize: 16,
    marginVertical: 16,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  footerLinks: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    color: '#d3d3d3',
    fontSize: 14,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#34d399',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  testButtonText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
}); 