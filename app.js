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
    port: 5432,                     // use your postgres db port
    user: 'PITCHING_TESTER',        // create this user/pw in your own postgres
    password: 'pg_admin',           // password for the PITCHING_TESTER user
    database: 'pitching_stats_db'   // name of database
});

client.connect()
    .then(() => console.log("Connected to PostgreSQL database"))
    .catch(err => console.error("Connection error", err.stack));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '/assets')));

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {  // server receives a message
        const msgStr = message.toString();
        const [queryType, ...params] = msgStr.split(':');
        console.log(`Received message: ${msgStr}`);
        console.log(`Query Type: ${queryType}, Param1: ${params[0]}, Param2: ${params[1]}`);
        
        if (queryType === 'getPitchers') { // client msg checks, default initial message
            try {
                const result = await client.query('SELECT * FROM pitcher ORDER BY last_name ASC');
                ws.send(JSON.stringify(result.rows)); // send data to index.html
            } catch (err) {
                ws.send(JSON.stringify({ error: 'Database query failed' })); // error
                console.error(err);
            }
        } else if(queryType === 'getPitchersByTeam'){//dropdown, filter pitchers by each team
            console.log(`Handling query of type: ${queryType}`)
            try{
                console.log(`Executing Query: SELECT * FROM pitcher p JOIN team t ON p.team_id = t.team_id WHERE t.team_name = $1 with param ${params[0]}`);
                const resu = await client.query('SELECT * FROM pitcher p JOIN team t ON p.team_id = t.team_id WHERE t.team_name = $1', [params[0]]);//sql query for filtering pitchers by team
                ws.send(JSON.stringify(resu.rows));
            } catch(err) {
                ws.send(JSON.stringify({ error: 'Database query failed' })); // error
                console.error(err);
            }
        } else if (queryType === 'getPitchersByName') {
            console.log(`Handling query of type: ${queryType}`);
            const firstName = params[0] ? params[0].trim() : '';
            const lastName = params[1] ? params[1].trim() : '';
            let query = 'SELECT * FROM pitcher p';
            const queryParams = [];
            let conditions = [];
        
            if (firstName) {
                conditions.push(`LTRIM(p.first_name) ILIKE $${queryParams.length + 1}`);
                queryParams.push(firstName);
            }
            if (lastName) {
                conditions.push(`p.last_name ILIKE $${queryParams.length + 1}`);
                queryParams.push(lastName);
            }
        
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' OR ');
            }
        
            try {
                console.log(`Executing query: ${query} with params ${queryParams}`);
                const resu = await client.query(query, queryParams);
                ws.send(JSON.stringify(resu.rows));
            } catch (err) {
                ws.send(JSON.stringify({ error: 'Database query failed' }));
                console.error(err);
            }
        } else {
            try {
               if (queryType != 'getPitchers') {
                   console.log(msgStr);
                    const result = await client.query('SELECT * FROM pitcher ORDER BY ' + msgStr);
                    ws.send(JSON.stringify(result.rows)); // send data via websocket to html file
             }


           } catch (err) {
              ws.send(JSON.stringify({ error: 'Database query failed' })); // error
            console.error(err);
            }
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
