import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchUserChats, type Chat } from '../../services/chatService';

interface AssistantPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (chat: Chat) => void;
}

export default function AssistantPickerModal({ visible, onClose, onSelect }: AssistantPickerModalProps) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchUserChats();
        setChats(list);
        console.log(`📋 Picker: ${list.length} assistants autorisés`);
      } catch (e) {
        console.error('❌ Picker: erreur chargement chats', e);
        setChats([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgrounds.secondary, borderColor: theme.borders.primary }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>Choisir un assistant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeTxt, { color: theme.text.primary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}> 
              <ActivityIndicator color={isDark ? '#fff' : '#000'} />
            </View>
          ) : chats.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>
                Aucun assistant disponible pour votre compte.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {chats.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.item, { borderColor: theme.borders.primary }]}
                  onPress={() => onSelect(c)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: theme.text.primary }]}>{c.name}</Text>
                    {c.description ? (
                      <Text style={[styles.itemDesc, { color: theme.text.secondary }]} numberOfLines={2}>
                        {c.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.badge, { color: theme.text.secondary }]}>{c.model || 'modèle'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 520,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
  },
  closeTxt: {
    fontSize: 18,
    fontWeight: '700',
  },
  center: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    fontSize: 11,
    opacity: 0.7,
    marginLeft: 8,
  },
});


