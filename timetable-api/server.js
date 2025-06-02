require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Use environment variables
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('FATAL ERROR: API_KEY is not defined');
  process.exit(1);
}

// Middlewares
app.use(cors()); // Allow all origins
app.use(helmet());
app.use(express.json());

// API Key middleware
app.use((req, res, next) => {
  const userKey = req.headers['x-api-key'];
  if (!userKey || userKey !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  next();
});

// Route: GET /api/timetable?batch=XYZ
app.get('/api/timetable', (req, res) => {
  const batch = req.query.batch;

  if (!batch || typeof batch !== 'string' || !batch.match(/^[A-Z0-9]+$/)) {
    return res.status(400).json({ error: 'Invalid or missing batch parameter. Example: ?batch=E16' });
  }

  const dataPath = path.join(__dirname, 'data', 'timetable.json');

  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading timetable.json:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    try {
      const parsed = JSON.parse(data);
      const result = parsed.batches[batch];

      if (!result) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(result);
    } catch (e) {
      console.error('Error parsing timetable.json:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
