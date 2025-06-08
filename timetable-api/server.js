require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

const { API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TOKEN, MONGO_URI } = process.env;

if (!MONGO_URI || !API_KEY || !ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_TOKEN) {
  console.error('FATAL ERROR: One or more required environment variables are missing.');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

// Mongoose schema for a timetable batch
const batchSchema = new mongoose.Schema({
  batch: { type: String, required: true, unique: true },
  Monday: { type: Array, default: [] },
  Tuesday: { type: Array, default: [] },
  Wednesday: { type: Array, default: [] },
  Thursday: { type: Array, default: [] },
  Friday: { type: Array, default: [] },
  Saturday: { type: Array, default: [] }
}, { collection: 'batches' });

const Batch = mongoose.model('Batch', batchSchema);

// Middleware: Validate API key (except for admin/health routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/admin') || req.path === '/health') return next();
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  next();
});

// Health Check
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Public route: Fetch all batches
app.get('/api/timetable', async (req, res) => {
  try {
    const batches = await Batch.find({});
    res.json(batches);
  } catch (err) {
    console.error('Error fetching timetable:', err);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Admin login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.json({ success: false, error: 'Invalid credentials' });
  }
});

// Admin update timetable - update or insert batches individually
app.post('/admin/update', async (req, res) => {
  const { token, data } = req.body;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Data must be an array' });
  }

  try {
    // Update or insert each batch
    const ops = data.map(batchData => {
      return Batch.findOneAndUpdate(
        { batch: batchData.batch },
        batchData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    await Promise.all(ops);

    // Fetch updated timetable to return
    const updatedBatches = await Batch.find({});
    res.json({ success: true, message: 'Timetable updated successfully', batches: updatedBatches });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update timetable' });
  }
});

// Optional: Fetch raw timetable for admin textarea or editor
app.get('/admin/raw-timetable', async (req, res) => {
  try {
    const batches = await Batch.find({});
    res.json({ batches });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch raw timetable' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
