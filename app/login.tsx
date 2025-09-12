import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isDesktop = screenWidth > 768;

function LoginScreen() {
  const { signInWithEmailPassword, signInWithGoogle, signInWithTestAccount, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState('social'); // 'social', 'email', 'password'

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailPassword(email, password);
      router.replace('/widgets');
    } catch (error: any) {
      const code = error?.code || 'unknown';
      const msg = error?.message || 'Erreur inconnue';
      Alert.alert('Erreur de connexion', `${code}: ${msg}`);
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

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      // Ne pas afficher d'erreur si l'utilisateur a juste annulé
      if (error?.message?.includes('canceled') || error?.message?.includes('annulé')) {
        console.log('Connexion Apple annulée par l\'utilisateur');
        return; // Pas d'alerte pour une annulation
      }
      Alert.alert('Erreur', 'Erreur lors de la connexion Apple');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailNext = () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre adresse email');
      return;
    }
    setLoginStep('password');
  };

  const handleBackToEmail = () => {
    setLoginStep('email');
    setPassword('');
  };

  const handleBackToSocial = () => {
    setLoginStep('social');
    setEmail('');
    setPassword('');
  };

  const handleTestLogin = async () => {
    setLoading(true);
    try {
      await signInWithTestAccount();
      router.replace('/widgets');
    } catch (error: any) {
      Alert.alert('Erreur', 'Erreur lors de la connexion test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top','bottom']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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

            {/* Étape Social - Boutons Google & Apple */}
            {loginStep === 'social' && (
              <>
                {/* Google Login Button avec logo */}
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={handleGoogleLogin}
                  disabled={loading}
                >
                  <Image 
                    source={require('../assets/images/google.png')} 
                    style={styles.socialLogo} 
                  />
                  <View style={styles.socialButtonTextContainer}>
                    <Text style={styles.socialButtonText}>Se connecter avec Google</Text>
                  </View>
                </TouchableOpacity>

                {/* Apple Login Button avec logo */}
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={handleAppleLogin}
                  disabled={loading}
                >
                  <Image 
                    source={require('../assets/images/logo-apple.png')} 
                    style={styles.socialLogo} 
                  />
                  <View style={styles.socialButtonTextContainer}>
                    <Text style={styles.socialButtonText}>Se connecter avec Apple</Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.orText}>ou</Text>

                {/* Email Input pour I-Activ */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>@</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Adresse email I-Activ"
                    placeholderTextColor="#d3d3d3"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={() => setLoginStep('email')}
                  disabled={loading}
                >
                  <Text style={styles.nextButtonText}>Suivant</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Étape Email - Validation de l'email */}
            {loginStep === 'email' && (
              <>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={handleBackToSocial}
                >
                  <Text style={styles.backButtonText}>← Retour</Text>
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>@</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Adresse email I-Activ"
                    placeholderTextColor="#d3d3d3"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={handleEmailNext}
                  disabled={loading}
                >
                  <Text style={styles.nextButtonText}>Suivant</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Étape Password - Saisie mot de passe */}
            {loginStep === 'password' && (
              <>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={handleBackToEmail}
                >
                  <Text style={styles.backButtonText}>← Retour</Text>
                </TouchableOpacity>

                <Text style={styles.emailDisplay}>📧 {email}</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mot de passe"
                    placeholderTextColor="#d3d3d3"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoFocus
                  />
                </View>

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
              </>
            )}

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
    </ScrollView>
  </TouchableWithoutFeedback>
</KeyboardAvoidingView>
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
    borderRadius: 25,
    marginBottom: 16,
    marginTop: 8,
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
  socialButton: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  socialLogo: {
    width: 18,
    height: 18,
    marginLeft: 4,
    marginRight: 12,
    resizeMode: 'contain',
  },
  socialButtonTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 30, // Réduit pour éviter les retours à la ligne
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  iactivButton: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d3d3d3',
  },
  iactivButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d3d3d3',
  },
  nextButton: {
    backgroundColor: '#1d9bf0',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1d9bf0',
    fontWeight: '600',
  },
  emailDisplay: {
    fontSize: 16,
    color: '#d3d3d3',
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#333333',
    borderRadius: 12,
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
  debugButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  debugButtonText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    backgroundColor: '#ef4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LoginScreen; 