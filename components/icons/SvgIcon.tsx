import React from 'react';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

interface SvgIconProps {
  name: string;
  size?: number;
  color?: string;
}

// Import des SVG comme strings
const SVG_ICONS = {
  navbar: require('../../assets/mobile-assets/navbar.svg'),
  navbarClair: require('../../assets/mobile-assets/navbarClair.svg'),
  trombone: require('../../assets/mobile-assets/trombone.svg'),
  tromboneClair: require('../../assets/mobile-assets/tromboneClair.svg'),
  image: require('../../assets/mobile-assets/image.svg'),
  imageClair: require('../../assets/mobile-assets/imageClair.svg'),
  send: require('../../assets/mobile-assets/Send.svg'),
  sendClair: require('../../assets/mobile-assets/SendClair.svg'),
  tools: require('../../assets/mobile-assets/Tools.svg'),
  toolsClair: require('../../assets/mobile-assets/ToolsClair.svg'),
  historique: require('../../assets/mobile-assets/Historique.svg'),
  historiqueClair: require('../../assets/mobile-assets/HistoriqueClair.svg'),
  new: require('../../assets/mobile-assets/New.svg'),
  newClair: require('../../assets/mobile-assets/NewClair.svg'),
};

export default function SvgIcon({ name, size = 20, color }: SvgIconProps) {
  const { isDark } = useTheme();
  
  // Sélectionner l'icône selon le thème si disponible
  const getIconName = () => {
    if (name.includes('Clair') || name.includes('clair')) return name;
    
    // Pour les icônes qui ont une variante claire
    const clairVariant = name + 'Clair';
    if (SVG_ICONS[clairVariant as keyof typeof SVG_ICONS] && !isDark) {
      return clairVariant;
    }
    
    return name;
  };

  const iconName = getIconName();
  const svgIcon = SVG_ICONS[iconName as keyof typeof SVG_ICONS];

  if (!svgIcon) {
    console.warn(`Icône SVG non trouvée: ${iconName}`);
    return null;
  }

  // Note: En React Native, il faut lire le contenu du fichier SVG comme string
  // Pour simplifier, utilisons directement les fichiers SVG avec SvgXml
  // ou créer des composants SVG spécifiques
  
  return (
    <SvgXml 
      xml={svgIcon} 
      width={size} 
      height={size}
      fill={color}
    />
  );
}

// Fonction utilitaire pour obtenir la couleur d'icône selon le thème
export const getIconColor = (isDark: boolean) => {
  return isDark ? '#ffffff' : '#000000';
}; 