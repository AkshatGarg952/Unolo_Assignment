# Unolo Field Force Tracker

A web application for tracking field employee check-ins at client locations.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js, SQLite
- **Authentication:** JWT

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm run setup    # Installs dependencies and initializes database
npm test         # Run unit tests
cp .env.example .env
npm run dev
```

Backend runs on: `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Test Credentials

| Role     | Email              | Password    |
|----------|-------------------|-------------|
| Manager  | manager@unolo.com | password123 |
| Employee | rahul@unolo.com   | password123 |
| Employee | priya@unolo.com   | password123 |

## Project Structure

```
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes
│   ├── scripts/         # Database init scripts
│   └── server.js        # Express app entry
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   └── utils/       # API helpers
│   └── index.html
└── database/            # SQL schemas (reference only)
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Check-ins
- `GET /api/checkin/clients` - Get assigned clients
- `POST /api/checkin` - Create check-in
  
  **API Update: Check-in Endpoint Refactoring**
  
  We have enhanced the check-in capability to support real-time location validation. This ensures better compliance by verifying the employee's proximity to the client.

  | Feature | Previous Implementation | Current Implementation |
  | :--- | :--- | :--- |
  | **Request Body** | `{ client_id, notes }` | `{ client_id, latitude, longitude, notes }` |
  | **Validation** | Basic existence check of Client ID. | Validates GPS coordinates and calculates distance. |
  | **Response** | Simple success message. | Returns calculated `distance_from_client` (km) and optional warning if > 0.5km. |
  | **Data Storage** | Captured time and status. | Now also persists `distance_from_client` for audit trails. |

  *Note: The system triggers a warning "You are far from the client location" if the distance exceeds 500 meters, but currently still allows the check-in to proceed.*
- `PUT /api/checkin/checkout` - Checkout
- `GET /api/checkin/history` - Get check-in history
- `GET /api/checkin/active` - Get active check-in

### Dashboard
- `GET /api/dashboard/stats` - Manager stats
- `GET /api/dashboard/employee` - Employee stats

### Reports
- `GET /api/reports/daily-summary` - Daily Summary Report (Manager only)
  - **Query Params**:
    - `date`: YYYY-MM-DD (required)
    - `employee_id`: integer (optional)
  - **Response Example**:
    ```json
    {
      "success": true,
      "data": {
        "date": "2024-01-27",
        "team_summary": {
          "total_checkins": 10,
          "total_hours": 35.5,
          "active_employees": 2,
          "total_unique_clients": 5
        },
        "employee_breakdown": [
          {
            "employee_id": 2,
            "employee_name": "John",
            "total_checkins": 5,
            "clients_visited_count": 3,
            "total_hours": 7.5
          }
        ]
      }
    }
    ```

## Notes

- The database uses SQLite - no external database setup required
- Run `npm run init-db` to reset the database to initial state


## Architecture Decisions & Bug Fixes

### Database Compatibility
- Switched to SQLite-compatible date functions (`datetime('now')` instead of `NOW()`) to prevent crashes.
- corrected schema mismatch: `latitude`/`longitude` columns are now used correctly instead of `lat`/`lng`.

### Security Improvements
- Auth: Implemented `await` for `bcrypt` password comparison to prevent authentication bypass.
- JWT: Removed hashed passwords from JWT payloads to prevent credential exposure.
- SQL Injection: Implemented parameterized queries for all user inputs.

### Data Integrity & Localization
- Timezone: Dashboard now strictly uses Indian Standard Time (IST) for "Today" calculations, ensuring accurate reporting for the local workforce.
- Location: Removed hardcoded fallback coordinates. The app now enforces ensuring real GPS data is available before check-in.

### User Experience & Performance
- Session Management: Switched from `localStorage` to `sessionStorage` to allow multiple users to log in on different tabs without session conflict.
- Performance: Memoized heavy calculations on the History page to prevent UI freezing.
- Error Handling: Corrected API status codes (200 -> 400) for better frontend error handling.
- Usability: Made login email case-insensitive.

### Reporting Architecture
- **Aggregation Strategy**: The daily summary report calculates working hours by summing the duration of completed check-ins (checkout - checkin).
- **Team Stats**: Unique client counts are aggregated using a distinct query to ensure accuracy at the team level (avoiding double-counting if two employees visit the same client).
- **Timezone**: Consistent with the dashboard, reports use IST (+05:30) for filtering daily records.

