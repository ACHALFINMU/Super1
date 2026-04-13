// index.js - Improved Crash Prevention

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

// Middleware for error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Closed all connections.');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Connection stability improvements
const connections = new Set();

server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
});

// Proper memory management routine
setInterval(() => {
    if (global.gc) {
        global.gc();
        console.log('Garbage collected');
    } else {
        console.warn('No GC! Start your program with --expose-gc');
    }
}, 60000); // Run every minute

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
