// ===================== ग्लोबल वेरिएबल =====================
let socket;
let currentUser = null;
let currentChat = null;
let currentGroup = null;
let token = localStorage.getItem('token');

// Render पर डिप्लॉय होने पर API_BASE खाली रहेगा (same origin)
const API_BASE = '';

// ===================== DOM एलिमेंट्स =====================
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const botScreen = document.getElementById('bot-screen');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const botLogout = document.getElementById('bot-logout');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const sidebarDp = document.getElementById('sidebar-dp');
const sidebarName = document.getElementById('sidebar-name');
const sidebarUsername = document.getElementById('sidebar-username');
const navBtns = document.querySelectorAll('.nav-btn');
const contentScreens = document.querySelectorAll('.content-screen');
const feedPosts = document.getElementById('feed-posts');
const postContent = document.getElementById('post-content');
const postMedia = document.getElementById('post-media');
const postBtn = document.getElementById('post-btn');
const chatList = document.getElementById('chat-list');
const chatWindow = document.getElementById('chat-window');
const messagesDiv = document.getElementById('messages');
const chatWith = document.getElementById('chat-with');
const chatDp = document.getElementById('chat-dp');
const backToChats = document.getElementById('back-to-chats');
const messageText = document.getElementById('message-text');
const sendMessage = document.getElementById('send-message');
const groupList = document.getElementById('group-list');
const groupWindow = document.getElementById('group-window');
const groupNameSpan = document.getElementById('group-name');
const groupDp = document.getElementById('group-dp');
const groupMessagesDiv = document.getElementById('group-messages');
const backToGroups = document.getElementById('back-to-groups');
const groupMessageText = document.getElementById('group-message-text');
const sendGroupMessage = document.getElementById('send-group-message');
const createGroupBtn = document.getElementById('create-group-btn');
const contactList = document.getElementById('contact-list');
const contactPhone = document.getElementById('contact-phone');
const contactName = document.getElementById('contact-name');
const addContactBtn = document.getElementById('add-contact-btn');
const settingsName = document.getElementById('settings-name');
const settingsUsername = document.getElementById('settings-username');
const settingsDp = document.getElementById('settings-dp');
const settingsDpPreview = document.getElementById('settings-dp-preview');
const updateProfile = document.getElementById('update-profile');
const oldPassword = document.getElementById('old-password');
const newPassword = document.getElementById('new-password');
const changePassword = document.getElementById('change-password');
const regDp = document.getElementById('reg-dp');
const dpFileName = document.getElementById('dp-file-name');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const botMessage = document.getElementById('bot-message');
const sendBotMessage = document.getElementById('send-bot-message');
const botMessagesDiv = document.getElementById('bot-messages');

// ===================== यूटिलिटी फंक्शन =====================
function showScreen(screenId) {
    authScreen.classList.remove('active');
    mainScreen.classList.remove('active');
    botScreen.style.display = 'none';
    if (screenId === 'auth') authScreen.classList.add('active');
    else if (screenId === 'main') mainScreen.classList.add('active');
    else if (screenId === 'bot') botScreen.style.display = 'block';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'अभी';
    if (diff < 3600000) return `${Math.floor(diff/60000)} मिनट पहले`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ स्वर्ग नंबर कॉपी हो गया: ' + text);
    }).catch(() => {
        prompt('कॉपी करने के लिए यह नंबर है:', text);
    });
}

// ===================== डीपी फाइल नाम =====================
regDp.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 100 * 1024 * 1024) {
            alert('❌ फाइल 100 MB से छोटी होनी चाहिए');
            regDp.value = '';
            dpFileName.innerText = 'कोई फाइल नहीं चुनी';
        } else {
            dpFileName.innerText = file.name;
        }
    } else {
        dpFileName.innerText = 'कोई फाइल नहीं चुनी';
    }
});

// ===================== रजिस्ट्रेशन =====================
registerBtn.addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const dpFile = regDp.files[0];

    if (!name || !username || !password) {
        registerError.innerText = '❌ सभी फील्ड भरें';
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('username', username);
    formData.append('password', password);
    if (dpFile) formData.append('dp', dpFile);

    try {
        registerError.innerText = '⏳ रजिस्टर हो रहा है...';
        const res = await fetch(API_BASE + '/api/register', {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        
        copyToClipboard(data.phoneNumber);
        alert('🎉 रजिस्ट्रेशन सफल! आपका स्वर्ग नंबर कॉपी हो गया है।');
        loginTab.click();
        registerError.innerText = '';
    } catch (err) {
        console.error('Register error:', err);
        registerError.innerText = '❌ ' + err.message;
    }
});

// ===================== लॉगिन =====================
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        loginError.innerText = '❌ यूज़रनेम/नंबर और पासवर्ड दें';
        return;
    }

    try {
        loginError.innerText = '⏳ लॉगिन हो रहा है...';
        const res = await fetch(API_BASE + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        
        if (currentUser.username === 'SwargBot') {
            showScreen('bot');
            loadBotMessages();
        } else {
            showScreen('main');
            updateSidebar();
            connectSocket();
            loadFeed();
            loadChats();
            loadGroups();
            loadContacts();
            loadSettings();
            sidebar.classList.remove('active');
        }
        loginError.innerText = '';
    } catch (err) {
        console.error('Login error:', err);
        loginError.innerText = '❌ ' + err.message;
    }
});

// ===================== लॉगआउट =====================
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    if (socket) socket.disconnect();
    showScreen('auth');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    sidebar.classList.remove('active');
});

botLogout.addEventListener('click', logoutBtn.click);

// ===================== सॉकेट कनेक्शन =====================
function connectSocket() {
    if (!token) return;
    socket = io({
        query: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5
    });
    
    socket.on('connect', () => {
        console.log('✅ Socket connected');
        document.getElementById('online-status').classList.add('online');
    });

    socket.on('connect_error', (err) => {
        console.log('❌ Socket error', err);
        document.getElementById('online-status').classList.remove('online');
    });

    socket.on('private message', (msg) => {
        if (currentChat && currentChat.type === 'private' && currentChat.userId === msg.sender) {
            displayMessage(msg, 'received');
            socket.emit('mark read', { messageId: msg._id });
        }
        loadChats();
    });

    socket.on('group message', (msg) => {
        if (currentGroup && currentGroup._id === msg.groupId) {
            displayGroupMessage(msg);
        }
        loadGroups();
    });

    socket.on('system message', (data) => {
        alert('🌍 ' + data.text);
    });
}

// ===================== साइडबार =====================
function updateSidebar() {
    sidebarName.innerText = currentUser.name;
    sidebarUsername.innerText = '@' + currentUser.username;
    sidebarDp.src = currentUser.dp || 'https://via.placeholder.com/80';
}

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (window.innerWidth < 768) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

// ===================== फीड =====================
async function loadFeed() {
    try {
        const res = await fetch(API_BASE + '/api/feed', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Feed load failed');
        const posts = await res.json();
        feedPosts.innerHTML = '';
        posts.forEach(post => {
            const postEl = createPostElement(post);
            feedPosts.appendChild(postEl);
        });
    } catch (err) {
        feedPosts.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">कोई पोस्ट नहीं</p>';
    }
}

function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
        <div class="post-header">
            <img src="${post.user.dp || 'https://via.placeholder.com/45'}" alt="DP">
            <div>
                <div class="post-user">${post.user.name} <span style="color:var(--text-secondary);">@${post.user.username}</span></div>
                <div class="post-time">${formatTime(post.createdAt)}</div>
            </div>
        </div>
        <div class="post-content">${post.content}</div>
        ${post.mediaUrl ? `<img src="${post.mediaUrl}" class="post-media" loading="lazy">` : ''}
        <div class="post-actions">
            <button class="like-btn ${post.likedByUser ? 'liked' : ''}" data-post-id="${post._id}">
                <i class="fas fa-heart"></i> ${post.likesCount}
            </button>
            <button class="comment-btn" data-post-id="${post._id}">
                <i class="fas fa-comment"></i> ${post.commentsCount}
            </button>
        </div>
        <div class="comments-section" id="comments-${post._id}">
            ${post.comments.map(c => `
                <div class="comment">
                    <span class="comment-user">@${c.user.username}:</span>
                    <span>${c.text}</span>
                </div>
            `).join('')}
        </div>
    `;
    div.querySelector('.like-btn').addEventListener('click', () => toggleLike(post._id));
    return div;
}

async function toggleLike(postId) {
    try {
        await fetch(API_BASE + `/api/post/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        loadFeed();
    } catch (err) {}
}

postBtn.addEventListener('click', async () => {
    const content = postContent.value.trim();
    const file = postMedia.files[0];
    
    if (!content && !file) {
        alert('कुछ लिखें या मीडिया चुनें');
        return;
    }

    const formData = new FormData();
    formData.append('content', content);
    if (file) formData.append('media', file);
    
    try {
        await fetch(API_BASE + '/api/post', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        postContent.value = '';
        postMedia.value = '';
        loadFeed();
    } catch (err) {}
});

// ===================== चैट =====================
async function loadChats() {
    try {
        const res = await fetch(API_BASE + '/api/chats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const chats = await res.json();
        chatList.innerHTML = '';
        if (chats.length === 0) {
            chatList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">कोई चैट नहीं</p>';
            return;
        }
        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <img src="${chat.user.dp || 'https://via.placeholder.com/50'}">
                <div class="chat-info">
                    <h4>${chat.user.name}</h4>
                    <p>${chat.lastMessage ? chat.lastMessage.text.substring(0,30) + '...' : ''}</p>
                </div>
            `;
            div.addEventListener('click', () => openChat(chat.user));
            chatList.appendChild(div);
        });
    } catch (err) {}
}

function openChat(user) {
    currentChat = { type: 'private', userId: user._id, username: user.username, name: user.name, dp: user.dp };
    chatWith.innerText = user.name;
    chatDp.src = user.dp || 'https://via.placeholder.com/40';
    chatWindow.style.display = 'flex';
    loadMessages(user._id);
}

async function loadMessages(userId) {
    try {
        const res = await fetch(API_BASE + `/api/messages/${userId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const msgs = await res.json();
        messagesDiv.innerHTML = '';
        msgs.forEach(msg => {
            displayMessage(msg, msg.sender === currentUser._id ? 'sent' : 'received');
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (err) {}
}

function displayMessage(msg, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `
        <div>${msg.text}</div>
        <div class="message-time">${formatTime(msg.createdAt)}</div>
    `;
    messagesDiv.appendChild(div);
}

sendMessage.addEventListener('click', sendPrivateMessage);
messageText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendPrivateMessage();
});

async function sendPrivateMessage() {
    const text = messageText.value.trim();
    if (!text || !currentChat) return;
    try {
        const res = await fetch(API_BASE + '/api/message', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiverId: currentChat.userId, text })
        });
        const msg = await res.json();
        if (res.ok) {
            displayMessage(msg, 'sent');
            messageText.value = '';
            socket.emit('private message', msg);
        }
    } catch (err) {}
}

backToChats.addEventListener('click', () => {
    chatWindow.style.display = 'none';
    currentChat = null;
});

// ===================== ग्रुप =====================
async function loadGroups() {
    try {
        const res = await fetch(API_BASE + '/api/groups', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const groups = await res.json();
        groupList.innerHTML = '';
        if (groups.length === 0) {
            groupList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">कोई ग्रुप नहीं</p>';
            return;
        }
        groups.forEach(group => {
            const div = document.createElement('div');
            div.className = 'group-item';
            div.innerHTML = `
                <img src="${group.photo || 'https://via.placeholder.com/50'}">
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <p>${group.members.length} सदस्य</p>
                </div>
            `;
            div.addEventListener('click', () => openGroup(group));
            groupList.appendChild(div);
        });
    } catch (err) {}
}

function openGroup(group) {
    currentGroup = group;
    groupNameSpan.innerText = group.name;
    groupDp.src = group.photo || 'https://via.placeholder.com/40';
    groupWindow.style.display = 'flex';
    loadGroupMessages(group._id);
}

async function loadGroupMessages(groupId) {
    try {
        const res = await fetch(API_BASE + `/api/group/${groupId}/messages`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const msgs = await res.json();
        groupMessagesDiv.innerHTML = '';
        msgs.forEach(msg => {
            displayGroupMessage(msg);
        });
        groupMessagesDiv.scrollTop = groupMessagesDiv.scrollHeight;
    } catch (err) {}
}

function displayGroupMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender._id === currentUser._id ? 'sent' : 'received'}`;
    div.innerHTML = `
        <div><strong>@${msg.sender.username}</strong>: ${msg.text}</div>
        <div class="message-time">${formatTime(msg.createdAt)}</div>
    `;
    groupMessagesDiv.appendChild(div);
}

sendGroupMessage.addEventListener('click', sendGroupMsg);
groupMessageText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendGroupMsg();
});

async function sendGroupMsg() {
    const text = groupMessageText.value.trim();
    if (!text || !currentGroup) return;
    try {
        const res = await fetch(API_BASE + `/api/group/${currentGroup._id}/message`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        const msg = await res.json();
        if (res.ok) {
            displayGroupMessage(msg);
            groupMessageText.value = '';
            socket.emit('group message', msg);
        }
    } catch (err) {}
}

backToGroups.addEventListener('click', () => {
    groupWindow.style.display = 'none';
    currentGroup = null;
});

createGroupBtn.addEventListener('click', async () => {
    const name = prompt('ग्रुप का नाम दें:');
    if (!name) return;
    try {
        await fetch(API_BASE + '/api/group', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        loadGroups();
    } catch (err) {}
});

// ===================== कॉन्टैक्ट =====================
async function loadContacts() {
    try {
        const res = await fetch(API_BASE + '/api/contacts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const contacts = await res.json();
        contactList.innerHTML = '';
        if (contacts.length === 0) {
            contactList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">कोई कॉन्टैक्ट नहीं</p>';
            return;
        }
        contacts.forEach(contact => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.innerHTML = `
                <img src="${contact.user.dp || 'https://via.placeholder.com/50'}">
                <div>
                    <h4>${contact.customName || contact.user.name}</h4>
                    <p>@${contact.user.username}</p>
                </div>
            `;
            div.addEventListener('click', () => {
                openChat(contact.user);
                document.querySelector('[data-screen="chats"]').click();
            });
            contactList.appendChild(div);
        });
    } catch (err) {}
}

addContactBtn.addEventListener('click', async () => {
    const phone = contactPhone.value.trim();
    const customName = contactName.value.trim();
    if (!phone) {
        alert('फोन नंबर दर्ज करें');
        return;
    }
    try {
        const res = await fetch(API_BASE + '/api/contact', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phoneNumber: phone, customName: customName || undefined })
        });
        if (res.ok) {
            contactPhone.value = '';
            contactName.value = '';
            loadContacts();
            alert('कॉन्टैक्ट सेव हो गया');
        } else {
            const data = await res.json();
            alert(data.error || 'यूज़र नहीं मिला');
        }
    } catch (err) {}
});

// ===================== सेटिंग =====================
function loadSettings() {
    settingsName.value = currentUser.name;
    settingsUsername.value = currentUser.username;
    settingsDpPreview.src = currentUser.dp || 'https://via.placeholder.com/80';
}

updateProfile.addEventListener('click', async () => {
    const name = settingsName.value.trim();
    const username = settingsUsername.value.trim();
    const file = settingsDp.files[0];
    const formData = new FormData();
    if (name) formData.append('name', name);
    if (username) formData.append('username', username);
    if (file) formData.append('dp', file);
    
    try {
        const res = await fetch(API_BASE + '/api/user', {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        if (res.ok) {
            const updated = await res.json();
            currentUser = updated;
            updateSidebar();
            alert('प्रोफाइल अपडेट हो गया');
            loadSettings();
        }
    } catch (err) {}
});

changePassword.addEventListener('click', async () => {
    const old = oldPassword.value;
    const newPwd = newPassword.value;
    if (!old || !newPwd) {
        alert('दोनों पासवर्ड भरें');
        return;
    }
    try {
        const res = await fetch(API_BASE + '/api/user/password', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword: old, newPassword: newPwd })
        });
        if (res.ok) {
            alert('पासवर्ड बदल गया');
            oldPassword.value = '';
            newPassword.value = '';
        } else {
            alert('पुराना पासवर्ड गलत है');
        }
    } catch (err) {}
});

// ===================== नेविगेशन =====================
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const screenId = btn.dataset.screen;
        contentScreens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId + '-screen').classList.add('active');
        sidebar.classList.remove('active');
        
        if (screenId === 'feed') loadFeed();
        else if (screenId === 'chats') loadChats();
        else if (screenId === 'groups') loadGroups();
        else if (screenId === 'contacts') loadContacts();
        else if (screenId === 'settings') loadSettings();
    });
});

loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
});

// ===================== बॉट =====================
function loadBotMessages() {
    botMessagesDiv.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">🌍 यहाँ लिखकर दुनिया को संदेश भेजें</p>';
}

sendBotMessage.addEventListener('click', async () => {
    const msg = botMessage.value.trim();
    if (!msg) return;
    try {
        const res = await fetch(API_BASE + '/api/bot/world', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: msg })
        });
        if (res.ok) {
            const div = document.createElement('div');
            div.className = 'message sent';
            div.innerHTML = `<div>${msg}</div><div class="message-time">अभी</div>`;
            botMessagesDiv.appendChild(div);
            botMessage.value = '';
            botMessagesDiv.scrollTop = botMessagesDiv.scrollHeight;
        } else {
            alert('केवल बॉट ही वर्ल्ड मैसेज भेज सकता है');
        }
    } catch (err) {}
});

// ===================== इनिशियल चेक =====================
async function init() {
    if (token) {
        try {
            const res = await fetch(API_BASE + '/api/me', { 
                headers: { 'Authorization': 'Bearer ' + token } 
            });
            if (res.ok) {
                const user = await res.json();
                currentUser = user;
                if (user.username === 'SwargBot') {
                    showScreen('bot');
                    loadBotMessages();
                } else {
                    showScreen('main');
                    updateSidebar();
                    connectSocket();
                    loadFeed();
                    loadChats();
                    loadGroups();
                    loadContacts();
                    loadSettings();
                }
            } else {
                localStorage.removeItem('token');
                showScreen('auth');
            }
        } catch (err) {
            localStorage.removeItem('token');
            showScreen('auth');
        }
    } else {
        showScreen('auth');
    }
}

init();
  
