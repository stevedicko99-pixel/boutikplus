import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { SearchScreen } from '@/screens/home/SearchScreen';
import { ShopDetailScreen } from '@/screens/home/ShopDetailScreen';
import { ProductDetailScreen } from '@/screens/home/ProductDetailScreen';
import { CartScreen } from '@/screens/cart/CartScreen';
import { CheckoutScreen } from '@/screens/cart/CheckoutScreen';
import { PaymentScreen } from '@/screens/cart/PaymentScreen';
import { OrderConfirmationScreen } from '@/screens/cart/OrderConfirmationScreen';
import { ConversationListScreen } from '@/screens/messages/ConversationListScreen';
import { ChatScreen } from '@/screens/messages/ChatScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { OrdersScreen } from '@/screens/profile/OrdersScreen';
import { AddressesScreen } from '@/screens/profile/AddressesScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';
import { CreateShopScreen } from '@/screens/seller/CreateShopScreen';
import { SellerDashboardScreen } from '@/screens/seller/SellerDashboardScreen';
import { ProductManagementScreen } from '@/screens/seller/ProductManagementScreen';
import { AddEditProductScreen } from '@/screens/seller/AddEditProductScreen';
import { SellerOrdersScreen } from '@/screens/seller/SellerOrdersScreen';
import { SellerStatsScreen } from '@/screens/seller/SellerStatsScreen';
import { PromotionsScreen } from '@/screens/seller/PromotionsScreen';
import { PromotionHubScreen } from '@/screens/seller/PromotionHubScreen';
import { DiscountCodeManagementScreen } from '@/screens/seller/DiscountCodeManagementScreen';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { ShopValidationScreen } from '@/screens/admin/ShopValidationScreen';
import { ReportsScreen } from '@/screens/admin/ReportsScreen';
import { NotificationCenterScreen } from '@/screens/notifications/NotificationCenterScreen';
import { ChatbotScreen } from '@/screens/ai/ChatbotScreen';
import { AIProductAssistantScreen } from '@/screens/ai/AIProductAssistantScreen';
import { ShareableShopScreen } from '@/screens/growth/ShareableShopScreen';
import { ReferralProgramScreen } from '@/screens/growth/ReferralProgramScreen';
import { ShareLinkManagementScreen } from '@/screens/growth/ShareLinkManagementScreen';
import { CampaignAnalyticsScreen } from '@/screens/growth/CampaignAnalyticsScreen';
import { DriverSearchScreen } from '@/screens/delivery/DriverSearchScreen';
import { CreateDeliveryScreen } from '@/screens/delivery/CreateDeliveryScreen';
import { DeliveryPaymentScreen } from '@/screens/delivery/DeliveryPaymentScreen';
import { DeliveryTrackingScreen } from '@/screens/delivery/DeliveryTrackingScreen';
import { SellerDeliveriesScreen } from '@/screens/delivery/SellerDeliveriesScreen';
import { DriverDashboardScreen } from '@/screens/delivery/DriverDashboardScreen';
import { DriverRegistrationScreen } from '@/screens/delivery/DriverRegistrationScreen';
import { HelpCenterScreen } from '@/screens/help/HelpCenterScreen';
import { HelpTutorialScreen } from '@/screens/help/HelpTutorialScreen';
import { PhotoStudioScreen } from '@/screens/seller/PhotoStudioScreen';
import { ProductVideoPickerScreen } from '@/screens/seller/ProductVideoPickerScreen';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AspectRatio } from '@/lib/photoStudio';

// --- Types ---
export type AppStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Search: undefined;
  ShopDetail: { shopId: string };
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  Payment: { orderId: string };
  OrderConfirmation: { orderId: string };
  ConversationList: undefined;
  Chat: { conversationId: string; shopId?: string; productId?: string };
  Profile: undefined;
  Orders: undefined;
  Addresses: undefined;
  Settings: undefined;
  CreateShop: undefined;
  SellerDashboard: undefined;
  ProductManagement: undefined;
  AddEditProduct: { productId?: string };
  SellerOrders: undefined;
  SellerStats: undefined;
  Promotions: undefined;
  PromotionHub: undefined;
  DiscountCodeManagement: undefined;
  AdminDashboard: undefined;
  ShopValidation: undefined;
  Reports: undefined;
  NotificationCenter: undefined;
  Chatbot: { product?: any; shopName?: string };
  AIProductAssistant: undefined;
  // Croissance
  ShareableShop: { shopId: string; shopName: string; shopLogo?: string };
  ReferralProgram: undefined;
  ShareLinkManagement: undefined;
  CampaignAnalytics: { linkId?: string } | undefined;
  // Livraison intra-plateforme
  DriverSearch: { preselectedDriverId?: string; packageWeight?: number; pickupCity?: string } | undefined;
  CreateDelivery: { driverId?: string; packageWeight?: number; pickupCity?: string } | undefined;
  DeliveryPayment: { deliveryId: string };
  DeliveryTracking: { deliveryId: string };
  SellerDeliveries: undefined;
  DriverDashboard: undefined;
  DriverRegistration: undefined;
  // Studio photo/vidéo & aide
  PhotoStudio: { initialUri?: string; aspect?: AspectRatio; editIndex?: number; returnTo?: 'AddEditProduct' | 'CreateShop' } | undefined;
  ProductVideoPicker: { productId?: string; returnTo?: 'AddEditProduct' } | undefined;
  HelpCenter: undefined;
  HelpTutorial: { tutorialId: string };
};

type NavProp = NativeStackNavigationProp<AppStackParamList>;

const Stack = createNativeStackNavigator<AppStackParamList>();

// --- Wrapper : écran principal avec barre de navigation inférieure ---
function withTabBar<K extends keyof AppStackParamList>(
  // Les écrans tab définissent leur propre type `navigation` (sous-ensemble de NavProp,
  // ex. { navigate, goBack }). On accepte un ComponentType large pour éviter une
  // inadéquation de surcharges navigate(route, params) entre NavProp et les props écran.
  Screen: React.ComponentType<any>,
  routeName: K,
) {
  return function Wrapped(props: { navigation: NavProp; route: any }) {
    const insets = useSafeAreaInsets();
    return (
      <View style={styles.tabScreen}>
        <View style={{ flex: 1 }}>
          <Screen {...props} />
        </View>
        <BottomTabBar navigation={props.navigation} currentRoute={routeName as string} />
        <View style={{ height: 0, backgroundColor: colors.surface }} />
      </View>
    );
  };
}

const HomeTab = withTabBar(HomeScreen, 'Home');
const SearchTab = withTabBar(SearchScreen, 'Search');
const CartTab = withTabBar(CartScreen, 'Cart');
const MessagesTab = withTabBar(ConversationListScreen, 'ConversationList');
const ProfileTab = withTabBar(ProfileScreen, 'Profile');

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Auth */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />

      {/* Écrans principaux avec tab bar */}
      <Stack.Screen name="Home" component={HomeTab} />
      <Stack.Screen name="Search" component={SearchTab} />
      <Stack.Screen name="Cart" component={CartTab} />
      <Stack.Screen name="ConversationList" component={MessagesTab} />
      <Stack.Screen name="Profile" component={ProfileTab} />

      {/* Écrans secondaires (sans tab bar) */}
      <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />

      {/* Notifications & IA */}
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} />
      <Stack.Screen name="AIProductAssistant" component={AIProductAssistantScreen} />

      {/* Croissance */}
      <Stack.Screen name="ShareableShop" component={ShareableShopScreen} />
      <Stack.Screen name="ReferralProgram" component={ReferralProgramScreen} />
      <Stack.Screen name="ShareLinkManagement" component={ShareLinkManagementScreen} />
      <Stack.Screen name="CampaignAnalytics" component={CampaignAnalyticsScreen} />

      {/* Livraison intra-plateforme */}
      <Stack.Screen name="DriverSearch" component={DriverSearchScreen} />
      <Stack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
      <Stack.Screen name="DeliveryPayment" component={DeliveryPaymentScreen} />
      <Stack.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} />
      <Stack.Screen name="SellerDeliveries" component={SellerDeliveriesScreen} />
      <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
      <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />

      {/* Vendeur */}
      <Stack.Screen name="CreateShop" component={CreateShopScreen} />
      <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
      <Stack.Screen name="ProductManagement" component={ProductManagementScreen} />
      <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
      <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
      <Stack.Screen name="SellerStats" component={SellerStatsScreen} />
      <Stack.Screen name="Promotions" component={PromotionsScreen} />
      <Stack.Screen name="PromotionHub" component={PromotionHubScreen} />
      <Stack.Screen name="DiscountCodeManagement" component={DiscountCodeManagementScreen} />

      {/* Admin */}
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="ShopValidation" component={ShopValidationScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />

      {/* Studio photo/vidéo & aide */}
      <Stack.Screen name="PhotoStudio" component={PhotoStudioScreen} />
      <Stack.Screen name="ProductVideoPicker" component={ProductVideoPickerScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="HelpTutorial" component={HelpTutorialScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabScreen: { flex: 1, backgroundColor: colors.background },
});
