import React, { useEffect } from 'react';
import { useSuckNavigator } from '../components/ScreenTransition';

function CuisineScreen() {
  const suckTo = useSuckNavigator();

  // Redirection immédiate vers le nouvel assistant conversationnel
  useEffect(() => {
    suckTo('/assistants/cuisine', { replace: true });
  }, []);

  // Retour vide pendant la redirection
  return null;
}

export default CuisineScreen;
