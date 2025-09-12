#!/bin/bash

# 🌐 Build EAS Android - Téléchargement via navigateur
# Usage: ./build-eas-android.sh

echo "🚀 Build EAS Android - APP I-Activ"
echo "=================================="
echo ""
echo "📱 Build en cours dans le cloud Expo..."
echo "⏱️  Temps estimé : 10-30 minutes (selon la queue)"
echo ""

# Lancer le build EAS
npx eas-cli build --platform android --profile production --non-interactive

echo ""
echo "✅ Build terminé !"
echo ""
echo "🔗 Pour télécharger votre AAB :"
echo "   1. Allez sur https://expo.dev/accounts/jeank-i-activ/projects/bolt-expo-nativewind/builds"
echo "   2. Cliquez sur le dernier build"
echo "   3. Téléchargez directement depuis votre navigateur !"
echo ""
echo "📱 Ou utilisez la commande :"
echo "   npx eas-cli build:list --platform android --limit 1"
