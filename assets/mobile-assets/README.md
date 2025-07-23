# 🎨 ASSETS I-ACTIV MOBILE - GUIDE D'UTILISATION

Ce dossier contient tous les assets visuels nécessaires pour reproduire l'interface I-Activ en React Native.

## 📱 NAVIGATION ET UI

### navbar.svg / navbarClair.svg
- **Usage** : Icône du menu hamburger pour ouvrir/fermer la sidebar
- **Mode sombre** : navbar.svg
- **Mode clair** : navbarClair.svg
- **Taille** : 24x24px (20x20px sur mobile)
- **Couleur** : Adaptée automatiquement selon le thème

### Send.svg / SendClair.svg
- **Usage** : Bouton d'envoi des messages dans la zone de chat
- **Mode sombre** : Send.svg avec filter brightness(0) pour noir
- **Mode clair** : Send.svg avec filter brightness(1) pour blanc
- **Taille** : 20x20px (16x16px sur mobile)
- **Background** : Bouton rond blanc (sombre) ou #222422 (clair)

## 🔧 OUTILS ET FONCTIONNALITÉS

### trombone.svg / tromboneClair.svg
- **Usage** : Bouton d'extracteur de texte PDF
- **Mode sombre** : trombone.svg
- **Mode clair** : tromboneClair.svg
- **Taille** : 16x16px
- **Position** : Barre d'outils du chat

### image.svg / imageClair.svg
- **Usage** : Bouton d'upload d'images
- **Mode sombre** : image.svg
- **Mode clair** : imageClair.svg
- **Taille** : 16x16px
- **Position** : Barre d'outils du chat

### Tools.svg / ToolsClair.svg
- **Usage** : Icône du menu outils (accès aux fonctionnalités)
- **Mode sombre** : Tools.svg
- **Mode clair** : ToolsClair.svg
- **Taille** : 16x16px
- **Position** : Barre d'outils du chat

## 📚 HISTORIQUE ET NAVIGATION

### Historique.svg / HistoriqueClair.svg
- **Usage** : Bouton d'accès à l'historique des conversations
- **Mode sombre** : Historique.svg
- **Mode clair** : HistoriqueClair.svg
- **Taille** : 20x16px
- **Position** : Sidebar navigation

### New.svg / NewClair.svg
- **Usage** : Bouton nouveau chat
- **Mode sombre** : New.svg
- **Mode clair** : NewClair.svg
- **Taille** : 16x16px
- **Position** : Sidebar navigation

## 🏷️ LOGOS ET BRANDING

### LogoSombre.png / LogoClair.png
- **Usage** : Logo principal sidebar fermée
- **Mode sombre** : LogoSombre.png
- **Mode clair** : LogoClair.png
- **Taille mobile** : 28x28px
- **Taille desktop** : 40x40px
- **Position** : Bas de la sidebar

### LogoSombreTexte.png
- **Usage** : Logo principal avec texte pour la page de connexion
- **Taille mobile** : 60x60px
- **Taille desktop** : 500x500px
- **Position** : Page de connexion (en haut mobile, à gauche desktop)

### LogoSombreTexteClairCote.png
- **Usage** : Logo avec texte pour sidebar étendue en mode sombre
- **Taille** : Auto height, width adaptative
- **Position** : Bas de la sidebar étendue (mode sombre)

### LogoSombreTexteClaire2.png
- **Usage** : Logo avec texte pour sidebar étendue en mode clair
- **Taille** : Auto height, width adaptative
- **Position** : Bas de la sidebar étendue (mode clair)

### LogoClairTexteSombreCôté.png
- **Usage** : Logo variante (backup/alternative)
- **Utilisation** : Selon contexte spécifique

## 🎨 INTÉGRATION REACT NATIVE

### Structure recommandée
```
/assets
  /icons
    - navbar.svg
    - navbarClair.svg
    - Send.svg
    - etc...
  /logos
    - LogoSombre.png
    - LogoClair.png
    - etc...
```

### Exemple d'utilisation avec thème
```javascript
// Fonction helper pour récupérer l'asset selon le thème
const getThemedIcon = (iconName, theme) => {
  if (theme === 'light') {
    return require(`./assets/icons/${iconName}Clair.svg`);
  }
  return require(`./assets/icons/${iconName}.svg`);
};

// Usage dans un composant
<Image 
  source={getThemedIcon('navbar', currentTheme)} 
  style={{width: 24, height: 24}} 
/>
```

### Gestion des thèmes
- **Thème sombre** : Fichiers sans suffixe (navbar.svg, Tools.svg, etc.)
- **Thème clair** : Fichiers avec suffixe "Clair" (navbarClair.svg, ToolsClair.svg, etc.)
- **Auto-switch** : Utiliser un système de Context React pour basculer automatiquement

### Tailles recommandées
- **Icônes UI** : 24x24px (20x20px sur mobile)
- **Icônes outils** : 16x16px
- **Logo sidebar fermée** : 28x28px mobile, 40x40px desktop
- **Logo connexion** : 60x60px mobile, 500x500px desktop

## 📏 CONVENTIONS DE NOMMAGE

### Pattern pour les icônes thématiques
- **Format** : `nomIcon.svg` (sombre) / `nomIconClair.svg` (clair)
- **Exemples** : 
  - navbar.svg → navbarClair.svg
  - Tools.svg → ToolsClair.svg
  - Send.svg → SendClair.svg

### Pattern pour les logos
- **Format** : `Logo[Variant][Theme][Position].png`
- **Exemples** :
  - LogoSombre.png (logo simple sombre)
  - LogoSombreTexte.png (logo avec texte)
  - LogoSombreTexteClairCote.png (logo avec texte, côté clair)

## 🚀 OPTIMISATIONS

### Pour React Native
1. **SVG** : Utiliser react-native-svg pour les icônes
2. **PNG** : Optimiser les logos avec @2x et @3x pour retina
3. **Caching** : Précharger les assets critiques
4. **Lazy loading** : Charger les assets secondaires à la demande

### Formats de sortie recommandés
- **SVG** : Conserver pour les icônes (scalabilité)
- **PNG** : Conserver pour les logos (qualité)
- **WebP** : Alternative pour réduire la taille (si supporté)

---

**Total des fichiers** : 21 assets
**Taille totale** : ~5MB
**Compatibilité** : iOS et Android via React Native

Tous ces assets respectent le design system I-Activ et permettront une reproduction fidèle de l'interface web en version mobile. 