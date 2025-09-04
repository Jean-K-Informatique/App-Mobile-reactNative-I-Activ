# 🧪 Guide de Test - APP-i-activ Mobile

## ✅ Configuration terminée !

Toutes vos clés Firebase ont été intégrées dans l'application. Vous pouvez maintenant tester !

## 🚀 Test immédiat avec compte démo

### 1. Créer un compte test dans Firebase Console

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet `ia-ctive-projet-1`
3. **Authentication** > **Users** > **Add user**
4. Créez un utilisateur avec :
   - **Email** : `test@example.com`
   - **Password** : `test123456`

### 2. Ajouter le compte test aux chats (si nécessaire)

1. **Firestore Database** > Collection `chats`
2. Sélectionnez un document de chat
3. Dans le champ `allowedUsers`, ajoutez l'UID du compte test que vous venez de créer

### 3. Lancer l'application

```bash
npm run dev
```

### 4. Tester la connexion

1. ✅ L'app s'ouvre sur l'écran de login
2. ✅ Cliquez sur "🧪 Test (compte démo)"
3. ✅ Vous devriez voir dans la console :
   ```
   Connexion avec compte test...
   Connexion test réussie ! UID: abc123...
   ```
4. ✅ Redirection automatique vers l'écran principal
5. ✅ Affichage de la liste des chats accessibles

### 5. Vérifier les logs

Dans la console Expo, vous devriez voir :

```bash
# Connexion réussie
Connexion test réussie ! UID: xyz123...
État auth changé: xyz123...

# Chargement des chats
Récupération des chats pour l'utilisateur: xyz123...
X chats trouvés pour l'utilisateur: [...]
Chat 1: { id: "chat123", name: "Assistant GPT-4", ... }
```

## 🔧 Configuration Google OAuth (optionnel pour plus tard)

Pour activer le bouton "Se connecter avec Google" :

### 1. Obtenir les Client IDs

1. [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez le projet lié à Firebase
3. **APIs & Services** > **Credentials**
4. **Create Credentials** > **OAuth 2.0 Client IDs**

Créez 3 identifiants :
- **Web application** → `clientId`
- **iOS** → `iosClientId` 
- **Android** → `androidClientId`

### 2. Mettre à jour hooks/useAuth.ts

```javascript
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: 'VOTRE_WEB_CLIENT_ID.googleusercontent.com',
  iosClientId: 'VOTRE_IOS_CLIENT_ID.googleusercontent.com', 
  androidClientId: 'VOTRE_ANDROID_CLIENT_ID.googleusercontent.com',
});
```

### 3. Configurer Firebase Auth

1. **Firebase Console** > **Authentication** > **Sign-in method**
2. Activez **Google** 
3. **Authorized domains** : Ajoutez `auth.expo.io`

## 🐛 Résolution de problèmes

### Erreur "User not found"
- Créez le compte test dans Firebase Console
- Vérifiez email/mot de passe exact

### Aucun chat affiché
- Vérifiez que l'UID est dans `allowedUsers` d'au moins un chat
- Consultez les règles Firestore

### Erreur de connexion Firebase
- Vérifiez que les clés Firebase sont correctes
- Vérifiez la connexion internet

## 🎯 Prochaines étapes

Une fois le test réussi :
1. ✅ Configuration Google OAuth (optionnel)
2. 🔄 Intégration conversations OpenAI
3. 🔄 Historique des messages
4. 🔄 Interface chat avancée

## 📱 Tester sur appareil

Pour tester sur votre téléphone :
1. Installez **Expo Go** 
2. Scannez le QR code affiché dans le terminal
3. L'app se lance directement sur votre appareil ! 