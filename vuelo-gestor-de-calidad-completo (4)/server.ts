import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.ID_CLIENTE_DE_GOOGLE_VITE;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

console.log('Google OAuth Config Check:', {
  hasClientId: !!GOOGLE_CLIENT_ID,
  clientIdPrefix: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'none',
  hasClientSecret: !!GOOGLE_CLIENT_SECRET
});

// API: Get Google Auth URL
app.get('/api/auth/google/url', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Configuración de Google incompleta. Por favor, agregue VITE_GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Settings > Secrets.' 
    });
  }

  // Ensure HTTPS for redirect URI in production/cloud run
  const host = req.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/auth/google/callback`;
  
  console.log('Generating Auth URL with redirect:', redirectUri);

  const scope = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    access_type: 'offline',
    prompt: 'consent',
    login_hint: 'sistemas@vuelopharmacol.com.co'
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url });
});

// API: Google OAuth Callback
app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  const { code } = req.query;
  const host = req.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    // Verify email if possible
    try {
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userData = await userResponse.json();
      
      if (userData.email !== 'sistemas@vuelopharmacol.com.co') {
        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e11d48;">Cuenta Incorrecta</h2>
              <p>Solo se permite la sincronización con <b>sistemas@vuelopharmacol.com.co</b>.</p>
              <p>Usted intentó conectar: ${userData.email}</p>
              <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer;">Cerrar</button>
            </body>
          </html>
        `);
      }
    } catch (e) {
      console.warn('Could not verify email, proceeding with tokens');
    }

    // Send tokens back to the parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticación exitosa para sistemas@vuelopharmacol.com.co. Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send('Error during authentication');
  }
});

// Vite Middleware Setup
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
