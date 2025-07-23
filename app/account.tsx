import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ArrowLeft, User, Mail, Phone, CreditCard as Edit3, Check, X } from 'lucide-react-native';
import { router } from 'expo-router';

export default function AccountScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [phone, setPhone] = useState('+33 6 12 34 56 78');

  const handleSave = () => {
    setIsEditing(false);
    // Ici vous pourriez sauvegarder les données
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Restaurer les valeurs originales si nécessaire
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Compte</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <X size={24} color="#FFFFFF" />
          ) : (
            <Edit3 size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <User size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userStatus}>En ligne</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <User size={20} color="#A0A0A0" />
              <Text style={styles.fieldLabel}>Nom complet</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Votre nom"
                placeholderTextColor="#666666"
              />
            ) : (
              <Text style={styles.fieldValue}>{name}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Mail size={20} color="#A0A0A0" />
              <Text style={styles.fieldLabel}>Email</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Votre email"
                placeholderTextColor="#666666"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.fieldValue}>{email}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Phone size={20} color="#A0A0A0" />
              <Text style={styles.fieldLabel}>Téléphone</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Votre téléphone"
                placeholderTextColor="#666666"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{phone}</Text>
            )}
          </View>
        </View>

        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A5568',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 16,
    color: '#00D4AA',
  },
  formSection: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#A0A0A0',
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 18,
    color: '#FFFFFF',
    paddingLeft: 28,
  },
  input: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 28,
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    color: '#A0A0A0',
    fontSize: 16,
  },
});