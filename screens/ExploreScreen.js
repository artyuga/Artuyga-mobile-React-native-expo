import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  PanResponder,
} from 'react-native';
import { supabase } from '../supabase';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function ExploreScreen({ navigation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paintings, setPaintings] = useState([]);
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const categories = [
    { id: 'all', name: 'All', icon: '🎨', color: '#8b5cf6', description: 'Explore everything' },
    { id: 'artwork', name: 'Visual Art', icon: '🖼️', color: '#3b82f6', description: 'Paintings & drawings' },
    { id: 'singing', name: 'Music', icon: '🎵', color: '#10b981', description: 'Songs & melodies' },
    { id: 'dancer', name: 'Dance', icon: '💃', color: '#ef4444', description: 'Rhythm & movement' },
    { id: 'author', name: 'Books', icon: '📚', color: '#f59e0b', description: 'Stories & literature' },
    { id: 'writer', name: 'Writing', icon: '✍️', color: '#059669', description: 'Poetry & prose' },
    { id: 'theater', name: 'Theater', icon: '🎭', color: '#dc2626', description: 'Drama & performance' },
    { id: 'comedian', name: 'Comedy', icon: '😄', color: '#f59e0b', description: 'Laughter & humor' },
    { id: 'creator', name: 'Digital', icon: '✨', color: '#6366f1', description: 'Digital creations' },
  ];

  const handleCategoryPress = (categoryId) => {
    navigation.navigate('CategoryArt', { category: categoryId });
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          // Right swipe detected
          navigation.navigate('Home');
        }
      },
    })
  ).current;

  useEffect(() => {
    getCurrentUser();
    fetchPaintings();
    fetchFeaturedArtists();
  }, []);

  // Fetch artists matching search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const fetchArtists = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, profile_picture_url, followers_count, artist_type')
          .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
          .limit(20);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };
    fetchArtists();
  }, [searchTerm]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchPaintings = async () => {
    try {
      const { data: paintingsData, error: paintingsError } = await supabase
        .from('paintings')
        .select(`
          *,
          profiles:artist_id (
            id,
            username,
            display_name,
            profile_picture_url,
            artist_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (paintingsError) throw paintingsError;

      if (!paintingsData || paintingsData.length === 0) {
        setPaintings([]);
        setLoading(false);
        return;
      }

      // For each painting, get likes count and is_liked
      const paintingsWithLikes = await Promise.all(
        paintingsData.map(async (painting) => {
          // Get likes count
          const { count: likesCount } = await supabase
            .from('painting_likes')
            .select('*', { count: 'exact', head: true })
            .eq('painting_id', painting.id);
          
          // Check if current user liked this painting
          let isLiked = false;
          if (user?.id) {
            const { data: userLike } = await supabase
              .from('painting_likes')
              .select('id')
              .eq('painting_id', painting.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isLiked = !!userLike;
          }
          
          return {
            ...painting,
            likes_count: likesCount || 0,
            is_liked: isLiked,
          };
        })
      );

      setPaintings(paintingsWithLikes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching paintings:', error);
      setLoading(false);
    }
  };

  const fetchFeaturedArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url, followers_count, artist_type')
        .order('followers_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      setFeaturedArtists(data || []);
    } catch (error) {
      console.error('Error fetching featured artists:', error);
    }
  };

  const handleLikePainting = async (paintingId) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to like artwork');
      return;
    }

    try {
      const painting = paintings.find(p => p.id === paintingId);
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
      
      // Refresh paintings
      fetchPaintings();
    } catch (error) {
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handlePaintingPress = (paintingId) => {
    navigation.navigate('PaintingDetail', { paintingId });
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { borderColor: item.color }]}
      onPress={() => handleCategoryPress(item.id)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[styles.categoryLabel, { color: item.color }]}>{item.name}</Text>
      <Text style={styles.categoryDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  const renderArtist = ({ item }) => (
    <TouchableOpacity
      style={styles.artistCard}
      onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
    >
      <View style={styles.artistAvatarContainer}>
        {item.profile_picture_url ? (
          <Image source={{ uri: item.profile_picture_url }} style={styles.artistAvatarImage} />
        ) : (
          <View style={styles.artistAvatarPlaceholder}>
            <Text style={styles.artistAvatarText}>
              {item.display_name ? item.display_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}
        {item.artist_type && (
          <View style={styles.artistTypeBadge}>
            <Text style={styles.artistTypeBadgeText}>{item.artist_type}</Text>
          </View>
        )}
      </View>
      <Text style={styles.artistName} numberOfLines={1}>
        {item.display_name || item.username}
      </Text>
      <Text style={styles.artistFollowers}>
        {item.followers_count || 0} followers
      </Text>
    </TouchableOpacity>
  );

  const renderPainting = ({ item }) => (
    <TouchableOpacity
      style={styles.paintingCard}
      onPress={() => handlePaintingPress(item.id)}
    >
      <View style={styles.paintingImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.paintingImage} />
        ) : (
          <View style={styles.paintingPlaceholder}>
            <Text style={styles.paintingPlaceholderText}>🎨</Text>
          </View>
        )}
        <View style={styles.paintingOverlay}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category || 'Art'}</Text>
          </View>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLikePainting(item.id)}
          >
            <Ionicons 
              name={item.is_liked ? "heart" : "heart-outline"} 
              size={16} 
              color={item.is_liked ? "#ef4444" : "#fff"} 
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.paintingInfo}>
        <Text style={styles.paintingTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.paintingArtist} numberOfLines={1}>
          by {item.profiles?.display_name || item.profiles?.username || 'Unknown'}
        </Text>
        <View style={styles.paintingMeta}>
          {item.price && (
            <Text style={styles.paintingPrice}>₹{item.price}</Text>
          )}
          <Text style={styles.paintingLikes}>
            {item.likes_count} likes
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Discovering amazing art...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Modern Header */}
      <View style={styles.headerModern}>
        <View style={styles.headerAvatarContainer}>
          {user?.user_metadata?.avatar_url ? (
            <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitleModern}>Explore</Text>
          <Text style={styles.headerSubtitleModern}>Discover amazing creators</Text>
        </View>
        <TouchableOpacity
          style={styles.headerSearchButton}
          onPress={() => {/* Focus search input */}}
        >
          <Ionicons name="search-outline" size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enhanced Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search artists, creators, and artwork..."
              placeholderTextColor="#9ca3af"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Featured Artists or Search Results */}
        {(searchTerm.trim() ? searchResults.length > 0 : featuredArtists.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchTerm.trim() ? '🔍 Search Results' : '⭐ Featured Artists'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {searchTerm.trim() ? `${searchResults.length} results` : `${featuredArtists.length} creators`}
              </Text>
            </View>
            {searchLoading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <FlatList
                data={searchTerm.trim() ? searchResults : featuredArtists}
                renderItem={renderArtist}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.artistsList}
                contentContainerStyle={styles.artistsContent}
              />
            )}
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Browse by Category</Text>
            <Text style={styles.sectionSubtitle}>{categories.length} categories</Text>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.categoryRow}
            scrollEnabled={false}
          />
        </View>

        {/* Recent Artwork */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎨 Recent Artwork</Text>
            <Text style={styles.sectionSubtitle}>{paintings.length} pieces</Text>
          </View>
          {paintings.length > 0 ? (
            <FlatList
              data={paintings}
              renderItem={renderPainting}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.paintingsRow}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🎨</Text>
              <Text style={styles.emptyStateText}>No artwork yet</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to upload something amazing!</Text>
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  headerAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 8,
  },
  headerTitleModern: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8b5cf6',
    textAlign: 'center',
    letterSpacing: 1,
  },
  headerSubtitleModern: {
    fontSize: 13,
    color: '#6366f1',
    textAlign: 'center',
    marginTop: 2,
  },
  headerSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 4,
  },
  clearButton: {
    marginLeft: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  artistsList: {
    marginBottom: 8,
  },
  artistsContent: {
    paddingRight: 20,
  },
  artistCard: {
    alignItems: 'center',
    marginRight: 20,
    width: 100,
  },
  artistAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  artistAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  artistAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  artistTypeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  artistTypeBadgeText: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '600',
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  artistFollowers: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  categoryRow: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  paintingsRow: {
    justifyContent: 'space-between',
  },
  paintingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  paintingImageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: '#f3f4f6',
  },
  paintingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  paintingPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  paintingPlaceholderText: {
    fontSize: 40,
  },
  paintingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
  },
  likeButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paintingInfo: {
    padding: 12,
  },
  paintingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  paintingArtist: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  paintingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paintingPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  paintingLikes: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
}); 