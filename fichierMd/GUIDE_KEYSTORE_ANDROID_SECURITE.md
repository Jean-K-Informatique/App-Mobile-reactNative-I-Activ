# 🔐 Guide de Sécurité - Keystore Android

## ⚠️ ATTENTION CRITIQUE

La keystore Android est **aussi sensible que vos certificats Apple** !
**Sans elle, vous ne pourrez JAMAIS mettre à jour votre app sur Google Play Store.**

---

## 📁 Fichiers à Sauvegarder

### **1. Fichier Keystore :**
- **Nom :** `app-i-activ-release.keystore`
- **Localisation :** Racine du projet (à côté des dossiers `android/`, `app/`, etc.)
- **Taille :** Quelques KB

### **2. Informations de Connexion :**
- **Alias :** `app-i-activ-key`
- **Mot de passe keystore :** `[VOTRE_MOT_DE_PASSE]`
- **Mot de passe clé :** `[MÊME_MOT_DE_PASSE]`

---

## 🚨 Règles de Sécurité

### ✅ À FAIRE :
- ✅ Sauvegarder la keystore dans un **coffre-fort numérique** (1Password, Bitwarden, etc.)
- ✅ Stocker sur **plusieurs supports** (cloud sécurisé + disque externe)
- ✅ Noter les mots de passe dans un **gestionnaire de mots de passe**
- ✅ Tester régulièrement que vous avez accès aux fichiers

### ❌ À NE JAMAIS FAIRE :
- ❌ **JAMAIS** pusher la keystore sur GitHub/GitLab
- ❌ **JAMAIS** partager les mots de passe en clair
- ❌ **JAMAIS** stocker uniquement en local (risque de perte)
- ❌ **JAMAIS** renommer ou modifier le fichier keystore

---

## 🔄 Procédure : Nouveau Poste de Travail

### **Quand vous clonez le projet depuis GitHub :**

#### **1. Cloner le Projet :**
```bash
git clone [URL_VOTRE_REPO]
cd [NOM_PROJET]
npm install
```

#### **2. Récupérer la Keystore :**
- **Télécharger** `app-i-activ-release.keystore` depuis votre coffre-fort
- **Placer le fichier** à la racine du projet (même niveau que `package.json`)

#### **3. Configurer les Mots de Passe :**
- **Ouvrir** `android/gradle.properties`
- **Remplacer** `VOTRE_MOT_DE_PASSE_ICI` par votre vrai mot de passe
- **Ligne 66-67 :** 
  ```properties
  MYAPP_UPLOAD_STORE_PASSWORD=VotreMotDePasseRéel
  MYAPP_UPLOAD_KEY_PASSWORD=VotreMotDePasseRéel
  ```

#### **4. Vérifier la Configuration :**
```bash
# Test que la keystore est reconnue
cd android
./gradlew assembleRelease
```

#### **5. IMPORTANT - Ne Pas Commiter :**
- **Vérifier** que le fichier `.keystore` n'apparaît pas dans `git status`
- **Ne jamais** faire `git add *.keystore`
- **Toujours** garder les mots de passe en local uniquement

---

## 🆘 En Cas de Problème

### **Keystore Perdue :**
- **Impossible** de mettre à jour l'app existante
- **Obligation** de créer une nouvelle app avec un nouveau package name
- **Perte** de tous les utilisateurs et reviews

### **Mot de Passe Oublié :**
- **Même conséquence** que keystore perdue
- **Aucun moyen** de récupérer le mot de passe
- **Recréation obligatoire** de tout

### **Keystore Compromise :**
- **Révoquer immédiatement** sur Google Play Console
- **Créer une nouvelle** keystore
- **Nouvelle version** avec nouveau certificat

---

## 📝 Checklist de Sécurité

**Avant chaque publication :**

- [ ] Keystore sauvegardée dans 2+ endroits
- [ ] Mots de passe stockés en sécurité
- [ ] Fichier `.keystore` dans `.gitignore`
- [ ] Mots de passe pas en clair sur GitHub
- [ ] Accès testé depuis un autre poste

**Après changement de poste :**

- [ ] Keystore récupérée et placée
- [ ] Mots de passe configurés localement
- [ ] Build de test réussi
- [ ] Git status propre (pas de keystore)

---

## 🔗 Ressources

- **Google Play Console :** [console.play.google.com](https://console.play.google.com)
- **Documentation Expo :** [docs.expo.dev](https://docs.expo.dev)
- **Build EAS :** [expo.dev/accounts/jeank-i-activ/projects/bolt-expo-nativewind](https://expo.dev/accounts/jeank-i-activ/projects/bolt-expo-nativewind)

---

## 📞 Contact Développeur

**En cas de problème critique :**
- Vérifier d'abord ce guide
- Tester sur un build de développement avant production
- Sauvegarder AVANT toute manipulation

**Rappel :** La keystore est votre **identité numérique** sur Google Play Store.
**Traitez-la comme vos clés de maison !** 🏠🔐
