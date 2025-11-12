import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

class User {
  constructor() {
    this.users = [];
  }

  async seed() {
    if (!this.users.find(u => u.email === 'admin@example.com')) {
      this.users.push({
        id: nanoid(),
        email: 'admin@example.com',
        passHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
        profiles: [{
          id: nanoid(),
          name: 'Main',
          avatarUrl: '/images/avatar1.png'
        }]
      });
    }
  }

  async create(email, password, role = 'user') {
    if (this.findByEmail(email)) {
      return null;
    }
    const passHash = await bcrypt.hash(password, 10);
    const user = {
      id: nanoid(),
      email,
      passHash,
      role,
      profiles: []
    };
    this.users.push(user);
    return user;
  }

  findByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  findById(id) {
    return this.users.find(u => u.id === id);
  }

  async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.passHash);
  }

  addProfile(userId, profileData) {
    const user = this.findById(userId);
    if (!user || user.profiles.length >= 5) {
      return null;
    }
    const profile = {
      id: nanoid(),
      name: (profileData.name || 'Profile').slice(0, 20),
      avatarUrl: profileData.avatarUrl || '/images/avatar1.png'
    };
    user.profiles.push(profile);
    return profile;
  }

  getProfiles(userId) {
    const user = this.findById(userId);
    return user ? user.profiles : [];
  }

  deleteProfile(userId, profileId) {
    const user = this.findById(userId);
    if (!user) return false;
    user.profiles = user.profiles.filter(p => p.id !== profileId);
    return true;
  }

  getAll() {
    return this.users;
  }
}

export default new User();
