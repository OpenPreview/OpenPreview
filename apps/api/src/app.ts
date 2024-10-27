import { Database, Tables } from '@openpreview/supabase';
import { createClient } from '@supabase/supabase-js';
import bodyParser from 'body-parser';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import morgan from 'morgan';
import { WebSocket, WebSocketServer } from 'ws';

require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in the environment',
  );
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
const dashboardUrl =
  process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3002';

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = http.createServer(app);

// Function to normalize domain by removing protocol and trailing slash
function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/\/$/, ''); // Remove trailing slash
}

// Function to check if origin is a subdomain of an allowed domain
function isSubdomainOf(origin: string, allowedDomain: string): boolean {
  const normalizedOrigin = normalizeDomain(origin);
  const normalizedAllowedDomain = normalizeDomain(allowedDomain);

  return (
    normalizedOrigin === normalizedAllowedDomain ||
    normalizedOrigin.endsWith(`.${normalizedAllowedDomain}`)
  );
}

// Function to fetch allowed domains from Supabase
async function fetchAllowedDomains(
  supabase: ReturnType<typeof createClient<Database>>,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('allowed_domains')
    .select('domain');

  if (error) {
    console.error('Error fetching allowed domains from Supabase:', error);
    return [];
  }

  return data ? data.map(entry => entry.domain) : [];
}

const corsOptions: cors.CorsOptions = {
  origin: async function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    if (!origin) {
      return callback(null, true); // Allow requests with no origin (like mobile apps)
    }

    try {
      const allowedDomains = await fetchAllowedDomains(supabase);

      // Check if the origin matches any allowed domain or is a subdomain
      const isAllowed =
        allowedDomains.some(allowedDomain =>
          isSubdomainOf(origin, allowedDomain),
        ) || origin.endsWith('.openpreview.dev');

      if (isAllowed) {
        // Add the origin to the Access-Control-Allow-Origin header
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    } catch (error) {
      console.error('Error in CORS origin check:', error);
      callback(new Error('Internal CORS error'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Project-ID', 'X-Domain'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// using morgan for logs
app.use(morgan('combined'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Extend the Request type to include the user and project properties
interface AuthenticatedRequest extends Request {
  user?: Tables<'users'>;
  project?: Tables<'projects'>;
}

// Store for temporary authentication codes
const authCodes = new Map<string, { projectId: string; redirectUrl: string }>();

// Update the authenticate middleware
const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
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

    // Set the auth cookie for Supabase
    res.setHeader(
      'Set-Cookie',
      `sb-access-token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`,
    );

    req.user = userData;
    next();
  } catch (error) {
    console.error('Error in authenticate middleware:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Project access middleware
const checkProjectAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const projectId = req.header('X-Project-ID');
  if (!projectId) {
    return res.status(400).json({ error: 'Missing project ID' });
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, organizations(*)')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { data: orgMembership, error: orgMembershipError } = await supabase
    .from('organization_members')
    .select()
    .eq('organization_id', project.organization_id)
    .eq('user_id', req.user!.id)
    .single();

  if (orgMembershipError || !orgMembership) {
    return res.status(403).json({ error: 'Access denied' });
  }

  req.project = project;
  next();
};

// Allowed Domains
app.get(
  '/allowed-domains',
  authenticate,
  checkProjectAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const domain = req.header('X-Domain');
    const projectId = req.header('X-Project-ID');

    if (!projectId || !domain) {
      return res
        .status(400)
        .json({ error: 'Project ID and Domain is required' });
    }

    const { data, error } = await supabase
      .from('allowed_domains')
      .select()
      .eq('project_id', projectId)
      .eq('domain', domain);
    console.log(data, domain, projectId);
    if (error) res.status(500).json({ error });
    res.json(data);
  },
);

app.post(
  '/allowed-domains',
  authenticate,
  checkProjectAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('allowed_domains')
      .insert({ ...req.body, project_id: req.project!.id });
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
  },
);

// Comments
// Define the type for the comment object returned by the RPC
type CommentWithReplies = {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string;
  };
  project_id: string;
  parent_id: number | null;
  url: string;
  x_percent: number;
  y_percent: number;
  selector: string;
  resolved_at: string | null;
  replies: CommentWithReplies[] | null;
};

app.get(
  '/comments',
  authenticate,
  checkProjectAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const domain = req.header('X-Domain');
    const projectId = req.header('X-Project-ID');

    if (!projectId || !domain) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const { data: comments, error: commentsError } = (await supabase.rpc(
      'get_comments_with_replies',
      {
        project_id: projectId,
        url: domain,
      },
    )) as { data: CommentWithReplies[] | null; error: any };

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
    if (!comments) {
      return res.json([]);
    }
    // Filter comments by domain if provided
    const filteredComments = domain
      ? comments.filter(comment => {
          const commentDomain = new URL(comment.url);
          const targetDomain = new URL(domain);
          return commentDomain.hostname === targetDomain.hostname;
        })
      : comments;
    res.json(filteredComments);
  },
);

app.post(
  '/comments',
  authenticate,
  checkProjectAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { text, x, y, url, selector } = req.body;
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content: text,
        project_id: req.project!.id,
        user_id: req.user!.id,
        url,
        selector,
        x_percent: x,
        y_percent: y,
      })
      .select()
      .single();
    if (error) res.status(500).json({ error });

    // Broadcast new comment to all connected clients for this project and URL

    wss.clients.forEach((client: WebSocket) => {
      if (
        client.readyState === WebSocket.OPEN &&
        (client as any).projectId === req.project!.id &&
        (client as any).url === url
      ) {
        client.send(JSON.stringify({ type: 'newComment', comment }));
      }
    });

    res.status(201).json(comment);
  },
);

// Organization Members
app.get(
  '/organization-members',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('organization_members')
      .select()
      .eq('user_id', req.user!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
  },
);

app.post(
  '/organization-members',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('organization_members')
      .insert(req.body);
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
  },
);

// Organizations
app.get(
  '/organizations',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('organizations')
      .select()
      .eq('id', req.user!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
  },
);

app.post(
  '/organizations',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ ...req.body, created_by: req.user!.id });
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
  },
);

// Project Members
app.get(
  '/project-members',
  authenticate,
  checkProjectAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('project_members')
      .select()
      .eq('project_id', req.project!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
  },
);

app.post(
  '/project-members',
  authenticate,
  checkProjectAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ ...req.body, project_id: req.project!.id });
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
  },
);

// Projects
app.get(
  '/projects',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('projects')
      .select()
      .eq('organization_id', req.query.organization_id as string);
    if (error) res.status(500).json({ error });
    res.json(data);
  },
);

app.post(
  '/projects',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase.from('projects').insert(req.body);
    if (error) res.status(500).json({ error });
    res.status(201).json(data);
  },
);

// Users
app.get(
  '/users',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', req.user!.id);
    if (error) res.status(500).json({ error });
    res.json(data);
  },
);

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

app.post(
  '/auth/logout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Logged out successfully' });
  },
);

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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
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
  res.send('Hello, welcome to the API!');
});

app.get('*', (req: Request, res: Response) => {
  res.status(404).send('Route not found');
});

// Update the WebSocket connection type
interface AuthenticatedWebSocket extends WebSocket {
  user?: Tables<'users'>;
  projectId?: string;
  customUrl?: string; // Changed from 'url' to 'customUrl'
}

// WebSocket server with authentication
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  try {
    const ws = await new Promise<WebSocket>(resolve => {
      wss.handleUpgrade(request, socket, head, ws => {
        resolve(ws);
      });
    });

    const isAuthenticated = await authenticateWS(
      ws as AuthenticatedWebSocket,
      request,
    );
    if (!isAuthenticated) {
      console.log(isAuthenticated, 'Authentication failed');
      ws.close(1008, 'Authentication failed');
      return;
    }

    wss.emit('connection', ws, request);
  } catch (error) {
    console.error('Error during WebSocket upgrade:', error);
    socket.destroy();
  }
});

// Update the authenticateWS function
const authenticateWS = async (
  ws: WebSocket,
  request: http.IncomingMessage,
): Promise<boolean> => {
  const authWs = ws as AuthenticatedWebSocket;
  const token = request.url?.split('token=')[1];
  if (!token) {
    console.log('No token provided for WebSocket connection');
    return false;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.log('Invalid token for WebSocket connection');
      return false;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.log('User not found for WebSocket connection');
      return false;
    }

    authWs.user = userData;
    return true;
  } catch (error) {
    console.error('Error authenticating WebSocket connection:', error);
    return false;
  }
};

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  const authWs = ws as AuthenticatedWebSocket;
  console.log(
    'New authenticated client connected | Current connections: ',
    wss.clients.size,
  );

  authWs.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);

      if (data.type !== 'ping')
        console.log('Received WebSocket message:', data);

      if (data.type === 'join') {
        console.log(wss.clients.size, 'COmemtmet');
        console.log(data.projectid, data.url);
        authWs.projectId = data.projectId;
        authWs.customUrl = data.url;
      } else if (data.type === 'newComment') {
        if (!authWs.user) {
          authWs.send(
            JSON.stringify({ type: 'error', message: 'Authentication failed' }),
          );
          return;
        }

        // Ensure all fields are properly typed and present
        const commentData = {
          project_id: data.projectId,
          user_id: authWs.user.id,
          content: data.comment.content,
          x_percent: data.comment.x_percent,
          y_percent: data.comment.y_percent,
          url: data.url,
          selector: data.comment.selector, // This is now a stringified JSON object
          page_title: data.comment.page_title,
          screen_width: data.comment.screen_width,
          screen_height: data.comment.screen_height,
          device_pixel_ratio: data.comment.device_pixel_ratio,
          deployment_url: data.comment.deployment_url,
          draft_mode: data.comment.draft_mode,
          user_agent: data.comment.user_agent,
          node_id: data.comment.node_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Insert the new comment into the database
        const { data: comment, error: insertError } = await supabase
          .from('comments')
          .insert(commentData)
          .select('*, user:users!user_id(name, avatar_url)')
          .single();

        if (insertError) {
          console.error('Error inserting comment:', insertError);
          authWs.send(
            JSON.stringify({ type: 'error', message: 'Failed to add comment' }),
          );
        } else {
          // Broadcast the new comment to all connected clients
          wss.clients.forEach((client: WebSocket) => {
            const authClient = client as AuthenticatedWebSocket;
            console.log(
              authClient.readyState,
              WebSocket.OPEN,
              authClient.projectId,
              data.projectId,
              authClient.customUrl,
              data.url,
              authClient.user,
            );
            if (
              authClient.readyState === WebSocket.OPEN &&
              authClient.projectId === data.projectId &&
              authClient.customUrl === data.url
            ) {
              // Changed from 'url' to 'customUrl'
              authClient.send(JSON.stringify({ type: 'newComment', comment }));
            }
          });
        }
      } else if (data.type === 'updateComment') {
        if (!authWs.user) {
          console.log('Authentication failed', authWs);
          authWs.send(
            JSON.stringify({ type: 'error', message: 'Authentication failed' }),
          );
          return;
        }

        // Update the comment in the database
        const { data: updatedComment, error: updateError } = await supabase
          .from('comments')
          .update({
            x_percent: data.comment.x_percent,
            y_percent: data.comment.y_percent,
            selector: data.comment.selector,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.comment.id)
          .select('*, user:users(*)')
          .single();

        if (updateError) {
          console.error('Error updating comment:', updateError);
          authWs.send(
            JSON.stringify({
              type: 'error',
              message: 'Failed to update comment',
            }),
          );
        } else {
          // Broadcast the updated comment to all connected clients for this project and URL
          wss.clients.forEach((client: WebSocket) => {
            const authClient = client as AuthenticatedWebSocket;
            if (
              authClient.readyState === WebSocket.OPEN &&
              authClient.projectId === data.projectId &&
              authClient.customUrl === data.url
            ) {
              // Changed from 'url' to 'customUrl'
              authClient.send(
                JSON.stringify({
                  type: 'updateComment',
                  comment: updatedComment,
                }),
              );
            }
          });
        }
      } else if (data.type === 'ping') {
        authWs.projectId = data.projectId;
        authWs.customUrl = data.url; // Changed from 'url' to 'customUrl'
        authWs.send(
          JSON.stringify({
            type: 'ping',
            status:
              authWs.projectId === data.projectId &&
              authWs.customUrl === data.url,
          }),
        );
      }
    } catch (error) {
      console.log('Error processing WebSocket message:', error);
    }
  });

  authWs.on('close', () => {
    console.log('Client disconnected');
  });
});

// Add a new route to verify the token
app.post('/auth/verify', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.log('Error verifying token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatar_url: userData.avatar_url,
      },
    });
  } catch (error) {
    console.error('Error in verify token route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.API_PORT || 3003;
server.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});

// Clean up WebSocket connections
setInterval(() => {
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState !== WebSocket.OPEN) {
      client.terminate();
      console.log('Terminated inactive WebSocket connection');
    }
  });
}, 30000);
