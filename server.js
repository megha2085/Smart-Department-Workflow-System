// 1. Imports
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const notificationSchema = new mongoose.Schema({
    userId: String,
    role: String,
    message: String,
    type: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// 2. App init
const app = express();
const PORT = 3000;

// 3. Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// 4. View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// MODELS

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'Student' }
});

const User = mongoose.model('User', userSchema);

const requestSchema = new mongoose.Schema({
    title: String,
    description: String,
    status: { type: String, default: 'Pending Mentor' },
    currentStage: { type: String, default: 'Mentor' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Request = mongoose.model('Request', requestSchema);

// AUTH MIDDLEWARE

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

// ROUTES

// Home
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('index');
});

// Register Page
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

// Login Page
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// REGISTER

app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.render('register', { error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();

        res.redirect('/login');

    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Something went wrong' });
    }
});

// LOGIN

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.render('login', { error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.render('login', { error: 'Invalid credentials' });
        }

        req.session.userId = user._id;

        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Something went wrong' });
    }
});

// DASHBOARD

app.get('/dashboard', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        let requests = [];

        if (user.role === 'Student') {
            requests = await Request.find({ owner: user._id });
        }

        else if (user.role === 'Mentor') {
            requests = await Request.find({ currentStage: 'Mentor' }).populate('owner');
        }

        else if (user.role === 'HOD') {
            requests = await Request.find({ currentStage: 'HOD' }).populate('owner');
        }

        const formatted = requests.map(r => ({
            _id: r._id,
            title: r.title,
            description: r.description,
            status: r.status,
            currentStage: r.currentStage,
            ownerName: r.owner?.name || user.name,
            createdAt: r.createdAt
        }));

        res.render('dashboard', {
            user,
            requests: formatted
        });

    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});

// CREATE REQUEST

app.post('/request/create', requireLogin, async (req, res) => {
    try {
        const { title, description } = req.body;

        const newRequest = new Request({
            title,
            description,
            owner: req.session.userId,
            status: 'Pending Mentor',
            currentStage: 'Mentor'
        });

        await newRequest.save();

        // Notify Mentor
        await Notification.create({
            userId: 'mentor1',
            role: 'Mentor',
            message: 'New request submitted by student',
            type: 'new_request'
        });

        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// APPROVE / REJECT

app.post('/request/action', requireLogin, async (req, res) => {
    try {
        console.log("ACTION ROUTE HIT");
        console.log(req.body);
        const { requestId, action } = req.body;

        const request = await Request.findById(requestId);
        const user = await User.findById(req.session.userId);

        if (!request) {
            return res.redirect('/dashboard');
        }

        // Mentor Actions
        if (user.role === 'Mentor' && request.currentStage === 'Mentor') {

            if (action === 'approve') {
                request.currentStage = 'HOD';
                request.status = 'Pending HOD';

                // Notify HOD

                console.log("Creating HOD notification");

                await Notification.create({
                    userId: request.owner.toString(),
                    role: 'HOD',
                    message: 'A request has been forwarded to you',
                    type: 'forwarded'
                });

            } else {
                request.status = 'Rejected';
                request.currentStage = 'Done';

                // Notify Student

                console.log("Creating Student rejected notification");

                await Notification.create({
                    userId: request.owner.toString(),
                    role: 'Student',
                    message: 'Your request was rejected by Mentor',
                    type: 'rejected'
                });
            }
        }

        // HOD Actions
        else if (user.role === 'HOD' && request.currentStage === 'HOD') {

            if (action === 'approve') {
                request.status = 'Approved';
                request.currentStage = 'Done';

                // Notify Student

                console.log("Creating Student approved notification");

                await Notification.create({
                    userId: request.owner.toString(),
                    role: 'Student',
                    message: 'Your request has been approved',
                    type: 'approved'
                });

            } else {
                request.status = 'Rejected';
                request.currentStage = 'Done';

                // Notify Student

                console.log("Creating Student rejected notification");
                
                await Notification.create({
                    userId: request.owner.toString(),
                    role: 'Student',
                    message: 'Your request was rejected by HOD',
                    type: 'rejected'
                });
            }
        }

        await request.save();

        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// NOTIFICATIONS PAGE

app.get('/notifications/:userId', requireLogin, async (req, res) => {
    try {
        const notifications = await Notification.find({
            userId: req.params.userId
        }).sort({ createdAt: -1 });

        console.log("Notifications:", notifications);

        res.render('notifications', { notifications });

    } catch (err) {
        console.error("Notification Error:", err);
        res.send("Error loading notifications: " + err.message);
    }
});

// LOGOUT

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// START SERVER

async function startServer() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/smart-department');
        console.log('✅ Database Connected');

        app.listen(PORT, () => {
            console.log(`🚀 http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

startServer();