import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [artistType, setArtistType] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not signed in');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      Alert.alert('Error', 'Could not fetch profile');
      setLoading(false);
      return;
    }
    setProfile(data);
    setDisplayName(data.display_name || '');
    setBio(data.bio || '');
    setArtistType(data.artist_type || '');
    setLoading(false);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validation', 'Display name is required');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const updates = {
      display_name: displayName,
      bio: bio,
      artist_type: artistType,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    setLoading(false);
    if (error) {
      Alert.alert('Error', 'Failed to update profile');
      return;
    }
    Alert.alert('Success', 'Profile updated!');
    navigation.goBack();
  };

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
      />
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell us about yourself"
        multiline
      />
      <Text style={styles.label}>Artist Type</Text>
      <TextInput
        style={styles.input}
        value={artistType}
        onChangeText={setArtistType}
        placeholder="e.g. singer, painter, dancer"
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
}); 