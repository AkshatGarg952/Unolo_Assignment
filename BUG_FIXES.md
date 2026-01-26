Bug Fixes

Here is the complete debugging report. Each issue is explained simply so you can understand exactly why it is happening.

1. Critical Functional Bugs

1.1 SQL Schema Mismatch
This issue made check ins fail because the code was trying to put data into the wrong drawers in the database.

1. Location: backend/routes/checkin.js on line 57

2. What was wrong: The code was trying to save data into columns named lat and lng. However the database table was built with columns named latitude and longitude. Because lat and lng do not exist in the database table the database rejects the action with a Column not found error.

3. How I fixed it: I updated the SQL query to use the correct column names latitude and longitude instead of lat and lng.

4. Why it is correct: This ensures the data is inserted into the existing columns which resolves the Column not found error.


1.2 SQL Syntax Error
The database was throwing an error because it didn't understand the quote marks used in the code.

1. Location: backend/routes/checkin.js on lines 45 58 and 88

2. What was wrong: The code used double quotes for status equal to checked in. In SQL double quotes are for column names and single quotes are for text. The database thought checked in was a column name that did not exist.

3. How I fixed it: I changed the double quotes to single quotes.

4. Why it is correct: Single quotes are the standard for text in SQL so the database now treats them as values instead of column names.


1.3 App Crash on History Page
The app would crash with a white screen when opening the History page.

1. Location: frontend/src/pages/History.jsx on line 45

2. What was wrong: When the page first loads the data variable is empty. The code tried to do math on this empty variable before the data arrived from the server which caused the crash.

3. How I fixed it: I added a safety check to tell the code to wait or use an empty list if the data is not ready yet.

4. Why it is correct: This prevents the crash by treating the initial empty state safely.


1.4 SQLite Incompatibility in Dashboard
The dashboard was crashing because the code used database commands that this specific database does not understand.

1. Location: backend/routes/dashboard.js on line 80

2. What was wrong: The code used functions like NOW and DATE SUB which work in MySQL but not in SQLite. It is like speaking the wrong language to the database.

3. How I fixed it: I replaced those functions with the correct SQLite equivalents.

4. Why it is correct: The query now uses standard SQLite commands so it executes correctly without errors.


1.5 SQLite Incompatibility in Check out
Users could not check out because of another language mismatch with the database.

1. Location: backend/routes/checkin.js on line 118

2. What was wrong: The checkout code used the NOW function to record time which SQLite does not support causing a syntax error.

3. How I fixed it: I replaced NOW with the correct datetime function for SQLite.

4. Why it is correct: This provides the current timestamp in a format that SQLite understands.


2. Security Vulnerabilities

2.1 Critical Auth Bypass
Users could login with any password even if it was wrong.

1. Location: backend/routes/auth.js on line 28

2. What was wrong: The password checker is asynchronous which means it takes time. The code forgot to wait for the answer so it just looked at the promise note instead of the result and let everyone in.

3. How I fixed it: I added the await keyword so the code actually pauses to check if the password is valid.

4. Why it is correct: This ensures the code waits for the true or false result before deciding to let the user in.


2.2 Password Exposure in JWT
The user password was being accidentally shared in the login token.

1. Location: backend/routes/auth.js on line 35

2. What was wrong: The code included the hashed password in the digital badge given to users. Anyone who saw the badge could read the hashed password which is a security risk.

3. How I fixed it: I removed the password from the data put inside the token.

4. Why it is correct: Tokens should only contain user ID data not sensitive secrets like passwords.


2.3 SQL Injection
The system was vulnerable to hackers rewriting database commands.

1. Location: backend/routes/checkin.js on lines 112 to 116

2. What was wrong: The code pasted user text directly into database commands. If a user typed code instead of a date the database would run it.

3. How I fixed it: I switched to using parameterized queries which keep data separate from commands.

4. Why it is correct: This completely prevents SQL injection attacks by treating user input strictly as text.


3. Logical and Data Bugs

3.1 Case Sensitive Login
Users with capital letters in their email could not login.

1. Location: backend/routes/auth.js on line 18

2. What was wrong: The search was case sensitive so Rahul at email.com was considered different from rahul at email.com.

3. How I fixed it: I converted the email to lowercase before searching the database.

4. Why it is correct: Login should be case insensitive to be user friendly.


3.2 Timezone Data Discrepancy
The dashboard was showing zero check ins because of time zone differences.

1. Location: backend/routes/dashboard.js

2. What was wrong: The server used UTC time. If you are in India the day starts 5.5 hours earlier. Late night check ins were being counted as yesterday by the server.

3. How I fixed it: I forced the code to calculate the start and end of the day using Indian Standard Time.

4. Why it is correct: This ensures that check ins made in India are correctly counted for the day they happened locally.


3.3 Incorrect API Status Code
The server was sending mixed signals when a client was missing.

1. Location: backend/routes/checkin.js on line 30

2. What was wrong: When an error occurred the server sent a Success status code 200 along with an error message which confused the browser.

3. How I fixed it: I changed the status code to 400 Bad Request.

4. Why it is correct: This helps the frontend code correctly understand that an error happened.


3.4 Fake Location Data
The app was recording fake locations when GPS failed.

1. Location: frontend/src/pages/CheckIn.jsx

2. What was wrong: If GPS failed the code secretly used a hardcoded location in Gurugram. This meant users thought they were checking in but the data was fake.

3. How I fixed it: I removed the fake location fallback and ensured it shows an error instead.

4. Why it is correct: Data integrity is important and we should not record false data.


3.5 Performance Issue
The history page was slow because it did too much math.

1. Location: frontend/src/pages/History.jsx

2. What was wrong: The code calculated total hours every single time the screen updated even if the data had not changed.

3. How I fixed it: I wrapped the calculation in a memory function so it only runs when necessary.

4. Why it is correct: This improves performance by avoiding wasted calculations.


3.6 Session Sharing
Users logging into different accounts in different tabs saw their sessions mix up.

1. Location: frontend/src/App.jsx and frontend/src/utils/api.js

2. What was wrong: The app stored login info in local storage which is shared by all tabs. So Tab A and Tab B would overwrite each other.

3. How I fixed it: I switched to session storage which is unique to each specific tab.

4. Why it is correct: This completely isolates sessions so you can be a Manager in one tab and an Employee in another without interference.
