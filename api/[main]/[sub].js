// api/[main]/[sub].js
const pool = require('../../db');
const allowedOrigins = require('../../Origin');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;

  // ----- CORS -----
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { main, sub } = req.query;

  try {
    if (main === 'items') {
      if (req.method !== 'GET') {
        return res
          .status(405)
          .json({ status: 405, message: 'Method not allowed. Only GET is supported.' });
      }

      const { rows } = await pool.query(
        'SELECT * FROM ghufran_store_items WHERE store_no = $1',
        [sub]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ status: 404, message: `No item with store_no '${sub}' found in '${main}'.` });
      }

      return res.status(200).json(rows[0]);
    }

    // --- Fallback for unsupported main path ---
    return res.status(404).json({
      status: 404,
      message: `No handler for secondary path /api/${main}/${sub} was found under /api/${main}.`,
    });
  } catch (error) {
    console.error('Error in [main]/[sub].js:', error);
    return res
      .status(500)
      .json({ status: 500, message: 'Internal Server Error', error: error.message });
  }
}
