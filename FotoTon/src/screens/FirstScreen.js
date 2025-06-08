import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const FirstScreen = () => {
  const navigation = useNavigation();

  const handleLoginPress = () => {
    navigation.navigate('LoginScreen');
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <TouchableOpacity style={styles.button} onPress={handleLoginPress}>
        <Text style={styles.buttonText}>Iniciar Sesión</Text>
      </TouchableOpacity>
      <Text style={styles.footerText}>Trabajo realizado por Antonio Castro 2ºDAM</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    padding: 20,
  },
  logo: {
    width: 500,
    height: 500,
    resizeMode: 'contain',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#00BF63',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  footerText: {
    fontSize: 14,
    color: '#00BF63',
    textAlign: 'center',
    position: 'absolute',
    bottom: 40,
  },
});

export default FirstScreen;