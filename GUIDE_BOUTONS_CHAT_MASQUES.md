# Boutons de chat masqués (documents, privé, raisonnement)

Ce guide décrit les boutons actuellement masqués dans l’interface de chat, leur emplacement dans le code, et la manière de les réactiver.

## Emplacement
- Fichier: `components/ChatInterface.tsx`
- Zone: feuille d’outils (sheet) ouverte via le bouton “+” au-dessus du champ de saisie.

## Boutons masqués

1) Ajouter document (icône 📄)
- Bouton masqué via un guard JSX.
```tsx
{false && (
  <TouchableOpacity /* ... */>
    <Text style={styles.sheetIcon}>📄</Text>
    <Text style={[styles.sheetLabel, { color: theme.text.primary }]}>Ajouter document</Text>
  </TouchableOpacity>
)}
```
- Réactiver: remplacer `false && (` par une condition active (ex: `true && (`) ou supprimer le guard.

2) Conversation privée (toggle)
- Bouton masqué via un guard JSX.
```tsx
{false && (
  <TouchableOpacity /* ... */>
    <Text style={[styles.sheetLabel, { color: theme.text.primary }]}>Conversation privée</Text>
    <View style={styles.switchBase}>
      <View style={styles.switchKnob} />
    </View>
  </TouchableOpacity>
)}
```
- Réactiver: remplacer `false && (` par une condition active ou supprimer le guard.

3) Raisonnement (mode “élevé”)
- UI: bouton masqué via un guard JSX similaire.
- Logique: variable `reasoningDisabled = true` qui neutralise le raisonnement même si “high” était sélectionné.
```tsx
const reasoningDisabled = true;
// ...
if (reasoningEffort === 'high' && !reasoningDisabled) {
  // affichage/animation raisonnement
}
```
- Réactiver: passer `reasoningDisabled` à `false` et rétablir le bloc JSX.

## Notes
- Aucun changement Firestore.
- Masquages côté client, réversibles rapidement.

## Fichiers impactés
- `components/ChatInterface.tsx` (feuille d’outils + logique de raisonnement).



