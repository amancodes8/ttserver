require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!API_KEY) {
  console.error('FATAL ERROR: API_KEY is not defined in environment variables');
  process.exit(1);
}

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_TOKEN) {
  console.error('FATAL ERROR: Admin credentials or token missing in environment variables');
  process.exit(1);
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(helmet());
app.use(express.json());

// API key check (skip /admin and /health)
app.use((req, res, next) => {
  if (
    req.path.startsWith('/admin') ||
    req.path === '/health'
  ) return next();

  const userKey = req.headers['x-api-key'];
  if (userKey !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  next();
});

// GET timetable for all batches
app.get('/api/timetable', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'timetable.json');

  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading timetable:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    try {
      const allData = JSON.parse(data);
      if (!allData.batches || typeof allData.batches !== 'object') {
        return res.status(500).json({ error: 'Invalid data format' });
      }

      const batchArray = Object.entries(allData.batches).map(([batch, info]) => ({
        batch,
        ...info
      }));

      res.json(batchArray);
    } catch (parseErr) {
      console.error('Error parsing timetable:', parseErr);
      res.status(500).json({ error: 'Failed to parse timetable' });
    }
  });
});

// GET raw JSON timetable (for admin textarea)
app.get('/admin/raw-timetable', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'timetable.json');

  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading raw timetable:', err);
      return res.status(500).json({ error: 'Failed to read timetable' });
    }
    res.type('application/json').send(data);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Admin login using credentials from .env
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    return res.json({ success: false, error: 'Invalid credentials' });
  }
});

// Admin update timetable (token from .env)
app.post('/admin/update', (req, res) => {
  const { token, data } = req.body;

  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  const dataPath = path.join(__dirname, 'data', 'timetable.json');

  try {
    const updated = { batches: {} };
    for (const item of data) {
      if (!item.batch) continue;
      const { batch, ...rest } = item;
      updated.batches[batch] = rest;
    }

    fs.writeFileSync(dataPath, JSON.stringify(updated, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Timetable updated successfully' });

  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({ error: 'Failed to update timetable' });
  }
});

// Change password route - NOT supported because password is in .env (optional: you can remove this)
app.post('/admin/change-password', (req, res) => {
  res.status(403).json({ error: 'Change password is not supported when credentials are stored in .env' });
});

// 404 for unknown endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
