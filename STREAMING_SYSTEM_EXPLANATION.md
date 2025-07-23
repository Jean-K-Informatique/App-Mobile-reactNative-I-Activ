# 🚀 SYSTÈME DE STREAMING I-ACTIV - GUIDE TECHNIQUE POUR REACT NATIVE

## Vue d'ensemble
Dans l'application web, le streaming fonctionne parfaitement grâce à plusieurs mécanismes coordonnés qui permettent d'afficher les réponses mot par mot dès réception. Voici comment reproduire cette rapidité en React Native.

## 1. 🔄 MÉCANISME PRINCIPAL DE STREAMING

### A. Configuration de l'API OpenAI (Côté service)

```javascript
// Configuration essentielle pour le streaming
const stream = await openai.chat.completions.create({
  model: "gpt-4.1-mini-2025-04-14",
  messages: messagesForAPI,
  temperature: 0.7,
  stream: true  // ✅ CRUCIAL : Active le streaming
}, { signal: currentController.signal });

// Traitement chunk par chunk
for await (const chunk of stream) {
  if (currentController?.signal.aborted) {
    throw new Error('RESPONSE_STOPPED');
  }
  
  const content = chunk.choices[0]?.delta?.content || '';
  if (content) {
    responseText += content;
    onPartialResponse(content); // ✅ IMMÉDIAT : Envoi du fragment
  }
}
```

### B. Points clés pour React Native
- Utiliser `fetch` avec `ReadableStream` ou `XMLHttpRequest` pour Server-Sent Events
- Implémenter `AbortController` pour pouvoir arrêter le streaming
- Parser les chunks JSON ligne par ligne (format Server-Sent Events)

## 2. 📡 SYSTÈME DE CALLBACK OPTIMISÉ

### A. Callback `onPartialResponse` (Web)
```javascript
// Dans ChatWindow.jsx - Ligne 881+
(partialResponse, isComplete = false) => {
  setMessages(prev => {
    const currentMessage = prev.find(msg => msg.id === assistantMessage.id);
    if (!currentMessage) return prev;
    
    if (isComplete) {
      // Remplacement complet pour la réponse finale
      return prev.map(msg =>
        msg.id === assistantMessage.id
        ? { ...msg, content: partialResponse }
        : msg
      );
    }
    
    // ✅ ACCUMULATION : Ajout du nouveau fragment
    const updatedContent = currentMessage.content + partialResponse;
    return prev.map(msg =>
      msg.id === assistantMessage.id
      ? { ...msg, content: updatedContent }
      : msg
    );
  });
}
```

### B. Pour React Native
```javascript
// Équivalent React Native avec useState
const [messages, setMessages] = useState([]);

const onPartialResponse = (partialText, isComplete = false) => {
  setMessages(prevMessages => {
    const messageIndex = prevMessages.findIndex(msg => msg.id === assistantMessageId);
    if (messageIndex === -1) return prevMessages;
    
    const updatedMessages = [...prevMessages];
    if (isComplete) {
      updatedMessages[messageIndex].content = partialText;
    } else {
      // ✅ CRUCIAL : Accumulation immédiate
      updatedMessages[messageIndex].content += partialText;
    }
    return updatedMessages;
  });
};
```

## 3. ⚡ SYSTÈME DE BUFFER INTELLIGENT

### A. Optimisation des performances (Web)
```javascript
// Dans responsesApi.js - Ligne 390+
let lastUpdateTime = Date.now();
let updateBuffer = '';
const MIN_UPDATE_INTERVAL = 150; // 150ms entre les mises à jour
const MIN_BUFFER_SIZE = 10;      // 10 caractères minimum
const MAX_BUFFER_SIZE = 100;     // 100 caractères maximum

// Logique de buffer optimisée
if (chunk.choices && chunk.choices[0]?.delta?.content) {
  const partialContent = chunk.choices[0].delta.content || '';
  
  updateBuffer += partialContent;
  combinedText += partialContent;
  
  const now = Date.now();
  const timeDiff = now - lastUpdateTime;
  const bufferSize = updateBuffer.length;
  
  // ✅ SMART UPDATE : Conditions optimisées
  if (timeDiff > MIN_UPDATE_INTERVAL && bufferSize >= MIN_BUFFER_SIZE || 
      bufferSize >= MAX_BUFFER_SIZE) {
    onPartialUpdate(updateBuffer, false);
    updateBuffer = '';
    lastUpdateTime = now;
  }
}

// Envoyer le reste du buffer à la fin
if (updateBuffer.length > 0) {
  onPartialUpdate(updateBuffer, false);
}
```

### B. Implémentation React Native
```javascript
// Service de streaming pour React Native
class StreamingService {
  constructor() {
    this.buffer = '';
    this.lastUpdateTime = 0;
    this.MIN_UPDATE_INTERVAL = 100; // Plus rapide sur mobile
    this.MIN_BUFFER_SIZE = 5;       // Plus petit sur mobile
    this.MAX_BUFFER_SIZE = 50;      // Plus petit sur mobile
  }
  
  processChunk(chunk, onPartialUpdate) {
    this.buffer += chunk;
    
    const now = Date.now();
    const timeDiff = now - this.lastUpdateTime;
    const bufferSize = this.buffer.length;
    
    if (timeDiff > this.MIN_UPDATE_INTERVAL && bufferSize >= this.MIN_BUFFER_SIZE || 
        bufferSize >= this.MAX_BUFFER_SIZE) {
      onPartialUpdate(this.buffer);
      this.buffer = '';
      this.lastUpdateTime = now;
    }
  }
  
  flush(onPartialUpdate) {
    if (this.buffer.length > 0) {
      onPartialUpdate(this.buffer);
      this.buffer = '';
    }
  }
}
```

## 4. 🔧 IMPLÉMENTATION REACT NATIVE COMPLÈTE

### A. Service API avec Streaming
```javascript
// services/OpenAIStreamingService.js
export class OpenAIStreamingService {
  async streamChatCompletion(messages, onPartialResponse, abortController) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: messages,
        stream: true,
        temperature: 0.7
      }),
      signal: abortController?.signal
    });

    if (!response.body) {
      throw new Error('Streaming non supporté');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                onPartialResponse(content); // ✅ IMMÉDIAT
              }
            } catch (e) {
              console.warn('Erreur parsing JSON:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }
}
```

### B. Hook React Native pour Chat
```javascript
// hooks/useChatStreaming.js
import { useState, useCallback, useRef } from 'react';

export const useChatStreaming = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const streamingService = useRef(new OpenAIStreamingService());
  const abortController = useRef(null);

  const sendMessage = useCallback(async (userMessage) => {
    // Ajouter le message utilisateur
    const userMsg = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    // Ajouter message assistant vide
    const assistantMsg = {
      id: Date.now() + 1,
      type: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    abortController.current = new AbortController();

    try {
      await streamingService.current.streamChatCompletion(
        [...messages, userMsg].map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        // ✅ CALLBACK STREAMING
        (partialContent) => {
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const assistantIndex = updatedMessages.findIndex(
              msg => msg.id === assistantMsg.id
            );
            if (assistantIndex !== -1) {
              // ✅ ACCUMULATION IMMÉDIATE
              updatedMessages[assistantIndex].content += partialContent;
            }
            return updatedMessages;
          });
        },
        abortController.current
      );
    } catch (error) {
      console.error('Erreur streaming:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const stopGeneration = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    stopGeneration
  };
};
```

### C. Composant Chat React Native
```javascript
// components/ChatScreen.js
import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useChatStreaming } from '../hooks/useChatStreaming';

export const ChatScreen = () => {
  const { messages, isLoading, sendMessage, stopGeneration } = useChatStreaming();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef(null);

  // ✅ AUTO-SCROLL pendant le streaming
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }}
        onContentSizeChange={() => 
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((message) => (
          <View key={message.id} style={{
            alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: message.type === 'user' ? '#007AFF' : '#F0F0F0',
            padding: 10,
            borderRadius: 10,
            margin: 5,
            maxWidth: '80%'
          }}>
            <Text style={{
              color: message.type === 'user' ? 'white' : 'black'
            }}>
              {message.content}
            </Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderRadius: 5, padding: 10 }}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Tapez votre message..."
          multiline
        />
        <TouchableOpacity 
          onPress={isLoading ? stopGeneration : handleSend}
          style={{ 
            backgroundColor: isLoading ? '#FF3B30' : '#007AFF',
            padding: 10,
            borderRadius: 5,
            marginLeft: 10 
          }}
        >
          <Text style={{ color: 'white' }}>
            {isLoading ? 'Stop' : 'Envoyer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

## 5. 🎯 POINTS CRITIQUES POUR LA RAPIDITÉ

### A. Ce qui rend le streaming rapide dans l'app web :
1. **Pas d'attente** : `onPartialResponse(content)` appelé immédiatement
2. **Accumulation simple** : `currentMessage.content + partialResponse`
3. **Buffer intelligent** : Évite trop de re-renders
4. **Abort Controller** : Permet d'arrêter rapidement

### B. Optimisations spécifiques React Native :
1. **Réduire les intervalles** : MIN_UPDATE_INTERVAL à 100ms au lieu de 150ms
2. **Utiliser `requestAnimationFrame`** pour les mises à jour UI
3. **Éviter les re-renders inutiles** avec `React.memo`
4. **Auto-scroll optimisé** avec `onContentSizeChange`

## 6. 🚨 ERREURS À ÉVITER

### ❌ Ne PAS faire :
```javascript
// MAUVAIS : Attendre la réponse complète
const response = await openai.chat.completions.create({
  stream: false  // ❌ Pas de streaming
});
setMessage(response.choices[0].message.content); // ❌ Tout d'un coup
```

### ✅ À faire :
```javascript
// BON : Streaming immédiat
const stream = await openai.chat.completions.create({
  stream: true  // ✅ Streaming activé
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  if (content) {
    onPartialResponse(content); // ✅ Immédiat
  }
}
```

## 7. 📱 CONFIGURATION SPÉCIFIQUE REACT NATIVE

### Package.json dependencies :
```json
{
  "dependencies": {
    "react-native": "^0.72.0",
    "react-native-fetch-api": "^3.0.0", // Pour streaming
    "react-native-url-polyfill": "^1.3.0" // Pour URL
  }
}
```

### Metro.config.js :
```javascript
// Pour supporter les streams
module.exports = {
  resolver: {
    platforms: ['ios', 'android', 'native', 'web'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
```

## 8. 🎬 SÉQUENCE COMPLÈTE

1. **Utilisateur tape message** → Ajout immédiat à l'état
2. **Message assistant vide créé** → Placeholder dans l'UI  
3. **Appel API streaming** → `stream: true`
4. **Premier chunk reçu** → `onPartialResponse(chunk)` immédiat
5. **Accumulation continue** → `content += newChunk`
6. **Buffer intelligent** → Optimise les re-renders
7. **Auto-scroll** → Suit la génération
8. **Fin du stream** → Message complet

## 💡 RÉSUMÉ POUR L'IMPLÉMENTATION

La clé de la rapidité est :
1. **Streaming API activé** (`stream: true`)
2. **Callback immédiat** sans attente
3. **Accumulation simple** (`content += chunk`)
4. **Buffer optimisé** pour les performances
5. **Auto-scroll** pendant la génération

Avec cette architecture, tu auras exactement la même rapidité qu'en web ! 