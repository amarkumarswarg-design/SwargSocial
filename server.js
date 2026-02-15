const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swarg-social';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const JWT_SECRET = process.env.JWT_SECRET || 'swarg-social-secret-key-2025';

// ===================== MODELS =====================
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  dp: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  createdAt: { type: Date, default: Date.now }
});

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  photo: { type: String, default: '' },
  privacy: { type: String, enum: ['public', 'private'], default: 'public' },
  inviteLink: { type: String, unique: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const ContactSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contactUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customName: { type: String, default: '' }
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);
const Message = mongoose.model('Message', MessageSchema);
const Group = mongoose.model('Group', GroupSchema);
const Contact = mongoose.model('Contact', ContactSchema);

// ===================== MIDDLEWARE =====================
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ===================== MULTER SETUP =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ===================== UTILS =====================
function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `+1(${areaCode})${prefix}-${line}`;
}

// ===================== ROUTES =====================
// Register
app.post('/api/register', upload.single('dp'), async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'सभी फील्ड भरें' });
    }

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'यूज़रनेम पहले से मौजूद है' });

    let phoneNumber;
    do {
      phoneNumber = generatePhoneNumber();
    } while (await User.findOne({ phoneNumber }));

    const hashedPassword = await bcrypt.hash(password, 10);
    let dpUrl = '';

    if (req.file) {
      const compressedPath = path.join(__dirname, 'uploads', `compressed-${req.file.filename}`);
      await sharp(req.file.path)
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toFile(compressedPath);
      
      dpUrl = `/uploads/compressed-${req.file.filename}`;
      fs.unlinkSync(req.file.path); // Delete original
    }

    const user = new User({
      name,
      username,
      password: hashedPassword,
      phoneNumber,
      dp: dpUrl
    });
    await user.save();

    res.json({ 
      phoneNumber, 
      message: 'रजिस्ट्रेशन सफल',
      user: { _id: user._id, name, username, dp: dpUrl, phoneNumber }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'सर्वर त्रुटि: ' + err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username }, { phoneNumber: username }]
    });

    if (!user) return res.status(400).json({ error: 'यूज़र नहीं मिला' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'गलत पासवर्ड' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        dp: user.dp,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'सर्वर त्रुटि' });
  }
});

// Get current user
app.get('/api/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Feed
app.get('/api/feed', auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name username dp')
      .populate('comments.user', 'username')
      .sort('-createdAt')
      .limit(50);

    const result = posts.map(p => ({
      ...p._doc,
      likesCount: p.likes.length,
      likedByUser: p.likes.includes(req.userId),
      commentsCount: p.comments.length
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create post
app.post('/api/post', auth, upload.single('media'), async (req, res) => {
  try {
    const { content } = req.body;
    let mediaUrl = '';
    if (req.file) {
      mediaUrl = '/uploads/' + req.file.filename;
    }
    const post = new Post({
      user: req.userId,
      content: content || '',
      mediaUrl
    });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like/Unlike post
app.post('/api/post/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'पोस्ट नहीं मिली' });

    const index = post.likes.indexOf(req.userId);
    if (index === -1) {
      post.likes.push(req.userId);
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();
    res.json({ liked: index === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get chats list
app.get('/api/chats', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const messages = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
      }}
    ]);

    const chatUsers = await User.find({ _id: { $in: messages.map(m => m._id) } })
      .select('name username dp');

    const result = messages.map(m => {
      const user = chatUsers.find(u => u._id.equals(m._id));
      return { user, lastMessage: m.lastMessage };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages with a user
app.get('/api/messages/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.userId }
      ]
    }).sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
app.post('/api/message', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const msg = new Message({
      sender: req.userId,
      receiver: receiverId,
      text
    });
    await msg.save();
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's groups
app.get('/api/groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.userId
    }).populate('members.user', 'name username dp');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create group
app.post('/api/group', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const username = '@' + name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random()*1000);
    const inviteLink = 'https://swarg.social/group/' + new mongoose.Types.ObjectId();
    
    const group = new Group({
      name,
      username,
      inviteLink,
      members: [{ user: req.userId, role: 'owner' }]
    });
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group messages
app.get('/api/group/:groupId/messages', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('messages.sender', 'username');
    res.json(group?.messages || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send group message
app.post('/api/group/:groupId/message', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const msg = { sender: req.userId, text, createdAt: new Date() };
    group.messages.push(msg);
    await group.save();

    const populated = await Group.populate(msg, { path: 'sender', select: 'username' });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contacts
app.get('/api/contacts', auth, async (req, res) => {
  try {
    const contacts = await Contact.find({ user: req.userId })
      .populate('contactUser', 'name username dp');
    res.json(contacts.map(c => ({ user: c.contactUser, customName: c.customName })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add contact
app.post('/api/contact', auth, async (req, res) => {
  try {
    const { phoneNumber, customName } = req.body;
    const contactUser = await User.findOne({ phoneNumber });
    if (!contactUser) return res.status(404).json({ error: 'User not found' });

    const existing = await Contact.findOne({ user: req.userId, contactUser: contactUser._id });
    if (existing) return res.json({ message: 'Already exists' });

    const contact = new Contact({
      user: req.userId,
      contactUser: contactUser._id,
      customName: customName || ''
    });
    await contact.save();
    res.json({ message: 'Contact added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
app.put('/api/user', auth, upload.single('dp'), async (req, res) => {
  try {
    const { name, username } = req.body;
    const update = {};
    if (name) update.name = name;
    if (username) update.username = username;

    if (req.file) {
      const compressedPath = path.join(__dirname, 'uploads', `compressed-${req.file.filename}`);
      await sharp(req.file.path)
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toFile(compressedPath);
      
      update.dp = `/uploads/compressed-${req.file.filename}`;
      fs.unlinkSync(req.file.path);
    }

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
app.put('/api/user/password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Old password wrong' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bot world message
app.post('/api/bot/world', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.username !== 'SwargBot') {
      return res.status(403).json({ error: 'Only bot can send world messages' });
    }

    const { message } = req.body;
    const users = await User.find({ username: { $ne: 'SwargBot' } }).select('_id');
    
    users.forEach(u => {
      io.to(u._id.toString()).emit('system message', { 
        text: '🌍 ' + message, 
        from: 'स्वर्ग सोशल' 
      });
    });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== SOCKET.IO =====================
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) return next(new Error('No token'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
}).on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  socket.join(socket.userId);

  socket.on('private message', (msg) => {
    io.to(msg.receiver).emit('private message', msg);
  });

  socket.on('group message', (msg) => {
    socket.broadcast.emit('group message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// ===================== STATIC FILES =====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, './')));

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Create bot account if not exists
  const botExists = await User.findOne({ username: 'SwargBot' });
  if (!botExists) {
    const hashed = await bcrypt.hash('Bot@DeepSeek#2025', 10);
    const bot = new User({
      name: 'स्वर्ग बॉट',
      username: 'SwargBot',
      password: hashed,
      phoneNumber: '+1(000)000-0000',
      dp: ''
    });
    await bot.save();
    console.log('✅ Bot account created - Username: SwargBot, Password: Bot@DeepSeek#2025');
  }
});
