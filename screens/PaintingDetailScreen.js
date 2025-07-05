import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');

export default function PaintingDetailScreen({ navigation, route }) {
  const [painting, setPainting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const { paintingId } = route.params;

  useEffect(() => {
    getCurrentUser();
    fetchPainting();
  }, [paintingId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchPainting = async () => {
    try {
      const { data, error } = await supabase
        .from('paintings')
        .select(`
          *,
          profiles:artist_id (
            id,
            username,
            display_name,
            profile_picture_url,
            artist_type,
            bio
          )
        `)
        .eq('id', paintingId)
        .single();

      if (error) throw error;

      if (!data) {
        Alert.alert('Error', 'Painting not found');
        navigation.goBack();
        return;
      }

      // Get likes count and check if user liked
      const { count: likesCount } = await supabase
        .from('painting_likes')
        .select('*', { count: 'exact', head: true })
        .eq('painting_id', paintingId);

      let isLiked = false;
      if (user?.id) {
        const { data: userLike } = await supabase
          .from('painting_likes')
          .select('id')
          .eq('painting_id', paintingId)
          .eq('user_id', user.id)
          .maybeSingle();
        isLiked = !!userLike;
      }

      setPainting({
        ...data,
        likes_count: likesCount || 0,
        is_liked: isLiked,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching painting:', error);
      Alert.alert('Error', 'Failed to load painting details');
      navigation.goBack();
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to like artwork');
      return;
    }

    try {
      if (painting.is_liked) {
        // Unlike
        await supabase
          .from('painting_likes')
          .delete()
          .eq('painting_id', paintingId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('painting_likes')
          .insert({
            painting_id: paintingId,
            user_id: user.id
          });
      }
      
      // Refresh painting data
      fetchPainting();
    } catch (error) {
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleContactArtist = () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to contact the artist');
      return;
    }
    navigation.navigate('Chat', { 
      otherUser: painting.profiles,
      conversationId: null
    });
  };

  const handleViewArtistProfile = () => {
    navigation.navigate('Profile', { userId: painting.profiles.id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading painting details...</Text>
      </View>
    );
  }

  if (!painting) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Painting Details</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.centerText}>Painting not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Artwork Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Main Image */}
        <View style={styles.imageContainer}>
          {painting.image_url ? (
            <Image
              source={{ uri: painting.image_url }}
              style={styles.mainImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🖼️</Text>
            </View>
          )}
        </View>

        {/* Painting Info */}
        <View style={styles.infoSection}>
          <Text style={styles.paintingTitle}>{painting.title}</Text>
          
          {/* Artist Info */}
          <TouchableOpacity
            style={styles.artistSection}
            onPress={handleViewArtistProfile}
            activeOpacity={0.7}
          >
            <View style={styles.artistAvatar}>
              {painting.profiles?.profile_picture_url ? (
                <Image 
                  source={{ uri: painting.profiles.profile_picture_url }} 
                  style={styles.artistAvatarImage}
                />
              ) : (
                <Text style={styles.artistAvatarText}>
                  {painting.profiles?.display_name?.[0] || painting.profiles?.username?.[0] || '?'}
                </Text>
              )}
            </View>
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>
                {painting.profiles?.display_name || painting.profiles?.username}
              </Text>
              {painting.profiles?.artist_type && (
                <Text style={styles.artistType}>{painting.profiles.artist_type}</Text>
              )}
            </View>
            <Text style={styles.viewProfileText}>View Profile →</Text>
          </TouchableOpacity>

          {/* Description */}
          {painting.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{painting.description}</Text>
            </View>
          )}

          {/* Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            {painting.medium && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Medium:</Text>
                <Text style={styles.detailValue}>{painting.medium}</Text>
              </View>
            )}
            
            {painting.category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{painting.category}</Text>
              </View>
            )}
            
            {painting.price && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.priceValue}>₹{painting.price}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>
                {new Date(painting.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLike}
            >
              <Text style={styles.likeButtonText}>
                {painting.is_liked ? '❤️' : '🤍'} {painting.likes_count} Likes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactArtist}
            >
              <Text style={styles.contactButtonText}>💬 Contact Artist</Text>
            </TouchableOpacity>
          </View>

          {/* Additional Images */}
          {painting.additional_images && painting.additional_images.length > 0 && (
            <View style={styles.additionalImagesSection}>
              <Text style={styles.sectionTitle}>More Images</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {painting.additional_images.map((imageUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.additionalImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerText: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  mainImage: {
    width: width - 40,
    height: width - 40,
    borderRadius: 12,
  },
  placeholderImage: {
    width: width - 40,
    height: width - 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 80,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  paintingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  artistSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  artistAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  artistAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  artistAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  artistType: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewProfileText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  detailValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  likeButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  likeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  additionalImagesSection: {
    marginTop: 20,
  },
  additionalImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
}); 