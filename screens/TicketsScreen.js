import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

export default function TicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchTickets(user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchTickets = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch tickets with event details
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          events (
            id,
            title,
            description,
            event_date,
            location,
            event_type,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        Alert.alert('Error', 'Failed to load tickets');
        setTickets([]);
        return;
      }

      setTickets(ticketsData || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      Alert.alert('Error', 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType?.toLowerCase()) {
      case 'workshop':
        return 'school';
      case 'concert':
        return 'musical-notes';
      case 'exhibition':
        return 'images';
      case 'meetup':
        return 'people';
      default:
        return 'calendar';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '#10b981';
      case 'used':
        return '#6b7280';
      case 'expired':
        return '#ef4444';
      default:
        return '#8b5cf6';
    }
  };

  const renderTicket = ({ item }) => {
    const event = item.events;
    const statusColor = getStatusColor(item.status);
    
    return (
      <View style={styles.ticketCard}>
        {/* Ticket Header */}
        <View style={styles.ticketHeader}>
          <View style={styles.eventInfo}>
            <Ionicons 
              name={getEventTypeIcon(event?.event_type)} 
              size={24} 
              color="#8b5cf6" 
            />
            <View style={styles.eventDetails}>
              <Text style={styles.eventTitle}>{event?.title || 'Event Title'}</Text>
              <Text style={styles.eventType}>{event?.event_type || 'Event'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status || 'Active'}</Text>
          </View>
        </View>

        {/* Ticket Content */}
        <View style={styles.ticketContent}>
          <View style={styles.ticketRow}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.ticketText}>
              {formatDate(event?.event_date)}
            </Text>
          </View>
          
          {event?.location && (
            <View style={styles.ticketRow}>
              <Ionicons name="location" size={16} color="#6b7280" />
              <Text style={styles.ticketText}>{event.location}</Text>
            </View>
          )}

          <View style={styles.ticketRow}>
            <Ionicons name="ticket" size={16} color="#6b7280" />
            <Text style={styles.ticketText}>Ticket #{item.ticket_number}</Text>
          </View>

          {item.price && (
            <View style={styles.ticketRow}>
              <Ionicons name="card" size={16} color="#6b7280" />
              <Text style={styles.ticketText}>₹{item.price}</Text>
            </View>
          )}
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={48} color="#8b5cf6" />
            <Text style={styles.qrText}>QR Code</Text>
          </View>
        </View>

        {/* Ticket Footer */}
        <View style={styles.ticketFooter}>
          <Text style={styles.footerText}>
            Show this ticket at the event entrance
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading your tickets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No tickets yet</Text>
          <Text style={styles.emptySubtitle}>
            Your event tickets will appear here once you participate in events
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Communities')}
          >
            <Text style={styles.exploreButtonText}>Explore Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ticketsList}
          showsVerticalScrollIndicator={false}
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 44,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  exploreButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ticketsList: {
    padding: 20,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventDetails: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ticketContent: {
    padding: 20,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  qrSection: {
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  qrPlaceholder: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  qrText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  ticketFooter: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 