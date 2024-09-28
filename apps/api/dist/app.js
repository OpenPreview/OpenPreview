"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const morgan_1 = __importDefault(require("morgan"));
const ws_1 = __importDefault(require("ws"));
require('dotenv').config();
// Load environment variables from .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
// using morgan for logs
app.use((0, morgan_1.default)('combined'));
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Project-ID', 'X-Domain'],
}));
app.use(express_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in the environment');
    console.log('Current environment variables:', process.env);
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
const dashboardUrl = process.env.DASHBOARD_URL || 'https://app.example.com';
// Store for temporary authentication codes
const authCodes = new Map();
// Authentication middleware
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const { data: { user }, error } = yield supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    const { data: userData, error: userError } = yield supabase
        .from('users')
        .select()
        .eq('id', user.id)
        .single();
    if (userError || !userData) {
        return res.status(401).json({ error: 'User not found' });
    }
    req.user = userData;
    next();
});
// Project access middleware
const checkProjectAccess = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const projectId = req.header('X-Project-ID');
    const domain = req.header('X-Domain');
    if (!projectId || !domain) {
        return res.status(400).json({ error: 'Missing project ID or domain' });
    }
    const { data: project, error } = yield supabase
        .from('projects')
        .select()
        .eq('id', projectId)
        .single();
    if (error || !project) {
        return res.status(404).json({ error: 'Project not found' });
    }
    const { data: allowedDomains, error: domainsError } = yield supabase
        .from('allowed_domains')
        .select('domain')
        .eq('project_id', projectId);
    if (domainsError) {
        return res.status(500).json({ error: 'Error fetching allowed domains' });
    }
    const isDomainAllowed = allowedDomains.some(d => domain === d.domain || domain.endsWith(`.${d.domain}`));
    if (!isDomainAllowed) {
        return res.status(403).json({ error: 'Domain not allowed for this project' });
    }
    const { data: membership, error: membershipError } = yield supabase
        .from('project_members')
        .select()
        .eq('project_id', projectId)
        .eq('user_id', req.user.id)
        .single();
    if (membershipError || !membership) {
        return res.status(403).json({ error: 'Access denied' });
    }
    req.project = project;
    next();
});
// Allowed Domains
app.get('/allowed-domains', authenticate, checkProjectAccess, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('allowed_domains')
        .select()
        .eq('project_id', req.project.id);
    if (error)
        res.status(500).json({ error });
    res.json(data);
}));
app.post('/allowed-domains', authenticate, checkProjectAccess, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('allowed_domains')
        .insert(Object.assign(Object.assign({}, req.body), { project_id: req.project.id }));
    if (error)
        res.status(500).json({ error });
    res.status(201).json(data);
}));
// Comments
app.get('/comments', authenticate, checkProjectAccess, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('comments')
        .select()
        .eq('project_id', req.project.id)
        .eq('url', req.query.url);
    if (error)
        res.status(500).json({ error });
    res.json(data);
}));
app.post('/comments', authenticate, checkProjectAccess, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { text, x, y, url } = req.body;
    const { data: comment, error } = yield supabase
        .from('comments')
        .insert({
        content: text,
        project_id: req.project.id,
        user_id: req.user.id,
        url,
        x_position: x,
        y_position: y
    })
        .select()
        .single();
    if (error)
        res.status(500).json({ error });
    // Broadcast new comment to all connected clients for this project and URL
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN && client.projectId === req.project.id && client.url === url) {
            client.send(JSON.stringify({ type: 'newComment', comment }));
        }
    });
    res.status(201).json(comment);
}));
// Organization Members
app.get('/organization-members', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('organization_members')
        .select()
        .eq('user_id', req.user.id);
    if (error)
        res.status(500).json({ error });
    res.json(data);
}));
app.post('/organization-members', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('organization_members')
        .insert(req.body);
    if (error)
        res.status(500).json({ error });
    res.status(201).json(data);
}));
// Organizations
app.get('/organizations', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('organizations')
        .select()
        .eq('id', req.user.id);
    if (error)
        res.status(500).json({ error });
    res.json(data);
}));
app.post('/organizations', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('organizations')
        .insert(Object.assign(Object.assign({}, req.body), { created_by: req.user.id }));
    if (error)
        res.status(500).json({ error });
    res.status(201).json(data);
}));
// Project Members
app.get('/project-members', authenticate, checkProjectAccess, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('project_members')
        .select()
        .eq('project_id', req.project.id);
    if (error)
        res.status(500).json({ error });
    res.json(data);
}));
app.post('/project-members', authenticate, checkProjectAccess, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('project_members')
        .insert(Object.assign(Object.assign({}, req.body), { project_id: req.project.id }));
    if (error)
        res.status(500).json({ error });
    res.status(201).json(data);
}));
// Projects
app.get('/projects', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('projects')
        .select()
        .eq('organization_id', req.query.organization_id);
    if (error)
        res.status(500).json({ error });
    res.json(data);
}));
app.post('/projects', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('projects')
        .insert(req.body);
    if (error)
        res.status(500).json({ error });
    res.status(201).json(data);
}));
// Users
app.get('/users', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase
        .from('users')
        .select()
        .eq('id', req.user.id);
    if (error)
        res.status(500).json({ error });
    res.json(data);
}));
// Auth routes
app.post('/auth/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const { data, error } = yield supabase.auth.signUp({
        email,
        password,
    });
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
app.post('/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const { data, error } = yield supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
app.post('/auth/logout', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { error } = yield supabase.auth.signOut();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ message: 'Logged out successfully' });
}));
// New auth routes for the toolbar
app.post('/auth/login/init', (req, res) => {
    const { projectId, redirectUrl } = req.body;
    const authCode = crypto_1.default.randomBytes(32).toString('hex');
    authCodes.set(authCode, { projectId, redirectUrl });
    const loginUrl = `${dashboardUrl}/login?authCode=${authCode}`;
    res.json({ loginUrl });
});
app.post('/auth/login/callback', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { authCode, token } = req.body;
    const authData = authCodes.get(authCode);
    if (!authData) {
        return res.status(400).json({ error: 'Invalid auth code' });
    }
    const { data: { user }, error } = yield supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    // Here you might want to check if the user has access to the project
    // associated with the authCode
    authCodes.delete(authCode);
    res.json({ success: true, redirectUrl: authData.redirectUrl });
}));
app.post('/auth/login/verify', (req, res) => {
    const { authCode } = req.body;
    const authData = authCodes.get(authCode);
    if (!authData) {
        return res.status(400).json({ error: 'Invalid or expired auth code' });
    }
    // In a real-world scenario, you'd associate the authCode with a user session
    // For this example, we'll just return a dummy token
    const token = crypto_1.default.randomBytes(32).toString('hex');
    authCodes.delete(authCode);
    res.json({ token });
});
app.get('/', (req, res) => {
    res.send("Hello, welcome to the API!");
});
app.get('*', (req, res) => {
    res.status(404).send("Route not found");
});
// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'join') {
            ws.projectId = data.projectId;
            ws.url = data.url;
        }
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
const port = process.env.PORT || 3003;
server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
});
