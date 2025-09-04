# 🔧 Guide de résolution du problème Google OAuth

## 🚨 Problème identifié :
L'erreur "invalid_request" vient du fait que vous utilisez le même Client ID pour toutes les plateformes, mais Google OAuth 2.0 exige des Client IDs séparés.

## ✅ Solution : Créer des Client IDs séparés

### Étape 1 : Google Cloud Console
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet Firebase (`ia-ctive-projet-1`)
3. APIs & Services > Credentials

### Étape 2 : Créer 3 Client IDs OAuth

#### Client ID Web (pour développement Expo)
1. Create Credentials > OAuth 2.0 Client ID
2. Application type : **Web application**
3. Name : `APP I-Activ Web`
4. Authorized JavaScript origins : `https://auth.expo.io`
5. Authorized redirect URIs : `https://auth.expo.io/@VOTRE_USERNAME_EXPO/app-i-activ`

#### Client ID Android
1. Create Credentials > OAuth 2.0 Client ID  
2. Application type : **Android**
3. Name : `APP I-Activ Android`
4. Package name : `com.jeankiactiv.boltexponativewind` (depuis votre app.json)
5. SHA-1 : Obtenez avec `eas credentials` ou `expo credentials:manager`

#### Client ID iOS
1. Create Credentials > OAuth 2.0 Client ID
2. Application type : **iOS**
3. Name : `APP I-Activ iOS`
4. Bundle ID : `com.jeankiactiv.boltexponativewind` (depuis votre app.json)

### Étape 3 : Mettre à jour Firebase Auth
1. Firebase Console > Authentication > Sign-in method
2. Google > Modifier
3. Ajoutez **auth.expo.io** dans les domaines autorisés

### Étape 4 : Mettre à jour le code
Remplacez dans `contexts/AuthContext.tsx` :

```javascript
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: 'VOTRE_WEB_CLIENT_ID.googleusercontent.com',
  iosClientId: 'VOTRE_IOS_CLIENT_ID.googleusercontent.com',
  androidClientId: 'VOTRE_ANDROID_CLIENT_ID.googleusercontent.com',
});
```

### Étape 5 : Test
1. `npm run dev`
2. Testez la connexion Google
3. Vérifiez que l'erreur "invalid_request" a disparu

## 🔍 Vérifications
- [ ] 3 Client IDs créés dans Google Cloud Console
- [ ] auth.expo.io ajouté aux domaines autorisés Firebase
- [ ] Code mis à jour avec les nouveaux Client IDs
- [ ] Test de connexion Google réussi

## 📱 URL de redirection pour votre cas :
`https://auth.expo.io/@VOTRE_USERNAME_EXPO/app-i-activ`

Remplacez `VOTRE_USERNAME_EXPO` par votre nom d'utilisateur Expo. 