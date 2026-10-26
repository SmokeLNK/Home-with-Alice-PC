import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function getAppIcon(): string | undefined {
  const candidates = [
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../dist-vite/icon.ico'),
    path.join(app.getAppPath(), 'dist-vite/icon.ico'),
    path.join(app.getAppPath(), 'public/icon.ico'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../dist-vite/icon.png'),
    path.join(app.getAppPath(), 'dist-vite/icon.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return undefined;
}

function createWindow() {
  const iconPath = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Дом с Алисой',
    icon: iconPath,
    backgroundColor: '#181424',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Required for Yandex CORS requests in dev/prod
    },
    autoHideMenuBar: true,
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-vite/index.html'));
  }

  // Open external links in user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.yandex.smhome.pc');
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler to open URL in external browser
ipcMain.handle('open-external', async (_event, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Invalid URL' };
});

// IPC handler to open readme.txt
ipcMain.handle('open-readme', async () => {
  const candidates = [
    path.join(__dirname, '../public/readme.txt'),
    path.join(__dirname, '../dist-vite/readme.txt'),
    path.join(__dirname, '../readme.txt'),
    path.join(app.getAppPath(), 'readme.txt'),
    path.join(app.getAppPath(), 'dist-vite/readme.txt'),
    path.join(app.getAppPath(), 'public/readme.txt'),
    path.join(path.dirname(app.getPath('exe')), 'readme.txt'),
    path.join(process.cwd(), 'readme.txt'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const err = await shell.openPath(c);
      if (!err) return { success: true, path: c };
    }
  }

  // Fallback: create in temp/userData if not found
  try {
    const tempPath = path.join(app.getPath('temp'), 'readme.txt');
    const sourceCandidates = [
      path.join(__dirname, '../readme.txt'),
      path.join(__dirname, '../public/readme.txt'),
    ];
    let content = '';
    for (const sc of sourceCandidates) {
      if (fs.existsSync(sc)) {
        content = fs.readFileSync(sc, 'utf-8');
        break;
      }
    }
    if (content) {
      fs.writeFileSync(tempPath, content, 'utf-8');
      await shell.openPath(tempPath);
      return { success: true, path: tempPath };
    }
  } catch (_) {}

  return { success: false, error: 'Файл readme.txt не найден' };
});

// IPC handler for Yandex OAuth window
ipcMain.handle('open-oauth-window', async (_event, clientId: string) => {
  return new Promise((resolve) => {
    let resolved = false;

    const safeResolve = (result: { success: boolean; token?: string; error?: string }) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const trimmedClientId = (clientId || '').trim();
    if (!trimmedClientId) {
      safeResolve({ success: false, error: 'Client ID не указан' });
      return;
    }

    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(trimmedClientId)}&scope=iot:view%20iot:control`;

    const authWindow = new BrowserWindow({
      width: 650,
      height: 750,
      title: 'Авторизация в Яндекс',
      parent: mainWindow || undefined,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    authWindow.loadURL(authUrl);

    function checkTokenUrl(url: string) {
      if (!url || resolved) return;

      // Check for error in query or hash
      if (url.includes('error=')) {
        try {
          const queryString = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
          const hashString = url.includes('#') ? url.split('#')[1] : '';
          const params = new URLSearchParams(queryString + '&' + hashString);
          const error = params.get('error_description') || params.get('error');
          if (error) {
            safeResolve({ success: false, error: decodeURIComponent(error) });
            try { authWindow.close(); } catch (_) {}
            return;
          }
        } catch (e) {
          console.error('Failed to parse error:', e);
        }
      }

      // Check for token in hash or query
      if (url.includes('access_token=')) {
        try {
          let token: string | null = null;
          if (url.includes('#')) {
            const hashPart = url.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            token = hashParams.get('access_token');
          }
          if (!token && url.includes('?')) {
            const queryPart = url.split('?')[1].split('#')[0];
            const queryParams = new URLSearchParams(queryPart);
            token = queryParams.get('access_token');
          }

          if (token) {
            safeResolve({ success: true, token });
            try { authWindow.close(); } catch (_) {}
            return;
          }
        } catch (err) {
          console.error('Failed to parse OAuth URL:', err);
        }
      }
    }

    // Inspect URL on all navigation events
    authWindow.webContents.on('will-redirect', (_e, url) => {
      checkTokenUrl(url);
    });

    authWindow.webContents.on('will-navigate', (_e, url) => {
      checkTokenUrl(url);
    });

    authWindow.webContents.on('did-navigate', (_e, url) => {
      checkTokenUrl(url);
      checkTokenUrl(authWindow.webContents.getURL());
    });

    authWindow.webContents.on('did-navigate-in-page', (_e, url) => {
      checkTokenUrl(url);
      checkTokenUrl(authWindow.webContents.getURL());
    });

    authWindow.webContents.on('did-finish-load', async () => {
      checkTokenUrl(authWindow.webContents.getURL());
      try {
        const pageUrl = await authWindow.webContents.executeJavaScript('window.location.href');
        checkTokenUrl(pageUrl);
      } catch (_) {}
    });

    // Also check on network redirects via webRequest
    const filter = { urls: ['*://*/*'] };
    authWindow.webContents.session.webRequest.onBeforeRedirect(filter, (details) => {
      checkTokenUrl(details.redirectURL);
    });

    authWindow.on('closed', () => {
      safeResolve({ success: false, error: 'Окно авторизации закрыто' });
    });
  });
});
