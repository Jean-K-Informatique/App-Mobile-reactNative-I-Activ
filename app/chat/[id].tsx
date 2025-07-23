import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft, Send, Paperclip, Image as ImageIcon } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { sendMessageToOpenAI, type ChatMessage } from '../../services/openaiService';
import type { Chat } from '../../services/chatService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  loading?: boolean;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAITyping, setIsAITyping] = useState(false);

  // Charger les informations du chat
  useEffect(() => {
    const loadChat = async () => {
      if (typeof id === 'string') {
        try {
          console.log('Chargement du chat:', id);
          const chatDoc = await getDoc(doc(db, 'chats', id));
          if (chatDoc.exists()) {
            const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
            setChat(chatData);
            
                         // Initialiser avec le message de bienvenue si disponible
             if (chatData.welcomeMessage && chatData.welcomeMessage.trim()) {
               setMessages([{
                 id: '1',
                 text: chatData.welcomeMessage.trim(),
                 isUser: false,
                 timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
               }]);
             } else {
               // Message de bienvenue par défaut basé sur le nom de l'assistant
               setMessages([{
                 id: '1',
                 text: `Bonjour ! Je suis ${chatData.name}. Comment puis-je vous aider aujourd'hui ?`,
                 isUser: false,
                 timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
               }]);
             }
            console.log('Chat chargé:', chatData.name);
          } else {
            console.error('Chat non trouvé');
          }
        } catch (error) {
          console.error('Erreur lors du chargement du chat:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadChat();
  }, [id]);

  const sendMessage = async () => {
    if (!inputText.trim() || !chat || isAITyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    // Ajouter le message utilisateur
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsAITyping(true);

    // Ajouter un message de chargement pour l'IA
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: '...',
      isUser: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      loading: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      console.log('🤖 Envoi à OpenAI avec modèle:', chat.model);
      console.log('📝 Instructions assistant:', chat.content?.substring(0, 100) + '...');

      // Construire l'historique des messages pour OpenAI
      const openAIMessages: ChatMessage[] = [
        // System prompt avec les vraies instructions de l'assistant
        {
          role: 'system',
          content: chat.content || chat.instructions || 'Tu es un assistant IA utile.'
        },
        // Historique des messages (sans les messages de chargement)
        ...messages
          .filter(msg => !msg.loading)
          .map(msg => ({
            role: msg.isUser ? 'user' as const : 'assistant' as const,
            content: msg.text
          })),
        // Message actuel de l'utilisateur
        {
          role: 'user',
          content: currentInput
        }
      ];

      // Appel OpenAI avec le modèle spécifique de l'assistant
      const aiResponse = await sendMessageToOpenAI(
        openAIMessages, 
        chat.model || 'gpt-4'
      );

      // Remplacer le message de chargement par la vraie réponse
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                text: aiResponse,
                loading: false
              }
            : msg
        )
      );

      console.log('✅ Réponse OpenAI reçue:', aiResponse.substring(0, 100) + '...');

    } catch (error) {
      console.error('❌ Erreur OpenAI:', error);
      
      // Remplacer le message de chargement par un message d'erreur
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                text: 'Désolé, je rencontre un problème technique. Veuillez réessayer.',
                loading: false
              }
            : msg
        )
      );

      Alert.alert(
        'Erreur de connexion', 
        'Impossible de contacter l\'assistant IA. Vérifiez votre connexion.'
      );
    } finally {
      setIsAITyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.botBubble,
        item.loading && styles.loadingBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userText : styles.botText,
          item.loading && styles.loadingText
        ]}>
          {item.loading ? '💭 En cours de réflexion...' : item.text}
        </Text>
        <Text style={styles.messageTime}>{item.timestamp}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {loading ? 'Chargement...' : chat?.name || `Chat ${id}`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {loading ? '' : chat?.model || 'Assistant IA'}
          </Text>
        </View>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton}>
            <Paperclip size={20} color="#A0A0A0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachButton}>
            <ImageIcon size={20} color="#A0A0A0" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Écrivez votre message..."
            placeholderTextColor="#666666"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (inputText.trim() && !isAITyping) ? styles.sendButtonActive : null
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isAITyping}
          >
            <Send size={20} color={(inputText.trim() && !isAITyping) ? "#FFFFFF" : "#666666"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#00D4AA',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#333333',
    borderBottomLeftRadius: 4,
  },
  loadingBubble: {
    backgroundColor: '#444444',
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#FFFFFF',
  },
  loadingText: {
    fontStyle: 'italic',
    color: '#CCCCCC',
  },
  messageTime: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#1A1A1A',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
});