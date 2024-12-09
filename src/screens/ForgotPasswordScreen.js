import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';

const BASE_URL = 'http://192.168.1.3:3001'; // Replace with dynamic configuration for production

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Function to handle the forgot password request (send OTP)
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/forgot-password`, { email });

      if (response.data.success) {
        Alert.alert('Success', 'OTP sent to your email.');
        setOtpSent(true); // Mark OTP as sent
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send OTP.');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'An error occurred while requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle OTP verification
  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || isNaN(otp)) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/verify-otp`, { email, otp });

      if (response.data.success) {
        Alert.alert('Success', 'OTP verified. You can now reset your password.');
        navigation.navigate('ResetPassword', { email }); // Navigate to reset password screen
      } else {
        Alert.alert('Error', response.data.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'An error occurred while verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <Text style={styles.title}>{otpSent ? 'Verify OTP' : 'Forgot Password'}</Text>
      {!otpSent ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.button} onPress={handleForgotPassword} disabled={loading}>
            <Text style={styles.buttonText}>SEND OTP</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            placeholderTextColor="#aaa"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
            <Text style={styles.buttonText}>VERIFY OTP</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setOtpSent(false)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#757272' },
  title: { fontSize: 22, color: '#fff', marginBottom: 20, fontWeight: 'bold' },
  input: {
    width: '80%',
    backgroundColor: '#4D1616',
    padding: 15,
    borderRadius: 10,
    color: '#fff',
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e63946',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#4D1616',
    borderRadius: 5,
  },
  backButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default ForgotPasswordScreen;
