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
import ClickableName from '../components/ClickableName';

export default function MessagesScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    getCurrentUser();
    return () => {
      // Cleanup subscription on unmount
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      setupRealtimeSubscription();
    }
  }, [user]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchConversations = async () => {
    try {
      
      // First, get all conversations where the user is a participant
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (conversationsError) {
        setConversations([]);
        setLoading(false);
        return;
      }

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get all participant IDs
      const participantIds = [];
      conversationsData.forEach(conv => {
        if (conv.participant1_id !== user.id) participantIds.push(conv.participant1_id);
        if (conv.participant2_id !== user.id) participantIds.push(conv.participant2_id);
      });

      // Get all participant profiles in one query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url')
        .in('id', participantIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Get all messages for these conversations
      const conversationIds = conversationsData.map(conv => conv.id);
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      // Process the data to get the format we need
      const conversationsWithDetails = conversationsData.map((conversation) => {
        // Find the other participant (not the current user)
        const otherParticipantId = conversation.participant1_id === user.id 
          ? conversation.participant2_id 
          : conversation.participant1_id;

        const otherParticipant = profilesData?.find(profile => profile.id === otherParticipantId);

        // Get messages for this conversation
        const conversationMessages = messagesData?.filter(msg => msg.conversation_id === conversation.id) || [];
        
        // Get the last message
        const lastMessage = conversationMessages.length > 0 
          ? conversationMessages[0] // Already sorted by created_at desc
          : null;

        // Calculate unread count
        const unreadCount = conversationMessages.filter(msg => 
          msg.sender_id !== user.id && !msg.is_read
        ).length;

        return {
          id: conversation.id,
          other_user: otherParticipant,
          last_message: lastMessage,
          unread_count: unreadCount,
          updated_at: conversation.updated_at,
        };
      });

      setConversations(conversationsWithDetails);
      setLoading(false);
    } catch (error) {
      setConversations([]);
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Cleanup existing subscription
    if (subscription) {
      subscription.unsubscribe();
    }

    // Setup real-time subscription for new messages
    const newSubscription = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Update conversations when new message is received
          setConversations(prev => {
            const conversationId = payload.new.conversation_id;
            const existingConversation = prev.find(conv => conv.id === conversationId);
            
            if (!existingConversation) return prev;

            // Update the conversation with new message
            const updatedConversation = {
              ...existingConversation,
              last_message: payload.new,
              unread_count: payload.new.sender_id !== user?.id 
                ? existingConversation.unread_count + 1 
                : existingConversation.unread_count,
              updated_at: new Date().toISOString()
            };

            // Move updated conversation to top
            const otherConversations = prev.filter(conv => conv.id !== conversationId);
            return [updatedConversation, ...otherConversations];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Update read status
          if (payload.new.is_read && payload.old.is_read !== payload.new.is_read) {
            setConversations(prev => 
              prev.map(conv => {
                if (conv.id === payload.new.conversation_id) {
                  return {
                    ...conv,
                    unread_count: Math.max(0, conv.unread_count - 1)
                  };
                }
                return conv;
              })
            );
          }
        }
      )
      .subscribe();

    setSubscription(newSubscription);
  };

  const startNewConversation = async (otherUserId) => {
    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_participants!inner (
            user_id
          )
        `)
        .eq('conversation_participants.user_id', user.id);

      const existingConv = existingConversation?.find(conv => 
        conv.conversation_participants.some(p => p.user_id === otherUserId)
      );

      if (existingConv) {
        navigation.navigate('Chat', { 
          conversationId: existingConv.id,
          otherUser: null
        });
        return;
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          created_by: user.id,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: otherUserId }
        ]);

      navigation.navigate('Chat', { 
        conversationId: newConversation.id,
        otherUser: null
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('Chat', { 
      conversationId: conversation.id,
      otherUser: conversation.other_user
    });
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
    >
      <View style={styles.conversationAvatar}>
        {item.other_user?.profile_picture_url ? (
          <Image 
            source={{ uri: item.other_user.profile_picture_url }} 
            style={styles.conversationAvatarImage}
          />
        ) : (
          <Text style={styles.conversationAvatarText}>
            {item.other_user?.display_name?.[0] || item.other_user?.username?.[0] || '?'}
          </Text>
        )}
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </View>

              <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <ClickableName
              name={item.other_user?.display_name || item.other_user?.username}
              userId={item.other_user?.id}
              navigation={navigation}
              textStyle={styles.conversationName}
            />
          <Text style={styles.conversationTime}>
            {item.last_message ? formatTime(item.last_message.created_at) : ''}
          </Text>
        </View>
        <Text style={[
          styles.lastMessage,
          item.unread_count > 0 && styles.unreadMessage
        ]} numberOfLines={1}>
          {item.last_message ? item.last_message.content : 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const createTestConversation = async () => {
    try {
      
      // First, check if there are any other users
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .neq('id', user.id);

      if (usersError) {
        Alert.alert('Error', 'Failed to fetch users');
        return;
      }

      if (!allUsers || allUsers.length === 0) {
        Alert.alert('Error', 'No other users found to create conversation with');
        return;
      }

      const otherUserId = allUsers[0].id;

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: otherUserId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) {
        Alert.alert('Error', `Failed to create conversation: ${convError.message}`);
        return;
      }

      // Add a test message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: 'Hello! This is a test message.',
          is_read: false
        })
        .select()
        .single();

      if (messageError) {
        Alert.alert('Warning', `Conversation created but message failed: ${messageError.message}`);
      } else {
      }

      Alert.alert('Success', 'Test conversation created!');
      
      // Refresh conversations
      fetchConversations();
    } catch (error) {
      Alert.alert('Error', `Failed to create test conversation: ${error.message}`);
    }
  };

  const checkDatabase = async () => {
    try {
      
      // Check total users
      const { data: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });

      // Check total conversations
      const { data: totalConversations, error: convError } = await supabase
        .from('conversations')
        .select('id', { count: 'exact' });

      // Check conversations for current user
      const { data: userConversations, error: userConvError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

      // Check total messages
      const { data: totalMessages, error: messagesError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' });

      let debugInfo = `Database Check:\n`;
      debugInfo += `Total Users: ${totalUsers?.length || 0}\n`;
      debugInfo += `Total Conversations: ${totalConversations?.length || 0}\n`;
      debugInfo += `Your Conversations: ${userConversations?.length || 0}\n`;
      debugInfo += `Total Messages: ${totalMessages?.length || 0}\n`;

      if (usersError) debugInfo += `\nUsers Error: ${usersError.message}\n`;
      if (convError) debugInfo += `\nConversations Error: ${convError.message}\n`;
      if (userConvError) debugInfo += `\nUser Conversations Error: ${userConvError.message}\n`;
      if (messagesError) debugInfo += `\nMessages Error: ${messagesError.message}\n`;

      Alert.alert('Database Check', debugInfo);
    } catch (error) {
      Alert.alert('Error', `Failed to check database: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.centerText}>Please sign in to view messages</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Connect with artists</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* New Message Button */}
        <TouchableOpacity
          style={styles.newMessageButton}
          onPress={() => {
            // For now, navigate to Explore to find users to message
            navigation.navigate('Explore');
          }}
        >
          <Text style={styles.newMessageButtonText}>✉️ Find People to Message</Text>
        </TouchableOpacity>

        {/* Conversations List */}
        <View style={styles.conversationsSection}>
          <Text style={styles.sectionTitle}>Recent Conversations</Text>
          {conversations.length > 0 ? (
            <FlatList
              data={conversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No conversations yet</Text>
              <Text style={styles.emptyStateSubtext}>Start a conversation with other artists</Text>
              <TouchableOpacity
                style={styles.createConversationButton}
                onPress={() => {
                  // Create a test conversation
                  createTestConversation();
                }}
              >
                <Text style={styles.createConversationButtonText}>Create Test Conversation</Text>
              </TouchableOpacity>
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
    paddingBottom: 30,
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
  newMessageButton: {
    backgroundColor: '#8b5cf6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  newMessageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  conversationsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#1f2937',
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  conversationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  conversationAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  conversationAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  conversationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#1f2937',
    fontWeight: '500',
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
  debugSection: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  createConversationButton: {
    backgroundColor: '#10b981',
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  createConversationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 