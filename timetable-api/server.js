require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('FATAL ERROR: API_KEY is not defined in environment variables');
  process.exit(1);
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(helmet());
app.use(express.json());

// API key check (skips /admin and /health)
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

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const configPath = path.join(__dirname, 'data', 'admin.json');

  try {
    const admin = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (username === admin.username && password === admin.password) {
      return res.json({ success: true, token: admin.token });
    } else {
      return res.json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/admin/update', (req, res) => {
  const { token, data } = req.body;
  const configPath = path.join(__dirname, 'data', 'admin.json');
  const dataPath = path.join(__dirname, 'data', 'timetable.json');

  try {
    const admin = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (token !== admin.token) {
      return res.status(403).json({ error: 'Invalid token' });
    }

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

app.post('/admin/change-password', (req, res) => {
  const { token, oldPassword, newPassword } = req.body;
  const configPath = path.join(__dirname, 'data', 'admin.json');

  if (!token || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing token, old password, or new password' });
  }

  let adminData;
  try {
    adminData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error('Error reading admin.json:', e);
    return res.status(500).json({ error: 'Failed to load admin data' });
  }

  if (token !== adminData.token || oldPassword !== adminData.password) {
    return res.status(403).json({ error: 'Invalid token or password' });
  }

  adminData.password = newPassword;

  try {
    fs.writeFileSync(configPath, JSON.stringify(adminData, null, 2), 'utf-8');
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e) {
    console.error('Error saving password:', e);
    res.status(500).json({ error: 'Failed to save password' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
