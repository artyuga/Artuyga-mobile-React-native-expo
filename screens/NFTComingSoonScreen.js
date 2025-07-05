import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function NFTComingSoonScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubscribe = () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setModalVisible(false);
    setEmail('');
    Alert.alert('Subscribed!', 'Thank you for subscribing to our newsletter.');
  };

  return (
    <LinearGradient
      colors={["#f3e8ff", "#ede9fe", "#f5f3ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Ionicons name="diamond-outline" size={64} color="#a78bfa" />
        </View>
        <Text style={styles.title}>NFT Marketplace Coming Soon!</Text>
        <Text style={styles.subtitle}>
          We are launching a new feature where you can <Text style={styles.bold}>list</Text> and <Text style={styles.bold}>bid</Text> your painting as NFT in our marketplace.
        </Text>
        <Text style={styles.subtitle}>
          Users will be able to <Text style={styles.bold}>mint</Text> NFTs and own unique digital art.
        </Text>
        <Text style={styles.solanaText}>Built on <Text style={styles.solanaBold}>Solana</Text> chain 🚀</Text>
        <Text style={styles.stayTuned}>Stay tuned with us!</Text>
        <TouchableOpacity style={styles.subscribeButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="mail-outline" size={20} color="#fff" />
          <Text style={styles.subscribeButtonText}>Subscribe to our Newsletter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#a78bfa" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Subscribe to our Newsletter</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.modalSubscribeButton} onPress={handleSubscribe}>
              <Text style={styles.modalSubscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconBox: {
    backgroundColor: '#ede9fe',
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 18,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#6d28d9',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  bold: {
    fontWeight: 'bold',
    color: '#a78bfa',
  },
  solanaText: {
    fontSize: 16,
    color: '#16a34a',
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  solanaBold: {
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  stayTuned: {
    fontSize: 18,
    color: '#7c3aed',
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 30,
    textAlign: 'center',
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a78bfa',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginBottom: 18,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  backButtonText: {
    color: '#7c3aed',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    width: width * 0.85,
    alignItems: 'center',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 18,
    backgroundColor: '#f5f3ff',
  },
  modalSubscribeButton: {
    backgroundColor: '#a78bfa',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginBottom: 10,
  },
  modalSubscribeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalCloseButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  modalCloseButtonText: {
    color: '#7c3aed',
    fontWeight: '600',
    fontSize: 15,
  },
}); 