import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { supabase } from '../supabase';
import { Share as NativeShare } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import YugAIAssistant from './YugAIAssistant';
// Add this import for avatar placeholder
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentThreadId, setCommentThreadId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  // Add state for story modal
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadImages, setNewThreadImages] = useState([]);
  const [newThreadMediaType, setNewThreadMediaType] = useState('text');
  const [creatingThread, setCreatingThread] = useState(false);
  const [page, setPage] = useState(0); // For pagination
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Menu bar animations
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnimation = React.useRef(new Animated.Value(0)).current;

  // PanResponder must be declared here, before any conditional returns
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          // Left swipe detected
          navigation.navigate('Explore');
        }
      },
    })
  ).current;

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getCurrentUser();
    fetchThreads(0, false); // Load first page
    fetchStories();
    
    // Start menu animations
    // startMenuAnimations(); // Removed as per edit hint
  }, []);
  
  // Menu bar functions
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
    Animated.timing(menuAnimation, {
      toValue: menuVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCartPress = () => {
    // Add haptic feedback or scale animation here
    Alert.alert('Cart', 'Shopping cart coming soon! 🛒');
  };

  const handlePremiumPress = () => {
    Alert.alert(
      'Coming Soon! 🚀',
      'Premium membership features will be available soon. We\'re working hard to bring you amazing premium features!',
      [
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
  };

  const handleNFTPress = () => {
    navigation.navigate('NFTComingSoon');
  };

  const handleSettingsPress = () => {
    // Navigate to settings screen
    navigation.navigate('Settings');
  };

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const handleTicketsPress = () => {
    navigation.navigate('Tickets');
  };

  const PAGE_SIZE = 20;

  const fetchThreads = async (pageToFetch = 0, append = false) => {
    try {
      const from = pageToFetch * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: threadsData, error: threadsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (threadsError) {
        console.error('Error fetching threads:', threadsError);
        if (!append) setThreads([]);
        setHasMore(false);
        return;
      }

      if (!threadsData || threadsData.length === 0) {
        if (!append) setThreads([]);
        setHasMore(false);
        return;
      }

      // Get unique author IDs
      const authorIds = [...new Set(threadsData.map(thread => thread.author_id))];
      const { data: authorsData, error: authorsError } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url, is_verified, artist_type')
        .in('id', authorIds);
      if (authorsError) {
        console.error('Error fetching authors:', authorsError);
        if (!append) setThreads([]);
        setHasMore(false);
        return;
      }
      const authorsMap = new Map(authorsData?.map(author => [author.id, author]) || []);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const threadsWithStats = await Promise.all(
        threadsData.map(async (thread) => {
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', thread.id);
          const { count: commentsCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', thread.id);
          let isLiked = false;
          if (currentUser?.id) {
            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', thread.id)
              .eq('user_id', currentUser.id)
              .maybeSingle();
            isLiked = !!userLike;
          }
          const author = authorsMap.get(thread.author_id);
          return {
            id: thread.id,
            title: thread.title,
            content: thread.content,
            post_type: thread.post_type,
            media_type: thread.media_type,
            video_url: thread.video_url,
            voice_note_url: thread.voice_note_url,
            created_at: thread.created_at,
            author: {
              id: author?.id || '',
              username: author?.username || '',
              display_name: author?.display_name || '',
              profile_picture_url: author?.profile_picture_url || '',
              is_verified: author?.is_verified || false,
              artist_type: author?.artist_type || null
            },
            likes_count: likesCount || 0,
            is_liked: isLiked,
            comments_count: commentsCount || 0,
            images: Array.isArray(thread.images) ? thread.images.map(img => String(img)) : []
          };
        })
      );
      // Deduplicate threads by id before setting state
      const dedupedThreads = [];
      const seenThreadIds = new Set();
      for (const t of threadsWithStats) {
        if (!seenThreadIds.has(t.id)) {
          dedupedThreads.push(t);
          seenThreadIds.add(t.id);
        }
      }
      if (append) {
        setThreads(prev => {
          const allThreads = [...prev, ...dedupedThreads];
          const uniqueThreads = [];
          const seen = new Set();
          for (const t of allThreads) {
            if (!seen.has(t.id)) {
              uniqueThreads.push(t);
              seen.add(t.id);
            }
          }
          return uniqueThreads;
        });
      } else {
        setThreads(dedupedThreads);
      }
      setHasMore(threadsData.length === PAGE_SIZE); // If less than PAGE_SIZE, no more data
    } catch (error) {
      console.error('Error fetching threads:', error);
      if (!append) setThreads([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchThreads(nextPage, true);
  };

  const fetchStories = async () => {
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (storiesError) {
        console.error('Error fetching stories:', storiesError);
        setStories([]);
        return;
      }

      if (!storiesData || storiesData.length === 0) {
        setStories([]);
        return;
      }

      // Get user profiles for the stories
      const userIds = [...new Set(storiesData.map(story => story.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url')
        .in('id', userIds);

      // Combine stories with profiles
      const storiesWithProfiles = storiesData.map(story => ({
        ...story,
        profiles: profilesData?.find(profile => profile.id === story.user_id)
      }));

      // Deduplicate stories by id before setting state
      const dedupedStories = [];
      const seenStoryIds = new Set();
      for (const s of storiesWithProfiles) {
        if (!seenStoryIds.has(s.id)) {
          dedupedStories.push(s);
          seenStoryIds.add(s.id);
        }
      }
      setStories(dedupedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
    }
  };

  const handleLikeThread = async (threadId) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to like threads');
      return;
    }

    try {
      const thread = threads.find(t => t.id === threadId);
      if (!thread) return;

      // Optimistically update the UI
      const updatedThreads = threads.map(t => {
        if (t.id === threadId) {
          return {
            ...t,
            is_liked: !t.is_liked,
            likes_count: t.is_liked ? t.likes_count - 1 : t.likes_count + 1
          };
        }
        return t;
      });
      setThreads(updatedThreads);

      if (thread.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', threadId)
          .eq('user_id', user.id);
        
        if (error) {
          // Revert on error
          setThreads(threads);
          Alert.alert('Error', 'Failed to unlike thread');
        }
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: threadId,
            user_id: user.id
          });
        
        if (error) {
          // Revert on error
          setThreads(threads);
          Alert.alert('Error', 'Failed to like thread');
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert on error
      setThreads(threads);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        navigation.replace('SignIn');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handlePaintingPress = (paintingId) => {
    navigation.navigate('PaintingDetail', { paintingId });
  };

  const openImageModal = (images, index) => {
    setModalImages(images);
    setModalImageIndex(index);
    setImageModalVisible(true);
  };
  const closeImageModal = () => {
    setImageModalVisible(false);
    setModalImages([]);
    setModalImageIndex(0);
  };

  const openCommentModal = async (threadId) => {
    setCommentThreadId(threadId);
    setCommentModalVisible(true);
    setNewComment('');
    setCommentLoading(true);
    // Step 1: Fetch comments for the thread
    const { data: commentsData, error: commentsError } = await supabase
      .from('post_comments')
      .select('id, content, created_at, author_id')
      .eq('post_id', threadId)
      .order('created_at', { ascending: true });
    if (commentsError) {
      setComments([]);
      setCommentLoading(false);
      return;
    }
    if (commentsData?.length) {
      // Step 2: Fetch author profiles
      const authorIds = [...new Set(commentsData.map(c => c.author_id))];
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url')
        .in('id', authorIds);
      const authorsMap = new Map((authorsData || []).map(author => [author.id, author]));
      // Merge author info into comments
      const commentsWithAuthors = commentsData.map(comment => ({
        ...comment,
        profiles: authorsMap.get(comment.author_id) || {
          id: comment.author_id,
          username: 'Unknown',
          display_name: 'Unknown User',
          profile_picture_url: ''
        }
      }));
      setComments(commentsWithAuthors);
    } else {
      setComments([]);
    }
    setCommentLoading(false);
  };

  const closeCommentModal = () => {
    setCommentModalVisible(false);
    setCommentThreadId(null);
    setComments([]);
    setNewComment('');
  };

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to comment');
      return;
    }
    if (!newComment.trim()) return;
    setCommentLoading(true);
    const { error } = await supabase
      .from('post_comments')
      .insert({
        post_id: commentThreadId,
        author_id: user.id,
        content: newComment.trim(),
      });
    if (error) {
      Alert.alert('Error', 'Failed to add comment');
      setCommentLoading(false);
      return;
    }
    setNewComment('');
    // Refresh comments (same logic as openCommentModal)
    const { data: commentsData, error: commentsError } = await supabase
      .from('post_comments')
      .select('id, content, created_at, author_id')
      .eq('post_id', commentThreadId)
      .order('created_at', { ascending: true });
    if (commentsError) {
      setComments([]);
      setCommentLoading(false);
      return;
    }
    if (commentsData?.length) {
      const authorIds = [...new Set(commentsData.map(c => c.author_id))];
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url')
        .in('id', authorIds);
      const authorsMap = new Map((authorsData || []).map(author => [author.id, author]));
      const commentsWithAuthors = commentsData.map(comment => ({
        ...comment,
        profiles: authorsMap.get(comment.author_id) || {
          id: comment.author_id,
          username: 'Unknown',
          display_name: 'Unknown User',
          profile_picture_url: ''
        }
      }));
      setComments(commentsWithAuthors);
    } else {
      setComments([]);
    }
    setCommentLoading(false);
    // Optionally, refresh threads to update comment count
    fetchThreads();
  };

  const renderStory = ({ item }) => (
    <TouchableOpacity style={styles.storyItem} onPress={() => {
      setSelectedStory(item);
      setStoryModalVisible(true);
    }}>
      <View style={styles.storyAvatar}>
        {item.profiles?.profile_picture_url ? (
          <Image 
            source={{ uri: item.profiles.profile_picture_url }} 
            style={styles.storyAvatarImage}
          />
        ) : (
          <Text style={styles.storyAvatarText}>
            {item.profiles?.display_name?.[0] || item.profiles?.username?.[0] || '?'}
          </Text>
        )}
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {item.profiles?.display_name || item.profiles?.username}
      </Text>
    </TouchableOpacity>
  );

  // Share thread handler
  const handleShareThread = async (thread) => {
    const shareUrl = `https://artyuga.com/thread/${thread.id}`;
    const shareText = thread.title ? `${thread.title}\n${shareUrl}` : shareUrl;
    try {
      const result = await NativeShare.share({
        message: shareText,
        url: shareUrl,
        title: thread.title || 'Check out this thread!'
      });
      // Optionally handle result.action
    } catch (error) {
      // Fallback: copy to clipboard
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('Link copied!', 'Thread link copied to clipboard');
    }
  };

  const BlueTickBadge = () => (
    <View style={styles.blueTickBadge}>
      <Text style={styles.blueTickCheck}>✓</Text>
    </View>
  );

  const renderThread = ({ item }) => (
    <View style={styles.threadCard}>
      <View style={styles.threadHeader}>
        <TouchableOpacity 
          style={styles.userInfo} 
          onPress={() => navigation.navigate('PublicProfile', { userId: item.author?.id })}
          activeOpacity={0.7}
        >
          <View style={styles.userAvatar}>
            {item.author?.profile_picture_url ? (
              <Image 
                source={{ uri: item.author.profile_picture_url }} 
                style={styles.userAvatarImage}
              />
            ) : (
              <Text style={styles.userAvatarText}>
                {item.author?.display_name?.[0] || item.author?.username?.[0] || '?'}
              </Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.userName}>
                {item.author?.display_name || item.author?.username}
              </Text>
              {item.author?.is_verified && <BlueTickBadge />}
              {item.author?.artist_type && (
                <View style={styles.artistTypeBadge}>
                  <Text style={styles.artistTypeBadgeText}>{item.author.artist_type}</Text>
                </View>
              )}
            </View>
            <Text style={styles.threadTime}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {item.title && (
        <Text style={styles.threadTitle}>{item.title}</Text>
      )}

      {item.content && (
        <Text style={styles.threadContent} numberOfLines={3}>
          {item.content}
        </Text>
      )}

      {item.images && item.images.length > 0 && (
        <FlatList
          data={item.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(img, idx) => idx.toString()}
          renderItem={({ item: img, index }) => (
            <TouchableOpacity onPress={() => openImageModal(item.images, index)}>
              <Image
                source={{ uri: img }}
                style={styles.fullWidthImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          style={styles.fullWidthImageList}
        />
      )}

      <View style={styles.threadActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLikeThread(item.id)}
        >
          <Text style={[styles.actionText, item.is_liked && styles.likedAction]}>
            {item.is_liked ? '❤️' : '🤍'} {item.likes_count}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => openCommentModal(item.id)}>
          <Text style={styles.actionText}>💬 {item.comments_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleShareThread(item)}>
          <Text style={styles.actionText}>📤 Share</Text>
        </TouchableOpacity>
      </View>
      
      {/* YugAI Assistant */}
      <YugAIAssistant navigation={navigation} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Add a helper to get the current story index
  const getCurrentStoryIndex = () => {
    if (!selectedStory) return -1;
    return stories.findIndex(s => s.id === selectedStory.id);
  };

  // Add handlers for next/prev story
  const goToNextStory = () => {
    const idx = getCurrentStoryIndex();
    if (idx >= 0 && idx < stories.length - 1) {
      setSelectedStory(stories[idx + 1]);
    }
  };
  const goToPrevStory = () => {
    const idx = getCurrentStoryIndex();
    if (idx > 0) {
      setSelectedStory(stories[idx - 1]);
    }
  };

  const openCreateThreadModal = () => {
    setNewThreadTitle('');
    setNewThreadContent('');
    setNewThreadImages([]);
    setCreateModalVisible(true);
  };

  const closeCreateThreadModal = () => {
    setCreateModalVisible(false);
    setNewThreadTitle('');
    setNewThreadContent('');
    setNewThreadImages([]);
    setNewThreadMediaType('text');
  };

  const pickThreadImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        setNewThreadImages(result.assets);
        setNewThreadMediaType('image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const uploadThreadImage = async (asset, userId, index) => {
    try {
      const fileUri = asset.uri;
      const fileExt = asset.fileName ? asset.fileName.split('.').pop() : 'jpg';
      const fileName = `${userId}/${Date.now()}_${index}.${fileExt}`;
      const fileType = asset.mimeType || `image/${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Buffer.from(base64, 'base64');

      // Upload as ArrayBuffer
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, fileBuffer, { contentType: fileType });

      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (error) {
      throw error;
    }
  };

  const handleCreateThread = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to post a thread');
      return;
    }
    if (!newThreadContent.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }
    setCreatingThread(true);
    try {
      let uploadedUrls = [];
      if (newThreadImages.length > 0) {
        for (let i = 0; i < newThreadImages.length; i++) {
          const url = await uploadThreadImage(newThreadImages[i], user.id, i);
          uploadedUrls.push(url);
        }
      }
      const { error } = await supabase.from('community_posts').insert([
        {
          title: newThreadTitle,
          content: newThreadContent,
          images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          author_id: user.id,
          post_type: 'general',
          media_type: newThreadMediaType,
          community_id: null,
        },
      ]);
      if (error) throw error;
      setCreateModalVisible(false);
      setNewThreadTitle('');
      setNewThreadContent('');
      setNewThreadImages([]);
      setNewThreadMediaType('text');
      fetchThreads(); // Refresh threads
      Alert.alert('Success', 'Thread posted!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to post thread');
    } finally {
      setCreatingThread(false);
    }
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Modern Header */}
      <View style={styles.headerModern}>
        <TouchableOpacity
          style={styles.headerAvatarContainer}
          onPress={() => navigation.navigate('Profile', { userId: user?.id })}
        >
          {user?.profile_picture_url ? (
            <Image
              source={{ uri: user.profile_picture_url }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={28} color="#8b5cf6" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitleModern}>Artयुग</Text>
          <Text style={styles.headerSubtitleModern}>Your creative community</Text>
        </View>
        <TouchableOpacity
          style={styles.headerMessageButton}
          onPress={() => navigation.navigate('Messages')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {/* Floating Menu Bar */}
      <View style={styles.menuBarContainer}>
        <Animated.View
          style={[
            styles.menuBar,
            {
              transform: [
                {
                  translateX: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [80, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Cart Button */}
          <View style={styles.menuItem}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleCartPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="cart-outline" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.menuLabel}>Cart</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Premium Button */}
          <View style={styles.menuItem}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handlePremiumPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="diamond" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.menuLabel}>Premium</Text>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>Pro</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* NFT Marketplace Button */}
          <View style={styles.menuItem}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleNFTPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="diamond-outline" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.menuLabel}>NFT</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Settings Button */}
          <View style={styles.menuItem}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleSettingsPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="settings-outline" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.menuLabel}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Notifications Button */}
          <View style={styles.menuItem}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleNotificationsPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.menuLabel}>Notifications</Text>
            </TouchableOpacity>
          </View>

          {/* Tickets Button */}
          <View style={styles.menuItem}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleTicketsPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="ticket-outline" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.menuLabel}>Tickets</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Menu Toggle Button */}
        <TouchableOpacity
          style={styles.menuToggleButton}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={menuVisible ? "close" : "menu"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stories Row */}
        {stories.length > 0 && (
          <View style={styles.storiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📸 Stories</Text>
              <Text style={styles.sectionSubtitle}>{stories.length} stories</Text>
            </View>
            <FlatList
              data={stories}
              renderItem={renderStory}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.storiesList}
              contentContainerStyle={styles.storiesContent}
            />
          </View>
        )}
        {/* Create Thread Button */}
        <TouchableOpacity
          style={styles.createThreadButton}
          onPress={openCreateThreadModal}
        >
          <View style={styles.createThreadContent}>
            <Text style={styles.createThreadIcon}>✏️</Text>
            <Text style={styles.createThreadText}>Share your thoughts</Text>
          </View>
        </TouchableOpacity>
        {/* Threads */}
        <View style={styles.threadsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💭 Recent Threads</Text>
            <Text style={styles.sectionSubtitle}>{threads.length} threads</Text>
          </View>
          {threads.length > 0 ? (
            <FlatList
              data={threads}
              renderItem={renderThread}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#8b5cf6" /> : null}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🎨</Text>
              <Text style={styles.emptyStateText}>No threads yet</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to share something amazing!</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <Modal visible={imageModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <FlatList
            data={modalImages}
            horizontal
            pagingEnabled
            initialScrollIndex={modalImageIndex}
            getItemLayout={(_, i) => ({ length: 400, offset: 400 * i, index: i })}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.modalImage} resizeMode="contain" />
            )}
            keyExtractor={(img, idx) => idx.toString()}
          />
          <TouchableOpacity style={styles.modalCloseButton} onPress={closeImageModal}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal visible={commentModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.commentModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.commentModalBox}>
            <Text style={styles.commentModalTitle}>Comments</Text>
            {commentLoading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('PublicProfile', { userId: item.profiles?.id })}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: item.profiles?.profile_picture_url || undefined }}
                        style={styles.commentAvatar}
                      />
                    </TouchableOpacity>
                    <View style={styles.commentContentBox}>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('PublicProfile', { userId: item.profiles?.id })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.commentAuthor}>{item.profiles?.display_name || item.profiles?.username || 'User'}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
                style={styles.commentList}
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                editable={!commentLoading}
              />
              <TouchableOpacity
                style={styles.commentSendButton}
                onPress={handleAddComment}
                disabled={commentLoading || !newComment.trim()}
              >
                <Text style={styles.commentSendText}>Send</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.commentModalClose} onPress={closeCommentModal}>
              <Text style={styles.commentModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={storyModalVisible} transparent animationType="fade" onRequestClose={() => setStoryModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,10,20,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          {/* Progress Bar (static for now) */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <View style={{ width: '80%', height: '100%', backgroundColor: '#fff', borderRadius: 2 }} />
          </View>
          {/* Story Content */}
          {selectedStory && (
            <View style={{ width: '90%', aspectRatio: 9/16, borderRadius: 24, backgroundColor: '#111', overflow: 'hidden', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8, justifyContent: 'flex-start', alignItems: 'center', position: 'relative' }}>
              {/* Profile and username overlay */}
              <View style={{ position: 'absolute', top: 18, left: 18, flexDirection: 'row', alignItems: 'center', zIndex: 2 }}>
                <Image
                  source={{ uri: selectedStory.profiles?.profile_picture_url || undefined }}
                  style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff', backgroundColor: '#eee' }}
                />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 10, textShadowColor: '#000', textShadowRadius: 4 }}>{selectedStory.profiles?.display_name || selectedStory.profiles?.username || 'User'}</Text>
              </View>
              {/* Story Image with left/right tap overlays */}
              <View style={{ width: '100%', height: '100%', flexDirection: 'row' }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.2} onPress={goToPrevStory} />
                <Image
                  source={{ uri: selectedStory.content_url }}
                  style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                />
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.2} onPress={goToNextStory} />
              </View>
            </View>
          )}
          {/* Close Button */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 30, padding: 10, zIndex: 10 }}
            onPress={() => setStoryModalVisible(false)}
          >
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', textShadowColor: '#000', textShadowRadius: 8 }}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={closeCreateThreadModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 12 }}>Create Thread</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 16 }}
              placeholder="Title (optional)"
              value={newThreadTitle}
              onChangeText={setNewThreadTitle}
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, minHeight: 80, fontSize: 16, marginBottom: 10 }}
              placeholder="What's on your mind?"
              value={newThreadContent}
              onChangeText={setNewThreadContent}
              multiline
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {newThreadImages.map((img, idx) => (
                <Image key={idx} source={{ uri: img.uri }} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 8 }} />
              ))}
              <TouchableOpacity onPress={pickThreadImages} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 28, color: '#8b5cf6' }}>+</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={closeCreateThreadModal} style={{ marginRight: 16 }} disabled={creatingThread}>
                <Text style={{ color: '#6b7280', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateThread} disabled={creatingThread} style={{ backgroundColor: '#8b5cf6', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{creatingThread ? 'Posting...' : 'Post'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 32,
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
  messageButton: {
    padding: 10,
  },
  messageButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  storiesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  storiesList: {
    marginBottom: 10,
  },
  storiesContent: {
    paddingHorizontal: 5, // Add some horizontal padding to the content container
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 70,
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 3,
    borderColor: '#fff',
    position: 'relative',
  },
  storyRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    backgroundColor: 'transparent',
  },
  storyAvatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  storyAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  storyUsername: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  createThreadButton: {
    backgroundColor: '#8b5cf6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createThreadContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createThreadIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  createThreadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  threadsSection: {
    marginBottom: 20,
  },
  threadCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  threadTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#8b5cf6',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  threadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  threadContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 10,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 5,
  },
  threadImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    flex: 1,
  },
  moreImagesOverlay: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  threadActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  likedAction: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullWidthImageList: {
    width: '100%',
    height: 300,
    marginBottom: 10,
  },
  fullWidthImage: {
    width: 400,
    height: 300,
    borderRadius: 12,
    marginRight: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: 400,
    height: 400,
    marginHorizontal: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 30,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 20,
  },
  modalCloseText: {
    color: '#8b5cf6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  commentModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
    maxHeight: '70%',
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#8b5cf6',
  },
  commentList: {
    marginBottom: 10,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    marginRight: 10,
  },
  commentContentBox: {
    flex: 1,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: 14,
  },
  commentText: {
    color: '#374151',
    fontSize: 14,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 10,
  },
  commentSendButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentSendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentModalClose: {
    alignSelf: 'center',
    marginTop: 10,
  },
  commentModalCloseText: {
    color: '#8b5cf6',
    fontWeight: 'bold',
    fontSize: 16,
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
  headerMessageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueTickBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1DA1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  blueTickCheck: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  artistTypeBadge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
    alignSelf: 'center',
  },
  artistTypeBadgeText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
  },
  // Menu Bar Styles
  menuBarContainer: {
    position: 'absolute',
    right: 20,
    // top: '35%',
    bottom: 120,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  menuBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    backdropFilter: 'blur(10px)',
  },
  menuItem: {
    marginBottom: 10,
  },
  menuButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(139, 92, 246, 0.8)',
    textAlign: 'center',
  },
  menuToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  premiumBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
}); 