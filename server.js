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

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection (local or Atlas)
mongoose.connect('mongodb://localhost:27017/swarg-social', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'));

// JWT secret
const JWT_SECRET = 'swarg-social-secret-2025';

// ===================== मॉडल =====================
const UserSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    password: String,
    phoneNumber: { type: String, unique: true },
    dp: String,
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const PostSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    mediaUrl: String,
    mediaType: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', PostSchema);

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

const GroupSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    photo: String,
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
    inviteLink: { type: String, unique: true },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' }
    }],
    messages: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});
const Group = mongoose.model('Group', GroupSchema);

const ContactSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contactUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customName: String
});
const Contact = mongoose.model('Contact', ContactSchema);

// ===================== मिडलवेयर =====================
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Multer setup for file uploads (100MB limit)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
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

// ===================== यूटिलिटी =====================
function generatePhoneNumber() {
    const areaCode = Math.floor(Math.random() * 900) + 100; // 100-999
    const prefix = Math.floor(Math.random() * 900) + 100;
    const line = Math.floor(Math.random() * 9000) + 1000;
    return `+1(${areaCode})${prefix}-${line}`;
}

// ===================== रूट्स =====================
// रजिस्टर
app.post('/api/register', upload.single('dp'), async (req, res) => {
    try {
        const { name, username, password } = req.body;
        if (!name || !username || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        // check username unique
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Username already taken' });

        // generate unique phone number
        let phoneNumber;
        do {
            phoneNumber = generatePhoneNumber();
        } while (await User.findOne({ phoneNumber }));

        const hashedPassword = await bcrypt.hash(password, 10);
        let dpUrl = '';
        if (req.file) {
            // compress and save
            const filename = req.file.filename;
            const outputPath = './uploads/compressed-' + filename;
            await sharp(req.file.path)
                .resize(300, 300)
                .jpeg({ quality: 80 })
                .toFile(outputPath);
            dpUrl = '/uploads/compressed-' + filename;
            fs.unlinkSync(req.file.path); // delete original
        }

        const user = new User({
            name,
            username,
            password: hashedPassword,
            phoneNumber,
            dp: dpUrl
        });
        await user.save();

        res.json({ phoneNumber, message: 'Registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// लॉगिन
app.post('/api/login', express.json(), async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({
            $or: [{ username }, { phoneNumber: username }]
        });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Wrong password' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.json({ token, user: { _id: user._id, name: user.name, username: user.username, dp: user.dp, phoneNumber: user.phoneNumber } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// गेट मी
app.get('/api/me', auth, async (req, res) => {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
});

// फीड
app.get('/api/feed', auth, async (req, res) => {
    const posts = await Post.find()
        .populate('user', 'name username dp')
        .populate('comments.user', 'username')
        .sort('-createdAt')
        .limit(50);
    // add like count and if current user liked
    const result = posts.map(p => ({
        ...p._doc,
        likesCount: p.likes.length,
        likedByUser: p.likes.includes(req.userId),
        commentsCount: p.comments.length
    }));
    res.json(result);
});

// पोस्ट बनाएँ
app.post('/api/post', auth, upload.single('media'), async (req, res) => {
    try {
        const { content } = req.body;
        let mediaUrl = '';
        if (req.file) mediaUrl = '/uploads/' + req.file.filename;
        const post = new Post({
            user: req.userId,
            content,
            mediaUrl
        });
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// लाइक/अनलाइक
app.post('/api/post/:postId/like', auth, async (req, res) => {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const index = post.likes.indexOf(req.userId);
    if (index === -1) {
        post.likes.push(req.userId);
    } else {
        post.likes.splice(index, 1);
    }
    await post.save();
    res.json({ liked: index === -1 });
});

// प्राइवेट मैसेजेस लिस्ट (चैट्स)
app.get('/api/chats', auth, async (req, res) => {
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
        } }
    ]);
    const chatUsers = await User.find({ _id: { $in: messages.map(m => m._id) } }).select('name username dp');
    const result = messages.map(m => {
        const user = chatUsers.find(u => u._id.equals(m._id));
        return { user, lastMessage: m.lastMessage };
    });
    res.json(result);
});

// मैसेजेस बीच दो यूजर्स
app.get('/api/messages/:userId', auth, async (req, res) => {
    const messages = await Message.find({
        $or: [
            { sender: req.userId, receiver: req.params.userId },
            { sender: req.params.userId, receiver: req.userId }
        ]
    }).sort('createdAt');
    res.json(messages);
});

// मैसेज भेजें
app.post('/api/message', auth, express.json(), async (req, res) => {
    const { receiverId, text } = req.body;
    const msg = new Message({
        sender: req.userId,
        receiver: receiverId,
        text
    });
    await msg.save();
    // status update later via socket
    res.json(msg);
});

// ग्रुप लिस्ट
app.get('/api/groups', auth, async (req, res) => {
    const groups = await Group.find({
        'members.user': req.userId
    }).populate('members.user', 'name username dp');
    res.json(groups);
});

// ग्रुप बनाएँ
app.post('/api/group', auth, express.json(), async (req, res) => {
    const { name } = req.body;
    const username = '@' + name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random()*1000);
    const inviteLink = 'https://swarg.social/group/' + mongoose.Types.ObjectId();
    const group = new Group({
        name,
        username,
        inviteLink,
        members: [{ user: req.userId, role: 'owner' }]
    });
    await group.save();
    res.json(group);
});

// ग्रुप मैसेजेस
app.get('/api/group/:groupId/messages', auth, async (req, res) => {
    const group = await Group.findById(req.params.groupId).populate('messages.sender', 'username');
    res.json(group.messages);
});

// ग्रुप में मैसेज भेजें
app.post('/api/group/:groupId/message', auth, express.json(), async (req, res) => {
    const { text } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const msg = { sender: req.userId, text, createdAt: new Date() };
    group.messages.push(msg);
    await group.save();
    // populate sender
    const populated = await Group.populate(msg, { path: 'sender', select: 'username' });
    res.json(populated);
});

// कॉन्टैक्ट लिस्ट
app.get('/api/contacts', auth, async (req, res) => {
    const contacts = await Contact.find({ user: req.userId }).populate('contactUser', 'name username dp');
    res.json(contacts.map(c => ({ user: c.contactUser, customName: c.customName })));
});

// कॉन्टैक्ट ऐड करें
app.post('/api/contact', auth, express.json(), async (req, res) => {
    const { phoneNumber, customName } = req.body;
    const contactUser = await User.findOne({ phoneNumber });
    if (!contactUser) return res.status(404).json({ error: 'User not found' });
    const existing = await Contact.findOne({ user: req.userId, contactUser: contactUser._id });
    if (existing) return res.json({ message: 'Already exists' });
    const contact = new Contact({
        user: req.userId,
        contactUser: contactUser._id,
        customName
    });
    await contact.save();
    res.json({ message: 'Contact added' });
});

// यूजर अपडेट
app.put('/api/user', auth, upload.single('dp'), async (req, res) => {
    const { name, username } = req.body;
    const update = { name, username };
    if (req.file) {
        const filename = req.file.filename;
        const outputPath = './uploads/compressed-' + filename;
        await sharp(req.file.path)
            .resize(300, 300)
            .jpeg({ quality: 80 })
            .toFile(outputPath);
        update.dp = '/uploads/compressed-' + filename;
        fs.unlinkSync(req.file.path);
    }
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
    res.json(user);
});

// पासवर्ड बदलें
app.put('/api/user/password', auth, express.json(), async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Old password wrong' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed' });
});

// बॉट वर्ल्ड मैसेज (सिर्फ बॉट अकाउंट के लिए)
app.post('/api/bot/world', auth, express.json(), async (req, res) => {
    const user = await User.findById(req.userId);
    if (user.username !== 'SwargBot') {
        return res.status(403).json({ error: 'Only bot can send world messages' });
    }
    const { message } = req.body;
    // सभी यूजर्स को सिस्टम मैसेज भेजें (सॉकेट के जरिए)
    const users = await User.find({ username: { $ne: 'SwargBot' } }).select('_id');
    users.forEach(u => {
        io.to(u._id.toString()).emit('system message', { text: '🌍 ' + message, from: 'स्वर्ग सोशल' });
    });
    res.json({ sent: true });
});

// ===================== सॉकेट हैंडलिंग =====================
io.use((socket, next) => {
    const token = socket.handshake.query.token;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
}).on('connection', (socket) => {
    socket.join(socket.userId);
    socket.on('private message', (msg) => {
        // update status and send to receiver
        io.to(msg.receiver).emit('private message', msg);
    });
    socket.on('group message', (msg) => {
        // send to all group members
        // we need group members list, but for simplicity send to all
        socket.broadcast.emit('group message', msg);
    });
});

// ===================== स्टैटिक फाइल्स =====================
app.use('/uploads', express.static('uploads'));
app.use(express.static('./')); // for frontend files

// ===================== सर्वर स्टार्ट =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // बॉट अकाउंट बनाएँ अगर नहीं है
    User.findOne({ username: 'SwargBot' }).then(async (bot) => {
        if (!bot) {
            const hashed = await bcrypt.hash('Bot@DeepSeek#2025', 10);
            const botUser = new User({
                name: 'स्वर्ग बॉट',
                username: 'SwargBot',
                password: hashed,
                phoneNumber: '+1(000)000-0000',
                dp: ''
            });
            await botUser.save();
            console.log('Bot account created: SwargBot / Bot@DeepSeek#2025');
        }
    });
});
