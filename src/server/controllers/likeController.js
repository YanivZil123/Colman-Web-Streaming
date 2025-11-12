export const toggleLike = (req, res) => {
  try {
    // Simplified for mock - would store likes in database
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
