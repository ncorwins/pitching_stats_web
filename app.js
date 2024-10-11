const express = require('express');
const path = require('path');
const http = require('http');
const pg = require('pg');
const WebSocket = require('ws');
const app = express();
const port = 3000;

const { Client } = pg;
const client = new Client({
    host: 'localhost',
    port: 5432, // use your postgres db port
    user: 'PITCHING_TESTER', // create this user/pw in your own postgres
    password: 'pg_admin',
    database: 'pitching_stats_db'
});

client.connect()
    .then(() => console.log("Connected to PostgreSQL database"))
    .catch(err => console.error("Connection error", err.stack));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {  // server receives a message
        const msgStr = message.toString();
        if (msgStr === 'getPitchers') { // client msg checks, default initial message
            try {
                const result = await client.query('SELECT * FROM pitcher ORDER BY last_name ASC');
                ws.send(JSON.stringify(result.rows)); // send data to index.html
            } catch (err) {
                ws.send(JSON.stringify({ error: 'Database query failed' })); // error
                console.error(err);
            }
        }


        try {
            if (msgStr != 'getPitchers') {
                console.log(msgStr);
                const result = await client.query('SELECT * FROM pitcher ORDER BY ' + msgStr);
                ws.send(JSON.stringify(result.rows)); // send data via websocket to html file
            }


        } catch (err) {
            ws.send(JSON.stringify({ error: 'Database query failed' })); // error
            console.error(err);
        }




    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// sending html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// start srv
server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/`);
});
