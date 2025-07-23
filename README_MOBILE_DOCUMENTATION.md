# 📱 DOCUMENTATION TECHNIQUE COMPLÈTE - I-ACTIV MOBILE

## Table des matières
1. Système de couleurs et thèmes
2. Interface de chat
3. Animation de bienvenue
4. Sidebar et navigation
5. Page de connexion
6. Profil utilisateur et abonnement
7. Assets et icônes
8. Système de personnalisation
9. Effets visuels spéciaux
10. Données fonctionnelles

---

## 1. 🎨 SYSTÈME DE COULEURS ET THÈMES

### Thème Sombre (par défaut)

const DARK_THEME = {
  backgrounds: {
    primary: '#1a1c1a',      // --color-bg-primary
    secondary: '#222422',    // --color-bg-secondary  
    tertiary: '#2a2c2a',     // --color-bg-tertiary
    chatInput: '#303030',    // Couleur spécifique chat input
    userMessage: '#303030',  // Bulles utilisateur
  },
  text: {
    primary: '#ffffff',      // --color-text-primary
    secondary: '#d1d5db',    // --color-text-secondary
  },
  borders: {
    primary: '#1f211f',      // --color-border
    chatHeader: 'rgba(247, 242, 242, 0.1)',
    sidebar: 'rgba(247, 242, 242, 0.1)',
  }
}

### Thème Clair

const LIGHT_THEME = {
  backgrounds: {
    primary: '#ffffff',      // --color-bg-primary
    secondary: '#f7f2f2',    // --color-bg-secondary
    tertiary: '#f3f4f6',     // --color-bg-tertiary
    chatInput: '#ffffff',    // Couleur spécifique chat input
    userMessage: '#5A5A5A',  // Bulles utilisateur (gris sobre)
  },
  text: {
    primary: '#111827',      // --color-text-primary
    secondary: '#374151',    // --color-text-secondary
  },
  borders: {
    primary: '#e5e7eb',      // --color-border
    chatInput: 'rgba(34, 37, 34, 0.2)',
  }
}

---

## 2. 💬 INTERFACE DE CHAT

### Container principal du chat

const ChatContainer = {
  flex: 1,
  backgroundColor: theme.backgrounds.secondary,
  position: 'relative',
}

const ChatInputContainer = {
  backgroundColor: theme.backgrounds.chatInput,
  borderRadius: 16, // 1rem border radius accentué
  borderWidth: 1,
  borderColor: theme.borders.chatInput,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 5,
}

### Bulles de messages

// Message utilisateur
const UserMessageBubble = {
  backgroundColor: theme.backgrounds.userMessage, // #303030 sombre / #5A5A5A clair
  color: '#ffffff',
  borderRadius: 24, // 1.5rem border radius accentué
  paddingVertical: 10,
  paddingHorizontal: 20,
  maxWidth: '85%',
  alignSelf: 'flex-end',
  marginBottom: 4,
}

// Message assistant
const AssistantMessageBubble = {
  backgroundColor: theme.backgrounds.secondary,
  color: theme.text.primary,
  borderRadius: 16, // 1rem border radius
  paddingVertical: 12,
  paddingHorizontal: 16,
  maxWidth: '85%',
  alignSelf: 'flex-start',
  marginBottom: 4,
}

### Zone de saisie des messages

const MessageInput = {
  flex: 1,
  backgroundColor: 'transparent',
  color: theme.text.primary,
  paddingVertical: 12,
  paddingHorizontal: 16,
  fontSize: 16,
  minHeight: 52,
  maxHeight: 250,
  textAlignVertical: 'top',
  borderRadius: 20, // Uniformisé
}

### Boutons de la barre d'outils

const ToolbarButton = {
  width: 38,
  height: 38,
  borderRadius: 19, // Complètement rond
  backgroundColor: theme.backgrounds.primary,
  borderWidth: 1,
  borderColor: theme.borders.primary,
  justifyContent: 'center',
  alignItems: 'center',
  marginHorizontal: 2,
  // Effet drop shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.7,
  shadowRadius: 0,
  elevation: 2,
}

// Au hover/press
const ToolbarButtonPressed = {
  ...ToolbarButton,
  shadowOpacity: 0.5,
  shadowRadius: 13,
  elevation: 8,
}

### Bouton d'envoi spécifique

const SendButton = {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: theme === 'dark' ? '#ffffff' : '#222422',
  justifyContent: 'center',
  alignItems: 'center',
  // L'icône Send.svg doit être filtrée :
  // - En mode sombre : filter brightness(0) pour noir
  // - En mode clair : filter brightness(1) pour blanc
}

---

## 3. 🔄 ANIMATION DE BIENVENUE

### Orbe central avec message

const WelcomeOrb = {
  width: '80%', // Responsive selon la taille d'écran
  aspectRatio: 1,
  position: 'relative',
  justifyContent: 'center',
  alignItems: 'center',
  // Gradient radial avec effet violet/cyan
}

const WelcomeText = {
  position: 'absolute',
  textAlign: 'center',
  color: theme === 'light' 
    ? '#1f2937' // Gris foncé en mode clair
    : '#ffffff', // Blanc en mode sombre
  // Drop shadow selon le thème
  textShadowColor: theme === 'light' 
    ? 'rgba(255,255,255,0.9)' 
    : 'rgba(124,58,237,0.7)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 6,
}

---

## 4. 📱 SIDEBAR ET NAVIGATION

### Sidebar container

const Sidebar = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: expanded ? 192 : 64, // 48px ou 16px selon l'état
  backgroundColor: theme.backgrounds.secondary,
  borderRightWidth: 0.5,
  borderRightColor: theme.borders.sidebar,
  zIndex: 50,
}

### Boutons de navigation avec StarBorder

const NavButton = {
  height: 40,
  borderRadius: 20,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: expanded ? 16 : 0,
  justifyContent: expanded ? 'flex-start' : 'center',
  // StarBorder animé avec couleur cyan/violet
  borderWidth: 2,
  borderColor: 'transparent', // Géré par l'animation StarBorder
}

### Logo en bas de sidebar

Les logos utilisent des fichiers spécifiques selon l'état :

**Menu fermé :**
- Mode clair : /images/LogoClair.png
- Mode sombre : /images/LogoSombre.png

**Menu étendu :**
- Mode clair : /images/LogoSombreTexteClaire2.png
- Mode sombre : /images/LogoSombreTexteClairCote.png

---

## 5. 🔐 PAGE DE CONNEXION

### Layout général

const LoginContainer = {
  flex: 1,
  backgroundColor: '#222522', // Couleur fixe
}

// Mobile : Layout en colonne
const MobileLayout = {
  flexDirection: 'column',
  // Logo en haut (60x60)
  // Formulaire en dessous
}

// Desktop : Layout en ligne  
const DesktopLayout = {
  flexDirection: 'row',
  // Logo à gauche (500x500)
  // Formulaire à droite
}

### Formulaire de connexion

const LoginForm = {
  backgroundColor: '#222522',
  borderRadius: 25,
  padding: 32,
  maxWidth: 400,
}

const LoginInput = {
  backgroundColor: '#171717',
  borderRadius: 35, // 70px/2
  paddingVertical: 12,
  paddingHorizontal: 48, // Place pour l'icône
  color: '#d3d3d3',
  fontSize: 16,
  // Shadow inset
  shadowColor: 'rgb(5, 5, 5)',
  shadowOffset: { width: 2, height: 5 },
  shadowOpacity: 1,
  shadowRadius: 10,
}

const LoginButton = {
  backgroundColor: '#1d9bf0', // Bleu principal
  borderRadius: 25,
  paddingVertical: 12,
  paddingHorizontal: 16,
  fontSize: 16,
  fontWeight: '600',
  color: '#ffffff',
}

---

## 6. 👤 PROFIL UTILISATEUR ET ABONNEMENT

### Modal de profil

const ProfileModal = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 50,
}

const ProfileContent = {
  backgroundColor: theme.backgrounds.secondary,
  borderRadius: 12,
  padding: 24,
  maxWidth: '90%',
  maxHeight: '90%',
}

### Onglets de navigation

const TabButton = {
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderBottomWidth: 2,
  borderBottomColor: active ? '#a78bfa' : 'transparent',
  color: active ? theme.text.primary : theme.text.secondary,
}

### Informations d'abonnement

const SubscriptionCard = {
  backgroundColor: theme.backgrounds.tertiary + '30', // 30% opacity
  borderRadius: 12,
  padding: 24,
  marginVertical: 16,
}

const StatusBadge = {
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 20,
  fontSize: 12,
  fontWeight: '500',
  backgroundColor: isActive ? '#10b981' + '20' : '#f59e0b' + '20',
  color: isActive ? '#10b981' : '#f59e0b',
}

---

## 7. 🎯 ASSETS ET ICÔNES

### Liste complète des icônes nécessaires

**Navigation et UI :**
- /images/navbar.svg - Mode sombre
- /images/navbarClair.svg - Mode clair
- /images/Send.svg - Bouton d'envoi
- /images/SendClair.svg - Bouton d'envoi mode clair

**Outils :**
- /images/trombone.svg - Extracteur PDF (sombre)
- /images/tromboneClair.svg - Extracteur PDF (clair)
- /images/image.svg - Upload d'image (sombre)
- /images/imageClair.svg - Upload d'image (clair)
- /images/Tools.svg - Menu outils (sombre)
- /images/ToolsClair.svg - Menu outils (clair)

**Historique :**
- /images/Historique.svg - Mode sombre
- /images/HistoriqueClair.svg - Mode clair
- /images/New.svg - Nouveau chat (sombre)
- /images/NewClair.svg - Nouveau chat (clair)

**Logos (tous nécessaires) :**
- /images/LogoSombre.png - Logo sidebar fermée sombre
- /images/LogoClair.png - Logo sidebar fermée claire
- /images/LogoSombreTexte.png - Logo page connexion
- /images/LogoSombreTexteClairCote.png - Logo sidebar étendue sombre
- /images/LogoSombreTexteClaire2.png - Logo sidebar étendue claire
- /images/LogoClairTexteSombreCôté.png - Variante logo

---

## 8. ⚙️ SYSTÈME DE PERSONNALISATION

### Interface de personnalisation

const CustomizationForm = {
  backgroundColor: theme.backgrounds.tertiary + '30',
  borderRadius: 12,
  padding: 16,
}

const CustomTextArea = {
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: isAtLimit ? '#ef4444' + '70' : theme.borders.primary,
  borderRadius: 12,
  padding: 16,
  color: theme.text.primary,
  minHeight: 100,
  textAlignVertical: 'top',
}

const WordCounter = {
  fontSize: 12,
  color: wordCount > MAX_WORDS ? '#ef4444' : theme.text.secondary,
  textAlign: 'right',
}

### Données de personnalisation utilisateur

Structure des données :
const customizationData = {
  professionalContext: '', // 150 mots max
  companyPresentation: '', // 150 mots max  
  useCases: '',           // 150 mots max
  objectives: '',         // 150 mots max
}

---

## 9. 🎨 EFFETS VISUELS SPÉCIAUX

### Drop shadows et effets

// Boutons avec effet hover
const ButtonShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.7,
  shadowRadius: 0,
  elevation: 2,
}

const ButtonShadowHover = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 13,
  elevation: 8,
}

### Animation StarBorder

Effet de bordure animée sur les boutons principaux avec :
- Couleurs : cyan, violet
- Vitesse : 6s
- Rotation continue avec gradient

---

## 10. 📊 DONNÉES FONCTIONNELLES

### Système d'abonnement (3 plans)

const SUBSCRIPTION_PLANS = {
  ESSENTIEL: {
    price: '14,99€',
    color: '#3b82f6', // Bleu
  },
  PERFORMANCE: {
    price: '29,99€', 
    color: '#8b5cf6', // Violet (populaire)
  },
  PROFESSIONNEL: {
    price: '49,99€',
    color: '#10b981', // Vert
  }
}

---

## 🎯 POINTS TECHNIQUES IMPORTANTS

1. **Responsive Design** : L'interface s'adapte automatiquement mobile/desktop
2. **Thèmes** : Basculement complet sombre/clair avec persistence
3. **Animations** : Transitions fluides (300ms) pour tous les changements d'état
4. **Accessibility** : Support des labels, touch targets de 44px minimum
5. **Performance** : Mémorisation des composants, éviter les re-rendus inutiles
6. **Gestion d'état** : Context pour thème, authentication, abonnement
7. **Navigation** : Stack navigator avec gestion des modalités et sidebar

### Dimensions et mesures clés

- **Border radius accentué** : 24px pour les bulles utilisateur, 16px pour les containers
- **Hauteur minimale des boutons** : 38px (32px sur mobile)
- **Zone de touch minimum** : 44px x 44px
- **Espacement standard** : 16px entre les éléments
- **Padding des messages** : 10-20px vertical, 16-20px horizontal
- **Taille des icônes** : 20px (16px sur mobile)

### Structure des couleurs CSS originales

Variables CSS racine du projet original :

:root {
  --color-bg-primary: 26 28 26; (sombre) / 255 255 255; (clair)
  --color-bg-secondary: 34 36 34; (sombre) / 247 242 242; (clair)
  --color-bg-tertiary: 42 44 42; (sombre) / 243 244 246; (clair)
  --color-text-primary: 255 255 255; (sombre) / 17 24 39; (clair)
  --color-text-secondary: 209 213 219; (sombre) / 55 65 81; (clair)
  --color-border: 31 33 31; (sombre) / 229 231 235; (clair)
}

### Classes utilitaires importantes

.bg-theme-primary : background-color: rgb(var(--color-bg-primary))
.bg-theme-secondary : background-color: rgb(var(--color-bg-secondary))
.bg-theme-tertiary : background-color: rgb(var(--color-bg-tertiary))
.text-theme-primary : color: rgb(var(--color-text-primary))
.text-theme-secondary : color: rgb(var(--color-text-secondary))
.border-theme : border-color: rgb(var(--color-border))

### Chat input spécifiques

Mode sombre : background-color: #303030
Mode clair : background-color: #FFFFFF avec bordure rgba(34, 37, 34, 0.2)

Bulles utilisateur :
Mode sombre : background-color: #303030
Mode clair : background-color: #5A5A5A (gris sobre)

Bouton d'envoi :
Mode sombre : background-color: white avec icône noire (filter: brightness(0))
Mode clair : background-color: #222422 avec icône blanche (filter: brightness(1))

Cette documentation complète permettra de reproduire fidèlement l'interface I-Activ en React Native avec tous les détails visuels, couleurs, dimensions et comportements exacts selon le code source analysé. 