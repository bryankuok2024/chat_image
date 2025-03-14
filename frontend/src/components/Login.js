import React, { useState } from 'react';
import { Box, Button, Input, VStack, Text, useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const auth = getAuth();
  const googleProvider = new GoogleAuthProvider();

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login successful", status: "success", duration: 3000, isClosable: true });
      navigate('/');
    } catch (error) {
      toast({ title: "Login failed", description: error.message, status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Login successful", status: "success", duration: 3000, isClosable: true });
      navigate('/');
    } catch (error) {
      toast({ title: "Login failed", description: error.message, status: "error", duration: 3000, isClosable: true });
    }
  };

  return (
    <Box p={4}>
      <Text fontSize="2xl" mb={4}>{t('login')}</Text>
      <VStack spacing={4}>
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button colorScheme="blue" onClick={handleEmailLogin}>Login with Email</Button>
        <Button colorScheme="red" onClick={handleGoogleLogin}>Login with Google</Button>
        {/* 其他登入方式（Facebook、X、微信）可類似添加 */}
      </VStack>
    </Box>
  );
}

export default Login;