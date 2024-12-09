const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3001;

// CORS configuration
app.use(cors({
  origin: ['http://192.168.1.3:3001'], // Adjust frontend URL if needed
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Replace with your database password
  database: 'safespacedb',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL Database.');
});

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail', // or other mail service
  auth: {
    user: 'ubsafespace@gmail.com', // Replace with your email
    pass: 'qzxh dvor jfhr pics', // Replace with your email password or app password
  },
});

// Register endpoint
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  console.log('Register request:', req.body);

  const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiration = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes expiration

    const hashedPassword = bcrypt.hashSync(password, 10);

    const query = `
      INSERT INTO users (email, password, otp, otp_expired_at, is_verified)
      VALUES (?, ?, ?, ?, false);
    `;

    db.query(query, [email, hashedPassword, otp, otpExpiration], (err) => {
      if (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ success: false, message: 'Database error', error: err.message });
      }

      const mailOptions = {
        from: 'ubsafespace@gmail.com',
        to: email,
        subject: 'Your OTP for Registration',
        text: `Your OTP is: ${otp}`,
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          console.error('Email Error:', error);
          return res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
        }

        res.status(200).json({ success: true, message: 'OTP sent successfully' });
      });
    });
  });
});

// Login endpoint (No JWT)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [user] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const storedHashedPassword = user[0].password;
    const isValidPassword = await bcrypt.compare(password, storedHashedPassword);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }

    if (!user[0].is_verified) {
      return res.status(403).json({ success: false, message: 'Account not verified.' });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user[0].id,
        email: user[0].email,
      },
    });
  } catch (error) {
    console.error('Server error during login:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// OTP verification endpoint
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  const query = `SELECT otp, otp_expired_at FROM users WHERE email = ?`;

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userOtp = results[0].otp;
    const otpExpiration = new Date(results[0].otp_expired_at);

    if (String(otp) !== String(userOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > otpExpiration) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    const updateQuery = `UPDATE users SET is_verified = true WHERE email = ?`;

    db.query(updateQuery, [email], (updateErr) => {
      if (updateErr) {
        console.error('Database Error during verification:', updateErr);
        return res.status(500).json({ success: false, message: 'Failed to verify user' });
      }

      res.status(200).json({ success: true, message: 'OTP verified successfully' });
    });
  });
});

// Create Post endpoint (No JWT)
app.post('/create-post', async (req, res) => {
  const { userId, content } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ success: false, message: 'User ID and content are required' });
  }

  const query = `
    INSERT INTO posts (user_id, post_content)
    VALUES (?, ?);
  `;

  try {
    const [result] = await db.promise().query(query, [userId, content]);

    const newPost = {
      post_id: result.insertId,
      user_id: userId,
      post_content: content,
      post_created_at: new Date().toISOString(),
      post_updated_at: null,  // Initially, no updates
    };

    res.status(201).json({ success: true, message: 'Post created successfully', postId: result.insertId, post: newPost });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

// Get all posts endpoint
app.get('/get-posts', async (req, res) => {
  try {
    const [posts] = await db.promise().query('SELECT posts.post_id, posts.user_id, posts.post_content, posts.post_created_at, users.email FROM posts INNER JOIN users ON posts.user_id = users.id ORDER BY posts.post_created_at DESC');
    
    res.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// Create Comment endpoint
app.post('/create-comment', async (req, res) => {
  const { postId, userId, comment } = req.body;

  if (!postId || !comment) {
    return res.status(400).json({ message: 'Missing required fields: postId or comment' });
  }

  try {
    const [post] = await db.promise().query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (post.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Insert the comment into the database
    const query = `INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`;
    const [result] = await db.promise().query(query, [postId, userId, comment]);

    // Update the post's comment count
    const updateQuery = 'UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = ?';
    await db.promise().query(updateQuery, [postId]);

    res.status(201).json({
      message: 'Comment posted successfully',
      comment: {
        id: result.insertId,
        postId,
        userId,
        content: comment,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment', error: error.message });
  }
});

// Get comments for a post
app.get('/get-comments/:postId', async (req, res) => {
  const postId = req.params.postId;
  try {
    const [comments] = await db.promise().query('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC', [postId]);
    res.status(200).json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on http://192.168.1.3:${port}`);
});
