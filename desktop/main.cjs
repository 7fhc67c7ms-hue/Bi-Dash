const { app, BrowserWindow, shell, session, ipcMain, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function readDesktopConfig() {
  const configPath = path.join(__dirname, 'dashboard-config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (typeof config.dashboardUrl === 'string' && /^https:\/\//.test(config.dashboardUrl)) {
      return {
        dashboardUrl: config.dashboardUrl.replace(/\/$/, ''),
        oauthPortalUrl: typeof config.oauthPortalUrl === 'string' && /^https:\/\//.test(config.oauthPortalUrl)
          ? config.oauthPortalUrl.replace(/\/$/, '')
          : 'https://manus.im',
      };
    }
  } catch (error) {
    console.warn('[Desktop] Could not read dashboard-config.json:', error.message);
  }
  return {
    dashboardUrl: 'https://bidashweb-wamckvfr.manus.space',
    oauthPortalUrl: 'https://manus.im',
  };
}

const { dashboardUrl: DASHBOARD_URL, oauthPortalUrl: OAUTH_PORTAL_URL } = readDesktopConfig();

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#090d14',
    title: 'BI Produção — Fotoporcelana',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // OAuth may redirect through the provider's domain before returning to the
  // dashboard. Keep that complete flow in this BrowserWindow so its session
  // cookie is stored by Electron rather than by the user's external browser.
  let authInProgress = false;
  const isDashboardUrl = url => url.startsWith(DASHBOARD_URL);
  const isOAuthPortalUrl = url => url.startsWith(OAUTH_PORTAL_URL);
  const canStayInAuthFlow = url => authInProgress && /^https:\/\//.test(url);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isDashboardUrl(url) || isOAuthPortalUrl(url) || canStayInAuthFlow(url)) {
      if (isOAuthPortalUrl(url)) authInProgress = true;
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  ipcMain.handle('desktop:print-to-pdf', async event => {
    if (event.sender !== win.webContents) return { ok: false };
    const result = await dialog.showSaveDialog(win, {
      title: 'Salvar relatório em PDF',
      defaultPath: path.join(
        app.getPath('downloads'),
        `BI-Producao-${new Date().toISOString().slice(0, 10)}.pdf`,
      ),
      filters: [{ name: 'Arquivo PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' },
      preferCSSPageSize: true,
    });
    fs.writeFileSync(result.filePath, pdf);
    return { ok: true, filePath: result.filePath };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (isDashboardUrl(url)) {
      authInProgress = false;
      return;
    }
    if (isOAuthPortalUrl(url)) {
      authInProgress = true;
      return;
    }
    if (canStayInAuthFlow(url)) return;
    if (!isDashboardUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on('will-redirect', (event, url) => {
    if (isDashboardUrl(url)) {
      authInProgress = false;
      return;
    }
    if (isOAuthPortalUrl(url) || canStayInAuthFlow(url)) {
      authInProgress = true;
      return;
    }
    event.preventDefault();
    shell.openExternal(url);
  });

  win.loadURL(`${DASHBOARD_URL}?desktopVersion=${encodeURIComponent(app.getVersion())}`);
}

app.whenReady().then(() => {
  session.defaultSession.clearCache().finally(createWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
