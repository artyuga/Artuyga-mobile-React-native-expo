import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { supabase } from '../supabase';
import * as Audio from 'expo-av';
import Slider from '@react-native-community/slider';

export default function CategoryArtScreen({ navigation, route }) {
  // All hooks at the top, before any early returns
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { category } = route.params;

  const categoryInfo = {
    all: { title: 'All Art', icon: '🎨', color: '#8b5cf6' },
    artwork: { title: 'Visual Art', icon: '🖼️', color: '#3b82f6' },
    singing: { title: 'Music', icon: '🎵', color: '#10b981' },
    dancer: { title: 'Dance', icon: '💃', color: '#ef4444' },
    author: { title: 'Books', icon: '📚', color: '#f59e0b' },
    writer: { title: 'Writing', icon: '✍️', color: '#059669' },
    theater: { title: 'Theater', icon: '🎭', color: '#dc2626' },
    comedian: { title: 'Comedy', icon: '😄', color: '#f59e0b' },
    creator: { title: 'Digital', icon: '✨', color: '#6366f1' },
  };

  // Music-related hooks (always called)
  const musicPaintings = paintings.filter(p => p.external_link);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
  const [playedIndices, setPlayedIndices] = useState([]);
  const [likeLoading, setLikeLoading] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const currentSong = musicPaintings[currentSongIndex] || null;
  const isMusicCategory = category === 'singing';

  // Music player controls
  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handlePrevSong = () => setCurrentSongIndex((prev) => (prev > 0 ? prev - 1 : musicPaintings.length - 1));
  const handleNextSong = () => {
    if (isShuffling) {
      let idx;
      do {
        idx = Math.floor(Math.random() * musicPaintings.length);
      } while (idx === currentSongIndex && musicPaintings.length > 1);
      setCurrentSongIndex(idx);
    } else if (repeatMode === 'one') {
      setCurrentSongIndex(currentSongIndex);
    } else if (repeatMode === 'all' && currentSongIndex === musicPaintings.length - 1) {
      setCurrentSongIndex(0);
    } else {
      setCurrentSongIndex((prev) => (prev < musicPaintings.length - 1 ? prev + 1 : (repeatMode === 'all' ? 0 : prev)));
    }
  };
  const handleShuffle = () => setIsShuffling((s) => !s);
  const handleRepeat = () => setRepeatMode((mode) => mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off');

  useEffect(() => {
    getCurrentUser();
    fetchPaintings();
  }, [category]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchPaintings = async () => {
    try {
      let query = supabase
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
        .order('created_at', { ascending: false });

      // Apply category filter if not 'all'
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data: paintingsData, error: paintingsError } = await query;

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

  const renderPainting = ({ item }) => (
    <TouchableOpacity
      style={styles.paintingCard}
      onPress={() => navigation.navigate('PaintingDetail', { paintingId: item.id })}
    >
      <View style={styles.paintingImage}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.paintingImageContent}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.paintingPlaceholder}>🖼️</Text>
        )}
        
        {/* Like button */}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => handleLikePainting(item.id)}
        >
          <Text style={styles.likeButtonText}>
            {item.is_liked ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.paintingInfo}>
        <Text style={styles.paintingTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.paintingArtist} numberOfLines={1}>
          by {item.profiles?.display_name || item.profiles?.username}
        </Text>
        <View style={styles.paintingMeta}>
          {item.price && (
            <Text style={styles.paintingPrice}>₹{item.price}</Text>
          )}
          <Text style={styles.paintingLikes}>❤️ {item.likes_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Music player logic (effects)
  useEffect(() => {
    if (!isMusicCategory) return;
    if (!currentSong || !currentSong.external_link) return;
    let isMounted = true;
    const loadAndPlay = async () => {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentSong.external_link },
        { shouldPlay: isPlaying },
        (status) => isMounted && setPlaybackStatus(status)
      );
      setSound(newSound);
    };
    loadAndPlay();
    return () => {
      isMounted = false;
      if (sound) sound.unloadAsync();
    };
    // eslint-disable-next-line
  }, [currentSongIndex]);

  useEffect(() => {
    if (!sound) return;
    if (isPlaying) {
      sound.playAsync();
    } else {
      sound.pauseAsync();
    }
  }, [isPlaying]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading {categoryInfo[category]?.title || 'artwork'}...</Text>
      </View>
    );
  }

  const currentCategory = categoryInfo[category] || categoryInfo.all;

  // Like logic (simplified, mimic webapp)
  const handleLike = async () => {
    if (!user || !currentSong) return;
    setLikeLoading(true);
    try {
      if (currentSong.is_liked || justLiked) {
        await supabase.from('painting_likes').delete().eq('painting_id', currentSong.id).eq('user_id', user.id);
        setJustLiked(false);
      } else {
        await supabase.from('painting_likes').insert({ painting_id: currentSong.id, user_id: user.id });
        setJustLiked(true);
      }
    } catch {}
    setLikeLoading(false);
  };

  // --- MUSIC PAGE UI ---
  if (isMusicCategory) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1e003a' }}>
        {/* Hero Section */}
        <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#3a185c' }}>
          {currentSong?.image_url ? (
            <Image source={{ uri: currentSong.image_url }} style={{ width: 140, height: 140, borderRadius: 16, marginBottom: 16 }} />
          ) : (
            <View style={{ width: 140, height: 140, borderRadius: 16, backgroundColor: '#8b5cf6', marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 48, color: '#fff' }}>🎵</Text>
            </View>
          )}
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>Community Songs</Text>
          <Text style={{ color: '#f9a8d4', fontSize: 16, marginBottom: 4 }}>Discover and play music from our talented community</Text>
          <Text style={{ color: '#f9a8d4', fontSize: 14 }}>{musicPaintings.length} songs</Text>
        </View>
        {/* Sticky Player Bar */}
        {currentSong && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d004d', padding: 16 }}>
            <Image source={{ uri: currentSong.image_url }} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={{ color: '#f9a8d4', fontSize: 14 }} numberOfLines={1}>{currentSong.profiles?.display_name || currentSong.profiles?.username || 'Unknown Artist'}</Text>
              {/* Seek Bar and Countdown */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ color: '#fff', fontSize: 12, width: 40, textAlign: 'right' }}>
                  {playbackStatus && playbackStatus.positionMillis != null ? formatTime(playbackStatus.positionMillis) : '0:00'}
                </Text>
                <Slider
                  style={{ flex: 1, marginHorizontal: 8 }}
                  minimumValue={0}
                  maximumValue={playbackStatus && playbackStatus.durationMillis ? playbackStatus.durationMillis : 1}
                  value={playbackStatus && playbackStatus.positionMillis ? playbackStatus.positionMillis : 0}
                  minimumTrackTintColor="#f9a8d4"
                  maximumTrackTintColor="#fff2"
                  thumbTintColor="#f9a8d4"
                  onSlidingComplete={async (value) => {
                    if (sound && playbackStatus && playbackStatus.isLoaded) {
                      await sound.setPositionAsync(value);
                    }
                  }}
                  disabled={!playbackStatus || !playbackStatus.isLoaded}
                />
                <Text style={{ color: '#fff', fontSize: 12, width: 40, textAlign: 'left' }}>
                  {playbackStatus && playbackStatus.durationMillis != null ? formatTime(playbackStatus.durationMillis) : '0:00'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleShuffle} style={{ marginHorizontal: 4 }}>
              <Text style={{ fontSize: 22, color: isShuffling ? '#f9a8d4' : '#fff' }}>🔀</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrevSong} style={{ marginHorizontal: 4 }}>
              <Text style={{ fontSize: 22, color: '#fff' }}>⏮️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePlayPause} style={{ marginHorizontal: 4 }}>
              <Text style={{ fontSize: 22, color: '#fff' }}>{isPlaying ? '⏸️' : '▶️'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNextSong} style={{ marginHorizontal: 4 }}>
              <Text style={{ fontSize: 22, color: '#fff' }}>⏭️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRepeat} style={{ marginHorizontal: 4 }}>
              <Text style={{ fontSize: 22, color: repeatMode !== 'off' ? '#f9a8d4' : '#fff' }}>{repeatMode === 'one' ? '🔂' : '🔁'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLike} style={{ marginHorizontal: 4 }} disabled={likeLoading}>
              <Text style={{ fontSize: 22, color: currentSong.is_liked || justLiked ? '#f9a8d4' : '#fff' }}>{currentSong.is_liked || justLiked ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Song List */}
        <ScrollView style={{ flex: 1, backgroundColor: '#1e003a' }} contentContainerStyle={{ padding: 16 }}>
          {musicPaintings.map((song, idx) => (
            <TouchableOpacity
              key={song.id}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18, backgroundColor: idx === currentSongIndex ? '#3a185c' : '#2d004d', borderRadius: 10, padding: 10 }}
              onPress={() => setCurrentSongIndex(idx)}
            >
              <Image source={{ uri: song.image_url }} style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }} numberOfLines={1}>{song.title}</Text>
                <Text style={{ color: '#f9a8d4', fontSize: 13 }} numberOfLines={1}>{song.profiles?.display_name || song.profiles?.username || 'Unknown Artist'}</Text>
              </View>
              <Text style={{ fontSize: 20, color: idx === currentSongIndex ? '#f9a8d4' : '#fff', marginHorizontal: 8 }}>{idx === currentSongIndex && isPlaying ? '🔊' : '▶️'}</Text>
              <TouchableOpacity onPress={handleLike} disabled={likeLoading}>
                <Text style={{ fontSize: 20, color: song.is_liked || (idx === currentSongIndex && justLiked) ? '#f9a8d4' : '#fff' }}>{song.is_liked || (idx === currentSongIndex && justLiked) ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: currentCategory.color }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.categoryIcon}>{currentCategory.icon}</Text>
          <Text style={styles.title}>{currentCategory.title}</Text>
          <Text style={styles.subtitle}>
            {paintings.length} {paintings.length === 1 ? 'piece' : 'pieces'} of artwork
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
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
            <Text style={styles.emptyStateIcon}>{currentCategory.icon}</Text>
            <Text style={styles.emptyStateText}>No {currentCategory.title.toLowerCase()} yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to upload {currentCategory.title.toLowerCase()}!
            </Text>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: currentCategory.color }]}
              onPress={() => navigation.navigate('Upload')}
            >
              <Text style={styles.uploadButtonText}>Upload {currentCategory.title}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  paintingsRow: {
    justifyContent: 'space-between',
  },
  paintingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  paintingImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  paintingImageContent: {
    width: '100%',
    height: '100%',
  },
  paintingPlaceholder: {
    fontSize: 40,
  },
  likeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonText: {
    fontSize: 14,
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
    marginBottom: 4,
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
    padding: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 30,
  },
  uploadButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 