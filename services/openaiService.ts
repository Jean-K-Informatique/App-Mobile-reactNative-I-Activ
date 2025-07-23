// Service OpenAI pour les conversations IA
// ⚠️ IMPORTANT: Ajoutez votre clé OpenAI dans le fichier .env
// VITE_OPENAI_API_KEY=sk-proj-votre-clé-ici
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "VOTRE_CLE_OPENAI_ICI";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendMessageToOpenAI(
  messages: ChatMessage[],
  model: string = 'gpt-4'
): Promise<string> {
  try {
    console.log('Envoi de message à OpenAI:', { model, messagesCount: messages.length });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    
    console.log('Réponse OpenAI reçue:', { 
      usage: data.usage, 
      responseLength: aiResponse.length 
    });
    
    return aiResponse;
  } catch (error) {
    console.error('Erreur lors de l\'appel à OpenAI:', error);
    throw error;
  }
} 