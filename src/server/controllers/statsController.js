export const getViewsByDay = (req, res) => {
  try {
    // Mock data - would come from database in production
    res.json({
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      counts: [2, 1, 3, 5, 2, 1, 4]
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPopularByGenre = (req, res) => {
  try {
    // Mock data - would come from database in production
    res.json({
      labels: ['Action', 'Drama', 'Kids'],
      values: [5, 3, 2]
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
