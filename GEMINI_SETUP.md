# YugAI Assistant - Gemini AI Setup Guide

## Overview
YugAI is an intelligent AI assistant for the Artयुग (ArtYug) creative platform that uses Google's Gemini AI to provide smart, contextual responses and help users navigate the app effectively.

## Features
- **Intelligent Conversations**: Context-aware responses using Gemini AI
- **Voice Commands**: Simulated voice recognition with text-to-speech responses
- **Navigation Assistance**: Smart navigation to different app sections
- **Creative Inspiration**: AI-generated art prompts and inspiration
- **Art Tips**: Personalized art advice and techniques
- **Conversation History**: Maintains context across interactions
- **Fallback Mode**: Works without API key using predefined responses

## Setup Instructions

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure API Key
1. Open `config/api.js`
2. Replace `'YOUR_GEMINI_API_KEY_HERE'` with your actual API key:

```javascript
export const API_CONFIG = {
  GEMINI_API_KEY: 'your_actual_api_key_here',
  // ... other config
};
```

### 3. Test the Setup
1. Run the app
2. Tap the YugAI floating assistant
3. Try asking questions like:
   - "Upload artwork"
   - "Find events"
   - "Creative inspiration"
   - "Art tips"

## API Key Security
- **Never commit API keys to version control**
- In production, use environment variables
- Consider using a backend proxy for API calls

## Fallback Mode
If no API key is configured, YugAI will:
- Use predefined responses for common queries
- Still provide navigation assistance
- Show a message to configure the API key
- Maintain basic functionality

## Troubleshooting

### Common Issues
1. **"Please configure your Gemini API key"**
   - Check that the API key is correctly set in `config/api.js`
   - Verify the API key is valid and has proper permissions

2. **"Error processing user input"**
   - Check internet connection
   - Verify API key is active
   - Check console for detailed error messages

3. **Voice not working**
   - Ensure `expo-speech` is properly installed
   - Check device permissions for audio

### API Limits
- Gemini API has rate limits
- Monitor usage in Google AI Studio dashboard
- Consider implementing caching for common responses

## Advanced Configuration

### Custom System Prompt
Edit the `YUGAI_SYSTEM_PROMPT` in `services/geminiAI.js` to customize:
- Assistant personality
- Available features
- Response style
- Navigation options

### User Context
The assistant uses context including:
- Current app section
- User type (Artist, Collector, etc.)
- Recent activity
- Conversation history

### Confidence Scoring
The system calculates confidence scores for:
- Navigation intent recognition
- Response relevance
- User query clarity

## Development Notes
- Uses `@google/generative-ai` package
- Implements conversation history management
- Provides fallback responses when API is unavailable
- Supports both voice and text input
- Integrates with app navigation system 