/**
 * Main Application Logic for ARYA.
 * Bridges UI, Voice Controller (English & Hindi), Canvas Visualizer,
 * Audio SFX, and Express/MongoDB backend with Automatic Data Persistence.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Subsystems
  const visualizer = new JarvisVisualizer('visualizerCanvas');
  const voice = new JarvisVoiceController();
  const audio = window.jarvisAudio;

  // DOM Elements - Header & Status
  const dbStatusBadge = document.getElementById('dbStatusBadge');
  const dbPulse = document.getElementById('dbPulse');
  const dbStatusText = document.getElementById('dbStatusText');
  const geminiStatusBadge = document.getElementById('geminiStatusBadge');
  const geminiPulse = document.getElementById('geminiPulse');
  const geminiStatusText = document.getElementById('geminiStatusText');
  const deviceStatusBadge = document.getElementById('deviceStatusBadge');
  const devicePulse = document.getElementById('devicePulse');
  const deviceStatusText = document.getElementById('deviceStatusText');
  const speechStatusBanner = document.getElementById('speechStatusBanner');
  const statusIcon = document.getElementById('statusIcon');
  const statusMessage = document.getElementById('statusMessage');
  const hudClock = document.getElementById('hudClock');
  const hudDate = document.getElementById('hudDate');
  const hudBattery = document.getElementById('hudBattery');

  // DOM Elements - Left Panel Telemetry
  const cpuModel = document.getElementById('cpuModel');
  const cpuCores = document.getElementById('cpuCores');
  const ramRatio = document.getElementById('ramRatio');
  const ramProgress = document.getElementById('ramProgress');
  const ramPercent = document.getElementById('ramPercent');
  const uptimeVal = document.getElementById('uptimeVal');

  // DOM Elements - Center Stage
  const reactorBtn = document.getElementById('reactorBtn');
  const coreLabel = document.getElementById('coreLabel');
  const langSwitchBtn = document.getElementById('langSwitchBtn');
  const langSwitchText = document.getElementById('langSwitchText');
  const toggleListenModeBtn = document.getElementById('toggleListenModeBtn');
  const listenModeText = document.getElementById('listenModeText');
  const toggleMuteVoiceBtn = document.getElementById('toggleMuteVoiceBtn');
  const muteVoiceText = document.getElementById('muteVoiceText');
  const wakeSoundTestBtn = document.getElementById('wakeSoundTestBtn');

  // DOM Elements - Dialogue Terminal
  const chatFeed = document.getElementById('chatFeed');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const autoSaveIndicator = document.getElementById('autoSaveIndicator');
  const promptForm = document.getElementById('promptForm');
  const userInput = document.getElementById('userInput');
  const inlineMicBtn = document.getElementById('inlineMicBtn');

  // DOM Elements - Right Panel Notes
  const newNoteInput = document.getElementById('newNoteInput');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  const notesList = document.getElementById('notesList');

  // DOM Elements - Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');
  const userNameInput = document.getElementById('userNameInput');
  const languageSelect = document.getElementById('languageSelect');
  const voiceSelect = document.getElementById('voiceSelect');
  const voicePitch = document.getElementById('voicePitch');
  const pitchVal = document.getElementById('pitchVal');
  const voiceRate = document.getElementById('voiceRate');
  const rateVal = document.getElementById('rateVal');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const testGeminiKeyBtn = document.getElementById('testGeminiKeyBtn');
  const geminiTestStatus = document.getElementById('geminiTestStatus');
  const clockCityLabel = document.getElementById('clockCityLabel');
  const dateCityLabel = document.getElementById('dateCityLabel');
  const cityInput = document.getElementById('cityInput');
  const testWeatherBtn = document.getElementById('testWeatherBtn');
  const cityWeatherPreview = document.getElementById('cityWeatherPreview');
  const deviceNameInput = document.getElementById('deviceNameInput');
  const deviceIdDisplay = document.getElementById('deviceIdDisplay');
  const copyDeviceIdBtn = document.getElementById('copyDeviceIdBtn');
  const newDeviceIdBtn = document.getElementById('newDeviceIdBtn');
  const alwaysOnMicCheckbox = document.getElementById('alwaysOnMicCheckbox');
  const mobileVoiceNoticeBanner = document.getElementById('mobileVoiceNoticeBanner');
  const switchToHttpsBtn = document.getElementById('switchToHttpsBtn');
  const httpsLanUrlDisplay = document.getElementById('httpsLanUrlDisplay');
  const copyHttpsLanBtn = document.getElementById('copyHttpsLanBtn');
  const httpLanUrlDisplay = document.getElementById('httpLanUrlDisplay');
  const copyHttpLanBtn = document.getElementById('copyHttpLanBtn');

  // DOM Elements - Auth & Profile
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const headerUserAvatar = document.getElementById('headerUserAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const userDropdownMenu = document.getElementById('userDropdownMenu');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const dropdownAuthActionBtn = document.getElementById('dropdownAuthActionBtn');
  const dropdownAuthActionText = document.getElementById('dropdownAuthActionText');
  const dropdownAdminBtn = document.getElementById('dropdownAdminBtn');
  const dropdownOpenSettingsBtn = document.getElementById('dropdownOpenSettingsBtn');
  const dropdownLogoutDivider = document.getElementById('dropdownLogoutDivider');
  const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');

  // DOM Elements - Auth Modal
  const authModal = document.getElementById('authModal');
  const authBackdrop = document.getElementById('authBackdrop');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const authTabSignIn = document.getElementById('authTabSignIn');
  const authTabSignUp = document.getElementById('authTabSignUp');
  const signInForm = document.getElementById('signInForm');
  const signInEmail = document.getElementById('signInEmail');
  const signInPassword = document.getElementById('signInPassword');
  const signInErrorMsg = document.getElementById('signInErrorMsg');
  const signInSubmitBtn = document.getElementById('signInSubmitBtn');
  const signUpForm = document.getElementById('signUpForm');
  const signUpName = document.getElementById('signUpName');
  const signUpEmail = document.getElementById('signUpEmail');
  const signUpPassword = document.getElementById('signUpPassword');
  const signUpCity = document.getElementById('signUpCity');
  const signUpErrorMsg = document.getElementById('signUpErrorMsg');
  const signUpSubmitBtn = document.getElementById('signUpSubmitBtn');

  // DOM Elements - Admin Overseer Modal
  const adminModal = document.getElementById('adminModal');
  const adminBackdrop = document.getElementById('adminBackdrop');
  const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
  const adminTabChatsBtn = document.getElementById('adminTabChatsBtn');
  const adminTabUsersBtn = document.getElementById('adminTabUsersBtn');
  const adminTotalChatsBadge = document.getElementById('adminTotalChatsBadge');
  const adminTotalUsersBadge = document.getElementById('adminTotalUsersBadge');
  const adminChatsTabContent = document.getElementById('adminChatsTabContent');
  const adminUsersTabContent = document.getElementById('adminUsersTabContent');
  const adminChatSearchInput = document.getElementById('adminChatSearchInput');
  const adminRefreshChatsBtn = document.getElementById('adminRefreshChatsBtn');
  const adminChatsList = document.getElementById('adminChatsList');
  const adminRefreshUsersBtn = document.getElementById('adminRefreshUsersBtn');
  const adminUsersList = document.getElementById('adminUsersList');
  const adminToggleCreateUserBtn = document.getElementById('adminToggleCreateUserBtn');
  const adminTogglePromoteBtn = document.getElementById('adminTogglePromoteBtn');
  const adminCreateUserContainer = document.getElementById('adminCreateUserContainer');
  const adminCloseCreateUserBtn = document.getElementById('adminCloseCreateUserBtn');
  const adminCancelCreateUserBtn = document.getElementById('adminCancelCreateUserBtn');
  const adminCreateUserForm = document.getElementById('adminCreateUserForm');
  const adminNewUserName = document.getElementById('adminNewUserName');
  const adminNewUserEmail = document.getElementById('adminNewUserEmail');
  const adminNewUserPassword = document.getElementById('adminNewUserPassword');
  const adminNewUserRole = document.getElementById('adminNewUserRole');
  const adminNewUserCity = document.getElementById('adminNewUserCity');
  const adminNewUserLang = document.getElementById('adminNewUserLang');
  const adminCreateUserMsg = document.getElementById('adminCreateUserMsg');
  const adminSubmitCreateUserBtn = document.getElementById('adminSubmitCreateUserBtn');
  const adminQuickPromoteContainer = document.getElementById('adminQuickPromoteContainer');

  // DOM Elements - File & Attachment
  const attachFileBtn = document.getElementById('attachFileBtn');
  const fileAttachmentInput = document.getElementById('fileAttachmentInput');
  const attachmentPreviewBar = document.getElementById('attachmentPreviewBar');
  const attachmentChipName = document.getElementById('attachmentChipName');
  const attachmentChipSize = document.getElementById('attachmentChipSize');
  const attachmentChipThumb = document.getElementById('attachmentChipThumb');
  const attachmentRemoveBtn = document.getElementById('attachmentRemoveBtn');

  // Multi-Device Partition Helpers (Smart Watch, Tablet, Mobile, Laptop, Desktop)
  function detectDeviceType() {
    const ua = navigator.userAgent || '';
    const isWatch = (window.innerWidth <= 320 && window.innerHeight <= 400) || /Watch|Wear OS|AppleWatch/i.test(ua);
    if (isWatch) return 'watch';
    const isTablet = /iPad/i.test(ua) || 
      (/Android/i.test(ua) && !/Mobile/i.test(ua)) || 
      (window.innerWidth >= 600 && window.innerWidth <= 1100 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    if (isTablet) return 'tablet';
    const isMobile = /Android|iPhone|iPod|Mobile/i.test(ua);
    if (isMobile) return 'mobile';
    return 'desktop';
  }

  function getOrCreateDeviceId() {
    let id = localStorage.getItem('arya_device_id');
    if (!id) {
      const type = detectDeviceType();
      const prefixMap = { watch: 'watch', tablet: 'tab', mobile: 'mob', desktop: 'pc' };
      const prefix = prefixMap[type] || 'dev';
      const rand = Math.random().toString(36).substring(2, 9);
      id = `${prefix}_${Date.now().toString(36)}_${rand}`;
      localStorage.setItem('arya_device_id', id);
    }
    return id;
  }

  function getOrCreateDeviceName() {
    let name = localStorage.getItem('arya_device_name');
    if (!name) {
      const type = detectDeviceType();
      const ua = navigator.userAgent || '';
      if (type === 'watch') {
        name = /AppleWatch/i.test(ua) ? 'Apple Watch' : 'Smart Watch';
      } else if (type === 'tablet') {
        name = /iPad/i.test(ua) ? 'iPad Tablet' : 'Android Tablet';
      } else if (type === 'mobile') {
        name = /iPhone/i.test(ua) ? 'iPhone' : 'Android Phone';
      } else {
        if (/Mac/i.test(ua)) name = 'MacBook';
        else if (/Windows/i.test(ua)) name = 'Windows PC';
        else if (/Linux/i.test(ua)) name = 'Linux Station';
        else name = 'Personal Computer';
      }
      localStorage.setItem('arya_device_name', name);
    }
    return name;
  }

  // Local State (Push-To-Talk / Mic OFF by default, partitioned per device)
  let config = {
    deviceId: getOrCreateDeviceId(),
    deviceName: getOrCreateDeviceName(),
    city: localStorage.getItem('arya_city') || 'Patna',
    userName: localStorage.getItem('arya_username') || localStorage.getItem('jarvis_username') || 'Sir',
    language: localStorage.getItem('arya_language') || localStorage.getItem('jarvis_language') || 'hi', // 'hi' by default
    apiKey: localStorage.getItem('arya_gemini_key') || localStorage.getItem('jarvis_gemini_key') || '',
    voiceName: localStorage.getItem('arya_voice_name') || localStorage.getItem('jarvis_voice_name') || '',
    pitch: parseFloat(localStorage.getItem('arya_pitch')) || 1.0,
    rate: parseFloat(localStorage.getItem('arya_rate')) || 1.0,
    continuous: localStorage.getItem('arya_continuous') === 'true' // Mic is OFF by default (Push-to-Talk)
  };

  // Auth & Session State
  let currentUser = null;
  let currentAttachment = null;

  try {
    const savedUser = localStorage.getItem('arya_auth_user');
    if (savedUser) currentUser = JSON.parse(savedUser);
  } catch (e) {}

  function getAuthToken() {
    return localStorage.getItem('arya_auth_token') || '';
  }

  function setAuthSession(token, user) {
    if (token) localStorage.setItem('arya_auth_token', token);
    if (user) {
      currentUser = user;
      localStorage.setItem('arya_auth_user', JSON.stringify(user));
      if (user.name) {
        config.userName = user.name;
        localStorage.setItem('arya_username', user.name);
        userNameInput.value = user.name;
      }
      if (user.city) {
        config.city = user.city;
        localStorage.setItem('arya_city', user.city);
        if (cityInput) cityInput.value = user.city;
      }
      if (user.preferredLanguage) {
        config.language = user.preferredLanguage;
        localStorage.setItem('arya_language', user.preferredLanguage);
        voice.setLanguage(user.preferredLanguage);
        updateLanguageUI(user.preferredLanguage);
      }
      if (user.geminiApiKey) {
        config.apiKey = user.geminiApiKey;
        localStorage.setItem('arya_gemini_key', user.geminiApiKey);
        geminiApiKeyInput.value = user.geminiApiKey;
      }
    }
    updateAuthUI();
  }

  function clearAuthSession() {
    currentUser = null;
    localStorage.removeItem('arya_auth_token');
    localStorage.removeItem('arya_auth_user');
    config.userName = 'Sir';
    localStorage.setItem('arya_username', 'Sir');
    if (userNameInput) userNameInput.value = 'Sir';
    updateAuthUI();
  }

  // Verify and hydrate current user auth session from server
  async function verifyCurrentAuthSession() {
    const token = getAuthToken();
    if (!token) {
      clearAuthSession();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: getDeviceHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setAuthSession(token, data.user);
        } else {
          clearAuthSession();
        }
      } else {
        clearAuthSession();
      }
    } catch (e) {
      if (currentUser) {
        updateAuthUI();
      }
    }
  }

  function updateAuthUI() {
    if (currentUser) {
      const displayName = currentUser.name || currentUser.email.split('@')[0];
      if (headerUserName) headerUserName.textContent = displayName;
      if (headerUserAvatar) headerUserAvatar.textContent = displayName.charAt(0).toUpperCase();
      if (dropdownUserName) dropdownUserName.textContent = currentUser.name || 'User';
      if (dropdownUserEmail) dropdownUserEmail.textContent = currentUser.email;
      if (dropdownAuthActionText) dropdownAuthActionText.textContent = 'Switch Account';
      if (dropdownLogoutDivider) dropdownLogoutDivider.style.display = 'block';
      if (dropdownLogoutBtn) dropdownLogoutBtn.style.display = 'flex';

      // Discreet Overseer Button: ONLY visible if currentUser.role === 'admin'
      if (dropdownAdminBtn) {
        dropdownAdminBtn.style.display = (currentUser.role === 'admin') ? 'flex' : 'none';
      }
    } else {
      if (headerUserName) headerUserName.textContent = 'Sign In';
      if (headerUserAvatar) headerUserAvatar.textContent = '👤';
      if (dropdownUserName) dropdownUserName.textContent = 'Guest User';
      if (dropdownUserEmail) dropdownUserEmail.textContent = 'Guest Session';
      if (dropdownAuthActionText) dropdownAuthActionText.textContent = 'Sign In / Register';
      if (dropdownLogoutDivider) dropdownLogoutDivider.style.display = 'none';
      if (dropdownLogoutBtn) dropdownLogoutBtn.style.display = 'none';
      if (dropdownAdminBtn) dropdownAdminBtn.style.display = 'none';
    }
  }

  // Helper for request headers (includes device partition & Auth token)
  function getDeviceHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Device-Id': config.deviceId,
      'X-Device-Name': config.deviceName
    };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    return headers;
  }

  function updateDeviceUI() {
    if (deviceStatusText) {
      deviceStatusText.textContent = `DEVICE: ${config.deviceName.toUpperCase()}`;
    }
    if (deviceIdDisplay) {
      deviceIdDisplay.value = config.deviceId;
    }
    if (deviceNameInput) {
      deviceNameInput.value = config.deviceName;
    }
    if (cityInput) {
      cityInput.value = config.city;
    }
    if (alwaysOnMicCheckbox) {
      alwaysOnMicCheckbox.checked = config.continuous;
    }
    updateClock();
  }

  // Sync settings with Voice Controller & UI
  voice.setLanguage(config.language);
  voice.pitch = config.pitch;
  voice.rate = config.rate;
  voice.setContinuous(config.continuous);
  userNameInput.value = config.userName;
  if (languageSelect) languageSelect.value = config.language;
  geminiApiKeyInput.value = config.apiKey;
  voicePitch.value = config.pitch;
  pitchVal.textContent = config.pitch;
  voiceRate.value = config.rate;
  rateVal.textContent = config.rate;

  updateLanguageUI(config.language);
  updateDeviceUI();

  if (config.continuous) {
    toggleListenModeBtn.classList.add('active');
    listenModeText.textContent = 'ALWAYS-ON MIC: ACTIVE';
    coreLabel.textContent = 'MIC ALWAYS-ON';
  } else {
    toggleListenModeBtn.classList.remove('active');
    listenModeText.textContent = 'ALWAYS-ON MIC: OFF';
    coreLabel.textContent = 'PUSH TO TALK';
  }

  // Trigger glowing Auto-Save pulse indicator
  function triggerAutoSaveAnimation() {
    if (!autoSaveIndicator) return;
    autoSaveIndicator.classList.add('saving');
    setTimeout(() => {
      autoSaveIndicator.classList.remove('saving');
    }, 1200);
  }

  // Update Language UI Toggle Button
  function updateLanguageUI(lang) {
    config.language = lang;
    voice.setLanguage(lang);
    localStorage.setItem('arya_language', lang);

    if (lang === 'hi') {
      langSwitchBtn.classList.add('hindi-active');
      langSwitchText.textContent = 'LANG: हिन्दी (HI)';
      userInput.placeholder = "आर्या से बात करें (उदा. 'विंग्स ऑफ फायर के लेखक कौन हैं?', 'नमस्ते', 'नोट लिखो: ...')...";
    } else {
      langSwitchBtn.classList.remove('hindi-active');
      langSwitchText.textContent = 'LANG: ENGLISH (EN)';
      userInput.placeholder = "Talk to ARYA (e.g. 'Who is the author of Wings of Fire?', 'Status report', 'Note likho: ...')...";
    }

    if (languageSelect) languageSelect.value = lang;
  }

  // Language Switch Button Listener
  langSwitchBtn.addEventListener('click', () => {
    audio.init();
    audio.playAcknowledge();
    const nextLang = config.language === 'en' ? 'hi' : 'en';
    updateLanguageUI(nextLang);

    // Auto-save setting to MongoDB
    saveSettingsToMongoDB();

    if (nextLang === 'hi') {
      voice.speak("हिन्दी भाषा मोड सक्रिय किया गया। नमस्ते सर!", 'hi');
      statusMessage.textContent = "HINDI VOICE ACTIVATED // नमस्ते आर्या";
    } else {
      voice.speak("English voice mode activated, Sir.", 'en');
      statusMessage.textContent = "ENGLISH VOICE ACTIVATED // STANDING BY";
    }
  });

  // ==========================================================================
  // VOICE EVENTS HOOKS
  // ==========================================================================

  voice.onSpeechStart = () => {
    audio.playListenStart();
    visualizer.setState('listening');
    reactorBtn.classList.add('listening');
    inlineMicBtn.classList.add('active');
    coreLabel.textContent = config.language === 'hi' ? 'सुन रहा हूँ...' : 'LISTENING...';
    speechStatusBanner.className = 'speech-status-banner listening';
    statusIcon.textContent = '🎙️';
    statusMessage.textContent = config.language === 'hi' 
      ? 'आवाज़ सुनी जा रही है (LISTENING)...' 
      : 'LISTENING TO VOCAL TRANSMISSION...';
  };

  voice.onSpeechResult = ({ text, isFinal }) => {
    userInput.value = text;

    if (isFinal && text.trim()) {
      let query = text.trim();
      
      // Wake word filter for ARYA (English & Hindi)
      const wakeMatch = query.match(/^(?:hey\s+|हे\s+|अरे\s+)?(?:arya|आर्या|jarvis|ज़ार्विस)[,\s]*(.*)/i);
      if (wakeMatch && wakeMatch[1]) {
        query = wakeMatch[1].trim();
      }

      if (query) {
        processUserQuery(query);
      }
    }
  };

  voice.onSpeechEnd = () => {
    reactorBtn.classList.remove('listening');
    inlineMicBtn.classList.remove('active');
    coreLabel.textContent = voice.continuousMode ? 'CONTINUOUS ON' : 'PUSH TO TALK';

    if (!voice.isSpeaking) {
      visualizer.setState('idle');
      speechStatusBanner.className = 'speech-status-banner';
      statusIcon.textContent = '⚡';
      statusMessage.textContent = config.language === 'hi' 
        ? 'सिस्टम तैयार // आदेश की प्रतीक्षा' 
        : 'SYSTEM READY // AWAITING DIRECTIVE';
    }
  };

  voice.onMicPermissionBlocked = () => {
    statusMessage.textContent = 'MIC BLOCKED BY BROWSER // USE HTTPS (3443)';
    if (mobileVoiceNoticeBanner) {
      mobileVoiceNoticeBanner.style.display = 'flex';
    }
  };

  voice.onJarvisSpeakStart = () => {
    visualizer.setState('speaking');
    reactorBtn.classList.add('speaking');
    speechStatusBanner.className = 'speech-status-banner speaking';
    statusIcon.textContent = '🔊';
    statusMessage.textContent = config.language === 'hi' 
      ? 'बोल रहा हूँ (SYNTHESIZING HINDI)...' 
      : 'SYNTHESIZING VOCAL TRANSMISSION...';
    coreLabel.textContent = config.language === 'hi' ? 'बोल रहा हूँ...' : 'SPEAKING...';
  };

  voice.onJarvisSpeakEnd = () => {
    visualizer.setState('idle');
    reactorBtn.classList.remove('speaking');
    speechStatusBanner.className = 'speech-status-banner';
    statusIcon.textContent = '⚡';
    statusMessage.textContent = 'SYSTEM READY // AWAITING DIRECTIVE';
    coreLabel.textContent = voice.continuousMode ? 'CONTINUOUS ON' : 'PUSH TO TALK';
  };

  // Populate voice selector dropdown (highlights Microsoft Swara & Hindi options)
  function updateVoiceDropdown() {
    const voices = voice.getVoices();
    if (!voices || voices.length === 0) return;

    voiceSelect.innerHTML = '';

    // Prioritize Microsoft Swara if no custom voice saved
    const swaraVoice = voices.find(v => v.name.toLowerCase().includes('swara'));
    if (!config.voiceName && swaraVoice) {
      voice.selectedVoice = swaraVoice;
      voice.hindiVoice = swaraVoice;
    }

    voices.forEach(v => {
      const isSwara = v.name.toLowerCase().includes('swara');
      const isHindi = v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी') || isSwara;
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${isSwara ? '⭐ [Default Swara] ' : (isHindi ? '🇮🇳 [Hindi] ' : '')}${v.name} (${v.lang})`;

      if (config.voiceName && v.name === config.voiceName) {
        opt.selected = true;
        voice.selectedVoice = v;
      } else if (!config.voiceName && voice.selectedVoice && v.name === voice.selectedVoice.name) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });
  }

  setTimeout(updateVoiceDropdown, 500);
  if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoiceDropdown;
  }

  // ==========================================================================
  // CLOCK & BATTERY TELEMETRY
  // ==========================================================================
  function updateClock() {
    const now = new Date();
    const cityLabel = (config.city || 'Patna').toUpperCase();
    if (clockCityLabel) clockCityLabel.textContent = `TIME (${cityLabel})`;
    if (dateCityLabel) dateCityLabel.textContent = `DATE (${cityLabel})`;

    try {
      hudClock.textContent = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
      hudDate.textContent = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      hudClock.textContent = now.toLocaleTimeString([], { hour12: false });
      hudDate.textContent = now.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  if (navigator.getBattery) {
    navigator.getBattery().then(bat => {
      const updateBat = () => {
        const pct = Math.round(bat.level * 100);
        hudBattery.textContent = `${pct}% ${bat.charging ? '⚡' : ''}`;
      };
      updateBat();
      bat.addEventListener('levelchange', updateBat);
      bat.addEventListener('chargingchange', updateBat);
    });
  }

  // ==========================================================================
  // HARDWARE TELEMETRY POLLING (/api/system)
  // ==========================================================================
  async function fetchTelemetry() {
    try {
      const res = await fetch('/api/system');
      if (!res.ok) return;
      const data = await res.json();

      // CPU
      if (data.cpu) {
        cpuModel.textContent = data.cpu.model.split('@')[0].trim();
        cpuCores.textContent = `${data.cpu.cores} THREADS`;
      }

      // Memory
      if (data.memory) {
        ramRatio.textContent = `${data.memory.usedGB} / ${data.memory.totalGB} GB`;
        ramProgress.style.width = `${data.memory.usagePercent}%`;
        ramPercent.textContent = `${data.memory.usagePercent}%`;
      }

      // Uptime
      if (data.uptimeFormatted) {
        uptimeVal.textContent = data.uptimeFormatted;
      }

      // DB Status
      if (data.database && data.database.status === 'CONNECTED') {
        dbPulse.className = 'pulse-dot active';
        dbStatusText.textContent = data.database.isAtlas ? `ATLAS CLOUD SYNC: ON` : `MONGODB AUTO-SYNC: ON`;
        dbStatusBadge.title = `Database Connected (${data.database.isAtlas ? 'MongoDB Atlas Cloud' : 'Local MongoDB'}). Memory notes and conversations are auto-saved.`;
      } else {
        dbPulse.className = 'pulse-dot';
        dbStatusText.textContent = 'MONGODB: VOLATILE';
        dbStatusBadge.title = 'MongoDB is offline or IP address not whitelisted in Atlas. Conversations stay in temporary session RAM until connected.';
      }
    } catch (err) {
      console.warn('Telemetry fetch error:', err.message);
    }
  }

  setInterval(fetchTelemetry, 4000);
  fetchTelemetry();

  // ==========================================================================
  // QUERY PROCESSING PIPELINE (AUTO-SAVES TO MONGODB)
  // ==========================================================================
  async function processUserQuery(messageText) {
    const cleanText = (messageText || '').trim();
    if (!cleanText && !currentAttachment) return;

    const attachmentToSend = currentAttachment ? { ...currentAttachment } : null;

    // Reset attachment UI & state immediately
    currentAttachment = null;
    if (fileAttachmentInput) fileAttachmentInput.value = '';
    if (attachmentPreviewBar) attachmentPreviewBar.style.display = 'none';

    // Render User Message in Feed
    appendMessageCard({
      sender: config.userName || 'Sir',
      text: cleanText || (attachmentToSend ? `[Uploaded: ${attachmentToSend.name}]` : ''),
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lang: config.language,
      attachment: attachmentToSend
    });

    userInput.value = '';

    // Set UI State: Processing
    visualizer.setState('processing');
    reactorBtn.classList.add('processing');
    coreLabel.textContent = config.language === 'hi' ? 'विश्लेषण...' : 'PROCESSING...';
    speechStatusBanner.className = 'speech-status-banner';
    statusIcon.textContent = '⚙️';
    statusMessage.textContent = config.language === 'hi' 
      ? 'मोंगो-डीबी में सुरक्षित एवं विश्लेषण हो रहा है...' 
      : 'PROCESSING & AUTO-SAVING TO MONGODB...';

    try {
      const abortCtrl = new AbortController();
      const abortTimer = setTimeout(() => abortCtrl.abort(), 25000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: getDeviceHeaders(),
        signal: abortCtrl.signal,
        body: JSON.stringify({
          message: cleanText,
          userName: config.userName,
          language: config.language,
          apiKey: config.apiKey,
          deviceId: config.deviceId,
          deviceName: config.deviceName,
          city: config.city || 'Patna',
          fileAttachment: attachmentToSend
        })
      });

      clearTimeout(abortTimer);
      reactorBtn.classList.remove('processing');

      let data = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = null;
      }

      if (data && (data.display || data.speech)) {
        // Trigger Visual Auto-Save Pulse
        triggerAutoSaveAnimation();

        // Render ARYA Response
        appendMessageCard({
          sender: 'ARYA.',
          text: data.display || data.speech,
          speechText: data.speech,
          isUser: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lang: data.language || config.language,
          action: data.action,
          data: data.data || null
        });

        // SFX & Speech Synthesis (Supports Hindi & English TTS - Never mentions Gemini in voice)
        audio.playAcknowledge();
        voice.speak(cleanSpeechForVoice(data.speech), data.language);

        // Execute Cross-Platform Action Hooks
        if (data.action === 'launch_app' || data.action === 'open_app') {
          audio.playAcknowledge();
          launchAppOnDevice(data.data);
        } else if (data.action === 'open_url' && data.data && data.data.url) {
          audio.playAcknowledge();
          launchAppOnDevice(data.data);
        } else if (data.action === 'open_maps' && data.data) {
          audio.playAcknowledge();
          launchAppOnDevice({
            appName: 'Maps',
            universalUrl: data.data.googleMapsUrl || data.data.url,
            iosDeepLink: data.data.appleMapsUrl || 'https://maps.apple.com',
            androidDeepLink: 'geo:0,0?q=' + encodeURIComponent(data.data.destination || ''),
            webFallback: data.data.googleMapsUrl || data.data.url
          });
        } else if (data.action === 'phone_call' && data.data && data.data.telUrl) {
          audio.playAcknowledge();
          window.location.href = data.data.telUrl;
        } else if (data.action === 'send_sms' && data.data && data.data.smsUrl) {
          audio.playAcknowledge();
          window.location.href = data.data.smsUrl;
        } else if (data.action === 'whatsapp_message') {
          audio.playAcknowledge();
          const waUrl = data.data && (data.data.waMeUrl || data.data.whatsappWebUrl || data.data.whatsappDesktopUrl);
          if (waUrl) {
            launchAppOnDevice({
              appName: 'WhatsApp',
              universalUrl: data.data.waMeUrl || waUrl,
              mobileUrl: data.data.waMeUrl || waUrl,
              androidDeepLink: 'whatsapp://send',
              androidIntent: 'intent://send#Intent;package=com.whatsapp;scheme=whatsapp;end',
              webFallback: data.data.whatsappWebUrl || waUrl
            });
          }
        } else if (data.action === 'contact_saved' || data.action === 'contacts_list') {
          audio.playAcknowledge();
        } else if (data.action === 'note_saved') {
          loadNotes();
        } else if (data.action === 'protocol_alert') {
          audio.playAlert();
        } else if (data.action === 'system_diagnostics') {
          fetchTelemetry();
        }
        return;
      }

      throw new Error((data && data.error) || `Server returned HTTP ${res.status}`);
    } catch (err) {
      console.error('Chat error:', err);
      reactorBtn.classList.remove('processing');
      visualizer.setState('idle');

      let fallbackText = '';
      if (err.name === 'AbortError') {
        fallbackText = config.language === 'hi'
          ? "माफ़ कीजिए सर, सर्वर से संपर्क में अधिक समय लगा (20s टाइमआउट)। कृपया नेटवर्क कनेक्शन की जाँच करें।"
          : "My apologies, Sir. Request timed out awaiting neural response. Please check network connection.";
      } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        fallbackText = config.language === 'hi'
          ? "माफ़ कीजिए सर, आर्या सर्वर से संपर्क नहीं हो पाया। कृपया सुनिश्चित करें कि सर्वर सक्रिय है।"
          : "My apologies, Sir. Unable to connect to ARYA Server. Please check that the host server is running.";
      } else {
        fallbackText = config.language === 'hi'
          ? `माफ़ कीजिए सर, संपर्क में रुकावट आई: ${err.message || 'त्रुटि'}`
          : `My apologies, Sir. Communication issue: ${err.message || 'Error'}`;
      }

      appendMessageCard({
        sender: 'ARYA.',
        text: `⚠️ ${fallbackText}`,
        speechText: fallbackText,
        isUser: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lang: config.language
      });
      voice.speak(cleanSpeechForVoice(fallbackText), config.language);
    }
  }

  // Helper to ensure Gemini/Google Gemini is never spoken aloud in voice synthesis
  function cleanSpeechForVoice(text) {
    if (!text) return '';
    return String(text)
      .replace(/Google\s+Gemini\s+AI\s+Answer/gi, 'Arya Ai Answer')
      .replace(/Gemini\s+AI\s+Answer/gi, 'Arya Ai Answer')
      .replace(/Google\s+Gemini\s+AI/gi, 'ARYA')
      .replace(/Gemini\s+AI/gi, 'ARYA')
      .replace(/Google\s+Gemini/gi, 'ARYA')
      .replace(/Gemini\s+API\s+key/gi, 'API key')
      .replace(/Gemini/gi, 'ARYA')
      .replace(/जेमिनी\s+एआई\s+उत्तर/gi, 'आर्या उत्तर')
      .replace(/जेमिनी\s+एआई/gi, 'आर्या')
      .replace(/जेमिनी/gi, 'आर्या')
      .trim();
  }

  // ==========================================================================
  // UNIVERSAL MOBILE, IOS & CROSS-DEVICE APP ENGINE
  // ==========================================================================
  let cameraMediaStream = null;
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const closeCameraModalBtn = document.getElementById('closeCameraModalBtn');
  const capturePhotoBtn = document.getElementById('capturePhotoBtn');
  const switchCameraDeviceBtn = document.getElementById('switchCameraDeviceBtn');
  const cameraStatusMsg = document.getElementById('cameraStatusMsg');
  const nativeCameraInput = document.getElementById('nativeCameraInput');

  let currentCameraFacingMode = 'environment';

  function openDeviceCamera() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && nativeCameraInput) {
      nativeCameraInput.click();
    } else {
      openLiveCameraViewfinder();
    }
  }

  if (nativeCameraInput) {
    nativeCameraInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handleFileAttachment(file);
        audio.playAcknowledge();
      }
    });
  }

  async function openLiveCameraViewfinder() {
    if (!cameraModal || !cameraVideo) return;
    cameraModal.classList.add('open');
    cameraModal.style.display = 'flex';
    if (cameraStatusMsg) cameraStatusMsg.textContent = 'Engaging optical sensor stream...';

    stopCameraStream();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        cameraMediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentCameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        cameraVideo.srcObject = cameraMediaStream;
        if (cameraStatusMsg) cameraStatusMsg.textContent = 'Optical sensor stream active.';
      } else {
        if (cameraStatusMsg) cameraStatusMsg.textContent = 'Camera API not supported in this browser.';
      }
    } catch (err) {
      if (cameraStatusMsg) cameraStatusMsg.textContent = `Camera Access Notice: ${err.message}`;
    }
  }

  function stopCameraStream() {
    if (cameraMediaStream) {
      cameraMediaStream.getTracks().forEach(t => t.stop());
      cameraMediaStream = null;
    }
  }

  if (closeCameraModalBtn) {
    closeCameraModalBtn.addEventListener('click', () => {
      stopCameraStream();
      if (cameraModal) {
        cameraModal.classList.remove('open');
        cameraModal.style.display = 'none';
      }
    });
  }

  if (switchCameraDeviceBtn) {
    switchCameraDeviceBtn.addEventListener('click', () => {
      currentCameraFacingMode = currentCameraFacingMode === 'environment' ? 'user' : 'environment';
      openLiveCameraViewfinder();
    });
  }

  if (capturePhotoBtn && cameraVideo && cameraCanvas) {
    capturePhotoBtn.addEventListener('click', () => {
      try {
        const w = cameraVideo.videoWidth || 640;
        const h = cameraVideo.videoHeight || 480;
        cameraCanvas.width = w;
        cameraCanvas.height = h;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraVideo, 0, 0, w, h);
        const dataUrl = cameraCanvas.toDataURL('image/jpeg', 0.85);

        currentAttachment = {
          name: `camera_capture_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: Math.round(dataUrl.length * 0.75),
          dataUrl
        };
        showAttachmentPreview(currentAttachment);
        audio.playAcknowledge();
        stopCameraStream();
        if (cameraModal) {
          cameraModal.classList.remove('open');
          cameraModal.style.display = 'none';
        }
      } catch (err) {
        alert('Could not capture frame: ' + err.message);
      }
    });
  }

  // Cyber HUD Calculator
  const calculatorModal = document.getElementById('calculatorModal');
  const closeCalculatorModalBtn = document.getElementById('closeCalculatorModalBtn');
  const calcDisplay = document.getElementById('calcDisplay');
  let calcExpression = '';

  function openCyberCalculator() {
    if (calculatorModal) {
      calculatorModal.classList.add('open');
      calculatorModal.style.display = 'flex';
      calcExpression = '';
      if (calcDisplay) calcDisplay.value = '0';
    }
  }

  if (closeCalculatorModalBtn && calculatorModal) {
    closeCalculatorModalBtn.addEventListener('click', () => {
      calculatorModal.classList.remove('open');
      calculatorModal.style.display = 'none';
    });
  }

  document.querySelectorAll('.calc-key').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playBeep();
      const k = btn.getAttribute('data-k');
      if (k === 'C') {
        calcExpression = '';
        if (calcDisplay) calcDisplay.value = '0';
      } else if (k === 'DEL') {
        calcExpression = calcExpression.slice(0, -1);
        if (calcDisplay) calcDisplay.value = calcExpression || '0';
      } else if (k === '=') {
        try {
          const sanitized = calcExpression.replace(/[^0-9\+\-\*\/\.\(\)]/g, '');
          const result = Function(`'use strict'; return (${sanitized})`)();
          calcDisplay.value = String(result);
          calcExpression = String(result);
        } catch (e) {
          calcDisplay.value = 'ERR';
          calcExpression = '';
        }
      } else {
        calcExpression += k;
        if (calcDisplay) calcDisplay.value = calcExpression;
      }
    });
  });

  // Client-side Cross-Platform App Launcher
  function launchAppOnDevice(appData) {
    if (!appData) return;
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid || /Mobile/i.test(ua);

    if (appData.isSettings) {
      if (settingsModal) {
        settingsModal.classList.add('open');
        settingsModal.style.display = 'flex';
      }
      return;
    }

    if (appData.isCamera) {
      openDeviceCamera();
      return;
    }

    if (appData.isCalculator) {
      openCyberCalculator();
      return;
    }

    let targetUrl = null;
    if (isIOS) {
      targetUrl = appData.iosDeepLink || appData.universalUrl || appData.mobileUrl || appData.webFallback || appData.url;
    } else if (isAndroid) {
      targetUrl = appData.androidIntent || appData.androidDeepLink || appData.universalUrl || appData.mobileUrl || appData.webFallback || appData.url;
    } else {
      targetUrl = appData.webFallback || appData.universalUrl || appData.deepLink || appData.url;
    }

    if (!targetUrl || targetUrl === '#' || targetUrl.startsWith('#')) return;

    try {
      if (isMobile) {
        if (/^(?:tel|sms|mailto):/i.test(targetUrl)) {
          window.location.href = targetUrl;
          return;
        }

        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => link.remove(), 1000);

        if (targetUrl.startsWith('intent://') || targetUrl.startsWith('whatsapp://')) {
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 200);
        }
      } else {
        window.open(targetUrl, '_blank');
      }
    } catch (err) {
      console.warn('App launch notice:', err);
    }
  }

  // Append a message bubble to the chat feed
  function appendMessageCard({ sender, text, speechText, isUser, time, lang, action, data, attachment }) {
    const card = document.createElement('div');
    card.className = `message-card ${isUser ? 'user-msg' : 'jarvis-msg'}`;

    const avatarChar = isUser ? (sender.charAt(0) || 'U') : 'A';
    const langTag = lang === 'hi' ? 'HI' : 'EN';
    const isGemini = action === 'gemini_answer';
    const isGeminiPrompt = action === 'gemini_key_prompt';
    const isWhatsApp = action === 'whatsapp_message' && data;
    const isPhoneCall = action === 'phone_call' && data;
    const isSms = action === 'send_sms' && data;
    const isMaps = action === 'open_maps' && data;
    const isOpenUrl = action === 'open_url' && data && data.url;
    const isLaunchApp = (action === 'launch_app' || action === 'open_app') && data;

    // Determine platform-optimized launch URLs for interactive touch cards
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    let mobileLaunchUrl = null;
    let appPillLabel = 'OPEN APP';
    let appPillClass = 'primary';
    let appIcon = '🚀';

    if (isLaunchApp) {
      const appNameUpper = (data.appName || '').toUpperCase();
      if (appNameUpper.includes('WHATSAPP')) {
        appPillClass = 'whatsapp';
        appIcon = '📲';
        mobileLaunchUrl = data.universalUrl || data.mobileUrl || 'https://wa.me/';
        appPillLabel = 'OPEN WHATSAPP';
      } else if (appNameUpper.includes('YOUTUBE')) {
        appPillClass = 'youtube';
        appIcon = '▶️';
        mobileLaunchUrl = data.universalUrl || data.mobileUrl || 'https://www.youtube.com';
        appPillLabel = 'OPEN YOUTUBE';
      } else if (data.isCamera) {
        appIcon = '📸';
        appPillLabel = 'LAUNCH CAMERA';
      } else if (data.isCalculator) {
        appIcon = '🧮';
        appPillLabel = 'OPEN CALCULATOR';
      } else if (data.isSettings) {
        appIcon = '⚙️';
        appPillLabel = 'OPEN SETTINGS';
      } else {
        if (isIOS) {
          mobileLaunchUrl = data.iosDeepLink || data.universalUrl || data.mobileUrl || data.webFallback || data.deepLink;
        } else if (isAndroid) {
          mobileLaunchUrl = data.androidIntent || data.androidDeepLink || data.universalUrl || data.mobileUrl || data.webFallback || data.deepLink;
        } else {
          mobileLaunchUrl = data.webFallback || data.universalUrl || data.deepLink;
        }
        appPillLabel = `OPEN ${escapeHtml(appNameUpper || 'APP')}`;
      }
    }

    card.innerHTML = `
      <div class="msg-avatar">${avatarChar}</div>
      <div class="msg-body">
        <div class="msg-sender">
          ${escapeHtml(sender)}
          <span class="msg-lang-badge ${lang === 'hi' ? 'hi' : ''}">[${langTag}]</span>
          <span class="time-stamp">${time}</span>
        </div>
        ${attachment ? `
          <div class="msg-attachment-badge">
            <span>📎</span>
            <span>${escapeHtml(attachment.name || 'File')} (${Math.round((attachment.size || 0) / 1024)} KB)</span>
          </div>
          ${attachment.dataUrl && (attachment.type && attachment.type.startsWith('image/')) ? `
            <img src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name || 'image')}" class="msg-attachment-thumb">
          ` : ''}
        ` : ''}
        <div class="msg-text">${formatMarkdownText(text)}</div>
        ${isLaunchApp ? `
          <div class="hud-app-launch-card">
            <div class="hud-app-launch-header">
              <span>${appIcon}</span>
              <span>${escapeHtml((data.appName || 'APP').toUpperCase())} READY</span>
            </div>
            <div class="hud-app-launch-actions">
              ${data.isCamera ? `
                <button type="button" class="hud-app-launch-btn primary trigger-device-camera-btn">
                  <span>📸</span> LAUNCH CAMERA VIEW
                </button>
              ` : data.isCalculator ? `
                <button type="button" class="hud-app-launch-btn primary trigger-device-calc-btn">
                  <span>🧮</span> OPEN CALCULATOR
                </button>
                <a href="${data.universalUrl || 'https://www.google.com/search?q=calculator'}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn secondary" style="font-size:12px;">
                  <span>🌐</span> GOOGLE CALCULATOR ↗
                </a>
              ` : data.isSettings ? `
                <button type="button" class="hud-app-launch-btn primary open-settings-quick-btn">
                  <span>⚙️</span> OPEN SYSTEM SETTINGS
                </button>
              ` : `
                <a href="${mobileLaunchUrl || data.universalUrl || data.webFallback || '#'}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn ${appPillClass}">
                  <span>${appIcon}</span> ${appPillLabel} NOW ↗
                </a>
                ${data.webFallback && data.webFallback !== mobileLaunchUrl ? `
                  <a href="${data.webFallback}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn secondary" style="font-size:11px;">
                    <span>🌐</span> WEB VERSION
                  </a>
                ` : ''}
              `}
            </div>
            <span class="hud-app-launch-hint">Tap above to open ${escapeHtml(data.appName || 'application')} on Mobile, iOS, or Tablet</span>
          </div>
        ` : ''}
        ${isWhatsApp ? `
          <div class="hud-app-launch-card">
            <div class="hud-app-launch-header">
              <span>📲</span>
              <span>WHATSAPP MESSAGE READY</span>
            </div>
            <div class="hud-app-launch-actions">
              <a href="${data.waMeUrl || data.whatsappWebUrl || 'https://wa.me/'}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn whatsapp">
                <span>📲</span> OPEN IN WHATSAPP ↗
              </a>
              ${data.whatsappDesktopUrl ? `
                <a href="${data.whatsappDesktopUrl}" class="hud-app-launch-btn secondary" style="font-size:11px;">
                  <span>💻</span> DESKTOP APP
                </a>
              ` : ''}
              <button type="button" class="hud-app-launch-btn secondary copy-msg-quick-btn" data-msg="${escapeHtml(data.message || '')}" style="font-size:11px;">
                <span>📋</span> COPY TEXT
              </button>
            </div>
            <span class="hud-app-launch-hint">Tap above to launch WhatsApp chat directly on your phone</span>
          </div>
        ` : ''}
        ${isPhoneCall ? `
          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <a href="${data.telUrl}" class="hud-app-launch-btn primary" style="font-size:12px;">
              <span>📞</span> CALL ${escapeHtml(data.recipient || data.phone || 'CONTACT')} NOW
            </a>
            ${data.phone ? `
            <button type="button" class="hud-app-launch-btn secondary copy-msg-quick-btn" data-msg="${escapeHtml(data.phone)}" style="font-size:11px;">
              <span>📋</span> COPY NUMBER
            </button>
            ` : ''}
          </div>
        ` : ''}
        ${isSms ? `
          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <a href="${data.smsUrl}" class="hud-app-launch-btn primary" style="font-size:12px; background:rgba(255,170,0,0.25); border-color:#ffaa00; color:#ffaa00;">
              <span>💬</span> OPEN SMS / MESSAGES APP
            </a>
            <button type="button" class="hud-app-launch-btn secondary copy-msg-quick-btn" data-msg="${escapeHtml(data.message || '')}" style="font-size:11px;">
              <span>📋</span> COPY TEXT
            </button>
          </div>
        ` : ''}
        ${isMaps ? `
          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <a href="${data.googleMapsUrl || data.url}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn primary" style="font-size:11px;">
              <span>🌐</span> GOOGLE MAPS (ANDROID / WEB)
            </a>
            ${data.appleMapsUrl ? `
            <a href="${data.appleMapsUrl}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn secondary" style="font-size:11px; border-color:#ff7700; color:#ff7700;">
              <span>🍏</span> APPLE MAPS (MAC / IOS)
            </a>
            ` : ''}
          </div>
        ` : ''}
        ${(isOpenUrl && data.platform === 'youtube') ? `
          <div class="hud-app-launch-card">
            <div class="hud-app-launch-header">
              <span>▶️</span>
              <span>YOUTUBE PLAYBACK ENGAGED</span>
            </div>
            <div class="hud-app-launch-actions">
              <a href="${data.universalUrl || data.url}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn youtube">
                <span>▶️</span> OPEN YOUTUBE APP ↗
              </a>
            </div>
            <span class="hud-app-launch-hint">Tap above to play in YouTube on your phone / tablet</span>
          </div>
        ` : isOpenUrl ? `
          <div style="margin-top:10px;">
            <a href="${data.url}" target="_blank" rel="noopener noreferrer" class="hud-app-launch-btn primary" style="font-size:11px;">
              <span>🌐</span> OPEN LINK (${escapeHtml(data.platform || 'WEB')}) ↗
            </a>
          </div>
        ` : ''}
        ${isGeminiPrompt ? `
          <div style="margin-top:10px;">
            <button class="hud-btn secondary open-settings-quick-btn" style="font-size:11px; padding:6px 14px; border-radius:4px; font-family:var(--font-hud); letter-spacing:1px;">
              ⚙️ OPEN SETTINGS TO ENTER GEMINI KEY
            </button>
          </div>
        ` : ''}
        ${!isUser && speechText ? `
          <div class="msg-actions">
            <button class="replay-speech-btn" title="Replay voice audio">
              <span>▶</span> REPLAY
            </button>
          </div>
        ` : ''}
      </div>
    `;

    const copyBtn = card.querySelector('.copy-msg-quick-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const msg = copyBtn.getAttribute('data-msg') || '';
        navigator.clipboard.writeText(msg).then(() => {
          copyBtn.innerHTML = '<span>✅</span> COPIED!';
          setTimeout(() => { copyBtn.innerHTML = '<span>📋</span> COPY TEXT'; }, 2000);
        });
      });
    }

    const openSettingsQuickBtns = card.querySelectorAll('.open-settings-quick-btn');
    openSettingsQuickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        audio.init();
        settingsModal.classList.add('open');
        settingsModal.style.display = 'flex';
      });
    });

    const triggerCamBtn = card.querySelector('.trigger-device-camera-btn');
    if (triggerCamBtn) {
      triggerCamBtn.addEventListener('click', () => {
        audio.init();
        openDeviceCamera();
      });
    }

    const triggerCalcBtn = card.querySelector('.trigger-device-calc-btn');
    if (triggerCalcBtn) {
      triggerCalcBtn.addEventListener('click', () => {
        audio.init();
        openCyberCalculator();
      });
    }

    // Replay speech button listener (filters out Gemini from voice)
    const replayBtn = card.querySelector('.replay-speech-btn');
    if (replayBtn && speechText) {
      replayBtn.addEventListener('click', () => {
        voice.speak(cleanSpeechForVoice(speechText), lang);
      });
    }

    chatFeed.appendChild(card);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  // ==========================================================================
  // CONVERSATION HISTORY (/api/history - AUTO-SAVED IN MONGODB)
  // ==========================================================================
  async function loadHistory() {
    try {
      const res = await fetch(`/api/history?deviceId=${encodeURIComponent(config.deviceId)}`, {
        headers: getDeviceHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();

      chatFeed.innerHTML = '';
      if (data.history && data.history.length > 0) {
        // Visual indicator that chats were restored from MongoDB
        const restoreBadge = document.createElement('div');
        restoreBadge.className = 'history-restore-badge';
        restoreBadge.style.cssText = 'text-align: center; margin: 8px 0 16px; font-family: var(--font-hud); font-size: 10px; color: var(--hud-cyan); letter-spacing: 1.5px; opacity: 0.85; padding: 4px; border-bottom: 1px dashed rgba(0,240,255,0.25);';
        const sessionLabel = currentUser 
          ? `SECURE VAULT: ${escapeHtml(currentUser.email)}`
          : `${escapeHtml(config.deviceName.toUpperCase())} (${escapeHtml(config.deviceId)})`;
        restoreBadge.innerHTML = `⚡ [${sessionLabel} • RESTORED ${data.history.length} CHATS]`;
        chatFeed.appendChild(restoreBadge);

        data.history.forEach(item => {
          const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const responseText = item.aryaResponse || item.jarvisResponse || '';
          const speechText = item.metadata && item.metadata.speech ? item.metadata.speech : responseText;

          // User Message
          appendMessageCard({
            sender: item.userName || config.userName,
            text: item.userMessage,
            isUser: true,
            time,
            lang: item.language || 'en',
            attachment: item.attachment || null
          });
          // ARYA Response
          appendMessageCard({
            sender: 'ARYA.',
            text: responseText,
            speechText: speechText,
            isUser: false,
            time,
            lang: item.language || 'en',
            action: item.action
          });
        });

        // Ensure scrolled to the latest message
        chatFeed.scrollTop = chatFeed.scrollHeight;
      }
    } catch (e) {
      console.warn('History load error:', e.message);
    }
  }

  clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm(`Clear all conversation logs for ${config.deviceName} (${config.deviceId}) in MongoDB?`)) return;
    try {
      await fetch(`/api/history?deviceId=${encodeURIComponent(config.deviceId)}`, {
        method: 'DELETE',
        headers: getDeviceHeaders()
      });
      triggerAutoSaveAnimation();
      chatFeed.innerHTML = `
        <div class="message-card jarvis-msg">
          <div class="msg-avatar">A</div>
          <div class="msg-body">
            <div class="msg-sender">ARYA. <span class="time-stamp">RESET</span></div>
            <div class="msg-text">Conversation memory banks cleared for this device in MongoDB, ${config.userName}. Awaiting your next directive.</div>
          </div>
        </div>
      `;
    } catch (e) {
      alert('Failed to clear logs.');
    }
  });

  // ==========================================================================
  // NEURAL MEMORY NOTES (/api/notes - AUTO-SAVED IN MONGODB)
  // ==========================================================================
  async function loadNotes() {
    try {
      const res = await fetch(`/api/notes?deviceId=${encodeURIComponent(config.deviceId)}`, {
        headers: getDeviceHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.notes && data.notes.length > 0) {
        notesList.innerHTML = '';
        data.notes.forEach(note => {
          const dateStr = new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const item = document.createElement('div');
          item.className = 'note-item';
          item.innerHTML = `
            <div class="note-content-wrap">
              <div class="note-text">${escapeHtml(note.content)}</div>
              <div class="note-date">⚡ AUTO-SAVED • ${dateStr} [${escapeHtml(note.deviceName || config.deviceName)}]</div>
            </div>
            <button class="delete-note-btn" title="Delete Note">&times;</button>
          `;

          item.querySelector('.delete-note-btn').addEventListener('click', async () => {
            try {
              await fetch(`/api/notes/${note._id}?deviceId=${encodeURIComponent(config.deviceId)}`, {
                method: 'DELETE',
                headers: getDeviceHeaders()
              });
              triggerAutoSaveAnimation();
              item.remove();
              if (notesList.children.length === 0) {
                notesList.innerHTML = '<div class="empty-state">No notes recorded for this device yet. Say "ARYA, note likho: ..." or type above.</div>';
              }
            } catch (err) {
              console.error(err);
            }
          });

          notesList.appendChild(item);
        });
      } else {
        notesList.innerHTML = '<div class="empty-state">No notes recorded for this device yet. Say "ARYA, note likho: ..." or type above.</div>';
      }
    } catch (e) {
      console.warn('Notes load error:', e.message);
    }
  }

  saveNoteBtn.addEventListener('click', async () => {
    const text = newNoteInput.value.trim();
    if (!text) return;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: getDeviceHeaders(),
        body: JSON.stringify({
          content: text,
          deviceId: config.deviceId,
          deviceName: config.deviceName
        })
      });
      if (res.ok) {
        newNoteInput.value = '';
        triggerAutoSaveAnimation();
        audio.playAcknowledge();
        loadNotes();
      }
    } catch (e) {
      console.error(e);
    }
  });

  newNoteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveNoteBtn.click();
    }
  });

  // ==========================================================================
  // EVENT LISTENERS & CONTROLS
  // ==========================================================================

  // Arc Reactor Click (Push-To-Talk)
  reactorBtn.addEventListener('click', () => {
    audio.init();
    voice.toggleListening();
  });

  // Inline Mic Click
  inlineMicBtn.addEventListener('click', () => {
    audio.init();
    voice.toggleListening();
  });

  // Attachment Button & File Upload
  if (attachFileBtn && fileAttachmentInput) {
    attachFileBtn.addEventListener('click', () => {
      audio.init();
      fileAttachmentInput.click();
    });

    fileAttachmentInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        alert('File size exceeds 20MB limit.');
        fileAttachmentInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target.result;
        currentAttachment = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: dataUrl
        };

        if (attachmentChipName) attachmentChipName.textContent = file.name;
        if (attachmentChipSize) attachmentChipSize.textContent = `${Math.round(file.size / 1024)} KB`;

        if (file.type.startsWith('image/') && attachmentChipThumb) {
          attachmentChipThumb.style.backgroundImage = `url(${dataUrl})`;
          attachmentChipThumb.style.display = 'block';
        } else if (attachmentChipThumb) {
          attachmentChipThumb.style.display = 'none';
        }

        if (attachmentPreviewBar) {
          attachmentPreviewBar.style.display = 'flex';
        }
        audio.playAcknowledge();
      };
      reader.readAsDataURL(file);
    });
  }

  if (attachmentRemoveBtn) {
    attachmentRemoveBtn.addEventListener('click', () => {
      currentAttachment = null;
      if (fileAttachmentInput) fileAttachmentInput.value = '';
      if (attachmentPreviewBar) attachmentPreviewBar.style.display = 'none';
    });
  }

  // Form Submission (Accepts text or file attachment)
  promptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    audio.init();
    const val = userInput.value.trim();
    if (val || currentAttachment) {
      processUserQuery(val);
    }
  });

  // ==========================================================================
  // USER AUTHENTICATION & PROFILE CONTROLS (GEMINI / CHATGPT STYLE)
  // ==========================================================================

  // User Profile / Sign In button
  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      audio.init();
      if (!currentUser) {
        // Direct click on "Sign In" when not logged in -> directly opens Login & Register modal!
        if (authModal) {
          authModal.classList.add('open');
          authModal.style.display = 'flex';
          if (authTabSignIn) authTabSignIn.click();
        }
      } else {
        // Once logged in by user -> show profile dropdown
        if (userDropdownMenu) {
          const isOpen = userDropdownMenu.style.display === 'flex';
          userDropdownMenu.style.display = isOpen ? 'none' : 'flex';
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (userDropdownMenu && !headerAuthBtn.contains(e.target) && !userDropdownMenu.contains(e.target)) {
        userDropdownMenu.style.display = 'none';
      }
    });
  }

  // Dropdown "Sign In / Register" action
  if (dropdownAuthActionBtn && authModal) {
    dropdownAuthActionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (userDropdownMenu) userDropdownMenu.style.display = 'none';
      authModal.classList.add('open');
      authModal.style.display = 'flex';
    });
  }

  // Dropdown "Preferences" action
  if (dropdownOpenSettingsBtn && settingsModal) {
    dropdownOpenSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (userDropdownMenu) userDropdownMenu.style.display = 'none';
      settingsModal.classList.add('open');
    });
  }

  // Dropdown "Sign Out" action
  if (dropdownLogoutBtn) {
    dropdownLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (userDropdownMenu) userDropdownMenu.style.display = 'none';
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: getDeviceHeaders()
        });
      } catch (err) {}
      clearAuthSession();
      loadHistory();
      loadNotes();
      audio.playAcknowledge();
    });
  }

  // Close Auth Modal
  if (closeAuthModalBtn && authModal) {
    closeAuthModalBtn.addEventListener('click', () => {
      authModal.classList.remove('open');
      authModal.style.display = 'none';
    });
  }
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        authModal.classList.remove('open');
        authModal.style.display = 'none';
      }
    });
  }

  // Auth Tabs Switching (Sign In <-> Sign Up)
  if (authTabSignIn && authTabSignUp && signInForm && signUpForm) {
    authTabSignIn.addEventListener('click', () => {
      authTabSignIn.classList.add('active');
      authTabSignUp.classList.remove('active');
      signInForm.style.display = 'flex';
      signUpForm.style.display = 'none';
      if (signInErrorMsg) signInErrorMsg.style.display = 'none';
    });

    authTabSignUp.addEventListener('click', () => {
      authTabSignUp.classList.add('active');
      authTabSignIn.classList.remove('active');
      signUpForm.style.display = 'flex';
      signInForm.style.display = 'none';
      if (signUpErrorMsg) signUpErrorMsg.style.display = 'none';
    });
  }

  // Sign In Form Submission
  if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      audio.init();
      const email = (signInEmail.value || '').trim();
      const password = signInPassword.value || '';
      if (!email || !password) return;

      if (signInSubmitBtn) signInSubmitBtn.textContent = 'AUTHENTICATING...';
      if (signInErrorMsg) signInErrorMsg.style.display = 'none';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAuthSession(data.token, data.user);
          authModal.classList.remove('open');
          authModal.style.display = 'none';
          signInPassword.value = '';
          audio.playAcknowledge();
          loadHistory();
          loadNotes();
        } else {
          if (signInErrorMsg) {
            signInErrorMsg.textContent = data.error || 'Authentication failed.';
            signInErrorMsg.style.display = 'block';
          }
        }
      } catch (err) {
        if (signInErrorMsg) {
          signInErrorMsg.textContent = 'Network error connecting to auth server.';
          signInErrorMsg.style.display = 'block';
        }
      } finally {
        if (signInSubmitBtn) signInSubmitBtn.textContent = 'SIGN IN TO ARYA';
      }
    });
  }

  // Sign Up Form Submission
  if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      audio.init();
      const name = (signUpName.value || '').trim();
      const email = (signUpEmail.value || '').trim();
      const password = signUpPassword.value || '';
      const city = (signUpCity.value || '').trim() || 'Patna';
      if (!email || !password) return;

      if (signUpSubmitBtn) signUpSubmitBtn.textContent = 'CREATING VAULT...';
      if (signUpErrorMsg) signUpErrorMsg.style.display = 'none';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, city })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAuthSession(data.token, data.user);
          authModal.classList.remove('open');
          authModal.style.display = 'none';
          signUpPassword.value = '';
          audio.playAcknowledge();
          loadHistory();
          loadNotes();
        } else {
          if (signUpErrorMsg) {
            signUpErrorMsg.textContent = data.error || 'Registration failed.';
            signUpErrorMsg.style.display = 'block';
          }
        }
      } catch (err) {
        if (signUpErrorMsg) {
          signUpErrorMsg.textContent = 'Network error connecting to auth server.';
          signUpErrorMsg.style.display = 'block';
        }
      } finally {
        if (signUpSubmitBtn) signUpSubmitBtn.textContent = 'CREATE PRIVATE ACCOUNT';
      }
    });
  }

  // ==========================================================================
  // DISCREET OVERSEER (SUPER ADMIN) CONSOLE
  // ==========================================================================
  if (dropdownAdminBtn && adminModal) {
    dropdownAdminBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (userDropdownMenu) userDropdownMenu.style.display = 'none';
      adminModal.classList.add('open');
      adminModal.style.display = 'flex';
      loadAdminChats();
      loadAdminUsers();
    });
  }

  if (closeAdminModalBtn && adminModal) {
    closeAdminModalBtn.addEventListener('click', () => {
      adminModal.classList.remove('open');
      adminModal.style.display = 'none';
    });
  }
  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) {
        adminModal.classList.remove('open');
        adminModal.style.display = 'none';
      }
    });
  }

  // Overseer Tab Switching
  if (adminTabChatsBtn && adminTabUsersBtn && adminChatsTabContent && adminUsersTabContent) {
    adminTabChatsBtn.addEventListener('click', () => {
      adminTabChatsBtn.classList.add('active');
      adminTabUsersBtn.classList.remove('active');
      adminChatsTabContent.style.display = 'block';
      adminUsersTabContent.style.display = 'none';
      loadAdminChats();
    });

    adminTabUsersBtn.addEventListener('click', () => {
      adminTabUsersBtn.classList.add('active');
      adminTabChatsBtn.classList.remove('active');
      adminUsersTabContent.style.display = 'block';
      adminChatsTabContent.style.display = 'none';
      loadAdminUsers();
    });
  }

  // Load All Global Chats (Super Admin)
  async function loadAdminChats() {
    if (!adminChatsList) return;
    const searchVal = adminChatSearchInput ? adminChatSearchInput.value.trim() : '';
    adminChatsList.innerHTML = '<div class="empty-state">Loading global stream...</div>';

    try {
      const res = await fetch(`/api/admin/chats?search=${encodeURIComponent(searchVal)}&limit=60`, {
        headers: getDeviceHeaders()
      });
      if (!res.ok) {
        adminChatsList.innerHTML = '<div class="empty-state">Unable to load admin chats (unauthorized).</div>';
        return;
      }
      const data = await res.json();
      if (adminTotalChatsBadge) adminTotalChatsBadge.textContent = data.total || (data.chats && data.chats.length) || 0;

      if (data.chats && data.chats.length > 0) {
        adminChatsList.innerHTML = '';
        data.chats.forEach(chat => {
          const card = document.createElement('div');
          card.className = 'admin-chat-card';
          const timeStr = new Date(chat.timestamp).toLocaleString();
          const userIdentifier = chat.userEmail || chat.userName || chat.deviceName || chat.deviceId || 'Anonymous';

          card.innerHTML = `
            <div class="admin-chat-meta">
              <span class="admin-user-pill">👤 ${escapeHtml(userIdentifier)}</span>
              <span class="admin-time-pill">🕒 ${timeStr}</span>
            </div>
            <div class="admin-chat-msg-row">
              <div class="admin-chat-user-msg">💬 Prompt: ${escapeHtml(chat.userMessage || '')}</div>
              ${chat.attachment ? `<div class="msg-attachment-badge">📎 ${escapeHtml(chat.attachment.name || 'File')}</div>` : ''}
              <div class="admin-chat-arya-msg">⚡ ARYA: ${escapeHtml(chat.aryaResponse || chat.jarvisResponse || '')}</div>
            </div>
            <button type="button" class="admin-chat-delete-btn" data-id="${chat._id}">🗑️ DELETE RECORD</button>
          `;

          const deleteBtn = card.querySelector('.admin-chat-delete-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
              if (!confirm('Permanently delete this chat record from MongoDB?')) return;
              try {
                const delRes = await fetch(`/api/admin/chats/${chat._id}`, {
                  method: 'DELETE',
                  headers: getDeviceHeaders()
                });
                if (delRes.ok) {
                  card.remove();
                }
              } catch (e) {
                alert('Delete failed.');
              }
            });
          }

          adminChatsList.appendChild(card);
        });
      } else {
        adminChatsList.innerHTML = '<div class="empty-state">No conversations found matching query.</div>';
      }
    } catch (err) {
      adminChatsList.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  }

  if (adminRefreshChatsBtn) {
    adminRefreshChatsBtn.addEventListener('click', loadAdminChats);
  }
  if (adminChatSearchInput) {
    let searchDebounce = null;
    adminChatSearchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(loadAdminChats, 400);
    });
  }

  // Load All Registered Users & Manage Roles (Admin Promotes Other Admins, Creates & Deletes Users)
  async function loadAdminUsers() {
    if (!adminUsersList) return;
    adminUsersList.innerHTML = '<div class="empty-state">Loading registered accounts...</div>';

    try {
      const res = await fetch('/api/admin/users', {
        headers: getDeviceHeaders()
      });
      if (!res.ok) {
        adminUsersList.innerHTML = '<div class="empty-state">Unable to load users (unauthorized).</div>';
        return;
      }
      const data = await res.json();
      if (adminTotalUsersBadge) adminTotalUsersBadge.textContent = data.users ? data.users.length : 0;

      if (data.users && data.users.length > 0) {
        adminUsersList.innerHTML = '';
        data.users.forEach(u => {
          const card = document.createElement('div');
          card.className = 'admin-user-card';
          const joinedStr = new Date(u.createdAt).toLocaleDateString();
          const isAdmin = u.role === 'admin';
          const isSelf = currentUser && (String(currentUser._id) === String(u._id) || (currentUser.email && currentUser.email.toLowerCase() === (u.email || '').toLowerCase()));
          const isMasterAdmin = (u.email || '').toLowerCase() === 'admin@arya.ai';

          let actionsHtml = '';
          if (isSelf) {
            actionsHtml = `<span class="admin-user-current-tag">ACTIVE ACCOUNT (YOU)</span>`;
          } else if (isMasterAdmin) {
            actionsHtml = `<span class="admin-user-role-badge admin">MASTER OVERSEER 🛡️</span>`;
          } else {
            actionsHtml = `
              <button type="button" class="admin-role-toggle-btn" data-id="${u._id}" data-role="${u.role}">
                ${isAdmin ? 'DEMOTE TO USER' : 'PROMOTE TO ADMIN'}
              </button>
              <button type="button" class="admin-user-delete-btn" data-id="${u._id}" data-email="${escapeHtml(u.email)}" data-name="${escapeHtml(u.name || 'User')}">
                <span>🗑️ DELETE</span>
              </button>
            `;
          }

          card.innerHTML = `
            <div class="admin-user-card-info">
              <div class="admin-user-card-name">
                ${escapeHtml(u.name || 'User')} 
                <span class="admin-user-role-badge ${isAdmin ? 'admin' : 'user'}">${isAdmin ? '🛡️ ADMIN' : 'USER'}</span>
              </div>
              <div class="admin-user-card-email">${escapeHtml(u.email)}</div>
              <div class="admin-user-card-stats">Joined: ${joinedStr} • City: ${escapeHtml(u.city || 'Patna')} • Total Chats: ${u.chatCount || 0}</div>
            </div>
            <div class="admin-user-actions">
              ${actionsHtml}
            </div>
          `;

          // Handle role toggle
          const toggleBtn = card.querySelector('.admin-role-toggle-btn');
          if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
              const targetRole = isAdmin ? 'user' : 'admin';
              if (!confirm(`Are you sure you want to change ${u.email} to ${targetRole.toUpperCase()}?`)) return;

              try {
                const roleRes = await fetch(`/api/admin/users/${u._id}/role`, {
                  method: 'POST',
                  headers: getDeviceHeaders(),
                  body: JSON.stringify({ role: targetRole })
                });
                const roleData = await roleRes.json();
                if (roleRes.ok && roleData.success) {
                  audio.playAcknowledge();
                  loadAdminUsers();
                } else {
                  alert(roleData.error || 'Failed to update user role.');
                }
              } catch (e) {
                alert('Network error updating role.');
              }
            });
          }

          // Handle user deletion
          const deleteBtn = card.querySelector('.admin-user-delete-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
              const targetDesc = u.name ? `${u.name} (${u.email})` : u.email;
              const confirmed = confirm(`Are you sure you want to permanently delete user:\n\n${targetDesc}?\n\n⚠️ This will permanently remove their account, all their chat logs, and all their saved notes from MongoDB.`);
              if (!confirmed) return;

              deleteBtn.disabled = true;
              deleteBtn.textContent = 'DELETING...';

              try {
                const delRes = await fetch(`/api/admin/users/${u._id}`, {
                  method: 'DELETE',
                  headers: getDeviceHeaders()
                });
                const delData = await delRes.json();
                if (delRes.ok && delData.success) {
                  audio.playAcknowledge();
                  alert(`✅ ${delData.message}`);
                  loadAdminUsers();
                  if (typeof loadAdminChats === 'function') loadAdminChats();
                } else {
                  alert(`⚠️ ${delData.error || 'Failed to delete user.'}`);
                  deleteBtn.disabled = false;
                  deleteBtn.innerHTML = '<span>🗑️ DELETE</span>';
                }
              } catch (err) {
                alert(`Network error deleting user: ${err.message}`);
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<span>🗑️ DELETE</span>';
              }
            });
          }

          adminUsersList.appendChild(card);
        });
      } else {
        adminUsersList.innerHTML = '<div class="empty-state">No registered users found.</div>';
      }
    } catch (err) {
      adminUsersList.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  }

  if (adminRefreshUsersBtn) {
    adminRefreshUsersBtn.addEventListener('click', loadAdminUsers);
  }

  // Toggle Create User Form Panel
  if (adminToggleCreateUserBtn && adminCreateUserContainer) {
    adminToggleCreateUserBtn.addEventListener('click', () => {
      const isVisible = adminCreateUserContainer.style.display !== 'none';
      adminCreateUserContainer.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && adminNewUserName) adminNewUserName.focus();
    });
  }

  if (adminCloseCreateUserBtn && adminCreateUserContainer) {
    adminCloseCreateUserBtn.addEventListener('click', () => {
      adminCreateUserContainer.style.display = 'none';
    });
  }

  if (adminCancelCreateUserBtn && adminCreateUserContainer) {
    adminCancelCreateUserBtn.addEventListener('click', () => {
      adminCreateUserContainer.style.display = 'none';
    });
  }

  // Handle Admin Create New User Form Submit
  if (adminCreateUserForm) {
    adminCreateUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (adminNewUserName.value || '').trim();
      const email = (adminNewUserEmail.value || '').trim();
      const password = adminNewUserPassword.value || '';
      const role = adminNewUserRole.value || 'user';
      const city = (adminNewUserCity.value || '').trim() || 'Patna';
      const preferredLanguage = adminNewUserLang.value || 'hi';

      if (!name || !email || !password) {
        alert('Please fill in Name, Email, and Password.');
        return;
      }

      adminSubmitCreateUserBtn.disabled = true;
      adminSubmitCreateUserBtn.textContent = 'CREATING...';
      adminCreateUserMsg.style.display = 'block';
      adminCreateUserMsg.className = 'gemini-test-status testing';
      adminCreateUserMsg.textContent = 'Creating user account in MongoDB...';

      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: getDeviceHeaders(),
          body: JSON.stringify({ name, email, password, role, city, preferredLanguage })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          adminCreateUserMsg.className = 'gemini-test-status success';
          adminCreateUserMsg.textContent = `✅ ${data.message}`;
          audio.playAcknowledge();
          adminCreateUserForm.reset();
          if (adminNewUserCity) adminNewUserCity.value = 'Patna';
          if (adminNewUserLang) adminNewUserLang.value = 'hi';
          setTimeout(() => {
            if (adminCreateUserContainer) adminCreateUserContainer.style.display = 'none';
            adminCreateUserMsg.style.display = 'none';
          }, 2000);
          loadAdminUsers();
        } else {
          adminCreateUserMsg.className = 'gemini-test-status error';
          adminCreateUserMsg.textContent = `⚠️ ${data.error || 'Failed to create user.'}`;
        }
      } catch (err) {
        adminCreateUserMsg.className = 'gemini-test-status error';
        adminCreateUserMsg.textContent = `❌ Network Error: ${err.message}`;
      } finally {
        adminSubmitCreateUserBtn.disabled = false;
        adminSubmitCreateUserBtn.textContent = 'CONFIRM & CREATE USER';
      }
    });
  }

  // Toggle Quick Promote Form Panel
  if (adminTogglePromoteBtn && adminQuickPromoteContainer) {
    adminTogglePromoteBtn.addEventListener('click', () => {
      const isVisible = adminQuickPromoteContainer.style.display !== 'none';
      adminQuickPromoteContainer.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && adminQuickPromoteEmail) adminQuickPromoteEmail.focus();
    });
  }

  // Quick Promote any registered user to Admin by Email (Admin Console)
  const adminQuickPromoteForm = document.getElementById('adminQuickPromoteForm');
  const adminQuickPromoteEmail = document.getElementById('adminQuickPromoteEmail');
  const adminQuickPromoteMsg = document.getElementById('adminQuickPromoteMsg');
  const adminQuickPromoteBtn = document.getElementById('adminQuickPromoteBtn');

  if (adminQuickPromoteForm) {
    adminQuickPromoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (adminQuickPromoteEmail.value || '').trim();
      if (!email) return;

      adminQuickPromoteBtn.textContent = 'PROMOTING...';
      adminQuickPromoteMsg.style.display = 'block';
      adminQuickPromoteMsg.className = 'gemini-test-status testing';
      adminQuickPromoteMsg.textContent = `Promoting ${email} to Administrator...`;

      try {
        const res = await fetch('/api/admin/promote-by-email', {
          method: 'POST',
          headers: getDeviceHeaders(),
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          adminQuickPromoteMsg.className = 'gemini-test-status success';
          adminQuickPromoteMsg.textContent = `✅ ${data.message}`;
          adminQuickPromoteEmail.value = '';
          audio.playAcknowledge();
          loadAdminUsers();
        } else {
          adminQuickPromoteMsg.className = 'gemini-test-status error';
          adminQuickPromoteMsg.textContent = `⚠️ ${data.error || 'Failed to promote user.'}`;
        }
      } catch (err) {
        adminQuickPromoteMsg.className = 'gemini-test-status error';
        adminQuickPromoteMsg.textContent = `❌ Network Error: ${err.message}`;
      } finally {
        adminQuickPromoteBtn.textContent = 'MAKE ADMIN 🛡️';
      }
    });
  }

  // Toggle Continuous / Always-On Listening
  toggleListenModeBtn.addEventListener('click', () => {
    audio.init();
    const nextState = !voice.continuousMode;
    voice.setContinuous(nextState);

    if (nextState) {
      toggleListenModeBtn.classList.add('active');
      listenModeText.textContent = 'ALWAYS-ON MIC: ACTIVE';
      localStorage.setItem('arya_continuous', 'true');
      if (!voice.isListening) voice.startListening();
    } else {
      toggleListenModeBtn.classList.remove('active');
      listenModeText.textContent = 'ALWAYS-ON MIC: OFF';
      localStorage.setItem('arya_continuous', 'false');
      if (voice.isListening) voice.stopListening();
    }
    config.continuous = nextState;
    if (alwaysOnMicCheckbox) alwaysOnMicCheckbox.checked = nextState;
    saveSettingsToMongoDB();
  });

  // Toggle Mute Voice Responses
  toggleMuteVoiceBtn.addEventListener('click', () => {
    voice.voiceMuted = !voice.voiceMuted;
    if (voice.voiceMuted) {
      voice.stopSpeaking();
      toggleMuteVoiceBtn.classList.remove('active');
      muteVoiceText.textContent = 'VOICE: MUTED';
    } else {
      toggleMuteVoiceBtn.classList.add('active');
      muteVoiceText.textContent = 'VOICE: ON';
    }
  });

  // Test Voice Button
  wakeSoundTestBtn.addEventListener('click', () => {
    audio.init();
    audio.playStartup();
    setTimeout(() => {
      if (config.language === 'hi') {
        voice.speak(`आवाज़ सिंथेसाइज़र सक्रिय हैं, ${config.userName}। आर्या सिस्टम ऑनलाइन। शुभांशु कुमार श्रीवास्तव द्वारा निर्मित।`, 'hi');
      } else {
        voice.speak(`Voice synthesizers calibrated and operational, ${config.userName}. ARYA tactical matrix online. Architected by Shubhanshu Kumar Srivastav.`, 'en');
      }
    }, 400);
  });

  // Protocol Buttons & Suggested Command Hints
  document.querySelectorAll('.protocol-btn, .hint-card').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.init();
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) {
        userInput.value = cmd;
        processUserQuery(cmd);

        // On mobile & tablets, auto-switch to Dialogue tab so user sees the response immediately
        if (window.innerWidth <= 1100) {
          const dialogueTab = document.querySelector('.mobile-tab-btn[data-tab="center-stage"]');
          if (dialogueTab && !dialogueTab.classList.contains('active')) {
            dialogueTab.click();
          }
        }
      }
    });
  });

  // ==========================================================================
  // MOBILE & TABLET PANEL TAB SWITCHER (RESPONSIVE ALL DEVICES)
  // ==========================================================================
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
  const panelsMap = {
    'center-stage': document.querySelector('.center-stage'),
    'left-panel': document.querySelector('.left-panel'),
    'right-panel': document.querySelector('.right-panel')
  };

  mobileTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      audio.init();
      audio.playAcknowledge();
      const target = btn.getAttribute('data-tab');

      if (target === 'settings') {
        settingsModal.classList.add('open');
        updateVoiceDropdown();
        return;
      }

      mobileTabBtns.forEach(b => {
        if (b.getAttribute('data-tab') !== 'settings') {
          b.classList.remove('active');
        }
      });
      btn.classList.add('active');

      Object.keys(panelsMap).forEach(key => {
        const el = panelsMap[key];
        if (el) {
          if (key === target) {
            el.classList.add('mobile-active');
            el.classList.remove('mobile-hidden');
          } else {
            el.classList.remove('mobile-active');
            el.classList.add('mobile-hidden');
          }
        }
      });
    });
  });

  // ==========================================================================
  // SETTINGS & MONGODB SYNC (PARTITIONED PER DEVICE)
  // ==========================================================================
  async function loadSettingsFromMongoDB() {
    try {
      const res = await fetch(`/api/settings?deviceId=${encodeURIComponent(config.deviceId)}`, {
        headers: getDeviceHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.userName) config.userName = s.userName;
        if (s.language) config.language = s.language;
        if (s.voiceName) config.voiceName = s.voiceName;
        if (s.pitch) config.pitch = s.pitch;
        if (s.rate) config.rate = s.rate;
        if (s.deviceName) config.deviceName = s.deviceName;
        if (typeof s.continuousListening === 'boolean') {
          config.continuous = s.continuousListening;
          voice.setContinuous(config.continuous);
        }
        if (s.city) {
          config.city = s.city;
          localStorage.setItem('arya_city', s.city);
          if (cityInput) cityInput.value = s.city;
        }
        if (s.geminiApiKey) {
          config.apiKey = s.geminiApiKey;
          geminiApiKeyInput.value = s.geminiApiKey;
        }

        updateDeviceUI();
        updateLanguageUI(config.language);
        userNameInput.value = config.userName;
        voicePitch.value = config.pitch;
        pitchVal.textContent = config.pitch;
        voiceRate.value = config.rate;
        rateVal.textContent = config.rate;

        if (config.continuous) {
          toggleListenModeBtn.classList.add('active');
          listenModeText.textContent = 'ALWAYS-ON MIC: ACTIVE';
          coreLabel.textContent = 'MIC ALWAYS-ON';
        } else {
          toggleListenModeBtn.classList.remove('active');
          listenModeText.textContent = 'ALWAYS-ON MIC: OFF';
          coreLabel.textContent = 'PUSH TO TALK';
        }
      }
      checkGeminiStatus();
    } catch (e) {
      console.warn('Could not fetch settings from MongoDB:', e.message);
      checkGeminiStatus();
    }
  }

  async function saveSettingsToMongoDB() {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: getDeviceHeaders(),
        body: JSON.stringify({
          deviceId: config.deviceId,
          deviceName: config.deviceName,
          city: config.city || 'Patna',
          userName: config.userName,
          language: config.language,
          voiceName: config.voiceName,
          pitch: config.pitch,
          rate: config.rate,
          geminiApiKey: config.apiKey,
          continuousListening: voice.continuousMode
        })
      });
      triggerAutoSaveAnimation();
      checkGeminiStatus();
    } catch (e) {
      console.warn('Error saving settings to MongoDB:', e.message);
    }
  }

  function updateGeminiBadge(isActive) {
    if (!geminiStatusBadge) return;
    if (isActive) {
      geminiStatusBadge.classList.add('connected');
      if (geminiPulse) geminiPulse.className = 'pulse-dot gemini-connected';
      if (geminiStatusText) geminiStatusText.textContent = 'ARYA AI: ONLINE';
    } else {
      geminiStatusBadge.classList.remove('connected');
      if (geminiPulse) geminiPulse.className = 'pulse-dot';
      if (geminiStatusText) geminiStatusText.textContent = 'ARYA AI: CONNECT KEY';
    }
  }

  async function checkGeminiStatus() {
    try {
      const res = await fetch('/api/gemini/status', {
        headers: getDeviceHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const isOnline = data.active || Boolean(config.apiKey);
        updateGeminiBadge(isOnline);

        const banner = document.getElementById('geminiAutoDetectedBanner');
        const bannerText = document.getElementById('geminiAutoDetectedText');

        if (data.active) {
          if (banner && bannerText) {
            banner.style.display = 'flex';
            const masked = data.maskedKey ? ` [${data.maskedKey}]` : '';
            const src = data.isSystemKey ? 'System Auto-Detected (.env)' : (data.source || 'Active Key');
            bannerText.textContent = `✨ Gemini Key Auto-Recognised: ${src}${masked} (${data.model || 'gemini-flash-lite-latest'})`;
          }
          if (geminiApiKeyInput && !geminiApiKeyInput.value.trim()) {
            geminiApiKeyInput.placeholder = `Auto-Recognised System Key Active ${data.maskedKey ? '(' + data.maskedKey + ')' : ''} (Leave blank to use built-in)`;
          }
        } else {
          if (banner) banner.style.display = 'none';
        }
      } else {
        updateGeminiBadge(Boolean(config.apiKey));
      }
    } catch (e) {
      updateGeminiBadge(Boolean(config.apiKey));
    }
  }

  if (geminiStatusBadge) {
    geminiStatusBadge.style.cursor = 'pointer';
    geminiStatusBadge.addEventListener('click', () => {
      audio.init();
      settingsModal.classList.add('open');
      geminiApiKeyInput.focus();
    });
  }

  if (testGeminiKeyBtn) {
    testGeminiKeyBtn.addEventListener('click', async () => {
      const testKey = geminiApiKeyInput.value.trim();
      geminiTestStatus.style.display = 'block';
      geminiTestStatus.className = 'gemini-test-status testing';
      geminiTestStatus.textContent = testKey 
        ? '⏳ Verifying custom Gemini API Key...' 
        : '⏳ Verifying auto-recognised system Gemini API Key...';

      audio.init();
      audio.playAcknowledge();

      try {
        const res = await fetch('/api/gemini/test', {
          method: 'POST',
          headers: getDeviceHeaders(),
          body: JSON.stringify({ apiKey: testKey })
        });
        const data = await res.json();
        if (data.success) {
          geminiTestStatus.className = 'gemini-test-status success';
          const keyLabel = testKey ? 'Custom Key' : 'Auto-Recognised System Key';
          geminiTestStatus.innerHTML = `✅ <strong>${keyLabel} Valid &amp; Active!</strong> Connected via <code>${data.model || 'gemini-flash-lite-latest'}</code>. Arya AI ready.`;
          if (testKey) {
            config.apiKey = testKey;
            localStorage.setItem('arya_gemini_key', testKey);
            localStorage.setItem('jarvis_gemini_key', testKey);
          }
          updateGeminiBadge(true);
        } else {
          geminiTestStatus.className = 'gemini-test-status error';
          geminiTestStatus.textContent = `❌ Test Failed: ${data.error || 'Invalid API key or network error'}`;
          updateGeminiBadge(false);
        }
      } catch (err) {
        geminiTestStatus.className = 'gemini-test-status error';
        geminiTestStatus.textContent = `❌ Network Error: ${err.message}`;
      }
    });
  }

  openSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('open');
    updateVoiceDropdown();
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('open');
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('open');
    }
  });

  voicePitch.addEventListener('input', () => {
    pitchVal.textContent = voicePitch.value;
  });

  voiceRate.addEventListener('input', () => {
    rateVal.textContent = voiceRate.value;
  });

  // Multi-Device Partition Buttons
  if (copyDeviceIdBtn) {
    copyDeviceIdBtn.addEventListener('click', () => {
      audio.init();
      audio.playAcknowledge();
      navigator.clipboard.writeText(config.deviceId).then(() => {
        copyDeviceIdBtn.textContent = 'COPIED!';
        setTimeout(() => { copyDeviceIdBtn.textContent = 'COPY'; }, 1500);
      });
    });
  }

  if (newDeviceIdBtn) {
    newDeviceIdBtn.addEventListener('click', () => {
      audio.init();
      audio.playAcknowledge();
      if (confirm('Create a new Device ID? This browser tab will operate with a completely separated, private partition in MongoDB.')) {
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        const prefix = isMobile ? 'mob' : 'pc';
        const rand = Math.random().toString(36).substring(2, 9);
        const newId = `${prefix}_${Date.now().toString(36)}_${rand}`;
        localStorage.setItem('arya_device_id', newId);
        config.deviceId = newId;
        updateDeviceUI();
        loadSettingsFromMongoDB();
        loadNotes();
        loadHistory();
      }
    });
  }

  if (alwaysOnMicCheckbox) {
    alwaysOnMicCheckbox.addEventListener('change', () => {
      config.continuous = alwaysOnMicCheckbox.checked;
      voice.setContinuous(config.continuous);
      localStorage.setItem('arya_continuous', config.continuous ? 'true' : 'false');
      if (config.continuous) {
        toggleListenModeBtn.classList.add('active');
        listenModeText.textContent = 'ALWAYS-ON MIC: ACTIVE';
        if (!voice.isListening) voice.startListening();
      } else {
        toggleListenModeBtn.classList.remove('active');
        listenModeText.textContent = 'ALWAYS-ON MIC: OFF';
        if (voice.isListening) voice.stopListening();
      }
      saveSettingsToMongoDB();
    });
  }

  // Copy LAN URLs for Mobile / Tablet Connection
  if (copyHttpsLanBtn) {
    copyHttpsLanBtn.addEventListener('click', () => {
      audio.init();
      audio.playAcknowledge();
      if (httpsLanUrlDisplay && httpsLanUrlDisplay.value) {
        navigator.clipboard.writeText(httpsLanUrlDisplay.value).then(() => {
          copyHttpsLanBtn.textContent = 'COPIED!';
          setTimeout(() => { copyHttpsLanBtn.textContent = 'COPY'; }, 1500);
        });
      }
    });
  }

  if (copyHttpLanBtn) {
    copyHttpLanBtn.addEventListener('click', () => {
      audio.init();
      audio.playAcknowledge();
      if (httpLanUrlDisplay && httpLanUrlDisplay.value) {
        navigator.clipboard.writeText(httpLanUrlDisplay.value).then(() => {
          copyHttpLanBtn.textContent = 'COPIED!';
          setTimeout(() => { copyHttpLanBtn.textContent = 'COPY'; }, 1500);
        });
      }
    });
  }

  // Fetch LAN Network URLs from Server
  async function fetchNetworkInfo() {
    try {
      const res = await fetch('/api/network-info');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (httpLanUrlDisplay) httpLanUrlDisplay.value = data.httpUrl;
        if (httpsLanUrlDisplay) httpsLanUrlDisplay.value = data.httpsUrl;

        // Show insecure context notice on mobile if browsing via plain HTTP
        const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (!isLocalHost && location.protocol !== 'https:' && mobileVoiceNoticeBanner) {
          mobileVoiceNoticeBanner.style.display = 'flex';
          if (switchToHttpsBtn) {
            switchToHttpsBtn.href = data.httpsUrl;
          }
        }
      }
    } catch (e) {
      console.warn('Network info error:', e.message);
    }
  }

  saveSettingsBtn.addEventListener('click', () => {
    config.userName = userNameInput.value.trim() || 'Sir';
    config.language = languageSelect.value || 'en';
    config.apiKey = geminiApiKeyInput.value.trim();
    config.pitch = parseFloat(voicePitch.value) || 1.0;
    config.rate = parseFloat(voiceRate.value) || 1.0;
    config.voiceName = voiceSelect.value;
    if (deviceNameInput && deviceNameInput.value.trim()) {
      config.deviceName = deviceNameInput.value.trim();
      localStorage.setItem('arya_device_name', config.deviceName);
    }
    if (alwaysOnMicCheckbox) {
      config.continuous = alwaysOnMicCheckbox.checked;
      voice.setContinuous(config.continuous);
      localStorage.setItem('arya_continuous', config.continuous ? 'true' : 'false');
      if (config.continuous) {
        toggleListenModeBtn.classList.add('active');
        listenModeText.textContent = 'ALWAYS-ON MIC: ACTIVE';
      } else {
        toggleListenModeBtn.classList.remove('active');
        listenModeText.textContent = 'ALWAYS-ON MIC: OFF';
      }
    }

    if (cityInput && cityInput.value.trim()) {
      config.city = cityInput.value.trim();
      localStorage.setItem('arya_city', config.city);
    }

    localStorage.setItem('arya_username', config.userName);
    localStorage.setItem('arya_language', config.language);
    localStorage.setItem('arya_gemini_key', config.apiKey);
    localStorage.setItem('arya_pitch', config.pitch);
    localStorage.setItem('arya_rate', config.rate);
    localStorage.setItem('arya_voice_name', config.voiceName);

    localStorage.setItem('jarvis_username', config.userName);
    localStorage.setItem('jarvis_language', config.language);
    localStorage.setItem('jarvis_gemini_key', config.apiKey);
    localStorage.setItem('jarvis_pitch', config.pitch);
    localStorage.setItem('jarvis_rate', config.rate);
    localStorage.setItem('jarvis_voice_name', config.voiceName);

    updateDeviceUI();
    updateLanguageUI(config.language);
    updateClock();
    voice.pitch = config.pitch;
    voice.rate = config.rate;
    voice.setVoiceByName(config.voiceName);

    saveSettingsToMongoDB();

    settingsModal.classList.remove('open');
    audio.playAcknowledge();

    if (config.language === 'hi') {
      voice.speak(`सेटिंग्स मोंगो-डीबी में सुरक्षित कर दी गई हैं, ${config.userName}।`, 'hi');
    } else {
      voice.speak(`Configuration updated and auto-saved to MongoDB, ${config.userName}.`, 'en');
    }
  });

  resetSettingsBtn.addEventListener('click', () => {
    userNameInput.value = 'Sir';
    languageSelect.value = 'hi';
    geminiApiKeyInput.value = '';
    geminiTestStatus.style.display = 'none';
    if (cityInput) cityInput.value = 'Patna';
    if (cityWeatherPreview) cityWeatherPreview.style.display = 'none';
    voicePitch.value = '1.0';
    pitchVal.textContent = '1.0';
    voiceRate.value = '1.0';
    rateVal.textContent = '1.0';
  });

  // Weather check in Settings Modal
  if (testWeatherBtn) {
    testWeatherBtn.addEventListener('click', async () => {
      const targetCity = (cityInput && cityInput.value.trim()) || 'Patna';
      if (cityWeatherPreview) {
        cityWeatherPreview.style.display = 'block';
        cityWeatherPreview.className = 'gemini-test-status testing';
        cityWeatherPreview.textContent = `⏳ Checking atmospheric telemetry for ${targetCity}...`;
      }
      audio.init();
      audio.playAcknowledge();

      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(targetCity)}`);
        const data = await res.json();
        if (data.success && data.weather && cityWeatherPreview) {
          const w = data.weather;
          cityWeatherPreview.className = 'gemini-test-status success';
          cityWeatherPreview.innerHTML = `🌤️ <strong>${w.city}</strong>: <strong>${w.temp_C}°C</strong> (${w.desc}), Humidity ${w.humidity}%, Wind ${w.windSpeed} km/h *(Live wttr.in)*`;
        } else if (cityWeatherPreview) {
          cityWeatherPreview.className = 'gemini-test-status error';
          cityWeatherPreview.textContent = `⚠️ Could not reach weather telemetry for ${targetCity}.`;
        }
      } catch (err) {
        if (cityWeatherPreview) {
          cityWeatherPreview.className = 'gemini-test-status error';
          cityWeatherPreview.textContent = `❌ Network Error: ${err.message}`;
        }
      }
    });
  }

  // Quick select city pills in Settings
  document.querySelectorAll('.city-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-city');
      if (selected && cityInput) {
        cityInput.value = selected;
        config.city = selected;
        localStorage.setItem('arya_city', selected);
        updateClock();
        if (testWeatherBtn) testWeatherBtn.click();
      }
    });
  });

  // ==========================================================================
  // HELPER FORMATTERS
  // ==========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdownText(text) {
    if (!text) return '';
    let formatted = escapeHtml(text);
    // Headings
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h4 style="color:var(--cyan-neon); margin:8px 0 4px 0; font-family:var(--font-hud); font-size:14px; letter-spacing:1px;">$1</h4>');
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italics
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Markdown links [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--cyan-neon); text-decoration:underline; font-weight:600; text-underline-offset:2px;">$1 ↗</a>');
    // Bullet points
    formatted = formatted.replace(/^•\s+(.+)$/gm, '<li style="margin-left:14px;">$1</li>');
    // Code blocks / inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:rgba(0,240,255,0.15); color:#00f0ff; padding:2px 4px; border-radius:3px;">$1</code>');
    return formatted;
  }

  // Load initial data from MongoDB & Server
  verifyCurrentAuthSession();
  checkGeminiStatus();
  loadSettingsFromMongoDB();
  loadNotes();
  loadHistory();
  fetchNetworkInfo();

  // Initial Startup Audio Context & Always-On Mic Activation on First Interaction
  let hasActivatedUserSession = false;
  const activateAudioAndMic = () => {
    if (hasActivatedUserSession) return;
    hasActivatedUserSession = true;
    audio.init();
    if (config.continuous && !voice.isListening) {
      voice.startListening();
    }
  };
  window.addEventListener('click', activateAudioAndMic, { once: true });
  window.addEventListener('keydown', activateAudioAndMic, { once: true });
  window.addEventListener('touchstart', activateAudioAndMic, { once: true });
});
