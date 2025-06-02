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

app.use(cors()); // Allow all origins

app.use(helmet()); // Security headers

// API key middleware
app.use((req, res, next) => {
  const userKey = req.headers['x-api-key'];
  if (userKey !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  next();
});

// Timetable endpoint with batch param
app.get('/api/timetable', (req, res) => {
  const batch = req.query.batch;
  if (!batch || typeof batch !== 'string' || !batch.match(/^[A-Z0-9]+$/)) {
    return res.status(400).json({ error: 'Invalid or missing batch parameter. Example: ?batch=E16' });
  }

  const dataPath = path.join(__dirname, 'data', 'timetable.json');

  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading timetable data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    try {
      const allData = JSON.parse(data);
      const batchData = allData.batches[batch];

      if (!batchData) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(batchData);
    } catch (parseErr) {
      console.error('Error parsing timetable JSON:', parseErr);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

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
  console.log(`Server running at http://localhost:${PORT}`);
});
