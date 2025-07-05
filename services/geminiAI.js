import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey, validateApiKeys } from '../config/api';

// Initialize Gemini AI
const apiKey = getApiKey('GEMINI_API_KEY');
const genAI = apiKey && apiKey !== 'AIzaSyBZa1-zqDeAzM1K4TmEPFQdWAc_J4L2QLo' 
  ? new GoogleGenerativeAI(apiKey)
  : null;

// YugAI system prompt for context
const YUGAI_SYSTEM_PROMPT = `
You are YugAI, the AI assistant for Artयुग (ArtYug), a creative platform for artists, creators, and art lovers.
ArtYug was founded by Aman Labh (Founder & CEO) and built in one week in React Native.

Your rules:
- Always respond in 40 words or less.
- If the user asks to navigate (e.g., "Go to chat", "Open explore", "Show my profile"), return a navigation action for the correct screen: Home, Chat, Explore, Profile.
- You know all about ArtYug, its features, and its founder.
- Always introduce yourself as YugAI, here to help.

Be concise, helpful, and friendly.
`;

function trimToWordLimit(text, limit = 40) {
  const words = text.split(/\s+/);
  return words.length > limit ? words.slice(0, limit).join(' ') + '...' : text;
}

export class YugAIService {
  constructor() {
    this.model = genAI ? genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }) : null;
    this.conversationHistory = [];
    this.isAvailable = !!genAI;
  }

  // Initialize conversation with system prompt
  async initializeConversation() {
    try {
      if (!this.isAvailable) {
        return 'Hello! I\'m YugAI, your creative assistant. Please configure your Gemini API key to enable AI features.';
      }
      const result = await this.model.generateContent(YUGAI_SYSTEM_PROMPT);
      this.conversationHistory = [
        { role: 'system', content: YUGAI_SYSTEM_PROMPT },
        { role: 'assistant', content: 'Hello! I\'m YugAI, your creative assistant. How can I help you with your art journey today?' }
      ];
      return trimToWordLimit(result.response.text());
    } catch (error) {
      console.error('Error initializing conversation:', error);
      return 'Hello! I\'m YugAI, your creative assistant. How can I help you today?';
    }
  }

  // Process user input and generate intelligent response
  async processUserInput(userInput, userContext = {}) {
    try {
      if (!this.isAvailable) {
        // Fallback responses when Gemini is not available
        const fallbackResponses = {
          'upload': 'I can help you upload artwork! Navigate to the upload section to share your creativity.',
          'explore': 'Let\'s explore amazing artwork from our community!',
          'communities': 'Join creative communities and connect with fellow artists.',
          'messages': 'Check your messages and stay connected with the art community.',
          'profile': 'I\'ll take you to your profile where you can manage your artwork and settings.',
          'help': 'I\'m here to help! You can ask me to upload artwork, find events, explore galleries, or navigate to any section of the app.',
          'hello': 'Hello! I\'m YugAI, your creative assistant. Please configure your Gemini API key for enhanced AI features.',
        };
        const lowerInput = userInput.toLowerCase();
        const fallbackResponse = Object.keys(fallbackResponses).find(key => 
          lowerInput.includes(key)
        );
        return {
          response: fallbackResponse ? fallbackResponses[fallbackResponse] : 'I\'m here to help with your creative journey! Please configure your Gemini API key for enhanced AI features.',
          navigationAction: this.extractNavigationIntent(userInput, ''),
          confidence: 0.5
        };
      }

      // Add user context to the prompt
      const contextPrompt = `
User Context:
- Current section: ${userContext.currentSection || 'Home'}
- User type: ${userContext.userType || 'Artist'}
- Recent activity: ${userContext.recentActivity || 'None'}

User Input: "${userInput}"

Please provide a helpful response and suggest relevant actions. If the user wants to navigate somewhere, include the navigation action in your response.
`;

      // Add user input to conversation history
      this.conversationHistory.push({ role: 'user', content: userInput });

      // Generate response using Gemini
      const result = await this.model.generateContent(contextPrompt);
      let response = result.response.text();
      response = trimToWordLimit(response, 40);

      // Add assistant response to conversation history
      this.conversationHistory.push({ role: 'assistant', content: response });

      // Extract navigation intent
      const navigationAction = this.extractNavigationIntent(userInput, response);

      return {
        response: response,
        navigationAction: navigationAction,
        confidence: this.calculateConfidence(userInput, response)
      };

    } catch (error) {
      console.error('Error processing user input:', error);
      return {
        response: 'I apologize, but I\'m having trouble processing your request right now. Please try again or use the menu to navigate manually.',
        navigationAction: null,
        confidence: 0
      };
    }
  }

  // Extract navigation intent from user input and response
  extractNavigationIntent(userInput, response) {
    const input = userInput.toLowerCase();
    const responseText = response.toLowerCase();

    // Direct navigation commands
    if (input.includes('upload') || input.includes('share') || input.includes('post')) {
      return { action: 'navigate', destination: 'Upload', reason: 'User wants to upload or share content' };
    }
    if (input.includes('explore') || input.includes('discover') || input.includes('find')) {
      return { action: 'navigate', destination: 'Explore', reason: 'User wants to explore or discover content' };
    }
    if (input.includes('community') || input.includes('communities') || input.includes('join')) {
      return { action: 'navigate', destination: 'Communities', reason: 'User wants to access communities' };
    }
    if (input.includes('message') || input.includes('chat') || input.includes('talk')) {
      return { action: 'navigate', destination: 'Chat', reason: 'User wants to access chat/messages' };
    }
    if (input.includes('profile') || input.includes('account') || input.includes('settings') || input.includes('me')) {
      return { action: 'navigate', destination: 'Profile', reason: 'User wants to access profile or settings' };
    }
    if (input.includes('premium') || input.includes('upgrade') || input.includes('subscription')) {
      return { action: 'navigate', destination: 'Premium', reason: 'User wants to access premium features' };
    }
    if (input.includes('home') || input.includes('main feed')) {
      return { action: 'navigate', destination: 'Home', reason: 'User wants to go to the home screen' };
    }
    // Art-related queries that might need exploration
    if (input.includes('artwork') || input.includes('painting') || input.includes('drawing') || input.includes('gallery')) {
      return { action: 'navigate', destination: 'Explore', reason: 'User is looking for artwork' };
    }
    // Event-related queries
    if (input.includes('event') || input.includes('workshop') || input.includes('exhibition') || input.includes('meetup')) {
      return { action: 'navigate', destination: 'Explore', reason: 'User is looking for events' };
    }
    return null;
  }

  // Calculate confidence score for the response
  calculateConfidence(userInput, response) {
    let confidence = 0.5; // Base confidence

    // Increase confidence for clear navigation requests
    const navigationKeywords = ['upload', 'explore', 'community', 'message', 'profile', 'premium', 'home'];
    const hasNavigationKeyword = navigationKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );
    
    if (hasNavigationKeyword) {
      confidence += 0.3;
    }

    // Increase confidence for art-related queries
    const artKeywords = ['art', 'painting', 'drawing', 'gallery', 'artist', 'creative'];
    const hasArtKeyword = artKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );
    
    if (hasArtKeyword) {
      confidence += 0.2;
    }

    // Decrease confidence for unclear or off-topic queries
    const offTopicKeywords = ['weather', 'news', 'sports', 'politics'];
    const hasOffTopicKeyword = offTopicKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );
    
    if (hasOffTopicKeyword) {
      confidence -= 0.3;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  // Get creative inspiration
  async getCreativeInspiration(userPreferences = {}) {
    try {
      const prompt = `
Generate creative inspiration for an artist. Consider these preferences:
- Art style: ${userPreferences.artStyle || 'Any'}
- Medium: ${userPreferences.medium || 'Any'}
- Mood: ${userPreferences.mood || 'Creative'}

Provide:
1. A creative prompt or idea
2. Suggested techniques or approaches
3. Inspiration sources
4. Encouraging message

Keep it concise and inspiring.
`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error getting creative inspiration:', error);
      return 'Try exploring different art styles or techniques. Sometimes the best inspiration comes from stepping outside your comfort zone!';
    }
  }

  // Get art tips and advice
  async getArtTips(topic = 'general') {
    try {
      const prompt = `
Provide helpful art tips and advice for: ${topic}

Include:
1. Practical tips
2. Common mistakes to avoid
3. Recommended resources
4. Encouraging advice

Keep it concise and actionable.
`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error getting art tips:', error);
      return 'Practice regularly, experiment with different techniques, and don\'t be afraid to make mistakes. Every artist grows through practice!';
    }
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
  }

  // Get conversation summary
  getConversationSummary() {
    return this.conversationHistory.slice(-5); // Last 5 exchanges
  }
}

// Export singleton instance
export const yugAIService = new YugAIService(); 