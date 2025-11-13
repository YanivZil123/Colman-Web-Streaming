import mongoose from 'mongoose';

const watchHabitSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  titleId: { type: String, required: true, index: true },
  episodeId: { type: String, default: null, index: true },
  profileId: { type: String, default: null, index: true },
  watchedDuration: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  lastWatchedAt: { type: Date, default: Date.now },
  watchCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'watchhabits'
});

// Compound index for efficient queries
watchHabitSchema.index({ userId: 1, titleId: 1, episodeId: 1, profileId: 1 });
watchHabitSchema.index({ userId: 1, profileId: 1, completed: 1 });
watchHabitSchema.index({ userId: 1, lastWatchedAt: -1 });

const WatchHabitDoc = mongoose.model('WatchHabit', watchHabitSchema);

export { WatchHabitDoc };

