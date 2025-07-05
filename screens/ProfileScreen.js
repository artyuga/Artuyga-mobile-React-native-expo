import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { supabase } from '../supabase';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ProfileScreen(props) {
  const navigation = props.navigation || useNavigation();
  const route = props.route || useRoute();
  const routeUserId = route?.params?.userId;
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gallery');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userThreads, setUserThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [deletingThread, setDeletingThread] = useState(null);
  const [deletingPainting, setDeletingPainting] = useState(null);

  const [userId, setUserId] = useState(routeUserId);

  useEffect(() => {
    getCurrentUser();
  }, []);

  // Add useEffect to refetch profile and paintings when userId changes
  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
      fetchPaintings(userId);
      fetchFollowStats(userId);
      fetchUserThreads(userId);
      if (user?.id && userId !== user.id) {
        checkFollowStatus(userId);
      }
    }
  }, [userId, user]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    // If no routeUserId, show current user's profile
    if (!routeUserId) {
      setUserId(user?.id);
    }
  };

  const fetchProfile = async (targetUserId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchFollowStats = async (targetUserId) => {
    try {
      // Get followers count
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);
      
      // Get following count
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);
      
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  const checkFollowStatus = async (targetUserId) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return;
      }
      
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to follow users');
      return;
    }

    if (user.id === userId) {
      Alert.alert('Error', 'You cannot follow yourself');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
        
        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchPaintings = async (targetUserId) => {
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
        .eq('artist_id', targetUserId)
        .order('created_at', { ascending: false });

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

  const fetchUserThreads = async (targetUserId) => {
    setThreadsLoading(true);
    try {
      const { data: threadsData, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserThreads(threadsData || []);
    } catch (error) {
      setUserThreads([]);
    } finally {
      setThreadsLoading(false);
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
      fetchPaintings(userId);
    } catch (error) {
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

  const handleMessagePress = () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to send messages');
      return;
    }
    
    if (user.id === userId) {
      Alert.alert('Error', 'You cannot message yourself');
      return;
    }

    navigation.navigate('Chat', { 
      otherUser: profile,
      conversationId: null
    });
  };

  const handleDeleteThread = async (threadId) => {
    Alert.alert(
      'Delete Thread',
      'Are you sure you want to delete this thread? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingThread(threadId);
            try {
              // Delete related comments first
              const { error: commentsError } = await supabase
                .from('post_comments')
                .delete()
                .eq('post_id', threadId);

              if (commentsError) throw commentsError;

              // Delete related likes
              const { error: likesError } = await supabase
                .from('post_likes')
                .delete()
                .eq('post_id', threadId);

              if (likesError) throw likesError;

              // Delete the thread
              const { error } = await supabase
                .from('community_posts')
                .delete()
                .eq('id', threadId)
                .eq('author_id', user.id);

              if (error) throw error;

              // Remove from local state
              setUserThreads(prev => prev.filter(thread => thread.id !== threadId));
              Alert.alert('Success', 'Thread deleted successfully');
            } catch (error) {
              console.error('Error deleting thread:', error);
              Alert.alert('Error', 'Failed to delete thread');
            } finally {
              setDeletingThread(null);
            }
          }
        }
      ]
    );
  };

  const handleDeletePainting = async (paintingId) => {
    Alert.alert(
      'Delete Artwork',
      'Are you sure you want to delete this artwork? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingPainting(paintingId);
            try {
              // Delete related painting images first
              const { error: imagesError } = await supabase
                .from('painting_images')
                .delete()
                .eq('painting_id', paintingId);

              if (imagesError) throw imagesError;

              // Delete related likes
              const { error: likesError } = await supabase
                .from('painting_likes')
                .delete()
                .eq('painting_id', paintingId);

              if (likesError) throw likesError;

              // Delete the painting
              const { error } = await supabase
                .from('paintings')
                .delete()
                .eq('id', paintingId)
                .eq('artist_id', user.id);

              if (error) throw error;

              // Remove from local state
              setPaintings(prev => prev.filter(painting => painting.id !== paintingId));
              Alert.alert('Success', 'Artwork deleted successfully');
            } catch (error) {
              console.error('Error deleting painting:', error);
              Alert.alert('Error', 'Failed to delete artwork');
            } finally {
              setDeletingPainting(null);
            }
          }
        }
      ]
    );
  };

  const renderPainting = ({ item }) => (
    <View style={styles.paintingItem}>
      <TouchableOpacity
        style={styles.paintingTouchable}
        onPress={() => handlePaintingPress(item.id)}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.paintingImage}
          resizeMode="cover"
        />
        <View style={styles.paintingOverlay}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLikePainting(item.id)}
          >
            <Text style={[styles.likeIcon, item.is_liked && styles.likedIcon]}>
              {item.is_liked ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.likesCount}>{item.likes_count}</Text>
        </View>
      </TouchableOpacity>
      
      {/* Delete button for own paintings */}
      {isOwnProfile && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePainting(item.id)}
          disabled={deletingPainting === item.id}
        >
          {deletingPainting === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>🗑️</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderThreadCard = ({ item }) => (
    <View style={styles.threadCard}>
      <View style={styles.threadHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            {profile.profile_picture_url ? (
              <Image source={{ uri: profile.profile_picture_url }} style={styles.userAvatarImage} />
            ) : (
              <Text style={styles.userAvatarText}>{profile.display_name?.[0] || profile.username?.[0] || '?'}</Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{profile.display_name || profile.username}</Text>
            <Text style={styles.threadTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          {profile.is_verified && <BlueTickBadge />}
        </View>
        
        {/* Delete button for own threads */}
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.threadDeleteButton}
            onPress={() => handleDeleteThread(item.id)}
            disabled={deletingThread === item.id}
          >
            {deletingThread === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.deleteButtonText}>🗑️</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      {item.title && <Text style={styles.threadTitle}>{item.title}</Text>}
      {item.content && <Text style={styles.threadContent}>{item.content}</Text>}
      {Array.isArray(item.images) && item.images.length > 0 && (
        <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
          {item.images.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.threadImage} />
          ))}
        </ScrollView>
      )}
      {/* Like/Comment/Share actions can be added here if desired */}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'gallery':
        return (
          <View style={styles.tabContent}>
            {paintings.length > 0 ? (
              <FlatList
                data={paintings}
                renderItem={renderPainting}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.paintingsRow}
                scrollEnabled={false}
                key={'gallery'}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No artwork yet</Text>
                <Text style={styles.emptyStateSubtext}>Start creating to see your gallery here</Text>
              </View>
            )}
          </View>
        );
      case 'threads':
        return (
          <View style={styles.tabContent}>
            {threadsLoading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : userThreads.length > 0 ? (
              <FlatList
                data={userThreads}
                renderItem={renderThreadCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                key={'threads'}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No threads yet</Text>
                <Text style={styles.emptyStateSubtext}>Start a conversation to see your threads here</Text>
              </View>
            )}
          </View>
        );
      case 'about':
        return (
          <View style={styles.tabContent}>
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>About</Text>
              {profile?.bio ? (
                <Text style={styles.bioText}>{profile.bio}</Text>
              ) : (
                <Text style={styles.noBioText}>No bio added yet</Text>
              )}
              
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowersList', { userId: profile.id, type: 'followers' })}>
                  <Text style={styles.statNumber}>{followersCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowersList', { userId: profile.id, type: 'following' })}>
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{paintings.length}</Text>
                  <Text style={styles.statLabel}>Artworks</Text>
                </View>
              </View>

              {/* Profile details */}
              {profile?.artist_type && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Artist Type:</Text>
                  <Text style={styles.detailValue}>{profile.artist_type}</Text>
                </View>
              )}
              
              {profile?.location && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{profile.location}</Text>
                </View>
              )}

              {profile?.website && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Website:</Text>
                  <Text style={styles.detailValue}>{profile.website}</Text>
                </View>
              )}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.centerText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  const BlueTickBadge = () => (
    <View style={styles.blueTickBadge}>
      <Text style={styles.blueTickCheck}>✓</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              {profile.profile_picture_url ? (
                <Image 
                  source={{ uri: profile.profile_picture_url }} 
                  style={styles.profileAvatarImage}
                />
              ) : (
                <Text style={styles.profileAvatarText}>
                  {profile.display_name?.[0] || profile.username?.[0] || '?'}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>
                  {profile.display_name || profile.username}
                </Text>
                {profile.is_verified && <BlueTickBadge />}
              </View>
              <Text style={styles.profileUsername}>@{profile.username}</Text>
              {profile.role && (
                <Text style={styles.profileRole}>
                  {profile.role === 'artist' ? 'Artist' : 'Explorer'}
                </Text>
              )}
              {profile.artist_type && (
                <Text style={styles.artistType}>{profile.artist_type}</Text>
              )}
            </View>
          </View>

          {profile.bio && (
            <Text style={styles.profileBio}>{profile.bio}</Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  <Text style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText
                  ]}>
                    {followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={handleMessagePress}
                >
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'gallery' && styles.activeTab]}
            onPress={() => setActiveTab('gallery')}
          >
            <Text style={[styles.tabText, activeTab === 'gallery' && styles.activeTabText]}>
              Gallery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'threads' && styles.activeTab]}
            onPress={() => setActiveTab('threads')}
          >
            <Text style={[styles.tabText, activeTab === 'threads' && styles.activeTabText]}>
              Threads
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Sign Out Button (only for own profile) */}
        {/* {isOwnProfile && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )} */}
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
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 20,
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
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  verifiedBadge: {
    fontSize: 16,
    color: '#8b5cf6',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  profileUsername: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
    marginBottom: 2,
  },
  artistType: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  profileBio: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#374151',
  },
  messageButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paintingsRow: {
    justifyContent: 'space-between',
  },
  paintingItem: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  paintingImage: {
    width: '100%',
    height: '100%',
  },
  paintingOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  likeButton: {
    marginRight: 4,
  },
  likeIcon: {
    fontSize: 16,
  },
  likedIcon: {
    color: '#ef4444',
  },
  likesCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  comingSoon: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    padding: 40,
  },
  aboutSection: {
    padding: 20,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  bioText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  noBioText: {
    fontSize: 16,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    width: 100,
  },
  detailValue: {
    fontSize: 16,
    color: '#6b7280',
    flex: 1,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  blueTickBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1DA1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  blueTickCheck: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  threadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  threadTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  threadTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  threadContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 10,
  },
  imagesContainer: {
    height: 100,
    marginBottom: 10,
  },
  threadImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  paintingTouchable: {
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  threadDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 