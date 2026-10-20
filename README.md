# 🤖 ARYA. Artificial Intelligence Web Interface
> **Automated Responsive Yield Assistant**  
> **Author & Architect: Shubhanshu Kumar Srivastav**  
> An interactive sci-fi tactical voice and chat assistant powered by **HTML, CSS, JavaScript, Node.js, Express.js, MongoDB**, and the **Web Speech API**.  
> **Features: English & Hindi (हिन्दी) Voice Conversation, Real-Time Web Reconnaissance (Author/Fact Search), and Automatic MongoDB Neural Memory!**

---

## 👤 Author & Creator
- **Author:** Shubhanshu Kumar Srivastav
- **Platform:** ARYA. Tactical Neural Interface V3.0

---

## ✨ Key Features

- 🎙️ **Voice Interaction (Talking in English & Hindi)**:
  - **Hindi (हिन्दी) & English Voice Synergy**: ARYA talks and listens in both English and Hindi!
  - **Single-Click Language Switch**: Toggle between English and Hindi using the `[LANG: EN / HI]` HUD button.
  - **Speech-to-Text (STT)**: Real-time speech recognition in English (`en-US`) and Hindi (`hi-IN`). Push-to-Talk or Continuous Listening.
  - **Text-to-Speech (TTS)**: Realistic voice synthesis, automatically choosing appropriate British English or Hindi voice profiles.
  - **Voice Replay**: Replay any voice transmission anytime via the `▶ REPLAY` button.

- 🌐 **Live Web Reconnaissance (Author & Real-Time Facts Lookup)**:
  - When asked about authors, writers, creators, or real-world facts (e.g. *"Who is the author of Wings of Fire?"*, *"Who wrote Harry Potter?"*, *"गोदान के लेखक कौन हैं?"*), ARYA automatically queries the live web via its real-time web reconnaissance engine.
  - When asked *"Who is the author of ARYA?"* or *"Who created you?"*, ARYA proudly identifies **Shubhanshu Kumar Srivastav** as its author and creator!

- 🗄️ **Automatic MongoDB Data Persistence**:
  - **Auto-Saved Conversations**: Every query and voice response is automatically saved into MongoDB (`arya_db.conversations`).
  - **Auto-Saved Memory Notes**: Say *"Note likho: कल सुबह 10 बजे मीटिंग है"* or *"Take a note: Recharge suit batteries"*, and ARYA automatically logs it into MongoDB (`arya_db.memorynotes`).
  - **Auto-Saved Settings**: User title/name, preferred language, voice speed, and pitch are stored in MongoDB (`arya_db.usersettings`).
  - **Visual Auto-Save HUD Pulse**: Glowing badge notifies you in real-time whenever an auto-save occurs.

- ⚡ **Arc Reactor HUD Interface**:
  - Circular holographic canvas visualizer pulsating with real-time sound frequencies and orbital particles.
  - Reactive animations for **STANDBY**, **LISTENING**, **PROCESSING**, and **SPEAKING**.
  - Synthesized Web Audio API sound effects (boot chords, listening chirps, acknowledgment chimes).

- 🧠 **Hardware Telemetry & Protocols**:
  - **Real-Time Diagnostics**: Live CPU architecture, core count, RAM allocation bar, and uptime fetched live from the Node.js `os` module.
  - **Time & Atmospheric Telemetry**: Clock, date, and weather status in English and Hindi.
  - **Calculations & Mathematics**: Real-time arithmetic solver.
  - **Browser Actions**: Voice commands to open YouTube, Google, GitHub, or perform web searches.

---

## 🚀 Quick Start

### 1. Requirements
- **Node.js** (v18+)
- **MongoDB** running locally (`mongodb://127.0.0.1:27017/arya_db`) or MongoDB Atlas URI

### 2. Installation
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
Or with auto-restart on changes:
```bash
npm run dev
```

### 4. Launch ARYA. in Browser
Open your browser (Google Chrome or Microsoft Edge recommended for full Web Speech API capabilities):
```
http://localhost:3000
```
*(If port 3000 is occupied, ARYA automatically switches to port 3001).*

---

## 🗣️ Voice Commands You Can Say

### 🌐 Author & Web Search Commands:
- `"Who is the author of Wings of Fire?"`
- `"Who wrote Harry Potter?"`
- `"गोदान के लेखक कौन हैं?"` *(Who wrote Godan)*
- `"Who created you?"` / `"Author name"` *(Answers: Shubhanshu Kumar Srivastav)*
- `"Who invented the telephone?"`

### 🇮🇳 Hindi Commands (हिन्दी में बोलें):
- `"नमस्ते आर्या, आप कैसी हो?"`
- `"समय क्या हुआ है?"`
- `"आज का मौसम कैसा है?"`
- `"Note likho: कल सुबह 10 बजे मीटिंग है"` *(Auto-saved to MongoDB)*
- `"एक चुटकुला सुनाओ"`
- `"यूट्यूब खोलो"`
- `"गूगल खोलो"`
- `"तुम कौन हो?"`

### 🇬🇧 English Commands:
- `"Hey Arya, status report"`
- `"Arya, calculate 1450 divided by 25"`
- `"Take a note: Complete suit diagnostics"` *(Auto-saved to MongoDB)*
- `"Show my notes"`
- `"Open YouTube"`
- `"Tell me a joke"`
- `"House party protocol"`

---

## ⚙️ Configuration (`.env`)

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/arya_db
USER_NAME=Sir

# Optional: Google Gemini API key for unrestricted general intelligence
GEMINI_API_KEY=
```

---

## 🛠️ Tech Stack Architecture

- **Frontend**: HTML5, Modern CSS3 (Cyberpunk/Iron Man HUD theme, Neon animations, Glassmorphism, Noto Sans Devanagari font), Vanilla JavaScript ES6+, HTML5 Canvas visualizer, Web Speech API (`SpeechRecognition` & `SpeechSynthesis`), Web Audio API.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB with Mongoose ORM (Collections: `conversations`, `memorynotes`, `usersettings`).
- **Web Reconnaissance**: Real-time Wikipedia / Open Web REST Engine for live author and factual search.
