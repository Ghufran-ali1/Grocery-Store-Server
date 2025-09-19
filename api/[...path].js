// api/[...path].js
const pool = require('../db');
const allowedOrigins = require('../Origin');

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // ✅ CORS
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ use array to capture multiple segments: e.g. ["stock"] or ["stock","STK123"]
  const pathParts = req.query.path;
  const mainPath = pathParts[0];
  const subPath = pathParts[1] || null;

  try {
    // --- AUTH ---
    if (mainPath === 'signup') {
      if (req.method !== 'POST') {
        return res.status(405).json({ status: 405, message: 'Method not allowed' });
      }
      const { username, password } = req.body;
      const result = await pool.query(
        'INSERT INTO ghufran_store_users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, password] // ⚠️ hash later
      );
      return res.status(201).json({ user: result.rows[0] });
    }

    if (mainPath === 'login') {
      if (req.method !== 'POST') {
        return res.status(405).json({ status: 405, message: 'Method not allowed' });
      }
      const { username, password } = req.body;
      const result = await pool.query(
        'SELECT * FROM ghufran_store_users WHERE username=$1 AND password=$2',
        [username, password]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ status: 401, message: 'Invalid credentials' });
      }
      return res.status(200).json({ user: result.rows[0] });
    }

    // --- ITEMS ---
    if (mainPath === 'create-item') {
      if (req.method !== 'POST') {
        return res.status(405).json({ status: 405, message: 'Method not allowed' });
      }
      const { name, description, quantity } = req.body;
      const result = await pool.query(
        'INSERT INTO ghufran_store_items (name, description, quantity) VALUES ($1, $2, $3) RETURNING *',
        [name, description, quantity]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (mainPath === 'update-item') {
      if (req.method !== 'PUT') {
        return res.status(405).json({ status: 405, message: 'Method not allowed' });
      }
      const { id, name, description, quantity } = req.body;
      const result = await pool.query(
        'UPDATE ghufran_store_items SET name=$1, description=$2, quantity=$3 WHERE id=$4 RETURNING *',
        [name, description, quantity, id]
      );
      return res.status(200).json(result.rows[0]);
    }

    if (mainPath === 'delete-item') {
      if (req.method !== 'DELETE') {
        return res.status(405).json({ status: 405, message: 'Method not allowed' });
      }
      const { id } = req.body;
      await pool.query('DELETE FROM ghufran_store_items WHERE id=$1', [id]);
      return res.status(200).json({ message: 'Item deleted' });
    }

    // --- FETCH ITEMS / STOCK ---
    if (mainPath === 'items' || mainPath === 'stock') {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: 405, message: 'Method not allowed' });
      }

      if (subPath) {
        // GET /api/stock/<store_no> → specific item
        const { rows } = await pool.query(
          'SELECT * FROM ghufran_store_items WHERE store_no = $1',
          [subPath]
        );
        if (rows.length === 0) {
          return res.status(404).json({ status: 404, message: 'Item not found' });
        }
        return res.status(200).json(rows[0]);
      } else {
        // GET /api/items or /api/stock → all items
        const { rows } = await pool.query('SELECT * FROM ghufran_store_items');
        return res.status(200).json(rows);
      }
    }

    if (mainPath === 'test') {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: 405, message: 'Method not allowed' });
      }
      return res.status(200).json({ status: 200, message: 'The server is running perfectly!' });
    }

    return res.status(404).json({ status: 404, message: `No handler for pathname /${mainPath}` });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ status: 500, message: 'Internal Server Error', error });
  }
}
