import React, { useState, useEffect, Suspense } from 'react';
import { ChakraProvider, Box, Flex, Text, Button, VStack, Input, HStack, Select, Image } from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Login from './components/Login';
import { FaSignInAlt, FaImages, FaUser, FaUsers, FaShareAlt } from 'react-icons/fa';

// Firebase 配置（請替換為您嘅實際配置）
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 支援嘅語言清單
const supportedLanguages = [
  { code: 'en', label: 'EN' },
  { code: 'zh-HK', label: 'zh-HK' },
  { code: 'zh-TW', label: 'zh-TW' },
  { code: 'ja', label: 'JA' },
  { code: 'ko', label: 'KO' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' }
];

// 基礎語言資源（手動提供 EN、zh-HK、zh-TW、ja、ko，其他語言動態翻譯）
const baseResources = {
  en: {
    translation: {
      "welcome": "I'm your AI multimedia assistant. I can help you generate and modify images/videos/music/3D models through conversation.",
      "welcome_logged_in": "Welcome back, {{email}}! I'm your AI multimedia assistant. I can help you generate and modify images/videos/music/3D models through conversation.",
      "trial_exhausted": "Sorry, your trial uses are exhausted. Please register to continue!",
      "daily_limit_exhausted": "Sorry, you've used all your daily limits. Please subscribe or wait until tomorrow!",
      "chat_placeholder": "Enter your request (e.g., 'Generate an image of a cat')...",
      "generated_content": "Here's your {{type}} based on: {{description}}",
      "login": "Login",
      "logo": "AI Multimedia Generator",
      "upload_prompt": "Upload a file to refine or generate new content",
      "community": "Community",
      "shared_works": "Shared Works",
      "my_works": "My Works",
      "remaining_uses": "Remaining Uses",
      "generated_result": "Generated Result",
      "media_types": {
        "image": "Image",
        "video": "Video",
        "3d_model": "3D Model",
        "music": "Music"
      }
    }
  },
  "zh-HK": {
    translation: {
      "welcome": "我係你嘅AI多媒體助手，我可以以對話方式幫你生成同修改圖片/視頻/音樂/3D模型。",
      "welcome_logged_in": "歡迎回來，{{email}}！我係你嘅AI多媒體助手，我可以以對話方式幫你生成同修改圖片/視頻/音樂/3D模型。",
      "trial_exhausted": "抱歉，您嘅試用次數已用完。請註冊以繼續使用！",
      "daily_limit_exhausted": "抱歉，您今日嘅使用次數已用完。請訂閱或等到明日！",
      "chat_placeholder": "輸入您嘅要求（例如‘生成一張貓嘅圖片’）...",
      "generated_content": "呢個係根據{{description}}生成嘅{{type}}",
      "login": "登入",
      "logo": "AI多媒體生成器",
      "upload_prompt": "上載文件以改良或生成新內容",
      "community": "社群",
      "shared_works": "用戶分享作品",
      "my_works": "我嘅作品",
      "remaining_uses": "剩餘生成次數",
      "generated_result": "生成結果",
      "media_types": {
        "image": "圖片",
        "video": "視頻",
        "3d_model": "3D模型",
        "music": "音樂"
      }
    }
  },
  "zh-TW": {
    translation: {
      "welcome": "我是你的AI多媒體助手，我可以以對話方式幫你生成和修改圖片/影片/音樂/3D模型。",
      "welcome_logged_in": "歡迎回來，{{email}}！我是你的AI多媒體助手，我可以以對話方式幫你生成和修改圖片/影片/音樂/3D模型。",
      "trial_exhausted": "抱歉，你的試用次數已用完。請註冊以繼續使用！",
      "daily_limit_exhausted": "抱歉，你今日的使用次數已用完。請訂閱或等到明日！",
      "chat_placeholder": "輸入你的要求（例如‘生成一張貓的圖片’）...",
      "generated_content": "這是根據{{description}}生成的{{type}}",
      "login": "登入",
      "logo": "AI多媒體生成器",
      "upload_prompt": "上傳檔案以改良或生成新內容",
      "community": "社群",
      "shared_works": "用戶分享作品",
      "my_works": "我的作品",
      "remaining_uses": "剩餘生成次數",
      "generated_result": "生成結果",
      "media_types": {
        "image": "圖片",
        "video": "影片",
        "3d_model": "3D模型",
        "music": "音樂"
      }
    }
  },
  "ja": {
    translation: {
      "welcome": "私はあなたのAIマルチメディアアシスタントです。会話を通じて画像/ビデオ/音楽/3Dモデルの生成や修正をお手伝いできます。",
      "welcome_logged_in": "おかえりなさい、{{email}}！私はあなたのAIマルチメディアアシスタントです。会話を通じて画像/ビデオ/音楽/3Dモデルの生成や修正をお手伝いできます。",
      "trial_exhausted": "申し訳ありません、試用回数がなくなりました。登録して続けてください！",
      "daily_limit_exhausted": "申し訳ありません、今日の使用回数がなくなりました。サブスクリプションするか、明日までお待ちください！",
      "chat_placeholder": "リクエストを入力してください（例：『猫の画像を生成』）...",
      "generated_content": "これは{{description}}に基づいて生成された{{type}}です",
      "login": "ログイン",
      "logo": "AIマルチメディアジェネレーター",
      "upload_prompt": "ファイルをアップロードしてコンテンツを改良または新規生成",
      "community": "コミュニティ",
      "shared_works": "共有作品",
      "my_works": "私の作品",
      "remaining_uses": "残り使用回数",
      "generated_result": "生成結果",
      "media_types": {
        "image": "画像",
        "video": "ビデオ",
        "3d_model": "3Dモデル",
        "music": "音楽"
      }
    }
  },
  "ko": {
    translation: {
      "welcome": "저는 당신의 AI 멀티미디어 어시스턴트입니다. 대화를 통해 이미지/비디오/음악/3D 모델을 생성하고 수정하는 데 도움을 드릴 수 있습니다.",
      "welcome_logged_in": "다시 오신 것을 환영합니다, {{email}}! 저는 당신의 AI 멀티미디어 어시스턴트입니다. 대화를 통해 이미지/비디오/음악/3D 모델을 생성하고 수정하는 데 도움을 드릴 수 있습니다.",
      "trial_exhausted": "죄송합니다, 무료 사용 횟수가 모두 소진되었습니다. 등록하여 계속 사용해 주세요!",
      "daily_limit_exhausted": "죄송합니다, 오늘의 사용 횟수가 모두 소진되었습니다. 구독하거나 내일까지 기다려 주세요!",
      "chat_placeholder": "요청을 입력하세요 (예: '고양이 이미지를 생성')...",
      "generated_content": "이것은 {{description}}을 기반으로 생성된 {{type}}입니다",
      "login": "로그인",
      "logo": "AI 멀티미디어 생성기",
      "upload_prompt": "파일을 업로드하여 콘텐츠를 개선하거나 새로 생성",
      "community": "커뮤니티",
      "shared_works": "공유 작품",
      "my_works": "나의 작품",
      "remaining_uses": "남은 사용 횟수",
      "generated_result": "생성 결과",
      "media_types": {
        "image": "이미지",
        "video": "비디오",
        "3d_model": "3D 모델",
        "music": "음악"
      }
    }
  }
};

// 動態翻譯資源（透過後端 API）
const translateResources = async (resources, targetLang) => {
  if (resources[targetLang]) return resources[targetLang];

  const translated = { translation: {} };
  const base = resources.en.translation;

  const translationPromises = [];

  for (const key in base) {
    if (typeof base[key] === 'string') {
      translationPromises.push(
        fetch('http://localhost:5000/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: base[key], targetLang })
        })
          .then(response => response.json())
          .then(data => ({ key, translatedText: data.translatedText || base[key] }))
          .catch(error => {
            console.error(`Error translating ${key} to ${targetLang}:`, error);
            return { key, translatedText: base[key] };
          })
      );
    } else {
      translated.translation[key] = {};
      for (const subKey in base[key]) {
        translationPromises.push(
          fetch('http://localhost:5000/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: base[key][subKey], targetLang })
          })
            .then(response => response.json())
            .then(data => ({ key: `${key}.${subKey}`, translatedText: data.translatedText || base[key][subKey] }))
            .catch(error => {
              console.error(`Error translating ${key}.${subKey} to ${targetLang}:`, error);
              return { key: `${key}.${subKey}`, translatedText: base[key][subKey] };
            })
        );
      }
    }
  }

  const results = await Promise.all(translationPromises);
  results.forEach(({ key, translatedText }) => {
    if (key.includes('.')) {
      const [mainKey, subKey] = key.split('.');
      translated.translation[mainKey][subKey] = translatedText;
    } else {
      translated.translation[key] = translatedText;
    }
  });

  return translated;
};

// 初始化i18next（只加載當前語言）
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: baseResources,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages.map(lang => lang.code),
    detection: { order: ['navigator'] },
  });

function AppContent() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [trialCount, setTrialCount] = useState(5);
  const [dailyCount, setDailyCount] = useState(20);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/logo')
      .then(response => response.json())
      .then(data => setLogoUrl(data.logoUrl))
      .catch(error => {
        toast({ title: "Failed to fetch logo", status: "error", duration: 3000, isClosable: true });
      });

    fetch('http://localhost:5000/api/links')
      .then(response => response.json())
      .then(data => setLinks(data.links || []))
      .catch(error => {
        toast({ title: "Failed to fetch links", status: "error", duration: 3000, isClosable: true });
      });
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setMessages([{ text: t('welcome_logged_in', { email: currentUser.email }), sender: 'bot' }]);
      } else {
        setMessages([{ text: t('welcome'), sender: 'bot' }]);
      }
    });
    return () => unsubscribe();
  }, [t]);

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;

    if (!user && trialCount <= 0) {
      setMessages(prev => [...prev, { text: t('trial_exhausted'), sender: 'bot' }]);
      toast({ title: t('trial_exhausted'), status: "warning", duration: 3000, isClosable: true });
      navigate('/login');
      setInputMessage('');
      return;
    }

    if (user && dailyCount <= 0) {
      setMessages(prev => [...prev, { text: t('daily_limit_exhausted'), sender: 'bot' }]);
      toast({ title: t('daily_limit_exhausted'), status: "warning", duration: 3000, isClosable: true });
      setInputMessage('');
      return;
    }

    const requestText = uploadedFile 
      ? `${inputMessage} (based on uploaded ${mediaType})` 
      : inputMessage;
    setMessages(prev => [...prev, { text: requestText, sender: 'user' }]);
    setMessages(prev => [...prev, { text: t('generated_content', { type: t(`media_types.${mediaType}`), description: requestText }), sender: 'bot' }]);
    setInputMessage('');
    setHasGenerated(true);
    if (user) {
      setDailyCount(prev => prev - 1);
    } else {
      setTrialCount(prev => prev - 1);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setMessages(prev => [...prev, { text: `Uploaded: ${file.name}`, sender: 'user' }]);
    } else {
      setUploadedFile(null);
    }
  };

  const handleLanguageChange = async (event) => {
    const selectedLanguage = event.target.value;
    if (!i18n.hasResourceBundle(selectedLanguage, 'translation')) {
      setIsLoadingTranslations(true);
      const translatedResources = await translateResources(baseResources, selectedLanguage);
      i18n.addResourceBundle(selectedLanguage, 'translation', translatedResources.translation);
      setIsLoadingTranslations(false);
    }
    i18n.changeLanguage(selectedLanguage);
  };

  return (
    <Box minH="100vh">
      <Flex as="header" p={4} bg="teal.500" color="white" justify="space-between" align="center">
        <Link to="/">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" maxH="40px" />
          ) : (
            <Text fontSize="xl" fontWeight="bold">{t('logo')}</Text>
          )}
        </Link>
        <HStack spacing={4}>
          {links.length > 0 ? (
            links.map((link, index) => (
              <Link key={index} to={link.url}>
                <Button variant="ghost" colorScheme="whiteAlpha">
                  {link.name === 'community' && <FaUsers size={20} />}
                  {link.name === 'shared_works' && <FaShareAlt size={20} />}
                  <Text ml={2}>{t(link.name)}</Text>
                </Button>
              </Link>
            ))
          ) : (
            <Text>Links not available</Text>
          )}
          {user && (
            <Link to="/my-works">
              <Button variant="ghost" colorScheme="whiteAlpha">
                <FaImages size={20} />
                <Text ml={2}>{t('my_works')}</Text>
              </Button>
            </Link>
          )}
          <Select
            onChange={handleLanguageChange}
            value={i18n.language}
            size="sm"
            color="white"
            bg="teal.600"
            border="none"
            w="100px"
            disabled={isLoadingTranslations}
          >
            {supportedLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </Select>
          {user ? (
            <Link to="/profile">
              <Button variant="ghost" colorScheme="whiteAlpha">
                <FaUser size={20} />
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="ghost" colorScheme="whiteAlpha">
                <FaSignInAlt size={20} />
              </Button>
            </Link>
          )}
        </HStack>
      </Flex>

      <Flex h="calc(100vh - 64px)" p={4}>
        <Box w="50%" p={4} bg="gray.100" borderRadius="md" overflowY="auto">
          {isLoadingTranslations ? (
            <Text>Loading translations...</Text>
          ) : (
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
          )}
          <HStack mt={4} spacing={2}>
            <Select value={mediaType} onChange={(e) => setMediaType(e.target.value)} w="150px">
              <option value="image">{t('media_types.image')}</option>
              <option value="video">{t('media_types.video')}</option>
              <option value="3d_model">{t('media_types.3d_model')}</option>
              <option value="music">{t('media_types.music')}</option>
            </Select>
            <Input
              flex="1"
              placeholder={t('chat_placeholder')}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button colorScheme="blue" onClick={handleSendMessage}>Send</Button>
          </HStack>
        </Box>

        <Box w="50%" p={4} bg="gray.50" borderRadius="md">
          <Flex justify="space-between" mb={4}>
            <Box>
              <Text fontSize="xl">{t('generated_result')}</Text>
            </Box>
            <Box>
              <Text fontSize="xl">{t('remaining_uses')}: {user ? dailyCount : trialCount}</Text>
            </Box>
          </Flex>
          <VStack spacing={4} align="stretch">
            <Box minH="200px">
              {hasGenerated ? (
                <>
                  {mediaType === 'image' && <Box w="100%" h="200px" bg="gray.200" borderRadius="md" />}
                  {mediaType === 'video' && <Box w="100%" h="200px" bg="gray.300" borderRadius="md" />}
                  {mediaType === '3d_model' && <Box w="100%" h="200px" bg="gray.400" borderRadius="md" />}
                  {mediaType === 'music' && <Box w="100%" h="50px" bg="gray.500" borderRadius="md" />}
                </>
              ) : (
                <Text color="gray.500">No content generated yet</Text>
              )}
            </Box>
            <Box>
              <Text mb={2}>{t('upload_prompt')}</Text>
              <Input type="file" onChange={handleFileUpload} accept="image/*,video/*,audio/*,.glb" />
              {uploadedFile && (
                <Text mt={2}>Uploaded: {uploadedFile.name}</Text>
              )}
            </Box>
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
}

function App() {
  return (
    <ChakraProvider>
      <I18nextProvider i18n={i18n}>
        <Router>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<AppContent />} />
              <Route path="/login" element={<Login />} />
              <Route path="/my-works" element={<div>My Works Page (TBD)</div>} />
              <Route path="/gallery" element={<div>Gallery Page (TBD)</div>} />
              <Route path="/profile" element={<div>Profile Page (TBD)</div>} />
              <Route path="/community" element={<div>Community Page (TBD)</div>} />
              <Route path="/shared-works" element={<div>Shared Works Page (TBD)</div>} />
            </Routes>
          </Suspense>
        </Router>
      </I18nextProvider>
    </ChakraProvider>
  );
}

export default App;