// Configuration Firebase pour React Native
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Configuration Firebase avec vos vraies valeurs
const firebaseConfig = {
  apiKey: "AIzaSyB4DExlcv_oHpAQN9HrnYpnOquioL4E9Bo",
  authDomain: "ia-ctive-projet-1.firebaseapp.com", 
  projectId: "ia-ctive-projet-1",
  storageBucket: "ia-ctive-projet-1.firebasestorage.app",
  messagingSenderId: "741599469385",
  appId: "1:741599469385:web:bf23d6400983eb61e68498"
};

// Initialiser l'application Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Auth avec AsyncStorage pour éviter les boucles
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export default app; 