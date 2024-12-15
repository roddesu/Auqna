const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3003;

// CORS configuration
app.use(cors({
  origin: ['http://192.168.1.3:3003'], // Adjust frontend URL if needed
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

// Forgot Password endpoint
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

  // Update the user record with the OTP and expiration time
  const query = `
    UPDATE users
    SET otp = ?, otp_expired_at = ?
    WHERE email = ?;
  `;

  db.query(query, [otp, otpExpiration, email], (err, result) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // Logic to send OTP via email (not implemented in this snippet)
    // sendOtpToEmail(email, otp);

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  });
});

// Verify OTP for Forgot Password
app.post('/verify-forgot-password-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const query = `SELECT otp, otp_expired_at FROM users WHERE email = ?`;

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const userOtp = results[0].otp;
    const otpExpiration = new Date(results[0].otp_expired_at);

    if (String(otp) !== String(userOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > otpExpiration) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // OTP is valid, now allow the user to reset their password
    res.status(200).json({ success: true, message: 'OTP verified successfully. Proceed to reset password.' });
  });
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

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

    res.status(200).json({ success: true, message: 'OTP verified successfully. Proceed to reset password.' });
  });
});

// Reset password endpoint
app.post('/reset-password', (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  // Log the incoming request body for debugging
  console.log('Request body:', req.body); // This will help you inspect what the backend is receiving

  // Validate that all required fields are provided
  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  // Validate that the new password and confirm password match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  // Validate the password length (at least 6 characters)
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  // Query to check if the OTP is valid and not expired
  const query = `SELECT otp, otp_expired_at FROM users WHERE email = ? AND otp = ?;`;

  db.query(query, [email, otp], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const otpExpiration = new Date(results[0].otp_expired_at);

    // Check if the OTP has expired
    if (new Date() > otpExpiration) {
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    }

    // Hash the new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update the user's password and reset OTP-related fields
    const updateQuery = `UPDATE users SET password = ?, otp = NULL, otp_expired_at = NULL, last_password_reset_at = NOW() WHERE email = ?;`;

    db.query(updateQuery, [hashedPassword, email], (err, result) => {
      if (err) {
        console.error('Database Error during password reset:', err);
        return res.status(500).json({ success: false, message: 'Failed to reset password.' });
      }

      res.status(200).json({ success: true, message: 'Password reset successfully.' });
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
    const [posts] = await db.promise().query('SELECT posts.post_id, posts.user_id, posts.post_content, posts.comment_count, posts.post_created_at, users.email FROM posts INNER JOIN users ON posts.user_id = users.id ORDER BY posts.post_created_at DESC');
    
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

// New endpoint to update post content
app.put('/update-post/:postId', async (req, res) => {
  const postId = req.params.postId;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  const updateQuery = 'UPDATE posts SET post_content = ?, post_updated_at = NOW() WHERE post_id = ?';

  try {
    await db.promise().query(updateQuery, [content, postId]);
    res.status(200).json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Failed to update post' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://192.168.1.3:${port}`);
});