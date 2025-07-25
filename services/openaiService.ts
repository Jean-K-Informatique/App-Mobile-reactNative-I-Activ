// Service OpenAI pour les conversations IA
// ⚠️ IMPORTANT: Ajoutez votre clé OpenAI dans le fichier .env
// VITE_OPENAI_API_KEY=sk-proj-votre-clé-ici
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "VOTRE_CLE_OPENAI_ICI";

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamingCallbacks {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

// Service pour envoyer des messages à OpenAI (mode normal - pour fallback seulement)
export async function sendMessageToOpenAI(
  messages: ChatMessage[],
  model: string = 'gpt-4'
): Promise<string> {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Clé API OpenAI non configurée');
  }

  try {
    console.log('🤖 Envoi à OpenAI:', { model, messagesCount: messages.length });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erreur OpenAI:', response.status, errorData);
      throw new Error(`Erreur API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    
    console.log('✅ Réponse OpenAI reçue');
    return assistantMessage;

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'appel OpenAI:', error);
    throw new Error(error.message || 'Erreur de connexion à OpenAI');
  }
}

// NOUVEAU : Service de streaming ultra-rapide avec XMLHttpRequest
export async function sendMessageToOpenAIStreaming(
  messages: ChatMessage[],
  callbacks: StreamingCallbacks,
  model: string = 'gpt-4',
  abortController?: AbortController
): Promise<void> {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  
  if (!API_KEY) {
    callbacks.onError?.(new Error('Clé API OpenAI non configurée'));
    return;
  }

  console.log('🚀 Streaming instantané avec XMLHttpRequest:', { model, messagesCount: messages.length });

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let fullResponse = '';
    let buffer = '';
    
    // Configuration de la requête
    xhr.open('POST', 'https://api.openai.com/v1/chat/completions');
    xhr.setRequestHeader('Authorization', `Bearer ${API_KEY}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Gestion de l'abort
    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        console.log('⏹️ Requête XHR annulée');
        xhr.abort();
      });
    }

    // Traitement en temps réel des données reçues
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
        // Récupérer seulement les nouvelles données
        const newData = xhr.responseText.slice(buffer.length);
        buffer = xhr.responseText;
        
        if (newData) {
          // ❌ SUPPRIMÉ : Log verbeux
          // console.log('📦 Nouveau chunk reçu:', newData.length + ' caractères');
          processStreamChunk(newData, (content) => {
            fullResponse += content;
            callbacks.onChunk?.(content); // STREAMING INSTANTANÉ !
          });
        }
      }
      
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
          callbacks.onComplete?.(fullResponse);
          resolve();
        } else {
          console.error('❌ Erreur XHR:', xhr.status, xhr.statusText);
          callbacks.onError?.(new Error(`Erreur API: ${xhr.status}`));
          reject(new Error(`Erreur API: ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      console.error('❌ Erreur réseau XHR');
      callbacks.onError?.(new Error('Erreur de connexion'));
      reject(new Error('Erreur de connexion'));
    };

    xhr.onabort = () => {
      console.log('⏹️ Requête annulée');
      resolve(); // Pas d'erreur, juste annulé
    };

    // Envoyer la requête
    const requestBody = JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true, // CRUCIAL : Activer le streaming
    });

    console.log('📤 Envoi requête XHR streaming...');
    xhr.send(requestBody);
  });
}

// Fonction pour traiter les chunks de streaming Server-Sent Events
function processStreamChunk(chunk: string, onContent: (content: string) => void): void {
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      
      if (data === '[DONE]') {
        console.log('🏁 Signal [DONE] reçu');
        continue;
      }
      
      if (!data) continue;
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        
        if (content) {
          onContent(content); // IMMÉDIAT !
        }
      } catch (e) {
        // Ignorer les chunks JSON malformés silencieusement
        continue;
      }
    }
  }
} 