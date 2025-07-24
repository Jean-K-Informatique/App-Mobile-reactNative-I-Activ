import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import { auth } from '../services/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithTestAccount: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Configuration Google OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '741599469385-08a1ikm22jlrm3d756effve28c9967bu.apps.googleusercontent.com',
    iosClientId: '741599469385-08a1ikm22jlrm3d756effve28c9967bu.apps.googleusercontent.com', 
    androidClientId: '741599469385-08a1ikm22jlrm3d756effve28c9967bu.apps.googleusercontent.com',
  });

  // UN SEUL LISTENER GLOBAL pour toute l'application
  useEffect(() => {
    console.log('[AuthContext] Initialisation du listener auth unique');
    
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      console.log('[AuthContext] Auth state changed:', authUser?.uid || 'non connecté');
      
      // Détecter si c'est une déconnexion (on avait un user et maintenant on n'en a plus)
      const wasAuthenticated = !!user;
      const isNowAuthenticated = !!authUser;
      
      setUser(authUser);
      setAuthInitialized(true);
      
      if (loading) {
        setLoading(false);
        console.log('[AuthContext] Auth initialisé');
      }
      
      // Redirection automatique après déconnexion
      if (wasAuthenticated && !isNowAuthenticated && authInitialized) {
        console.log('[AuthContext] Déconnexion détectée, redirection vers login');
        router.replace('/login');
      }
    });

    return () => {
      console.log('[AuthContext] Nettoyage du listener auth');
      unsubscribe();
    };
  }, [user, loading, authInitialized]); // UN SEUL useEffect, JAMAIS re-exécuté

  // Gérer Google OAuth
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        console.log('Token Google reçu, connexion à Firebase...');
        const credential = GoogleAuthProvider.credential(authentication.idToken);
        signInWithCredential(auth, credential)
          .then(userCred => {
            console.log('Connexion Firebase réussie ! UID:', userCred.user.uid);
          })
          .catch(err => {
            console.error('Erreur lors de l\'auth Firebase :', err);
          });
      }
    } else if (response?.type === 'error') {
      console.error('Erreur Google Auth:', response.error);
    }
  }, [response]);

  const signInWithGoogle = async () => {
    try {
      console.log('Démarrage connexion Google...');
      await promptAsync();
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'auth Google:', error);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      console.log('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const signInWithTestAccount = async () => {
    try {
      console.log('Connexion avec compte test...');
      const email = 'test@example.com';
      const password = 'test123456';
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Connexion test réussie ! UID:', userCredential.user.uid);
      } catch (signInError: any) {
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
          console.log('Compte test inexistant, création automatique...');
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          console.log('Compte test créé et connexion réussie ! UID:', userCredential.user.uid);
        } else {
          throw signInError;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion test:', error);
      throw error;
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    try {
      console.log('Connexion avec email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Connexion réussie ! UID:', userCredential.user.uid);
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithTestAccount,
    signInWithEmailPassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 