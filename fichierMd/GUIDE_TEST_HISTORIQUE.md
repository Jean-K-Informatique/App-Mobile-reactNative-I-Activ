# 🧪 Guide de Test - Système d'Historique des Conversations

## ✅ **Logs maintenant simplifiés !**

Les logs sont maintenant beaucoup plus lisibles. Vous devriez voir :
```bash
🔍 Récupération des chats pour l'utilisateur: votre_uid
✅ 4 chats trouvés
📋 Chat 1: "Assistant I-Activ Professionnel" (gpt-4.1-mini-2025-04-14)
📋 Chat 2: "Assistant I-Activ Essentiel" (gpt-4.1-nano-2025-04-14)
📋 Chat 3: "Assistant I-Activ Performance" (gpt-4.1-mini-2025-04-14)
📋 Chat 4: "I-Activ New Version BETA" (gpt-4.1-mini-2025-04-14)
```

---

## 🎯 **Plan de test progressif**

### **ÉTAPE 1 : Ajouter les règles Firestore (OBLIGATOIRE)**

Avant de tester, vous DEVEZ ajouter ces règles dans Firebase Console :

1. **Firebase Console** → **Firestore Database** → **Règles**
2. **Ajoutez** ces règles à vos règles existantes :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ✅ RÈGLES EXISTANTES (à conserver)
    match /chats/{chatId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.allowedUsers;
    }
    
    // 🆕 NOUVELLES RÈGLES à ajouter
    match /conversations/{conversationId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    match /conversations/{conversationId}/messages/{messageId} {
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == get(/databases/$(database)/documents/conversations/$(conversationId)).data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == get(/databases/$(database)/documents/conversations/$(conversationId)).data.userId;
    }
  }
}
```

3. **Publier** les règles

---

### **ÉTAPE 2 : Test du mode normal (sauvegarde)**

#### **Test 2.1 : Première conversation**
```bash
1. Lancez l'app : npm run dev
2. Connectez-vous avec vos identifiants
3. Choisissez un assistant (ex: "I-Activ New Version BETA")
4. Envoyez un message : "Bonjour, peux-tu te présenter ?"
5. Attendez la réponse de l'IA
```

**Logs attendus :**
```bash
🔍 Récupération des chats pour l'utilisateur: votre_uid
✅ 4 chats trouvés
🚀 Démarrage streaming avec modèle: gpt-4.1-mini-2025-04-14
🕵️ Mode privé actif: false
✅ Streaming terminé: xxx caractères
🆕 Création nouvelle conversation: { assistantName: "I-Activ New Version BETA", isPrivate: false }
✅ Conversation créée: conv_abc123
💾 Message sauvegardé: { conversationId: "conv_abc123", isUser: true, messageIndex: 0 }
💾 Message sauvegardé: { conversationId: "conv_abc123", isUser: false, messageIndex: 1 }
```

#### **Test 2.2 : Vérifier la sauvegarde**
```bash
1. Ouvrez la sidebar (bouton ☰)
2. Cliquez sur "Historique"
3. Vous devriez voir votre conversation récente
```

**Résultat attendu :**
- ✅ Section "Conversations récentes" s'ouvre
- ✅ Une conversation apparaît avec le titre généré
- ✅ Assistant affiché : "I-Activ New Version BETA"
- ✅ Date/heure récente
- ✅ Prévisualisation du message

---

### **ÉTAPE 3 : Test du chargement de conversation**

#### **Test 3.1 : Reprendre une conversation**
```bash
1. Dans l'historique, cliquez sur votre conversation
2. La conversation devrait se charger
3. Envoyez un nouveau message : "Peux-tu me rappeler ce dont nous parlions ?"
```

**Logs attendus :**
```bash
📝 Sélection conversation: Bonjour, peux-tu te présenter ?
📖 Chargement conversation depuis Firestore: conv_abc123
✅ 2 messages chargés depuis Firestore
💾 Message sauvegardé: { conversationId: "conv_abc123", isUser: true, messageIndex: 2 }
```

**Résultat attendu :**
- ✅ Les anciens messages réapparaissent
- ✅ L'assistant se souvient du contexte
- ✅ Le nouveau message est ajouté à la conversation existante

---

### **ÉTAPE 4 : Test du mode navigation privée**

#### **Test 4.1 : Activer le mode privé**
```bash
1. Démarrez une nouvelle conversation
2. Cliquez sur l'icône 🕵️ (à côté du bouton d'envoi)
3. Lisez l'alerte et cliquez "Activer le Mode Privé"
4. Vérifiez l'indicateur "Mode navigation privée actif"
5. Envoyez un message : "Ceci est une conversation privée"
```

**Logs attendus :**
```bash
🕵️ Mode navigation privée activé
🚀 Démarrage streaming avec modèle: gpt-4.1-mini-2025-04-14
🕵️ Mode privé actif: true
```

**Résultat attendu :**
- ✅ Bandeau "Mode navigation privée actif" visible
- ✅ Icône 🕵️ activée (arrière-plan coloré)
- ✅ Conversation fonctionne normalement
- ✅ AUCUNE sauvegarde dans les logs

#### **Test 4.2 : Vérifier qu'il n'y a pas de sauvegarde**
```bash
1. Ouvrez l'historique dans la sidebar
2. La conversation privée NE DOIT PAS apparaître
```

#### **Test 4.3 : Désactiver le mode privé**
```bash
1. Cliquez à nouveau sur 🕵️
2. Choisissez "Sauvegarder et Quitter" dans l'alerte
3. Vérifiez que l'indicateur disparaît
```

**Résultat attendu :**
- ✅ La conversation privée est maintenant sauvegardée
- ✅ Elle apparaît dans l'historique

---

### **ÉTAPE 5 : Test de gestion des conversations**

#### **Test 5.1 : Suppression d'une conversation**
```bash
1. Dans l'historique, cliquez sur le bouton 🗑️ d'une conversation
2. Confirmez la suppression
3. La conversation disparaît de la liste
```

**Logs attendus :**
```bash
🗑️ Suppression conversation: conv_abc123
✅ Conversation supprimée: conv_abc123
```

#### **Test 5.2 : Test avec plusieurs assistants**
```bash
1. Changez d'assistant (ex: "Assistant I-Activ Essentiel")
2. Démarrez une nouvelle conversation
3. Vérifiez que l'historique classe bien par assistant
```

---

## 🔍 **Débogage des problèmes courants**

### **Problème : "Erreur récupération conversations"**
```bash
❌ Erreur récupération conversations: FirebaseError: 7 PERMISSION_DENIED
```
**Solution :** Vérifiez que vous avez bien ajouté les règles Firestore (Étape 1)

### **Problème : "Conversations ne se sauvegardent pas"**
**Vérifiez :**
- Mode privé désactivé (pas d'icône 🕵️ active)
- Logs `💾 Message sauvegardé` présents
- Règles Firestore correctes

### **Problème : "Impossible de charger une conversation"**
```bash
❌ Accès refusé à la conversation: conv_abc123
```
**Solution :** La conversation appartient probablement à un autre utilisateur

### **Problème : "Trop de logs encore"**
Si vous voyez encore trop de logs, dites-moi lesquels et je les simplifierai davantage.

---

## 📊 **Logs de réussite attendus**

Une session de test réussie devrait ressembler à ça :
```bash
🔍 Récupération des chats pour l'utilisateur: votre_uid
✅ 4 chats trouvés
📋 Chat 1: "Assistant I-Activ Professionnel" (gpt-4.1-mini-2025-04-14)
🚀 Démarrage streaming avec modèle: gpt-4.1-mini-2025-04-14
🆕 Création nouvelle conversation: { assistantName: "Assistant I-Activ Professionnel", isPrivate: false }
✅ Conversation créée: conv_123
💾 Message sauvegardé: { conversationId: "conv_123", isUser: true, messageIndex: 0 }
💾 Conversation sauvegardée: conv_123
📂 Récupération conversations pour: votre_uid
✅ 1 conversations trouvées
📝 Sélection conversation: Titre de ma conversation
📖 Chargement conversation depuis Firestore: conv_123
✅ 2 messages chargés depuis Firestore
```

---

## 🎯 **Commencez par le Test 1 !**

**Prêt à tester ?** Commencez par l'**Étape 1** (règles Firestore), puis l'**Étape 2** (première conversation).

**Dites-moi ce que vous observez** dans les logs et je vous aiderai à diagnostiquer tout problème ! 