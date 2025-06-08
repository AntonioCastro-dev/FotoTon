import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const registerSchema = Yup.object().shape({
    name: Yup.string()
      .required('El nombre es obligatorio')
      .min(3, 'Mínimo 3 caracteres')
      .max(50, 'Máximo 50 caracteres'),
    email: Yup.string()
      .email('Correo inválido')
      .required('El correo es obligatorio'),
    password: Yup.string()
      .min(6, 'Mínimo 6 caracteres')
      .required('La contraseña es obligatoria')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{6,})/,
        'Debe contener al menos una mayúscula, una minúscula y un número'
      ),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Las contraseñas deben coincidir')
      .required('Confirma tu contraseña'),
  });

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      // Crear usuario en Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      // Guardar información adicional en Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: values.name,
        email: values.email,
        role: 'user', // Por defecto todos son usuarios normales
        createdAt: new Date(),
        photoURL: '', // Foto de perfil vacía por defecto
        votesThisMonth: 0, // Contador de votos
        photosUploaded: 0, // Contador de fotos subidas
      });

      Alert.alert(
        'Registro exitoso',
        '¡Bienvenido/a al Rally Fotográfico!',
        [{ text: 'OK', onPress: () => navigation.replace('Inicio') }]
      );
    } catch (error) {
      let errorMessage = 'Ocurrió un error al registrarse';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este correo ya está registrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Correo electrónico inválido';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es demasiado débil';
          break;
        default:
          errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro</Text>
      
      <Formik
        initialValues={{ name: '', email: '', password: '', confirmPassword: '' }}
        validationSchema={registerSchema}
        onSubmit={handleRegister}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Icon name="person" size={20} color="#666" style={styles.icon} />
              <TextInput
                placeholder="Nombre completo"
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                value={values.name}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
            {touched.name && errors.name && (
              <Text style={styles.error}>{errors.name}</Text>
            )}

            <View style={styles.inputContainer}>
              <Icon name="email" size={20} color="#666" style={styles.icon} />
              <TextInput
                placeholder="Correo electrónico"
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                value={values.email}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {touched.email && errors.email && (
              <Text style={styles.error}>{errors.email}</Text>
            )}

            <View style={styles.inputContainer}>
              <Icon name="lock" size={20} color="#666" style={styles.icon} />
              <TextInput
                placeholder="Contraseña"
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                value={values.password}
                secureTextEntry
                style={styles.input}
              />
            </View>
            {touched.password && errors.password && (
              <Text style={styles.error}>{errors.password}</Text>
            )}

            <View style={styles.inputContainer}>
              <Icon name="lock-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                placeholder="Confirmar contraseña"
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                value={values.confirmPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>
            {touched.confirmPassword && errors.confirmPassword && (
              <Text style={styles.error}>{errors.confirmPassword}</Text>
            )}

            {loading ? (
              <ActivityIndicator size="large" color="#00BF63" style={styles.loader} />
            ) : (
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Registrarse</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.loginLink} 
              onPress={() => navigation.navigate('LoginScreen')}
            >
              <Text style={styles.loginText}>
                ¿Ya tienes una cuenta? <Text style={styles.loginTextBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Formik>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00BF63',
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
  },
  error: {
    color: 'red',
    marginBottom: 10,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#00BF63',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: '#666',
  },
  loginTextBold: {
    fontWeight: 'bold',
    color: '#00BF63',
  },
});

export default RegisterScreen;