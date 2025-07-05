import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../supabase';
import messageCache from '../utils/messageCache';
import performanceMonitor from '../utils/performanceMonitor';

export default function ChatScreen({ navigation, route }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const scrollViewRef = useRef();
  const flatListRef = useRef();

  const { otherUser: routeOtherUser, conversationId: routeConversationId } = route.params;

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
      if (routeConversationId) {
        setConversationId(routeConversationId);
        fetchMessages(routeConversationId);
        fetchOtherUserFromConversation(routeConversationId);
        setupRealtimeSubscription(routeConversationId);
      } else if (routeOtherUser) {
        setOtherUser(routeOtherUser);
        createOrGetConversation(routeOtherUser.id);
      }
    }
  }, [user, routeConversationId, routeOtherUser]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchOtherUserFromConversation = async (convId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', convId)
        .single();

      if (error) throw error;

      const otherUserId = data.participant1_id === user.id 
        ? data.participant2_id 
        : data.participant1_id;

      const { data: otherUserData } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url')
        .eq('id', otherUserId)
        .single();

      setOtherUser(otherUserData);
    } catch (error) {
      console.error('Error fetching other user:', error);
    }
  };

  const createOrGetConversation = async (otherUserId) => {
    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
        .single();

      if (existingConversation) {
        setConversationId(existingConversation.id);
        fetchMessages(existingConversation.id);
        setupRealtimeSubscription(existingConversation.id);
      } else {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: otherUserId
          })
          .select()
          .single();

        if (error) throw error;
        setConversationId(newConversation.id);
        setupRealtimeSubscription(newConversation.id);
      }
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const setupRealtimeSubscription = (convId) => {
    // Cleanup existing subscription
    if (subscription) {
      subscription.unsubscribe();
    }

    // Setup real-time subscription for new messages
    const newSubscription = supabase
      .channel(`messages:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          // Add new message to the list and cache
          const newMessage = payload.new;
          setMessages(prev => [...prev, newMessage]);
          messageCache.addMessage(convId, newMessage);
          
          // Mark message as read if it's from other user
          if (newMessage.sender_id !== user?.id) {
            markMessageAsRead(newMessage.id);
          }
          
          // Scroll to bottom for new messages
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    setSubscription(newSubscription);
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const fetchMessages = async (convId) => {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedMessages = messageCache.getMessages(convId);
      if (cachedMessages.length > 0) {
        performanceMonitor.trackCacheHit();
        setMessages(cachedMessages);
        setLoading(false);
        
        // Mark messages as read in background
        markMessagesAsRead(cachedMessages);
      } else {
        performanceMonitor.trackCacheMiss();
      }

      // Fetch fresh data from server
      const apiStartTime = Date.now();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      performanceMonitor.trackApiResponseTime('fetchMessages', apiStartTime, Date.now(), !error);

      if (error) throw error;
      
      const freshMessages = data || [];
      setMessages(freshMessages);
      setLoading(false);

      // Update cache
      messageCache.setMessages(convId, freshMessages);

      // Mark messages as read
      markMessagesAsRead(freshMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    } finally {
      performanceMonitor.trackApiResponseTime('fetchMessages', startTime, Date.now(), false);
    }
  };

  const markMessagesAsRead = async (messages) => {
    if (!messages || messages.length === 0) return;
    
    const unreadMessages = messages.filter(msg => 
      msg.sender_id !== user?.id && !msg.is_read
    );
    
    if (unreadMessages.length > 0) {
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(msg => msg.id));
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || sending) return;

    const startTime = Date.now();
    const messageContent = newMessage.trim();
    const tempId = `temp_${Date.now()}`;
    
    // Optimistic update - add message immediately
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
      is_optimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setSending(true);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const apiStartTime = Date.now();
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent
        })
        .select()
        .single();

      performanceMonitor.trackApiResponseTime('sendMessage', apiStartTime, Date.now(), !error);

      if (error) throw error;

      // Replace optimistic message with real message
      const realMessage = { ...data, is_optimistic: false };
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? realMessage : msg
        )
      );

      // Update cache
      messageCache.updateMessage(conversationId, tempId, realMessage);

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      performanceMonitor.trackMessageLatency(startTime, Date.now(), true);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      messageCache.removeMessage(conversationId, tempId);
      
      // Restore message text
      setNewMessage(messageContent);
      
      performanceMonitor.trackMessageLatency(startTime, Date.now(), false);
      
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = useCallback(({ item }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
          item.is_optimistic && styles.optimisticBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {new Date(item.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            {isOwnMessage && (
              <Text style={styles.messageStatus}>
                {item.is_optimistic ? '⏳' : (item.is_read ? '✓✓' : '✓')}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }, [user?.id]);

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback((data, index) => ({
    length: 80, // Approximate height of message
    offset: 80 * index,
    index,
  }), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {otherUser?.display_name || otherUser?.username || 'User'}
          </Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => Alert.alert('Coming Soon', 'More options will be available soon!')}
        >
          <Text style={styles.moreButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[
              styles.sendButtonText,
              (!newMessage.trim() || sending) && styles.sendButtonTextDisabled
            ]}>
              Send
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerStatus: {
    color: '#e0e7ff',
    fontSize: 14,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageContainer: {
    marginBottom: 10,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#e0e7ff',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#9ca3af',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageStatus: {
    fontSize: 12,
    color: '#9ca3af',
  },
  optimisticBubble: {
    backgroundColor: '#e0e7ff', // Light blue for optimistic messages
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 4,
  },
}); 