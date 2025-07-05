class MessageCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 50; // Maximum number of conversations to cache
    this.maxMessagesPerConversation = 100; // Maximum messages per conversation
  }

  // Get messages for a conversation
  getMessages(conversationId) {
    return this.cache.get(conversationId) || [];
  }

  // Set messages for a conversation
  setMessages(conversationId, messages) {
    // Limit the number of messages per conversation
    const limitedMessages = messages.slice(-this.maxMessagesPerConversation);
    this.cache.set(conversationId, limitedMessages);
    this.cleanup();
  }

  // Add a single message to cache
  addMessage(conversationId, message) {
    const existingMessages = this.getMessages(conversationId);
    const updatedMessages = [...existingMessages, message];
    this.setMessages(conversationId, updatedMessages);
  }

  // Update a message in cache (for optimistic updates)
  updateMessage(conversationId, messageId, updates) {
    const existingMessages = this.getMessages(conversationId);
    const updatedMessages = existingMessages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    this.setMessages(conversationId, updatedMessages);
  }

  // Remove a message from cache (for error handling)
  removeMessage(conversationId, messageId) {
    const existingMessages = this.getMessages(conversationId);
    const filteredMessages = existingMessages.filter(msg => msg.id !== messageId);
    this.setMessages(conversationId, filteredMessages);
  }

  // Check if conversation is cached
  hasConversation(conversationId) {
    return this.cache.has(conversationId);
  }

  // Clear cache for a specific conversation
  clearConversation(conversationId) {
    this.cache.delete(conversationId);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Cleanup old entries if cache is too large
  cleanup() {
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      // Remove oldest entries
      const entriesToRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      conversations: Array.from(this.cache.keys()),
      totalMessages: Array.from(this.cache.values()).reduce((sum, messages) => sum + messages.length, 0)
    };
  }
}

// Create a singleton instance
const messageCache = new MessageCache();

export default messageCache; 