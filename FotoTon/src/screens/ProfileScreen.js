import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { auth } from "../services/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useIsFocused } from "@react-navigation/native";

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [approvedPhotosCount, setApprovedPhotosCount] = useState(0);
  const [pendingPhotosCount, setPendingPhotosCount] = useState(0);
  const isFocused = useIsFocused();

  //Cargar datos del usuario desde Firestore
  // y contar fotos aprobadas y pendientes si es admin
  const fetchUserData = async () => {
    if (auth.currentUser) {
      setLoading(true);
      const userRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserData(userData);
        setFormData({
          name: userData.name || "",
        });

        if (userData.role === "admin") {
          const photosQuery = query(collection(db, "photos_base64"));
          const querySnapshot = await getDocs(photosQuery);
          let approvedCount = 0;
          let pendingCount = 0;
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.pending === false) approvedCount++;
            if (data.pending === true) pendingCount++;
          });
          setApprovedPhotosCount(approvedCount);
          setPendingPhotosCount(pendingCount);
        }
      }
      setLoading(false);
    }
  };
  // Cargar datos del usuario al iniciar la pantalla
  // y cada vez que el usuario se enfoque en la pantalla
  useEffect(() => {
    if (isFocused) {
      fetchUserData();
    }
  }, [isFocused, auth.currentUser]);

  // Actualizar datos del usuario
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        name: formData.name,
      });

      setUserData({ ...userData, ...formData });
      setEditing(false);
      Alert.alert(
        "Perfil actualizado",
        "Tus cambios se guardaron correctamente"
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el perfil: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar cuenta del usuario y sus datos de Firestore
  // Se solicita confirmacion antes
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const user = auth.currentUser;

              //elimina datos de Firestore
              await deleteDoc(doc(db, "users", user.uid));

              //elimina al cuenta de Authentication
              await user.delete();

              setLoading(false);
            } catch (error) {
              Alert.alert(
                "Error",
                "No se pudo eliminar la cuenta: " + error.message
              );
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Cerrar sesión del usuario
  const handleLogout = async () => {
    try {
      setLoading(true);
      await auth.signOut();
      setLoading(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo cerrar sesión: " + error.message);
      setLoading(false);
    }
  };

  if (loading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BF63" />
      </View>
    );
  }

  // Verifica si el usuario es administrador
  const isAdmin = userData?.role === "admin";

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.profileImagePlaceholder,
            isAdmin && { backgroundColor: "#2225c7" },
          ]}
        >
          <Icon
            name={isAdmin ? "shield" : "person"} // Cambia el icono si es admin
            size={50}
            color="#fff"
          />
        </View>

        {editing ? (
          <>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Nombre"
            />
          </>
        ) : (
          <>
            <Text style={styles.userName}>{userData?.name}</Text>
            <Text style={styles.userEmail}>{userData?.email}</Text>
          </>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {isAdmin ? approvedPhotosCount : userData?.photosUploadedBase64 || 0}
          </Text>
          <Text style={styles.statLabel}>
            {isAdmin ? "Fotos Aprobadas" : "Fotos"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {isAdmin ? pendingPhotosCount : userData?.votesThisMonth || 0}
          </Text>
          <Text style={styles.statLabel}>
            {isAdmin ? "Fotos Pendientes" : "Votos"}
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        {editing && !isAdmin ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Guardar Cambios</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setEditing(false)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        ) : (
          !isAdmin && (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.buttonText}>Editar Perfil</Text>
            </TouchableOpacity>
          )
        )}

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {!isAdmin && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteAccount}                   // Solo visible para usuarios no admin
          >
            <Text style={styles.buttonText}>Eliminar Cuenta</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingTop: 50,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#00BF63",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00BF63",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  actionsContainer: {
    width: "100%",
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: "#00BF63",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  logoutButton: {
    backgroundColor: "#FF9800",
  },
  deleteButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ProfileScreen;