const pool = require('../../db');
const allowedOrigins = require('../../Origin');
const jwt = require('jsonwebtoken')
// const secretKey = process.env.SECRET_KEY;
const secretKey = "6528f96b6bbc75e49d08ebc095da13119cc4da26e55b299558f718f0c027723e27214883";

export default async function handler(req, res) {
  const origin = req.headers.origin;
  // ----- CORS -----
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { main } = req.query;

  try {
    /* ---------- SIGNUP ---------- */
    if (main === 'signup') {
      if (req.method !== 'POST')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use POST.' });

      const { username, email, password, role } = req.body;
      const result = await pool.query(
        'INSERT INTO ghufran_store_users (username, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, username',
        [username, email, password, role]
      );

      return res.status(201).json({
        status: 201,
        message: 'Signup successful.',
        user: result.rows[0],
      });
    }

    /* ---------- LOGIN ---------- */
    if (main === 'login') {
      if (req.method !== 'POST')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use POST.' });

      const { username, password } = req.body;
      const result = await pool.query(
        'SELECT * FROM ghufran_store_users WHERE username=$1 AND password=$2',
        [username, password]
      );

      if (result.rows.length === 0)
        return res.status(401).json({ status: 401, message: 'Invalid username or password.' });

      const token = jwt.sign(
        { username: result.rows[0].username, email: result.rows[0].email },
        secretKey,
        { expiresIn: '72h' }
      );

      return res.status(200).json({
        status: 200,
        message: 'Admin login was successful.',
        user: result.rows[0],
        token,
      });
    }

    /* ---------- ADMIN DETAILS ---------- */
    if (main === 'admin-details') {
      if (req.method !== 'GET')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use GET.' });

      const verifyToken = (token) => {
        try {
          return jwt.verify(token, secretKey);
        } catch (err) {
          if (err.name === 'TokenExpiredError') throw { status: 401, message: 'Token has expired' };
          if (err.name === 'JsonWebTokenError') throw { status: 401, message: 'Invalid token' };
          throw { status: 500, message: 'Token verification failed' };
        }
      };

      try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader)
          return res.status(401).json({ message: 'Authorization header is missing' });

        const token = tokenHeader.split(' ')[1];
        const payload = verifyToken(token);

        const result = await pool.query(
          'SELECT * FROM ghufran_store_users WHERE username=$1 LIMIT 1',
          [payload.username]
        );

        if (result.rows.length === 0)
          return res.status(404).json({ status: 404, message: 'Admin user not found.' });

        return res.status(200).json({
          status: 200,
          message: 'Admin details fetched successfully.',
          user: result.rows[0],
        });
      } catch (error) {
        console.error('admin-details error:', error);
        return res.status(500).json({ status: 500, message: 'Server error retrieving admin details.' });
      }
    }

    /* ---------- CREATE ITEMS (parallel inserts) ---------- */
    if (main === 'create-items') {
      if (req.method !== 'POST')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use POST.' });

      const items = req.body;
      if (!Array.isArray(items))
        return res.status(400).json({ status: 400, message: 'Expected an array of items' });

      try {
        const insertedItems = await Promise.all(
          items.map((item) => {
            const { name, category, description, quantity, gallery, store_no } = item;
            return pool
              .query(
                `INSERT INTO ghufran_store_items
                   (name, category, description, quantity, gallery, store_no)
                 VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                [name, category, description, quantity, JSON.stringify(gallery), store_no]
              )
              .then((res) => res.rows[0]);
          })
        );

        return res.status(201).json(insertedItems);
      } catch (err) {
        console.error('create-items error:', err);
        return res.status(500).json({ status: 500, message: 'Database error' });
      }
    }

    /* ---------- UPDATE ITEM ---------- */
if (main === 'update-item') {
  if (req.method !== 'PUT')
    return res.status(405).json({ status: 405, message: 'Method not allowed. Use PUT.' });

  const { id, name, category, description, quantity } = req.body;

  console.log('received item: ', id, name, category, description, quantity)

  try {
    const result = await pool.query(
      'UPDATE ghufran_store_items SET name=$1, description=$2, quantity=$3, category=$3 WHERE id=$4 RETURNING *',
      [name,  description, quantity, id, category]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 404, message: 'Item not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('DB update error:', err);
    return res.status(500).json({ status: 500, message: 'Database error' });
  }
}

    /* ---------- DELETE ITEM ---------- */
    if (main === 'delete-item') {
      if (req.method !== 'DELETE')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use DELETE.' });

      const { id } = req.body;
      await pool.query('DELETE FROM ghufran_store_items WHERE store_no=$1', [id]);
      return res.status(200).json({ message: 'Item deleted.' });
    }

    if (main === 'items') {
      if (req.method !== 'GET')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use GET.' });
      const { rows } = await pool.query('SELECT * FROM ghufran_store_items');
      return res.status(200).json(rows);
    }

    /* ---------- ADMINS ---------- */
    if (main === 'admins') {
      if (req.method !== 'GET')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use GET.' });
      const { rows } = await pool.query('SELECT * FROM ghufran_store_users');
      return res.status(200).json(rows);
    }

    /* ---------- TEST ---------- */
    if (main === 'test') {
      if (req.method !== 'GET')
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use GET.' });
      return res.status(200).json({ status: 200, message: 'The server is running perfectly!' });
    }

    // ---------- FALLBACK ----------
    return res
      .status(404)
      .json({ status: 404, message: `No handler for primary path /api/${main} was found.` });
  } catch (error) {
    console.error('Error in [main]/index.js:', error);
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

