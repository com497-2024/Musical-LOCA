const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const session = require('express-session');
const mysql = require('mysql');
const fileUpload = require('express-fileupload');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: "thisismysecrctekey",
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false
}));
app.use(fileUpload());
app.use(express.static(__dirname));

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "musical_loca"
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/signup', (req, res) => {
    const { name, email, username, bio, password, verifyPassword } = req.body;
    const sql = 'INSERT INTO user (name, email, username, bio, password, verifypassword) VALUES (?, ?, ?, ?, ?, ?)';
    con.query(sql, [name, email, username, bio, password, verifyPassword], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        res.redirect('/login.html');
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    con.query('SELECT * FROM user WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/Profilepage.html');
        } else {
            res.send('Username or password is incorrect');
        }
    });
});

// Fetch specific user data
app.get('/getUserData', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    const userId = req.session.user.id;
    con.query('SELECT username, bio, zip_code, profile_pic_path FROM user WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results[0]);
    });
});

// Update user profile
app.post('/updateProfile', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    const { zip_code } = req.body;
    const userId = req.session.user.id;
    let profilePicPath = req.session.user.profile_pic_path; // Default to current profile picture path

    if (req.files && req.files.profilePicture) {
        const profilePicture = req.files.profilePicture;
        profilePicPath = `uploads/${Date.now()}-${profilePicture.name}`;

        profilePicture.mv(profilePicPath, err => {
            if (err) {
                console.error('Failed to upload profile picture:', err);
                return res.status(500).send('Failed to upload profile picture');
            }

            // Update profile picture path in the database
            con.query('UPDATE user SET profile_pic_path = ? WHERE id = ?', [profilePicPath, userId], (err, result) => {
                if (err) {
                    console.error('Failed to update profile picture in database:', err);
                    return res.status(500).send('Failed to update profile picture in database');
                }
            });
        });
    }

    // Update zip code in the database
    con.query('UPDATE user SET zip_code = ? WHERE id = ?', [zip_code, userId], (err, result) => {
        if (err) {
            console.error('Failed to update zip code in database:', err);
            return res.status(500).send('Failed to update zip code in database');
        }
        
        // Send response after updating profile information
        res.send({ message: 'Profile updated successfully' });
    });
});


// Route to create a post
app.post('/createPost', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    const { content } = req.body;
    const userId = req.session.user.id;
    let imagePath = req.files && req.files.image ? `uploads/${Date.now()}-${req.files.image.name}` : null;
    if (imagePath) {
        req.files.image.mv(imagePath);
    }
    const sql = 'INSERT INTO posts (user_id, content, image_path) VALUES (?, ?, ?)';
    con.query(sql, [userId, content, imagePath], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.send({ message: 'Post created successfully' });
    });
});

// Route to create an event
app.post('/createEvent', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    const { title, description, event_date } = req.body;
    const userId = req.session.user.id;
    let imagePath = req.files && req.files.image ? `uploads/${Date.now()}-${req.files.image.name}` : null;
    if (imagePath) {
        req.files.image.mv(imagePath);
    }
    const sql = 'INSERT INTO events (user_id, title, description, event_date, image_path) VALUES (?, ?, ?, ?, ?)';
    con.query(sql, [userId, title, description, event_date, imagePath], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.send({ message: 'Event created successfully' });
    });
});
// Personalized Posts for logged-in user
app.get('/getMyPosts', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    const userId = req.session.user.id;
    const queryPosts = `
        SELECT p.*, u.username, u.profile_pic_path
        FROM posts p
        JOIN user u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC;
    `;
    con.query(queryPosts, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results);
    });
});

// Personalized Events for logged-in user
app.get('/getMyEvents', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('User not logged in');
    }
    const userId = req.session.user.id;
    const queryEvents = `
        SELECT e.*, u.username, u.profile_pic_path 
        FROM events e 
        JOIN user u ON e.user_id = u.id 
        WHERE e.user_id = ?
        ORDER BY e.event_date ASC;
    `;
    con.query(queryEvents, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results);
    });
});



// Fetch all posts including user details for homepage.html page
app.get('/getPosts', (req, res) => {
    const queryPosts = `
        SELECT p.*, u.username, u.profile_pic_path
FROM posts p
JOIN user u ON p.user_id = u.id
ORDER BY p.created_at DESC;

    `;
    con.query(queryPosts, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results);
    });
});

// Fetch all events including user details for Homepage.html
app.get('/getEvents', (req, res) => {
    const queryEvents = `
        SELECT e.*, u.username, u.profile_pic_path 
        FROM events e 
        JOIN user u ON e.user_id = u.id 
        ORDER BY e.event_date ASC;
    `;
    con.query(queryEvents, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results);
    });
});
// Fetch all user details for friends.html page
app.get('/getAllUsers', (req, res) => {
    con.query('SELECT username, email, zip_code, bio, profile_pic_path FROM user', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results);
    });
});


http.listen(3002, () => {
    console.log('Server running on port 3002');
});


    
