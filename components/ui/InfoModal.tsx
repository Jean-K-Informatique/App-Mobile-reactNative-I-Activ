import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function InfoModal({ visible, onClose }: InfoModalProps) {
  const { theme, isDark } = useTheme();

  // Logo adaptatif selon le thème
  const logoSource = isDark 
    ? require('../../assets/images/LogoTexteBlanc.png')
    : require('../../assets/images/LogoTexteNoir.png');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#2a2a2a' : '#e5e7eb' }]}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>À propos d'I-Activ</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={logoSource}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Section principale */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Qui sommes-nous ?
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              I-Activ est une entreprise française basée à Tours, spécialisée dans le développement de logiciels et d'applications liées à l'intelligence artificielle.
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Notre mission est d'accompagner les utilisateurs et les entreprises dans leur transition vers l'IA en rendant cette technologie accessible à tous.
            </Text>
          </View>

          {/* Section sur l'application */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Notre application
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Cette application est gratuite et se veut intuitive. Elle a été conçue pour rendre l'intelligence artificielle accessible à tous, sans barrière technique.
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Nous croyons fermement que l'IA doit être un outil d'accompagnement pour chacun, c'est pourquoi nous avons fait le choix de la gratuité.
            </Text>
          </View>

          {/* Section confidentialité */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Respect de votre vie privée
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Aucune de vos données ou informations envoyées à l'IA n'est revendue ou utilisée à des fins commerciales. Vos messages ne servent pas non plus à améliorer les modèles d'IA.
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Les intelligences artificielles que nous utilisons sont déjà extrêmement performantes et n'ont pas besoin des données de nos utilisateurs pour s'améliorer.
            </Text>
          </View>

          {/* Section philosophie */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Notre philosophie
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Nous nous voulons être une entreprise à taille humaine. Notre objectif n'est pas d'avoir des millions d'utilisateurs, mais de fournir un service de qualité à ceux qui nous font confiance.
            </Text>
            <Text style={[styles.highlight, { color: theme.text.primary, backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              "Si l'application est gratuite, c'est que c'est toi le produit !" 😉
            </Text>
          </View>

          {/* Section services */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Pourquoi cette application est-elle gratuite ?
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Cette application nous sert de vitrine pour nous faire connaître. C'est un pari : en fournissant gratuitement un outil fonctionnel et utile, nous espérons que les personnes et entreprises ayant besoin de développement sur mesure ou d'intégration d'outils IA penseront à nous.
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Car I-Activ, c'est bien plus que cette application : nous accompagnons les entreprises dans leurs projets technologiques les plus ambitieux.
            </Text>
          </View>

          {/* Section contact */}
          <View style={[styles.section, styles.contactSection]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Restons en contact
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Nous sommes ouverts à tous vos retours et suggestions pour améliorer cette application.
            </Text>
            <Text style={[styles.text, { color: theme.text.secondary }]}>
              Vous avez un projet de développement sur mesure ou besoin d'intégrer des outils IA dans votre entreprise ? N'hésitez pas à nous contacter !
            </Text>
            <View style={[styles.contactBox, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <Text style={[styles.contactText, { color: theme.text.primary }]}>
                📧 contact@i-activ.fr
              </Text>
              <Text style={[styles.contactText, { color: theme.text.primary }]}>
                📍 120 rue Febvotte, 37000 Tours
              </Text>
            </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logoImage: {
    width: screenWidth * 0.6,
    height: 80,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  highlight: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  contactSection: {
    marginBottom: 50,
  },
  contactBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  contactText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
});
