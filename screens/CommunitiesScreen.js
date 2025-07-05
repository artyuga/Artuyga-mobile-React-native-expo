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
  Dimensions,
  StatusBar,
} from 'react-native';
import { supabase } from '../supabase';
import ClickableName from '../components/ClickableName';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function CommunitiesScreen({ navigation }) {
  const [communities, setCommunities] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-communities');
  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCommunities();
    }
  }, [user]);

  // Refresh communities when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchCommunities();
      }
    }, [user])
  );

  // Handle refresh parameter from navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = navigation.getState()?.routes?.find(route => route.name === 'Communities')?.params;
      if (params?.refresh && user) {
        fetchCommunities();
        // Clear the refresh parameter
        navigation.setParams({ refresh: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  // Helper functions to categorize communities
  const getMyCommunities = () => {
    return communities.filter(community => community.creator_id === user?.id);
  };

  const getJoinedCommunities = () => {
    return communities.filter(community => 
      community.is_member && community.creator_id !== user?.id
    );
  };

  const getDiscoverCommunities = () => {
    return communities.filter(community => 
      !community.is_member && community.creator_id !== user?.id
    );
  };

  const getPopularCommunities = () => {
    return communities
      .filter(community => !community.is_member)
      .sort((a, b) => b.member_count - a.member_count)
      .slice(0, 5);
  };

  const fetchCommunities = async () => {
    try {
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (communitiesError) {
        console.error('Error fetching communities:', communitiesError);
        setCommunities([]);
        setLoading(false);
        return;
      }

      if (!communitiesData || communitiesData.length === 0) {
        setCommunities([]);
        setLoading(false);
        return;
      }

      // Get creator profiles for the communities
      const creatorIds = [...new Set(communitiesData.map(community => community.creator_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url')
        .in('id', creatorIds);

      // For each community, get member count and check if user is a member
      const communitiesWithStats = await Promise.all(
        communitiesData.map(async (community) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', community.id);

          // Check if current user is a member
          let isMember = false;
          const { data: userMembership } = await supabase
            .from('community_members')
            .select('id')
            .eq('community_id', community.id)
            .eq('user_id', user.id)
            .maybeSingle();
          isMember = !!userMembership;

          return {
            ...community,
            profiles: profilesData?.find(profile => profile.id === community.creator_id),
            member_count: memberCount || 0,
            is_member: isMember,
          };
        })
      );

      setCommunities(communitiesWithStats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching communities:', error);
      setCommunities([]);
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to join communities');
      return;
    }

    try {
      await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member'
        });

      Alert.alert('Success', 'You have joined the community!');
      fetchCommunities(); // Refresh the list
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        Alert.alert('Already a member', 'You are already a member of this community');
      } else {
        Alert.alert('Error', 'Failed to join community');
      }
    }
  };

  const handleLeaveCommunity = async (communityId) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to leave communities');
      return;
    }

    try {
      await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      Alert.alert('Success', 'You have left the community');
      fetchCommunities(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', 'Failed to leave community');
    }
  };

  const renderCommunity = ({ item, isMyCommunity = false }) => (
    <TouchableOpacity 
      style={styles.communityCard}
      onPress={() => navigation.navigate('CommunityDetail', { communityId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.communityHeader}>
        <View style={styles.communityAvatar}>
          {item.cover_image_url ? (
            <Image 
              source={{ uri: item.cover_image_url }} 
              style={styles.communityAvatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.communityAvatarText}>
                {item.name?.[0]?.toUpperCase() || 'C'}
              </Text>
            </View>
          )}
          {isMyCommunity && (
            <View style={styles.ownerBadge}>
              <Ionicons name="crown" size={12} color="#FFD700" />
            </View>
          )}
        </View>
        <View style={styles.communityInfo}>
          <Text style={styles.communityName} numberOfLines={1}>
            {item.name}
          </Text>
          <ClickableName
            name={item.profiles?.display_name || item.profiles?.username}
            userId={item.profiles?.id}
            navigation={navigation}
            showPrefix={true}
            textStyle={styles.communityCreator}
          />
          <View style={styles.communityStats}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={14} color="#8b5cf6" />
              <Text style={styles.statText}>
                {item.member_count} member{item.member_count !== 1 ? 's' : ''}
              </Text>
            </View>
            {item.is_member && (
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.statText}>Joined</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {item.description && (
        <Text style={styles.communityDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.communityActions}>
        {!isMyCommunity && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.is_member ? styles.leaveButton : styles.joinButton
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (item.is_member) {
                Alert.alert(
                  'Leave Community',
                  `Are you sure you want to leave "${item.name}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Leave', style: 'destructive', onPress: () => handleLeaveCommunity(item.id) }
                  ]
                );
              } else {
                handleJoinCommunity(item.id);
              }
            }}
          >
            <Ionicons 
              name={item.is_member ? "exit-outline" : "add"} 
              size={16} 
              color={item.is_member ? "#fff" : "#8b5cf6"} 
            />
            <Text style={[
              styles.actionButtonText,
              item.is_member ? styles.leaveButtonText : styles.joinButtonText
            ]}>
              {item.is_member ? 'Leave' : 'Join'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.viewButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('CommunityDetail', { communityId: item.id });
          }}
        >
          <Ionicons name="eye" size={16} color="#fff" />
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'my-communities':
        const myCommunities = getMyCommunities();
        return (
          <View style={styles.tabContent}>
            {myCommunities.length > 0 ? (
              <FlatList
                data={myCommunities}
                renderItem={({ item }) => renderCommunity({ item, isMyCommunity: true })}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-circle-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No Communities Created</Text>
                <Text style={styles.emptyStateText}>You haven't created any communities yet</Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CreateCommunity')}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Create Community</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'joined':
        const joinedCommunities = getJoinedCommunities();
        return (
          <View style={styles.tabContent}>
            {joinedCommunities.length > 0 ? (
              <FlatList
                data={joinedCommunities}
                renderItem={({ item }) => renderCommunity({ item })}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No Joined Communities</Text>
                <Text style={styles.emptyStateText}>Join communities to connect with other artists</Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => setActiveTab('discover')}
                >
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Discover Communities</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'discover':
        const discoverCommunities = getDiscoverCommunities();
        return (
          <View style={styles.tabContent}>
            {discoverCommunities.length > 0 ? (
              <FlatList
                data={discoverCommunities}
                renderItem={({ item }) => renderCommunity({ item })}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="globe-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No Communities Available</Text>
                <Text style={styles.emptyStateText}>Be the first to create a community</Text>
              </View>
            )}
          </View>
        );

      case 'popular':
        const popularCommunities = getPopularCommunities();
        return (
          <View style={styles.tabContent}>
            {popularCommunities.length > 0 ? (
              <FlatList
                data={popularCommunities}
                renderItem={({ item }) => renderCommunity({ item })}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trending-up-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No Popular Communities</Text>
                <Text style={styles.emptyStateText}>Communities will appear here as they grow</Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading communities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Communities</Text>
          <Text style={styles.subtitle}>Connect with fellow artists</Text>
        </View>
        <TouchableOpacity 
          style={styles.createButtonHeader}
          onPress={() => navigation.navigate('CreateCommunity')}
        >
          <Ionicons name="add" size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my-communities' && styles.activeTab]}
            onPress={() => setActiveTab('my-communities')}
          >
            <Ionicons 
              name="crown" 
              size={16} 
              color={activeTab === 'my-communities' ? '#8b5cf6' : '#6b7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'my-communities' && styles.activeTabText]}>
              My Communities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'joined' && styles.activeTab]}
            onPress={() => setActiveTab('joined')}
          >
            <Ionicons 
              name="people" 
              size={16} 
              color={activeTab === 'joined' ? '#8b5cf6' : '#6b7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'joined' && styles.activeTabText]}>
              Joined
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
            onPress={() => setActiveTab('discover')}
          >
            <Ionicons 
              name="globe" 
              size={16} 
              color={activeTab === 'discover' ? '#8b5cf6' : '#6b7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
              Discover
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'popular' && styles.activeTab]}
            onPress={() => setActiveTab('popular')}
          >
            <Ionicons 
              name="trending-up" 
              size={16} 
              color={activeTab === 'popular' ? '#8b5cf6' : '#6b7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'popular' && styles.activeTabText]}>
              Popular
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentScrollContent}
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  createButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tabScrollContent: {
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
  activeTab: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  contentScrollContent: {
    padding: 20,
  },
  tabContent: {
    flex: 1,
  },
  createButton: {
    backgroundColor: '#8b5cf6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  communityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  communityHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  communityAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  communityAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  ownerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  communityCreator: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  communityDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  communityActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  joinButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  leaveButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinButtonText: {
    color: '#8b5cf6',
  },
  leaveButtonText: {
    color: '#fff',
  },
  viewButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
}); 