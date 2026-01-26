# Bug Fixes

Here is the complete debugging report. Each issue is explained simply so you can understand exactly *why* it is happening.

## 1. Critical Functional Bugs (Prevents Usage)

### 1.1 SQL Schema Mismatch (Check-in Failure)
- **File:** `backend/routes/checkin.js` (Line 57)
- **Issue:** The code is trying to put data into the wrong "drawers" in the database. The database table was built with columns named `latitude` and `longitude` (like created in `init-db.js`). However, the check-in code is trying to save data into columns named `lat` and `lng`. Because `lat` and `lng` don't exist in the database table, the database rejects the action with a "Column not found" error, meaning check-ins fail 100% of the time.
- **Fix:** Change the code to use the correct column names: `INSERT INTO checkins (..., latitude, longitude, ...)`.
- **Status:** [FIXED]
    - **Location:** `backend/routes/checkin.js` (Lines 57-65)
    - **What was wrong:** The SQL `INSERT` statement used column names `lat` and `lng`, but the database schema uses `latitude` and `longitude`.
    - **How I fixed it:** I updated the SQL query to use the correct column names (`latitude`, `longitude`) to match the database schema.
    - **Why it is correct:** This ensures the data is inserted into the existing columns, resolving the "Column not found" error.

### 1.2 SQL Syntax Error (Double Quotes)
- **File:** `backend/routes/checkin.js` (Lines 45, 58, 88)
- **Issue:** In the language of databases (SQL), double quotes (`"`) are used to talk about the *names* of things (like tables or columns), while single quotes (`'`) are used for actual *text/data*. The code uses `status = "checked_in"`. The database thinks you are looking for a column named `checked_in`, not the status text "checked_in". Since no such column exists, the database throws an error, breaking check-ins and checkouts.
- **Fix:** Change double quotes to single quotes: `status = 'checked_in'`.
- **Status:** [FIXED]
    - **Location:** `backend/routes/checkin.js` (Line 45, 88)
    - **What was wrong:** The SQL queries used double quotes for string literals (`"checked_in"`, `"checked_out"`), which SQL interprets as column identifiers.
    - **How I fixed it:** I changed the double quotes to single quotes (`'checked_in'`, `'checked_out'`).
    - **Why it is correct:** Single quotes are the standard for string literals in SQL, ensuring the database treats them as values, not column names.

### 1.3 App Crash on History Page
- **File:** `frontend/src/pages/History.jsx` (Line 45)
- **Issue:** Start-up timing problem. When the History page first loads, it takes a moment to fetch data from the server. During this split second, the variable `checkins` is `null` (empty). The code immediately tries to do math (`.reduce`) on this empty variable before the data arrives. Trying to run a function on "nothing" causes the entire application to crash (White Screen of Death).
- **Fix:** Tell the code to wait or use an empty list if data isn't ready: `checkins?.reduce(...)`.
- **Status:** [FIXED]
    - **Location:** `frontend/src/pages/History.jsx` (Line 45)
    - **What was wrong:** The code attempted to run `.reduce()` on `checkins` while it was still `null` (loading state).
    - **How I fixed it:** I added a safety check `(checkins || []).reduce(...)` to treat `null` as an empty list.
    - **Why it is correct:** This prevents the "Cannot read properties of null" error during the initial load or if the API returns null.

### 1.4 SQLite Incompatibility (Dashboard Crash)
- **File:** `backend/routes/dashboard.js` (Line 80)
- **Issue:** The code is speaking a "dialect" of SQL that the database doesn't understand. It uses functions like `NOW()` and `DATE_SUB()` which work in MySQL databases but NOT in SQLite (which this project uses). It's like trying to speak French to someone who only knows Spanish; the database doesn't understand the command and throws a 500 Server Error.
- **Fix:** Translate to SQLite's dialect: `datetime('now', '-7 days')`.
- **Status:** [FIXED]
    - **Location:** `backend/routes/dashboard.js` (Line 80)
    - **What was wrong:** The SQL query used `NOW()` and `DATE_SUB()`, which are MySQL-specific functions not supported by SQLite.
    - **How I fixed it:** I replaced them with SQLite's `datetime('now', '-7 days')`.
    - **Why it is correct:** This uses standard SQLite date functions, ensuring the query executes correctly on the project's database.

### 1.5 SQLite Incompatibility (Check-out Failure)
- **File:** `backend/routes/checkin.js` (Line 118)
- **Issue:** Similar to Bug 1.4, the checkout code uses `NOW()` to record the checkout time. Since the project uses SQLite, `NOW()` causes a syntax error, preventing users from checking out.
- **Fix:** Change `NOW()` to `datetime('now')`.
- **Status:** [FIXED]
    - **Location:** `backend/routes/checkin.js` (Line 118)
    - **What was wrong:** The SQL update statement used `NOW()`, which is not supported by SQLite.
    - **How I fixed it:** I replaced it with `datetime('now')`.
    - **Why it is correct:** This provides the current timestamp in a format compatible with SQLite.

## 2. Security Vulnerabilities

### 2.1 Critical Auth Bypass (Login with ANY Password)
- **File:** `backend/routes/auth.js` (Line 28)
- **Issue:** The password checker (`bcrypt.compare`) is "async", meaning it takes a tiny bit of time to work and returns a "Promise" (a note saying "I'll tell you later"). The code forgets to wait for the answer (missing `await`). In JavaScript, a "Promise" note is considered "technically true" (truthy). So the code asks "Is the password valid?", looks at the "Promise" note instead of the actual answer, thinks "Yes", and lets the user in regardless of whether the password was actually correct.
- **Fix:** Add `await` so the code pauses to get the real Yes/No answer: `const isValidPassword = await bcrypt.compare(...)`.
- **Status:** [FIXED]
    - **Location:** `backend/routes/auth.js` (Line 28)
    - **What was wrong:** The code failed to `await` the asynchronous `bcrypt.compare` function, causing the login to succeed even with incorrect passwords (because the Promise object is truthy).
    - **How I fixed it:** I added the `await` keyword: `await bcrypt.compare(...)`.
    - **Why it is correct:** This ensures the code waits for the actual password comparison result (true/false) before proceeding.

### 2.2 Password Exposure in JWT
- **File:** `backend/routes/auth.js` (Line 35)
- **Issue:** When a user logs in, the server gives them a digital badge (JWT Token). The code accidentally wrote the user's *hashed password* onto this badge. Anyone who sees this badge (which is just Base64 encoded text) can read the hashed password. This is a huge security risk because hackers can use it to try and crack the original password.
- **Fix:** Remove `password: user.password` from the data put inside the token.
- **Status:** [FIXED]
    - **Location:** `backend/routes/auth.js` (Line 35)
    - **What was wrong:** The user's hashed password was included in the JWT payload, exposing it to anyone who decodes the token.
    - **How I fixed it:** I removed the `password` field from the object passed to `jwt.sign`.
    - **Why it is correct:** Tokens should only contain non-sensitive user identification data. Removing the password prevents exposure.

### 2.3 SQL Injection
- **File:** `backend/routes/checkin.js` (Line 112-116)
- **Issue:** The code takes text typed by the user (dates) and pastes it directly into the database command string. If a malicious user typed a database command instead of a date, the database would run it! This is called SQL Injection. It's like signing a blank check; you shouldn't trust what the user writes directly.
- **Fix:** Use "Parameterized Queries" (placeholders like `?`) so the database treats user input strictly as text, not commands.
- **Status:** [FIXED]
    - **Location:** `backend/routes/checkin.js` (Line 112-116)
    - **What was wrong:** User input (`start_date`, `end_date`) was directly concatenated into the SQL query string, allowing for SQL injection.
    - **How I fixed it:** I changed the query to use `?` placeholders and passed the values as parameters to `pool.execute`, which safely escapes the input.
    - **Why it is correct:** Parameterized queries strictly separate code from data, preventing malicious SQL injection attacks.

## 3. Logical & Data Bugs

### 3.1 Case Sensitive Login
- **File:** `backend/routes/auth.js` (Line 18)
- **Issue:** Computers are strict. "Rahul@email.com" is different from "rahul@email.com". If a user registered with lowercase but tries to login with uppercase (or phone auto-capitalizes it), the database says "User not found". This confuses valid users.
- **Fix:** Convert the email to lowercase before checking the database.
- **Status:** [FIXED]
    - **Location:** `backend/routes/auth.js` (Line 18)
    - **What was wrong:** The email lookup was case-sensitive, causing login failures for users who capitalized their email.
    - **How I fixed it:** I normalized the input email with `.toLowerCase()` before querying the database.
    - **Why it is correct:** Email addresses should be treated as case-insensitive for login purposes to improve user experience.

### 3.2 Timezone Data Discrepancy
- **File:** `backend/routes/dashboard.js`
- **Issue:** The server calculates "Today" using UTC time (London time). If you are in India (IST), "Today" starts 5.5 hours earlier. Check-ins made at 2 AM in India might be counted as "Yesterday" by the server because in London it's still the previous night. This makes the dashboard show 0 check-ins when there should be some.
- **Fix:** Calculate "Start of Day" and "End of Day" based on the user's timezone, not the server's.
- **Status:** [FIXED]
    - **Location:** `backend/routes/dashboard.js` (Line 10, 22, 55, 61)
    - **What was wrong:** The server calculated "Today" using UTC, causing check-ins from earlier timezones (like IST) to potentially fall on the previous day.
    - **How I fixed it:** I enforced the use of Indian Standard Time (IST) for date calculations and SQL queries using `datetime(..., '+05:30')` and `toLocaleDateString`.
    - **Why it is correct:** This matches the user's context (Unolo operates in India), ensuring 2 AM check-ins count as "today".

### 3.3 Incorrect API Status Code
- **File:** `backend/routes/checkin.js` (Line 30)
- **Issue:** If a user forgets to select a client (an error), the server says "OK, Success! (Status 200)" but also sends a message saying "Wait, actually it failed". This sends mixed signals to the frontend code/browser, which typically looks at the Status Code first. Errors should explicitly look like errors.
- **Fix:** Send a 400 Bad Request status code.
- **Status:** [FIXED]
    - **Location:** `backend/routes/checkin.js` (Line 30)
    - **What was wrong:** The API returned a `200 OK` status code even when the request was invalid (missing `client_id`), which confuses clients relying on status codes.
    - **How I fixed it:** I changed the status code to `400 Bad Request`.
    - **Why it is correct:** HTTP 400 is the standard status code for client-side errors like missing required fields, allowing proper error handling on the frontend.

### 3.4 Fake Location Data (Frontend)
- **File:** `frontend/src/pages/CheckIn.jsx`
- **Issue:** If the browser refuses to give the GPS location (e.g., privacy settings), the code secretly falls back to a hardcoded location (Gurugram). The user thinks they are checking in from their real spot, but the system records them in Gurugram. This creates fake data in the system.
- **Fix:** Don't fake it. If GPS fails, show an error and ask the user to enable permissions.
- **Status:** [FIXED]
    - **Location:** `frontend/src/pages/CheckIn.jsx` (Line 50-52)
    - **What was wrong:** The code silently fell back to a hardcoded location (Gurugram) when GPS failed, creating fake data.
    - **How I fixed it:** I removed the fallback and instead display an error message requesting GPS access.
    - **Why it is correct:** Data integrity is paramount; it is better to fail and prompt the user than to record falsified location data.

### 3.5 Performance Issue
- **File:** `frontend/src/pages/History.jsx`
- **Issue:** The code does a heavy math calculation (adding up hours) *every single time* the screen blinks or updates (renders). For a long list of history, this is like recalculating your entire tax return every time you blink. It makes the app feel slow and laggy.
- **Fix:** Use `useMemo` to remember the answer and only recalculate if the history data actually changes.
- **Status:** [FIXED]
    - **Location:** `frontend/src/pages/History.jsx` (Line 45)
    - **What was wrong:** The complex total hours calculation ran on every render, causing performance issues.
    - **How I fixed it:** I wrapped the calculation in `useMemo`, dependent only on the `checkins` array.
    - **Why it is correct:** React only recalculates the value when `checkins` changes, improving render performance.

### 3.6 Session Sharing (Ghost Login)
- **File:** `frontend/src/App.jsx` & `frontend/src/utils/api.js`
- **Issue:** Users reported that if they log in as Manager in Tab A, then open Tab B and log in as Employee, reloading Tab A suddenly switches it to the Employee account. This happens because `localStorage` is shared across all tabs of the same browser. Both tabs fight for the same save file.
- **Fix:** Switch from `localStorage` (shared) to `sessionStorage` (isolated per tab).
- **Status:** [FIXED]
    - **Location:** `frontend/src/App.jsx` (Lines 15-16, 25-26, 31-32) & `frontend/src/utils/api.js` (Line 12, 24-25)
    - **What was wrong:** The app used `localStorage` to save user sessions, which is shared across all browser tabs. This caused "cross-talk" between tabs logged into different accounts.
    - **How I fixed it:** I commented out the `localStorage` code and replaced it with `sessionStorage`.
    - **Why it is correct:** `sessionStorage` is unique to each tab. Closing the tab wipes it, and opening a new tab starts fresh. This completely isolates sessions so Tab A can be Manager and Tab B can be Employee without interfering.
