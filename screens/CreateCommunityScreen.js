import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { supabase } from '../supabase';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function CreateCommunityScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCoverImage(result.assets[0]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Community name is required');
      return;
    }
    setLoading(true);
    try {
      let coverImageUrl = null;
      if (coverImage) {
        // Upload image to Supabase Storage (optional, requires storage bucket setup)
        const fileExt = coverImage.uri.split('.').pop();
        const fileName = `community-covers/${Date.now()}.${fileExt}`;
        const response = await fetch(coverImage.uri);
        const blob = await response.blob();
        const { data, error } = await supabase.storage.from('community-covers').upload(fileName, blob, { upsert: true });
        if (error) throw error;
        const { data: publicUrl } = supabase.storage.from('community-covers').getPublicUrl(fileName);
        coverImageUrl = publicUrl.publicUrl;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('communities').insert({
        name,
        description,
        creator_id: user.id,
        cover_image_url: coverImageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      Alert.alert('Success', 'Community created!');
      // Navigate back and refresh the communities list
      navigation.navigate('Communities', { refresh: true });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
      </TouchableOpacity>
      <Text style={styles.title}>Create Community</Text>
      <Text style={styles.subtitle}>Add a cover image to make your community stand out</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {coverImage ? (
          <Image source={{ uri: coverImage.uri }} style={styles.coverImage} />
        ) : (
          <Ionicons name="image-outline" size={48} color="#a78bfa" />
        )}
        <Text style={styles.imagePickerText}>{coverImage ? 'Change Cover Image' : 'Add Cover Image (Optional)'}</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Community Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { height: 90 }]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Create</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 24, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 10, backgroundColor: '#ede9fe', borderRadius: 16, padding: 6 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#7c3aed', marginBottom: 8, alignSelf: 'flex-start' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 18, alignSelf: 'flex-start' },
  imagePicker: { 
    alignItems: 'center', 
    marginBottom: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  coverImage: { width: 120, height: 90, borderRadius: 12, marginBottom: 6, resizeMode: 'cover' },
  imagePickerText: { color: '#8b5cf6', fontWeight: '600', fontSize: 15 },
  input: { width: '100%', borderWidth: 1, borderColor: '#a78bfa', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 14, backgroundColor: '#f5f3ff' },
  createButton: { backgroundColor: '#8b5cf6', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', marginTop: 10, width: '100%' },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
}); 