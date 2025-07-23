# Configuration Firebase - APP-i-activ Mobile

## Étape 1 : Configuration Firebase

### 1. Récupérer les clés Firebase

Rendez-vous dans votre console Firebase et récupérez les valeurs suivantes :

```javascript
// Dans services/firebaseConfig.js - REMPLACEZ les valeurs
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",                    // Récupérez depuis Firebase Console
  authDomain: "VOTRE_AUTH_DOMAIN",            // Ex: votre-projet.firebaseapp.com  
  projectId: "VOTRE_PROJECT_ID",              // ID de votre projet Firebase
  storageBucket: "VOTRE_STORAGE_BUCKET",      // Ex: votre-projet.appspot.com
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",  // ID numérique
  appId: "VOTRE_APP_ID"                       // ID de l'application
};
```

### 2. Configuration Google OAuth

Dans la console Google API (console.cloud.google.com), créez des Client ID OAuth pour :

```javascript
// Dans hooks/useAuth.ts - REMPLACEZ les valeurs
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: 'VOTRE_WEB_CLIENT_ID',        // Client ID Web de Google
  iosClientId: 'VOTRE_IOS_CLIENT_ID',     // Client ID iOS  
  androidClientId: 'VOTRE_ANDROID_CLIENT_ID', // Client ID Android
});
```

**Comment obtenir ces IDs :**

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet (le même que Firebase)
3. APIs & Services > Identifiants
4. Créer des identifiants > ID client OAuth 2.0
5. Créez :
   - **Application Web** : pour webClientId
   - **iOS** : pour iosClientId (bundle ID requis)
   - **Android** : pour androidClientId (SHA-1 requis)

### 3. Configuration Expo

Ajoutez le schéma de redirection dans `app.json` :

```json
{
  "expo": {
    "scheme": "myapp",
    // ... autres configurations
  }
}
```

### 4. Configuration Firebase Auth

Dans la console Firebase :

1. **Authentication > Sign-in method**
2. Activez **Google** comme fournisseur
3. **Domaines autorisés** : Ajoutez `auth.expo.io` 

## Étape 2 : Test de l'intégration

### Lancer l'application

```bash
npm run dev
```

### Vérifications dans la console

L'application affichera des logs pour :

1. **Connexion Google** :
   ```
   Démarrage connexion Google...
   Token Google reçu, connexion à Firebase...
   Connexion Firebase réussie ! UID: abc123...
   ```

2. **Récupération des chats** :
   ```
   Récupération des chats pour l'utilisateur: abc123...
   X chats trouvés pour l'utilisateur: [...]
   Chat 1: { id: "xyz", name: "Assistant GPT-4", ... }
   ```

### Résolution des problèmes

**Erreur d'authentification :**
- Vérifiez les Client IDs Google
- Vérifiez que le domaine auth.expo.io est autorisé dans Firebase
- Vérifiez le schéma de redirection

**Aucun chat trouvé :**
- Vérifiez que l'utilisateur connecté est dans le champ `allowedUsers` d'au moins un chat
- Vérifiez les règles Firestore
- Vérifiez les logs de la console

**Erreur Firestore :**
- Vérifiez les règles de sécurité Firestore
- Vérifiez que la collection `chats` existe
- Vérifiez la configuration du projet Firebase

## Étape 3 : Structure des données attendue

### Format des documents `chats` dans Firestore :

```javascript
{
  id: "chat_123",
  name: "Assistant GPT-4",
  description: "Assistant IA généraliste",
  welcomeMessage: "Bonjour ! Comment puis-je vous aider ?",
  model: "gpt-4-turbo",
  provider: "openai",
  allowedUsers: ["uid_utilisateur_1", "uid_utilisateur_2"],
  // ... autres champs
}
```

Le champ `allowedUsers` doit contenir l'UID Firebase Auth de l'utilisateur pour qu'il puisse accéder au chat.

## Prochaines étapes

Une fois la connexion et la récupération des chats fonctionnelles :

1. ✅ Authentification Firebase 
2. ✅ Récupération des chats
3. 🔄 Implémentation du chat (messages, OpenAI API)
4. 🔄 Gestion de l'historique des conversations
5. 🔄 Interface utilisateur avancée 