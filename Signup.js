const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path'); // Import path module

const app = express();
const port = 3007;

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'musical_loca'
});

// Connect to MySQL database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Parse incoming requests with JSON payloads
app.use(bodyParser.json());

// Serve static files from the 'Capstone' directory
app.use(express.static(path.join(__dirname, 'Capstone')));

// Handle POST request to /signup
app.post('/signup', (req, res) => {
    const { name, email, username, bio, password } = req.body;

    // Insert user data into the database
    const query = `INSERT INTO users (name, email, username, bio, password) VALUES (?, ?, ?, ?, ?)`;
    connection.query(query, [name, email, username, bio, password], (error, results, fields) => {
        if (error) {
            console.error('Error inserting user:', error);
            res.status(500).json({ error: 'An error occurred while signing up.' });
        } else {
            console.log('User signed up successfully');

            // Send a response to the client indicating successful signup
            res.status(200).json({ message: 'User signed up successfully' });
        }
    });
});

// Handle 404 Not Found errors
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

