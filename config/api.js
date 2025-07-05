// API Configuration
export const API_CONFIG = {
  // Gemini AI API Key - Replace with your actual API key
  GEMINI_API_KEY: 'AIzaSyBoEpP_5Cs6qIT4e8GKH5lnTzasY3tKSa0',
  
  // Other API configurations can be added here
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
};

// Environment-based configuration
export const getApiKey = (key) => {
  // In production, you might want to use environment variables
  // For now, we'll use the config object
  return API_CONFIG[key];
};

// Validate API keys
export const validateApiKeys = () => {
  const missingKeys = [];
  
  if (!API_CONFIG.GEMINI_API_KEY || API_CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    missingKeys.push('GEMINI_API_KEY');
  }
  
  if (missingKeys.length > 0) {
    console.warn('Missing API keys:', missingKeys);
    return false;
  }
  
  return true;
}; 