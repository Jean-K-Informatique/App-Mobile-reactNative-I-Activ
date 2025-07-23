import { View, Text, StyleSheet, Alert, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithTestAccount, signInWithEmailPassword, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // États pour le formulaire de connexion
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Erreur de connexion', 'Impossible de se connecter avec Google');
      console.error('Erreur login:', error);
    }
  };

  const handleTestSignIn = async () => {
    try {
      await signInWithTestAccount();
    } catch (error) {
      Alert.alert('Erreur de test', 'Impossible de se connecter avec le compte test. Créez d\'abord un compte test@example.com dans Firebase Console.');
      console.error('Erreur login test:', error);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await signInWithEmailPassword(email.trim(), password);
      console.log('Connexion réussie avec:', email);
    } catch (error: any) {
      let message = 'Erreur de connexion';
      if (error.code === 'auth/user-not-found') {
        message = 'Utilisateur non trouvé';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Email ou mot de passe incorrect';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Format d\'email invalide';
      }
      Alert.alert('Erreur de connexion', message);
      console.error('Erreur login email:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>APP-i-activ</Text>
      <Text style={styles.subtitle}>
        Connectez-vous pour accéder à vos assistants IA
      </Text>
      
      <View style={styles.buttonContainer}>
        {!showEmailForm ? (
          // Boutons de connexion
          <>
            <Button 
              title="📧 Se connecter avec Email"
              onPress={() => setShowEmailForm(true)}
              disabled={loading}
            />
            
            <Button 
              title="Se connecter avec Google"
              onPress={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
            />
            
            <Button 
              title="🧪 Test (compte démo)"
              onPress={handleTestSignIn}
              disabled={loading}
              variant="outline"
              style={styles.testButton}
            />
          </>
        ) : (
          // Formulaire email/mot de passe
          <>
            <Text style={styles.formTitle}>Connexion par Email</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Votre email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Votre mot de passe"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            
            <Button 
              title="Se connecter"
              onPress={handleEmailSignIn}
              disabled={loading || !email.trim() || !password.trim()}
            />
            
            <Button 
              title="← Retour"
              onPress={() => {
                setShowEmailForm(false);
                setEmail('');
                setPassword('');
              }}
              variant="outline"
              style={styles.backButton}
            />
          </>
        )}
        
        <Text style={styles.infoText}>
          Note: Le bouton Google nécessite la configuration des clés OAuth
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  testButton: {
    marginTop: 10,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  backButton: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
}); 