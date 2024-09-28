import { Database, Tables } from '@openpreview/supabase';
import { createClient } from '@supabase/supabase-js';
import bodyParser from "body-parser";
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import morgan from 'morgan';
import WebSocket from 'ws';

require('dotenv').config()

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// using morgan for logs
app.use(morgan('combined'));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Project-ID', 'X-Domain'],
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in the environment');
    console.log('Current environment variables:', process.env);
    process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
const dashboardUrl = process.env.DASHBOARD_URL || 'https://app.example.com';

// Extend the Request type to include the user and project properties
interface AuthenticatedRequest extends Request {
    user?: Tables<'users'>;
    project?: Tables<'projects'>;
}

// Store for temporary authentication codes
const authCodes = new Map<string, { projectId: string; redirectUrl: string }>();

// Authentication middleware
const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select()
        .eq('id', user.id)
        .single();

    if (userError || !userData) {
        return res.status(401).json({ error: 'User not found' });
    }

    req.user = userData;
    next();
};

// Project access middleware
const checkProjectAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const projectId = req.header('X-Project-ID');
    const domain = req.header('X-Domain');

    if (!projectId || !domain) {
        return res.status(400).json({ error: 'Missing project ID or domain' });
    }

    const { data: project, error } = await supabase
        .from('projects')
        .select()
        .eq('id', projectId)
        .single();

    if (error || !project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    const { data: allowedDomains, error: domainsError } = await supabase
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

    const { data: membership, error: membershipError } = await supabase
        .from('project_members')
        .select()
        .eq('project_id', projectId)
        .eq('user_id', req.user!.id)
        .single();

    if (membershipError || !membership) {
        return res.status(403).json({ error: 'Access denied' });
    }

    req.project = project;
    next();
};

// Allowed Domains
app.get('/allowed-domains', authenticate, checkProjectAccess, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('allowed_domains')
        .select()
        .eq('project_id', req.project!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
});

app.post('/allowed-domains', authenticate, checkProjectAccess, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('allowed_domains')
        .insert({ ...req.body, project_id: req.project!.id });
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
});

// Comments
app.get('/comments', authenticate, checkProjectAccess, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('comments')
        .select()
        .eq('project_id', req.project!.id)
        .eq('url', req.query.url as string);
    if (error) res.status(500).json({ error });
    res.json(data);
});

app.post('/comments', authenticate, checkProjectAccess, async (req: AuthenticatedRequest, res: Response) => {
    const { text, x, y, url } = req.body;
    const { data: comment, error } = await supabase
        .from('comments')
        .insert({
            content: text,
            project_id: req.project!.id,
            user_id: req.user!.id,
            url,
            x_position: x,
            y_position: y
        })
        .select()
        .single();

    if (error) res.status(500).json({ error });
    
    // Broadcast new comment to all connected clients for this project and URL
    wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN && (client as any).projectId === req.project!.id && (client as any).url === url) {
            client.send(JSON.stringify({ type: 'newComment', comment }));
        }
    });
    
    res.status(201).json(comment);
});

// Organization Members
app.get('/organization-members', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('organization_members')
        .select()
        .eq('user_id', req.user!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
});

app.post('/organization-members', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('organization_members')
        .insert(req.body);
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
});

// Organizations
app.get('/organizations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('organizations')
        .select()
        .eq('id', req.user!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
});

app.post('/organizations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('organizations')
        .insert({ ...req.body, created_by: req.user!.id });
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
});

// Project Members
app.get('/project-members', authenticate, checkProjectAccess, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('project_members')
        .select()
        .eq('project_id', req.project!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
});

app.post('/project-members', authenticate, checkProjectAccess, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('project_members')
        .insert({ ...req.body, project_id: req.project!.id });
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
});

// Projects
app.get('/projects', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('projects')
        .select()
        .eq('organization_id', req.query.organization_id as string);
    if (error) res.status(500).json({ error });
    res.json(data);
});

app.post('/projects', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('projects')
        .insert(req.body);
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
});

// Users
app.get('/users', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
        .from('users')
        .select()
        .eq('id', req.user!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
});

// Auth routes
app.post('/auth/signup', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

app.post('/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

app.post('/auth/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Logged out successfully' });
});

// New auth routes for the toolbar
app.post('/auth/login/init', (req: Request, res: Response) => {
    const { projectId, redirectUrl } = req.body;
    const authCode = crypto.randomBytes(32).toString('hex');
    authCodes.set(authCode, { projectId, redirectUrl });
    
    const loginUrl = `${dashboardUrl}/login?authCode=${authCode}`;
    res.json({ loginUrl });
});

app.post('/auth/login/callback', async (req: Request, res: Response) => {
    const { authCode, token } = req.body;

    const authData = authCodes.get(authCode);
    if (!authData) {
        return res.status(400).json({ error: 'Invalid auth code' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Here you might want to check if the user has access to the project
    // associated with the authCode

    authCodes.delete(authCode);
    res.json({ success: true, redirectUrl: authData.redirectUrl });
});

app.post('/auth/login/verify', (req: Request, res: Response) => {
    const { authCode } = req.body;

    const authData = authCodes.get(authCode);
    if (!authData) {
        return res.status(400).json({ error: 'Invalid or expired auth code' });
    }

    // In a real-world scenario, you'd associate the authCode with a user session
    // For this example, we'll just return a dummy token
    const token = crypto.randomBytes(32).toString('hex');

    authCodes.delete(authCode);
    res.json({ token });
});

app.get('/', (req: Request, res: Response) => {
    res.send("Hello, welcome to the API!");
});

app.get('*', (req: Request, res: Response) => {
    res.status(404).send("Route not found");
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');

    ws.on('message', (message: string) => {
        const data = JSON.parse(message);
        if (data.type === 'join') {
            (ws as any).projectId = data.projectId;
            (ws as any).url = data.url;
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