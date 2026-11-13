import React, { useState } from 'react';
import { View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Manrope_500Medium, Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import TabBar from './src/components/TabBar';
import { AuthProvider } from './src/context/AuthContext';
import { signIn } from './src/data/api';
import { Member } from './src/data/types';
import ApplicationStatusScreen from './src/screens/ApplicationStatusScreen';
import ApplyLoanScreen from './src/screens/ApplyLoanScreen';
import DepositsScreen from './src/screens/DepositsScreen';
import LoanDetailsScreen from './src/screens/LoanDetailsScreen';
import LoansScreen from './src/screens/LoansScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import RiskScoreScreen from './src/screens/RiskScoreScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import StatementsScreen from './src/screens/StatementsScreen';
import { colors } from './src/theme/theme';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.canvas, card: colors.canvas, text: colors.ink, border: colors.line },
};

// Everything a signed-in member sees. Detail screens (ApplyLoan, LoanDetails and so on)
// sit in the same navigator so the bottom bar behaves exactly as in the designs.
function MemberApp() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      backBehavior="history"
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Deposits" component={DepositsScreen} />
      <Tab.Screen name="Loans" component={LoansScreen} />
      <Tab.Screen name="Statements" component={StatementsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="ApplyLoan" component={ApplyLoanScreen} />
      <Tab.Screen name="ApplicationStatus" component={ApplicationStatusScreen} />
      <Tab.Screen name="LoanDetails" component={LoanDetailsScreen} />
      <Tab.Screen name="RiskScore" component={RiskScoreScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    InstrumentSerif_400Regular,
  });
  const [member, setMember] = useState<Member | null>(null);
  const [offline, setOffline] = useState(false);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  const handleSignIn = async (email: string, password: string) => {
    setMember(await signIn(email, password));
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer theme={navTheme}>
        {member ? (
          <AuthProvider
            value={{
              member,
              signOut: () => {
                setMember(null);
                setOffline(false);
              },
              offline,
              toggleOffline: () => setOffline((v) => !v),
            }}
          >
            <MemberApp />
          </AuthProvider>
        ) : (
          <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
            <AuthStack.Screen name="SignIn">
              {(props) => <SignInScreen {...props} onSignIn={handleSignIn} />}
            </AuthStack.Screen>
            <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <AuthStack.Screen name="SignUp">
              {(props) => <SignUpScreen {...props} onActivated={setMember} />}
            </AuthStack.Screen>
          </AuthStack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
