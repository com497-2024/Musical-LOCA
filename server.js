const fs = require('fs');
const fileUpload = require('express-fileupload');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const session = require('express-session');
const mysql = require('mysql');

const app = express();

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
    const { name, email, username, bio, password, verifyPassword } = req.body; // Corrected the name here

    con.query('SELECT * FROM user WHERE username = ? AND password = ?', [username, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error");
        }

        if (result.length > 0) {
            console.log("failed registration");
            res.sendFile(path.join(__dirname, 'failReg.html'));
        } else {
            const sql = 'INSERT INTO user (name, email, username, bio, password, verifypassword) VALUES (?, ?, ?, ?, ?, ?)';
            con.query(sql, [name, email, username, bio, password, verifyPassword], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Internal Server Error");
                }
                res.redirect('Login.html');
            });
        }
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
// Fetch user data
app.get('/getUserData', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send({ error: 'User not logged in' });
    }

    const userId = req.session.user.id;
    // Include 'bio' in your SELECT query
    con.query('SELECT username, bio, zip_code, profile_pic_path FROM user WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send({ error: 'Internal Server Error' });
        }
        if (results.length > 0) {
            // Ensure that 'bio' is also being sent back to the client
            res.json(results[0]);
        } else {
            res.status(404).send({ error: 'User not found' });
        }
    });
});

// Profile update handler
app.post('/updateProfile', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('User not logged in');
    }

    const userId = req.session.user.id;
    let zip_code = req.body.zip_code;
    let profilePicPath;

    if (req.files && req.files.profilePicture) {
        const profilePicture = req.files.profilePicture;
        profilePicPath = `uploads/${Date.now()}-${profilePicture.name}`;
        profilePicture.mv(`${__dirname}/${profilePicPath}`, err => {
            if (err) return res.status(500).send('Failed to upload image');
            updateDB(zip_code, profilePicPath);
        });
    } else {
        profilePicPath = req.session.user.profile_pic_path; // Use the existing path if no new image is uploaded
        updateDB(zip_code, profilePicPath);
    }

    function updateDB(zip_code, profilePicPath) {
        con.query('UPDATE user SET zip_code = ?, profile_pic_path = ? WHERE id = ?', [zip_code, profilePicPath, userId], err => {
            if (err) return res.status(500).send('Failed to update profile');
            req.session.user.zip_code = zip_code;
            req.session.user.profile_pic_path = profilePicPath;
            res.send({ message: 'Profile updated successfully' });
        });
    }
});
// Route to create a post
app.post('/createPost', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('User not logged in');
    }
    const userId = req.session.user.id;
    const { content } = req.body;
    let imagePath = null;
    if (req.files && req.files.image) {
        const image = req.files.image;
        imagePath = `uploads/${Date.now()}-${image.name}`;
        image.mv(`${__dirname}/${imagePath}`);
    }

    const sql = `INSERT INTO posts (user_id, content, image_path) VALUES (?, ?, ?)`;
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
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('User not logged in');
    }
    const userId = req.session.user.id;
    const { title, description, event_date } = req.body;
    let imagePath = null;
    if (req.files && req.files.image) {
        const image = req.files.image;
        imagePath = `uploads/${Date.now()}-${image.name}`;
        image.mv(`${__dirname}/${imagePath}`);
    }

    const sql = `INSERT INTO events (user_id, title, description, event_date, image_path) VALUES (?, ?, ?, ?, ?)`;
    con.query(sql, [userId, title, description, event_date, imagePath], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.send({ message: 'Event created successfully' });
    });
});
// Route to fetch posts
app.get('/getPosts', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('User not logged in');
    }
    const userId = req.session.user.id;
    con.query('SELECT * FROM posts WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results);
    });
});

// Route to fetch events
app.get('/getEvents', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('User not logged in');
    }
    const userId = req.session.user.id;
    con.query('SELECT * FROM events WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(results);
    });
});

// Serving static files from the current directory
app.use(express.static(__dirname));

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

