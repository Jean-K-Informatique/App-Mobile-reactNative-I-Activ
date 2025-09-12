import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function ChatMathRedirect() {
  // Redirection immédiate vers l'interface unifiée
  useEffect(() => {
    router.replace('/maths');
  }, []);

  return null; // Aucun rendu nécessaire, redirection immédiate
}