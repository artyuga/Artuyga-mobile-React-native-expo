import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { yugAIService } from '../services/geminiAI';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function YugAIAssistant({ navigation }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [conversation, setConversation] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [voiceRecognitionText, setVoiceRecognitionText] = useState('');
  const [speakingText, setSpeakingText] = useState('');
  const [userContext, setUserContext] = useState({
    currentSection: 'Home',
    userType: 'Artist',
    recentActivity: 'None'
  });
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize YugAI service
  useEffect(() => {
    initializeYugAI();
  }, []);

  const initializeYugAI = async () => {
    try {
      setIsProcessing(true);
      const welcomeMessage = await yugAIService.initializeConversation();
      setCurrentResponse(welcomeMessage);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing YugAI:', error);
      setCurrentResponse('Hello! I\'m YugAI, your creative assistant. How can I help you today?');
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Wave animation for voice recognition, speaking, and processing
  const waveAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    wave.start();
    return () => wave.stop();
  }, []);

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        
        // Keep the assistant within screen bounds
        const newX = Math.max(0, Math.min(screenWidth - 80, pan.x._value));
        const newY = Math.max(0, Math.min(screenHeight - 200, pan.y._value));
        
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();
        
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const startListening = async () => {
    try {
      setIsListening(true);
      setShowModal(true);
      setCurrentResponse('Listening... Speak now!');
      setVoiceRecognitionText('');
      
      // Simulate voice recognition with progressive text
      const sampleCommands = [
        'Upload artwork',
        'Find events',
        'Explore galleries',
        'Join communities',
        'Check messages',
        'Creative inspiration',
        'Art tips',
        'Help'
      ];
      const randomCommand = sampleCommands[Math.floor(Math.random() * sampleCommands.length)];
      
      // Simulate progressive voice recognition
      let currentText = '';
      const words = randomCommand.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        currentText += (currentText ? ' ' : '') + words[i];
        setVoiceRecognitionText(currentText);
      }
      
      // Wait a bit more then process
      setTimeout(() => {
        processUserInput(randomCommand);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting listening:', error);
      setIsListening(false);
      setShowModal(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setShowModal(false);
  };

  const processUserInput = async (input) => {
    try {
      setIsListening(false);
      setIsProcessing(true);
      
      // Add user input to conversation
      const newConversation = [...conversation, { role: 'user', content: input }];
      setConversation(newConversation);
      
      // Process with Gemini AI
      const result = await yugAIService.processUserInput(input, userContext);
      
      // Add AI response to conversation
      const updatedConversation = [...newConversation, { role: 'assistant', content: result.response }];
      setConversation(updatedConversation);
      
      setCurrentResponse(result.response);
      
      // Speak the response
      speakResponse(result.response);
      
      // Handle navigation if needed
      if (result.navigationAction && result.confidence > 0.7) {
        handleNavigation(result.navigationAction);
      }
      
    } catch (error) {
      console.error('Error processing input:', error);
      setCurrentResponse('I apologize, but I\'m having trouble processing your request right now. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigation = (navigationAction) => {
    if (navigationAction.action === 'navigate') {
      setTimeout(() => {
        navigation.navigate(navigationAction.destination);
        setShowModal(false);
      }, 2000);
    }
  };

  const speakResponse = async (text) => {
    try {
      setIsSpeaking(true);
      setSpeakingText('');
      
      // Simulate progressive speaking text
      const words = text.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        currentText += (currentText ? ' ' : '') + words[i];
        setSpeakingText(currentText);
      }
      
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
      
      setTimeout(() => {
        setIsSpeaking(false);
        setSpeakingText('');
      }, 2000);
    } catch (error) {
      console.error('Error speaking:', error);
      setIsSpeaking(false);
      setSpeakingText('');
    }
  };

  const handleYugAIPress = () => {
    if (!isListening && !isSpeaking && !isProcessing) {
      startListening();
    }
  };

  const handleTextSubmit = () => {
    if (inputText.trim() && !isProcessing) {
      processUserInput(inputText.trim());
      setInputText('');
    }
  };

  const getCreativeInspiration = async () => {
    try {
      setIsProcessing(true);
      const inspiration = await yugAIService.getCreativeInspiration();
      setCurrentResponse(inspiration);
      speakResponse(inspiration);
    } catch (error) {
      console.error('Error getting inspiration:', error);
      setCurrentResponse('Try exploring different art styles or techniques. Sometimes the best inspiration comes from stepping outside your comfort zone!');
    } finally {
      setIsProcessing(false);
    }
  };

  const getArtTips = async () => {
    try {
      setIsProcessing(true);
      const tips = await yugAIService.getArtTips('general');
      setCurrentResponse(tips);
      speakResponse(tips);
    } catch (error) {
      console.error('Error getting art tips:', error);
      setCurrentResponse('Practice regularly, experiment with different techniques, and don\'t be afraid to make mistakes. Every artist grows through practice!');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* YugAI Floating Assistant */}
      <Animated.View
        style={[
          styles.yugAIContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.yugAIBubble,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.yugAIButton,
              isListening && styles.yugAIListening,
              isSpeaking && styles.yugAISpeaking,
              isProcessing && styles.yugAIProcessing,
            ]}
            onPress={handleYugAIPress}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={isListening ? "mic" : isSpeaking ? "volume-high" : "sparkles"}
                size={24}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        </Animated.View>
        
        {/* YugAI Label */}
        <View style={styles.yugAILabel}>
          <Text style={styles.yugAILabelText}>YugAI</Text>
        </View>
      </Animated.View>

      {/* Response Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={stopListening}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>YugAI Assistant</Text>
              <TouchableOpacity onPress={stopListening}>
                <Ionicons name="close" size={24} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.conversationContainer}>
              {conversation.map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageContainer,
                    message.role === 'user' ? styles.userMessage : styles.aiMessage
                  ]}
                >
                  <Text style={styles.messageText}>{message.content}</Text>
                </View>
              ))}
              
              {/* Voice Recognition Display */}
              {isListening && voiceRecognitionText && (
                <View style={styles.voiceRecognitionContainer}>
                  <View style={styles.voiceRecognitionHeader}>
                    <Ionicons name="mic" size={16} color="#ef4444" />
                    <Text style={styles.voiceRecognitionTitle}>Voice Recognition</Text>
                  </View>
                  <Text style={styles.voiceRecognitionText}>{voiceRecognitionText}</Text>
                  <View style={styles.waveContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.wave,
                          {
                            backgroundColor: '#ef4444',
                            transform: [{ scaleY: waveAnim }],
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
              
              {/* Speaking Display */}
              {isSpeaking && speakingText && (
                <View style={styles.speakingContainer}>
                  <View style={styles.speakingHeader}>
                    <Ionicons name="volume-high" size={16} color="#22c55e" />
                    <Text style={styles.speakingTitle}>YugAI Speaking</Text>
                  </View>
                  <Text style={styles.speakingText}>{speakingText}</Text>
                  <View style={styles.waveContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.wave,
                          {
                            backgroundColor: '#22c55e',
                            transform: [{ scaleY: waveAnim }],
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
              
              {/* Processing Display */}
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <View style={styles.processingHeader}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                    <Text style={styles.processingTitle}>YugAI Processing</Text>
                  </View>
                  <Text style={styles.processingText}>Analyzing your request...</Text>
                  <View style={styles.waveContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.wave,
                          {
                            backgroundColor: '#8b5cf6',
                            transform: [{ scaleY: waveAnim }],
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                onPress={startListening}
                disabled={isListening || isProcessing}
              >
                <Ionicons name="mic" size={20} color={isListening ? '#fff' : '#8b5cf6'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleTextSubmit}
                disabled={!inputText.trim() || isProcessing}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Quick Actions:</Text>
              <View style={styles.suggestionsList}>
                {[
                  { text: 'Creative Inspiration', action: getCreativeInspiration },
                  { text: 'Art Tips', action: getArtTips },
                  { text: 'Upload Artwork', action: () => processUserInput('Upload artwork') },
                  { text: 'Find Events', action: () => processUserInput('Find events') },
                  { text: 'Explore Galleries', action: () => processUserInput('Explore galleries') },
                  { text: 'Help', action: () => processUserInput('Help') }
                ].map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionButton}
                    onPress={suggestion.action}
                    disabled={isProcessing}
                  >
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  yugAIContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
  yugAIBubble: {
    alignItems: 'center',
  },
  yugAIButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  yugAIListening: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    shadowColor: '#ef4444',
  },
  yugAISpeaking: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    shadowColor: '#22c55e',
  },
  yugAIProcessing: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    shadowColor: '#f59e0b',
  },
  yugAILabel: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  yugAILabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  conversationContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  processingContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  processingTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  processingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  voiceRecognitionContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  voiceRecognitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceRecognitionTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  voiceRecognitionText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 8,
  },
  speakingContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  speakingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  speakingTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  speakingText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 8,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  wave: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  voiceButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  suggestionText: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
}); 