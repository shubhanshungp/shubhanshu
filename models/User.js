const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  passwordSalt: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true
  },
  city: {
    type: String,
    default: 'Patna'
  },
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  geminiApiKey: {
    type: String,
    default: ''
  },
  continuousListening: {
    type: Boolean,
    default: false
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
  avatar: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
