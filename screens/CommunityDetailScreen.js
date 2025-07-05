import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput, Image, Dimensions, ScrollView } from 'react-native';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityDetailScreen({ route, navigation }) {
  const { communityId } = route.params;
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [participatingEventId, setParticipatingEventId] = useState(null);
  const [ticketModal, setTicketModal] = useState({ visible: false, event: null });

  useEffect(() => {
    fetchAll();
  }, [communityId]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    // Fetch community
    const { data: comm, error: commErr } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single();
    setCommunity(comm);
    // Fetch members
    const { data: memberRows } = await supabase
      .from('community_members')
      .select('user_id, role, profiles:profiles(id, display_name, username, profile_picture_url)')
      .eq('community_id', communityId);
    setMembers(memberRows || []);
    // Fetch events
    const { data: eventRows } = await supabase
      .from('events')
      .select('*')
      .eq('community_id', communityId)
      .order('event_date', { ascending: true });
    setEvents(eventRows || []);
    setLoading(false);
  };

  const isOwner = user && community && user.id === community.creator_id;
  const isMember = user && members.some(m => m.user_id === user.id);

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !newEventDate.trim()) {
      Alert.alert('Validation', 'Title and date are required');
      return;
    }
    try {
      const { error } = await supabase.from('events').insert({
        community_id: communityId,
        creator_id: user.id,
        event_date: newEventDate,
        location: newEventLocation,
        title: newEventTitle,
        description: newEventDescription,
        event_type: 'workshop',
        is_paid: false,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setEventModalVisible(false);
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventLocation('');
      setNewEventDescription('');
      fetchAll();
      Alert.alert('Success', 'Event created!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create event');
    }
  };

  const handleParticipate = async (event) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to participate.');
      return;
    }
    setParticipatingEventId(event.id);
    try {
      // Check if already a participant
      const { data: existing } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        Alert.alert('Already Participated', 'You have already joined this event.');
        setParticipatingEventId(null);
        return;
      }
      
      // Insert participation
      const { error: participantError } = await supabase.from('event_participants').insert({
        event_id: event.id,
        user_id: user.id,
        registration_date: new Date().toISOString(),
        payment_status: 'paid',
      });
      if (participantError) throw participantError;

      // Generate ticket number
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Create ticket
      const { error: ticketError } = await supabase.from('tickets').insert({
        event_id: event.id,
        user_id: user.id,
        ticket_number: ticketNumber,
        status: 'active',
        event_title: event.title,
        event_date: event.event_date,
        event_location: event.location,
        price: event.price || 0,
      });
      if (ticketError) throw ticketError;

      setTicketModal({ visible: true, event });
      fetchAll(); // Refresh the data
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to participate');
    } finally {
      setParticipatingEventId(null);
    }
  };

  const renderEvent = ({ item }) => {
    return (
      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDate}>{new Date(item.event_date).toLocaleDateString()}</Text>
        {item.location && <Text style={styles.eventLocation}>Location: {item.location}</Text>}
        {item.description && <Text style={styles.eventDescription}>{item.description}</Text>}
        <TouchableOpacity
          style={styles.participateButton}
          onPress={() => handleParticipate(item)}
          disabled={participatingEventId === item.id}
        >
          <Text style={styles.participateButtonText}>
            {participatingEventId === item.id ? 'Joining...' : 'Participate'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading community...</Text>
      </View>
    );
  }

  if (!community) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Community not found</Text>
      </View>
    );
  }

  // Responsive width
  const screenWidth = Dimensions.get('window').width;

  // List header for FlatList
  const ListHeader = () => (
    <>
        {/* Community Card */}
        <View style={styles.communityCard}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
          </TouchableOpacity>
          {community.cover_image_url ? (
            <Image source={{ uri: community.cover_image_url }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverImagePlaceholder}>
              <Ionicons name="people" size={48} color="#ede9fe" />
            </View>
          )}
          <Text style={styles.headerTitle}>{community.name}</Text>
          <Text style={styles.communityDescription}>{community.description}</Text>
        </View>

        {/* Members */}
        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        <FlatList
          data={members}
          keyExtractor={item => item.user_id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.membersList}
          renderItem={({ item }) => (
            <View style={styles.memberItem}>
              {item.profiles?.profile_picture_url ? (
                <Image source={{ uri: item.profiles.profile_picture_url }} style={styles.memberAvatar} />
              ) : (
                <View style={styles.memberAvatarPlaceholder}>
                  <Text style={styles.memberAvatarText}>{item.profiles?.display_name?.[0] || item.profiles?.username?.[0] || '?'}</Text>
                </View>
              )}
              <Text style={styles.memberName} numberOfLines={1}>{item.profiles?.display_name || item.profiles?.username}</Text>
              <Text style={styles.memberRole}>{item.role}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyMembersText}>No members yet.</Text>}
          style={{ maxHeight: 90, marginBottom: 10 }}
        />

        {/* Organize Event Button (owner only) */}
        {isOwner && (
          <TouchableOpacity style={styles.organizeButton} onPress={() => setEventModalVisible(true)}>
            <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.organizeButtonText}>Organize Event/Workshop</Text>
          </TouchableOpacity>
        )}

        {/* Events & Workshops */}
        <Text style={styles.sectionTitle}>Events & Workshops</Text>
      {events.length === 0 && (
          <Text style={styles.noEventsText}>No events or workshops yet.</Text>
      )}
    </>
  );

  return (
    <View style={styles.container}>
          <FlatList
            data={events}
            keyExtractor={item => item.id}
            renderItem={renderEvent}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 24 }}
            style={styles.eventsList}
          />
      {/* Event Creation Modal */}
      <Modal visible={eventModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Organize Event/Workshop</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={newEventDate}
              onChangeText={setNewEventDate}
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={newEventLocation}
              onChangeText={setNewEventLocation}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newEventDescription}
              onChangeText={setNewEventDescription}
              multiline
            />
            <TouchableOpacity style={styles.createEventButton} onPress={handleCreateEvent}>
              <Text style={styles.createEventButtonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEventModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Ticket Modal */}
      <Modal visible={ticketModal.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.ticketModalHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text style={styles.modalTitle}>Successfully Registered!</Text>
            </View>
            <Text style={styles.ticketText}>
              You have successfully registered for {ticketModal.event?.title}.
              {"\n"}Your ticket has been created and saved to your tickets.
            </Text>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketInfoLabel}>Event:</Text>
              <Text style={styles.ticketInfoValue}>{ticketModal.event?.title}</Text>
              <Text style={styles.ticketInfoLabel}>Date:</Text>
              <Text style={styles.ticketInfoValue}>
                {ticketModal.event?.event_date ? new Date(ticketModal.event.event_date).toLocaleDateString() : 'TBD'}
              </Text>
              {ticketModal.event?.location && (
                <>
                  <Text style={styles.ticketInfoLabel}>Location:</Text>
                  <Text style={styles.ticketInfoValue}>{ticketModal.event.location}</Text>
                </>
              )}
            </View>
            <View style={styles.ticketModalButtons}>
              <TouchableOpacity 
                style={styles.viewTicketsButton} 
                onPress={() => {
                  setTicketModal({ visible: false, event: null });
                  navigation.navigate('Tickets');
                }}
              >
                <Text style={styles.viewTicketsButtonText}>View My Tickets</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeTicketButton} 
                onPress={() => setTicketModal({ visible: false, event: null })}
              >
                <Text style={styles.closeTicketButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 0 },
  scrollContent: { paddingBottom: 32 },
  communityCard: { backgroundColor: '#fff', borderRadius: 18, margin: 18, marginTop: 32, padding: 20, alignItems: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8, position: 'relative' },
  backButton: { position: 'absolute', left: 12, top: 12, zIndex: 2, backgroundColor: '#ede9fe', borderRadius: 16, padding: 6 },
  coverImage: { width: '100%', height: 120, borderRadius: 14, marginBottom: 14, resizeMode: 'cover' },
  coverImagePlaceholder: { width: '100%', height: 120, borderRadius: 14, marginBottom: 14, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#7c3aed', marginBottom: 6, textAlign: 'center' },
  communityDescription: { fontSize: 16, color: '#6b7280', marginBottom: 8, textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#7c3aed', marginHorizontal: 20, marginTop: 24, marginBottom: 10 },
  membersList: { paddingLeft: 20, paddingRight: 10, minHeight: 80 },
  memberItem: { alignItems: 'center', marginRight: 18, width: 70 },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 4, backgroundColor: '#ede9fe' },
  memberAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  memberAvatarText: { fontSize: 22, color: '#8b5cf6', fontWeight: 'bold' },
  memberName: { fontSize: 13, color: '#1f2937', fontWeight: '600', textAlign: 'center', maxWidth: 64 },
  memberRole: { fontSize: 11, color: '#7c3aed', fontWeight: '500', textAlign: 'center' },
  emptyMembersText: { color: '#9ca3af', fontSize: 14, marginLeft: 20, marginTop: 8 },
  organizeButton: { flexDirection: 'row', backgroundColor: '#8b5cf6', marginHorizontal: 20, marginTop: 18, borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  organizeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  eventsList: { marginHorizontal: 20 },
  eventCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  eventTitle: { fontSize: 17, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  eventDate: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  eventLocation: { fontSize: 13, color: '#6366f1', marginBottom: 2 },
  eventDescription: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  participateButton: { backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  participateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  noEventsText: { color: '#9ca3af', fontSize: 15, marginHorizontal: 20, marginTop: 10, textAlign: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { fontSize: 16, color: '#6b7280', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 18, padding: 28, width: '85%', alignItems: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#7c3aed', marginBottom: 18, textAlign: 'center' },
  input: { width: '100%', borderWidth: 1, borderColor: '#a78bfa', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12, backgroundColor: '#f5f3ff' },
  createEventButton: { backgroundColor: '#8b5cf6', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 32, marginBottom: 10 },
  createEventButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelButton: { paddingVertical: 6, paddingHorizontal: 18 },
  cancelButtonText: { color: '#7c3aed', fontWeight: '600', fontSize: 15 },
  ticketText: { fontSize: 16, color: '#1f2937', marginBottom: 16, textAlign: 'center', lineHeight: 24 },
  ticketCode: { fontSize: 18, color: '#8b5cf6', fontWeight: 'bold', marginBottom: 18, textAlign: 'center' },
  ticketModalHeader: { alignItems: 'center', marginBottom: 16 },
  ticketInfo: { width: '100%', marginBottom: 20 },
  ticketInfoLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  ticketInfoValue: { fontSize: 16, color: '#1f2937', marginBottom: 12 },
  ticketModalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  viewTicketsButton: { backgroundColor: '#8b5cf6', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, flex: 1, marginRight: 8 },
  viewTicketsButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  closeTicketButton: { backgroundColor: '#6b7280', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, flex: 1, marginLeft: 8 },
  closeTicketButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
}); 