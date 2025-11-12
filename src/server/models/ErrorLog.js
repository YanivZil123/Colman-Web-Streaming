import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  stack: String,
  endpoint: String,
  method: String,
  userId: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);

export default ErrorLog;
