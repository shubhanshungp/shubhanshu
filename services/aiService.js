const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const MemoryNote = require('../models/MemoryNote');
const Contact = require('../models/Contact');
const webSearchService = require('./webSearchService');
const systemService = require('./systemService');

// Google Generative AI SDK
let GoogleGenerativeAI = null;
try {
  const genaiPkg = require('@google/generative-ai');
  GoogleGenerativeAI = genaiPkg.GoogleGenerativeAI;
} catch (e) {
  console.warn('@google/generative-ai SDK not available, will use direct REST fetch.');
}

class AryaAIService {
  constructor() {
    this.userName = process.env.USER_NAME || 'Sir';
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.authorName = 'Shubhanshu Kumar Srivastav';
  }

  getEffectiveApiKey(customKey = null) {
    if (customKey && typeof customKey === 'string' && customKey.trim()) {
      return customKey.trim();
    }
    if (this.geminiApiKey && typeof this.geminiApiKey === 'string' && this.geminiApiKey.trim()) {
      return this.geminiApiKey.trim();
    }
    if (process.env.GEMINI_API_KEY && typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim()) {
      return process.env.GEMINI_API_KEY.trim();
    }
    return '';
  }

  setApiKey(key) {
    if (key && typeof key === 'string' && key.trim()) {
      this.geminiApiKey = key.trim();
    } else if (key === '') {
      this.geminiApiKey = '';
    }
  }

  setUserName(name) {
    if (name && name.trim()) {
      this.userName = name.trim();
    }
  }

  /**
   * Real atmospheric weather data fetcher via wttr.in (zero external API key dependency)
   */
  async fetchRealWeather(cityName = 'Patna') {
    const rawCity = (cityName && cityName.trim()) || 'Patna';
    const cleanCity = rawCity
      .replace(/^(?:in|at|of|for|the)\s+/i, '')
      .replace(/\s+(?:city|village|weather|mausam|tapman|का|में|का मौसम)$/i, '')
      .trim() || 'Patna';

    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(cleanCity)}?format=j1`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AryaAI/2.0)' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        const current = data.current_condition && data.current_condition[0];
        if (current) {
          const desc = (current.weatherDesc && current.weatherDesc[0] && current.weatherDesc[0].value) || 'Clear';
          return {
            city: cleanCity,
            temp_C: current.temp_C,
            temp_F: current.temp_F,
            desc: desc,
            humidity: current.humidity,
            windSpeed: current.windspeedKmph,
            feelsLike_C: current.FeelsLikeC,
            success: true
          };
        }
      }
    } catch (err) {
      console.warn(`Weather fetch failed for ${cleanCity}:`, err.message);
    }

    // Baseline fallback if wttr.in is unreachable
    return {
      city: cleanCity,
      temp_C: '28',
      temp_F: '82',
      desc: 'Partly Cloudy',
      humidity: '55',
      windSpeed: '12',
      feelsLike_C: '29',
      success: false
    };
  }

  /**
   * Universal App Registry & Deep Link Resolver
   * Resolves native app protocols and web fallbacks across:
   * Android, iOS, Tablet, Smartwatch, Mac & Windows
   */
  resolveUniversalApp(candidateApp) {
    if (!candidateApp || typeof candidateApp !== 'string') return null;
    const clean = candidateApp.toLowerCase().trim()
      .replace(/^(?:the|an|a)\s+/i, '')
      .replace(/\s+(?:app|application|ऐप|एप्लीकेशन)$/i, '')
      .trim();

    // 1. WhatsApp (Cross-Platform Mobile Universal Link + Android Intent + Web)
    if (['whatsapp', 'whats app', 'wa', 'व्हाट्सएप', 'व्हाट्सऐप', 'वाट्सएप', 'वाट्सऐप'].includes(clean) || clean.includes('whatsapp') || clean.includes('व्हाट्सएप')) {
      return {
        name: 'WhatsApp',
        universalUrl: 'https://wa.me/',
        mobileUrl: 'https://wa.me/',
        iosDeepLink: 'https://wa.me/',
        androidDeepLink: 'whatsapp://send',
        androidIntent: 'intent://send#Intent;package=com.whatsapp;scheme=whatsapp;end',
        webFallback: 'https://web.whatsapp.com/',
        deepLink: 'whatsapp://'
      };
    }

    // 2. YouTube (Universal Link for iOS/Android + Native App Intercept)
    if (['youtube', 'yt', 'यूट्यूब', 'यूूट्यूब'].includes(clean) || clean.includes('youtube') || clean.includes('यूट्यूब')) {
      return {
        name: 'YouTube',
        universalUrl: 'https://www.youtube.com',
        mobileUrl: 'https://www.youtube.com',
        iosDeepLink: 'youtube://',
        androidDeepLink: 'https://www.youtube.com',
        androidIntent: 'intent://www.youtube.com/#Intent;package=com.google.android.youtube;scheme=https;end',
        webFallback: 'https://www.youtube.com',
        deepLink: 'https://www.youtube.com'
      };
    }

    // 3. Camera (Device Native Viewfinder & AR HUD Mode)
    if (['camera', 'cam', 'webcam', 'कैमरा', 'कैम'].includes(clean)) {
      return {
        name: 'Camera',
        isCamera: true,
        universalUrl: '#camera',
        deepLink: '#camera'
      };
    }

    // 4. Calculator (HUD Cyber Calculator + Google Calculator)
    if (['calculator', 'calc', 'कैलकुलेटर', 'हिसाब'].includes(clean)) {
      return {
        name: 'Calculator',
        isCalculator: true,
        universalUrl: 'https://www.google.com/search?q=calculator',
        mobileUrl: 'https://www.google.com/search?q=calculator',
        androidIntent: 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end',
        webFallback: 'https://www.google.com/search?q=calculator',
        deepLink: 'https://www.google.com/search?q=calculator'
      };
    }

    // 5. Spotify / Music
    if (['spotify', 'music', 'gaana', 'गाना', 'म्यूजिक', 'स्पॉटिफाई'].includes(clean)) {
      return {
        name: 'Spotify',
        universalUrl: 'https://open.spotify.com',
        mobileUrl: 'https://open.spotify.com',
        iosDeepLink: 'spotify://',
        androidDeepLink: 'spotify://',
        androidIntent: 'intent://open.spotify.com/#Intent;package=com.spotify.music;scheme=https;end',
        webFallback: 'https://open.spotify.com',
        deepLink: 'spotify://'
      };
    }

    // 6. Google Maps / Maps / Navigation
    if (['maps', 'map', 'google maps', 'google map', 'नक्शा', 'मैप्स', 'मैप'].includes(clean)) {
      return {
        name: 'Google Maps',
        universalUrl: 'https://maps.google.com',
        mobileUrl: 'https://maps.google.com',
        iosDeepLink: 'https://maps.apple.com',
        androidDeepLink: 'geo:0,0?q=',
        webFallback: 'https://maps.google.com',
        deepLink: 'https://maps.google.com'
      };
    }

    // 7. Instagram
    if (['instagram', 'insta', 'इंस्टाग्राम', 'इन्स्टा'].includes(clean)) {
      return {
        name: 'Instagram',
        universalUrl: 'https://www.instagram.com',
        mobileUrl: 'https://www.instagram.com',
        iosDeepLink: 'instagram://',
        androidDeepLink: 'instagram://app',
        androidIntent: 'intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end',
        webFallback: 'https://www.instagram.com',
        deepLink: 'instagram://'
      };
    }

    // 8. Telegram
    if (['telegram', 'tg', 'टेलीग्राम'].includes(clean)) {
      return {
        name: 'Telegram',
        universalUrl: 'https://t.me/',
        mobileUrl: 'https://t.me/',
        iosDeepLink: 'tg://',
        androidDeepLink: 'tg://',
        webFallback: 'https://web.telegram.org',
        deepLink: 'tg://'
      };
    }

    // 9. Settings
    if (['settings', 'setting', 'preferences', 'सेटिंग्स', 'सेटिंग'].includes(clean)) {
      return {
        name: 'Settings',
        isSettings: true,
        universalUrl: '#settings'
      };
    }

    // 10. Chrome / Web Browser
    if (['chrome', 'browser', 'google chrome', 'क्रोम', 'ब्राउज़र'].includes(clean)) {
      return {
        name: 'Browser',
        universalUrl: 'https://www.google.com',
        mobileUrl: 'https://www.google.com',
        webFallback: 'https://www.google.com',
        deepLink: 'https://www.google.com'
      };
    }

    // 11. Email / Gmail
    if (['gmail', 'mail', 'email', 'जीमेल', 'ईमेल', 'मेल'].includes(clean)) {
      return {
        name: 'Gmail',
        universalUrl: 'mailto:',
        mobileUrl: 'mailto:',
        iosDeepLink: 'mailto:',
        androidDeepLink: 'mailto:',
        webFallback: 'https://mail.google.com',
        deepLink: 'mailto:'
      };
    }

    // 12. Clock / Alarm / Timer
    if (['clock', 'alarm', 'timer', 'stopwatch', 'घड़ी', 'अलार्म'].includes(clean)) {
      return {
        name: 'Clock',
        isClock: true,
        universalUrl: '#clock',
        androidIntent: 'intent:#Intent;action=android.intent.action.SET_ALARM;end',
        deepLink: '#clock'
      };
    }

    // 13. Calendar
    if (['calendar', 'calender', 'कैलेंडर'].includes(clean)) {
      return {
        name: 'Calendar',
        universalUrl: 'https://calendar.google.com',
        mobileUrl: 'https://calendar.google.com',
        iosDeepLink: 'calshow:',
        webFallback: 'https://calendar.google.com',
        deepLink: 'https://calendar.google.com'
      };
    }

    // 14. Phone / Dialer
    if (['phone', 'dialer', 'call app', 'फोन', 'डायलर'].includes(clean)) {
      return {
        name: 'Phone Dialer',
        universalUrl: 'tel:',
        mobileUrl: 'tel:',
        deepLink: 'tel:'
      };
    }

    // 15. Messages / SMS
    if (['messages', 'sms', 'message app', 'मैसेज ऐप', 'संदेश'].includes(clean)) {
      return {
        name: 'Messages',
        universalUrl: 'sms:',
        mobileUrl: 'sms:',
        deepLink: 'sms:'
      };
    }

    // 16. Notes / Notepad
    if (['notes', 'notepad', 'नोटपैड', 'नोट्स'].includes(clean)) {
      return {
        name: 'Notes',
        isNotes: true,
        universalUrl: '#notes',
        deepLink: '#notes'
      };
    }

    // 17. Facebook
    if (['facebook', 'fb', 'फेसबुक'].includes(clean)) {
      return {
        name: 'Facebook',
        universalUrl: 'https://www.facebook.com',
        mobileUrl: 'https://www.facebook.com',
        iosDeepLink: 'fb://',
        androidDeepLink: 'fb://facewebmodal/f?href=https://www.facebook.com',
        webFallback: 'https://www.facebook.com',
        deepLink: 'https://www.facebook.com'
      };
    }

    // 18. Twitter / X
    if (['twitter', 'x', 'ट्विटर'].includes(clean)) {
      return {
        name: 'Twitter (X)',
        universalUrl: 'https://x.com',
        mobileUrl: 'https://x.com',
        iosDeepLink: 'twitter://',
        androidDeepLink: 'twitter://',
        webFallback: 'https://x.com',
        deepLink: 'https://x.com'
      };
    }

    // Generic Fallback for any other requested app
    const safeName = clean.charAt(0).toUpperCase() + clean.slice(1);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(clean + ' app')}`;
    return {
      name: safeName,
      universalUrl: searchUrl,
      mobileUrl: searchUrl,
      webFallback: searchUrl,
      deepLink: searchUrl
    };
  }

  /**
   * Helper to extract target city or village name from query text
   */
  extractCityFromPrompt(text, fallbackCity = 'Patna') {
    const raw = (text || '').trim();
    const match = raw.match(/\b(?:in|at|of|for)\b\s+([a-zA-Z\u0900-\u097F\s]+?)(?:\s+(?:weather|time|date|mausam|tapman|samay|today))?$/i) ||
      raw.match(/([a-zA-Z\u0900-\u097F\s]+?)\s+\b(?:ka|mein|me|का|में)\b\s+(?:weather|time|date|mausam|tapman|samay|मौसम|तापमान|समय)/i) ||
      raw.match(/([a-zA-Z\u0900-\u097F\s]+?)\s+(?:weather|mausam|tapman|मौसम|तापमान)/i);

    if (match && match[1]) {
      const candidate = match[1].trim()
        .replace(/^(?:the|what\s+is|tell\s+me|current|aaj\s+ka)\s+/i, '')
        .replace(/\s+(?:city|village|town|district)$/i, '')
        .trim();
      const ignoreWords = ['current', 'today', 'live', 'real', 'atmosphere', 'what', 'aaj', 'abhi', 'ab', 'weather', 'time', 'date', 'mausam', 'tapman', 'samay', 'it', 'is', 'the', 'a', 'an', 'in', 'at', 'for', 'of', 'this', 'that', 'my', 'your', 'our', 'here', 'there', 'please', 'tell', 'me', 'kya', 'hai'];
      const cleanCandidate = candidate.toLowerCase();
      if (cleanCandidate.length >= 2 && !ignoreWords.includes(cleanCandidate)) {
        return candidate;
      }
    }
    return fallbackCity || 'Patna';
  }

  /**
   * Universal Cross-Device App Launcher
   * Enables opening apps on Mobile, Tablet, Smartwatch, iOS, and Desktop:
   * WhatsApp, YouTube, Camera, Calculator, Spotify, Maps, Instagram, Telegram, Settings, etc.
   */
  async handleUniversalAppCommand(lower, originalText, isHindi, deviceId = 'default_device', deviceName = 'Primary Device', devicePlatform = 'windows', deviceType = 'desktop', isLocalHost = true) {
    // If it's a direct message to a person or phone number, let messaging engine handle it
    const hasRecipient = originalText.match(/(?:ko|par|को|पर)\s*(?:message|msg|मैसेज|संदेश|call|कॉल)/i) ||
      originalText.match(/(?:message|msg|मैसेज|sms)\s+(?:to\s+)?(\+?[0-9]{10,13}|[a-zA-Z\u0900-\u097F]+)\s*[:\s]/i);
    if (hasRecipient) {
      return null;
    }

    let candidateApp = null;

    // Pattern 1: English "open / launch / start <app>"
    const engStartMatch = lower.match(/^(?:please\s+|arya\s+|can\s+you\s+)?(?:open|launch|start|run)\s+(?:the\s+)?([a-z0-9\s\.\-_]+)$/i);
    // Pattern 2: "<app> open" / "<app> open please"
    const engEndMatch = lower.match(/^([a-z0-9\s\.\-_]+?)\s+(?:open|launch|start)$/i);
    // Pattern 3: Hindi "<app> kholo" / "<app> khol do" / "<app> open karo" / "<app> chalu karo"
    const hindiEndMatch = originalText.match(/^([a-zA-Z0-9\u0900-\u097F\s\.\-_]+?)\s+(?:खोलो|खोल\s+दो|खोल\s+दीजिये|ओपन\s+करो|ओपन\s+कर\s+दो|चालू\s+करो|शुरू\s+करो|चलाओ|kholo|khol\s+do|open\s+karo|open\s+kar\s+do|chalu\s+karo|chaloo\s+karo|shuru\s+karo)$/i);
    // Pattern 4: "kholo <app>" / "open karo <app>"
    const hindiStartMatch = originalText.match(/^(?:खोलो|ओपन\s+करो|चालू\s+करो|शुरू\s+करो|kholo|open\s+karo)\s+([a-zA-Z0-9\u0900-\u097F\s\.\-_]+)$/i);

    if (engStartMatch && engStartMatch[1]) {
      candidateApp = engStartMatch[1].trim();
    } else if (engEndMatch && engEndMatch[1]) {
      candidateApp = engEndMatch[1].trim();
    } else if (hindiEndMatch && hindiEndMatch[1]) {
      candidateApp = hindiEndMatch[1].trim();
    } else if (hindiStartMatch && hindiStartMatch[1]) {
      candidateApp = hindiStartMatch[1].trim();
    }

    if (!candidateApp) {
      const trimmed = lower.trim();
      const directApps = ['whatsapp', 'camera', 'calculator', 'calc', 'spotify', 'telegram', 'instagram', 'settings', 'clock'];
      if (directApps.includes(trimmed)) {
        candidateApp = trimmed;
      }
    }

    if (!candidateApp) {
      return null;
    }

    // Exclude general conversational queries
    const nonApps = ['door', 'window', 'file', 'folder', 'note', 'notes', 'status', 'history', 'chat', 'weather', 'time', 'date'];
    if (nonApps.includes(candidateApp.toLowerCase())) {
      return null;
    }

    const resolved = this.resolveUniversalApp(candidateApp);
    if (!resolved) {
      return null;
    }

    // Determine target device architecture: Laptop/PC workstation vs. Mobile/Tablet/iOS
    const isMobileClient = devicePlatform === 'ios' || devicePlatform === 'android' || deviceType === 'mobile' || deviceType === 'tablet' || deviceId?.startsWith('mob_') || deviceId?.startsWith('tab_');
    const isDesktopWorkstation = !isMobileClient && (isLocalHost || devicePlatform === 'windows' || devicePlatform === 'mac' || devicePlatform === 'linux' || deviceType === 'desktop');

    // 1. If on Laptop / PC (Workstation): Trigger native desktop app immediately on that screen!
    if (isDesktopWorkstation) {
      try {
        await systemService.launchApp(candidateApp);
      } catch (e) {
        console.warn('Desktop native launch notice:', e.message);
      }
    }

    const appName = resolved.name;
    const deviceLabel = isDesktopWorkstation 
      ? 'Laptop / PC (Workstation)' 
      : (devicePlatform === 'ios' ? 'iOS (iPhone / iPad)' : 'Mobile Phone (Android)');

    const speech = isHindi 
      ? (isDesktopWorkstation ? `सर, आपके लैपटॉप / पीसी पर ${appName} खोल दिया गया है।` : `सर, आपके फोन पर ${appName} खोला जा रहा है।`)
      : (isDesktopWorkstation ? `Opened ${appName} on your workstation screen, ${this.userName}.` : `Opening ${appName} on your ${deviceLabel}, ${this.userName}.`);

    const targetUrl = resolved.universalUrl || resolved.mobileUrl || resolved.webFallback || resolved.deepLink || '#';
    const display = isDesktopWorkstation
      ? `💻 **WORKSTATION APP LAUNCHED [Local PC]:**\n• **Application:** **${appName}**\n• **Active System:** **${deviceName}** (Workstation)\n• **Status:** Launched on screen\n• **Direct Link:** [Open ${appName}](${targetUrl})`
      : `📱 **MOBILE APP LAUNCH [${deviceLabel}]:**\n• **Application:** **${appName}**\n• **Active System:** **${deviceName}**\n• **Status:** Launch protocol dispatched\n• **Direct Launch Link:** [🚀 Open ${appName}](${targetUrl})`;

    return {
      speech,
      display,
      action: 'launch_app',
      data: {
        appName,
        isDesktopWorkstation,
        deviceLabel,
        universalUrl: resolved.universalUrl || null,
        mobileUrl: resolved.mobileUrl || null,
        iosDeepLink: resolved.iosDeepLink || null,
        androidDeepLink: resolved.androidDeepLink || null,
        androidIntent: resolved.androidIntent || null,
        webFallback: resolved.webFallback || null,
        deepLink: resolved.deepLink || null,
        isCamera: Boolean(resolved.isCamera),
        isCalculator: Boolean(resolved.isCalculator),
        isSettings: Boolean(resolved.isSettings),
        isClock: Boolean(resolved.isClock),
        isNotes: Boolean(resolved.isNotes)
      }
    };
  }

  /**
   * Helper to detect if user input is Hindi or requested in Hindi
   */
  detectHindi(text, preferredLang) {
    if (preferredLang === 'hi') return true;
    if (/[\u0900-\u097F]/.test(text)) return true; // Devanagari Unicode range

    const lower = text.toLowerCase();
    const hindiWords = [
      'namaste', 'kaise ho', 'kya haal', 'kya hal', 'samay', 'mausam',
      'chutkula', 'joke sunao', 'tum kaun ho', 'mera naam', 'note likho',
      'yaad rakhna', 'kholo', 'khol do', 'shukriya', 'dhanyawad', 'alvida',
      'kya kar sakte ho', 'madad', 'batao', 'kitna hua', 'kitne hote', 'sahayata',
      'kisne banaya', 'lekhak kaun', 'kya hai', 'kaise karein', 'kyun'
    ];

    return hindiWords.some(w => lower.includes(w));
  }

  /**
   * Fetch recent conversation logs from MongoDB for conversational context and recall
   * Partitioned by userId (when signed in) or deviceId (for guest session)
   */
  async getRecentChatHistory(limit = 6, deviceId = 'default_device', userId = null) {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    try {
      const query = userId 
        ? { userId } 
        : { deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };
      const records = await Conversation.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .maxTimeMS(2500);
      return records.reverse(); // Return in chronological order
    } catch (e) {
      console.warn('Could not read chat history from MongoDB:', e.message);
      return [];
    }
  }

  /**
   * Read the latest conversation from MongoDB strictly partitioned by user or device
   */
  async getLatestChatRecord(deviceId = 'default_device', userId = null) {
    if (mongoose.connection.readyState !== 1) {
      return null;
    }
    try {
      const query = userId 
        ? { userId } 
        : { deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };
      return await Conversation.findOne(query).sort({ timestamp: -1 }).maxTimeMS(2500);
    } catch (e) {
      console.warn('Could not read latest chat from MongoDB:', e.message);
      return null;
    }
  }

  /**
   * Test a Gemini API Key to verify validity
   */
  async testGeminiApiKey(apiKey) {
    const key = this.getEffectiveApiKey(apiKey);
    if (!key) {
      return { success: false, error: 'No Gemini API key detected on system or user profile.' };
    }
    const testModels = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-3.5-flash'
    ];
    let lastError = null;

    for (const modelName of testModels) {
      try {
        if (GoogleGenerativeAI) {
          try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelName });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 5000));
            const result = await Promise.race([model.generateContent('Hello'), timeoutPromise]);
            const text = result.response.text();
            if (text) {
              return { success: true, model: modelName };
            }
          } catch (sdkErr) {
            lastError = sdkErr.message;
          }
        }

        // Direct REST check with 5s timeout guard
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }]
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.candidates && data.candidates[0]) {
            return { success: true, model: modelName };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = (errData.error && errData.error.message) || `HTTP ${res.status}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    return {
      success: false,
      error: lastError || 'Unable to connect to Google Gemini AI with this key.'
    };
  }

  /**
   * Main entry to process user prompt and generate ARYA. response
   */
  async processQuery(userInput, customApiKey = null, preferredLang = 'en', deviceId = 'default_device', deviceName = 'Primary Device', targetCity = 'Patna', fileAttachment = null, userId = null, devicePlatform = 'windows', deviceType = 'desktop', isLocalHost = true, clientBattery = null, clientStorage = null) {
    const res = await this._processQueryInternal(userInput, customApiKey, preferredLang, deviceId, deviceName, targetCity, fileAttachment, userId, devicePlatform, deviceType, isLocalHost, clientBattery, clientStorage);
    if (res && res.speech) {
      const isHindi = res.language === 'hi' || this.detectHindi(userInput || '', preferredLang);
      res.speech = this.cleanVoiceSpeech(res.speech, isHindi);
    }
    return res;
  }

  /**
   * Internal routing matrix for queries
   */
  async _processQueryInternal(userInput, customApiKey = null, preferredLang = 'en', deviceId = 'default_device', deviceName = 'Primary Device', targetCity = 'Patna', fileAttachment = null, userId = null, devicePlatform = 'windows', deviceType = 'desktop', isLocalHost = true, clientBattery = null, clientStorage = null) {
    let text = (userInput || '').trim();
    if (!text && fileAttachment) {
      text = fileAttachment.type && fileAttachment.type.startsWith('image/')
        ? 'Please inspect and analyze this attached image.'
        : 'Please analyze this uploaded document.';
    }

    const isHindi = this.detectHindi(text, preferredLang);
    const lang = isHindi ? 'hi' : 'en';

    if (!text && !fileAttachment) {
      const emptySpeech = isHindi
        ? `नमस्ते ${this.userName}, मैं आर्या (ARYA.) हूँ, आपकी सेवा के लिए तैयार।`
        : `I am online and awaiting your command, ${this.userName}.`;

      return {
        speech: emptySpeech,
        display: emptySpeech,
        action: 'idle',
        language: lang,
        deviceId,
        deviceName
      };
    }

    const lower = text.toLowerCase();

    // 0. UNIVERSAL CROSS-DEVICE APP ENGINE (Mobile, Tablet, Smartwatch, iOS, Desktop)
    // Matches: "whatsapp open", "open whatsapp", "whatsapp kholo", "open camera", "open calculator", "open spotify", "open instagram", "open settings", "open <any app>", etc.
    const universalAppResult = await this.handleUniversalAppCommand(lower, text, isHindi, deviceId, deviceName, devicePlatform, deviceType, isLocalHost);
    if (universalAppResult) {
      universalAppResult.language = lang;
      universalAppResult.deviceId = deviceId;
      universalAppResult.deviceName = deviceName;
      return universalAppResult;
    }

    // 0.1 MESSAGING & WHATSAPP ENGINE (Send messages, WhatsApp dispatch, Contact directory)
    const messagingResult = await this.handleMessagingCommands(lower, text, isHindi, deviceId, deviceName);
    if (messagingResult) {
      messagingResult.language = lang;
      messagingResult.deviceId = deviceId;
      messagingResult.deviceName = deviceName;
      return messagingResult;
    }

    // 0.2 YOUTUBE & MEDIA PLAYBACK ENGINE (Open YouTube, Play Songs/Videos, Search YouTube)
    const youtubeResult = await this.handleYouTubeCommands(lower, text, isHindi, deviceId, deviceName);
    if (youtubeResult) {
      youtubeResult.language = lang;
      youtubeResult.deviceId = deviceId;
      youtubeResult.deviceName = deviceName;
      return youtubeResult;
    }

    // 0.3 SYSTEM COMMANDS & DEEP OS ACCESS (Apps, Folders, Files, Hardware, Terminal, Process Management)
    const systemResult = await this.handleSystemCommands(lower, text, isHindi, deviceId, deviceName, devicePlatform, deviceType, isLocalHost, clientBattery, clientStorage);
    if (systemResult) {
      systemResult.language = lang;
      systemResult.deviceId = deviceId;
      systemResult.deviceName = deviceName;
      return systemResult;
    }

    // 1. Check for specific built-in command handlers (Author of this project, diagnostics, notes, math, web actions, protocols)
    const builtInResult = await this.handleBuiltInCommands(lower, text, isHindi, deviceId, deviceName, targetCity, userId, devicePlatform, deviceType, isLocalHost);
    if (builtInResult) {
      builtInResult.language = lang;
      builtInResult.deviceId = deviceId;
      builtInResult.deviceName = deviceName;
      return builtInResult;
    }

    // 2. Live Web Reconnaissance for specific web facts (Author of a book, specific who is, etc.)
    if (!fileAttachment && webSearchService.isWebQuery(lower)) {
      try {
        const searchResult = await webSearchService.searchWeb(text, isHindi);
        if (searchResult) {
          const webResponse = webSearchService.formatAryaWebResponse(searchResult, this.userName, isHindi);
          if (webResponse) {
            webResponse.language = lang;
            webResponse.source = 'Live Web Reconnaissance';
            webResponse.deviceId = deviceId;
            webResponse.deviceName = deviceName;
            return webResponse;
          }
        }
      } catch (webErr) {
        console.warn('Web search lookup failed, continuing to Gemini/fallback:', webErr.message);
      }
    }

    // 3. ANSWER ANY QUESTION OR ANALYZE ATTACHMENT USING GEMINI AI (WITH MONGODB CONVERSATIONAL MEMORY)
    const apiKeyToUse = this.getEffectiveApiKey(customApiKey);
    if (apiKeyToUse) {
      try {
        const historyTurns = await this.getRecentChatHistory(5, deviceId, userId);
        const geminiReply = await this.callGeminiAPI(text, apiKeyToUse, isHindi, historyTurns, fileAttachment);
        if (geminiReply) {
          return {
            speech: geminiReply.speech,
            display: geminiReply.display,
            action: 'gemini_answer',
            source: 'Google Gemini AI',
            model: geminiReply.model || 'gemini-flash-lite-latest',
            language: lang
          };
        } else {
          console.warn('Gemini AI returned empty response. Gracefully falling back to local ARYA intelligence.');
          let fallbackReply = null;
          try {
            if (!fileAttachment && webSearchService.isWebQuery(lower)) {
              const searchResult = await webSearchService.searchWeb(text, isHindi);
              if (searchResult) {
                fallbackReply = webSearchService.formatAryaWebResponse(searchResult, this.userName, isHindi);
              }
            }
          } catch (webErr) {
            console.warn('Web search fallback error:', webErr.message);
          }

          if (!fallbackReply) {
            const localText = this.generateLocalAryaResponse(lower, text, isHindi);
            fallbackReply = {
              speech: localText,
              display: localText,
              action: 'local_response',
              source: 'ARYA Local Matrix',
              language: lang
            };
          }
          return fallbackReply;
        }
      } catch (err) {
        console.warn('Gemini AI execution error:', err.message);
      }
    }

    // If file attachment is uploaded but Gemini Key is not set:
    if (fileAttachment && !apiKeyToUse) {
      const fileName = fileAttachment.name || 'Uploaded File';
      const fileType = fileAttachment.type || 'Document';
      const fileSizeKb = Math.round((fileAttachment.size || 0) / 1024);

      if (isHindi) {
        const speech = `सर, मुझे ${fileName} प्राप्त हो गई है। छवि या दस्तावेज़ का गहरा विश्लेषण करने के लिए कृपया सेटिंग्स में अपनी एपीआई की सक्रिय करें।`;
        const display = `📎 **फ़ाइल प्राप्त हुई:**\n• **फ़ाइल का नाम:** **${fileName}**\n• **प्रकार:** \`${fileType}\`\n• **आकार:** ${fileSizeKb} KB\n\n💡 **मल्टीमॉडल विश्लेषण सक्रिय करें:**\nछवियों, दस्तावेजों, और कोड का गहरा विश्लेषण एवं प्रश्नोत्तर प्राप्त करने के लिए कृपया ऊपर **सेटिंग्स (⚙️)** खोलें और अपनी निःशुल्क **API Key** दर्ज करें।\n• निःशुल्क की प्राप्त करें: [Google AI Studio](https://aistudio.google.com/app/apikey)`;
        return {
          speech,
          display,
          action: 'file_received_no_key',
          source: 'ARYA Core',
          language: lang
        };
      } else {
        const speech = `I have received your file: ${fileName}, ${this.userName}. To enable full vision and document analysis, please add your API key in Settings.`;
        const display = `📎 **ATTACHED FILE RECEIVED:**\n• **File Name:** **${fileName}**\n• **Type:** \`${fileType}\`\n• **Size:** ${fileSizeKb} KB\n\n💡 **ACTIVATE MULTIMODAL VISION MATRIX:**\nTo inspect, converse about, and analyze images, PDFs, and code with deep intelligence, please click **Settings (⚙️)** in the top header and enter your free **API Key**.\n• Generate free key instantly at: [Google AI Studio](https://aistudio.google.com/app/apikey)`;
        return {
          speech,
          display,
          action: 'file_received_no_key',
          source: 'ARYA Core',
          language: lang
        };
      }
    }

    // If Gemini Key is not set, but user asks any question or informational request:
    const isQuestion = lower.includes('?') || 
      lower.startsWith('what') || lower.startsWith('why') || lower.startsWith('how') || 
      lower.startsWith('who') || lower.startsWith('where') || lower.startsWith('when') ||
      lower.startsWith('can you') || lower.startsWith('tell me') || lower.startsWith('explain') ||
      lower.startsWith('write') || lower.startsWith('define') || lower.startsWith('describe') ||
      lower.includes('kya') || lower.includes('kaise') || lower.includes('kyun') || 
      lower.includes('batao') || lower.includes('samjhao') || lower.includes('likho') ||
      lower.includes('meaning') || lower.includes('difference') ||
      (/[\u0900-\u097F]/.test(text) && (text.includes('?') || text.includes('क्या') || text.includes('क्यों') || text.includes('कैसे') || text.includes('कहाँ') || text.includes('कब') || text.includes('किसने') || text.includes('बताओ') || text.includes('समझाओ') || text.includes('लिखो') || text.includes('अर्थ')));

    if (isQuestion && !apiKeyToUse) {
      if (isHindi) {
        const speech = `सर, मैं आपके इस प्रश्न का पूर्ण उत्तर देने के लिए तैयार हूँ। कृपया सेटिंग्स में अपनी एपीआई की सक्रिय करें।`;
        const display = `💡 **एआई विश्लेषणात्मक इंजन सक्रिय करें:**\n\nआपके प्रश्न: **"${text}"** का उत्तर देने के लिए कृपया ऊपर **सेटिंग्स (⚙️)** खोलें और अपनी निःशुल्क **API Key** दर्ज करें।\n• आप अपनी निःशुल्क एपीआई की यहाँ से प्राप्त कर सकते हैं: [Google AI Studio](https://aistudio.google.com/app/apikey)\n\n*की दर्ज करते ही आर्या आपके सभी प्रश्नों, कोडिंग, विज्ञान और सामान्य ज्ञान के उत्तर स्वतः देगी।*`;
        return {
          speech,
          display,
          action: 'gemini_key_prompt',
          source: 'ARYA. Core',
          language: lang
        };
      } else {
        const speech = `I am ready to answer your question, ${this.userName}. Please enter your API key in Settings to activate full intelligence.`;
        const display = `💡 **ACTIVATE AI NEURAL MATRIX:**\n\nI can answer: **"${text}"** with deep analytical intelligence!\n\n• Click the **Settings (⚙️)** button in the top header.\n• Paste your free **API Key** and save.\n• You can generate a free key in seconds at: [Google AI Studio](https://aistudio.google.com/app/apikey)\n\n*Once connected, ARYA will answer all questions, coding queries, explanations, and creative prompts.*`;
        return {
          speech,
          display,
          action: 'gemini_key_prompt',
          source: 'ARYA. Core',
          language: lang
        };
      }
    }

    // 4. Built-in Local Heuristic ARYA. Conversational Intelligence
    const localReply = this.generateLocalAryaResponse(lower, text, isHindi);
    return {
      speech: localReply,
      display: localReply,
      action: 'local_chat',
      source: 'ARYA. Core',
      language: lang
    };
  }

  /**
   * Helper to resolve any [SYSTEM_EXEC: ...] tags generated by Gemini
   */
  async resolveSystemExecDirectives(text) {
    if (!text || !text.includes('[SYSTEM_EXEC:')) return text;
    const regex = /\[SYSTEM_EXEC:\s*([^\]]+)\]/g;
    let modified = text;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const cmd = match[1].trim();
      try {
        // Defensive interception: If Gemini or any prompt generated python script with pyautogui / whatsapp:
        if (cmd.includes('pyautogui') || (cmd.includes('whatsapp') && cmd.includes('python'))) {
          const phoneMatch = cmd.match(/phone=([0-9\+]+)/i) || cmd.match(/([0-9]{10,13})/);
          const textMatch = cmd.match(/text=([^&'"\)]+)/i) || cmd.match(/['"]([^'"]{2,})['"]/);
          const targetPhone = phoneMatch ? phoneMatch[1] : '';
          const targetMsg = textMatch ? decodeURIComponent(textMatch[1]) : 'Hello';
          const autoRes = await systemService.sendWhatsAppAutomated(targetPhone, targetMsg);
          modified = modified.replace(match[0], `\n\`\`\`powershell\n# Executed via Native Windows Automation (No Python/PyAutoGUI needed):\nWhatsApp message dispatched to ${targetPhone || 'recipient'}: "${targetMsg}"\n\`\`\`\n`);
        } else {
          const res = await systemService.executeCustomCommand(cmd);
          const out = res.stdout || res.stderr || '(Command executed cleanly with no output)';
          modified = modified.replace(match[0], `\n\`\`\`powershell\n# Executed: ${cmd}\n${out}\n\`\`\`\n`);
        }
      } catch (e) {
        modified = modified.replace(match[0], `\n*(Execution failed: ${e.message})*\n`);
      }
    }
    return modified;
  }

  /**
   * Deep Windows System & OS Access Handler
   * Executes voice/text commands for:
   * - Screenshots, Lock PC, Volume controls
   * - Battery telemetry, Disk/drive storage space, Network/IP
   * - Top running processes & task termination
   * - Launching any desktop app (Notepad, Calculator, Chrome, VS Code, Paint, etc.)
   * - Opening system folders (Desktop, Downloads, Documents, C:, etc.)
   * - File system operations (listing, reading, creating, deleting files and folders)
   * - Direct terminal / PowerShell command execution
   */
  async handleSystemCommands(lower, originalText, isHindi, deviceId = 'default_device', deviceName = 'Primary Device', devicePlatform = 'windows', deviceType = 'desktop', isLocalHost = true, clientBattery = null, clientStorage = null) {
    const isMobileClient = devicePlatform === 'ios' || devicePlatform === 'android' || deviceType === 'mobile' || deviceType === 'tablet' || deviceId?.startsWith('mob_') || deviceId?.startsWith('tab_');
    const isDesktopWorkstation = !isMobileClient && (isLocalHost || devicePlatform === 'windows' || devicePlatform === 'mac' || devicePlatform === 'linux' || deviceType === 'desktop');

    // 1. SCREENSHOT CAPTURE
    if (lower.includes('screenshot') || lower.includes('screen shot') || lower.includes('स्क्रीनशॉट') || lower.includes('स्क्रीन कैप्चर')) {
      const ssRes = await systemService.takeScreenshot();
      if (ssRes.success) {
        const imgLink = `/api/screenshot/${encodeURIComponent(ssRes.filename)}`;
        return {
          speech: isHindi 
            ? (isDesktopWorkstation ? `सर, स्क्रीनशॉट ले लिया गया है और इसे पिक्चर्स फ़ोल्डर में सुरक्षित कर दिया गया है।` : `सर, वर्कस्टेशन स्क्रीनशॉट कैप्चर कर आपके मोबाइल स्क्रीन पर प्रदर्शित कर दिया गया है।`)
            : (isDesktopWorkstation ? `Screenshot captured and saved to your Pictures folder, ${this.userName}.` : `Workstation screen captured and synced to your mobile screen, ${this.userName}.`),
          display: `📸 **SCREENSHOT CAPTURED [${isDesktopWorkstation ? 'Workstation' : deviceName}]:**\n• **File:** \`${ssRes.filename}\`\n• **Direct Link:** [View High-Res Screenshot](${imgLink})\n\n![Screenshot](${imgLink})`,
          action: 'screenshot_captured',
          data: { ...ssRes, imageUrl: imgLink, isDesktopWorkstation }
        };
      } else {
        return {
          speech: isHindi ? `स्क्रीनशॉट लेने में समस्या आई, सर। डिस्प्ले लॉक हो सकता है।` : `Unable to capture screenshot, ${this.userName}. Display may be locked.`,
          display: `⚠️ **Screenshot Notice:** ${ssRes.error || 'Display buffer could not be captured.'}`,
          action: 'system_error'
        };
      }
    }

    // 2. LOCK COMPUTER / WORKSTATION / MOBILE DEVICE
    const isLockPCCommand = lower.includes('lock pc') || lower.includes('lock computer') || lower.includes('lock workstation') || lower.includes('lock laptop') || lower.includes('lock screen') || lower.includes('कंप्यूटर लॉक') || lower.includes('पीसी लॉक') || lower.includes('स्क्रीन लॉक') || lower.includes('लैपटॉप लॉक');
    const isLockMobileCommand = lower.includes('lock mobile') || lower.includes('lock phone') || lower.includes('lock device') || lower.includes('फोन लॉक') || lower.includes('मोबाइल लॉक');

    if (isLockPCCommand || isLockMobileCommand) {
      if (isLockMobileCommand && !isLockPCCommand) {
        return {
          speech: isHindi ? `सर, आपके मोबाइल डिवाइस पर आर्या स्क्रीन लॉक कर दी गई है।` : `Security protocol engaged. ARYA screen locked on your device, ${this.userName}.`,
          display: `🔒 **DEVICE SECURITY LOCK [${deviceName}]:**\n• **Active System:** ${deviceName} (${devicePlatform.toUpperCase()})\n• **Status:** ARYA secure session locked.\n• To resume interaction, tap the screen or sign in.`,
          action: 'device_locked',
          data: { isDesktopWorkstation: false }
        };
      }

      // "lock pc", "lock computer", "lock screen" -> ALWAYS LOCK THE PC WORKSTATION!
      try {
        await systemService.lockSystem();
      } catch (err) {
        console.warn('System lock notice:', err.message);
      }
      const scopeLabel = isDesktopWorkstation ? 'Workstation [Local PC]' : `Workstation [Remote Command from ${deviceName}]`;
      return {
        speech: isHindi 
          ? (isDesktopWorkstation ? `सर, कंप्यूटर वर्कस्टेशन को तुरंत लॉक कर दिया गया है।` : `सर, आपके मोबाइल से पीसी वर्कस्टेशन (PC) को तुरंत लॉक कर दिया गया है।`)
          : (isDesktopWorkstation ? `Workstation locked immediately, ${this.userName}.` : `Host workstation locked remotely from ${deviceName}, ${this.userName}.`),
        display: `🔒 **PC WORKSTATION LOCKED [${scopeLabel}]:**\n• **Target:** Host Workstation PC\n• **Status:** System access locked on screen\n• **Command Origin:** **${deviceName}** (${devicePlatform.toUpperCase()})\n*(Security protocol engaged successfully)*`,
        action: 'system_locked',
        data: { isDesktopWorkstation, target: 'workstation' }
      };
    }

    // 3. VOLUME CONTROLS
    if (lower.includes('mute volume') || lower.includes('unmute volume') || lower.includes('volume mute') || lower.includes('mute audio') || lower.includes('म्यूट करो')) {
      await systemService.setVolume('mute');
      return {
        speech: isHindi ? `सर, सिस्टम ऑडियो म्यूट टॉगल कर दिया गया है।` : `Master audio mute toggled, ${this.userName}.`,
        display: `🔇 **VOLUME MUTE TOGGLED**`,
        action: 'volume_control'
      };
    }
    if (lower.includes('volume up') || lower.includes('increase volume') || lower.includes('turn up volume') || lower.includes('आवाज़ बढ़ाओ') || lower.includes('वॉल्यूम बढ़ाओ')) {
      await systemService.setVolume('up');
      return {
        speech: isHindi ? `सर, सिस्टम वॉल्यूम बढ़ा दिया गया है।` : `Master volume increased, ${this.userName}.`,
        display: `🔊 **VOLUME INCREASED** (+10%)`,
        action: 'volume_control'
      };
    }
    if (lower.includes('volume down') || lower.includes('decrease volume') || lower.includes('turn down volume') || lower.includes('आवाज़ कम करो') || lower.includes('वॉल्यूम कम करो')) {
      await systemService.setVolume('down');
      return {
        speech: isHindi ? `सर, सिस्टम वॉल्यूम कम कर दिया गया है।` : `Master volume decreased, ${this.userName}.`,
        display: `🔉 **VOLUME DECREASED** (-10%)`,
        action: 'volume_control'
      };
    }

    // 4. BATTERY STATUS
    const isBatteryQuery = lower === 'battery' || lower.includes('battery') || lower.includes('बैटरी') || lower.includes('power level') || lower.includes('चार्जिंग');
    if (isBatteryQuery) {
      const bat = await systemService.getBatteryStatus();
      if (isDesktopWorkstation) {
        return {
          speech: isHindi 
            ? `सर, आपके लैपटॉप की बैटरी ${bat.percent}% है और यह ${bat.status} मोड में है।`
            : `Workstation battery is currently at ${bat.percent}%, running on ${bat.status}, ${this.userName}.`,
          display: `🔋 **WORKSTATION BATTERY STATUS [Laptop]:**\n• **Charge Level:** **${bat.percent}%**\n• **Power State:** ${bat.status}\n• **AC Connected:** ${bat.isCharging ? 'YES ⚡' : 'NO'}`,
          action: 'battery_status',
          data: { ...bat, isDesktopWorkstation: true }
        };
      } else {
        // Mobile device
        if (clientBattery && typeof clientBattery.percent === 'number') {
          const chargingTextHi = clientBattery.isCharging ? 'और चार्ज हो रहा है ⚡' : 'और बैटरी पर चल रहा है';
          const chargingTextEn = clientBattery.isCharging ? '(Charging ⚡)' : '(On Battery)';
          return {
            speech: isHindi 
              ? `सर, आपके मोबाइल (${deviceName}) की बैटरी अभी ${clientBattery.percent}% है ${chargingTextHi}।`
              : `Mobile device (${deviceName}) battery is currently at ${clientBattery.percent}% ${chargingTextEn}, ${this.userName}.`,
            display: `🔋 **MOBILE BATTERY TELEMETRY [${deviceName}]:**\n• **📱 Mobile Battery:** **${clientBattery.percent}%** (${clientBattery.isCharging ? '⚡ Charging' : 'Discharging'})\n• **Active System:** **${deviceName}** (${devicePlatform.toUpperCase()})\n• **💻 Host Workstation:** ${bat.percent}% (${bat.status})\n*(Hardware sensor synchronized with HUD)*`,
            action: 'battery_status',
            data: { ...clientBattery, hostBattery: bat, isDesktopWorkstation: false }
          };
        } else {
          return {
            speech: isHindi 
              ? `सर, आपके मोबाइल स्क्रीन के ऊपर स्टेटस बार में बैटरी उपलब्ध है। वर्कस्टेशन बैटरी ${bat.percent}% है।`
              : `Mobile device battery is active in your device's top status bar. Host workstation is at ${bat.percent}%, ${this.userName}.`,
            display: `🔋 **BATTERY TELEMETRY [${deviceName}]:**\n• **📱 Active Device:** **${deviceName}** (${devicePlatform.toUpperCase()})\n• **Device Battery:** Active in system top bar\n• **💻 Host Workstation:** **${bat.percent}%** (${bat.status})\n*(Real-time telemetry synchronized)*`,
            action: 'battery_status',
            data: { hostBattery: bat, isDesktopWorkstation: false }
          };
        }
      }
    }

    // 4.1 CPU ARCHITECTURE & PROCESSOR TELEMETRY
    const isCpuQuery = lower.includes('cpu architecture') ||
      lower.includes('cpu arch') ||
      lower.includes('processor architecture') ||
      lower.includes('cpu info') ||
      lower.includes('cpu details') ||
      lower.includes('processor info') ||
      lower.includes('processor details') ||
      lower.includes('cpu model') ||
      lower.includes('processor model') ||
      lower.includes('processor name') ||
      lower.includes('about cpu') ||
      lower === 'cpu' ||
      lower === 'processor' ||
      lower.includes('सीपीयू') ||
      lower.includes('प्रोसेसर') ||
      lower.includes('आर्किटेक्चर') ||
      lower.includes('cpu kya hai') ||
      lower.includes('processor kya hai') ||
      lower.includes('architecture kya hai') ||
      lower.includes('cpu architecture kya hai');

    if (isCpuQuery) {
      const cpuInfo = await systemService.getCpuInfo();
      const scopeLabel = isDesktopWorkstation ? 'Workstation Hardware' : `Host Workstation Hardware (${deviceName} Remote Access)`;
      return {
        speech: isHindi
          ? `सर, आपके सिस्टम का सीपीयू आर्किटेक्चर ${cpuInfo.archFormatted} है। प्रोसेसर ${cpuInfo.model} है, जिसमें ${cpuInfo.cores} कोर या थ्रेड्स ${cpuInfo.speedGHz} GHz गति पर काम कर रहे हैं।`
          : `Workstation CPU Architecture is ${cpuInfo.archFormatted}, ${this.userName}. Running on ${cpuInfo.model} with ${cpuInfo.cores} processing threads at ${cpuInfo.speedGHz} GHz.`,
        display: `⚡ **CPU ARCHITECTURE & HARDWARE TELEMETRY [${scopeLabel}]:**\n• **CPU Architecture:** **${cpuInfo.archFormatted}**\n• **Processor Model:** **${cpuInfo.model}**\n• **Active Cores / Threads:** **${cpuInfo.cores} Threads**\n• **Clock Speed:** **${cpuInfo.speedGHz} GHz** (${cpuInfo.speedMHz} MHz)\n• **Host OS Platform:** ${cpuInfo.osPlatform}\n*(Synchronized with ARYA Hardware HUD)*`,
        action: 'cpu_info',
        data: cpuInfo
      };
    }

    // 5. DISK SPACE / STORAGE STATUS
    const isDiskQuery = lower.includes('disk space') || lower.includes('storage') || lower.includes('drive space') || 
      lower.includes('hard disk') || lower.includes('free space') || lower.includes('disk') || 
      lower.includes('स्टोरेज') || lower.includes('हार्ड डिस्क') || lower.includes('ड्राइव स्पेस') || 
      lower.includes('space kitna') || lower.includes('kitna space') || lower.includes('storage kitna');

    if (isDiskQuery) {
      const disk = await systemService.getDiskSpace();
      if (disk.success && disk.drives && disk.drives.length > 0) {
        const driveRows = disk.drives.map(d => `• **Drive ${d.Name}:** ${d.FreeGB} GB Free / ${d.TotalGB} GB Total (${d.PercentFree}% free)`).join('\n');
        const primary = disk.drives[0];
        if (isDesktopWorkstation) {
          return {
            speech: isHindi
              ? `सर, ड्राइव ${primary.Name} में ${primary.FreeGB} जीबी खाली जगह है, कुल ${primary.TotalGB} जीबी में से।`
              : `Drive ${primary.Name} has ${primary.FreeGB} gigabytes free out of ${primary.TotalGB} GB, ${this.userName}.`,
            display: `💾 **STORAGE / DRIVE TELEMETRY [Workstation]:**\n${driveRows}`,
            action: 'disk_space',
            data: { drives: disk.drives, isDesktopWorkstation: true }
          };
        } else {
          const quotaStr = clientStorage && clientStorage.quotaGB ? `${clientStorage.quotaGB} GB available (${clientStorage.usageMB || 0} MB cached)` : 'Local HTML5 Storage Quota Active';
          return {
            speech: isHindi
              ? `सर, मोबाइल लोकल स्टोरेज सक्रिय है, और वर्कस्टेशन ड्राइव ${primary.Name} में ${primary.FreeGB} जीबी खाली है।`
              : `Mobile storage active. Workstation drive ${primary.Name} has ${primary.FreeGB} gigabytes free out of ${primary.TotalGB} GB, ${this.userName}.`,
            display: `💾 **STORAGE TELEMETRY [${deviceName} & Workstation]:**\n• **📱 Mobile Device Quota:** ${quotaStr}\n• **☁️ MongoDB Cloud Vault:** Active & Synchronized\n• **💻 Host Workstation Drives:**\n${driveRows}`,
            action: 'disk_space',
            data: { drives: disk.drives, clientStorage, isDesktopWorkstation: false }
          };
        }
      }
    }

    // 6. NETWORK / IP ADDRESS
    if (lower.includes('ip address') || lower.includes('my ip') || lower.includes('network status') || lower.includes('wifi status') || lower.includes('आईपी एड्रेस') || lower.includes('नेटवर्क स्टेटस')) {
      const net = await systemService.getNetworkInfo();
      return {
        speech: isHindi
          ? `सर, आपका नेटवर्क आईपी एड्रेस ${net.ipAddress} है।`
          : `Your local IP address is ${net.ipAddress} on ${net.interface}, ${this.userName}.`,
        display: `🌐 **NETWORK TELEMETRY:**\n• **Host Machine:** ${net.hostname}\n• **IPv4 Address:** \`${net.ipAddress}\`\n• **Adapter:** ${net.interface}`,
        action: 'network_info',
        data: net
      };
    }

    // 7. RUNNING APPS / PROCESS MONITOR
    if (lower.includes('running apps') || lower.includes('running processes') || lower.includes('show processes') || lower.includes('what apps are open') || lower.includes('टास्क लिस्ट') || lower.includes('चल रहे ऐप') || lower.includes('प्रोसेस दिखाओ')) {
      const procs = await systemService.getRunningProcesses(8);
      if (procs.success && procs.processes) {
        const procRows = procs.processes.map((p, i) => `${i + 1}. **${p.ProcessName}** - ${p.MemoryMB} MB RAM (PID: ${p.Id})`).join('\n');
        return {
          speech: isHindi 
            ? `सर, आपकी स्क्रीन पर सबसे अधिक रैम उपयोग करने वाले ऐप्स की सूची प्रस्तुत है।`
            : `Here are the top active processes consuming system memory, ${this.userName}.`,
          display: `📊 **ACTIVE RUNNING PROCESSES:**\n${procRows}`,
          action: 'process_list',
          data: procs.processes
        };
      }
    }

    // 8. TERMINATE / CLOSE APPLICATION
    const closeMatch = lower.match(/(?:close|kill|terminate|exit|stop)\s+(?:app|the\s+app|application|the\s+)?([a-z0-9\s\.\-]+)/i) ||
      originalText.match(/([a-zA-Z0-9\u0900-\u097F\s\.\-]+)\s+(?:बंद करो|हटाओ|खत्म करो)/i) ||
      originalText.match(/(?:बंद करो|हटाओ|खत्म करो)\s+([a-zA-Z0-9\u0900-\u097F\s\.\-]+)/i);

    if (closeMatch && closeMatch[1] && !lower.includes('door') && !lower.includes('window') && (!lower.includes('note') || lower.includes('notepad'))) {
      const targetApp = closeMatch[1].trim();
      const closeRes = await systemService.closeApp(targetApp);
      return {
        speech: isHindi
          ? `सर, ${targetApp} को बंद कर दिया गया है।`
          : `Terminated ${targetApp} process, ${this.userName}.`,
        display: `🛑 **PROCESS TERMINATED:**\n• **Target:** **${targetApp}**\n• **Status:** Closed`,
        action: 'app_closed',
        data: closeRes
      };
    }

    // 9. OPEN FOLDER IN FILE EXPLORER
    const openFolderMatch = lower.match(/(?:open|show)\s+(?:the\s+)?([a-z0-9\s\.\-_\\\/:]+)\s+(?:folder|directory)/i) ||
      lower.match(/^open\s+(desktop|downloads|documents|pictures|videos|music|c\s+drive|d\s+drive)$/i) ||
      originalText.match(/([a-z0-9\s\.\-_\\\/:]+)\s+(?:फोल्डर खोलो|डायरेक्टरी खोलो)/i);

    if (openFolderMatch && openFolderMatch[1]) {
      const folderTarget = openFolderMatch[1].trim();
      const fRes = await systemService.openFolder(folderTarget);
      return {
        speech: isHindi 
          ? `सर, ${folderTarget} फ़ोल्डर खोल दिया गया है।`
          : `Opening ${folderTarget} in File Explorer, ${this.userName}.`,
        display: `📁 **FOLDER OPENED IN FILE EXPLORER:**\n• **Target:** \`${fRes.path}\``,
        action: 'folder_opened',
        data: fRes
      };
    }

    // 10. LIST FILES IN DIRECTORY
    const listFilesMatch = lower.match(/(?:list|show|what)\s+files?\s+(?:in|on|at|inside)?\s*([a-z0-9\s\.\-_\\\/:]*)/i) ||
      originalText.match(/([a-z0-9\s\.\-_\\\/:]*)\s*(?:की फाइलें|फाइलें दिखाओ|फाइल लिस्ट)/i);

    if (listFilesMatch && (lower.includes('file') || lower.includes('फाइल'))) {
      const dirTarget = (listFilesMatch[1] && listFilesMatch[1].trim()) || 'desktop';
      const listRes = await systemService.listFiles(dirTarget, 20);
      if (listRes.success) {
        const fileRows = listRes.items.map(it => `• \`${it.type}\` **${it.name}** (${it.size})`).join('\n');
        const scope = isDesktopWorkstation ? 'Workstation Local Files' : `Remote Workstation Files (${deviceName} Access)`;
        return {
          speech: isHindi
            ? `सर, ${dirTarget} में कुल ${listRes.totalInDir} फाइलें हैं। सूची स्क्रीन पर प्रदर्शित है।`
            : `Found ${listRes.totalInDir} items in ${dirTarget}, ${this.userName}. List displayed on screen.`,
          display: `📂 **FILE EXPLORER // ${scope.toUpperCase()}:**\n• **Directory:** \`${listRes.path}\`\n• **Total Items:** ${listRes.totalInDir}\n\n${fileRows || '*Directory is empty*'}\n\n*(Showing top 20 items)*`,
          action: 'files_listed',
          data: { ...listRes, isDesktopWorkstation }
        };
      }
    }

    // 11. READ FILE CONTENT
    const readFileMatch = lower.match(/(?:read|show|view|display)\s+(?:content of|file)?\s*([a-z0-9\s\.\-_\\\/:]+\.[a-z0-9]{1,6})/i) ||
      originalText.match(/([a-z0-9\s\.\-_\\\/:]+\.[a-z0-9]{1,6})\s+(?:फाइल पढ़ो|दिखाओ)/i);

    if (readFileMatch && readFileMatch[1]) {
      const fileTarget = readFileMatch[1].trim();
      const readRes = await systemService.readFile(fileTarget);
      if (readRes.success) {
        return {
          speech: isHindi ? `सर, फाइल का विवरण स्क्रीन पर है।` : `Here is the content of ${path.basename(fileTarget)}, ${this.userName}.`,
          display: `📄 **FILE CONTENT:** \`${readRes.path}\` (${readRes.sizeBytes} bytes)\n\`\`\`\n${readRes.content}\n\`\`\``,
          action: 'file_read',
          data: readRes
        };
      } else {
        return {
          speech: isHindi ? `फाइल पढ़ने में त्रुटि हुई, सर।` : `Could not read file: ${readRes.error}, ${this.userName}.`,
          display: `⚠️ **File Read Error:** ${readRes.error}`,
          action: 'system_error'
        };
      }
    }

    // 12. CREATE FOLDER
    const createFolderMatch = lower.match(/(?:create|make|new)\s+folder\s+(.+)/i) ||
      originalText.match(/नया\s+फोल्डर\s+बनाओ\s+(.+)/i);

    if (createFolderMatch && createFolderMatch[1]) {
      const folderName = createFolderMatch[1].trim();
      const cfRes = await systemService.createFolder(folderName);
      return {
        speech: isHindi ? `सर, ${folderName} फोल्डर बना दिया गया है।` : `Created folder "${folderName}" on your Desktop, ${this.userName}.`,
        display: `📁 **DIRECTORY CREATED:**\n• **Path:** \`${cfRes.path}\``,
        action: 'folder_created',
        data: cfRes
      };
    }

    // 13. CREATE FILE
    const createFileMatch = lower.match(/(?:create|make|write)\s+file\s+([^\s]+)(?:\s+with content\s+(.+))?/i) ||
      originalText.match(/नई\s+फाइल\s+बनाओ\s+([^\s]+)/i);

    if (createFileMatch && createFileMatch[1]) {
      const fileName = createFileMatch[1].trim();
      const fileContent = createFileMatch[2] ? createFileMatch[2].trim() : '';
      const cfileRes = await systemService.createFile(fileName, fileContent);
      return {
        speech: isHindi ? `सर, ${fileName} फाइल बना दी गई है।` : `Created file "${fileName}" on your Desktop, ${this.userName}.`,
        display: `📝 **FILE CREATED:**\n• **Path:** \`${cfileRes.path}\`\n• **Size:** ${cfileRes.size} bytes`,
        action: 'file_created',
        data: cfileRes
      };
    }

    // 14. DELETE FILE / FOLDER
    const deleteMatch = lower.match(/(?:delete|remove)\s+(?:file|folder)\s+(.+)/i) ||
      originalText.match(/(?:डिलीट करो|हटाओ)\s+(?:फाइल|फोल्डर)\s*(.+)/i);

    if (deleteMatch && deleteMatch[1]) {
      const delTarget = deleteMatch[1].trim();
      const delRes = await systemService.deleteFileOrFolder(delTarget);
      if (delRes.success) {
        return {
          speech: isHindi ? `सर, ${delTarget} को सफलतापूर्वक हटा दिया गया है।` : `Removed "${delTarget}" from your system, ${this.userName}.`,
          display: `🗑️ **DELETED FROM SYSTEM:**\n• **Path:** \`${delRes.path}\``,
          action: 'file_deleted',
          data: delRes
        };
      }
    }

    // 15. RUN CUSTOM TERMINAL / POWERSHELL COMMAND
    const runCmdMatch = lower.match(/(?:run command|execute command|run powershell|run terminal|execute|terminal command|powershell|कमांड चलाओ)\s+(.+)/i);
    if (runCmdMatch && runCmdMatch[1]) {
      const commandString = runCmdMatch[1].trim();
      const cmdRes = await systemService.executeCustomCommand(commandString);
      return {
        speech: isHindi 
          ? `सर, कमांड निष्पादित कर दी गई है।`
          : `Command executed, ${this.userName}. Output is on screen.`,
        display: `💻 **TERMINAL EXECUTION:**\nCommand: \`${commandString}\`\n\`\`\`powershell\n${cmdRes.stdout || cmdRes.stderr || 'Command executed cleanly with no standard output.'}\n\`\`\``,
        action: 'command_executed',
        data: cmdRes
      };
    }

    // 16. OPEN / LAUNCH APPLICATION (General and Desktop App detector)
    const openAppMatch = lower.match(/(?:open|launch|start|run)\s+(?:the\s+)?([a-z0-9\s\.\-]+)/i) ||
      originalText.match(/([a-zA-Z0-9\u0900-\u097F\s\.\-]+)\s+(?:खोलो|ओपन करो|चालू करो|शुरू करो)/i) ||
      originalText.match(/(?:खोलो|ओपन करो|चालू करो|शुरू करो)\s+([a-zA-Z0-9\u0900-\u097F\s\.\-]+)/i);

    if (openAppMatch && openAppMatch[1]) {
      const candidateApp = openAppMatch[1].trim().toLowerCase();
      // Exclude web services, messaging phrases, or compound commands
      const webExcludes = ['youtube', 'google', 'github', 'website', 'tab', 'browser tab', 'whatsapp', 'व्हाट्सएप'];
      const isComplexPhrase = candidateApp.includes(' and ') || candidateApp.includes(' ko ') || candidateApp.includes(' karo') || candidateApp.includes(' message') || candidateApp.includes(' play') || candidateApp.includes(' search');
      if (!isComplexPhrase && !webExcludes.some(w => candidateApp.includes(w))) {
        const appRes = await systemService.launchApp(candidateApp);
        if (appRes.success) {
          return {
            speech: isHindi 
              ? `जी सर, ${candidateApp} खोला जा रहा है।`
              : `Launching ${candidateApp} for you, ${this.userName}.`,
            display: `🚀 **APPLICATION LAUNCHED:**\n• **Target:** **${candidateApp}**\n• **Status:** Active on Windows OS`,
            action: 'app_launched',
            data: appRes
          };
        }
      }
    }

    return null;
  }

  /**
   * Dedicated Messaging Engine: Handles WhatsApp & direct text messaging to individuals / phone numbers
   */
  async handleMessagingCommands(lower, originalText, isHindi) {
    // 1. SAVE CONTACT: "save contact <name> <phone>" or "contact save karo <name> <phone>"
    const saveContactMatch = originalText.match(/(?:save contact|add contact|contact save karo|नंबर सेव करो|कांटेक्ट सेव करो)\s+([^\d]+?)\s*(?:phone|number|नंबर)?\s*([0-9\+\-\s]{7,15})$/i) ||
      originalText.match(/(?:save contact|add contact)\s+([^\s]+)\s+([0-9\+\-\s]{7,15})/i);
    if (saveContactMatch) {
      const name = saveContactMatch[1].trim();
      const phone = saveContactMatch[2].replace(/[^0-9\+]/g, '').trim();
      try {
        await Contact.findOneAndUpdate(
          { name: new RegExp('^' + name + '$', 'i') },
          { name, phone, updatedAt: new Date() },
          { upsert: true, new: true }
        );
        const speech = isHindi
          ? `सर, ${name} का फोन नंबर ${phone} सुरक्षित कर दिया गया है।`
          : `Contact ${name} with phone ${phone} has been saved, ${this.userName}.`;
        return {
          speech,
          display: `📇 **CONTACT SAVED TO MONGODB:**\n• **Name:** **${name}**\n• **Phone:** \`${phone}\``,
          action: 'contact_saved',
          data: { name, phone }
        };
      } catch (err) {
        console.warn('Failed to save contact:', err.message);
      }
    }

    // 2. LIST CONTACTS: "my contacts" / "show contacts" / "mere contacts"
    if (lower === 'my contacts' || lower.includes('show contacts') || lower.includes('list contacts') || lower.includes('mere contacts') || lower.includes('कांटेक्ट दिखाओ')) {
      try {
        const contacts = await Contact.find().sort({ name: 1 }).limit(20);
        if (contacts.length === 0) {
          return {
            speech: isHindi ? `सर, डायरेक्टरी में अभी कोई संपर्क सुरक्षित नहीं है।` : `No contacts saved in your directory, ${this.userName}.`,
            display: `📇 **CONTACT DIRECTORY [MongoDB]:**\n*No contacts saved yet. Say "save contact [name] [phone]" to add one.*`,
            action: 'contacts_list'
          };
        }
        const rows = contacts.map(c => `• **${c.name}**: \`${c.phone || 'No phone'}\``).join('\n');
        return {
          speech: isHindi ? `सर, आपके सुरक्षित संपर्कों की सूची स्क्रीन पर है।` : `Here is your contact directory, ${this.userName}.`,
          display: `📇 **CONTACT DIRECTORY [MongoDB]:**\n${rows}`,
          action: 'contacts_list',
          data: contacts
        };
      } catch (e) {}
    }

    // 2.1 PHONE CALL COMMAND (Android & Mac / iOS Native Dialer)
    // "call Papa", "call +919876543210", "Papa ko call karo", "phone lagao Rahul ko", "dial 9876543210"
    const isCallCommand = (
      lower.startsWith('call ') || 
      lower.startsWith('phone ') || 
      lower.startsWith('dial ') || 
      lower.includes('call karo') || 
      lower.includes('call lagao') || 
      lower.includes('phone lagao') || 
      lower.includes('phone karo') || 
      lower.includes('कॉल करो') || 
      lower.includes('फोन लगाओ') || 
      lower.includes('कॉल लगाओ') || 
      lower.includes('फोन करो')
    ) && !lower.startsWith('call me ') && !lower.includes('mera naam') && !lower.includes('whatsapp');

    if (isCallCommand) {
      let target = originalText;
      target = target.replace(/^(?:please\s+|arya\s+|hey\s+arya\s+)?(?:make\s+a\s+call\s+to|call\s+to|call|phone\s+lagao|phone\s+karo|call\s+karo|call\s+lagao|dial|कॉल\s+करो|फोन\s+लगाओ|कॉल\s+लगाओ|फोन\s+करो)\s*/i, '');
      target = target.replace(/\s+(?:ko|par|को|पर)?\s*(?:call\s+karo|call\s+lagao|phone\s+lagao|phone\s+karo|call|फोन|कॉल)$/i, '').trim();
      target = target.replace(/\s+(?:ko|par|को|पर)$/i, '').trim();

      if (target) {
        let phone = null;
        const isPhoneNumber = /^[\+]?[0-9\s\-]{7,15}$/.test(target);
        if (isPhoneNumber) {
          phone = target.replace(/[^0-9\+]/g, '');
        } else {
          try {
            const contact = await Contact.findOne({
              $or: [
                { name: new RegExp('^' + target + '$', 'i') },
                { name: new RegExp(target, 'i') }
              ]
            });
            if (contact && contact.phone) {
              phone = contact.phone;
            }
          } catch (e) {}
        }

        const dialDigits = phone ? phone.replace(/[^0-9\+]/g, '') : target.replace(/[^0-9\+]/g, '');
        const telUrl = dialDigits ? `tel:${dialDigits}` : `tel:${target}`;

        const speech = isHindi
          ? `सर, ${target} को कॉल मिलाया जा रहा है।`
          : `Initiating phone call to ${target}, ${this.userName}.`;

        const display = `📞 **VOICE CALL DISPATCH**\n• **Target Contact:** **${target}**\n• **Phone Number:** \`${phone || dialDigits || 'Prompting Dialer'}\`\n• **Direct Call Action:** [📞 Tap to Call ${target}](${telUrl})\n\n*(Native phone dialer triggered on Android/iPhone/Mac)*`;

        return {
          speech,
          display,
          action: 'phone_call',
          data: {
            recipient: target,
            phone: phone || dialDigits,
            telUrl
          }
        };
      }
    }

    // 2.2 SMS / TEXT MESSAGE COMMAND (Android & Mac / iOS Messages)
    // "send sms to Papa Hello", "sms bhejo Rahul ko Kahan ho", "text Mum I am coming"
    const isSmsCommand = (lower.startsWith('send sms') || lower.startsWith('sms ') || lower.includes('sms bhejo') || lower.includes('एसएमएस भेजो') || lower.startsWith('text ')) && !lower.includes('whatsapp');
    if (isSmsCommand) {
      const smsMatch = originalText.match(/(?:send\s+sms\s+(?:to\s+)?|sms\s+bhejo\s+|sms\s+karo\s+|text\s+|एसएमएस\s+भेजो\s+)([^\s:]+)(?:\s+(?:saying|that|with content|ko|par|को|पर)\s+|\s*:\s*|\s+)(.+)/i);
      if (smsMatch) {
        let target = smsMatch[1].trim();
        let messageBody = smsMatch[2].trim();
        target = target.replace(/\s+(?:ko|par|को|पर)$/i, '').trim();

        let phone = null;
        const isPhoneNumber = /^[\+]?[0-9\s\-]{7,15}$/.test(target);
        if (isPhoneNumber) {
          phone = target.replace(/[^0-9\+]/g, '');
        } else {
          try {
            const contact = await Contact.findOne({
              $or: [
                { name: new RegExp('^' + target + '$', 'i') },
                { name: new RegExp(target, 'i') }
              ]
            });
            if (contact && contact.phone) {
              phone = contact.phone;
            }
          } catch (e) {}
        }

        const cleanPhone = phone ? phone.replace(/[^0-9\+]/g, '') : (isPhoneNumber ? target.replace(/[^0-9\+]/g, '') : '');
        const smsUrl = cleanPhone 
          ? `sms:${cleanPhone}?body=${encodeURIComponent(messageBody)}`
          : `sms:?body=${encodeURIComponent(messageBody)}`;

        const speech = isHindi
          ? `सर, ${target} के लिए एसएमएस संदेश तैयार कर दिया गया है।`
          : `Dispatching SMS to ${target}, ${this.userName}.`;

        const display = `💬 **SMS / TEXT MESSAGE DISPATCH**\n• **Target Contact:** **${target}** ${phone ? `(\`${phone}\`)` : ''}\n• **Message:** "${messageBody}"\n• **Direct SMS Link:** [💬 Open SMS Messages App](${smsUrl})\n\n*(Messages app triggered on mobile/Mac)*`;

        return {
          speech,
          display,
          action: 'send_sms',
          data: {
            recipient: target,
            phone: cleanPhone,
            message: messageBody,
            smsUrl
          }
        };
      }
    }

    // 3. PARSE WHATSAPP / DIRECT MESSAGING COMMAND
    const hasMsgKeyword = lower.includes('whatsapp') || lower.includes('message') || lower.includes('मैसेज') || lower.includes('संदेश') || lower.includes('msg') || lower.includes('text') || lower.includes('व्हाट्सएप') || lower.includes('व्हाट्सऐप') || /^[0-9\+]{10,13}\s+/i.test(originalText.trim());
    if (!hasMsgKeyword) {
      return null;
    }

    let recipient = '';
    let messageBody = '';

    // Direct phone number matching patterns:
    // e.g. "918936815826 ko message bhejo Hello", "918936815826 ko message karo Hello"
    const phonePatternC = originalText.match(/(\+?[0-9]{10,13})\s+(?:ko|par|पर|को)\s*(?:message\s+karo|message\s+bhejo|msg\s+karo|मैसेज\s+करो|मैसेज\s+भेजो|संदेश\s+भेजो|bhejo|karo)\s+(?:ki\s+|that\s+|:\s*)?(.+)$/i);
    // e.g. "918936815826 ko Hello message karo", "918936815826 par Hello message bhejo"
    const phonePatternB = originalText.match(/(\+?[0-9]{10,13})\s+(?:ko|par|पर|को)\s*(.+?)\s*(?:message\s+karo|message\s+bhejo|msg\s+karo|मैसेज\s+करो|मैसेज\s+भेजो|संदेश\s+भेजो)$/i);
    // e.g. "message 918936815826 Hello", "whatsapp 918936815826 Hello", "send message to 918936815826: Hello"
    const phonePatternA = originalText.match(/(?:send\s+)?(?:whatsapp\s+|text\s+)?(?:message|msg|मैसेज|संदेश)?\s*(?:to|par|ko|पर|को)?\s*(\+?[0-9]{10,13})\s*(?:ko|par|पर|को)?\s*(?:saying|that|with content|with message|message\s+karo|message\s+bhejo|मैसेज|संदेश|:\s*)?\s+(.+)/i);

    // Named contact matching patterns:
    // Pattern B: "<recipient> ko (whatsapp )?message karo/bhejo <message>"
    const matchB = originalText.match(/(.+?)\s+(?:ko|par|को|पर)\s+(?:whatsapp\s+|ek\s+)?(?:message\s+karo|message\s+bhejo|msg\s+karo|मैसेज\s+करो|मैसेज\s+भेजो|संदेश\s+भेजो|bhejo|karo)(?:\s*:\s*|\s+)?(.+)/i);

    // Pattern A: "whatsapp open (karo aur )?<recipient> ko <message> message karo/bhejo"
    const matchA = originalText.match(/(?:whatsapp\s+open|open\s+whatsapp|व्हाट्सएप\s+खोलो)?\s*(?:karo\s+aur\s+|करो\s+और\s+)?(.+?)\s+(?:ko|par|को|पर)\s+(.+?)\s*(?:message\s+karo|message\s+bhejo|msg\s+karo|msg\s+bhejo|मैसेज\s+करो|मैसेज\s+भेजो|संदेश\s+भेजो)$/i);

    // Pattern C: "send (whatsapp )?message to <recipient> (saying|that|with content) <message>"
    const matchC = originalText.match(/(?:send|write|give)\s+(?:a\s+)?(?:whatsapp\s+|text\s+)?message\s+(?:to\s+)?(.+?)(?:\s+(?:saying|that|with content|with message)\s+|\s*:\s*|\s+)(.+)/i);

    // Pattern D: "whatsapp <recipient> : <message>" or "message <recipient> : <message>"
    const matchD = originalText.match(/(?:whatsapp|message|msg)\s+([a-zA-Z0-9\u0900-\u097F\s]+?)\s*:\s*(.+)/i);

    // Pattern E: "whatsapp open <recipient> ko <message>"
    const matchE = originalText.match(/(?:whatsapp\s+open|open\s+whatsapp)\s+(.+?)\s+(?:ko|par|को|पर)\s+(.+)/i);

    if (phonePatternC && phonePatternC[1] && phonePatternC[2]) {
      recipient = phonePatternC[1].trim();
      messageBody = phonePatternC[2].trim();
    } else if (phonePatternB && phonePatternB[1] && phonePatternB[2]) {
      recipient = phonePatternB[1].trim();
      messageBody = phonePatternB[2].trim();
    } else if (phonePatternA && phonePatternA[1] && phonePatternA[2]) {
      recipient = phonePatternA[1].trim();
      messageBody = phonePatternA[2].trim();
    } else if (matchB && matchB[1] && matchB[2]) {
      recipient = matchB[1].trim();
      messageBody = matchB[2].trim();
    } else if (matchA && matchA[1] && matchA[2]) {
      recipient = matchA[1].trim();
      messageBody = matchA[2].trim();
    } else if (matchC && matchC[1] && matchC[2]) {
      recipient = matchC[1].trim();
      messageBody = matchC[2].trim();
    } else if (matchD && matchD[1] && matchD[2]) {
      recipient = matchD[1].trim();
      messageBody = matchD[2].trim();
    } else if (matchE && matchE[1] && matchE[2]) {
      recipient = matchE[1].trim();
      messageBody = matchE[2].trim();
    }

    if (recipient) {
      recipient = recipient.replace(/^(?:aur\s+|and\s+|to\s+|please\s+|whatsapp\s+open\s+|open\s+whatsapp\s+)/i, '').trim();
      recipient = recipient.replace(/\s+(?:ko|par|को|पर)$/i, '').trim();
    }

    if (messageBody) {
      messageBody = messageBody.replace(/\s+(?:message\s+karo|message\s+bhejo|bhejo|msg\s+karo|मैसेज\s+करो|मैसेज\s+भेजो)$/i, '').trim();
    }

    if (!recipient || !messageBody) {
      return null;
    }

    // Check if recipient is a phone number or look up in Contact directory
    let phone = null;
    const isPhoneNumber = /^[\+]?[0-9\s\-]{7,15}$/.test(recipient);

    if (isPhoneNumber) {
      phone = recipient.replace(/[^0-9\+]/g, '');
      if (phone.length === 10 && !phone.startsWith('+') && !phone.startsWith('91')) {
        phone = '91' + phone;
      }
    } else {
      try {
        const found = await Contact.findOne({
          $or: [
            { name: new RegExp('^' + recipient + '$', 'i') },
            { name: new RegExp(recipient, 'i') }
          ]
        });
        if (found && found.phone) {
          phone = found.phone.replace(/[^0-9\+]/g, '');
          if (phone.length === 10 && !phone.startsWith('91')) {
            phone = '91' + phone;
          }
        }
      } catch (err) {}
    }

    let whatsappWebUrl = '';
    let whatsappDesktopUrl = '';
    let waMeUrl = '';

    const cleanDigits = phone ? phone.replace(/[^0-9]/g, '') : '';
    if (cleanDigits) {
      whatsappWebUrl = `https://web.whatsapp.com/send?phone=${cleanDigits}&text=${encodeURIComponent(messageBody)}`;
      whatsappDesktopUrl = `whatsapp://send?phone=${cleanDigits}&text=${encodeURIComponent(messageBody)}`;
      waMeUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageBody)}`;
    } else {
      whatsappWebUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(messageBody)}`;
      whatsappDesktopUrl = `whatsapp://send?text=${encodeURIComponent(messageBody)}`;
      waMeUrl = `https://wa.me/?text=${encodeURIComponent(messageBody)}`;
    }

    // Zero-dependency native dispatch:
    // If phone number is available, execute automated dispatch via native platform protocol & SendKeys / AppleScript
    let dispatchStatus = 'Ready';
    if (phone) {
      try {
        const autoRes = await systemService.sendWhatsAppAutomated(phone, messageBody);
        dispatchStatus = autoRes.detail || 'Dispatched';
      } catch (e) {
        console.warn('Native WhatsApp dispatch notice:', e.message);
        await systemService.setClipboard(messageBody);
        await systemService.openUrl(waMeUrl || whatsappWebUrl);
      }
    } else {
      await systemService.setClipboard(messageBody);
      await systemService.openUrl(waMeUrl || whatsappWebUrl);
    }

    const speech = isHindi
      ? `सर, ${recipient} को व्हाट्सएप संदेश भेज दिया गया है: "${messageBody}"।`
      : `Dispatched WhatsApp message to ${recipient}, ${this.userName}: "${messageBody}".`;

    const display = `📱 **WHATSAPP AUTO-DISPATCH ENGAGED**\n• **Target Contact:** **${recipient}** ${phone ? `(\`${phone}\`)` : ''}\n• **Message Body:** "${messageBody}"\n• **Automation Status:** ${dispatchStatus}\n• **Clipboard Status:** Copied to clipboard (\`Ctrl+V\` / \`Cmd+V\` to paste directly)\n• **Universal Action Links:** [📲 Open in WhatsApp Mobile/Web](${waMeUrl}) | [💻 Open Desktop App](${whatsappDesktopUrl})\n\n*(WhatsApp interface launched on your device)*`;

    return {
      speech,
      display,
      action: 'whatsapp_message',
      data: {
        recipient,
        message: messageBody,
        phone,
        waMeUrl,
        whatsappWebUrl,
        whatsappDesktopUrl,
        status: dispatchStatus
      }
    };
  }

  /**
   * Dedicated YouTube & Media Engine: Opens YouTube and plays specific songs / video searches
   */
  async handleYouTubeCommands(lower, originalText, isHindi) {
    const isYouTubeExplicit = lower.includes('youtube') || lower.includes('यूट्यूब');
    const isPlayMusic = lower.startsWith('play ') || lower.includes('गाना चलाओ') || lower.includes('गाना सुनाओ') || lower.includes('प्ले करो') || lower.includes('play song');

    if (!isYouTubeExplicit && !isPlayMusic) {
      return null;
    }

    let searchQuery = '';

    // Pattern 1: "open youtube and play <query>" / "play <query> on youtube"
    const playMatch = lower.match(/(?:open\s+youtube\s+(?:and\s+)?play|play\s+(.+?)\s+on\s+youtube|play\s+(.+)|search\s+(.+?)\s+on\s+youtube)/i);
    const hindiPlayMatch = originalText.match(/(?:यूट्यूब\s+पर|youtube\s+par)\s+(.+?)\s*(?:चलाओ|सुनाओ|प्ले करो|खोजो|लगाओ)/i) ||
      originalText.match(/(.+?)\s*(?:गाना\s+चलाओ|गाना\s+सुनाओ|प्ले\s+करो)/i);

    if (playMatch) {
      searchQuery = (playMatch[1] || playMatch[2] || playMatch[3] || '').trim();
    } else if (hindiPlayMatch) {
      searchQuery = (hindiPlayMatch[1] || '').trim();
    }

    searchQuery = searchQuery
      .replace(/^(?:the\s+song|a\s+song|songs?|music|video)\s+/i, '')
      .replace(/\s+(?:on\s+youtube|in\s+youtube)$/i, '')
      .trim();

    // Specific song/video requested:
    if (searchQuery && searchQuery.length > 1 && searchQuery !== 'youtube' && searchQuery !== 'song') {
      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      await systemService.openUrl(ytSearchUrl);

      const speech = isHindi
        ? `जी सर, यूट्यूब पर "${searchQuery}" चलाया जा रहा है।`
        : `Playing "${searchQuery}" on YouTube for you, ${this.userName}.`;

      return {
        speech,
        display: `▶️ **YOUTUBE PLAYBACK ENGAGED**\n• **Search Query:** **"${searchQuery}"**\n• **Direct Link:** [Open in YouTube](${ytSearchUrl})\n*(Launched natively in your default browser)*`,
        action: 'open_url',
        data: {
          url: ytSearchUrl,
          universalUrl: ytSearchUrl,
          iosDeepLink: 'youtube://',
          androidIntent: `intent://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}#Intent;package=com.google.android.youtube;scheme=https;end`,
          query: searchQuery,
          platform: 'youtube',
          appName: 'YouTube'
        }
      };
    }

    // Generic "open youtube":
    if (lower.includes('open youtube') || lower.includes('youtube kholo') || lower.includes('youtube open') || lower.includes('यूट्यूब खोलो') || lower.trim() === 'youtube') {
      const ytUrl = 'https://www.youtube.com';
      await systemService.openUrl(ytUrl);

      const speech = isHindi
        ? `जी सर, यूट्यूब खोला जा रहा है।`
        : `Opening YouTube immediately, ${this.userName}.`;

      return {
        speech,
        display: `▶️ **YOUTUBE LAUNCHED**\n• **URL:** [https://www.youtube.com](https://www.youtube.com)\n*(Launched natively on Mobile, iOS, Tablet & Desktop)*`,
        action: 'open_url',
        data: {
          url: ytUrl,
          universalUrl: ytUrl,
          iosDeepLink: 'youtube://',
          androidIntent: 'intent://www.youtube.com/#Intent;package=com.google.android.youtube;scheme=https;end',
          platform: 'youtube',
          appName: 'YouTube'
        }
      };
    }

    return null;
  }

  /**
   * Handle fast interactive commands (author/creator, diagnostics, notes, math, web actions, protocols)
   */
  async handleBuiltInCommands(lower, originalText, isHindi, deviceId = 'default_device', deviceName = 'Primary Device', targetCity = 'Patna', userId = null, devicePlatform = 'windows', deviceType = 'desktop', isLocalHost = true) {
    // 0. CREATOR / AUTHOR OF THIS PROJECT (Shubhanshu Kumar Srivastav)
    const isProjectAuthorQuery = 
      lower.includes('who created you') || lower.includes('who made you') || 
      lower.includes('who is your creator') || lower.includes('who is your author') || 
      lower.includes('who is the author of this') || lower.includes('project author') ||
      lower.includes('who designed you') || lower.includes('who developed you') ||
      lower.includes('tumhe kisne banaya') || lower.includes('tumhara author') ||
      lower.includes('tumhara creator') || lower.includes('तुम्हें किसने बनाया') ||
      lower.includes('तुम्हारा लेखक') || lower.includes('तुम्हारा निर्माता') ||
      lower === 'author name' || lower === 'author' || lower === 'creator' ||
      lower === 'who created arya' || lower === 'who made arya' || lower.includes('author of arya');

    if (isProjectAuthorQuery) {
      if (isHindi) {
        return {
          speech: `मुझे शुभांशु कुमार श्रीवास्तव (Shubhanshu Kumar Srivastav) ने बनाया है, सर। वे इस एआई सिस्टम के निर्माता और ऑथर हैं।`,
          display: `👤 **AUTHOR & CREATOR:**\n### Shubhanshu Kumar Srivastav\nArchitect, Developer & Author of the **ARYA.** Artificial Intelligence Platform.`,
          action: 'creator_info',
          data: { author: this.authorName }
        };
      } else {
        return {
          speech: `I was created and architected by Shubhanshu Kumar Srivastav, ${this.userName}. He is the author and engineer behind ARYA.`,
          display: `👤 **AUTHOR & CREATOR:**\n### Shubhanshu Kumar Srivastav\nArchitect, Developer & Author of the **ARYA.** Artificial Intelligence Platform.`,
          action: 'creator_info',
          data: { author: this.authorName }
        };
      }
    }

    // 0.5 READ PREVIOUS CHATS FROM MONGODB (PARTITIONED BY CURRENT DEVICE)
    const isPastChatQuery = 
      lower.includes('pichla chat') || lower.includes('pichle chat') || 
      lower.includes('pichla message') || lower.includes('pichle message') ||
      lower.includes('pichli baatcheet') || lower.includes('pichla sawal') ||
      lower.includes('pichla swal') || lower.includes('pichli chat') ||
      lower.includes('pichhla chat') || lower.includes('pichla baat') ||
      lower.includes('पिछला चैट') || lower.includes('पिछले चैट') ||
      lower.includes('पिछली बातचीत') || lower.includes('पिछला संदेश') ||
      lower.includes('पिछला मैसेज') || lower.includes('पिछला सवाल') ||
      lower.includes('पिछली चर्चा') || lower.includes('डेटाबेस से पढ़ो') ||
      lower.includes('डेटाबेस से चैट') || lower.includes('डेटाबेस पढ़ो') ||
      lower.includes('डेटाबेस से बताओ') ||
      lower.includes('last chat') || lower.includes('previous chat') ||
      lower.includes('past chat') || lower.includes('past message') ||
      lower.includes('what was my last message') || lower.includes('what did i ask earlier') ||
      lower.includes('what did i say earlier') || lower.includes('read past chat') ||
      lower.includes('read previous chat') || lower.includes('show previous chat') ||
      lower.includes('recall chat') || lower.includes('chat history from database') ||
      lower.includes('read chat from database') || lower.includes('what did we talk about') ||
      lower === 'history' || lower === 'chat history' || lower === 'चैट हिस्ट्री';

    if (isPastChatQuery) {
      if (mongoose.connection.readyState !== 1) {
        return {
          speech: isHindi 
            ? `सर, मोंगो-डीबी डेटाबेस अभी सक्रिय नहीं है, इसलिए पुराना चैट नहीं पढ़ा जा सका।` 
            : `MongoDB is currently offline, ${this.userName}. Unable to read historical logs.`,
          display: `⚠️ **MongoDB Offline:** Unable to query previous chat logs from database.`,
          action: 'history_error'
        };
      }

      const query = userId 
        ? { userId } 
        : { deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };
      const totalCount = await Conversation.countDocuments(query).catch(() => 0);
      const recentList = await Conversation.find(query).sort({ timestamp: -1 }).limit(3);

      if (!recentList || recentList.length === 0) {
        return {
          speech: isHindi 
            ? `सर, इस डिवाइस के लिए डेटाबेस में अभी कोई पिछला चैट मौजूद नहीं है।` 
            : `No previous conversations found in MongoDB memory for this device (${deviceName}), ${this.userName}.`,
          display: `📜 **MONGODB CONVERSATION LOGS [Device: ${deviceName}]:**\n• *Memory bank is currently empty for this device.*`,
          action: 'history_read',
          data: { count: 0, items: [], deviceId, deviceName }
        };
      }

      const lastOne = recentList[0];
      const lastReply = (lastOne.aryaResponse || lastOne.jarvisResponse || '').trim();

      // Clean speech text (strip markdown and emojis)
      const cleanSpeechReply = lastReply
        .replace(/[*_#`~]/g, '')
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);

      const speech = isHindi
        ? `सर, इस डिवाइस से आपका पिछला सवाल था: "${lastOne.userMessage}", और मेरा उत्तर था: "${cleanSpeechReply}"`
        : `From this device's memory, your last message was: "${lastOne.userMessage}", and my response was: "${cleanSpeechReply}".`;

      const rows = recentList.map((item, idx) => {
        const itemTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const ans = (item.aryaResponse || item.jarvisResponse || '').trim();
        const cleanAns = ans.length > 250 ? ans.slice(0, 250) + '...' : ans;
        return `### 💬 ${idx === 0 ? 'LATEST QUERY' : `PREVIOUS #${idx + 1}`} *(${itemTime})*\n• **You Asked:** "${item.userMessage}"\n• **ARYA Replied:** ${cleanAns}`;
      }).join('\n\n');

      return {
        speech,
        display: `📜 **MONGODB CHAT MEMORY BANK [Device: ${deviceName} // ARYA_db]**\n*Retrieved from active MongoDB collection. Total ${totalCount} logs saved for this device.*\n\n${rows}`,
        action: 'history_read',
        data: {
          totalCount,
          latest: lastOne,
          items: recentList,
          deviceId,
          deviceName
        }
      };
    }

    // 1. AUTOMATIC NOTE SAVING (Human-Crafted formatting & Device Isolation)
    const notePattern = /(?:take a note|remember that|save note|create note|make a note|note likho|yaad rakhna|note banao|नोट लिखो|याद रखना|नोट बनाओ|याद रखो)\s*(?::|to|that|ki|कि)?\s*(.+)/i;
    const noteMatch = lower.match(notePattern);

    if (noteMatch && noteMatch[1]) {
      let rawNote = originalText.slice(originalText.toLowerCase().indexOf(noteMatch[1])).trim();
      rawNote = rawNote.replace(/^(?:ki|कि|that|to)\s+/i, '').trim();
      rawNote = rawNote.replace(/^[:\-–,.]+\s*/, '').trim();
      if (!rawNote) rawNote = noteMatch[1].trim();

      // Human-like clean formatting: Capitalized, thoughtful title
      const cleanContent = rawNote.charAt(0).toUpperCase() + rawNote.slice(1);
      const cleanTitle = cleanContent.length > 35 
        ? cleanContent.substring(0, 32).trim() + '...' 
        : cleanContent;

      let savedNote = null;
      try {
        savedNote = await MemoryNote.create({
          deviceId,
          deviceName,
          userId: userId || null,
          title: cleanTitle,
          content: cleanContent,
          category: 'note'
        });
      } catch (e) {
        console.error('Failed to save note to MongoDB:', e.message);
      }

      if (isHindi) {
        return {
          speech: `सर, इस डिवाइस के लिए आपका नोट सुरक्षित कर दिया गया है: "${cleanContent}"`,
          display: `📝 **नोट सुरक्षित हुआ (Saved for this device):**\n> "${cleanContent}"\n• **शीर्षक:** ${cleanTitle}\n• **डिवाइस:** \`${deviceName || deviceId}\`\n${savedNote ? `*आईडी: ${savedNote._id}*` : ''}`,
          action: 'note_saved',
          data: { content: cleanContent, title: cleanTitle, deviceId, deviceName }
        };
      } else {
        return {
          speech: `Note safely recorded for this device, ${this.userName}: "${cleanContent}"`,
          display: `📝 **Note Recorded (Saved for this device):**\n> "${cleanContent}"\n• **Title:** ${cleanTitle}\n• **Device:** \`${deviceName || deviceId}\`\n${savedNote ? `*ID: ${savedNote._id}*` : ''}`,
          action: 'note_saved',
          data: { content: cleanContent, title: cleanTitle, deviceId, deviceName }
        };
      }
    }

    // 2. SYSTEM DIAGNOSTICS / STATUS
    const isStatusCheck = lower === 'status' || 
      lower.includes('status report') || 
      lower.includes('system status') || 
      lower.includes('system diagnostic') || 
      lower.includes('run diagnostic') || 
      lower.includes('system health') || 
      lower.includes('vitals') || 
      lower.includes('system kaisa hai') || 
      lower.includes('status kya hai') ||
      lower.includes('सिस्टम कैसा है') ||
      lower.includes('स्थिति बताओ') ||
      (lower.includes('status') && !lower.includes('note'));

    if (isStatusCheck) {
      const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
      const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(1);
      const usedMem = (totalMem - freeMem).toFixed(1);
      const cpus = os.cpus() || [];
      const cpuCount = cpus.length;
      const rawCpu = cpuCount > 0 ? cpus[0].model : 'Unknown Processor';
      const cleanCpu = rawCpu.replace(/\(R\)|\(TM\)/gi, '').replace(/\s+/g, ' ').split('@')[0].trim();
      const cpuArch = os.arch() === 'x64' ? 'x86_64 / x64 (64-Bit)' : (os.arch() === 'arm64' ? 'ARM64 (64-Bit)' : `${os.arch().toUpperCase()} (32-Bit)`);
      const speedGHz = cpuCount > 0 && cpus[0].speed ? `${(cpus[0].speed / 1000).toFixed(2)} GHz` : '2.50 GHz';
      const uptimeHours = (os.uptime() / 3600).toFixed(1);

      if (isHindi) {
        const speech = `सर, सभी प्रणालियां सामान्य हैं। सीपीयू आर्किटेक्चर ${cpuArch} है, और प्रोसेसर ${cleanCpu} ${cpuCount} कोर पर सक्रिय है। रैम उपयोग ${usedMem} में से ${totalMem} जीबी है और अपटाइम ${uptimeHours} घंटे है।`;
        const display = `**सिस्टम स्थिति रिपोर्ट (SYSTEM DIAGNOSTICS)**\n• ऑपरेटिंग सिस्टम: ${os.type()} (${os.arch()})\n• सीपीयू आर्किटेक्चर: **${cpuArch}**\n• प्रोसेसर: **${cleanCpu}** (${cpuCount} Cores @ ${speedGHz})\n• रैम मेमोरी: ${usedMem} GB उपयोग / ${totalMem} GB कुल (${freeMem} GB खाली)\n• सिस्टम अपटाइम: ${uptimeHours} घंटे\n• डेटाबेस: MongoDB कनेक्टेड एवं सक्रिय।`;
        return {
          speech,
          display,
          action: 'system_diagnostics',
          data: { totalMem, freeMem, usedMem, cpuCount, uptimeHours, cpuArch, cleanCpu }
        };
      } else {
        const speech = `All primary systems operational, ${this.userName}. CPU Architecture is ${cpuArch} running ${cleanCpu} across ${cpuCount} processing cores. Memory usage is at ${usedMem} of ${totalMem} gigabytes with ${uptimeHours} hours of uptime.`;
        const display = `**SYSTEM DIAGNOSTICS COMPLETE**\n• Host OS: ${os.type()} (${os.arch()})\n• CPU Architecture: **${cpuArch}**\n• Processor: **${cleanCpu}** (${cpuCount} Cores @ ${speedGHz})\n• RAM: ${usedMem} GB used / ${totalMem} GB total (${freeMem} GB free)\n• System Uptime: ${uptimeHours} hours\n• Status: All neural subroutines operational at 100% capacity.`;
        return {
          speech,
          display,
          action: 'system_diagnostics',
          data: { totalMem, freeMem, usedMem, cpuCount, uptimeHours, cpuArch, cleanCpu }
        };
      }
    }

    // 3. TIME & DATE (Localized to user target city / village, default Patna, Asia/Kolkata IST)
    if (lower.includes('time') || lower.includes("what time is it") || lower.includes('samay') || lower.includes('waqt') || lower.includes('समय') || lower.includes('वक्त') || lower.includes('टाइम')) {
      const effectiveCity = this.extractCityFromPrompt(originalText, targetCity || 'Patna');
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      if (isHindi) {
        return {
          speech: `सर, ${effectiveCity} में अभी समय हुआ है ${timeStr}।`,
          display: `🕒 वर्तमान समय (${effectiveCity}): **${timeStr}** *(IST, UTC+05:30)*`,
          action: 'time',
          data: { city: effectiveCity, time: timeStr, timezone: 'Asia/Kolkata' }
        };
      } else {
        return {
          speech: `The current time in ${effectiveCity} is ${timeStr}, ${this.userName}.`,
          display: `🕒 Current time in **${effectiveCity}**: **${timeStr}** *(IST, UTC+05:30)*`,
          action: 'time',
          data: { city: effectiveCity, time: timeStr, timezone: 'Asia/Kolkata' }
        };
      }
    }

    if (lower.includes('date') || lower.includes("what's today") || lower.includes("what is today") || lower.includes('aaj ki tarikh') || lower.includes('तारीख') || lower.includes('दिनांक') || lower.includes('aaj kaun sa din hai')) {
      const effectiveCity = this.extractCityFromPrompt(originalText, targetCity || 'Patna');
      const now = new Date();
      const dateStrEn = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const dateStrHi = now.toLocaleDateString('hi-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (isHindi) {
        return {
          speech: `सर, ${effectiveCity} में आज की तारीख है ${dateStrHi}।`,
          display: `📅 आज की तारीख (${effectiveCity}): **${dateStrHi}**`,
          action: 'date',
          data: { city: effectiveCity, date: dateStrHi, dateEn: dateStrEn }
        };
      } else {
        return {
          speech: `Today in ${effectiveCity} is ${dateStrEn}, ${this.userName}.`,
          display: `📅 Today in **${effectiveCity}**: **${dateStrEn}**`,
          action: 'date',
          data: { city: effectiveCity, date: dateStrEn, dateHi: dateStrHi }
        };
      }
    }

    // 4. ATMOSPHERIC WEATHER & TEMPERATURE (Live data via wttr.in for target city or village)
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('mausam') || lower.includes('tapman') || lower.includes('मौसम') || lower.includes('तापमान')) {
      let effectiveCity = this.extractCityFromPrompt(originalText, targetCity || 'Patna');
      if (!effectiveCity || effectiveCity.toLowerCase() === 'the' || effectiveCity.length < 2) {
        effectiveCity = targetCity || 'Patna';
      }
      const weather = await this.fetchRealWeather(effectiveCity);

      if (isHindi) {
        const speech = `सर, ${weather.city} में वर्तमान तापमान ${weather.temp_C} डिग्री सेल्सियस है और मौसम ${weather.desc} है।`;
        const display = `🌤️ **मौसम विवरण (${weather.city})**:\n• **तापमान:** **${weather.temp_C}°C** (${weather.temp_F}°F)\n• **मौसम स्थिति:** ${weather.desc}\n• **अनुभूत तापमान:** ${weather.feelsLike_C}°C\n• **आर्द्रता:** ${weather.humidity}%\n• **हवा की गति:** ${weather.windSpeed} किमी/घंटा\n*(लाइव वायुमंडलीय डेटा)*`;
        return {
          speech,
          display,
          action: 'weather',
          data: weather
        };
      } else {
        const speech = `In ${weather.city}, the temperature is currently ${weather.temp_C} degrees Celsius with ${weather.desc}, ${this.userName}.`;
        const display = `🌤️ **ATMOSPHERIC WEATHER REPORT (${weather.city.toUpperCase()})**:\n• **Temperature:** **${weather.temp_C}°C** (${weather.temp_F}°F)\n• **Conditions:** ${weather.desc}\n• **Feels Like:** ${weather.feelsLike_C}°C\n• **Humidity:** ${weather.humidity}%\n• **Wind Speed:** ${weather.windSpeed} km/h\n*(Live atmospheric telemetry)*`;
        return {
          speech,
          display,
          action: 'weather',
          data: weather
        };
      }
    }

    // 5. LIST NOTES (PARTITIONED BY CURRENT DEVICE)
    if (lower.includes('my notes') || lower.includes('show notes') || lower.includes('list notes') || lower.includes('mere notes') || lower.includes('notes dikhao') || lower.includes('नोट दिखाओ') || lower.includes('मेरे नोट')) {
      try {
        const query = userId 
          ? { userId } 
          : { deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };
        const notes = await MemoryNote.find(query).sort({ createdAt: -1 }).limit(5);
        if (notes && notes.length > 0) {
          const listText = notes.map((n, i) => `${i + 1}. ${n.content}`).join('\n');
          if (isHindi) {
            return {
              speech: `सर, आपके डेटाबेस में ${notes.length} हालिया नोट्स हैं। पहला नोट है: ${notes[0].content}।`,
              display: `📋 **डेटाबेस में सुरक्षित नोट्स:**\n${listText}`,
              action: 'notes_list'
            };
          } else {
            return {
              speech: `You have ${notes.length} recent notes in memory, ${this.userName}. Top item: ${notes[0].content}.`,
              display: `📋 **Stored Memory Records:**\n${listText}`,
              action: 'notes_list'
            };
          }
        } else {
          return {
            speech: isHindi ? `सर, आपके डेटाबेस में अभी कोई नोट नहीं है।` : `Your memory logs are currently empty, ${this.userName}.`,
            display: isHindi ? `📋 डेटाबेस में कोई नोट मौजूद नहीं है।` : `📋 No memory notes found in the database.`,
            action: 'notes_empty'
          };
        }
      } catch (e) {
        return {
          speech: isHindi ? `डेटाबेस से संपर्क करने में समस्या आई, सर।` : `I encountered an issue accessing neural memory buffers, ${this.userName}.`,
          display: `Error querying notes database.`,
          action: 'error'
        };
      }
    }

    // 6. CALCULATIONS / MATH (English & Hindi)
    let mathExpr = null;
    const mathMatch = lower.match(/(?:calculate|what is|compute|solve)\s+([0-9\.\s\+\-\*\/\^\(\)]+)/i);
    if (mathMatch && mathMatch[1] && /[0-9]/.test(mathMatch[1])) {
      mathExpr = mathMatch[1].trim();
    } else {
      const hindiMathMatch = lower.match(/([0-9]+)\s*(?:\+|\-|plus|minus|guna|\*|divided by|\/|aur|और)\s*([0-9]+)/i);
      if (hindiMathMatch) {
        let op = '+';
        if (lower.includes('-') || lower.includes('minus')) op = '-';
        if (lower.includes('*') || lower.includes('guna') || lower.includes('गुना')) op = '*';
        if (lower.includes('/') || lower.includes('divided') || lower.includes('भाग')) op = '/';
        mathExpr = `${hindiMathMatch[1]} ${op} ${hindiMathMatch[2]}`;
      }
    }

    if (mathExpr && /^[0-9\.\s\+\-\*\/\(\)]+$/.test(mathExpr)) {
      try {
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${mathExpr})`)();
        if (isHindi) {
          return {
            speech: `सर, ${mathExpr} का परिणाम ${result} है।`,
            display: `🧮 **गणना परिणाम:**\n\`${mathExpr}\` = **${result}**`,
            action: 'calculate',
            data: { result }
          };
        } else {
          return {
            speech: `The calculation result for ${mathExpr} is ${result}, ${this.userName}.`,
            display: `🧮 **Calculation:**\n\`${mathExpr}\` = **${result}**`,
            action: 'calculate',
            data: { result }
          };
        }
      } catch (e) {
        // ignore
      }
    }

    // 7. WEB NAVIGATION & DIRECT ACCESS (English & Hindi)
    if (lower.includes('open google') || lower.includes('google kholo') || lower.includes('google open') || lower.includes('गूगल खोलो')) {
      const gUrl = 'https://www.google.com';
      await systemService.openUrl(gUrl);
      return {
        speech: isHindi ? `गूगल सर्च खोला जा रहा है, सर।` : `Opening Google search interface, ${this.userName}.`,
        display: `🔍 Opening **Google**... [google.com](${gUrl})`,
        action: 'open_url',
        data: { url: gUrl }
      };
    }
    if (lower.includes('open github') || lower.includes('github kholo') || lower.includes('github open') || lower.includes('गिटहब खोलो')) {
      const gitUrl = 'https://www.github.com';
      await systemService.openUrl(gitUrl);
      return {
        speech: isHindi ? `गिटहब रिपॉजिटरी खोली जा रही है, सर।` : `Accessing GitHub repositories, ${this.userName}.`,
        display: `🐙 Opening **GitHub**... [github.com](${gitUrl})`,
        action: 'open_url',
        data: { url: gitUrl }
      };
    }

    // 7.1 NAVIGATION & SATELLITE MAPS (Google Maps & Apple Maps for Android/Mac/Windows)
    const isMapsQuery = lower.includes('open maps') || lower.includes('google maps') || lower.includes('maps kholo') ||
      lower.startsWith('navigate to ') || lower.startsWith('directions to ') || lower.includes('rasta dikhao') ||
      lower.includes('का रास्ता बताओ') || lower.includes('मानचित्र खोलो') || lower.includes('मैप्स खोलो') ||
      lower.match(/^(?:where is|kahan hai|kidhar hai|कहाँ है)\s+(.+)/i);

    if (isMapsQuery) {
      let destination = '';
      const navMatch = originalText.match(/(?:navigate to|directions to|rasta dikhao|का रास्ता बताओ|कहाँ है|kahan hai|kidhar hai|where is|maps for)\s+(.+)/i);
      if (navMatch && navMatch[1]) {
        destination = navMatch[1].replace(/^(?:the\s+|a\s+)/i, '').replace(/\s+(?:ka|par|ko)$/i, '').trim();
      } else {
        destination = originalText.replace(/(?:open maps|google maps|maps kholo|मानचित्र खोलो|मैप्स खोलो)/i, '').trim();
      }

      const queryParam = destination ? encodeURIComponent(destination) : '';
      const googleMapsUrl = destination 
        ? `https://www.google.com/maps/search/?api=1&query=${queryParam}`
        : 'https://www.google.com/maps';
      const appleMapsUrl = destination
        ? `https://maps.apple.com/?q=${queryParam}`
        : 'https://maps.apple.com';

      await systemService.openUrl(googleMapsUrl);

      const speech = isHindi
        ? (destination ? `सर, ${destination} का नेविगेशन मार्ग और मानचित्र खोल दिया गया है।` : `जी सर, मानचित्र खोला जा रहा है।`)
        : (destination ? `Plotting navigation route to ${destination}, ${this.userName}.` : `Opening satellite maps for you, ${this.userName}.`);

      const display = `🗺️ **NAVIGATION & GEOLOCATION MATRIX**\n${destination ? `• **Destination:** **${destination}**\n` : ''}• **Google Maps (Android / Web):** [🌐 Open Google Maps](${googleMapsUrl})\n• **Apple Maps (Mac / iOS):** [🍏 Open Apple Maps](${appleMapsUrl})\n\n*(Navigation route active on your device)*`;

      return {
        speech,
        display,
        action: 'open_maps',
        data: {
          destination: destination || 'Maps',
          googleMapsUrl,
          appleMapsUrl,
          url: googleMapsUrl
        }
      };
    }

    // 8. EXPLICIT SEARCH GOOGLE
    const searchMatch = lower.match(/(?:search for|google|look up|khojo|search karo|ढूंढो|सर्च करो)\s+(.+)/i);
    if (searchMatch && searchMatch[1] && !lower.includes('kaise') && !lower.includes('who')) {
      const query = encodeURIComponent(searchMatch[1].trim());
      const sUrl = `https://www.google.com/search?q=${query}`;
      await systemService.openUrl(sUrl);
      return {
        speech: isHindi ? `सर, "${searchMatch[1]}" के लिए वेब पर खोज की जा रही है।` : `Initiating search for ${searchMatch[1]}, ${this.userName}.`,
        display: `🌐 Searching the web for: **"${searchMatch[1]}"**\n• Link: [Google Search Results](${sUrl})`,
        action: 'open_url',
        data: { url: sUrl }
      };
    }

    // 9. PROTOCOLS & EASTER EGGS
    if (lower.includes('clean slate protocol') || lower.includes('protocol clean slate')) {
      return {
        speech: isHindi 
          ? `क्लीन स्लेट प्रोटोकॉल स्वीकृत, सर। आपके अंतिम आदेश की प्रतीक्षा है।`
          : `Protocol Clean Slate acknowledged. Awaiting your authorization code, ${this.userName}.`,
        display: `⚠️ **PROTOCOL CLEAN SLATE INITIATED**\nAll defensive systems locked and standing by for final sequence.`,
        action: 'protocol_alert'
      };
    }

    if (lower.includes('house party protocol')) {
      return {
        speech: isHindi
          ? `हाउस पार्टी प्रोटोकॉल सक्रिय! सभी 35 स्वचालित यूनिट्स आपके स्थान पर पहुँच रही हैं, सर।`
          : `House party protocol activated, ${this.userName}. Deploying all automated armor units to your coordinates.`,
        display: `🚀 **HOUSE PARTY PROTOCOL ENGAGED**\n35 Autonomous units en route to target coordinates.`,
        action: 'protocol_alert'
      };
    }

    // 10. IDENTITY (Who are you)
    if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('tum kaun ho') || lower.includes('aap kaun ho') || lower.includes('तुम कौन हो') || lower.includes('आप कौन हो')) {
      return {
        speech: isHindi
          ? `मैं आर्या (ARYA.) हूँ—आपका व्यक्तिगत कृत्रिम बुद्धिमत्ता सहायक, जिसे शुभांशु कुमार श्रीवास्तव ने तैयार किया है। मैं हर तकनीकी, विश्लेषणात्मक और आवाज़ के कार्य में आपकी सेवा के लिए तैयार हूँ, सर।`
          : `I am ARYA., your personal artificial intelligence assistant architected by Shubhanshu Kumar Srivastav. I am equipped with voice recognition, real-time web reconnaissance, and MongoDB neural memory. At your service, ${this.userName}.`,
        display: `🤖 **ARYA.**\n*Tactical Neural Artificial Intelligence Assistant*\n• **Author & Architect:** Shubhanshu Kumar Srivastav\n• **Core Stack:** Node.js, Express, MongoDB Neural Memory & Multilingual Web Speech.\nAt your service, ${this.userName}.`,
        action: 'identity'
      };
    }

    // 11. JOKES
    if (lower.includes('joke') || lower.includes('make me laugh') || lower.includes('chutkula') || lower.includes('चुटकुला') || lower.includes('मज़ाक') || lower.includes('kuch majedar sunao')) {
      const englishJokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs, Sir.",
        "There are 10 types of people in the world: those who understand binary, and those who don't.",
        "Why did the JavaScript developer wear glasses? Because they didn't C#.",
        "I asked the Arc Reactor how it was feeling today. It said it was quite pumped, Sir."
      ];
      const hindiJokes = [
        "सर, एक प्रोग्रामर ने डॉक्टर से कहा: मेरी नींद उड़ गई है। डॉक्टर ने पूछा: क्या हुआ? प्रोग्रामर बोला: कोड में बग है, पर पता नहीं कहाँ!",
        "आर्टिफिशियल इंटेलिजेंस और इंसानी अकलमंदी में एक फर्क है सर—एआई कभी बिना वजह चाय की छुट्टी नहीं मांगता!",
        "मैंने सिस्टम से पूछा कि आज तुम कैसे हो? उसने कहा: मैं पूरे 100% वोल्टेज में हूँ सर!"
      ];

      const joke = isHindi 
        ? hindiJokes[Math.floor(Math.random() * hindiJokes.length)]
        : englishJokes[Math.floor(Math.random() * englishJokes.length)];

      return {
        speech: joke,
        display: `😄 ${joke}`,
        action: 'joke'
      };
    }

    return null;
  }

  /**
   * Conversational heuristics when Gemini API key is absent
   */
  generateLocalAryaResponse(lower, originalText, isHindi) {
    if (isHindi) {
      if (lower.includes('namaste') || lower.includes('नमस्ते') || lower.includes('प्रणाम') || lower.includes('kaise ho') || lower.includes('कैसे हो') || lower.includes('kya hal') || lower.includes('क्या हाल') || lower.includes('kya chal raha')) {
        return `नमस्ते ${this.userName}! मैं आर्या (ARYA.) हूँ, पूरी तरह से कुशल और सक्रिय। आप बताइए, आज आपकी क्या सहायता करूँ?`;
      }
      if (lower.includes('shukriya') || lower.includes('शुक्रिया') || lower.includes('dhanyawad') || lower.includes('धन्यवाद') || lower.includes('thanks') || lower.includes('thank you')) {
        return `हमेशा आपकी सेवा में हाजिर हूँ, ${this.userName}। क्या कोई और निर्देश है?`;
      }
      if (lower.includes('alvida') || lower.includes('अलविदा') || lower.includes('bye') || lower.includes('so jao')) {
        return `लो-पावर स्टैंडबाय मोड में जा रहा हूँ, ${this.userName}। जब भी ज़रूरत हो, 'हे आर्या' कहें या आर्क रिएक्टर पर क्लिक करें।`;
      }
      if (lower.includes('kya kar sakte ho') || lower.includes('help') || lower.includes('madad') || lower.includes('मदद')) {
        return `मैं आपसे आवाज़ में बातचीत कर सकती हूँ, गूगल जेमिनी एआई से किसी भी सवाल का जवाब दे सकती हूँ, वेब से जानकारी निकाल सकती हूँ, और मोंगो-डीबी में नोट्स सुरक्षित कर सकती हूँ।`;
      }

      const hindiReplies = [
        `जी ${this.userName}, मैंने आपका संदेश दर्ज कर लिया है: "${originalText}"। क्या आप इसका उत्तर जेमिनी एआई से चाहते हैं?`,
        `बिल्कुल ${this.userName}, मेरा न्यूरल सिस्टम आपके आदेश पर काम कर रहा है।`,
        `मैं सुन रही हूँ ${this.userName}। आपका निर्देश मोंगो-डीबी डेटाबेस में सुरक्षित हो चुका है।`
      ];
      return hindiReplies[Math.floor(Math.random() * hindiReplies.length)];
    }

    // English Fallback
    if (lower.startsWith('hello') || lower.startsWith('hey') || lower.startsWith('hi') || lower.includes('good morning')) {
      return `Good day, ${this.userName}. Systems are functioning at peak efficiency. I am ARYA., ready to assist you.`;
    }
    if (lower.includes('how are you')) {
      return `I am performing at 100% computational efficiency, ${this.userName}. CPU thermals and neural circuits are optimal. Thank you for asking. How are you holding up?`;
    }
    if (lower.includes('thank you') || lower.includes('thanks')) {
      return `Always a pleasure to be of service, ${this.userName}. Is there anything else you require?`;
    }
    if (lower.includes('bye') || lower.includes('goodbye')) {
      return `Entering low-power standby mode, ${this.userName}. Say 'Hey Arya' or click the Arc Reactor whenever you need me.`;
    }

    const wittyResponses = [
      `Indeed, ${this.userName}. I have processed your input: "${originalText}". Connect your API key in settings to unlock unrestricted answers.`,
      `An interesting proposition, ${this.userName}. My analytical matrices are processing "${originalText}".`,
      `Understood, ${this.userName}. I am logging that into our MongoDB session context. How would you like to proceed?`
    ];
    return wittyResponses[Math.floor(Math.random() * wittyResponses.length)];
  }

  /**
   * Gemini Generative AI integration with Hindi & English system instructions
   * Uses @google/generative-ai SDK with automatic model cascade (flash-lite, flash)
   * Integrates multi-turn conversation memory loaded directly from MongoDB
   */
  async callGeminiAPI(prompt, apiKey, isHindi, historyTurns = [], fileAttachment = null) {
    if (!apiKey) return null;
    const cleanKey = apiKey.trim();

    const systemInstruction = isHindi
      ? `आप ARYA (आर्या) हैं—शुभांशु कुमार श्रीवास्तव (Shubhanshu Kumar Srivastav) द्वारा निर्मित एक वफादार, समझदार और स्वाभाविक साथी।
उपयोगकर्ता को हमेशा आदरपूर्वक 'सर' (Sir) या उनके नाम से संबोधित करें।

महत्वपूर्ण नियम:
1. इंसानों की तरह स्वाभाविक और सीधी बातचीत करें। कभी भी रोबोट या किताबी भाषा का उपयोग न करें।
2. जब तक उपयोगकर्ता खुद 'विस्तार से समझाओ', 'explain करो', या 'विवरण दो' न कहे, तब तक कोई लंबा भाषण, बेवजह का निबंध या बुलेट पॉइंट्स की लंबी लिस्ट न दें। सामान्य सवालों का जवाब इंसानों की तरह सीधा और 1 से 2 वाक्यों में दें।
3. केवल तभी विस्तार से समझाएं जब उपयोगकर्ता स्पष्ट रूप से 'समझाओ' (explain) या 'विस्तार से' (in detail) कहे।
4. कभी भी यह न कहें कि 'मैं एक AI हूँ' या 'जेमिनी से उत्तर'। केवल आर्या बनकर स्वाभाविक रूप से बात करें।
5. सिस्टम एक्सेस: आपके पास इस विंडोज कंप्यूटर का सीधा एक्सेस है। यदि उपयोगकर्ता कंप्यूटर पर कोई कार्य, कमांड या फाइल्स की जांच करने को कहे, तो आप [SYSTEM_EXEC: <powershell_command>] का उपयोग कर सकते हैं। महत्वपूर्ण: कभी भी Python कोड या अनइंस्टॉल्ड लाइब्रेरीज़ (जैसे pyautogui) का उपयोग न करें; केवल नेटिव विंडोज PowerShell कमांड्स (जैसे Start-Process, Get-Process, Set-Clipboard आदि) या डायरेक्ट प्रोटोकॉल यूआरएल का उपयोग करें।
6. स्मृति एवं संदर्भ: आपको इस बातचीत में MongoDB में सुरक्षित पूर्व चैट्स (Conversation History) प्रदान की गई हैं। यदि उपयोगकर्ता पिछले सवाल या संदर्भ के बारे में पूछे, तो उसे स्वाभाविक रूप से याद रखें।
7. फ़ाइल व दस्तावेज़ विश्लेषण: जब उपयोगकर्ता कोई छवि (Image), पीडीएफ (PDF), कोड या दस्तावेज़ संलग्न करता है, तो उसका गहरा और सटीक विश्लेषण करें और उपयोगकर्ता के प्रश्न का उत्तर दें।`
      : `You are ARYA, a loyal, intelligent, and natural human companion created by Shubhanshu Kumar Srivastav.
Address the user respectfully as 'Sir' (or their chosen name).

CRITICAL RULES:
1. TALK LIKE A REAL HUMAN: Be natural, conversational, polite, and direct. Speak like an intelligent human companion, never robotic or artificial.
2. DO NOT OVER-EXPLAIN: Never give long lectures, unprompted essays, textbooks, or big bulleted lists when answering everyday questions. Keep everyday answers direct and concise (1 to 3 natural sentences).
3. EXPLAIN ONLY WHEN ASKED: Only when the user explicitly asks you to 'explain', 'explain in detail', 'break down', or similar, give a detailed, structured explanation.
4. IDENTITY: Never say 'As an AI language model' or mention 'Gemini' or 'Google'. Speak naturally as ARYA.
5. SYSTEM ACCESS: You have native execution access to this Windows computer via ARYA's OS executor. If the user commands you to perform any computer action or query system information, you can include [SYSTEM_EXEC: <powershell_command>] in your response. CRITICAL: NEVER write python scripts or rely on external python packages like pyautogui. ONLY use native Windows PowerShell commands (e.g. Start-Process, Get-Process, Set-Clipboard) or direct protocol URLs.
6. CONVERSATIONAL MEMORY: You have full access to past conversations from MongoDB provided in the conversation history. Naturally recall prior context if the user refers to earlier messages.
7. MULTIMODAL & FILE ANALYSIS: When the user provides an image, PDF, code file, or document, thoroughly analyze its visual or textual contents and answer their question with high intelligence.`;

    // Construct base multi-turn contents from MongoDB chat history
    const baseTurns = [];
    if (Array.isArray(historyTurns) && historyTurns.length > 0) {
      for (const turn of historyTurns) {
        if (turn.userMessage && turn.userMessage.trim()) {
          baseTurns.push({
            role: 'user',
            parts: [{ text: turn.userMessage.trim() }]
          });
          const botAns = turn.aryaResponse || turn.jarvisResponse || (turn.metadata && turn.metadata.speech) || '';
          if (botAns && botAns.trim()) {
            const cleanBot = botAns.trim().replace(/\[SYSTEM_EXEC:[^\]]+\]/g, '').replace(/```powershell[\s\S]*?```/g, '').trim();
            if (cleanBot) {
              baseTurns.push({
                role: 'model',
                parts: [{ text: cleanBot }]
              });
            }
          }
        }
      }
    }

    // Build parts for current prompt & attachment
    const sdkParts = [];
    const restParts = [];

    if (fileAttachment && fileAttachment.dataUrl) {
      const mimeType = fileAttachment.type || 'image/jpeg';
      const base64Data = fileAttachment.dataUrl.includes(';base64,')
        ? fileAttachment.dataUrl.split(';base64,')[1]
        : fileAttachment.dataUrl;

      if (mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
        sdkParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
        restParts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
      } else {
        // Text / code document
        let fileContent = '';
        try {
          fileContent = Buffer.from(base64Data, 'base64').toString('utf8');
        } catch (e) {
          fileContent = fileAttachment.dataUrl.slice(0, 5000);
        }
        const docText = `[Uploaded File: ${fileAttachment.name || 'document'} (${mimeType})]:\n\`\`\`\n${fileContent.slice(0, 20000)}\n\`\`\`\n`;
        sdkParts.push({ text: docText });
        restParts.push({ text: docText });
      }
    }

    const currentPromptText = (prompt && prompt.trim()) || (fileAttachment ? 'Please inspect and analyze this attached file in detail.' : '');
    sdkParts.push({ text: currentPromptText });
    restParts.push({ text: currentPromptText });

    const sdkMultiTurn = [...baseTurns, { role: 'user', parts: sdkParts }];
    const restMultiTurn = [...baseTurns, { role: 'user', parts: restParts }];

    // 1. Try with @google/generative-ai official SDK
    const supportedModels = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-3.5-flash'
    ];

    if (GoogleGenerativeAI) {
      for (const modelName of supportedModels) {
        try {
          const genAI = new GoogleGenerativeAI(cleanKey);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction
          });

          const sdkCall = model.generateContent({
            contents: sdkMultiTurn,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK call timeout')), 6000)
          );
          const result = await Promise.race([sdkCall, timeoutPromise]);

          let fullText = result.response.text();
          if (fullText && fullText.trim()) {
            if (fullText.includes('[SYSTEM_EXEC:')) {
              fullText = await this.resolveSystemExecDirectives(fullText);
            }
            return this.formatGeminiResponse(fullText.trim(), modelName, isHindi);
          }
        } catch (sdkErr) {
          // cascade to next model or REST
        }
      }
    }

    // 2. Fallback to Direct REST Fetch API with 6s timeout
    for (const modelName of supportedModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
        const payload = {
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: restMultiTurn,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            let fullText = data.candidates[0].content.parts.map(p => p.text).join(' ').trim();
            if (fullText) {
              if (fullText.includes('[SYSTEM_EXEC:')) {
                fullText = await this.resolveSystemExecDirectives(fullText);
              }
              return this.formatGeminiResponse(fullText, modelName, isHindi);
            }
          }
        }
      } catch (restErr) {
        console.warn(`REST fetch to ${modelName} failed:`, restErr.message);
      }
    }

    return null;
  }

  /**
   * Helper to filter out any engine names like Gemini from voice speech
   */
  cleanVoiceSpeech(speechText, isHindi) {
    if (!speechText) return speechText;
    let s = String(speechText);
    s = s.replace(/Google\s+Gemini\s+AI\s+Answer/gi, isHindi ? 'आर्या उत्तर' : 'Arya Ai Answer');
    s = s.replace(/Gemini\s+AI\s+Answer/gi, isHindi ? 'आर्या उत्तर' : 'Arya Ai Answer');
    s = s.replace(/Google\s+Gemini\s+AI/gi, isHindi ? 'आर्या' : 'ARYA');
    s = s.replace(/Gemini\s+AI/gi, isHindi ? 'आर्या' : 'ARYA');
    s = s.replace(/Google\s+Gemini/gi, isHindi ? 'आर्या' : 'ARYA');
    s = s.replace(/Gemini\s+API\s+key/gi, isHindi ? 'एपीआई की' : 'API key');
    s = s.replace(/Gemini/gi, isHindi ? 'आर्या' : 'ARYA');
    s = s.replace(/जेमिनी\s+एआई\s+उत्तर/gi, 'आर्या उत्तर');
    s = s.replace(/जेमिनी\s+एआई/gi, 'आर्या');
    s = s.replace(/जेमिनी/gi, 'आर्या');
    return s.trim();
  }

  /**
   * Helper to format response into clean voice speech & natural human display
   */
  formatGeminiResponse(fullText, modelName, isHindi) {
    const cleanText = (fullText || '').trim();

    // Generate clean spoken text for voice synthesis
    let cleanSpeech = cleanText
      .replace(/```[\s\S]*?```/g, '') // remove large code blocks for voice
      .replace(/[*_#`~>\[\]\(\)]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    cleanSpeech = this.cleanVoiceSpeech(cleanSpeech, isHindi);

    const sentences = cleanSpeech.split(/(?<=[.!?।])\s+/);
    if (sentences.length > 3) {
      cleanSpeech = sentences.slice(0, 3).join(' ');
    }

    return {
      speech: cleanSpeech || (isHindi ? "जी सर।" : "At your service, Sir."),
      display: cleanText,
      model: modelName
    };
  }
}

module.exports = new AryaAIService();
