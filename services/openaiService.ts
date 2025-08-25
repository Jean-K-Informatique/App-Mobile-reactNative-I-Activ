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

export type ReasoningEffort = 'low' | 'high' | 'medium';

export const DEFAULT_GPT5_MODEL = 'gpt-5-nano-2025-08-07';

// Service pour envoyer des messages à OpenAI (mode normal - pour fallback seulement)
export async function sendMessageToOpenAI(
  messages: ChatMessage[],
  model: string = DEFAULT_GPT5_MODEL
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
  model: string = DEFAULT_GPT5_MODEL,
  abortController?: AbortController
): Promise<void> {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  
  if (!API_KEY) {
    callbacks.onError?.(new Error('Clé API OpenAI non configurée'));
    return;
  }

  console.log('🚀 Streaming instantané avec XMLHttpRequest (chat.completions legacy):', { model, messagesCount: messages.length });

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
  let currentEvent: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();

      if (data === '[DONE]') {
        console.log('🏁 Signal [DONE] reçu');
        continue;
      }

      try {
        const parsed = JSON.parse(data);

        // Responses API streaming (robuste):
        // - output_text delta events
        // - potential fields: delta, textDelta, content, choices[0].delta.content (legacy)
        if (currentEvent && currentEvent.includes('response.output_text.delta')) {
          const delta = parsed.delta ?? parsed.text ?? parsed.textDelta ?? parsed.output_text_delta;
          if (typeof delta === 'string' && delta) {
            onContent(delta);
            continue;
          }
        }

        // Some implementations stream as { type: 'response.output_text.delta', delta: '...' }
        if (parsed.type && parsed.type === 'response.output_text.delta') {
          const delta = parsed.delta ?? parsed.text;
          if (typeof delta === 'string' && delta) {
            onContent(delta);
            continue;
          }
        }

        // Legacy Chat Completions delta
        const legacyContent = parsed.choices?.[0]?.delta?.content;
        if (typeof legacyContent === 'string' && legacyContent) {
          onContent(legacyContent);
          continue;
        }
      } catch (e) {
        // Ignorer les chunks JSON malformés silencieusement
        continue;
      }
    }
  }
} 

// Essaie d'extraire le texte final d'une réponse SSE Responses API
function extractFinalOutputFromSSE(sseText: string): string | null {
  // Parcourt les lignes et cherche un dernier événement contenant output_text complet
  try {
    const lines = sseText.split('\n');
    let finalText = '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      const parsed = JSON.parse(data);
      // Certains backends envoient { type: 'response.completed', output_text: '...' }
      if (parsed.output_text && typeof parsed.output_text === 'string') {
        finalText = parsed.output_text;
      }
      // Ou parfois { type: 'message', content: [{ type:'output_text', text:'...' }]} (exemple générique)
      const contentArr = parsed.content || parsed.output || [];
      if (Array.isArray(contentArr)) {
        for (const c of contentArr) {
          if ((c.type === 'output_text' || c.type === 'text') && typeof c.text === 'string') {
            finalText = c.text;
          }
        }
      }
    }
    return finalText || null;
  } catch {
    return null;
  }
}

// Appel non-streaming (utile pour le raisonnement élevé en RN)
export async function sendMessageToOpenAINonStreamingResponses(
  messages: ChatMessage[],
  model: string = DEFAULT_GPT5_MODEL,
  reasoningEffort: ReasoningEffort = 'low',
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!API_KEY) throw new Error('Clé API OpenAI non configurée');

  const payload: any = {
    model,
    input: messages.map((m) => ({
      role: m.role,
      content: [
        { type: (m.role === 'assistant' ? 'output_text' : 'input_text'), text: m.content }
      ]
    })),
    max_output_tokens: options?.maxOutputTokens ?? 1000,
    reasoning: { effort: reasoningEffort },
    stream: false,
  };
  if (typeof options?.temperature === 'number') payload.temperature = options.temperature;

  console.log('🧠 Non-stream Responses API:', { model, reasoningEffort, messagesCount: messages.length });
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('❌ Non-stream Responses error', res.status, text.slice(0, 400));
    throw new Error(`Erreur API: ${res.status}`);
  }

  let json: any = null;
  try { json = JSON.parse(text); } catch {}

  if (json?.output_text && typeof json.output_text === 'string') {
    console.log('🧠 Non-stream OK (output_text):', json.output_text.length, 'caractères');
    return json.output_text;
  }

  // Essayez d'extraire via structures alternatives
  const contentArr = json?.content || json?.output || [];
  if (Array.isArray(contentArr)) {
    for (const c of contentArr) {
      if ((c.type === 'output_text' || c.type === 'text') && typeof c.text === 'string') {
        console.log('🧠 Non-stream OK (content[]):', c.text.length, 'caractères');
        return c.text;
      }
    }
  }

  const choices = json?.choices || [];
  if (Array.isArray(choices) && choices[0]?.message?.content) {
    const v = choices[0].message.content as string;
    console.log('🧠 Non-stream OK (choices):', v.length, 'caractères');
    return v;
  }

  console.warn('🧠 Non-stream: impossible d\'extraire du texte');
  return '';
}
// NOUVEAU: Streaming via Responses API (GPT-5, reasoning effort)
export async function sendMessageToOpenAIStreamingResponses(
  messages: ChatMessage[],
  callbacks: StreamingCallbacks,
  model: string = DEFAULT_GPT5_MODEL,
  reasoningEffort: ReasoningEffort = 'low',
  abortController?: AbortController,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<void> {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!API_KEY) {
    callbacks.onError?.(new Error('Clé API OpenAI non configurée'));
    return;
  }

  console.log('🚀 Streaming Responses API:', { model, reasoningEffort, messagesCount: messages.length });

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let fullResponse = '';
    let buffer = '';

    xhr.open('POST', 'https://api.openai.com/v1/responses');
    xhr.setRequestHeader('Authorization', `Bearer ${API_KEY}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');

    // En-têtes optionnels si disponibles
    const ORG = process.env.EXPO_PUBLIC_OPENAI_ORG;
    const PROJECT = process.env.EXPO_PUBLIC_OPENAI_PROJECT;
    if (ORG) {
      xhr.setRequestHeader('OpenAI-Organization', ORG);
    }
    if (PROJECT) {
      xhr.setRequestHeader('OpenAI-Project', PROJECT);
    }

    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        console.log('⏹️ Requête XHR annulée');
        xhr.abort();
      });
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
        const newData = xhr.responseText.slice(buffer.length);
        buffer = xhr.responseText;

        if (newData) {
          processStreamChunk(newData, (content) => {
            fullResponse += content;
            callbacks.onChunk?.(content);
          });
        }
      }

      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          // Fallback: si rien n'a été streamé (certains modèles renvoient seulement un event final)
          if (!fullResponse || fullResponse.length === 0) {
            try {
              const recovered = extractFinalOutputFromSSE(xhr.responseText);
              if (recovered) {
                fullResponse = recovered;
                console.log('🧠 Responses fallback (output_text final) récupéré:', fullResponse.length, 'caractères');
              }
            } catch {}
          }

          console.log('✅ Streaming terminé:', fullResponse.length + ' caractères');
          callbacks.onComplete?.(fullResponse);
          resolve();
        } else {
          let message = `Erreur API: ${xhr.status}`;
          try {
            const body = xhr.responseText;
            if (body) {
              const parsed = JSON.parse(body);
              const details = parsed?.error?.message || parsed?.message;
              if (details) message = `${message} - ${details}`;
            }
          } catch {}
          console.error('❌ Erreur XHR:', xhr.status, xhr.statusText, xhr.responseText?.slice(0, 200));
          callbacks.onError?.(new Error(message));
          reject(new Error(message));
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
      resolve();
    };

    const payload: any = {
      model,
      // Mapper messages -> input (Responses API)
      input: messages.map((m) => ({
        role: m.role,
        content: [
          { type: (m.role === 'assistant' ? 'output_text' : 'input_text'), text: m.content }
        ]
      })),
      max_output_tokens: options?.maxOutputTokens ?? 1000,
      reasoning: { effort: reasoningEffort },
      stream: true,
    };

    // N'inclure temperature que si explicitement fourni (certains modèles ne le supportent pas)
    if (typeof options?.temperature === 'number') {
      payload.temperature = options.temperature;
    }

    const requestBody = JSON.stringify(payload);

    console.log('📤 Envoi requête XHR Responses API streaming...');
    xhr.send(requestBody);
  });
}