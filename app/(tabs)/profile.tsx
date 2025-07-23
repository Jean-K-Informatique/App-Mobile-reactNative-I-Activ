import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { Camera, CreditCard as Edit, Mail, Phone } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [phone, setPhone] = useState('+33 6 12 34 56 78');

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    setIsEditing(false);
    // Ici vous pourriez sauvegarder les données
    console.log('Profil sauvegardé');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mon Profil</Text>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <View style={styles.cameraButton}>
              <Camera size={16} color="#FFFFFF" />
            </View>
          </View>
          
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userStatus}>En ligne</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Edit size={20} color="#6B7280" />
            </View>
            <Input
              label="Nom complet"
              value={name}
              onChangeText={setName}
              editable={isEditing}
              containerStyle={styles.inputContainer}
            />
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Mail size={20} color="#6B7280" />
            </View>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              keyboardType="email-address"
              containerStyle={styles.inputContainer}
            />
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Phone size={20} color="#6B7280" />
            </View>
            <Input
              label="Téléphone"
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
              containerStyle={styles.inputContainer}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <Button
                title="Sauvegarder"
                onPress={handleSave}
                variant="primary"
              />
              <Button
                title="Annuler"
                onPress={() => setIsEditing(false)}
                variant="outline"
                style={styles.cancelButton}
              />
            </>
          ) : (
            <Button
              title="Modifier le profil"
              onPress={handleEdit}
              variant="primary"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '600',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 16,
    color: '#10B981',
  },
  formSection: {
    marginBottom: 30,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  fieldIcon: {
    marginTop: 32,
    marginRight: 12,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  buttonContainer: {
    gap: 12,
  },
  cancelButton: {
    marginTop: 0,
  },
});