import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUserAndNotifications = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      
      // Fetch notifications with all related data
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          from_user:from_user_id (
            id,
            username,
            display_name,
            profile_picture_url
          ),
          painting:painting_id (
            id,
            title,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      }

      if (isMounted) {
        setNotifications(data || []);
        setLoading(false);
      }
    };
    fetchUserAndNotifications();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Subscribe to realtime changes for this user's notifications
    const channel = supabase.channel('notifications-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch the new notification with related data
          const { data: newNotification } = await supabase
            .from('notifications')
            .select(`
              *,
              from_user:from_user_id (
                id,
                username,
                display_name,
                profile_picture_url
              ),
              painting:painting_id (
                id,
                title,
                image_url
              )
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (newNotification) {
            setNotifications(prev => [newNotification, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n));
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();
    subscriptionRef.current = channel;
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId]);

  const renderNotification = ({ item }) => {
    const notificationText = getNotificationText(item);
    
    return (
      <View style={[styles.notificationCard, !item.is_read && styles.unreadCard]}> 
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <Ionicons 
            name={getIconForType(item.type)} 
            size={20} 
            color={item.is_read ? '#8b5cf6' : '#7c3aed'} 
            style={{ marginRight: 8, marginTop: 2 }} 
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.notificationTitle, !item.is_read && { color: '#7c3aed' }]}>
              {notificationText}
            </Text>
            <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  function getNotificationText(notification) {
    const fromUserName = notification.from_user?.display_name || notification.from_user?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${fromUserName} liked your post`;
      case 'comment':
        return `${fromUserName} commented on your post`;
      case 'follow':
        return `${fromUserName} started following you`;
      case 'artwork_like':
        const artworkTitle = notification.painting?.title || 'your artwork';
        return `${fromUserName} liked ${artworkTitle}`;
      case 'message':
        return `${fromUserName} sent you a message`;
      case 'post_like':
        return `${fromUserName} liked your post`;
      case 'post_comment':
        return `${fromUserName} commented on your post`;
      default:
        return notification.message || 'You have a new notification';
    }
  }

  function getIconForType(type) {
    switch (type) {
      case 'like':
      case 'post_like':
      case 'artwork_like':
        return 'heart';
      case 'comment':
      case 'post_comment':
        return 'chatbubble-ellipses';
      case 'follow':
        return 'person-add';
      case 'message':
        return 'mail';
      default:
        return 'notifications';
    }
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
        </TouchableOpacity>
        <Ionicons name="notifications-outline" size={32} color="#8b5cf6" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>You'll see updates about likes, comments, follows, and more here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
    backgroundColor: '#ede9fe',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
  },
  notificationTime: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 4,
  },
}); 