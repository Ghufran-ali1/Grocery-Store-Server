const pool = require('../../db');
const allowedOrigins = require('../../Origin');
const jwt = require('jsonwebtoken')
const secretKey = process.env.SECRET_KEY;



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
    if (main === 'signup') {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 405, message: 'Method not allowed. Use POST.' });
  }

  const { username, email, password, role } = req.body;
  // ⚠️ Hash passwords in production!
  const result = await pool.query(
    'INSERT INTO ghufran_store_users (username, email, password, role) VALUES ($1, $2) RETURNING id, username',
    [username, email, password, role]
  );

  return res.status(201).json({
    status: 201,
    message: 'Signup successful.',
    user: result.rows[0],
  });
}

if (main === 'login') {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 405, message: 'Method not allowed. Use POST.' });
  }

  const { username, password } = req.body;
  const result = await pool.query(
    'SELECT * FROM ghufran_store_users WHERE username=$1 AND password=$2',
    [username, password]
  );

  if (result.rows.length === 0) {
    return res
      .status(401)
      .json({ status: 401, message: 'Invalid username or password.' });
  }

  // ✅ Create a signed JWT valid for 1 hour
  const token = jwt.sign(
    { 
      username: result.rows[0].username,
      email: result.rows[0].email,
    },
    secretKey,
    { expiresIn: '72h' }
  );

  return res.status(200).json({
    status: 200,
    message: 'Login successful.',
    user: { id: result.rows[0].id, username: result.rows[0].username },
    token,
  });
}

if (main === 'admin-details') {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ status: 405, message: 'Method not allowed. Use GET.' });
  }

  try {
    // ✅ Expect: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ status: 401, message: 'Authorization header missing or malformed.' });
    }

    const token = authHeader.split(' ')[1];

    // ✅ Verify token
    let payload;
    try {
      payload = jwt.verify(token, secretKey);
    } catch (err) {
      return res
        .status(401)
        .json({ status: 401, message: 'Invalid or expired token.' });
    }

    // ✅ Fetch admin details
    const result = await pool.query(
      'SELECT id, username, email, role FROM ghufran_store_users WHERE username=$1 LIMIT 1',
      [payload.username]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ status: 404, message: 'Admin user not found.' });
    }

    return res.status(200).json({
      status: 200,
      message: 'Admin details fetched successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('admin-details error:', error);
    return res
      .status(500)
      .json({ status: 500, message: 'Server error retrieving admin details.' });
  }
}

    // ---------- ITEMS CRUD ----------
if (main === 'create-items') {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 405, message: 'Method not allowed. Use POST.' });
  }

  const items = req.body; // expect an array of objects

  if (!Array.isArray(items)) {
    return res.status(400).json({ status: 400, message: "Expected an array of items" });
  }

  try {
    const insertedItems = [];

    for (const item of items) {
      const { name, category, description, quantity, gallery, store_no } = item;

      const result = await pool.query(
        `INSERT INTO ghufran_store_items 
          (name, category, description, quantity, gallery, store_no) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, category, description, quantity, JSON.stringify(gallery), store_no]
      );

      insertedItems.push(result.rows[0]);
    }

    return res.status(201).json(insertedItems); // return all inserted items
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 500, message: "Database error" });
  }
}


    if (main === 'update-items') {
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

    // ---------- Admins ----------
    if (main === 'admins') {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: 405, message: 'Method not allowed. Use GET.' });
      }
      const { rows } = await pool.query('SELECT * FROM ghufran_store_users');
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
