#!/bin/bash

# 🚀 Script de Build Android Simplifié
# Usage: ./build-android.sh [votre_mot_de_passe]

echo "🔧 Build Android - APP I-Activ"
echo "================================"

# Vérifier si le mot de passe est fourni
if [ -z "$1" ]; then
    echo "❌ Erreur: Mot de passe requis"
    echo "Usage: ./build-android.sh VOTRE_MOT_DE_PASSE"
    exit 1
fi

PASSWORD="$1"

echo "📱 Configuration temporaire du keystore..."

# Backup du fichier original
cp android/gradle.properties android/gradle.properties.backup

# Remplacer les placeholders temporairement
sed -i '' "s/VOTRE_MOT_DE_PASSE_ICI/$PASSWORD/g" android/gradle.properties

echo "🏗️  Lancement du build..."

# Aller dans le dossier android
cd android

# Nettoyer d'abord pour éviter les conflits
echo "🧹 Nettoyage du cache..."
./gradlew clean --no-daemon

# Lancer le build AAB avec options de compatibilité
echo "🚀 Build en cours..."
if ./gradlew bundleRelease -x lintVitalRelease --no-daemon --stacktrace; then
    echo "✅ Build réussi !"
    echo ""
    echo "📦 Fichiers générés :"
    echo "   AAB: $(pwd)/app/build/outputs/bundle/release/app-release.aab"
    echo "   APK: $(pwd)/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "🎯 Prêt pour Google Play Store !"
else
    echo "❌ Erreur lors du build"
fi

# Revenir au dossier parent
cd ..

echo "🔒 Restauration des placeholders..."

# Restaurer le fichier original
mv android/gradle.properties.backup android/gradle.properties

echo "✅ Terminé ! Fichiers sécurisés."
