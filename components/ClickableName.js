import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

const ClickableName = ({ 
  name, 
  userId, 
  navigation, 
  style, 
  textStyle, 
  showPrefix = false, 
  prefix = 'by ',
  onPress 
}) => {
  const [scaleValue] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onPress) {
      onPress();
    } else if (userId && navigation) {
      navigation.navigate('PublicProfile', { userId });
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={[styles.container, style]}
      >
        <Text style={[styles.text, textStyle]}>
          {showPrefix ? prefix : ''}{name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  text: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ClickableName; 