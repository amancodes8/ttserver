require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY;

// Check for missing API_KEY
if (!API_KEY) {
  console.error('FATAL ERROR: API_KEY is not defined in environment variables');
  process.exit(1);
}

// Enable CORS for all origins and custom headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

// Add security headers
app.use(helmet());

// Middleware to check API key
app.use((req, res, next) => {
  const userKey = req.headers['x-api-key'];
  if (userKey !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  next();
});

// Endpoint to get all batches' timetable data
app.get('/api/timetable', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'timetable.json');

  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading timetable data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    try {
      const allData = JSON.parse(data);

      if (!allData.batches || typeof allData.batches !== 'object') {
        return res.status(500).json({ error: 'Invalid data format in timetable.json' });
      }

      // Convert batches object to an array of batch data
      const batchArray = Object.entries(allData.batches).map(([batch, info]) => ({
        batch,
        ...info
      }));

      res.json(batchArray);
    } catch (parseErr) {
      console.error('Error parsing timetable JSON:', parseErr);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
