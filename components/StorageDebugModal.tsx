import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { localStorageService } from '../services/localStorageService';

interface StorageDebugModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StorageDebugModal({ visible, onClose }: StorageDebugModalProps) {
  const { theme, isDark } = useTheme();
  const [stats, setStats] = useState<{[key: string]: number}>({});
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    if (visible) {
      loadStats();
    }
  }, [visible]);

  const loadStats = async () => {
    try {
      const widgetStats = await localStorageService.getStats();
      setStats(widgetStats);
      
      const total = Object.values(widgetStats).reduce((sum, size) => sum + size, 0);
      setTotalSize(total);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUsagePercentage = (size: number): number => {
    const maxTotal = 500000; // 500KB max
    return Math.min((size / maxTotal) * 100, 100);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
        <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#e5e7eb' }]}>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            📊 Stockage Local - Debug
          </Text>
          <TouchableOpacity 
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }]}
          >
            <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Résumé global */}
          <View style={[styles.section, { backgroundColor: isDark ? '#1a1a1a' : '#f9fafb' }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              📈 Utilisation Globale
            </Text>
            <Text style={[styles.totalSize, { color: theme.text.primary }]}>
              {formatSize(totalSize)} / 500 KB
            </Text>
            <View style={[styles.progressBar, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${getUsagePercentage(totalSize)}%`,
                    backgroundColor: getUsagePercentage(totalSize) > 80 ? '#ef4444' : '#10b981'
                  }
                ]} 
              />
            </View>
            <Text style={[styles.percentage, { color: theme.text.secondary }]}>
              {getUsagePercentage(totalSize).toFixed(1)}% utilisé
            </Text>
          </View>

          {/* Détail par widget */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              🗂️ Détail par Widget
            </Text>
            
            {Object.entries(stats).length === 0 ? (
              <Text style={[styles.noData, { color: theme.text.secondary }]}>
                Aucune donnée stockée
              </Text>
            ) : (
              Object.entries(stats)
                .sort(([,a], [,b]) => b - a) // Trier par taille décroissante
                .map(([widget, size]) => (
                  <View key={widget} style={[styles.widgetItem, { borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
                    <View style={styles.widgetHeader}>
                      <Text style={[styles.widgetName, { color: theme.text.primary }]}>
                        {widget.charAt(0).toUpperCase() + widget.slice(1)}
                      </Text>
                      <Text style={[styles.widgetSize, { color: theme.text.secondary }]}>
                        {formatSize(size)}
                      </Text>
                    </View>
                    <View style={[styles.widgetProgressBar, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}>
                      <View 
                        style={[
                          styles.widgetProgressFill, 
                          { 
                            width: `${Math.min((size / Math.max(...Object.values(stats))) * 100, 100)}%`,
                            backgroundColor: isDark ? '#60a5fa' : '#3b82f6'
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))
            )}
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              🔧 Actions
            </Text>
            <TouchableOpacity 
              onPress={loadStats}
              style={[styles.actionButton, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
            >
              <Text style={[styles.actionButtonText, { color: theme.text.primary }]}>
                🔄 Actualiser
              </Text>
            </TouchableOpacity>
          </View>

          {/* Informations */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              ℹ️ Informations
            </Text>
            <Text style={[styles.infoText, { color: theme.text.secondary }]}>
              • Les conversations sont sauvegardées automatiquement{'\n'}
              • Limite recommandée : 500 KB total{'\n'}
              • Limite par conversation : 50 KB{'\n'}
              • Nettoyage automatique si nécessaire{'\n'}
              • Bouton "+" réinitialise la conversation locale
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  totalSize: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  noData: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  widgetItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  widgetName: {
    fontSize: 16,
    fontWeight: '600',
  },
  widgetSize: {
    fontSize: 14,
    fontWeight: '500',
  },
  widgetProgressBar: {
    height: 4,
    borderRadius: 2,
  },
  widgetProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
