// server.js

const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3000;

// Create a MySQL connection
const db = mysql.createConnection({
    host: 'your-host',
    user: 'your-username',
    password: 'your-password',
    database: 'musical_loca',
});

// Connect to MySQL
db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// Express middleware to parse JSON requests
app.use(express.json());

// Endpoint for searching users
app.get('/searchUsers', (req, res) => {
    const searchTerm = req.query.search;

    // Perform a MySQL query to search for users
    const query = `SELECT * FROM user WHERE username LIKE '%${searchTerm}%'`;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results);
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
