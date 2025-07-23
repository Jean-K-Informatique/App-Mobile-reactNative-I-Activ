# 📱 APP-i-activ Mobile

Application mobile React Native/Expo pour interagir avec des assistants IA personnalisés, connectée à Firebase et OpenAI.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-74aa9c?style=for-the-badge&logo=openai&logoColor=white)

## ✨ Fonctionnalités

### 🔐 Authentification
- **Google OAuth** : Connexion rapide avec compte Google
- **Email/Password** : Connexion avec identifiants personnalisés
- **Persistance de session** : Reconnexion automatique
- **Protection Firebase** : Règles de sécurité Firestore

### 🤖 Assistants IA
- **Assistants personnalisés** : Récupération depuis Firestore
- **Instructions spécifiques** : System prompts personnalisés
- **Modèles variés** : Support de tous les modèles OpenAI
- **Messages de bienvenue** : Personnalisables par assistant

### 💬 Chat en temps réel
- **Conversations fluides** : Interface de chat intuitive
- **Historique maintenu** : Durant la session
- **Indicateurs de statut** : Chargement, erreurs, typing
- **Gestion d'erreurs** : Messages utilisateur-friendly

## 🚀 Installation

### Prérequis
- Node.js 18+
- Expo CLI
- Compte Firebase
- Clé API OpenAI

### Configuration

1. **Clonez le repository**
   ```bash
   git clone https://github.com/Jean-K-Informatique/App-Mobile-reactNative-I-Activ.git
   cd App-Mobile-reactNative-I-Activ
   ```

2. **Installez les dépendances**
   ```bash
   npm install
   ```

3. **Configuration Firebase**
   - Copiez vos clés Firebase dans `services/firebaseConfig.js`
   - Activez Authentication (Google + Email/Password)
   - Configurez Firestore avec les règles appropriées

4. **Configuration OpenAI**
   ```bash
   cp .env.example .env
   # Éditez .env et ajoutez votre clé OpenAI
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-votre-clé-ici
   ```

5. **Lancez l'application**
   ```bash
   npm run dev
   ```

## 📁 Structure du projet

```
├── app/                    # Pages et navigation (Expo Router)
│   ├── (tabs)/            # Navigation par onglets
│   ├── chat/[id].tsx      # Interface de chat
│   ├── login.tsx          # Écran de connexion
│   └── index.tsx          # Page d'accueil
├── components/            # Composants réutilisables
│   └── ui/               # Composants UI de base
├── contexts/             # Contextes React (Auth, etc.)
├── services/             # Services (Firebase, OpenAI)
│   ├── firebaseConfig.js # Configuration Firebase
│   ├── chatService.ts    # Gestion des chats
│   └── openaiService.ts  # Intégration OpenAI
├── hooks/               # Hooks personnalisés
└── types/              # Types TypeScript
```

## 🔧 Configuration Firebase

### Structure Firestore

```javascript
// Collection: chats
{
  id: "chat_123",
  name: "Assistant GPT-4",
  description: "Assistant IA généraliste",
  content: "Instructions complètes pour l'assistant...",
  model: "gpt-4-turbo",
  provider: "openai",
  allowedUsers: ["uid_user_1", "uid_user_2"],
  welcomeMessage: "Bonjour ! Comment puis-je vous aider ?",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Règles de sécurité

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chats/{chatId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.allowedUsers;
    }
  }
}
```

## 🔑 Variables d'environnement

Créez un fichier `.env` basé sur `.env.example` :

```bash
# Clé OpenAI (obligatoire)
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-votre-clé-openai

# Configuration Firebase (optionnel si hardcodée)
VITE_FIREBASE_API_KEY=votre-clé-firebase
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet-id
```

## 🧪 Tests et débogage

### Logs de développement

L'application affiche des logs détaillés pour le débogage :

```bash
# Connexion
✅ [AuthContext] Auth state changed: user_uid_123
✅ Connexion réussie avec: user@example.com

# Récupération des chats
✅ Récupération des chats pour l'utilisateur: user_uid_123
📋 Chat 1 - Données complètes: { name: "Assistant", model: "gpt-4" }

# Conversations OpenAI
🤖 Envoi à OpenAI avec modèle: gpt-4-turbo
✅ Réponse OpenAI reçue: Bonjour ! Je suis votre assistant...
```

### Compte de test

Pour tester rapidement, utilisez le bouton "🧪 Test (compte démo)" qui crée automatiquement un compte `test@example.com`.

## 📱 Utilisation

1. **Connexion** : Utilisez Google OAuth ou email/password
2. **Sélection** : Choisissez un assistant dans la liste
3. **Conversation** : Chattez en temps réel avec l'IA
4. **Navigation** : Revenez à la liste ou déconnectez-vous

## 🔐 Sécurité

- ✅ **Clés API externalisées** : Pas de secrets dans le code
- ✅ **Règles Firestore** : Accès contrôlé aux données
- ✅ **Variables d'environnement** : Configuration sécurisée
- ✅ **Authentification Firebase** : Utilisateurs vérifiés

## 🛠️ Technologies utilisées

- **React Native** + **Expo** : Framework mobile
- **TypeScript** : Typage statique
- **Firebase Auth** : Authentification
- **Firestore** : Base de données NoSQL
- **OpenAI API** : Intelligence artificielle
- **Expo Router** : Navigation
- **Context API** : Gestion d'état global

## 📄 Documentation

- [CONFIGURATION_FIREBASE.md](./CONFIGURATION_FIREBASE.md) - Guide de configuration Firebase
- [GUIDE_CONNEXION_REELLE.md](./GUIDE_CONNEXION_REELLE.md) - Test avec vrais identifiants
- [GUIDE_INTEGRATION_OPENAI.md](./GUIDE_INTEGRATION_OPENAI.md) - Intégration OpenAI
- [DIAGNOSTIC_FINAL.md](./DIAGNOSTIC_FINAL.md) - Résolution des problèmes

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Add amazing feature'`)
4. Push sur la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Jean-K-Informatique**
- GitHub: [@Jean-K-Informatique](https://github.com/Jean-K-Informatique)
- Repository: [App-Mobile-reactNative-I-Activ](https://github.com/Jean-K-Informatique/App-Mobile-reactNative-I-Activ)