import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState('role'); // 'role', 'artistType', 'form'
  const [role, setRole] = useState('explorer'); // 'artist' or 'explorer'
  const [artistType, setArtistType] = useState('visual_artist');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User is already authenticated, redirect to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    };
    
    checkAuth();
  }, [navigation]);

  const artistTypes = [
    { value: 'visual_artist', label: 'Visual Artist' },
    { value: 'singer', label: 'Singer' },
    { value: 'theater', label: 'Theater Artist' },
    { value: 'comedian', label: 'Comedian' },
    { value: 'creator', label: 'Creator' },
  ];

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'artist') {
      setStep('artistType');
    } else {
      setStep('form');
    }
  };

  const handleArtistTypeSelect = (selectedType) => {
    setArtistType(selectedType);
    setStep('form');
  };

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Username validation
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }

    // Username format validation (alphanumeric and underscores only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process...', { email, username, role, artistType });
      
      // Sign up with Supabase - matching web app implementation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username, // Add display_name like web app
            role,
            artist_type: role === 'artist' ? artistType : 'visual_artist', // always valid
          },
        },
      });

      console.log('Signup result:', { data, error });

      if (error) {
        let errorMessage = error.message;
        // Provide more user-friendly error messages
        if (
          error.message.includes('duplicate key value') ||
          error.message.includes('unique constraint')
        ) {
          errorMessage = 'Username already exists, try another username.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
        Alert.alert('Error', errorMessage);
      } else {
        // Show success message and handle email verification like web app
        Alert.alert(
          'Success', 
          'Account created! Please check your email to confirm your account.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SignIn')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const redirectTo = AuthSession.makeRedirectUri({ useProxy: true });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else if (data?.url) {
        const result = await AuthSession.startAsync({ authUrl: data.url });
        // The auth state will be handled by the onAuthStateChange listener in App.js
      }
    } catch (error) {
      Alert.alert('Error', 'Google sign-in failed');
    }
  };

  const renderRoleSelection = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Join Artयुग</Text>
      <Text style={styles.subtitle}>Choose your role</Text>
      
      <TouchableOpacity
        style={[styles.roleButton, role === 'artist' && styles.selectedRole]}
        onPress={() => handleRoleSelect('artist')}
      >
        <Text style={[styles.roleText, role === 'artist' && styles.selectedRoleText]}>
          Artist
        </Text>
        <Text style={styles.roleDescription}>
          Create and share your artwork
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.roleButton, role === 'explorer' && styles.selectedRole]}
        onPress={() => handleRoleSelect('explorer')}
      >
        <Text style={[styles.roleText, role === 'explorer' && styles.selectedRoleText]}>
          Explorer
        </Text>
        <Text style={styles.roleDescription}>
          Discover and appreciate art
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('SignIn')}
      >
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderArtistTypeSelection = () => (
    <View style={styles.container}>
      <Text style={styles.title}>What type of artist are you?</Text>
      <Text style={styles.subtitle}>This will help us customize your experience</Text>
      
      <ScrollView style={styles.scrollView}>
        {artistTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.artistTypeButton,
              artistType === type.value && styles.selectedArtistType
            ]}
            onPress={() => handleArtistTypeSelect(type.value)}
          >
            <Text style={[
              styles.artistTypeText,
              artistType === type.value && styles.selectedArtistTypeText
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('role')}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignUpForm = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>
        Join Artयुग as {role === 'artist' ? 'an Artist' : 'an Explorer'}
      </Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. artist_john"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <Text style={[
              styles.passwordStrength,
              password.length < 6 ? styles.passwordWeak : 
              password.length < 8 ? styles.passwordMedium : 
              styles.passwordStrong
            ]}>
              {password.length < 6 ? 'Weak' : 
               password.length < 8 ? 'Medium' : 'Strong'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.disabledButton]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.googleButtonText}>Sign up with Google</Text>
        </TouchableOpacity>
        <View style={styles.orContainer}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <TouchableOpacity
          style={[styles.signUpButton, loading && styles.disabledButton]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(role === 'artist' ? 'artistType' : 'role')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      {step === 'role' && renderRoleSelection()}
      {step === 'artistType' && renderArtistTypeSelection()}
      {step === 'form' && renderSignUpForm()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#6b7280',
  },
  roleButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedRole: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  roleText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#1f2937',
  },
  selectedRoleText: {
    color: '#8b5cf6',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  artistTypeButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedArtistType: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  artistTypeText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectedArtistTypeText: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  showPasswordButton: {
    padding: 10,
  },
  signUpButton: {
    backgroundColor: '#8b5cf6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  linkButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#8b5cf6',
    fontSize: 16,
  },
  passwordStrength: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'right',
  },
  passwordWeak: {
    color: '#ef4444', // Red for weak
  },
  passwordMedium: {
    color: '#f59e0b', // Orange for medium
  },
  passwordStrong: {
    color: '#10b981', // Green for strong
  },
  googleButton: {
    backgroundColor: '#4285f4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  orText: {
    marginHorizontal: 10,
    color: '#6b7280',
    fontSize: 16,
  },
}); 