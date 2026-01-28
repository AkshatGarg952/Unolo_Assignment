# Real-Time Location Tracking Architecture for Unolo

## Introduction

When I started researching how to implement real time location tracking for field employees, I realized there are quite a few different approaches we could take. The main challenge is getting location updates from thousands of mobile devices to a web dashboard continuously without killing battery life or overwhelming our servers. After looking into several options, I want to share what I found and what I think would work best for our use case.

## Technology Comparison

### WebSockets

WebSockets create a persistent two way connection between the client and server. Once established, both sides can send data at any time without the overhead of repeated HTTP requests.

Pros: Very efficient for bidirectional communication with low latency. Works well when you need the server to push updates to clients frequently.

Cons: Maintaining thousands of open connections is resource intensive. Connections can drop on unstable mobile networks and need reconnection logic. Some firewalls might block WebSocket connections.

When to use it: WebSockets make sense when you need real time bidirectional communication, like chat applications. For our case, it could work but might be overkill since we mainly need one way communication from devices to the server.

### Server-Sent Events

SSE allows servers to push updates to clients over a single HTTP connection. The client opens a connection and the server can send events whenever it wants, but the client cannot send data back through the same connection.

Pros: Simpler than WebSockets because it uses regular HTTP. Automatically handles reconnection if the connection drops. Less server overhead for one way communication.

Cons: Only works in one direction, server to client. Limited browser support on older devices. Not ideal when clients need to send frequent updates to the server.

When to use it: SSE is great for scenarios where the server needs to push updates to clients, like live news feeds or stock tickers. For our location tracking, this is backwards since we need devices to send data to the server.

### Long Polling

Long polling is when the client makes an HTTP request to the server, and the server holds the request open until it has new data to send back. Once the client receives a response, it immediately makes another request.

Pros: Works with standard HTTP so no special server requirements. Compatible with all browsers and network configurations. No issues with firewalls.

Cons: Creates a lot of HTTP overhead with constant request-response cycles. Not very efficient for high frequency updates. Higher latency compared to WebSockets.

When to use it: Long polling is a fallback option when you cannot use WebSockets or SSE due to compatibility issues.

### Third-Party Services

Services like Firebase, Pusher, or Ably provide managed infrastructure for real-time communication. They handle the complexity of maintaining connections, scaling, and delivering messages.

Pros: Very quick to implement. Handles scaling automatically. Built-in features like presence detection and offline support. Reduces development burden on our small team.

Cons: Ongoing costs that scale with usage. Less control over infrastructure. Vendor lock-in makes it harder to switch later.

When to use it: Third-party services are great for startups that need to move fast and do not want to build infrastructure from scratch.

## My Recommendation

After considering all the options, I would recommend using standard HTTP requests combined with a third party service for dashboard updates.

For location updates from mobile devices to our server, I would use simple HTTP POST requests every 30 seconds. The devices send their current location to our backend API, which stores it in the database. This is straightforward, works on any network, and gives us full control.

For pushing updates to the manager dashboard, I would use a service like Pusher or Ably. When our backend receives a location update, it forwards that update through the third party service to any connected dashboards.

Why this approach makes sense for Unolo:

Scale: With 10,000 employees sending updates every 30 seconds, that is about 333 requests per second. This is manageable with standard HTTP and a properly configured backend.

Battery: HTTP requests are battery efficient because the connection is not kept open. The device sends data and closes the connection immediately. Keeping a WebSocket connection alive would drain battery much faster.

Reliability: HTTP requests work on any network, even flaky ones. If a request fails, the device can retry. With WebSockets, dropped connections need complex reconnection logic.

Cost: For 10,000 devices sending updates every 30 seconds, we are looking at about 25 million messages per month. Most third-party services could handle this for a few hundred dollars per month, which is reasonable for a startup. Building our own WebSocket infrastructure would cost more in engineering time.

Development time: Our small team can implement this in a week or two. Using standard HTTP for uploads and a third-party SDK for dashboard updates means we do not need to build complex infrastructure.

## Trade-offs

By choosing this approach, I am sacrificing some things. We are not getting true real time updates from devices. There is a 30 second delay between location changes and when we see them. But for field force management, 30 second intervals should be sufficient.

We are introducing a dependency on a third-party service for the dashboard. If Pusher has an outage, manager dashboards will not update in real time. However, the location data is still being saved to our database.

We are paying ongoing costs that scale with usage. If we grow to 100,000 employees, the third party service costs will increase significantly.

What would make me reconsider: If we needed updates more frequently than every 30 seconds, the HTTP approach might create too much server load. If the third party service costs become significant, it would be worth building our own WebSocket server. If we have strict data privacy requirements, we would need to build everything in-house.

At what scale this breaks down: The HTTP upload approach should work up to about 50,000 to 100,000 devices before we need load balancing and database sharding. The third party service bottleneck would likely be cost rather than technical capability.

## High-Level Implementation

Backend changes: Create a new API endpoint POST /api/locations that accepts latitude, longitude, timestamp, and employee ID. Validate the incoming data and store it in a locations table. After saving to the database, publish the location update to Pusher using their server SDK. Add rate limiting to prevent abuse and set up database indexes on employee ID and timestamp for fast queries.

Frontend and mobile changes: On the mobile app, use the device GPS to get the current location every 30 seconds and send an HTTP POST request to our backend. Handle errors gracefully and queue failed requests for retry. On the manager dashboard, integrate the Pusher client SDK and subscribe to location update events. When an update comes in, move the marker on the map to the new position.

Infrastructure needs: Sign up for a Pusher account and configure the backend to use those credentials for publishing events. Make sure our backend can handle the incoming request load. Set up monitoring to track request rates and error rates. Consider adding a caching layer like Redis to store the most recent location for each employee.

## Conclusion

For Unolo at our current stage, I believe a hybrid approach using HTTP for uploads and a third-party service for dashboard updates gives us the best balance of simplicity, cost, and reliability. As we grow, we can revisit this decision and potentially build more infrastructure ourselves. The key is to start with something that works and iterate based on real usage patterns.
