import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Flex, Text, Button, VStack, Input } from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 初始化i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "welcome": "Hello! I'm your AI assistant. You have {{count}} trial uses left. What image would you like me to generate?",
          "trial_exhausted": "Sorry, your trial uses are exhausted. Please register to continue!",
          "chat_placeholder": "Enter your message here...",
          "generated_image": "Here's your image based on: {{description}}"
        }
      },
      zh: {
        translation: {
          "welcome": "您好！我係您嘅AI助手。您仲有{{count}}次試用機會。請問想生成咩圖片？",
          "trial_exhausted": "抱歉，您嘅試用次數已用完。請註冊以繼續使用！",
          "chat_placeholder": "喺呢度輸入您嘅訊息...",
          "generated_image": "呢張係根據{{description}}生成嘅圖片"
        }
      }
    },
    fallbackLng: 'en',
    detection: { order: ['navigator'] },
  });

function AppContent() {
  const { t } = useTranslation();
  const toast = useToast();
  const [trialCount, setTrialCount] = useState(5); // 未註冊用戶初始試用次數
  const [messages, setMessages] = useState([{ text: t('welcome', { count: 5 }), sender: 'bot' }]); // 初始歡迎訊息
  const [inputMessage, setInputMessage] = useState('');

  // 發送訊息並模擬生成圖片
  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return; // 避免空訊息

    if (trialCount <= 0) {
      setMessages(prev => [...prev, { text: t('trial_exhausted'), sender: 'bot' }]);
      toast({ title: t('trial_exhausted'), status: 'warning', duration: 3000, isClosable: true });
      setInputMessage('');
      return;
    }

    // 添加用戶訊息
    setMessages(prev => [...prev, { text: inputMessage, sender: 'user' }]);
    // 模擬AI回覆
    setMessages(prev => [...prev, { text: t('generated_image', { description: inputMessage }), sender: 'bot' }]);
    setTrialCount(prev => prev - 1);
    setInputMessage('');
  };

  // 更新歡迎訊息當試用次數改變
  useEffect(() => {
    if (trialCount > 0) {
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[0].sender === 'bot' && newMessages[0].text.includes(t('welcome', { count: trialCount + 1 }))) {
          newMessages[0] = { text: t('welcome', { count: trialCount }), sender: 'bot' };
        }
        return newMessages;
      });
    }
  }, [trialCount, t]);

  return (
    <Flex h="100vh" p={4}>
      {/* 左邊對話框 */}
      <Box w="50%" p={4} bg="gray.100" borderRadius="md" overflowY="auto">
        <VStack spacing={4} align="stretch">
          {messages.map((msg, index) => (
            <Box
              key={index}
              p={2}
              bg={msg.sender === 'user' ? 'blue.100' : 'green.100'}
              borderRadius="md"
              alignSelf={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
            >
              <Text>{msg.text}</Text>
            </Box>
          ))}
        </VStack>
        <Input
          mt={4}
          placeholder={t('chat_placeholder')}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button mt={2} colorScheme="blue" onClick={handleSendMessage}>Send</Button>
      </Box>
      {/* 右邊圖片生成框架 */}
      <Box w="50%" p={4} bg="gray.50" borderRadius="md">
        <Text fontSize="xl" mb={4}>Generated Image</Text>
        <Box w="100%" h="80%" bg="gray.200" borderRadius="md" />
      </Box>
    </Flex>
  );
}

function App() {
  return (
    <ChakraProvider>
      <I18nextProvider i18n={i18n}>
        <AppContent />
      </I18nextProvider>
    </ChakraProvider>
  );
}

export default App;