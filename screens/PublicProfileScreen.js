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
  Animated,
  Dimensions,
} from 'react-native';
import { supabase } from '../supabase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PublicProfileScreen(props) {
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const [userId, setUserId] = useState(routeUserId);

  useEffect(() => {
    getCurrentUser();
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaintings = async (targetUserId) => {
    try {
      const { data: paintingsData, error } = await supabase
        .from('paintings')
        .select('*')
        .eq('artist_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaintings(paintingsData || []);
    } catch (error) {
      console.error('Error fetching paintings:', error);
      setPaintings([]);
    }
  };

  const fetchFollowStats = async (targetUserId) => {
    try {
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

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
        .maybeSingle();

      if (error) throw error;
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

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profile.id
          });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessagePress = () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to send messages');
      return;
    }
    navigation.navigate('Chat', { 
      conversationId: null,
      otherUser: profile
    });
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

  const handlePaintingPress = (paintingId) => {
    navigation.navigate('PaintingDetail', { paintingId });
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
      </TouchableOpacity>
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
        </View>
      </View>
      {item.title && <Text style={styles.threadTitle}>{item.title}</Text>}
      {item.content && <Text style={styles.threadContent}>{item.content}</Text>}
      {/* Show thread images if any */}
      {item.images && item.images.length > 0 && (
        <FlatList
          data={item.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(img, idx) => idx.toString()}
          renderItem={({ item: img }) => (
            <View style={{ marginRight: 8 }}>
              <Image
                source={{ uri: img }}
                style={{ width: 180, height: 180, borderRadius: 12, backgroundColor: '#eee' }}
                resizeMode="cover"
              />
            </View>
          )}
          style={{ marginTop: 8, marginBottom: 8 }}
        />
      )}
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
                <Text style={styles.emptyStateSubtext}>This artist hasn't shared any artwork yet</Text>
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
                <Text style={styles.emptyStateSubtext}>This artist hasn't shared any threads yet</Text>
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
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

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => Alert.alert('Share', 'Share profile feature coming soon!')}
        >
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                {profile.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓</Text>
                  </View>
                )}
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

          <View style={styles.actionButtons}>
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
          </View>
        </View>

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

        {renderTabContent()}
      </ScrollView>
    </Animated.View>
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
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  followButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
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
    paddingVertical: 12,
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
    width: (width - 60) / 2,
    marginBottom: 15,
  },
  paintingTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  paintingImage: {
    width: '100%',
    height: 150,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  threadContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 10,
  },
  verifiedBadge: {
    marginLeft: 8,
    backgroundColor: '#1DA1F2',
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    lineHeight: 16,
  },
}); 