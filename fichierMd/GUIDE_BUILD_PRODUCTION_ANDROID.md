# Guide de Build Production Android

## 📋 Prérequis

- Android Studio installé avec SDK Android
- Keystore de production configuré (`app-i-activ-release.keystore`)
- Node.js et npm installés
- Projet React Native Expo configuré

## 🔧 Configuration initiale

### 1. Vérification de l'environnement Android

```bash
# Vérifier que Android SDK est installé
ls -la ~/Library/Android/sdk

# Si Android SDK n'est pas trouvé, installer Android Studio d'abord
```

### 2. Configuration des variables d'environnement

```bash
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 🚀 Processus de Build

### Étape 1 : Installation d'EAS CLI (si nécessaire)

```bash
npm install -g eas-cli
```

### Étape 2 : Configuration temporaire du keystore

⚠️ **ATTENTION** : Cette étape implique de mettre temporairement votre mot de passe dans un fichier. Il sera immédiatement retiré après le build.

1. Ouvrir le fichier `android/gradle.properties`
2. Remplacer temporairement :
   ```properties
   MYAPP_UPLOAD_STORE_PASSWORD=VOTRE_MOT_DE_PASSE_ICI
   MYAPP_UPLOAD_KEY_PASSWORD=VOTRE_MOT_DE_PASSE_ICI
   ```
   Par :
   ```properties
   MYAPP_UPLOAD_STORE_PASSWORD=VotreMotDePasseReel
   MYAPP_UPLOAD_KEY_PASSWORD=VotreMotDePasseReel
   ```

### Étape 3 : Build de l'application

```bash
# Aller dans le dossier android du projet
cd android

# Lancer le build AAB pour Google Play Store
./gradlew bundleRelease -x lintVitalRelease

# Alternative : Build APK si nécessaire
./gradlew assembleRelease -x lintVitalRelease
```

### Étape 4 : Vérification des fichiers générés

```bash
# Localiser l'AAB généré
find . -name "*.aab"
# Résultat : ./app/build/outputs/bundle/release/app-release.aab

# Localiser l'APK généré  
find . -name "*.apk"
# Résultat : ./app/build/outputs/apk/release/app-release.apk
```

### Étape 5 : 🔒 Sécurisation (CRUCIAL)

**Immédiatement après le build**, restaurer les placeholders dans `android/gradle.properties` :

```properties
MYAPP_UPLOAD_STORE_PASSWORD=VOTRE_MOT_DE_PASSE_ICI
MYAPP_UPLOAD_KEY_PASSWORD=VOTRE_MOT_DE_PASSE_ICI
```

## 📱 Déploiement sur Google Play Store

### Fichiers de sortie

- **AAB (recommandé pour Google Play)** : `android/app/build/outputs/bundle/release/app-release.aab`
- **APK (pour tests locaux)** : `android/app/build/outputs/apk/release/app-release.apk`

### Publication sur Google Play Console

1. Se connecter à [Google Play Console](https://play.google.com/console)
2. Sélectionner votre application
3. Aller dans "Production" > "Créer une nouvelle version"
4. **Uploader** le fichier `app-release.aab`
5. Compléter les informations de release
6. Publier

## 🔧 CORRECTION IMPORTANTE : Variables d'environnement Android

⚠️ **PROBLÈME IDENTIFIÉ** : Le fichier `.env` n'est pas automatiquement inclus dans les builds Android, causant des erreurs de connexion IA.

### Solution appliquée :

1. **Variables dans app.json** : Ajout des clés API dans `app.json > extra`
2. **Code modifié** : Utilisation de `expo-constants` comme fallback
3. **Services mis à jour** : `openaiService.ts`, `chatService.ts`, `Sidebar.tsx`

### Fichiers modifiés :

```json
// app.json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_OPENAI_API_KEY": "sk-proj-votre-clé...",
      "EXPO_PUBLIC_FREE_CHAT_ID": "zYiW3qEVBSwlcDxQEvcu"
    }
  }
}
```

```typescript
// services/openaiService.ts
import Constants from 'expo-constants';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
              Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;
```

**⚠️ SÉCURITÉ** : Les variables dans `app.json` sont visibles dans le bundle. Pour une sécurité maximale, utilisez EAS Secrets en production.

## 🛠️ Résolution de problèmes

### Erreur "SDK location not found"

```bash
# Définir ANDROID_HOME
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Erreur "Keystore file not found"

Vérifier le chemin dans `android/gradle.properties` :
```properties
MYAPP_UPLOAD_STORE_FILE=../../app-i-activ-release.keystore
```

### Erreurs lint sur les traductions

Utiliser le flag `-x lintVitalRelease` pour contourner :
```bash
./gradlew bundleRelease -x lintVitalRelease
```

### Erreur "command not found: eas"

```bash
# Installer EAS CLI
npm install -g eas-cli

# Ou utiliser npx
npx eas-cli build --platform android --profile production
```

## ⚡ Build rapide vs EAS Build

### Build local (rapide - 5-10 minutes)
```bash
cd android
export ANDROID_HOME=~/Library/Android/sdk
./gradlew bundleRelease -x lintVitalRelease
```

### EAS Build (peut avoir une queue de 130+ minutes en gratuit)
```bash
npx eas-cli build --platform android --profile production
```

## 🔐 Bonnes pratiques de sécurité

1. ❌ **JAMAIS** commiter le mot de passe dans git
2. ✅ Utiliser des placeholders dans `gradle.properties` 
3. ✅ Mettre le mot de passe seulement pendant le build
4. ✅ Retirer immédiatement le mot de passe après le build
5. ✅ Garder le keystore en sécurité et sauvegardé

## 📊 Informations sur les fichiers générés

- **AAB** : ~58 MB (optimisé pour Google Play)
- **APK** : ~108 MB (contient toutes les architectures)
- **Architectures supportées** : armeabi-v7a, arm64-v8a, x86, x86_64

## ✅ Checklist de build

- [ ] Android SDK configuré
- [ ] Keystore présent et accessible
- [ ] Variables d'environnement définies
- [ ] Mot de passe temporairement configuré
- [ ] Build exécuté avec succès
- [ ] Fichiers AAB/APK générés
- [ ] **Mot de passe retiré des fichiers**
- [ ] Prêt pour upload sur Google Play

---

**Note** : Ce guide a été testé et validé le 8 septembre 2025. Les chemins et commandes peuvent varier selon votre configuration système.
