/**
 * VoiceController - Web Speech API Multilingual Voice Recognition (STT) and Synthesis (TTS)
 * Architect & Author: Shubhanshu Kumar Srivastav
 * Supports English & Hindi (हिन्दी)
 * Features Always-On Continuous Microphone with auto-restart watchdog
 */
class JarvisVoiceController {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    
    this.isListening = false;
    this.isSpeaking = false;
    this.continuousMode = false; // Push-to-talk by default, mic off until clicked or toggled
    this.voiceMuted = false;
    
    this.language = 'hi'; // Default mode is Hindi as requested
    this.selectedVoice = null;
    this.hindiVoice = null;
    this.englishVoice = null;

    this.pitch = 1.0;
    this.rate = 1.0;
    
    this.restartTimer = null;
    this.watchdogInterval = null;
    this.keepAliveInterval = null;

    // Callbacks
    this.onSpeechStart = null;
    this.onSpeechResult = null;
    this.onSpeechEnd = null;
    this.onJarvisSpeakStart = null;
    this.onJarvisSpeakEnd = null;

    this.initRecognition();
    this.initSynthesis();
    this.startWatchdog();
  }

  // Initialize Speech Recognition
  initRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Speech Recognition not supported by this browser. Manual input available.');
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = this.continuousMode;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language === 'hi' ? 'hi-IN' : 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onSpeechStart) this.onSpeechStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (this.onSpeechResult) {
        this.onSpeechResult({
          text: finalTranscript || interimTranscript,
          isFinal: Boolean(finalTranscript),
          lang: this.language
        });
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition notice:', event.error);
      }
      this.isListening = false;
      if (this.onSpeechEnd) this.onSpeechEnd(event.error);

      // If blocked by browser (insecure HTTP or mic permission denied)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        if (this.onMicPermissionBlocked) {
          this.onMicPermissionBlocked(event.error);
        }
        return;
      }

      // For always-on mic: automatically revive immediately after momentary silence or error
      if (this.continuousMode && !this.isSpeaking) {
        this.restartListening(80);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onSpeechEnd) this.onSpeechEnd();

      // For always-on mic: automatically restart immediately without dying
      if (this.continuousMode && !this.isSpeaking) {
        this.restartListening(80);
      }
    };
  }

  // Debounced auto-restart helper for Always-On microphone
  restartListening(delayMs = 100) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.continuousMode && !this.isListening && !this.isSpeaking) {
        this.startListening();
      }
    }, delayMs);
  }

  // Background watchdog to ensure microphone never stays dormant when continuous is active
  startWatchdog() {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    this.watchdogInterval = setInterval(() => {
      // Fix Chrome bug: if synthesis finished or dropped without firing onend, reset isSpeaking
      if (this.isSpeaking && this.synthesis) {
        if (!this.synthesis.speaking && !this.synthesis.pending) {
          this.isSpeaking = false;
          window._currentUtterance = null;
          if (this.onJarvisSpeakEnd) this.onJarvisSpeakEnd();
        }
      }

      // Keep microphone active continuously when continuousMode is enabled
      if (this.continuousMode && !this.isListening && !this.isSpeaking && this.recognition) {
        this.startListening();
      }
    }, 800);
  }

  // Set Language (English or Hindi)
  setLanguage(lang) {
    this.language = (lang === 'hi') ? 'hi' : 'en';
    if (this.recognition) {
      this.recognition.lang = this.language === 'hi' ? 'hi-IN' : 'en-US';
    }
    if (this.language === 'hi' && this.hindiVoice) {
      this.selectedVoice = this.hindiVoice;
    } else if (this.language === 'en' && this.englishVoice) {
      this.selectedVoice = this.englishVoice;
    }
  }

  // Initialize Speech Synthesis
  initSynthesis() {
    if (!this.synthesis) return;
    this.populateVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => this.populateVoices();
    }
  }

  // Detect and calibrate voices (Prioritize Microsoft Swara IN Hindi as default)
  populateVoices() {
    if (!this.synthesis) return;
    const voices = this.synthesis.getVoices() || [];
    if (!voices || voices.length === 0) return;

    // 1. Locate Hindi Voice - PRIORITIZE MICROSOFT SWARA
    const swaraVoice = voices.find(v => 
      v.name.toLowerCase().includes('swara') ||
      (v.lang.startsWith('hi') && v.name.toLowerCase().includes('swara'))
    );

    const otherHindiVoice = voices.find(v => 
      v.name.toLowerCase().includes('lekha') ||
      v.name.includes('Google हिन्दी') ||
      v.name.toLowerCase().includes('kalpana') ||
      v.name.toLowerCase().includes('hemant') ||
      v.name.toLowerCase().includes('hindi') || 
      v.name.includes('हिन्दी') ||
      v.lang === 'hi-IN' || 
      v.lang.startsWith('hi')
    ) || voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('rishi'));

    this.hindiVoice = swaraVoice || otherHindiVoice || null;

    // 2. Locate English Voice
    const preferredEnglish = voices.find(v => 
      (v.name.includes('UK') || v.name.includes('United Kingdom') || v.lang === 'en-GB') && 
      (v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('George') || v.name.includes('Male') || v.name.includes('Google UK English Male'))
    ) || voices.find(v => v.name.includes('Samantha') || v.name.includes('Rishi') || v.name.includes('Karen') || v.name.includes('Google US English'))
      || voices.find(v => v.lang === 'en-GB')
      || voices.find(v => v.lang.startsWith('en') && v.name.includes('Male'))
      || voices.find(v => v.lang.startsWith('en'));

    this.englishVoice = preferredEnglish || voices[0];

    // Default selected voice based on language (default is Hindi with Swara)
    if (this.language === 'hi') {
      this.selectedVoice = this.hindiVoice || this.englishVoice;
    } else {
      this.selectedVoice = this.englishVoice || this.hindiVoice;
    }
  }

  getVoices() {
    return this.synthesis ? this.synthesis.getVoices() : [];
  }

  setVoiceByName(name) {
    const voices = this.getVoices();
    const found = voices.find(v => v.name === name);
    if (found) {
      this.selectedVoice = found;
      if (found.lang.startsWith('hi')) {
        this.hindiVoice = found;
      } else {
        this.englishVoice = found;
      }
    }
  }

  startListening() {
    if (!this.recognition || this.isListening || this.isSpeaking) return;
    try {
      this.recognition.lang = this.language === 'hi' ? 'hi-IN' : 'en-US';
      this.recognition.start();
    } catch (e) {
      if (e.name === 'InvalidStateError') {
        // Recognition is already active or in transition
        this.isListening = true;
      } else {
        console.debug('Speech recognition start notice:', e.message);
        if (this.continuousMode && !this.isSpeaking) {
          this.restartListening(150);
        }
      }
    }
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.debug('Speech recognition stop notice:', e.message);
    }
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  setContinuous(enable) {
    this.continuousMode = Boolean(enable);
    if (this.recognition) {
      this.recognition.continuous = this.continuousMode;
    }
    if (this.continuousMode && !this.isListening && !this.isSpeaking) {
      this.startListening();
    } else if (!this.continuousMode && this.isListening) {
      this.stopListening();
    }
  }

  _startKeepAlive() {
    this._stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.isSpeaking && this.synthesis) {
        if (this.synthesis.speaking) {
          this.synthesis.pause();
          this.synthesis.resume();
        }
      } else {
        this._stopKeepAlive();
      }
    }, 8000);
  }

  _stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // Speak aloud given text in English or Hindi
  speak(text, lang = null) {
    if (!this.synthesis || this.voiceMuted || !text) return;

    // Ensure voices are populated
    if (!this.hindiVoice || !this.selectedVoice) {
      this.populateVoices();
    }

    // Cancel any ongoing utterance safely
    try {
      if (this.synthesis.paused) {
        this.synthesis.resume();
      }
      this.synthesis.cancel();
    } catch (e) {}

    // Clean markdown characters, code blocks, links, and emojis for smooth TTS
    let cleanText = String(text)
      .replace(/```[\s\S]*?```/g, '') // remove large code blocks
      .replace(/`[^`]+`/g, '')        // remove inline code
      .replace(/https?:\/\/\S+/gi, '') // remove urls
      .replace(/<[^>]+>/g, '')         // remove HTML tags
      .replace(/[*_#`~>|•]/g, '')     // remove markdown styling
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure engine names like Gemini are never spoken aloud
    cleanText = cleanText
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

    if (!cleanText) return;

    // Detect if text is Hindi or requested in Hindi (default mode is Hindi)
    const isHindiTarget = (lang === 'hi') || (this.language === 'hi') || /[\u0900-\u097F]/.test(cleanText);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    // Anchor globally to window to prevent Chrome Garbage Collector bug
    window._currentUtterance = utterance;

    if (isHindiTarget) {
      if (this.hindiVoice) {
        utterance.voice = this.hindiVoice;
      }
      utterance.lang = 'hi-IN';
    } else {
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.lang = 'en-US';
    }

    utterance.pitch = this.pitch || 1.0;
    utterance.rate = this.rate || 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this._startKeepAlive();
      // Pause mic while speaking to avoid transcribing self
      if (this.isListening) {
        this.stopListening();
      }
      if (this.onJarvisSpeakStart) this.onJarvisSpeakStart();
    };

    const handleSpeechEnd = () => {
      this.isSpeaking = false;
      this._stopKeepAlive();
      window._currentUtterance = null;
      if (this.onJarvisSpeakEnd) this.onJarvisSpeakEnd();

      // Immediately restore Always-On microphone after voice finishes speaking
      if (this.continuousMode) {
        this.restartListening(120);
      }
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis notice:', e);
      handleSpeechEnd();
    };

    // Small delay ensures previous cancel() is completely flushed in Chromium
    setTimeout(() => {
      try {
        if (this.synthesis.paused) {
          this.synthesis.resume();
        }
        this.synthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak exception:', err);
        handleSpeechEnd();
      }
    }, 20);
  }

  stopSpeaking() {
    this._stopKeepAlive();
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
      this.isSpeaking = false;
      window._currentUtterance = null;
      if (this.onJarvisSpeakEnd) this.onJarvisSpeakEnd();
      if (this.continuousMode) {
        this.restartListening(100);
      }
    }
  }
}

window.AryaVoiceController = JarvisVoiceController;
window.JarvisVoiceController = JarvisVoiceController;
