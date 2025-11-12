import Title from '../models/Title.js';

export const getVideoSource = (req, res) => {
  try {
    const { titleId, episodeId } = req.query;
    const url = Title.getVideoUrl(titleId, episodeId);
    
    if (!url) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProgress = (req, res) => {
  // Simplified for mock - would store progress in database
  res.json({ ok: true });
};

export const markFinished = (req, res) => {
  // Simplified for mock - would mark as finished in database
  res.json({ ok: true });
};

export const getNextEpisode = (req, res) => {
  try {
    const { titleId, episodeId } = req.query;
    const nextEpisode = Title.getNextEpisode(titleId, episodeId);
    
    res.json(nextEpisode || {});
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
