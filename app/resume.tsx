import React, { useEffect } from 'react';
import { useSuckNavigator } from '../components/ScreenTransition';

function ResumeScreen() {
  const suckTo = useSuckNavigator();

  // Redirection immédiate vers le nouvel assistant conversationnel
  useEffect(() => {
    suckTo('/assistants/resume', { replace: true });
  }, []);

  // Retour vide pendant la redirection
  return null;
}

export default ResumeScreen;
