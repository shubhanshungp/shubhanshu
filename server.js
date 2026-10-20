require('dotenv').config();
const dns = require('dns');
// Configure reliable DNS servers for Atlas SRV lookups on mobile/hotspot networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if network environment restricts custom DNS
}

const http = require('http');
const https = require('https');
const os = require('os');
const selfsigned = require('selfsigned');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const isCloud = Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.HEROKU || process.env.VERCEL || (process.env.NODE_ENV === 'production' && !process.env.LOCAL_DEV));
let PORT = parseInt(process.env.PORT, 10) || 3000;
let HTTPS_PORT = parseInt(process.env.HTTPS_PORT, 10) || 3443;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ARYA_db';

// Trust reverse proxy for accurate IP and protocol in Cloud Hosting (Render, Heroku, Cloudflare)
app.set('trust proxy', 1);
app.set('isCloud', isCloud);

// Middleware with 25mb limit for image and file attachments
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', apiRoutes);

// Fallback route for Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const UserSettings = require('./models/UserSettings');
const aiService = require('./services/aiService');

// MongoDB Connection with auto-reconnect and safe fallback
async function connectDB() {
  const localUri = 'mongodb://127.0.0.1:27017/ARYA_db';
  const targetUri = process.env.MONGODB_URI || localUri;

  console.log('⚡ Initializing ARYA. Neural Matrix...');
  console.log('👤 Architect & Author: Shubhanshu Kumar Srivastav');

  let connected = false;
  try {
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB Connection Established: [${targetUri}]`);
    connected = true;
  } catch (err) {
    console.warn(`⚠️ Primary MongoDB Atlas connection failed (${err.message}).`);
    if (err.message && (err.message.includes('whitelist') || err.message.includes('SSL alert') || err.message.includes('ReplicaSetNoPrimary'))) {
      console.warn('ℹ️ Atlas Access Tip: Make sure your current IP address (or 0.0.0.0/0) is added to MongoDB Atlas -> Network Access -> IP Access List.');
    }
    if (targetUri !== localUri) {
      console.log(`🔄 Engaging local high-speed fallback database: [${localUri}]...`);
      try {
        await mongoose.disconnect().catch(() => {});
        await mongoose.connect(localUri, {
          serverSelectionTimeoutMS: 3000
        });
        console.log(`✅ MongoDB Connected to Local Instance: [${localUri}]`);
        connected = true;
      } catch (localErr) {
        console.warn(`⚠️ Local MongoDB connection notice: ${localErr.message}`);
      }
    }
  }

  if (connected) {
    try {
      const saved = await UserSettings.findOne({ userId: 'default_user' });
      if (saved) {
        if (saved.geminiApiKey && !process.env.GEMINI_API_KEY) {
          aiService.setApiKey(saved.geminiApiKey);
          console.log('✨ Gemini AI key loaded from MongoDB user profile.');
        }
        if (saved.userName) {
          aiService.setUserName(saved.userName);
        }
      }
    } catch (cfgErr) {
      console.warn('Could not read user settings on startup:', cfgErr.message);
    }

    // Ensure Super Administrator account is always verified and active
    await ensureSuperAdmin();
  } else {
    console.warn('ℹ️ ARYA. will continue in local volatile mode. Some persistence features may be limited until MongoDB is accessible.');
  }

  // Background auto-reconnect: if on local fallback and Atlas URI is configured, periodically try to reconnect to Atlas
  if (targetUri !== localUri) {
    setInterval(async () => {
      const isAtlasConnected = mongoose.connection.readyState === 1 && mongoose.connection.host && !mongoose.connection.host.includes('127.0.0.1') && !mongoose.connection.host.includes('localhost');
      if (!isAtlasConnected) {
        try {
          const testConn = await mongoose.createConnection(targetUri, { serverSelectionTimeoutMS: 4000 }).asPromise();
          if (testConn.readyState === 1) {
            console.log('🚀 MongoDB Atlas is now accessible! Switching from local fallback to Atlas cloud...');
            await testConn.close().catch(() => {});
            await mongoose.disconnect().catch(() => {});
            await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 5000 });
            console.log(`✅ Reconnected directly to MongoDB Atlas: [${targetUri}]`);
            await ensureSuperAdmin();
          }
        } catch (e) {
          // Atlas still blocked or unreachable, remain on local instance
        }
      }
    }, 45000);
  }
}

async function ensureSuperAdmin() {
  try {
    const User = require('./models/User');
    const crypto = require('crypto');
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@arya.ai').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Arya2026';

    let adminUser = await User.findOne({ email: adminEmail });
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(adminPassword, salt, 64).toString('hex');

    if (!adminUser) {
      adminUser = await User.create({
        name: 'Super Administrator',
        email: adminEmail,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
        city: 'Patna'
      });
      console.log(`🔒 Super Admin account created: [${adminEmail}]`);
    } else {
      adminUser.role = 'admin';
      adminUser.name = adminUser.name || 'Super Administrator';
      adminUser.passwordSalt = salt;
      adminUser.passwordHash = hash;
      await adminUser.save();
      console.log(`🔒 Super Admin account verified & ready: [${adminEmail}]`);
    }
  } catch (adminErr) {
    console.warn('Admin seed notice:', adminErr.message);
  }
}

connectDB();

// Helper to discover all local network IPv4 addresses
function getLocalNetworkIPs() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  return results;
}

// Resilient Server Startup: Dual HTTP (Port 3000) & HTTPS (Port 3443) for local, single PORT for Cloud
async function startServer(httpPort, httpsPort) {
  app.set('httpPort', httpPort);
  app.set('httpsPort', httpsPort);

  // 1. Start Primary HTTP Server (Standard for Cloud Hosting & Local)
  const httpServer = http.createServer(app);
  httpServer.listen(httpPort, '0.0.0.0', () => {
    const lanIPs = getLocalNetworkIPs();
    const primaryLAN = lanIPs.length > 0 ? lanIPs[0].address : '127.0.0.1';

    console.log(`====================================================`);
    console.log(`🤖 ARYA. Core V3.0 is ONLINE [${isCloud ? 'CLOUD HOSTED' : 'LOCAL WORKSTATION'}]`);
    console.log(`👤 Author / Creator: Shubhanshu Kumar Srivastav`);
    if (isCloud) {
      console.log(`☁️ Cloud Server Port: ${httpPort} (HTTPS provided by Cloud Edge)`);
      console.log(`🚀 Ready for Mobile, Tablet, Smart Watch & Desktop access!`);
    } else {
      console.log(`💻 ON THIS PC (Localhost):`);
      console.log(`   • Standard Web:   http://localhost:${httpPort}`);
      console.log(`📱 ON MOBILE / TABLET / SMARTWATCH (Same Wi-Fi / Hotspot):`);
      console.log(`   • Mobile Web:     http://${primaryLAN}:${httpPort}`);
    }
    console.log(`====================================================`);
  });

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !isCloud) {
      console.warn(`⚠️ HTTP Port ${httpPort} in use. Trying ${httpPort + 1}...`);
      startServer(httpPort + 1, httpsPort);
    } else {
      console.error('HTTP Server error:', err);
    }
  });

  // 2. Start Secure HTTPS Server in Local Development only (Cloud providers provide native SSL)
  if (!isCloud) {
    try {
      const lanIPs = getLocalNetworkIPs();
      const hostnames = ['localhost', '127.0.0.1'];
      lanIPs.forEach(item => hostnames.push(item.address));

      const pems = await selfsigned.generate(
        [{ name: 'commonName', value: hostnames[0] }],
        { days: 365, keySize: 2048 }
      );

      const httpsServer = https.createServer({
        key: pems.private,
        cert: pems.cert
      }, app);

      httpsServer.listen(httpsPort, '0.0.0.0', () => {
        const primaryLAN = lanIPs.length > 0 ? lanIPs[0].address : '127.0.0.1';
        console.log(`🔒 LOCAL SECURE HTTPS SERVER ONLINE (Full Voice / Mic for Phones & Tablets):`);
        console.log(`   • PC HTTPS:       https://localhost:${httpsPort}`);
        console.log(`   • Mobile HTTPS:   https://${primaryLAN}:${httpsPort}`);
        console.log(`   *(Accept the self-signed certificate once in your mobile browser to unlock microphone)*`);
        console.log(`====================================================`);
      });

      httpsServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️ HTTPS Port ${httpsPort} in use.`);
        } else {
          console.warn('HTTPS Server notice:', err.message);
        }
      });
    } catch (sslErr) {
      console.warn('⚠️ Could not initialize HTTPS server:', sslErr.message);
    }
  }
}

startServer(PORT, HTTPS_PORT);
