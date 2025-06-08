import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { auth, db } from "../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useIsFocused } from "@react-navigation/native";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const HomeScreen = ({ navigation }) => {
  const [photos, setPhotos] = useState([]);
  const [currentTheme, setCurrentTheme] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userVotes, setUserVotes] = useState(0);
  const [userRole, setUserRole] = useState("user");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const isFocused = useIsFocused();

  // Obtener el mes y año actual
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Función para obtener el tema del mes
  const getMonthlyTheme = async () => {
    try {
      const monthlyThemeRef = doc(
        db,
        "monthly_themes",
        `${currentYear}-${currentMonth}`
      );
      const docSnap = await getDoc(monthlyThemeRef);

      if (docSnap.exists()) {
        setCurrentTheme(docSnap.data().theme);
      } else {
        setCurrentTheme("Tema libre");
      }
    } catch (error) {
      console.error("Error obteniendo tema:", error);
      setCurrentTheme("Tema libre");
    }
  };

  // Función para cargar las fotos
  const loadPhotos = async () => {
    try {
      setLoading(true);
      await getMonthlyTheme();

      const q = query(
        collection(db, "photos_base64"),
        where("month", "==", currentMonth),
        where("year", "==", currentYear)
      );

      const querySnapshot = await getDocs(q);
      let photosData = [];

      querySnapshot.forEach((doc) => {
        photosData.push({ id: doc.id, ...doc.data() });
      });

      // Filtrar fotos según el rol del usuario
      if (userRole !== "admin") {
        photosData = photosData.filter((photo) => !photo.pending); // Solo fotos aprobadas
      }

      // Ordenar por voteCount (descendente)
      photosData.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
      setPhotos(photosData);

      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || "user");
          setUserVotes(userDoc.data().votesThisMonth || 0);
        }
      }
    } catch (error) {
      console.error("Error cargando fotos:", error);
      Alert.alert("Error", "No se pudieron cargar las fotos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadPhotos();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPhotos();
  };

  // Manejar el sistema de voto de una foto
  const handleVote = async (photoId, userId) => {
    if (!auth.currentUser) {
      Alert.alert("Error", "Debes iniciar sesión para votar");
      return;
    }

    if (auth.currentUser.uid === userId) {
      Alert.alert("Oops!", "No puedes votar tu propia foto");
      return;
    }

    if (userVotes >= 3) {
      Alert.alert("Límite alcanzado", "Solo puedes votar 3 fotos por mes");
      return;
    }

    // Verificar si el usuario ya ha votado por esta foto
    try {
      setLoading(true);
      const photoRef = doc(db, "photos_base64", photoId);
      const photoDoc = await getDoc(photoRef);
      const userHasVoted = photoDoc.data().votes?.includes(auth.currentUser.uid) || false;

      if (userHasVoted) {
        await updateDoc(photoRef, {
          votes: arrayRemove(auth.currentUser.uid),
          voteCount: (photoDoc.data().voteCount || 0) - 1,
        });
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
          votesThisMonth: userVotes - 1,
          votedPhotos: arrayRemove(photoId),
        });
      } else {
        await updateDoc(photoRef, {
          votes: arrayUnion(auth.currentUser.uid),
          voteCount: (photoDoc.data().voteCount || 0) + 1,
        });
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
          votesThisMonth: userVotes + 1,
          votedPhotos: arrayUnion(photoId),
        });
      }

      await loadPhotos();
    } catch (error) {
      console.error("Error votando:", error);
      Alert.alert("Error", "No se pudo registrar tu voto");
    } finally {
      setLoading(false);
    }
  };

  // Manejar la aceptación, rechazo y eliminación de fotos
  // Solo los administradores pueden aceptar o rechazar fotos
  const handleAcceptPhoto = async (photoId) => {
    try {
      setLoading(true);
      const photoRef = doc(db, "photos_base64", photoId);
      await updateDoc(photoRef, { pending: false });
      await loadPhotos();
      Alert.alert("Foto aceptada", "La foto ahora es visible para todos los usuarios");
    } catch (error) {
      console.error("Error aceptando foto:", error);
      Alert.alert("Error", "No se pudo aceptar la foto");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPhoto = async (photoId) => {
    Alert.alert(
      "Confirmar rechazo",
      "¿Estás seguro de que quieres rechazar y eliminar esta foto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, "photos_base64", photoId));
              await loadPhotos();
              Alert.alert("Foto rechazada", "La foto ha sido eliminada");
            } catch (error) {
              console.error("Error rechazando foto:", error);
              Alert.alert("Error", "No se pudo rechazar la foto");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeletePhoto = async (photoId) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que quieres eliminar esta foto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, "photos_base64", photoId));
              await loadPhotos();
              Alert.alert("Foto eliminada", "La foto se ha eliminado correctamente");
            } catch (error) {
              console.error("Error eliminando foto:", error);
              Alert.alert("Error", "No se pudo eliminar la foto");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return "";
    return format(timestamp.toDate(), "d 'de' MMMM yyyy", { locale: es });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.photoContainer, item.pending && styles.pendingContainer]}
      onPress={() => {
        setSelectedPhoto(item);
        setModalVisible(true);
      }}
    >
      <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.photo} />
      <View style={styles.photoInfo}>
        <Text style={styles.photoTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {userRole === "admin" ? (
          item.pending ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptPhoto(item.id)}
              >
                <Icon name="check" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectPhoto(item.id)}
              >
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePhoto(item.id)}
            >
              <Icon name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(item.id, item.userID)}
            disabled={userVotes >= 3 || auth.currentUser?.uid === item.userID}
          >
            <Icon
              name="favorite"
              size={20}
              color={item.votes?.includes(auth.currentUser?.uid) ? "#fff" : "#800000"}
            />
            <Text style={styles.voteCount}>{item.voteCount || 0}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthText}>
          {format(today, "MMMM yyyy", { locale: es }).toUpperCase()}
        </Text>
        <Text style={styles.themeText}>Tema: {currentTheme}</Text>
      </View>

      {loading && photos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BF63" />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="photo-camera" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No hay fotos este mes</Text>
          <Text style={styles.emptySubText}>
            Sé el primero en subir una foto
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#00BF63"]}
            />
          }
        />
      )}
      {/* Modal para mostrar detalles de la foto */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedPhoto && (
          <ScrollView style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={30} color="#000" />
            </TouchableOpacity>

            <Image
              source={{ uri: `data:image/jpeg;base64,${selectedPhoto.imageBase64}` }}
              style={styles.modalImage}
              resizeMode="contain"
            />

            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedPhoto.title}</Text>
              <Text style={styles.modalAuthor}>
                Por: {selectedPhoto.userName}
              </Text>
              <Text style={styles.modalDate}>
                Subida el: {formatDate(selectedPhoto.createdAt)}
              </Text>

              <View style={styles.modalVotes}>
                <Icon name="favorite" size={24} color="#00BF63" />
                <Text style={styles.modalVoteCount}>
                  {selectedPhoto.voteCount || 0} votos
                </Text>
              </View>

              <Text style={styles.modalDescription}>
                {selectedPhoto.description || "Sin descripción"}
              </Text>

              {userRole === "admin" ? (
                selectedPhoto.pending ? (
                  <View style={styles.modalActionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => {
                        handleAcceptPhoto(selectedPhoto.id);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Aceptar Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => {
                        handleRejectPhoto(selectedPhoto.id);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Rechazar Foto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      handleDeletePhoto(selectedPhoto.id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Eliminar Foto</Text>
                  </TouchableOpacity>
                )
              ) : (
                auth.currentUser?.uid !== selectedPhoto.userID && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleVote(selectedPhoto.id, selectedPhoto.userID)}
                    disabled={
                      userVotes >= 3 ||
                      selectedPhoto.votes?.includes(auth.currentUser?.uid)
                    }
                  >
                    <Text style={styles.actionButtonText}>
                      {selectedPhoto.votes?.includes(auth.currentUser?.uid)
                        ? "Ya votaste esta foto"
                        : userVotes >= 3
                        ? "Límite de votos"
                        : "Votar esta foto"}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  monthText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00BF63",
    textAlign: "center",
  },
  themeText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  listContent: {
    padding: 10,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  photoContainer: {
    width: "48%",
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    elevation: 2,
  },
  pendingContainer: {
    backgroundColor: "#fff9c4", // Fondo amarillo claro para fotos pendientes
  },
  photo: {
    width: "100%",
    aspectRatio: 1,
  },
  photoInfo: {
    padding: 10,
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  voteButton: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#dc3545",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 5,
  },
  deleteButton: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#dc3545",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
  },
  acceptButton: {
    backgroundColor: "#28a745",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  rejectButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  voteCount: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
    padding: 5,
  },
  modalImage: {
    width: "100%",
    height: 300,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  modalAuthor: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  modalDate: {
    fontSize: 14,
    color: "#999",
    marginBottom: 15,
  },
  modalVotes: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  modalVoteCount: {
    fontSize: 18,
    marginLeft: 10,
    color: "#00BF63",
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: "#00BF63",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  modalActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  acceptButton: {
    backgroundColor: "#28a745",
    flex: 1,
    marginRight: 10,
  },
  rejectButton: {
    backgroundColor: "#dc3545",
    flex: 1,
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default HomeScreen;