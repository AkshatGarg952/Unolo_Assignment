
1. If this app had 10,000 employees checking in simultaneously, what would break first? How would you fix it?

The SQLite database would handle the traffic poorly and break first. Since SQLite is a file based database, it struggles with high write concurrency because it locks the database file when writing. With 10,000 simultaneous checkins, the file locking would cause massive delays and timeouts. The synchronous nature of the better sqlite3 driver in Node.js would also block the event loop, making the server unresponsive.

To fix this, I would migrate from SQLite to a dedicated database server like PostgreSQL or MySQL, which are built to handle thousands of concurrent connections. I would also implement connection pooling to manage the database connections efficiently. To further protect the database, I would introduce a message queue like RabbitMQ to buffer the incoming check in requests, allowing the server to process them at a manageable rate instead of trying to do everything at once.

2. The current JWT implementation has a security issue. What is it and how would you improve it?

There were actually two big issues found in the code. First, passing the wrong password would still let you in because the code was not waiting for the password check to finish. It returned a promise which is always true. Second, the password was actually being saved inside the JWT token which is a huge security risk. I fixed the login logic to properly wait for the password check and I removed the password from the token creation.

3. How would you implement offline check-in support? (Employee has no internet, checks in, syncs later)

I would implement a local queue on the mobile application. When an employee attempts to check in without internet, the app would save the request details including the timestamp, GPS coordinates, and any notes into local storage like SQLite on the device or Async Storage.

On the backend, I would update the check in API to accept a capture timestamp field. Currently, the server uses the time it receives the request, which would be incorrect for offline syncs. The server needs to respect the time the event actually happened on the device.

When the device comes back online, a background process would iterate through the local queue and send the requests to the server in the order they were created. The backend would verify these timestamps and insert them into the history, potentially flagging them as offline sync so managers are aware the location data was captured earlier.

4. Explain the difference between SQL and NoSQL databases. For this Field Force Tracker application, which would you recommend and why? Consider factors like data structure, scaling, and query patterns.

SQL databases are table based and use structured data with relationships while NoSQL are document or key value based and refer flexible data models. For this application I would recommend SQL. The data here is clearly relational where employees are assigned to clients and checkins belong to employees. SQL makes it easy to join these tables for reports which is a core feature of this tracker.

5. What is the difference between authentication and authorization? Identify where each is implemented in this codebase.

Authentication comes down to verifying who a user is while authorization determines what they are actually allowed to do. In this codebase authentication is handled by the authenticateToken function in the auth middleware which checks the JWT token. Authorization is seen in the requireManager function which ensures the user has the manager role before allowing access to certain routes.

6. Explain what a race condition is. Can you identify any potential race conditions in this codebase? How would you prevent them?

A race condition happens when two processes try to change shared data at the same time and the final outcome depends on who finishes first. I found a clear one in the checkin logic. The code first checks if a user is already checked in and then inserts a new row. If two requests come in at the exact same millisecond both could see that the user is not checked in and both would insert a new row creating duplicate active checkins. To prevent this I would use a unique database constraint or wrap the check and insert actions in a transaction.
