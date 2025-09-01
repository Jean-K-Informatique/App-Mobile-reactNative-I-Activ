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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isDesktop = screenWidth > 768;

export default function AccountScreen() {
  const { signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return password.length >= minLength && hasLetter && hasNumber;
  };

  const handleCreateAccount = async () => {
    if (!email.trim() || !firstName.trim() || !lastName.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        'Mot de passe invalide', 
        'Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre'
      );
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      console.log('[Signup] Tentative création:', normalizedEmail);
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      console.log('Compte créé avec succès ! UID:', userCredential.user.uid);
      
      // Optionnel : Mettre à jour le profil avec prénom/nom
      // await updateProfile(userCredential.user, {
      //   displayName: `${firstName} ${lastName}`
      // });

      router.replace('/main');
    } catch (error: any) {
      const code = error?.code || 'auth/unknown';
      const rawMsg = error?.message || '';
      console.error('[Signup] Erreur:', code, rawMsg);
      let message = 'Erreur lors de la création du compte';
      switch (code) {
        case 'auth/email-already-in-use':
          message = 'Cette adresse email est déjà utilisée';
          break;
        case 'auth/invalid-email':
          message = "Format d'email invalide";
          break;
        case 'auth/weak-password':
          message = 'Le mot de passe est trop faible';
          break;
        case 'auth/operation-not-allowed':
          message = "Création de compte désactivée côté Firebase (operation-not-allowed)";
          break;
        case 'auth/network-request-failed':
          message = 'Problème réseau. Vérifiez votre connexion et réessayez';
          break;
        case 'auth/too-many-requests':
          message = 'Trop de tentatives. Réessayez plus tard';
          break;
        default:
          message = `${message} (${code})`;
      }
      Alert.alert('Erreur de création', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/main');
    } catch (error: any) {
      Alert.alert('Erreur', 'Erreur lors de l\'inscription avec Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top','bottom']} style={styles.container}>
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
            <Text style={styles.title}>Créer un compte</Text>

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

            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Prénom"
                placeholderTextColor="#d3d3d3"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor="#d3d3d3"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#d3d3d3"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            {/* Password Requirements */}
            <Text style={styles.passwordHint}>
              Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre
            </Text>

            {/* Create Account Button */}
            <TouchableOpacity 
              style={styles.createButton} 
              onPress={handleCreateAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.createButtonText}>Créer un compte</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>ou</Text>

            {/* Google Signup Button */}
            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleSignup}
              disabled={loading}
            >
              <Text style={styles.googleButtonText}>S'inscrire avec Google</Text>
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.linkText}>Déjà un compte ? Se connecter</Text>
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
    minHeight: isDesktop ? 0 : screenHeight * 0.7,
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
  passwordHint: {
    color: '#d3d3d3',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  createButton: {
    backgroundColor: '#1d9bf0',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
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
  },
  linkText: {
    color: '#d3d3d3',
    fontSize: 14,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});