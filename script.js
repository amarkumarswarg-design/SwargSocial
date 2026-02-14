// ===================== ग्लोबल वेरिएबल =====================
let socket;
let currentUser = null;
let currentChat = null; // { type: 'private', userId, username, name, dp }
let currentGroup = null;
let token = localStorage.getItem('token');
let cropCanvas = document.getElementById('crop-canvas');
let ctx = cropCanvas.getContext('2d');
let selectedFile = null;

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
const backToChats = document.getElementById('back-to-chats');
const messageText = document.getElementById('message-text');
const sendMessage = document.getElementById('send-message');
const groupList = document.getElementById('group-list');
const groupWindow = document.getElementById('group-window');
const groupNameSpan = document.getElementById('group-name');
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
const dpPreview = document.getElementById('dp-preview');
const cropBtn = document.getElementById('crop-btn');
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ===================== ऑटो-कॉपी फोन नंबर =====================
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('स्वर्ग नंबर कॉपी हो गया: ' + text);
    });
}

// ===================== डीपी क्रॉप फंक्शन =====================
regDp.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
        alert('फाइल 100 MB से छोटी होनी चाहिए');
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // सिंपल क्रॉप (स्क्वायर)
            cropCanvas.width = 300;
            cropCanvas.height = 300;
            ctx.drawImage(img, 0, 0, 300, 300);
            cropCanvas.style.display = 'block';
            cropBtn.style.display = 'block';
            // प्रीव्यू दिखाएँ
            const previewImg = document.createElement('img');
            previewImg.src = cropCanvas.toDataURL();
            dpPreview.innerHTML = '';
            dpPreview.appendChild(previewImg);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

cropBtn.addEventListener('click', function() {
    // क्रॉप की गई इमेज को ब्लॉब में बदलें
    cropCanvas.toBlob(blob => {
        selectedFile = new File([blob], 'dp.jpg', { type: 'image/jpeg' });
        alert('डीपी क्रॉप हो गई!');
    });
});

// ===================== रजिस्ट्रेशन =====================
registerBtn.addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    if (!name || !username || !password) {
        registerError.innerText = 'सभी फील्ड भरें';
        return;
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('username', username);
    formData.append('password', password);
    if (selectedFile) formData.append('dp', selectedFile);

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            copyToClipboard(data.phoneNumber);
            alert('रजिस्ट्रेशन सफल! आपका स्वर्ग नंबर कॉपी हो गया है।');
            // लॉगिन टैब पर जाएँ
            loginTab.click();
        } else {
            registerError.innerText = data.error;
        }
    } catch (err) {
        registerError.innerText = 'सर्वर से कनेक्ट नहीं हो सका';
    }
});

// ===================== लॉगिन =====================
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    if (!username || !password) {
        loginError.innerText = 'यूज़रनेम/नंबर और पासवर्ड दें';
        return;
    }
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = data.user;
            // बॉट चेक
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
            }
        } else {
            loginError.innerText = data.error;
        }
    } catch (err) {
        loginError.innerText = 'सर्वर एरर';
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
});

// ===================== सॉकेट कनेक्शन =====================
function connectSocket() {
    socket = io({ query: { token } });
    socket.on('private message', (msg) => {
        if (currentChat && currentChat.type === 'private' && currentChat.userId === msg.senderId) {
            displayMessage(msg, 'received');
        }
        loadChats(); // चैट लिस्ट अपडेट
    });
    socket.on('group message', (msg) => {
        if (currentGroup && currentGroup._id === msg.groupId) {
            displayGroupMessage(msg);
        }
        loadGroups();
    });
    socket.on('message status', (data) => {
        // मैसेज स्टेटस अपडेट (ब्लू टिक)
        const msgDiv = document.querySelector(`[data-msg-id="${data.messageId}"]`);
        if (msgDiv) {
            const statusSpan = msgDiv.querySelector('.message-status');
            if (statusSpan) statusSpan.innerHTML = '✓✓';
        }
    });
}

// ===================== साइडबार अपडेट =====================
function updateSidebar() {
    sidebarName.innerText = currentUser.name;
    sidebarUsername.innerText = '@' + currentUser.username;
    sidebarDp.src = currentUser.dp ? currentUser.dp : 'default-avatar.png';
}

// ===================== फीड =====================
async function loadFeed() {
    try {
        const res = await fetch('/api/feed', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const posts = await res.json();
        feedPosts.innerHTML = '';
        posts.forEach(post => {
            const postEl = createPostElement(post);
            feedPosts.appendChild(postEl);
        });
    } catch (err) {
        console.log(err);
    }
}

function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
        <div class="post-header">
            <img src="${post.user.dp || 'default-avatar.png'}" alt="DP">
            <div>
                <div class="post-user">${post.user.name} <span>@${post.user.username}</span></div>
                <div class="post-time">${formatTime(post.createdAt)}</div>
            </div>
        </div>
        <div class="post-content">${post.content}</div>
        ${post.mediaUrl ? `<img src="${post.mediaUrl}" class="post-media">` : ''}
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
    // लाइक इवेंट
    div.querySelector('.like-btn').addEventListener('click', () => toggleLike(post._id));
    return div;
}

async function toggleLike(postId) {
    try {
        const res = await fetch(`/api/post/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            loadFeed(); // रीलोड फीड
        }
    } catch (err) {}
}

postBtn.addEventListener('click', async () => {
    const content = postContent.value;
    const file = postMedia.files[0];
    const formData = new FormData();
    formData.append('content', content);
    if (file) formData.append('media', file);
    try {
        await fetch('/api/post', {
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
        const res = await fetch('/api/chats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const chats = await res.json();
        chatList.innerHTML = '';
        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <img src="${chat.user.dp || 'default-avatar.png'}">
                <div class="chat-info">
                    <h4>${chat.user.name}</h4>
                    <p>${chat.lastMessage ? chat.lastMessage.text : ''}</p>
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
    chatWindow.style.display = 'flex';
    loadMessages(user._id);
}

async function loadMessages(userId) {
    try {
        const res = await fetch(`/api/messages/${userId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const msgs = await res.json();
        messagesDiv.innerHTML = '';
        msgs.forEach(msg => {
            displayMessage(msg, msg.senderId === currentUser._id ? 'sent' : 'received');
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (err) {}
}

function displayMessage(msg, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.setAttribute('data-msg-id', msg._id);
    div.innerHTML = `
        <div>${msg.text}</div>
        <div class="message-time">
            ${formatTime(msg.createdAt)}
            ${type === 'sent' ? `<span class="message-status">${msg.status === 'read' ? '✓✓' : '✓'}</span>` : ''}
        </div>
    `;
    messagesDiv.appendChild(div);
}

sendMessage.addEventListener('click', sendPrivateMessage);
messageText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendPrivateMessage();
});

async function sendPrivateMessage() {
    const text = messageText.value;
    if (!text || !currentChat) return;
    try {
        const res = await fetch('/api/message', {
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
        const res = await fetch('/api/groups', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const groups = await res.json();
        groupList.innerHTML = '';
        groups.forEach(group => {
            const div = document.createElement('div');
            div.className = 'group-item';
            div.innerHTML = `
                <img src="${group.photo || 'default-group.png'}">
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <p>${group.members.length} members</p>
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
    groupWindow.style.display = 'flex';
    loadGroupMessages(group._id);
}

async function loadGroupMessages(groupId) {
    try {
        const res = await fetch(`/api/group/${groupId}/messages`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const msgs = await res.json();
        groupMessagesDiv.innerHTML = '';
        msgs.forEach(msg => {
            displayGroupMessage(msg);
        });
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
    const text = groupMessageText.value;
    if (!text || !currentGroup) return;
    try {
        const res = await fetch(`/api/group/${currentGroup._id}/message`, {
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
        const res = await fetch('/api/group', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            loadGroups();
        }
    } catch (err) {}
});

// ===================== कॉन्टैक्ट =====================
async function loadContacts() {
    try {
        const res = await fetch('/api/contacts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const contacts = await res.json();
        contactList.innerHTML = '';
        contacts.forEach(contact => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.innerHTML = `
                <img src="${contact.user.dp || 'default-avatar.png'}">
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
    const phone = contactPhone.value;
    const customName = contactName.value;
    if (!phone) return;
    try {
        const res = await fetch('/api/contact', {
  
