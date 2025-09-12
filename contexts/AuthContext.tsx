import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { User, GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { auth } from '../services/firebaseConfig';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithTestAccount: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const isGoogleSigningInRef = useRef(false);

  // Configuration Google OAuth (compatible Expo Go et Dev Client)
  const isExpoGo = Constants.appOwnership === 'expo';

  // DÉBOGAGE : Vérifier le contexte d'exécution
  console.log('[AuthContext] Context Expo:', { 
    isExpoGo, 
    appOwnership: Constants.appOwnership,
    platform: Constants.platform 
  });

  // Configuration simplifiée sans redirectUri explicite
  // Laissons le provider Google gérer automatiquement la redirection
  console.log('[AuthContext] Utilisation de la redirection automatique du provider Google');

  const googleConfig: Google.GoogleAuthRequestConfig = {
    // Client IDs pour toutes les plateformes (REQUIS pour stabilité)
    clientId: '741599469385-08a1ikm22jlrm3d756effve28c9967bu.apps.googleusercontent.com',
    iosClientId: '741599469385-2mvps552mdbu0fjimvim0qvti0jfrh5o.apps.googleusercontent.com',
    androidClientId: '741599469385-45fpf91tualf3l7h5bno7tjtlggh8t9t.apps.googleusercontent.com',
    // Pas de redirectUri explicite - laisse le provider gérer
  };

  const [request, response, promptAsync] = Google.useAuthRequest(googleConfig);

  // DÉBOGAGE : Vérifier l'état du hook Google
  console.log('[AuthContext] Google Auth Hook:', { 
    hasRequest: !!request, 
    hasPromptAsync: !!promptAsync,
    requestLoaded: request?.state 
  });

  // UN SEUL LISTENER GLOBAL pour toute l'application (stabilisé)
  useEffect(() => {
    console.log('[AuthContext] Initialisation du listener auth unique');

    const prevUserRef = { current: null as User | null };
    const initializedRef = { current: false };

    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      console.log('[AuthContext] Auth state changed:', authUser?.uid || 'non connecté');

      const wasAuthenticated = !!prevUserRef.current;
      const isNowAuthenticated = !!authUser;

      setUser(authUser);

      if (!initializedRef.current) {
        setAuthInitialized(true);
        setLoading(false);
        initializedRef.current = true;
        console.log('[AuthContext] Auth initialisé');
      }

      // Redirection automatique après connexion vers widgets
      if (!wasAuthenticated && isNowAuthenticated) {
        router.replace('/widgets');
      }

      if (wasAuthenticated && !isNowAuthenticated) {
        console.log('[AuthContext] Déconnexion détectée, redirection vers login');
        router.replace('/login');
      }

      prevUserRef.current = authUser;
    });

    return () => {
      console.log('[AuthContext] Nettoyage du listener auth');
      unsubscribe();
    };
  }, []);

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
            // Redirection de sécurité en plus du listener
            router.replace('/widgets');
          })
          .catch(err => {
            console.error('Erreur lors de l\'auth Firebase :', err);
          })
          .finally(() => {
            isGoogleSigningInRef.current = false;
          });
      }
    } else if (response?.type === 'error') {
      console.error('Erreur Google Auth:', response.error);
      isGoogleSigningInRef.current = false;
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      isGoogleSigningInRef.current = false;
    }
  }, [response]);

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Démarrage connexion Google...');
      console.log('[AuthContext] État du hook:', { 
        hasRequest: !!request, 
        hasPromptAsync: !!promptAsync,
        isGoogleSigning: isGoogleSigningInRef.current 
      });
      
      if (isGoogleSigningInRef.current) {
        console.log('[AuthContext] Connexion déjà en cours, abandon');
        return;
      }
      
      if (!promptAsync) {
        console.error('[AuthContext] promptAsync non disponible!');
        return;
      }
      
      isGoogleSigningInRef.current = true;
      console.log('[AuthContext] Appel de promptAsync...');
      console.log('[AuthContext] Configuration Google utilisée:', JSON.stringify(googleConfig, null, 2));
      const result = await promptAsync();
      console.log('[AuthContext] Résultat de promptAsync:', result);
    } catch (error) {
      console.error('[AuthContext] Erreur lors du démarrage de l\'auth Google:', error);
      isGoogleSigningInRef.current = false;
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

  const signInWithApple = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In non disponible sur cet appareil');
      }

      // Nonce aléatoire sécurisé (hex) et SHA-256 pour la requête Apple
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const appleRes = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { identityToken, fullName } = appleRes as { identityToken?: string; fullName?: { givenName?: string; familyName?: string } };
      if (!identityToken) {
        throw new Error('identityToken manquant depuis Apple');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken: identityToken, rawNonce });
      const userCredential = await signInWithCredential(auth, credential);

      // Mettre à jour le displayName au premier login si transmis
      const given = fullName?.givenName ?? '';
      const family = fullName?.familyName ?? '';
      const displayName = `${given} ${family}`.trim();
      if (displayName && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName });
        } catch {}
      }

      console.log('Connexion Apple → Firebase réussie ! UID:', userCredential.user.uid);
      router.replace('/widgets');
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED') {
        console.log('Connexion Apple annulée par l’utilisateur');
        return;
      }
      console.error('Erreur Apple Sign-In:', error);
      throw error;
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
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      console.log('Connexion avec email:', normalizedEmail);
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
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
    signInWithApple,
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