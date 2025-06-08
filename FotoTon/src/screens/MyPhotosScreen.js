import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { auth, db } from '../services/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';

const MyPhotosScreen = () => {
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('user');

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Cargar fotos del usuario al iniciar la pantalla
  // y obtener el rol del usuario
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        if (!auth.currentUser) {
          Alert.alert('Error', 'Debes iniciar sesión para ver tus fotos');
          setLoading(false);
          return;
        }

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || 'user');
        }

        const q = query(
          collection(db, 'photos_base64'),
          where('userID', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const photosList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          photosList.push({ id: doc.id, ...data });
        });
        setPhotos(photosList);
      } catch (error) {
        console.error('Error fetching photos:', error);
        Alert.alert('Error', 'No se pudieron cargar las fotos');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  // Permiso para acceder a la galería y seleccionar una imagen
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería');
      return;
    }
    // Abrir la galería para seleccionar una imagen
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    // Verificar si se seleccionó una imagen 
    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`); // Guardar la imagen en formato base64
    }
  };

  // Subir la foto a Firestore
  const uploadPhoto = async () => {
    //Validaciones antes de subir la foto
    if (!auth.currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para subir fotos');
      return;
    }

    if (!image) {
      Alert.alert('Error', 'Por favor, selecciona una imagen');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Por favor, ingresa un título');
      return;
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);
    const photosUploaded = userDoc.data().photosUploadedBase64 || 0;

    const configRef = doc(db, 'app_settings', 'config');
    const configDoc = await getDoc(configRef);
    const photoLimit = configDoc.exists() ? configDoc.data().photoLimit || 3 : 3;

    // Comprueba si ha llegado al límite de fotos subidas
    if (photosUploaded >= photoLimit) {
      Alert.alert('Límite alcanzado', `Solo puedes subir un máximo de ${photoLimit} fotos`);
      return;
    }

    // Comienza la subida de la foto
    setUploading(true);
    try {
      const base64String = image.replace('data:image/jpeg;base64,', ''); // Elimina el prefijo de tipo MIME para almacenar solo la cadena base64
      // Crea un nuevo documento en la colección 'photos_base64'
      const photoRef = await addDoc(collection(db, 'photos_base64'), {
        createdAt: new Date(),
        description: description || '',
        imageBase64: base64String,
        month: currentMonth,
        title,
        userID: auth.currentUser.uid,
        userName: userDoc.data().name || userDoc.data().email,
        voteCount: 0,
        votes: [],
        year: currentYear,
        pending: userRole === 'admin' ? false : true,
      });

      // Actualiza el contador de fotos subidas del usuario
      await updateDoc(userRef, {
        photosUploadedBase64: photosUploaded + 1,
      });

      setTitle('');
      setDescription('');
      setImage(null);
      Alert.alert('Éxito', userRole === 'admin' ? 'Foto subida correctamente' : 'Foto subida correctamente. Está pendiente de aprobación.');
      setPhotos([...photos, { id: photoRef.id, title, description, imageBase64: base64String, voteCount: 0, votes: [], pending: userRole === 'admin' ? false : true }]);
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', `No se pudo subir la foto: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Eliminar una foto
  // Se solicita confirmación antes de eliminar
  const deletePhoto = async (photoId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, 'photos_base64', photoId));

              const userRef = doc(db, 'users', auth.currentUser.uid);
              const userDoc = await getDoc(userRef);
              const photosUploaded = userDoc.data().photosUploadedBase64 || 0;

              await updateDoc(userRef, {
                photosUploadedBase64: photosUploaded - 1,
              });

              setPhotos(photos.filter((photo) => photo.id !== photoId));
              Alert.alert('Éxito', 'Foto eliminada correctamente');
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'No se pudo eliminar la foto');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Renderiza cada foto en la lista
  // Incluye título, descripción, imagen y botón de eliminar
  const renderPhoto = ({ item }) => (
    <View style={styles.photoContainer}>
      <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.photo} />
      <View style={styles.photoInfo}>
        <Text style={styles.photoTitle}>{item.title}</Text>
        <Text style={styles.photoDescription} numberOfLines={2}>
          {item.description || 'Sin descripción'}
        </Text>
        {item.pending && (
          <Text style={styles.pendingText}>Pendiente de aprobación</Text>
        )}
        <View style={styles.photoActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deletePhoto(item.id)}
            disabled={loading}
          >
            <Icon name="delete" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BF63" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subir Nueva Foto</Text>

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="add-a-photo" size={40} color="#999" />
            <Text style={styles.imagePlaceholderText}>Selecciona una imagen</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Título de la foto"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Descripción (opcional)"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity
        style={[styles.uploadButton, uploading && styles.disabledButton]}
        onPress={uploadPhoto}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>Subir Foto</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Mis Fotos Subidas</Text>
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No has subido fotos todavía</Text>} // Muestra un mensaje si no hay fotos
        scrollEnabled={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#00BF63',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  uploadButton: {
    backgroundColor: '#00BF63',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#b0a0ff',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  photoContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  photo: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  photoInfo: {
    padding: 10,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  photoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pendingText: {
    fontSize: 14,
    color: '#ff9800',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 5,
    borderRadius: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
});

export default MyPhotosScreen;