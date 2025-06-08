import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AdminPanel = () => {
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photoLimit, setPhotoLimit] = useState(3);
  const [photoRanking, setPhotoRanking] = useState([]);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Verificamos si el usuario es administrador y obtenemos el tema del mes y el limite de fotos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Verificamos si el usuario esta autenticado
        if (!auth.currentUser) {
          Alert.alert('Error', 'Debes iniciar sesión para acceder a este panel');
          setLoading(false);
          return;
        }

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          Alert.alert('Error', 'No se encontró el usuario en la base de datos');
          setLoading(false);
          return;
        }

        // Verificamos el rol del usuario
        const userData = userDoc.data();
        if (userData.role !== 'admin') {
          Alert.alert('Acceso denegado', 'Solo los administradores pueden acceder a este panel');
          setLoading(false);
          return;
        }
        setIsAdmin(true);

        // Obtenemos el tema del mes actual
        const monthlyThemeRef = doc(db, 'monthly_themes', `${currentYear}-${currentMonth}`);
        const themeDoc = await getDoc(monthlyThemeRef);
        if (themeDoc.exists()) {
          setTheme(themeDoc.data().theme || '');
        } else {
          setTheme('');
        }

        // Obtenemos el lmite de fotos desde la configuracion de la aplicacion
        const configRef = doc(db, 'app_settings', 'config');
        const configDoc = await getDoc(configRef);
        if (configDoc.exists()) {
          setPhotoLimit(configDoc.data().photoLimit || 3);
        }

        // Obtenemos el ranking de fotos del mes actual
        const photosSnapshot = await getDocs(collection(db, 'photos_base64'));
        const rankingData = [];
        photosSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.month === currentMonth && data.year === currentYear) {
            rankingData.push({
              id: doc.id,
              title: data.title,
              userName: data.userName || 'Usuario desconocido',
              voteCount: data.voteCount || 0,
              pending: data.pending || false, // Incluimos el campo pending
            });
          }
        });

        rankingData.sort((a, b) => b.voteCount - a.voteCount);
        setPhotoRanking(rankingData);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos. Verifica los permisos.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  //Funcion para guardar el tema del mes
  const saveTheme = async () => {
    if (!isAdmin) {
      Alert.alert('Acceso denegado', 'Solo los administradores pueden modificar el tema');
      return;
    }

    if (!theme.trim()) {
      Alert.alert('Error', 'Por favor, ingresa un tema válido');
      return;
    }

    try {
      setLoading(true);
      const monthlyThemeRef = doc(db, 'monthly_themes', `${currentYear}-${currentMonth}`);
      await setDoc(monthlyThemeRef, {
        theme,
        active: true,
        createdAt: new Date(),
        month: currentMonth,
        year: currentYear,
      }, { merge: true });
      Alert.alert('Éxito', 'Tema guardado correctamente');
    } catch (error) {
      console.error('Error saving theme:', error);
      Alert.alert('Error', 'No se pudo guardar el tema. Verifica los permisos.');
    } finally {
      setLoading(false);
    }
  };

  //Funcion para guardar el límite de fotos
  const savePhotoLimit = async () => {
    if (!isAdmin) {
      Alert.alert('Acceso denegado', 'Solo los administradores pueden modificar el límite de fotos');
      return;
    }

    // Comprueba que el limite sea un número valido
    const newLimit = parseInt(photoLimit, 10);
    if (isNaN(newLimit) || newLimit < 0) {
      Alert.alert('Error', 'Por favor, ingresa un número válido para el límite');
      return;
    }

    try {
      setLoading(true);

      const configRef = doc(db, 'app_settings', 'config');
      await setDoc(configRef, { photoLimit: newLimit }, { merge: true });

      const photosSnapshot = await getDocs(collection(db, 'photos_base64'));
      const photosData = [];
      photosSnapshot.forEach((doc) => {
        const data = doc.data();
        photosData.push({ id: doc.id, userID: data.userID, createdAt: data.createdAt });
      });

      const userPhotos = {};
      photosData.forEach((photo) => {
        if (!userPhotos[photo.userID]) userPhotos[photo.userID] = [];
        userPhotos[photo.userID].push(photo);
      });

      for (const userID in userPhotos) {
        const userPhotosList = userPhotos[userID].sort((a, b) => b.createdAt - a.createdAt);
        if (userPhotosList.length > newLimit) {
          const photosToDelete = userPhotosList.slice(newLimit);
          for (const photo of photosToDelete) {
            await deleteDoc(doc(db, 'photos_base64', photo.id));
          }
        }
      }

      const updatedPhotosSnapshot = await getDocs(collection(db, 'photos_base64'));
      const updatedRankingData = [];
      updatedPhotosSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.month === currentMonth && data.year === currentYear) {
          updatedRankingData.push({
            id: doc.id,
            title: data.title,
            userName: data.userName || 'Usuario desconocido',
            voteCount: data.voteCount || 0,
            pending: data.pending || false, // Incluimos el campo pending
          });
        }
      });
      updatedRankingData.sort((a, b) => b.voteCount - a.voteCount);
      setPhotoRanking(updatedRankingData);

      Alert.alert('Éxito', `Límite de fotos actualizado a ${newLimit}. Fotos excedentes eliminadas si las había.`);
    } catch (error) {
      console.error('Error saving photo limit:', error);
      Alert.alert('Error', 'No se pudo guardar el límite de fotos.');
    } finally {
      setLoading(false);
    }
  };

  const renderRankingItem = ({ item, index }) => (
    <View style={[styles.rankingItem, item.pending && styles.pendingContainer]}>
      <View style={styles.rankingPosition}>
        <Text style={styles.positionText}>{index + 1}</Text>
      </View>
      <View style={styles.rankingInfo}>
        <Text style={styles.rankingTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rankingUser}>Por: {item.userName}</Text>
      </View>
      <View style={styles.rankingVotes}>
        <Icon name="favorite" size={20} color="#dc3545" />
        <Text style={styles.votesText}>{item.voteCount}</Text>
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

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Acceso Denegado</Text>
        <Text style={styles.emptyText}>Solo los administradores pueden acceder a este panel.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Definir Tema del Mes</Text>
        <TextInput
          style={styles.input}
          value={theme}
          onChangeText={setTheme}
          placeholder="Ingrese el tema del mes"
        />
        <TouchableOpacity style={styles.button} onPress={saveTheme} disabled={loading}>
          <Text style={styles.buttonText}>Guardar Tema</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Límite de Fotos por Usuario</Text>
        <TextInput
          style={styles.input}
          value={photoLimit.toString()}
          onChangeText={setPhotoLimit}
          placeholder="Ingrese el límite (ej. 3)"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.button} onPress={savePhotoLimit} disabled={loading}>
          <Text style={styles.buttonText}>Guardar Límite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ranking de Fotos</Text>
        <FlatList
          data={photoRanking}
          renderItem={renderRankingItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay fotos este mes</Text>}
        />
      </View>
    </View>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#00BF63',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
  },
  pendingContainer: {
    backgroundColor: '#fff9c4', // Fondo amarillo claro para fotos pendientes
  },
  rankingPosition: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00BF63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  positionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  rankingUser: {
    fontSize: 14,
    color: '#666',
  },
  rankingVotes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  votesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    marginLeft: 5,
  },
});

export default AdminPanel;