import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { supabase } from './supabase';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import CommunitiesScreen from './screens/CommunitiesScreen';
import UploadScreen from './screens/UploadScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProfileScreen from './screens/ProfileScreen';
import CategoryArtScreen from './screens/CategoryArtScreen';
import PaintingDetailScreen from './screens/PaintingDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChatScreen from './screens/ChatScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import FollowersListScreen from './screens/FollowersListScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import NFTComingSoonScreen from './screens/NFTComingSoonScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import CommunityDetailScreen from './screens/CommunityDetailScreen';
import CreateCommunityScreen from './screens/CreateCommunityScreen';
import TicketsScreen from './screens/TicketsScreen';
import PremiumScreen from './screens/PremiumScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Communities') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          }
          return <Ionicons name={iconName} size={focused ? 32 : 26} color={color} style={{ marginBottom: -4 }} />;
        },
        tabBarActiveTintColor: '#7c3aed', // More vibrant purple
        tabBarInactiveTintColor: '#b6b6b6',
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          backgroundColor: '#fff',
          borderRadius: 32,
          height: 64 + insets.bottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 12,
          borderTopWidth: 0,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Communities" component={CommunitiesScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
            transitionSpec: {
              open: {
                animation: 'timing',
                config: { duration: 300 },
              },
              close: {
                animation: 'timing',
                config: { duration: 300 },
              },
            },
          }}
        >
          {user ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="CategoryArt" component={CategoryArtScreen} />
              <Stack.Screen name="PaintingDetail" component={PaintingDetailScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
              <Stack.Screen name="Messages" component={MessagesScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="FollowersList" component={FollowersListScreen} />
              <Stack.Screen name="NFTComingSoon" component={NFTComingSoonScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
              <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
              <Stack.Screen name="Tickets" component={TicketsScreen} />
              <Stack.Screen name="Premium" component={PremiumScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
