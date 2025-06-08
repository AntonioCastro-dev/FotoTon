import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

// Screens
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AdminPanel from "../screens/AdminPanel";
import MyPhotosScreen from "../screens/MyPhotosScreen";

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          const docRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(docRef);

          if (userDoc.exists()) {
            setRole(userDoc.data().role || "user"); // Default a 'user' si no hay rol
          } else {
            // Si no existe el documento, crearlo con valores por defecto
            await setDoc(docRef, {
              name: currentUser.displayName || "",
              email: currentUser.email,
              role: "user",
              createdAt: new Date(),
              photoURL: currentUser.photoURL || "",
              votesThisMonth: 0,
              photosUploaded: 0,
            });
            setRole("user");
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Error en auth state:", error);
        setRole("user"); // Default seguro
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BF63" />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#00BF63",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Inicio") {
            iconName = "home";
          } else if (route.name === "Mis Fotos") {
            iconName = "photo-library";
          } else if (route.name === "Administrar") {
            iconName = "admin-panel-settings";
          } else if (route.name === "Perfil") {
            iconName = "person";
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarLabel: "Inicio",
        }}
      />

      {role === "user" && (
        <Tab.Screen
          name="Mis Fotos"
          component={MyPhotosScreen}
          options={{
            tabBarLabel: "Mis Fotos",
          }}
        />
      )}

      {role === "admin" && (
        <Tab.Screen
          name="Administrar"
          component={AdminPanel}
          options={{
            tabBarLabel: "Administrar",
          }}
        />
      )}

      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Perfil",
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  tabBar: {
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
});

export default BottomTabs;