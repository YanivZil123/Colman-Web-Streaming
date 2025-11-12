import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const profileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 20
  },
  avatarUrl: {
    type: String,
    default: '/images/avatar1.png'
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profiles: [profileSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.addProfile = function(profileData) {
  if (this.profiles.length >= 5) {
    return null;
  }
  const profile = {
    name: (profileData.name || 'Profile').slice(0, 20),
    avatarUrl: profileData.avatarUrl || '/images/avatar1.png'
  };
  this.profiles.push(profile);
  return profile;
};

userSchema.methods.deleteProfile = function(profileId) {
  this.profiles = this.profiles.filter(p => p._id.toString() !== profileId);
  return true;
};

userSchema.methods.updateProfile = function(profileId, profileData) {
  const profile = this.profiles.find(p => p._id.toString() === profileId);
  if (!profile) {
    return null;
  }
  if (profileData.name) {
    profile.name = profileData.name.slice(0, 20);
  }
  if (profileData.avatarUrl) {
    profile.avatarUrl = profileData.avatarUrl;
  }
  return profile;
};

const User = mongoose.model('User', userSchema);

export default User;
