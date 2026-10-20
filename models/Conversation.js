const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    default: 'default_device',
    index: true
  },
  deviceName: {
    type: String,
    default: 'Primary Device'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  userEmail: {
    type: String,
    default: '',
    index: true
  },
  userName: {
    type: String,
    default: ''
  },
  attachment: {
    name: { type: String, default: '' },
    type: { type: String, default: '' },
    size: { type: Number, default: 0 },
    dataUrl: { type: String, default: '' }
  },
  userMessage: {
    type: String,
    required: true,
    trim: true
  },
  aryaResponse: {
    type: String,
    trim: true
  },
  jarvisResponse: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    default: 'en' // 'en' or 'hi'
  },
  action: {
    type: String,
    default: 'chat'
  },
  autoSaved: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Getter fallback so both aryaResponse and legacy jarvisResponse work transparently
conversationSchema.virtual('response').get(function() {
  return this.aryaResponse || this.jarvisResponse;
});

module.exports = mongoose.model('Conversation', conversationSchema);
