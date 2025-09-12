// Service OpenAI pour les conversations IA
// ⚠️ IMPORTANT: Ajoutez votre clé OpenAI dans le fichier .env
// EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-votre-clé-ici
import Constants from 'expo-constants';

// Sécurité: aucune clé API ne doit être embarquée côté client.
// Utilisez un proxy côté serveur qui ajoute la clé en header.
// Config: EXPO_PUBLIC_OPENAI_PROXY_URL dans .env ou app config.
const OPENAI_PROXY_URL = (process.env.EXPO_PUBLIC_OPENAI_PROXY_URL || 
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_OPENAI_PROXY_URL ||
  '').toString().trim();

function requireProxy(): string {
  if (!OPENAI_PROXY_URL) {
    throw new Error('Configuration manquante: EXPO_PUBLIC_OPENAI_PROXY_URL (proxy serveur requis)');
  }
  return OPENAI_PROXY_URL.replace(/\/$/, '');
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  // Peut être une chaîne ou un tableau de parties (texte, image_url) pour le multimodal
  content: unknown;
}

export interface StreamingCallbacks {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export type ReasoningEffort = 'low' | 'high' | 'medium';

export const DEFAULT_GPT5_MODEL = 'gpt-5-nano-2025-08-07';

// 🧪 NOUVEAU: Test GPT-5 avec Chat Completions (code direct du Playground OpenAI)
export async function testGPT5ChatCompletions(
  messages: ChatMessage[] = []
): Promise<string> {
  const proxy = requireProxy();

  try {
    console.log('🧪 Test GPT-5 Chat Completions - Code officiel du Playground');
    
    // Messages par défaut pour le test si aucun fourni
    const testMessages = messages.length > 0 ? messages : [
      { role: 'user', content: 'Bonjour ! Peux-tu me confirmer que tu es GPT-5 et que le Chat Completion fonctionne ?' }
    ];

    // Code EXACT du Playground OpenAI
    const response = await fetch(`${proxy}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: testMessages,
        response_format: {
          "type": "text"
        },
        verbosity: "low",
        reasoning_effort: "minimal"
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erreur GPT-5 Chat Completions:', response.status, errorData);
      throw new Error(`Erreur API GPT-5: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('✅ GPT-5 Chat Completions - Succès:', {
      model: data.model,
      finishReason: data.choices?.[0]?.finish_reason,
      contentLength: content.length,
      usage: data.usage
    });

    return content;

  } catch (error: any) {
    console.error('❌ Test GPT-5 Chat Completions échoué:', error);
    throw new Error(`Test GPT-5 échoué: ${error.message}`);
  }
}

// ⚡ ULTRA-OPTIMISÉ: Chat Completions GPT-5 avec streaming haute vitesse
export async function sendMessageToGPT5ChatCompletions(
  messages: ChatMessage[],
  callbacks: StreamingCallbacks,
  model: string = "gpt-5-nano",
  abortController?: AbortController,
  options?: { 
    verbosity?: "low" | "high";
    reasoning_effort?: "minimal" | "low" | "medium" | "high";
    temperature?: number;
  }
): Promise<void> {
  const proxy = requireProxy();

  // ⚡ MESURE DE PERFORMANCE - TTFB (Time To First Byte)
  const startTime = performance.now();
  let firstChunkTime: number | null = null;
  let firstByteTime: number | null = null;

  console.log('⚡ GPT-5 ULTRA-RAPIDE:', { 
    model, 
    messagesCount: messages.length,
    verbosity: options?.verbosity || "low",
    reasoning_effort: options?.reasoning_effort || "minimal"
  });

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let fullResponse = '';
    let buffer = '';
    let chunkCount = 0;
    
    // ⚡ OPTIMISATION 1: Configuration réseau ultra-rapide
    xhr.open('POST', `${proxy}/v1/chat/completions`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    
    // ⚡ OPTIMISATION 2: En-têtes réseau pour vitesse maximale
    xhr.setRequestHeader('Connection', 'keep-alive');
    xhr.setRequestHeader('Accept-Encoding', 'gzip, deflate, br');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.setRequestHeader('Pragma', 'no-cache');
    
    // ⚡ OPTIMISATION 3: Priorité réseau (si supporté)
    if (xhr.setRequestHeader) {
      try {
        xhr.setRequestHeader('Priority', 'u=1, i'); // Priorité ultra-haute
      } catch {}
    }
    
    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        console.log('⏹️ Requête GPT-5 Chat Completions annulée');
        xhr.abort();
      });
    }

    // ⚡ OPTIMISATION 4: Traitement ULTRA-RAPIDE des données reçues
    xhr.onreadystatechange = () => {
      // ⚡ TTFB - Premier byte reçu (mesure critique)
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED && !firstByteTime) {
        firstByteTime = performance.now();
        console.log(`⚡ TTFB GPT-5: ${Math.round(firstByteTime - startTime)}ms`);
      }

      if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
        // ⚡ RÉCUPÉRATION IMMÉDIATE des nouvelles données
        const newData = xhr.responseText.slice(buffer.length);
        buffer = xhr.responseText;
        
        if (newData) {
          chunkCount++;
          // ⚡ PREMIER CHUNK - Temps critique pour UX
          if (!firstChunkTime) {
            firstChunkTime = performance.now();
            console.log(`⚡ Premier mot GPT-5: ${Math.round(firstChunkTime - startTime)}ms`);
          }
          
          // ⚡ TRAITEMENT IMMÉDIAT - zéro délai
          processStreamChunk(newData, (content) => {
            if (content) {
              fullResponse += content;
              // ⚡ AFFICHAGE INSTANTANÉ
              callbacks.onChunk?.(content);
            }
          });
        }
      }
      
      if (xhr.readyState === XMLHttpRequest.DONE) {
        const totalTime = performance.now() - startTime;
        
        if (xhr.status === 200) {
          console.log(`⚡ GPT-5 terminé: ${fullResponse.length} chars, ${chunkCount} chunks, ${Math.round(totalTime)}ms total`);
          callbacks.onComplete?.(fullResponse);
          resolve();
        } else {
          let message = `Erreur GPT-5 API: ${xhr.status}`;
          try {
            const body = xhr.responseText;
            if (body) {
              const parsed = JSON.parse(body);
              const details = parsed?.error?.message || parsed?.message;
              if (details) message = `${message} - ${details}`;
            }
          } catch {}
          console.error(`❌ ${message} après ${Math.round(totalTime)}ms`);
          callbacks.onError?.(new Error(message));
          reject(new Error(message));
        }
      }
    };

    xhr.onerror = () => {
      console.error('❌ Erreur réseau GPT-5 Chat Completions');
      callbacks.onError?.(new Error('Erreur de connexion'));
      reject(new Error('Erreur de connexion'));
    };

    xhr.onabort = () => {
      console.log('⏹️ Requête GPT-5 annulée');
      resolve();
    };

    // ⚡ OPTIMISATION 5: Construction de payload ultra-efficace
    const payload: any = {
      model: model,
      messages: messages,
      response_format: { "type": "text" },
      verbosity: options?.verbosity || "low",
      reasoning_effort: options?.reasoning_effort || "minimal",
      stream: true,
      // ⚡ OPTIMISATIONS GPT-5 pour vitesse
      stream_options: { include_usage: false }, // Réduire overhead
      max_completion_tokens: 2048, // GPT-5 utilise max_completion_tokens au lieu de max_tokens
    };
    
    // Ajouter température seulement si spécifiée
    if (typeof options?.temperature === 'number') {
      payload.temperature = options.temperature;
    }

    // ⚡ OPTIMISATION 6: Sérialisation JSON optimisée
    const requestBody = JSON.stringify(payload);

    console.log('⚡ Envoi requête GPT-5 ultra-optimisée...');
    
    // ⚡ OPTIMISATION 7: Envoi immédiat sans délai
    try {
      xhr.send(requestBody);
    } catch (e) {
      console.error('❌ Envoi GPT-5 échoué:', (e as any)?.message || e);
      callbacks.onError?.(e as any);
      reject(e);
    }
  });
}

// NOUVEAU: Vision (analyse image) via Responses API en streaming
export async function analyzeImageWithOpenAIStreaming(
  base64Image: string,
  promptText: string,
  callbacks: StreamingCallbacks,
  model: string = DEFAULT_GPT5_MODEL,
  abortController?: AbortController,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<void> {
  console.log('🔄 Image Analysis → Chat Completions GPT-5');
  
  // Construire le message avec image pour ChatCompletion
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: promptText
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
            detail: 'high'
          }
        }
      ]
    }
  ];

  // Utiliser Chat Completions GPT-5 au lieu de Responses API
  return sendMessageToGPT5ChatCompletions(
    messages,
    callbacks,
    model.includes('gpt-5') ? model : "gpt-5-nano",
    abortController,
    {
      verbosity: "low",
      reasoning_effort: "minimal",
      temperature: options?.temperature
    }
  );
}

// Service pour envoyer des messages à OpenAI (mode normal - pour fallback seulement)
export async function sendMessageToOpenAI(
  messages: ChatMessage[],
  model: string = DEFAULT_GPT5_MODEL
): Promise<string> {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
                  Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;
  
  if (!API_KEY) {
    throw new Error('Clé API OpenAI non configurée');
  }

  try {
    console.log('🤖 Envoi à OpenAI:', { model, messagesCount: messages.length });
    
    // Adapter le payload pour les modèles GPT-5 qui n'acceptent pas max_tokens
    const isGpt5 = /gpt-5/i.test(model);
    const body: any = {
      model: model,
      messages: messages,
    };
    if (isGpt5) {
      body.max_completion_tokens = 1200;
      // certaines variantes n'aiment pas temperature -> l'omettre par défaut
    } else {
      body.max_tokens = 1000;
      body.temperature = 0.7;
    }

    const proxy = requireProxy();
    const response = await fetch(`${proxy}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erreur OpenAI:', response.status, errorData);
      throw new Error(`Erreur API OpenAI: ${response.status}`);
    }

    const rawText = await response.text();
    let data: any = null;
    try { data = JSON.parse(rawText); } catch {}

    if (!data) {
      console.error('❌ OpenAI JSON parse failed, raw:', rawText.slice(0, 400));
      throw new Error('Réponse OpenAI illisible');
    }

    const choice = Array.isArray(data.choices) ? data.choices[0] : undefined;
    const finishReason = choice?.finish_reason;
    const contentText = choice?.message?.content || '';
    const usage = data.usage || {};
    console.log('🤖 OpenAI non-stream terminé:', {
      finishReason,
      contentLength: contentText?.length || 0,
      usage
    });

    const assistantMessage = contentText || '';
    if (!assistantMessage) {
      console.warn('⚠️ OpenAI a répondu sans texte. choices[0]:', JSON.stringify(choice || {}, null, 2).slice(0, 400));
      return '';
    }
    
    console.log('✅ Réponse OpenAI reçue');
    return assistantMessage;

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'appel OpenAI:', error);
    throw new Error(error.message || 'Erreur de connexion à OpenAI');
  }
}

// ⚡ Service de streaming ULTRA-RAPIDE avec optimisations réseau (LEGACY - utiliser sendMessageToGPT5ChatCompletions à la place)
export async function sendMessageToOpenAIStreaming(
  messages: ChatMessage[],
  callbacks: StreamingCallbacks,
  model: string = DEFAULT_GPT5_MODEL,
  abortController?: AbortController
): Promise<void> {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
                  Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;
  
  const proxy = requireProxy();

  // ⚡ Mesure de performance - TTFB (Time To First Byte)
  const startTime = performance.now();
  let firstChunkTime: number | null = null;
  let firstByteTime: number | null = null;

  console.log('🚀 Streaming OPTIMISÉ - Démarrage:', { model, messagesCount: messages.length });

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let fullResponse = '';
    let buffer = '';
    let chunkCount = 0;
    
    // ⚡ Configuration optimisée de la requête (via proxy sécurisé)
    xhr.open('POST', `${proxy}/v1/chat/completions`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    // ⚡ Optimisations réseau
    xhr.setRequestHeader('Connection', 'keep-alive');
    xhr.setRequestHeader('Accept-Encoding', 'gzip, deflate');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    
    // Gestion de l'abort
    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        console.log('⏹️ Requête XHR annulée');
        xhr.abort();
      });
    }

    // ⚡ Traitement INSTANTANÉ des données reçues
    xhr.onreadystatechange = () => {
      // ⚡ TTFB - Premier byte reçu
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED && !firstByteTime) {
        firstByteTime = performance.now();
        console.log(`⚡ TTFB: ${Math.round(firstByteTime - startTime)}ms`);
      }

      if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
        // ⚡ Récupérer IMMÉDIATEMENT les nouvelles données
        const newData = xhr.responseText.slice(buffer.length);
        buffer = xhr.responseText;
        
        if (newData) {
          chunkCount++;
          // ⚡ Premier chunk - temps critique
          if (!firstChunkTime) {
            firstChunkTime = performance.now();
            console.log(`⚡ Premier mot: ${Math.round(firstChunkTime - startTime)}ms`);
          }
          
          // ⚡ Traitement DIRECT sans délai
          processStreamChunk(newData, (content) => {
            if (content) {
              fullResponse += content;
              // ⚡ APPEL IMMÉDIAT sans délai
              callbacks.onChunk?.(content);
            }
          });
        }
      }
      
      if (xhr.readyState === XMLHttpRequest.DONE) {
        const totalTime = performance.now() - startTime;
        
        if (xhr.status === 200) {
          console.log(`✅ Streaming terminé: ${fullResponse.length} caractères, ${chunkCount} chunks, ${Math.round(totalTime)}ms total`);
          callbacks.onComplete?.(fullResponse);
          resolve();
        } else {
          console.error(`❌ Erreur XHR ${xhr.status} après ${Math.round(totalTime)}ms:`, xhr.statusText);
          callbacks.onError?.(new Error(`Erreur API: ${xhr.status}`));
          reject(new Error(`Erreur API: ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      const errorTime = performance.now() - startTime;
      console.error(`❌ Erreur réseau après ${Math.round(errorTime)}ms`);
      callbacks.onError?.(new Error('Erreur de connexion'));
      reject(new Error('Erreur de connexion'));
    };

    xhr.onabort = () => {
      console.log('⏹️ Requête annulée');
      resolve(); // Pas d'erreur, juste annulé
    };

    // ⚡ Corps de requête optimisé
    const isGpt5 = /gpt-5/i.test(model);
    const requestBody = JSON.stringify({
      model: model,
      messages: messages,
      // GPT-5 utilise max_completion_tokens, autres modèles utilisent max_tokens
      ...(isGpt5 ? { max_completion_tokens: 2048 } : { max_tokens: 2048 }),
      temperature: 0.7,
      stream: true, // CRUCIAL : Activer le streaming
      // ⚡ Optimisations OpenAI
      stream_options: { include_usage: false } // Réduire overhead
    });

    console.log('📤 Envoi requête XHR optimisée...');
    xhr.send(requestBody);
  });
}

// ⚡ FONCTION ULTRA-OPTIMISÉE pour traiter les chunks de streaming
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
        continue; // Signal fin de stream
      }

      try {
        const parsed = JSON.parse(data);

        // ⚡ PRIORITÉ 1: Chat Completions GPT-5 (format principal maintenant)
        const chatContent = parsed.choices?.[0]?.delta?.content;
        if (typeof chatContent === 'string' && chatContent) {
          onContent(chatContent);
          continue;
        }

        // ⚡ PRIORITÉ 2: Responses API delta (fallback legacy)
        if (currentEvent && currentEvent.includes('response.output_text.delta')) {
          const delta = parsed.delta ?? parsed.text ?? parsed.textDelta ?? parsed.output_text_delta;
          if (typeof delta === 'string' && delta) {
            onContent(delta);
            continue;
          }
        }

        // ⚡ PRIORITÉ 3: Type-based delta (autres implémentations)
        if (parsed.type && parsed.type === 'response.output_text.delta') {
          const delta = parsed.delta ?? parsed.text;
          if (typeof delta === 'string' && delta) {
            onContent(delta);
            continue;
          }
        }
      } catch (e) {
        // ⚡ IGNORER SILENCIEUSEMENT les erreurs JSON pour performance
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

// 🔄 NOUVEAU: Alias pour utiliser Chat Completions au lieu de Responses API (non-streaming)
export async function sendMessageToOpenAINonStreamingResponses(
  messages: ChatMessage[],
  model: string = DEFAULT_GPT5_MODEL,
  reasoningEffort: ReasoningEffort = 'low',
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  // 🚀 REDIRECTION: Utiliser Chat Completions GPT-5 au lieu de Responses API
  console.log('🔄 Redirection Non-Streaming Responses API → Chat Completions GPT-5');
  
  return testGPT5ChatCompletions(messages);
}

// 🗂️ LEGACY: Appel non-streaming (utile pour le raisonnement élevé en RN)
export async function sendMessageToOpenAINonStreamingResponsesLEGACY(
  messages: ChatMessage[],
  model: string = DEFAULT_GPT5_MODEL,
  reasoningEffort: ReasoningEffort = 'low',
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const proxy = requireProxy();

  const payload: any = {
    model,
    input: messages.map((m) => ({
      role: m.role,
      content: [
        { type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }
      ]
    })),
    max_output_tokens: options?.maxOutputTokens ?? 1024,
    reasoning: { effort: reasoningEffort },
    stream: false,
    // Forcer une sortie textuelle claire côté Responses API
    text: { format: { type: 'text' } },
  };
  // Sécurité: supprimer tout vestige éventuel de response_format
  if ((payload as any).response_format) delete (payload as any).response_format;
  // Debug minimal (pas de contenu), uniquement les clés top-level
  try { console.log('🧠 Payload non-stream keys:', Object.keys(payload)); } catch {}
  if (typeof options?.temperature === 'number') payload.temperature = options.temperature;

  console.log('🧠 Non-stream Responses API:', { model, reasoningEffort, messagesCount: messages.length });
  const res = await fetch(`${proxy}/v1/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Aligner avec le mode streaming: passer ORG/PROJECT si présents
      ...(process.env.EXPO_PUBLIC_OPENAI_ORG ? { 'OpenAI-Organization': process.env.EXPO_PUBLIC_OPENAI_ORG } : {}),
      ...(process.env.EXPO_PUBLIC_OPENAI_PROJECT ? { 'OpenAI-Project': process.env.EXPO_PUBLIC_OPENAI_PROJECT } : {}),
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

  // Extraction robuste et priorisée (évite de prendre l'id resp_* ou des statuts)
  const deepExtract = (obj: any): string | null => {
    if (!obj) return null;
    const isStatusLike = (s: string) => /^(incomplete|complete|completed|success|succeeded|failed|error|running|queued|pending|processing|thinking|thought|finalizing|ok|done|idle)$/i.test(s.trim());
    const likelyText = (s: string) => {
      const t = s.trim();
      if (!t) return false;
      if (isStatusLike(t)) return false;
      if (/^resp_[a-z0-9]/i.test(t)) return false;
      // Favoriser des textes avec espaces ou ponctuation, et une longueur minimale
      if (t.length >= 24) return true;
      if (/[.!?]\s|\s/.test(t) && t.length >= 16) return true;
      return false;
    };
    const prefer = (s: any) => (typeof s === 'string' && likelyText(s)) ? s : null;

    // 1) Formats prioritaires connus
    if (typeof obj?.output_text === 'string' && obj.output_text.trim()) return obj.output_text;
    if (Array.isArray(obj?.content)) {
      for (const c of obj.content) {
        if ((c?.type === 'output_text' || c?.type === 'text') && typeof c?.text === 'string' && c.text.trim()) return c.text;
      }
    }
    if (Array.isArray(obj?.output)) {
      for (const c of obj.output) {
        if ((c?.type === 'output_text' || c?.type === 'text') && typeof c?.text === 'string' && c.text.trim()) return c.text;
      }
    }
    const choices = obj?.choices;
    if (Array.isArray(choices) && choices[0]?.message?.content && typeof choices[0].message.content === 'string') return choices[0].message.content;
    if (obj?.message?.content && typeof obj.message.content === 'string') return obj.message.content;

    // 2) Parcours récursif mais on ignore les clés non textuelles connues
    if (Array.isArray(obj)) {
      for (const it of obj) {
        const got = deepExtract(it);
        if (prefer(got)) return got as string;
      }
    } else if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      const ignore = new Set(['id','object','model','created','created_at','usage','status','type','event','finish_reason','reason','severity','state','error']);
      for (const key of keys) {
        if (ignore.has(key)) continue;
        const got = deepExtract(obj[key]);
        if (prefer(got)) return got as string;
      }
      // Dernière chance: accepter une chaîne même sans espace si rien trouvé
      for (const key of keys) {
        if (ignore.has(key)) continue;
        const val = obj[key];
        if (typeof val === 'string' && likelyText(val)) return val;
      }
    } else if (typeof obj === 'string') {
      if (prefer(obj)) return obj;
    }
    return null;
  };

  const extracted = deepExtract(json);
  if (extracted && extracted.trim()) {
    console.log('🧠 Non-stream OK (extracted):', extracted.length, 'caractères');
    return extracted;
  }

  // Fallback si la réponse est incomplète (souvent à cause de max_output_tokens avant le texte final)
  try {
    const status = (json as any)?.status;
    const reason = (json as any)?.incomplete_details?.reason;
    if (status === 'incomplete' || reason === 'max_output_tokens') {
      console.warn('🧠 Non-stream: statut incomplet, tentative fallback streaming (Responses API)…');
      let aggregated = '';
      await sendMessageToOpenAIStreamingResponses(
        messages,
        {
          onChunk: (c) => { aggregated += c; },
          onComplete: () => {},
          onError: () => {},
        },
        model,
        undefined,
        undefined,
        { maxOutputTokens: Math.min(1024, options?.maxOutputTokens ?? 1000) }
      );
      if (aggregated && aggregated.trim()) {
        console.log('🧠 Fallback streaming OK:', aggregated.length, 'caractères');
        return aggregated;
      }
    }
  } catch (e) {
    console.warn('🧠 Fallback streaming échoué:', (e as any)?.message || e);
  }

  console.warn('🧠 Non-stream: impossible d\'extraire du texte. JSON:', text.slice(0, 500));
  // Dernier repli: utiliser l'API Chat Completions non-stream avec un modèle fiable texte
  try {
    const fallbackModel = /gpt-5/i.test(model) ? 'gpt-4o-mini' : model;
    console.warn('🧠 Fallback final via Chat Completions (modèle):', fallbackModel);
    const completion = await sendMessageToOpenAI(messages, fallbackModel);
    return completion || '';
  } catch (e) {
    console.warn('🧠 Fallback Chat Completions échoué:', (e as any)?.message || e);
  }
  return '';
}
// 🔄 NOUVEAU: Alias pour utiliser Chat Completions au lieu de Responses API
export async function sendMessageToOpenAIStreamingResponses(
  messages: ChatMessage[],
  callbacks: StreamingCallbacks,
  model: string = DEFAULT_GPT5_MODEL,
  reasoningEffort: ReasoningEffort = 'low',
  abortController?: AbortController,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<void> {
  // 🚀 REDIRECTION: Utiliser Chat Completions GPT-5 au lieu de Responses API
  console.log('🔄 Redirection Responses API → Chat Completions GPT-5');
  
  return sendMessageToGPT5ChatCompletions(
    messages,
    callbacks,
    model.includes('gpt-5') ? model : "gpt-5-nano",
    abortController,
    {
      verbosity: "low",
      reasoning_effort: reasoningEffort === 'low' ? "minimal" : reasoningEffort,
      temperature: options?.temperature
    }
  );
}

// 🗂️ LEGACY: Ancienne fonction Responses API (conservée pour référence)
export async function sendMessageToOpenAIStreamingResponsesLEGACY(
  messages: ChatMessage[],
  callbacks: StreamingCallbacks,
  model: string = DEFAULT_GPT5_MODEL,
  reasoningEffort: ReasoningEffort = 'low',
  abortController?: AbortController,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<void> {
  const proxy = requireProxy();

  console.log('🚀 Streaming Responses API:', { model, messagesCount: messages.length });

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let fullResponse = '';
    let buffer = '';

    xhr.open('POST', `${proxy}/v1/responses`);
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

    if (abortController && abortController.signal) {
      // Certains environnements RN ne disposent pas d'addEventListener sur le signal
      try {
        // @ts-ignore
        abortController.signal.addEventListener?.('abort', () => {
          console.log('⏹️ Requête XHR annulée');
          xhr.abort();
        });
      } catch {}
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
      input: messages.map((m) => ({
        role: m.role,
        content: [
          { type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }
        ]
      })),
      max_output_tokens: options?.maxOutputTokens ?? 1000,
      stream: true,
      text: { format: { type: 'text' } },
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