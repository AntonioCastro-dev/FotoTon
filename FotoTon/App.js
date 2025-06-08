import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/services/firebase';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import BottomTabs from './src/navigation/BottomTabs';
import FirstScreen from './src/screens/FirstScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (initializing) setInitializing(false);
      });
      return () => unsubscribe();
    }, 300);

    return () => clearTimeout(timer);
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BF63" />
        <Text style={styles.loadingText}>Inicializando aplicación...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: styles.header,
          headerTintColor: '#fff',
          headerTitleStyle: styles.headerTitle,
          headerBackTitleVisible: false
        }}
      >
        {user ? (
          <Stack.Screen
            name="MainApp"
            component={BottomTabs}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="FirstScreen"
              component={FirstScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="LoginScreen"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RegisterScreen"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#00BF63'
  },
  header: {
    backgroundColor: '#00BF63',
    elevation: 0,
    shadowOpacity: 0
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18
  }
});

export default App;