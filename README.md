# Timetable API Server

A RESTful API server for managing and serving academic timetable data with MongoDB backend and admin authentication.

## Features

- **CRUD Operations**: Manage timetable data for different batches
- **Admin Panel**: Secure admin interface for updating timetable
- **API Key Authentication**: Protect your endpoints with API keys
- **MongoDB Backend**: Persistent data storage
- **CORS & Security**: Built with CORS support and Helmet for security
- **Health Check**: `/health` endpoint for monitoring

## API Endpoints

### Public Endpoints
- `GET /health` - Health check endpoint
- `GET /api/timetable` - Fetch all timetable data (requires API key)

### Admin Endpoints
- `POST /admin/login` - Admin authentication
- `POST /admin/update` - Update timetable data (requires admin token)
- `GET /admin/raw-timetable` - Fetch raw timetable data (for admin editing)

## Environment Variables

Create a `.env` file with the following variables:

```env
MONGO_URI=mongodb_connection_string
API_KEY=your_api_key
ADMIN_USERNAME=admin_username
ADMIN_PASSWORD=admin_password
ADMIN_TOKEN=admin_jwt_token
PORT=3000 # optional
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/timetable-api.git
   cd timetable-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables (see above)

4. Start the server:
   ```bash
   node server.js
   ```

## Usage

### Fetching Timetable Data
```bash
curl -X GET \
  http://localhost:3000/api/timetable \
  -H 'x-api-key: your_api_key'
```

### Admin Login
```bash
curl -X POST \
  http://localhost:3000/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin_username","password":"admin_password"}'
```

### Updating Timetable
```bash
curl -X POST \
  http://localhost:3000/admin/update \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "admin_jwt_token",
    "data": [
      {
        "batch": "CS-2023",
        "Monday": ["Maths", "Physics"],
        "Tuesday": ["Chemistry", "Lab"],
        ...
      }
    ]
  }'
```

## Data Structure

Each batch document in MongoDB has the following structure:
```javascript
{
  batch: String,       // Unique batch identifier (e.g., "CS-2023")
  Monday: Array,        // Array of subjects/activities
  Tuesday: Array,
  Wednesday: Array,
  Thursday: Array,
  Friday: Array,
  Saturday: Array
}
```

## Dependencies

- express
- mongoose
- dotenv
- cors
- helmet
