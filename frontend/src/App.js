import React, { useState, useEffect } from 'react';
import {
  ChakraProvider, Box, Flex, Text, Button, VStack, Input, HStack, Select, Image,
  AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader,
  AlertDialogBody, AlertDialogFooter, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

// 多語言配置
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en': {
        translation: {
          "welcome": "Welcome to AI Multimedia Generator",
          "explore": "Explore",
          "marketplace": "Marketplace",
          "community": "Community",
          "profile": "Profile",
          "language": "Language",
          "logo": "AI Multimedia Generator",
          "my_works": "My Works",
          "remaining_uses": "Remaining Uses",
          "generated_result": "Generated Result",
          "confirm": "Confirm",
          "adjust": "Adjust",
          "media_type_change_warning": "Changing the media type will clear the previous generated content. Do you want to proceed?",
          "media_types": {
            "image": "Image",
            "music": "Music"
          },
          "chat_placeholder": "Enter your request here",
          "login": "Login",
          "logout": "Logout"
        }
      },
      'zh-HK': {
        translation: {
          "welcome": "歡迎使用 AI 多媒體生成器",
          "explore": "探索",
          "marketplace": "市集",
          "community": "社群",
          "profile": "個人資料",
          "language": "語言",
          "logo": "AI 多媒體生成器",
          "my_works": "我的作品",
          "remaining_uses": "剩餘生成次數",
          "generated_result": "生成結果",
          "confirm": "確認",
          "adjust": "調整",
          "media_type_change_warning": "更改多媒體類型將會清除之前的生成內容。是否繼續？",
          "media_types": {
            "image": "圖片",
            "music": "音樂"
          },
          "chat_placeholder": "喺度輸入你的要求",
          "login": "登入",
          "logout": "登出"
        }
      }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-HK'],
    detection: { order: ['navigator'] },
  });

function AppContent() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [user, setUser] = useState(null); // 未登入時為 null
  const [remainingUses, setRemainingUses] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [previewContent, setPreviewContent] = useState(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const { isOpen: isMediaTypeDialogOpen, onOpen: onMediaTypeDialogOpen, onClose: onMediaTypeDialogClose } = useDisclosure();
  const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();
  const [pendingMediaType, setPendingMediaType] = useState(null);

  // 初始化剩餘次數同歡迎訊息
  useEffect(() => {
    const fetchRemainingUses = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (response.ok) {
          setRemainingUses(user ? data.daily_uses : data.trial_count);
        } else {
          toast({ title: data.message, status: "error", duration: 3000, isClosable: true });
        }
      } catch (error) {
        toast({ title: "無法獲取剩餘次數", status: "error", duration: 3000, isClosable: true });
      }
    };
    fetchRemainingUses();

    setMessages([{ text: t('welcome'), sender: 'bot' }]);
  }, [user, t, toast]);

  // 生成或調整內容
  const handleAdjust = async (requestText) => {
    try {
      const response = await fetch('http://localhost:5000/api/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: mediaType, description: requestText })
      });
      const data = await response.json();
      if (response.ok) {
        setPreviewContent({ mediaType, fileUrl: data.file_url });
        setIsAdjusting(true);
        setMessages(prev => [
          ...prev,
          { text: t('generated_result'), sender: 'bot' }
        ]);
      } else {
        toast({ title: data.message, status: "error", duration: 3000, isClosable: true });
      }
    } catch (error) {
      toast({ title: "無法連接到服務器", status: "error", duration: 3000, isClosable: true });
    }
  };

  // 確認生成內容
  const handleConfirm = async () => {
    if (!previewContent) return;

    try {
      const response = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: mediaType,
          description: messages[messages.length - 2].text,
        })
      });
      const data = await response.json();
      if (response.ok) {
        setPreviewContent({ mediaType, fileUrl: data.file_url });
        setIsAdjusting(false);
        setMessages(prev => [
          ...prev,
          { text: t('generated_result'), sender: 'bot' }
        ]);
      } else {
        toast({ title: data.message, status: "error", duration: 3000, isClosable: true });
      }
    } catch (error) {
      toast({ title: "確認失敗", status: "error", duration: 3000, isClosable: true });
    }
  };

  // 發送聊天訊息
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const requestText = inputMessage;
    setMessages(prev => [...prev, { text: requestText, sender: 'user' }]);
    await handleAdjust(requestText);
    setInputMessage('');
  };

  // 處理多媒體類型更改
  const handleMediaTypeChange = (e) => {
    const newMediaType = e.target.value;
    if (isAdjusting) {
      setPendingMediaType(newMediaType);
      onMediaTypeDialogOpen();
    } else {
      setMediaType(newMediaType);
    }
  };

  const confirmMediaTypeChange = () => {
    if (pendingMediaType) {
      setMediaType(pendingMediaType);
      setPreviewContent(null);
      setMessages([{ text: t('welcome'), sender: 'bot' }]);
      setIsAdjusting(false);
      setPendingMediaType(null);
    }
    onMediaTypeDialogClose();
  };

  // 模擬登入功能
  const handleLogin = (method) => {
    setUser({ email: 'example@example.com' }); // 模擬登入成功
    onLoginClose();
  };

  // 登出功能
  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Box minH="100vh">
      {/* Header */}
      <Flex as="header" p={4} bg="teal.500" color="white" justify="space-between" align="center">
        <Link to="/">
          <Text fontSize="xl" fontWeight="bold">{t('logo')}</Text>
        </Link>
        <HStack spacing={4}>
          <Link to="/explore">
            <Button variant="ghost" colorScheme="whiteAlpha">{t('explore')}</Button>
          </Link>
          <Link to="/marketplace">
            <Button variant="ghost" colorScheme="whiteAlpha">{t('marketplace')}</Button>
          </Link>
          <Link to="/community">
            <Button variant="ghost" colorScheme="whiteAlpha">{t('community')}</Button>
          </Link>
          {user ? (
            <>
              <Link to="/my-works">
                <Button variant="ghost" colorScheme="whiteAlpha">{t('my_works')}</Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" colorScheme="whiteAlpha">{t('profile')}</Button>
              </Link>
              <Button variant="ghost" colorScheme="whiteAlpha" onClick={handleLogout}>
                {t('logout')}
              </Button>
            </>
          ) : (
            <Button variant="ghost" colorScheme="whiteAlpha" onClick={onLoginOpen}>
              {t('login')}
            </Button>
          )}
          <Select
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            value={i18n.language}
            size="sm"
            color="white"
            bg="teal.600"
            border="none"
            w="100px"
          >
            <option value="en">EN</option>
            <option value="zh-HK">zh-HK</option>
          </Select>
        </HStack>
      </Flex>

      {/* 登入小視窗 */}
      <Modal isOpen={isLoginOpen} onClose={onLoginClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>選擇登入方式</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Button onClick={() => handleLogin('email')}>使用 Email 登入</Button>
              <Button onClick={() => handleLogin('google')}>使用 Google 登入</Button>
              <Button onClick={() => handleLogin('facebook')}>使用 Facebook 登入</Button>
              <Button onClick={() => handleLogin('wechat')}>使用 WeChat 登入</Button>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onLoginClose}>取消</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 主內容區域 */}
      <Flex h="calc(100vh - 64px)" p={4}>
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
          <HStack mt={4} spacing={2}>
            <Select value={mediaType} onChange={handleMediaTypeChange} w="150px">
              <option value="image">{t('media_types.image')}</option>
              <option value="music">{t('media_types.music')}</option>
            </Select>
            <Input
              flex="1"
              placeholder={t('chat_placeholder')}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button colorScheme="blue" onClick={handleSendMessage}>
              {t('adjust')}
            </Button>
          </HStack>
        </Box>

        <Box w="50%" p={4} bg="gray.50" borderRadius="md">
          <Flex justify="space-between" mb={4}>
            <Text fontSize="xl">{t('generated_result')}</Text>
            <Text fontSize="xl">{t('remaining_uses')}: {remainingUses}</Text>
          </Flex>
          <VStack spacing={4} align="stretch">
            <Box minH="200px">
              {previewContent ? (
                <>
                  {previewContent.mediaType === 'image' && <Image src={previewContent.fileUrl} alt="Preview" maxW="100%" />}
                  {previewContent.mediaType === 'music' && (
                    <audio controls>
                      <source src={previewContent.fileUrl} type="audio/wav" />
                      您的瀏覽器不支持音頻元素。
                    </audio>
                  )}
                </>
              ) : (
                <Text color="gray.500">尚未生成內容</Text>
              )}
              {isAdjusting && (
                <Button colorScheme="green" onClick={handleConfirm} mt={2}>{t('confirm')}</Button>
              )}
            </Box>
          </VStack>
        </Box>
      </Flex>

      {/* 更改多媒體類型確認對話框 */}
      <AlertDialog isOpen={isMediaTypeDialogOpen} onClose={onMediaTypeDialogClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              確認更改多媒體類型
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('media_type_change_warning')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onMediaTypeDialogClose}>取消</Button>
              <Button colorScheme="red" onClick={confirmMediaTypeChange} ml={3}>
                確認
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

function App() {
  return (
    <ChakraProvider>
      <I18nextProvider i18n={i18n}>
        <Router>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/my-works" element={<div>我的作品頁面（待實現）</div>} />
            <Route path="/profile" element={<div>個人資料頁面（待實現）</div>} />
            <Route path="/explore" element={<div>探索頁面（待實現）</div>} />
            <Route path="/marketplace" element={<div>市集頁面（待實現）</div>} />
            <Route path="/community" element={<div>社群頁面（待實現）</div>} />
          </Routes>
        </Router>
      </I18nextProvider>
    </ChakraProvider>
  );
}

export default App;