const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    default: 'default_device',
    unique: true,
    index: true
  },
  deviceName: {
    type: String,
    default: 'Primary Device'
  },
  userId: {
    type: String,
    default: 'default_user'
  },
  userName: {
    type: String,
    default: 'Sir'
  },
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en'
  },
  voiceName: {
    type: String,
    default: ''
  },
  pitch: {
    type: Number,
    default: 1.0
  },
  rate: {
    type: Number,
    default: 1.0
  },
  continuousListening: {
    type: Boolean,
    default: false
  },
  geminiApiKey: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: 'Patna'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserSettings', userSettingsSchema);
