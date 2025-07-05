import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

export default function PremiumScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    {
      id: 'artworks',
      name: 'Premium for Artworks',
      icon: '🎨',
      description: 'Unlock unlimited artwork uploads, galleries, and artist features',
      color: '#8b5cf6',
      gradient: ['#8b5cf6', '#7c3aed']
    },
    {
      id: 'events',
      name: 'Premium for Events',
      icon: '🎪',
      description: 'Create unlimited events, workshops, and community gatherings',
      color: '#8b5cf6',
      gradient: ['#8b5cf6', '#7c3aed']
    },
    {
      id: 'duo',
      name: 'Duo Pack',
      icon: '✨',
      description: 'Best value! Get both artworks and events premium features',
      color: '#8b5cf6',
      gradient: ['#8b5cf6', '#7c3aed'],
      popular: true
    }
  ];

  const plans = {
    artworks: [
      {
        id: 'artworks-basic',
        name: 'Artworks Basic',
        price: '₹199',
        duration: 'per month',
        uploads: 50,
        galleries: 3,
        features: [
          'Upload up to 50 artworks per month',
          'Create up to 3 galleries',
          'Basic artist profile features',
          'Standard support'
        ],
        popular: false,
        color: '#6366f1'
      },
      {
        id: 'artworks-premium',
        name: 'Artworks Premium',
        price: '₹599',
        duration: 'per month',
        uploads: 'Unlimited',
        galleries: 'Unlimited',
        features: [
          'Upload unlimited artworks',
          'Create unlimited galleries',
          'Advanced artist features',
          'Priority support',
          'Custom gallery themes',
          'Analytics dashboard'
        ],
        popular: true,
        color: '#8b5cf6'
      },
      {
        id: 'artworks-yearly',
        name: 'Artworks Yearly',
        price: '₹2,999',
        duration: 'per year',
        originalPrice: '₹7,188',
        uploads: 'Unlimited',
        galleries: 'Unlimited',
        features: [
          'All premium artwork features',
          'VIP artist support',
          'Custom branding',
          'Advanced analytics',
          'Save 58% compared to monthly'
        ],
        popular: false,
        color: '#7c3aed'
      }
    ],
    events: [
      {
        id: 'events-basic',
        name: 'Events Basic',
        price: '₹299',
        duration: 'per month',
        events: 5,
        attendees: 100,
        features: [
          'Create up to 5 events per month',
          'Up to 100 attendees per event',
          'Basic event management',
          'Standard support'
        ],
        popular: false,
        color: '#8b5cf6'
      },
      {
        id: 'events-premium',
        name: 'Events Premium',
        price: '₹799',
        duration: 'per month',
        events: 'Unlimited',
        attendees: 'Unlimited',
        features: [
          'Create unlimited events',
          'Unlimited attendees',
          'Advanced event features',
          'Priority support',
          'Custom event themes',
          'Event analytics'
        ],
        popular: true,
        color: '#8b5cf6'
      },
      {
        id: 'events-yearly',
        name: 'Events Yearly',
        price: '₹3,999',
        duration: 'per year',
        originalPrice: '₹9,588',
        events: 'Unlimited',
        attendees: 'Unlimited',
        features: [
          'All premium event features',
          'VIP event support',
          'Custom branding',
          'Advanced analytics',
          'Save 58% compared to monthly'
        ],
        popular: false,
        color: '#7c3aed'
      }
    ],
    duo: [
      {
        id: 'duo-basic',
        name: 'Duo Basic',
        price: '₹399',
        duration: 'per month',
        uploads: 50,
        events: 5,
        features: [
          'Upload up to 50 artworks per month',
          'Create up to 5 events per month',
          'Basic features for both',
          'Standard support'
        ],
        popular: false,
        color: '#8b5cf6'
      },
      {
        id: 'duo-premium',
        name: 'Duo Premium',
        price: '₹1,199',
        duration: 'per month',
        uploads: 'Unlimited',
        events: 'Unlimited',
        features: [
          'Unlimited artwork uploads',
          'Unlimited events',
          'All premium features for both',
          'Priority support',
          'Custom themes for both',
          'Advanced analytics'
        ],
        popular: true,
        color: '#8b5cf6'
      },
      {
        id: 'duo-yearly',
        name: 'Duo Yearly',
        price: '₹5,999',
        duration: 'per year',
        originalPrice: '₹14,388',
        uploads: 'Unlimited',
        events: 'Unlimited',
        features: [
          'Everything unlimited',
          'VIP support for both',
          'Custom branding',
          'Advanced analytics',
          'Save 58% compared to monthly',
          'Best value for creators'
        ],
        popular: false,
        color: '#7c3aed'
      }
    ]
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedPlan(null); // Reset plan selection when category changes
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    Alert.alert(
      'Coming Soon! 🚀',
      'Premium membership features will be available soon. We\'re working hard to bring you amazing premium features!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const renderCategoryCard = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryCard,
        selectedCategory?.id === category.id && styles.selectedCategoryCard,
        category.popular && styles.popularCategoryCard
      ]}
      onPress={() => handleCategorySelect(category)}
      activeOpacity={0.8}
    >
      {category.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Best Value</Text>
        </View>
      )}
      
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={styles.categoryName}>{category.name}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPlanCard = (plan) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan?.id === plan.id && styles.selectedPlanCard,
        plan.popular && styles.popularPlanCard
      ]}
      onPress={() => handlePlanSelect(plan)}
      activeOpacity={0.8}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.duration}>{plan.duration}</Text>
        </View>
        {plan.originalPrice && (
          <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
        )}
      </View>

      <View style={styles.limitsContainer}>
        {selectedCategory?.id === 'artworks' && (
          <>
            <View style={styles.limitItem}>
              <Ionicons name="images-outline" size={20} color={plan.color} />
              <Text style={styles.limitText}>
                {plan.uploads} {typeof plan.uploads === 'number' ? 'Uploads' : 'Uploads'}
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Ionicons name="albums-outline" size={20} color={plan.color} />
              <Text style={styles.limitText}>
                {plan.galleries} {typeof plan.galleries === 'number' ? 'Galleries' : 'Galleries'}
              </Text>
            </View>
          </>
        )}
        {selectedCategory?.id === 'events' && (
          <>
            <View style={styles.limitItem}>
              <Ionicons name="calendar-outline" size={20} color={plan.color} />
              <Text style={styles.limitText}>
                {plan.events} {typeof plan.events === 'number' ? 'Events/month' : 'Events'}
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Ionicons name="people-outline" size={20} color={plan.color} />
              <Text style={styles.limitText}>
                {plan.attendees} {typeof plan.attendees === 'number' ? 'Attendees' : 'Attendees'}
              </Text>
            </View>
          </>
        )}
        {selectedCategory?.id === 'duo' && (
          <>
            <View style={styles.limitItem}>
              <Ionicons name="images-outline" size={20} color={plan.color} />
              <Text style={styles.limitText}>
                {plan.uploads} {typeof plan.uploads === 'number' ? 'Uploads' : 'Uploads'}
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Ionicons name="calendar-outline" size={20} color={plan.color} />
              <Text style={styles.limitText}>
                {plan.events} {typeof plan.events === 'number' ? 'Events/month' : 'Events'}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={plan.color} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Membership</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond" size={48} color="#8b5cf6" />
          </View>
          <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
          <Text style={styles.heroSubtitle}>
            Choose the perfect plan to grow your creative community and organize amazing events
          </Text>
        </View>

        {/* Category Selection */}
        {!selectedCategory ? (
          <View style={styles.categoriesContainer}>
            <Text style={styles.categoriesTitle}>Choose Your Premium Category</Text>
            <Text style={styles.categoriesSubtitle}>Select the type of premium features you need</Text>
            
            {categories.map(renderCategoryCard)}
          </View>
        ) : (
          <>
            {/* Back to Categories Button */}
            <View style={styles.backToCategoriesContainer}>
              <TouchableOpacity
                style={styles.backToCategoriesButton}
                onPress={() => setSelectedCategory(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#8b5cf6" />
                <Text style={styles.backToCategoriesText}>Back to Categories</Text>
              </TouchableOpacity>
            </View>

            {/* Plans */}
            <View style={styles.plansContainer}>
              <Text style={styles.plansTitle}>Choose Your {selectedCategory.name} Plan</Text>
              <Text style={styles.plansSubtitle}>All plans include a 7-day free trial</Text>
              
              {plans[selectedCategory.id].map(renderPlanCard)}
            </View>
          </>
        )}

        {/* Features Comparison - Only show when category is selected */}
        {selectedCategory && (
          <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>What's Included in {selectedCategory.name}</Text>
            <View style={styles.comparisonGrid}>
              {selectedCategory.id === 'artworks' && (
                <>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonFeature}>Artwork Uploads</Text>
                    <Text style={styles.comparisonBasic}>50</Text>
                    <Text style={styles.comparisonPremium}>Unlimited</Text>
                    <Text style={styles.comparisonYearly}>Unlimited</Text>
                  </View>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonFeature}>Galleries</Text>
                    <Text style={styles.comparisonBasic}>3</Text>
                    <Text style={styles.comparisonPremium}>Unlimited</Text>
                    <Text style={styles.comparisonYearly}>Unlimited</Text>
                  </View>
                </>
              )}
              {selectedCategory.id === 'events' && (
                <>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonFeature}>Events per month</Text>
                    <Text style={styles.comparisonBasic}>5</Text>
                    <Text style={styles.comparisonPremium}>Unlimited</Text>
                    <Text style={styles.comparisonYearly}>Unlimited</Text>
                  </View>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonFeature}>Attendees per event</Text>
                    <Text style={styles.comparisonBasic}>100</Text>
                    <Text style={styles.comparisonPremium}>Unlimited</Text>
                    <Text style={styles.comparisonYearly}>Unlimited</Text>
                  </View>
                </>
              )}
              {selectedCategory.id === 'duo' && (
                <>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonFeature}>Artwork Uploads</Text>
                    <Text style={styles.comparisonBasic}>50</Text>
                    <Text style={styles.comparisonPremium}>Unlimited</Text>
                    <Text style={styles.comparisonYearly}>Unlimited</Text>
                  </View>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonFeature}>Events per month</Text>
                    <Text style={styles.comparisonBasic}>5</Text>
                    <Text style={styles.comparisonPremium}>Unlimited</Text>
                    <Text style={styles.comparisonYearly}>Unlimited</Text>
                  </View>
                </>
              )}
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonFeature}>Priority Support</Text>
                <Text style={styles.comparisonBasic}>❌</Text>
                <Text style={styles.comparisonPremium}>✅</Text>
                <Text style={styles.comparisonYearly}>✅</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonFeature}>Analytics</Text>
                <Text style={styles.comparisonBasic}>❌</Text>
                <Text style={styles.comparisonPremium}>✅</Text>
                <Text style={styles.comparisonYearly}>✅</Text>
              </View>
            </View>
          </View>
        )}

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I change my plan later?</Text>
            <Text style={styles.faqAnswer}>Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is there a free trial?</Text>
            <Text style={styles.faqAnswer}>Yes, all plans come with a 7-day free trial. You can cancel anytime during the trial period.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Text style={styles.faqAnswer}>We accept all major credit cards, debit cards, and UPI payments for Indian users.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={styles.footer}>
                  <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
          >
            <Text style={styles.subscribeButtonText}>Coming Soon</Text>
          </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#1e293b',
    padding: 30,
    alignItems: 'center',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  categoriesContainer: {
    padding: 20,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 30,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategoryCard: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  popularCategoryCard: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  categoryHeader: {
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  backToCategoriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backToCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  backToCategoriesText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  plansContainer: {
    padding: 20,
  },
  plansTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  plansSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlanCard: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  popularPlanCard: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  duration: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  limitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  limitItem: {
    alignItems: 'center',
  },
  limitText: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 12,
    flex: 1,
  },
  comparisonSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  comparisonGrid: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  comparisonFeature: {
    flex: 2,
    padding: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  comparisonBasic: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#6366f1',
    textAlign: 'center',
    fontWeight: '600',
  },
  comparisonPremium: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#8b5cf6',
    textAlign: 'center',
    fontWeight: '600',
  },
  comparisonSixMonth: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#10b981',
    textAlign: 'center',
    fontWeight: '600',
  },
  comparisonYearly: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#8b5cf6',
    textAlign: 'center',
    fontWeight: '600',
  },
  faqSection: {
    padding: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  subscribeButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  subscribeButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subscribeButtonPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 