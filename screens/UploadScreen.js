import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, Platform, Dimensions, KeyboardAvoidingView, SafeAreaView, PixelRatio } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../supabase';

const MAX_IMAGES = 4;
const CATEGORIES = [
  'Artwork',
  'Music',
  'Performance',
  'Photography',
  'Writing',
  'Other',
];

const scaleFont = (size) => Math.round(PixelRatio.getFontScale() * size);

export default function UploadScreen({ navigation }) {
  const [images, setImages] = useState([]);
  const [songFile, setSongFile] = useState(null);
  const [spotifyLink, setSpotifyLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [medium, setMedium] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);



  // Pick images (up to 4)
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
        quality: 0.8,
      });
      if (!result.canceled) {
        const newImages = result.assets || [result];
        setImages([...images, ...newImages.slice(0, MAX_IMAGES - images.length)]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  // Remove image
  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Pick song file
  const pickSong = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav', 'audio/mp3'],
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setSongFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick song file');
    }
  };

  // Upload images to Supabase Storage
  const uploadImages = async (userId) => {
    const uploadedUrls = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const ext = img.uri.split('.').pop();
      const fileName = `${userId}/paintings/${Date.now()}_${i}.${ext}`;
      const response = await fetch(img.uri);
      const blob = await response.blob();
      const { error } = await supabase.storage.from('paintings').upload(fileName, blob, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('paintings').getPublicUrl(fileName);
      uploadedUrls.push(data.publicUrl);
      setUploadProgress(Math.round(((i + 1) / images.length) * 100));
    }
    return uploadedUrls;
  };

  // Upload song to Supabase Storage
  const uploadSong = async (userId) => {
    if (!songFile) return '';
    const ext = songFile.name.split('.').pop();
    const fileName = `${userId}/songs/${Date.now()}.${ext}`;
    const response = await fetch(songFile.uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('paintings').upload(fileName, blob, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('paintings').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Handle upload
  const handleUpload = async () => {
    // Validate fields
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      // Get user ID (replace with your auth logic)
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
      if (!user) throw new Error('User not authenticated');
      // Upload images
      const imageUrls = await uploadImages(user.id);
      // Upload song
      const songUrl = await uploadSong(user.id);
      // Insert into paintings table (main record, only first image)
      const { data: painting, error: paintingError } = await supabase.from('paintings').insert({
        artist_id: user.id,
        title,
        description,
        medium,
        dimensions,
        image_url: imageUrls[0],
        is_for_sale: isForSale,
        price: null, // Add price if needed
        spotify_url: spotifyLink,
        youtube_url: youtubeLink,
        category,
      }).select().single();
      if (paintingError) throw paintingError;
      // Insert all images into painting_images
      for (let i = 0; i < imageUrls.length; i++) {
        const { error: imgError } = await supabase.from('painting_images').insert({
          painting_id: painting.id,
          image_url: imageUrls[i],
          image_order: i + 1,
        });
        if (imgError) throw imgError;
      }
      Alert.alert('Success', 'Content uploaded successfully!');
      // Reset form
      setImages([]);
      setSongFile(null);
      setSpotifyLink('');
      setYoutubeLink('');
      setTitle('');
      setCategory(CATEGORIES[0]);
      setDescription('');
      setMedium('');
      setDimensions('');
      setIsForSale(false);
      setUploadProgress(0);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to upload content');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.header}>⬆️ Upload Your Content</Text>
          <Text style={styles.subheader}>Share your artwork, performances, or creative content with the ArtConnect community (up to 4 images)</Text>
          <Text style={styles.label}>Content Images ({images.length}/{MAX_IMAGES})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imageBox}>
                <Image source={{ uri: img.uri }} style={styles.image} />
                <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(idx)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.addImageBox} onPress={pickImages} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                <Text style={styles.addImagePlus}>+</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <Text style={styles.imageHint}>The first image will be used as the main display image. You can upload up to 4 images total.</Text>
          <Text style={styles.label}>Upload Song (MP3, WAV, etc.)</Text>
          <TouchableOpacity style={styles.songButton} onPress={pickSong} hitSlop={{top:10, bottom:10, left:10, right:10}}>
            <Text numberOfLines={1} ellipsizeMode="tail">{songFile ? songFile.name : 'Choose file'}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Spotify Link</Text>
          <TextInput style={styles.input} value={spotifyLink} onChangeText={setSpotifyLink} placeholder="https://open.spotify.com/track/..." autoCapitalize="none" autoCorrect={false} />
          <Text style={styles.label}>YouTube Link</Text>
          <TextInput style={styles.input} value={youtubeLink} onChangeText={setYoutubeLink} placeholder="https://youtube.com/watch?v=..." autoCapitalize="none" autoCorrect={false} />
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" autoCapitalize="sentences" />
          <Text style={styles.label}>Category *</Text>
          <View style={styles.pickerWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryButton, category === cat && styles.categoryButtonSelected]}
                  onPress={() => setCategory(cat)}
                  hitSlop={{top:10, bottom:10, left:10, right:10}}
                >
                  <Text style={category === cat ? styles.categoryTextSelected : styles.categoryText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} value={description} onChangeText={setDescription} placeholder="Tell us about your content..." multiline />
          <Text style={styles.label}>Medium</Text>
          <TextInput style={styles.input} value={medium} onChangeText={setMedium} placeholder="e.g., Oil on canvas, Digital art, etc." />
          <Text style={styles.label}>Dimensions</Text>
          <TextInput style={styles.input} value={dimensions} onChangeText={setDimensions} placeholder="e.g., 24 x 36 inches, 1920x1080px, etc." />
          <View style={styles.checkboxRow}>
            <TouchableOpacity onPress={() => setIsForSale(!isForSale)} style={styles.checkbox} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Text style={isForSale ? styles.checkboxChecked : styles.checkboxUnchecked}>{isForSale ? '☑' : '☐'}</Text>
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>This content is for sale</Text>
          </View>
          {uploading && (
            <View style={styles.progressBarWrapper}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
            </View>
          )}
          <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading} hitSlop={{top:10, bottom:10, left:10, right:10}}>
            <Text style={styles.uploadButtonText}>Upload Content</Text>
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: '5%',
    paddingTop: 20,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    minHeight: Dimensions.get('window').height,
    paddingBottom: 60,
  },
  header: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
    color: '#22223b',
    textAlign: 'center',
  },
  subheader: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    color: '#22223b',
    fontSize: scaleFont(15),
  },
  imagesRow: {
    marginBottom: 8,
  },
  imageBox: {
    position: 'relative',
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    width: 60,
    height: 60,
  },
  image: {
    borderRadius: 8,
    resizeMode: 'cover',
    width: 60,
    height: 60,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  removeImageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addImageBox: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    width: 60,
    height: 60,
  },
  addImagePlus: {
    fontSize: 28,
    color: '#8b5cf6',
  },
  imageHint: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 8,
    marginTop: -4,
  },
  songButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 44,
    minWidth: 120,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    marginBottom: 8,
    fontSize: scaleFont(15),
    minHeight: 44,
  },
  pickerWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  categoryText: {
    color: '#22223b',
    fontWeight: '500',
    fontSize: scaleFont(15),
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '700',
    fontSize: scaleFont(15),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  checkbox: {
    marginRight: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    color: '#8b5cf6',
    fontSize: scaleFont(20),
    fontWeight: 'bold',
  },
  checkboxUnchecked: {
    color: '#d1d5db',
    fontSize: scaleFont(20),
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: scaleFont(15),
    color: '#22223b',
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    marginLeft: 8,
    color: '#8b5cf6',
    fontSize: scaleFont(14),
  },
  uploadButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    minHeight: 44,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: scaleFont(16),
  },
}); 