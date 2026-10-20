const mongoose = require('mongoose');

const memoryNoteSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['note', 'reminder', 'system', 'preference'],
    default: 'note'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MemoryNote', memoryNoteSchema);
