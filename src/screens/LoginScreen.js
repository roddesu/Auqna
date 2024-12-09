import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Function to validate the email format
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@ub\.edu\.ph$/; // Adjust for UB mail format
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Failed', 'Please enter both email and password.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid UB email address.');
      return;
    }

    try {
      // Send the plain password to the server
      const response = await axios.post('http://192.168.1.3:3001/login', {
        email,
        password, // Send the plain password for comparison
      });

      if (response.data.success) {
        // Store the user data in AsyncStorage
        await AsyncStorage.setItem('loggedInUser', JSON.stringify(response.data.user));

        // Navigate to Homepage or the next screen
        navigation.replace('Homepage');
      } else {
        // Display error message if login fails
        Alert.alert('Login Failed', response.data.message);
      }
    } catch (error) {
      // Handle any error that occurs during the login process
      if (error.response) {
        Alert.alert('Login Failed', error.response.data.message);
      } else {
        Alert.alert('Login Error', 'An error occurred. Please check your internet connection and try again.');
      }
      console.error('Login error:', error.response ? error.response.data : error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/bmc.png')} style={styles.logoImage} />
        <Text style={styles.logoText}>University of Batangas</Text>
      </View>
      <Text style={styles.title}>Log in</Text>
      <TextInput
        style={styles.input}
        placeholder="UB Mail"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>LOG IN</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.footer}>
          Don’t have an account? <Text style={styles.link}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#757272' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logoImage: { width: 50, height: 50, marginRight: 10 },
  logoText: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 18, color: '#fff', marginBottom: 20 },
  input: { width: '80%', backgroundColor: '#4D1616', padding: 15, borderRadius: 10, color: '#fff', marginBottom: 10 },
  button: { backgroundColor: '#e63946', padding: 15, borderRadius: 10, width: '80%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  forgotPassword: { color: '#87ceeb', marginTop: 10 },
  footer: { marginTop: 20, color: '#ccc' },
  link: { color: '#87ceeb', textDecorationLine: 'underline' },
});

export default LoginScreen;
