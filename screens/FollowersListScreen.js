import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { supabase } from '../supabase';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function FollowersListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, type } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, [userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    let userIds = [];
    if (type === 'followers') {
      // Get all follower IDs
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);
      if (error) {
        setLoading(false);
        return;
      }
      userIds = data.map(f => f.follower_id);
    } else {
      // Get all following IDs
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      if (error) {
        setLoading(false);
        return;
      }
      userIds = data.map(f => f.following_id);
    }
    if (userIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, profile_picture_url')
      .in('id', userIds);
    setUsers(profiles || []);
    setLoading(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => navigation.navigate('Profile', { userId: item.id })}
    >
      <Image
        source={item.profile_picture_url ? { uri: item.profile_picture_url } : undefined}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.display_name || item.username}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type === 'followers' ? 'Followers' : 'Following'}</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No users found.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  username: {
    fontSize: 14,
    color: '#6b7280',
  },
}); 