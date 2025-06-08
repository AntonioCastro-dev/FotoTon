import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Formik } from "formik";
import * as yup from "yup";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import Icon from "react-native-vector-icons/MaterialIcons";

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const loginValidationSchema = yup.object().shape({
    email: yup.string().email("Email inválido").required("Campo obligatorio"),
    password: yup
      .string()
      .min(6, "Mínimo 6 caracteres")
      .required("Campo obligatorio"),
  });

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // La navegación se manejará automáticamente con onAuthStateChanged
    } catch (error) {
      let errorMessage = "Error al iniciar sesión";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "Usuario no registrado";
          break;
        case "auth/wrong-password":
          errorMessage = "Contraseña incorrecta";
          break;
        // Agrega más casos según necesites
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={loginValidationSchema}
        onSubmit={handleLogin}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
        }) => (
          <>
            <View style={styles.inputContainer}>
              <Icon name="email" size={20} color="#666" style={styles.icon} />
              <TextInput
                placeholder="Email"
                style={styles.input}
                onChangeText={handleChange("email")}
                onBlur={handleBlur("email")}
                value={values.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && touched.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            <View style={styles.inputContainer}>
              <Icon name="lock" size={20} color="#666" style={styles.icon} />
              <TextInput
                placeholder="Contraseña"
                style={styles.input}
                onChangeText={handleChange("password")}
                onBlur={handleBlur("password")}
                value={values.password}
                secureTextEntry={secureTextEntry}
              />
              <TouchableOpacity
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              >
                <Icon
                  name={secureTextEntry ? "visibility-off" : "visibility"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password && touched.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            {loading ? (
              <ActivityIndicator size="large" color="#00BF63" />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Entrar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.registerContainer}
              onPress={() => navigation.navigate("RegisterScreen")}
            >
              <Text style={styles.registerText}>
                ¿No tienes cuenta?{" "} <Text style={styles.registerTextBold}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Formik>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 300,
    paddingHorizontal: 20,
  },
  innerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00BF63",
    marginBottom: 30,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
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
    color: "#333",
  },
  error: {
    color: "red",
    marginBottom: 10,
    fontSize: 12,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#00BF63",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#00BF63",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    color: "#666",
  },
  registerTextBold: {
    fontWeight: 'bold',
    color: '#00BF63',
  },
});

export default LoginScreen;
