const pool = require('../../db');
const allowedOrigins = require('../../Origin');

export default async function handler(req, res) {
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

  const { main } = req.query; // e.g. /api/login  ->  main='login'

  try {
    // ---------- AUTH ----------
    if (main === 'signup') {
      if (req.method !== 'POST') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use POST.' });
      }
      const { username, password } = req.body;
      const result = await pool.query(
        'INSERT INTO ghufran_store_users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, password] // ⚠️ hash passwords in production
      );
      return res.status(201).json({ user: result.rows[0] });
    }

    if (main === 'login') {
      if (req.method !== 'POST') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use POST.' });
      }
      const { username, password } = req.body;
      const result = await pool.query(
        'SELECT * FROM ghufran_store_users WHERE username=$1 AND password=$2',
        [username, password]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ status: 401, message: 'Invalid credentials.' });
      }
      return res.status(200).json({ user: result.rows[0] });
    }

    // ---------- ITEMS CRUD ----------
    if (main === 'create-item') {
      if (req.method !== 'POST') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use POST.' });
      }
      const { name, description, quantity } = req.body;
      const result = await pool.query(
        'INSERT INTO ghufran_store_items (name, description, quantity) VALUES ($1, $2, $3) RETURNING *',
        [name, description, quantity]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (main === 'update-item') {
      if (req.method !== 'PUT') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use PUT.' });
      }
      const { id, name, description, quantity } = req.body;
      const result = await pool.query(
        'UPDATE ghufran_store_items SET name=$1, description=$2, quantity=$3 WHERE id=$4 RETURNING *',
        [name, description, quantity, id]
      );
      return res.status(200).json(result.rows[0]);
    }

    if (main === 'delete-item') {
      if (req.method !== 'DELETE') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use DELETE.' });
      }
      const { id } = req.body;
      await pool.query('DELETE FROM ghufran_store_items WHERE id=$1', [id]);
      return res.status(200).json({ message: 'Item deleted.' });
    }

    // ---------- LIST ITEMS / STOCK ----------
    if (main === 'items' || main === 'stock') {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use GET.' });
      }
      const { rows } = await pool.query('SELECT * FROM ghufran_store_items');
      return res.status(200).json(rows);
    }

    // ---------- TEST ----------
    if (main === 'test') {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use GET.' });
      }
      return res.status(200).json({
        status: 200,
        message: 'The server is running perfectly!',
      });
    }

    // ---------- FALLBACK ----------
    return res.status(404).json({
      status: 404,
      message: `No handler for primary path /api/${main} was found.`,
    });
  } catch (error) {
    console.error('Error in [main]/index.js:', error);
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}
