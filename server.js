const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to our Database Notebook
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Setup the table automatically if it doesn't exist yet!
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) DEFAULT 'news',
      excerpt TEXT,
      content TEXT,
      image_url TEXT,
      author VARCHAR(100) DEFAULT 'IQ Academy',
      published_date DATE,
      is_featured BOOLEAN DEFAULT false,
      is_published BOOLEAN DEFAULT true
    );
  `);
  console.log("Database notebook is ready!");
}
initDB();

// 1. Send published news to the main school website (news.html)
app.get('/api/news/published', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, category, excerpt, content, image_url, author, published_date as date, is_featured as featured FROM articles WHERE is_published = true ORDER BY published_date DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Robot had trouble reading stories.' });
  }
});

// 2. Send ALL posts (including drafts) to your Admin Manager Page
app.get('/api/admin/news', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM articles ORDER BY published_date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching records.' });
  }
});

// 3. Save a new story or update an existing one
app.post('/api/admin/news', async (req, res) => {
  const { id, title, category, excerpt, content, image_url, author, date, featured, published } = req.body;
  const postId = id || 'post_' + Date.now();
  
  try {
    const query = `
      INSERT INTO articles (id, title, category, excerpt, content, image_url, author, published_date, is_featured, is_published)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        image_url = EXCLUDED.image_url,
        author = EXCLUDED.author,
        published_date = EXCLUDED.published_date,
        is_featured = EXCLUDED.is_featured,
        is_published = EXCLUDED.is_published;
    `;
    await pool.query(query, [postId, title, category, excerpt, content, image_url, author, date, featured, published]);
    res.json({ success: true, message: "Story saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save story." });
  }
});

// 4. Delete a story
app.delete('/api/admin/news/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: "Story erased!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete story." });
  }
});

// Start listening for messages
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Robot is awake and listening on port ${PORT}!`));
