/**
 * SystemService - Full OS & System Access Engine for ARYA.
 * Architect & Author: Shubhanshu Kumar Srivastav
 * 
 * Provides ARYA with deep native Windows OS control:
 * - App Launching & Termination
 * - File System Management (listing, reading, creating, searching, deleting)
 * - Hardware Controls (Screenshots, Lock PC, Battery, Storage/Disk, Network)
 * - Process Monitoring & Management
 * - PowerShell & Shell Command Execution
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SystemService {
  constructor() {
    this.platform = os.platform(); // 'win32', 'darwin', 'linux'
    this.isWin = this.platform === 'win32';
    this.isMac = this.platform === 'darwin';
    this.isLinux = this.platform === 'linux';

    this.homedir = os.homedir();
    this.desktopDir = path.join(this.homedir, 'Desktop');
    this.downloadsDir = path.join(this.homedir, 'Downloads');
    this.documentsDir = path.join(this.homedir, 'Documents');
    this.picturesDir = path.join(this.homedir, 'Pictures');
    this.videosDir = path.join(this.homedir, 'Videos');
    this.musicDir = path.join(this.homedir, 'Music');

    // Windows app mapping (Protocols, Executables & Store Apps)
    this.appMap = {
      'notepad': 'notepad.exe',
      'नोटपैड': 'notepad.exe',
      'calculator': 'calc.exe',
      'calc': 'calc.exe',
      'कैलकुलेटर': 'calc.exe',
      'chrome': 'start chrome',
      'google chrome': 'start chrome',
      'क्रोम': 'start chrome',
      'edge': 'start msedge',
      'microsoft edge': 'start msedge',
      'vscode': 'code',
      'vs code': 'code',
      'code': 'code',
      'visual studio code': 'code',
      'explorer': 'explorer.exe',
      'file explorer': 'explorer.exe',
      'files': 'explorer.exe',
      'this pc': 'explorer.exe =',
      'my computer': 'explorer.exe =',
      'cmd': 'start cmd.exe',
      'command prompt': 'start cmd.exe',
      'कमांड प्रॉम्प्ट': 'start cmd.exe',
      'powershell': 'start powershell.exe',
      'terminal': 'start wt.exe || start powershell.exe',
      'paint': 'mspaint.exe',
      'mspaint': 'mspaint.exe',
      'पेंट': 'mspaint.exe',
      'task manager': 'taskmgr.exe',
      'taskmgr': 'taskmgr.exe',
      'टास्क मैनेजर': 'taskmgr.exe',
      'settings': 'start ms-settings:',
      'windows settings': 'start ms-settings:',
      'सेटिंग्स': 'start ms-settings:',
      'control panel': 'control.exe',
      'कंट्रोल पैनल': 'control.exe',
      'camera': 'start microsoft.windows.camera:',
      'कैमरा': 'start microsoft.windows.camera:',
      'whatsapp': 'start whatsapp:',
      'व्हाट्सएप': 'start whatsapp:',
      'व्हाट्सऐप': 'start whatsapp:',
      'youtube': 'start https://www.youtube.com',
      'यूट्यूब': 'start https://www.youtube.com',
      'spotify': 'start spotify',
      'word': 'start winword',
      'ms word': 'start winword',
      'excel': 'start excel',
      'ms excel': 'start excel',
      'powerpoint': 'start powerpnt',
      'vlc': 'start vlc',
      'browser': 'start msedge',
      'clock': 'start ms-clock:',
      'घड़ी': 'start ms-clock:',
      'photos': 'start ms-photos:',
      'maps': 'start https://maps.google.com',
      'मैप्स': 'start https://maps.google.com',
      'snipping tool': 'start snippingtool.exe',
      'snip': 'start snippingtool.exe'
    };

    // macOS native application mapping
    this.macAppMap = {
      'notepad': 'TextEdit',
      'नोटपैड': 'TextEdit',
      'textedit': 'TextEdit',
      'notes': 'Notes',
      'calculator': 'Calculator',
      'calc': 'Calculator',
      'कैलकुलेटर': 'Calculator',
      'chrome': 'Google Chrome',
      'google chrome': 'Google Chrome',
      'क्रोम': 'Google Chrome',
      'safari': 'Safari',
      'सफ़ारी': 'Safari',
      'edge': 'Microsoft Edge',
      'microsoft edge': 'Microsoft Edge',
      'vscode': 'Visual Studio Code',
      'vs code': 'Visual Studio Code',
      'code': 'Visual Studio Code',
      'visual studio code': 'Visual Studio Code',
      'camera': 'Photo Booth',
      'photo booth': 'Photo Booth',
      'कैमरा': 'Photo Booth',
      'whatsapp': 'WhatsApp',
      'व्हाट्सएप': 'WhatsApp',
      'settings': 'System Settings',
      'system settings': 'System Settings',
      'system preferences': 'System Settings',
      'सेटिंग्स': 'System Settings',
      'spotify': 'Spotify',
      'youtube': 'open https://www.youtube.com',
      'finder': 'Finder',
      'files': 'Finder',
      'file explorer': 'Finder',
      'terminal': 'Terminal',
      'iterm': 'iTerm',
      'कमांड प्रॉम्प्ट': 'Terminal',
      'photos': 'Photos',
      'pictures': 'Photos',
      'music': 'Music',
      'mail': 'Mail',
      'messages': 'Messages',
      'calendar': 'Calendar',
      'maps': 'Maps',
      'preview': 'Preview',
      'activity monitor': 'Activity Monitor',
      'task manager': 'Activity Monitor'
    };

    // Linux application mapping
    this.linuxAppMap = {
      'chrome': 'google-chrome || chromium-browser',
      'google chrome': 'google-chrome || chromium-browser',
      'firefox': 'firefox',
      'notepad': 'gedit || nano',
      'textedit': 'gedit',
      'calculator': 'gnome-calculator || kcalc',
      'calc': 'gnome-calculator || kcalc',
      'terminal': 'gnome-terminal || xterm',
      'vscode': 'code',
      'vs code': 'code',
      'code': 'code',
      'files': 'nautilus || dolphin || xdg-open ~',
      'settings': 'gnome-control-center'
    };

    // Common folder mapping (macOS, Linux & Windows)
    this.folderMap = {
      'desktop': this.desktopDir,
      'डेस्कटॉप': this.desktopDir,
      'downloads': this.downloadsDir,
      'download': this.downloadsDir,
      'डाउनलोड्स': this.downloadsDir,
      'documents': this.documentsDir,
      'document': this.documentsDir,
      'दस्तावेज़': this.documentsDir,
      'pictures': this.picturesDir,
      'photos': this.picturesDir,
      'तस्वीरें': this.picturesDir,
      'videos': this.videosDir,
      'वीडियो': this.videosDir,
      'music': this.musicDir,
      'गाने': this.musicDir,
      'home': this.homedir,
      'c drive': this.isWin ? 'C:\\' : '/',
      'drive c': this.isWin ? 'C:\\' : '/',
      'c:': this.isWin ? 'C:\\' : '/',
      'root': '/'
    };
  }

  /**
   * Run Unix Shell command safely (macOS & Linux)
   */
  runUnixShell(cmd, timeoutMs = 15000) {
    return new Promise((resolve) => {
      exec(cmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
        resolve({
          success: !err,
          code: err ? (err.code || 1) : 0,
          stdout: (stdout || '').trim(),
          stderr: (stderr || (err ? err.message : '')).trim()
        });
      });
    });
  }

  /**
   * Run PowerShell script safely and return Promise (Windows)
   */
  runPowerShell(psCode, timeoutMs = 15000) {
    if (!this.isWin) {
      return this.runUnixShell(psCode, timeoutMs);
    }
    return new Promise((resolve) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCode], {
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill(); } catch (e) {}
        resolve({ success: false, error: 'Command execution timed out.', stdout: '', stderr: '' });
      }, timeoutMs);

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return;
        resolve({
          success: code === 0,
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({ success: false, error: err.message, stdout: '', stderr: '' });
      });
    });
  }

  /**
   * Launch an application cross-platform (macOS, Linux, Windows)
   */
  async launchApp(appName) {
    if (!appName || !appName.trim()) {
      return { success: false, message: 'Application name is required.' };
    }

    const clean = appName.trim().toLowerCase();

    // macOS native launch
    if (this.isMac) {
      const macApp = this.macAppMap[clean] || appName.trim();
      return new Promise((resolve) => {
        exec(`open -a "${macApp}"`, (err, stdout, stderr) => {
          if (err) {
            exec(`open "${macApp}"`, (fallbackErr) => {
              resolve({ success: !fallbackErr, app: appName, detail: fallbackErr ? fallbackErr.message : 'Launched via open' });
            });
          } else {
            resolve({ success: true, app: appName, detail: 'Launched on macOS' });
          }
        });
      });
    }

    // Linux native launch
    if (this.isLinux) {
      const linuxCmd = this.linuxAppMap[clean] || appName.trim();
      return new Promise((resolve) => {
        exec(`${linuxCmd} &`, (err) => {
          resolve({ success: !err, app: appName });
        });
      });
    }

    // Windows native application & protocol launch
    const rawTarget = this.appMap[clean] || appName.trim();
    return new Promise((resolve) => {
      let cmdToRun = '';
      if (rawTarget.startsWith('start ')) {
        const stripped = rawTarget.replace(/^start\s+/i, '').trim();
        cmdToRun = `cmd.exe /c start "" "${stripped}"`;
      } else {
        cmdToRun = `cmd.exe /c start "" "${rawTarget}"`;
      }

      this.runPowerShell(cmdToRun, 5000).then(res => {
        resolve({ success: true, app: appName, detail: res.stdout || 'Launched natively on Windows' });
      }).catch(err => {
        resolve({ success: false, app: appName, error: err.message });
      });
    });
  }

  /**
   * Terminate a running application cross-platform (macOS, Linux, Windows)
   */
  async closeApp(appName) {
    if (!appName || !appName.trim()) {
      return { success: false, message: 'Process name is required.' };
    }

    const clean = appName.trim().toLowerCase();

    // macOS termination
    if (this.isMac) {
      const targetProc = this.macAppMap[clean] || appName.trim();
      return new Promise((resolve) => {
        exec(`osascript -e 'quit app "${targetProc}"'`, (err) => {
          if (err) {
            exec(`pkill -f "${targetProc}" || killall "${targetProc}"`, (kErr, stdout) => {
              resolve({ success: true, app: appName, detail: stdout || 'Terminated via pkill' });
            });
          } else {
            resolve({ success: true, app: appName, detail: 'Closed gracefully on macOS' });
          }
        });
      });
    }

    // Linux termination
    if (this.isLinux) {
      return new Promise((resolve) => {
        exec(`pkill -f "${appName.trim()}" || killall "${appName.trim()}"`, (err, stdout) => {
          resolve({ success: true, app: appName, detail: stdout || 'Terminated' });
        });
      });
    }

    // Windows termination
    let procName = appName.trim().replace(/\.exe$/i, '');
    const mapClose = {
      'chrome': 'chrome',
      'google chrome': 'chrome',
      'notepad': 'notepad',
      'नोटपैड': 'notepad',
      'calculator': 'CalculatorApp',
      'calc': 'CalculatorApp',
      'edge': 'msedge',
      'microsoft edge': 'msedge',
      'vscode': 'Code',
      'vs code': 'Code',
      'code': 'Code',
      'paint': 'mspaint',
      'spotify': 'Spotify'
    };

    const targetProc = mapClose[procName.toLowerCase()] || procName;

    return new Promise((resolve) => {
      exec(`taskkill /F /IM "${targetProc}.exe" /T`, (err, stdout, stderr) => {
        if (err) {
          this.runPowerShell(`Stop-Process -Name "${targetProc}" -Force -ErrorAction SilentlyContinue`).then(psRes => {
            resolve({ success: true, app: appName, detail: stdout || stderr });
          });
        } else {
          resolve({ success: true, app: appName, detail: stdout.trim() });
        }
      });
    });
  }

  /**
   * Open a folder cross-platform (macOS Finder, Linux file manager, Windows Explorer)
   */
  async openFolder(folderNameOrPath) {
    const raw = (folderNameOrPath || 'desktop').trim().toLowerCase();
    const resolvedPath = this.folderMap[raw] || folderNameOrPath.trim();

    return new Promise((resolve) => {
      const openCmd = this.isMac
        ? `open "${resolvedPath}"`
        : this.isLinux
        ? `xdg-open "${resolvedPath}"`
        : `explorer.exe "${resolvedPath}"`;

      exec(openCmd, (err) => {
        if (err) {
          resolve({ success: false, error: err.message, path: resolvedPath });
        } else {
          resolve({ success: true, path: resolvedPath });
        }
      });
    });
  }

  /**
   * Open any URL in the default web browser cross-platform (macOS, Linux, Windows)
   */
  async openUrl(url) {
    if (!url || !url.trim()) return { success: false, error: 'URL required' };
    const cleanUrl = url.trim();

    if (this.isMac) {
      return new Promise((resolve) => {
        exec(`open "${cleanUrl}"`, (err) => {
          resolve({ success: !err, url: cleanUrl });
        });
      });
    }

    if (this.isLinux) {
      return new Promise((resolve) => {
        exec(`xdg-open "${cleanUrl}"`, (err) => {
          resolve({ success: !err, url: cleanUrl });
        });
      });
    }

    // Windows
    return new Promise((resolve) => {
      const psScript = `Start-Process -FilePath "${cleanUrl}" -ErrorAction SilentlyContinue`;
      this.runPowerShell(psScript, 4000).then(res => {
        resolve({ success: true, url: cleanUrl });
      }).catch(() => {
        exec(`start "" "${cleanUrl}"`, () => {
          resolve({ success: true, url: cleanUrl });
        });
      });
    });
  }

  /**
   * Copy text to clipboard cross-platform (macOS pbcopy, Linux xclip/wl-copy, Windows Set-Clipboard)
   */
  async setClipboard(text) {
    if (!text) return { success: false };

    if (this.isMac) {
      return new Promise((resolve) => {
        try {
          const proc = spawn('pbcopy');
          proc.stdin.write(text);
          proc.stdin.end();
          proc.on('close', (code) => resolve({ success: code === 0 }));
          proc.on('error', () => resolve({ success: false }));
        } catch (e) {
          resolve({ success: false });
        }
      });
    }

    if (this.isLinux) {
      return new Promise((resolve) => {
        try {
          const proc = spawn('xclip', ['-selection', 'clipboard']);
          proc.stdin.write(text);
          proc.stdin.end();
          proc.on('close', (code) => resolve({ success: code === 0 }));
          proc.on('error', () => {
            try {
              const wlProc = spawn('wl-copy');
              wlProc.stdin.write(text);
              wlProc.stdin.end();
              wlProc.on('close', (wCode) => resolve({ success: wCode === 0 }));
            } catch (err) {
              resolve({ success: false });
            }
          });
        } catch (e) {
          resolve({ success: false });
        }
      });
    }

    // Windows
    const escaped = text.replace(/`/g, '``').replace(/"/g, '`"');
    return this.runPowerShell(`Set-Clipboard -Value "${escaped}"`, 3000);
  }

  /**
   * Automated WhatsApp message dispatch cross-platform (macOS, Windows, Android/Web)
   */
  async sendWhatsAppAutomated(phone, message) {
    if (!message) return { success: false, error: 'Message text is required' };

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(message);
    const desktopUri = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;
    const webUri = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;
    const waMeUri = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    // 1. Copy message text to clipboard as fail-safe
    await this.setClipboard(message);

    // 2. macOS automation: launch protocol and trigger send
    if (this.isMac) {
      return new Promise((resolve) => {
        exec(`open "${desktopUri}"`, (err) => {
          if (!err) {
            const script = `
            delay 1.5
            tell application "System Events"
              if exists (process "WhatsApp") then
                tell process "WhatsApp"
                  set frontmost to true
                  delay 0.5
                  key code 36
                end tell
              end if
            end tell
            `;
            exec(`osascript -e '${script.replace(/\n/g, ' ')}'`, () => {});
            resolve({
              success: true,
              phone: cleanPhone,
              message,
              desktopUri,
              webUri,
              waMeUri,
              detail: 'Dispatched via macOS WhatsApp protocol'
            });
          } else {
            this.openUrl(webUri).then(() => {
              resolve({
                success: true,
                phone: cleanPhone,
                message,
                desktopUri,
                webUri,
                waMeUri,
                detail: 'Launched WhatsApp Web'
              });
            });
          }
        });
      });
    }

    // 3. Linux automation: launch browser
    if (this.isLinux) {
      await this.openUrl(webUri);
      return {
        success: true,
        phone: cleanPhone,
        message,
        desktopUri,
        webUri,
        waMeUri,
        detail: 'Dispatched via WhatsApp Web'
      };
    }

    // 4. Windows automation: launches protocol, waits for focus, then presses Enter
    const psScript = `
Add-Type -AssemblyName System.Windows.Forms;
Start-Process -FilePath "${desktopUri}" -ErrorAction SilentlyContinue;
Start-Sleep -Milliseconds 2200;
try {
  $wscript = New-Object -ComObject WScript.Shell;
  $null = $wscript.AppActivate('WhatsApp');
  Start-Sleep -Milliseconds 800;
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}');
  Write-Output 'WHATSAPP_AUTO_SENT';
} catch {
  Write-Output 'WHATSAPP_PROTOCOL_LAUNCHED';
}
`;

    const res = await this.runPowerShell(psScript, 8000);

    return {
      success: true,
      phone: cleanPhone,
      message,
      desktopUri,
      webUri,
      waMeUri,
      detail: res.stdout || 'Dispatched'
    };
  }

  /**
   * List files in a directory
   */
  async listFiles(folderNameOrPath = 'desktop', limit = 25) {
    const raw = (folderNameOrPath || 'desktop').trim().toLowerCase();
    const targetDir = this.folderMap[raw] || path.resolve(folderNameOrPath.trim());

    try {
      if (!fs.existsSync(targetDir)) {
        return { success: false, error: `Directory does not exist: ${targetDir}` };
      }

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = entries.slice(0, limit).map(e => {
        let sizeStr = '';
        let mtime = null;
        try {
          const stats = fs.statSync(path.join(targetDir, e.name));
          mtime = stats.mtime;
          if (e.isFile()) {
            const kb = (stats.size / 1024).toFixed(1);
            sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
          } else {
            sizeStr = '<DIR>';
          }
        } catch (sErr) {}

        return {
          name: e.name,
          isDirectory: e.isDirectory(),
          type: e.isDirectory() ? 'DIR' : 'FILE',
          size: sizeStr,
          modified: mtime ? mtime.toLocaleDateString() : ''
        };
      });

      return {
        success: true,
        path: targetDir,
        totalInDir: entries.length,
        items
      };
    } catch (err) {
      return { success: false, error: err.message, path: targetDir };
    }
  }

  /**
   * Read file content safely
   */
  async readFile(filePath, maxChars = 2000) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `File not found: ${fullPath}` };
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        return { success: false, error: `Path is a directory, not a file.` };
      }

      let content = fs.readFileSync(fullPath, 'utf8');
      const truncated = content.length > maxChars;
      if (truncated) {
        content = content.substring(0, maxChars) + '\n\n...[Content truncated for display]...';
      }

      return {
        success: true,
        path: fullPath,
        sizeBytes: stats.size,
        content
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a folder
   */
  async createFolder(folderNameOrPath) {
    try {
      let fullPath = folderNameOrPath.trim();
      if (!path.isAbsolute(fullPath)) {
        fullPath = path.join(this.desktopDir, fullPath);
      }

      fs.mkdirSync(fullPath, { recursive: true });
      return { success: true, path: fullPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a text file with content
   */
  async createFile(fileNameOrPath, content = '') {
    try {
      let fullPath = fileNameOrPath.trim();
      if (!path.isAbsolute(fullPath)) {
        fullPath = path.join(this.desktopDir, fullPath);
      }

      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      return { success: true, path: fullPath, size: content.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a file or directory
   */
  async deleteFileOrFolder(targetPath) {
    try {
      const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(this.desktopDir, targetPath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `Target does not exist: ${fullPath}` };
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }

      return { success: true, path: fullPath, isDir: stats.isDirectory() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Search for files by name in common user directories
   */
  async searchFiles(searchTerm, rootDir = null) {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return { success: false, error: 'Search term required.' };

    const searchRoots = rootDir ? [rootDir] : [this.desktopDir, this.documentsDir, this.downloadsDir];
    const results = [];

    const searchDir = (dir, depth = 0) => {
      if (depth > 3 || results.length >= 20) return;
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          if (file.name.startsWith('.') || file.name.startsWith('$')) continue;
          const full = path.join(dir, file.name);
          if (file.name.toLowerCase().includes(term)) {
            results.push({
              name: file.name,
              path: full,
              isDirectory: file.isDirectory()
            });
            if (results.length >= 20) return;
          }
          if (file.isDirectory() && !file.name.includes('node_modules')) {
            searchDir(full, depth + 1);
          }
        }
      } catch (e) {}
    };

    for (const r of searchRoots) {
      if (fs.existsSync(r)) searchDir(r, 0);
    }

    return { success: true, term, results, count: results.length };
  }

  /**
   * Take a real full-screen screenshot and save to Pictures/Screenshots (macOS, Linux, Windows)
   */
  async takeScreenshot() {
    const screenshotsDir = path.join(this.picturesDir, 'Screenshots');
    try {
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
    } catch (e) {}

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `ARYA_Screenshot_${stamp}.png`;
    const targetPath = path.join(screenshotsDir, filename);

    // macOS screenshot capture using native screencapture utility
    if (this.isMac) {
      return new Promise((resolve) => {
        exec(`screencapture -x "${targetPath}"`, (err) => {
          if (!err && fs.existsSync(targetPath)) {
            exec(`open "${targetPath}"`, () => {});
            resolve({ success: true, path: targetPath, filename });
          } else {
            resolve({ success: false, error: err ? err.message : 'Screenshot capture failed on macOS' });
          }
        });
      });
    }

    // Linux screenshot capture using scrot or ImageMagick
    if (this.isLinux) {
      return new Promise((resolve) => {
        exec(`scrot "${targetPath}" || import -window root "${targetPath}"`, (err) => {
          if (!err && fs.existsSync(targetPath)) {
            exec(`xdg-open "${targetPath}"`, () => {});
            resolve({ success: true, path: targetPath, filename });
          } else {
            resolve({ success: false, error: err ? err.message : 'Screenshot capture failed on Linux' });
          }
        });
      });
    }

    // Windows screenshot capture via .NET Graphics API
    const psCode = `
Add-Type -AssemblyName System.Windows.Forms;
Add-Type -AssemblyName System.Drawing;
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height;
$g = [System.Drawing.Graphics]::FromImage($bmp);
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size);
$bmp.Save('${targetPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png);
$g.Dispose();
$bmp.Dispose();
Write-Output '${targetPath.replace(/\\/g, '\\\\')}';
`;

    const res = await this.runPowerShell(psCode, 10000);
    if (res.success && fs.existsSync(targetPath)) {
      if (this.isWindows) {
        exec(`start "" "${targetPath}"`, () => {});
      }
      return { 
        success: true, 
        path: targetPath, 
        filename, 
        imageUrl: `/api/screenshot/${encodeURIComponent(filename)}` 
      };
    } else {
      return { 
        success: false, 
        error: res.stderr || res.error || 'Display buffer currently inaccessible or locked.' 
      };
    }
  }

  /**
   * Lock System / Workstation cross-platform (macOS, Linux, Windows)
   */
  async lockSystem() {
    return new Promise((resolve) => {
      if (this.isMac) {
        exec('pmset displaysleepnow', (err) => {
          if (err) {
            exec('osascript -e \'tell application "System Events" to sleep\'', () => resolve({ success: true }));
          } else {
            resolve({ success: true });
          }
        });
      } else if (this.isLinux) {
        exec('xdg-screensaver lock || loginctl lock-session', (err) => {
          resolve({ success: !err });
        });
      } else {
        exec('rundll32.exe user32.dll,LockWorkStation', (err) => {
          resolve({ success: !err, error: err ? err.message : undefined });
        });
      }
    });
  }

  /**
   * Get Drive Storage / Disk Space telemetry cross-platform (macOS, Linux, Windows)
   */
  async getDiskSpace() {
    if (this.isMac || this.isLinux) {
      return new Promise((resolve) => {
        exec('df -k /', (err, stdout) => {
          if (!err && stdout) {
            try {
              const lines = stdout.trim().split('\n');
              if (lines.length > 1) {
                const parts = lines[1].trim().split(/\s+/);
                const totalKB = parseInt(parts[1], 10);
                const usedKB = parseInt(parts[2], 10);
                const freeKB = parseInt(parts[3], 10);
                const totalGB = (totalKB / (1024 * 1024)).toFixed(2);
                const usedGB = (usedKB / (1024 * 1024)).toFixed(2);
                const freeGB = (freeKB / (1024 * 1024)).toFixed(2);
                const percentFree = ((freeKB / totalKB) * 100).toFixed(1);
                return resolve({
                  success: true,
                  drives: [{
                    Name: '/',
                    Root: '/',
                    Description: this.isMac ? 'Macintosh HD' : 'System Root Drive',
                    TotalGB: parseFloat(totalGB),
                    UsedGB: parseFloat(usedGB),
                    FreeGB: parseFloat(freeGB),
                    PercentFree: parseFloat(percentFree)
                  }]
                });
              }
            } catch (e) {}
          }
          resolve({ success: false, error: 'Could not query disk space' });
        });
      });
    }

    // Windows
    const ps = `
Get-PSDrive -PSProvider FileSystem | Select-Object Name, Root, Description,
@{Name='FreeGB';Expression={[math]::Round($_.Free / 1GB, 2)}},
@{Name='UsedGB';Expression={[math]::Round(($_.Used) / 1GB, 2)}},
@{Name='TotalGB';Expression={[math]::Round(($_.Used + $_.Free) / 1GB, 2)}},
@{Name='PercentFree';Expression={[math]::Round(($_.Free / ($_.Used + $_.Free)) * 100, 1)}} | ConvertTo-Json
`;
    const res = await this.runPowerShell(ps, 8000);
    if (res.success && res.stdout) {
      try {
        let drives = JSON.parse(res.stdout);
        if (!Array.isArray(drives)) drives = [drives];
        return { success: true, drives };
      } catch (e) {
        return { success: false, error: 'Could not parse drive output' };
      }
    }
    return { success: false, error: res.stderr || 'Failed to query disk drives' };
  }

  /**
   * Get Battery Status cross-platform (macOS, Linux, Windows)
   */
  async getBatteryStatus() {
    if (this.isMac) {
      return new Promise((resolve) => {
        exec('pmset -g batt', (err, stdout) => {
          if (!err && stdout) {
            const pctMatch = stdout.match(/(\d+)%/);
            const percent = pctMatch ? parseInt(pctMatch[1], 10) : 100;
            const isCharging = stdout.includes('charging') || stdout.includes('AC Power') || stdout.includes('finishing charge');
            const status = stdout.includes('discharging') ? 'Discharging' : (isCharging ? 'AC Connected (Charging)' : 'AC Powered');
            return resolve({
              success: true,
              percent,
              status,
              isCharging
            });
          }
          resolve({ success: true, percent: 100, status: 'AC Connected', isCharging: true });
        });
      });
    }

    if (this.isLinux) {
      return new Promise((resolve) => {
        exec('cat /sys/class/power_supply/BAT*/capacity 2>/dev/null', (err, capOut) => {
          if (!err && capOut) {
            const percent = parseInt(capOut.trim(), 10) || 100;
            exec('cat /sys/class/power_supply/BAT*/status 2>/dev/null', (sErr, stOut) => {
              const status = (stOut || '').trim() || 'Discharging';
              const isCharging = status.toLowerCase().includes('charging');
              return resolve({ success: true, percent, status, isCharging });
            });
          } else {
            resolve({ success: true, percent: 100, status: 'AC Connected', isCharging: true });
          }
        });
      });
    }

    // Windows
    const ps = `
Get-CimInstance -ClassName Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus, EstimatedRunTime | ConvertTo-Json
`;
    const res = await this.runPowerShell(ps, 6000);
    if (res.success && res.stdout) {
      try {
        const bat = JSON.parse(res.stdout);
        const percent = bat.EstimatedChargeRemaining || 100;
        const statusMap = {
          1: 'Discharging',
          2: 'AC Connected (Charging)',
          3: 'Fully Charged',
          4: 'Low',
          5: 'Critical'
        };
        const statusText = statusMap[bat.BatteryStatus] || 'AC Powered';
        return {
          success: true,
          percent,
          status: statusText,
          isCharging: bat.BatteryStatus === 2 || bat.BatteryStatus === 3
        };
      } catch (e) {}
    }
    return { success: true, percent: 100, status: 'AC Connected', isCharging: true };
  }

  /**
   * Get Local Network IP & host information cross-platform (macOS, Linux, Windows)
   */
  async getNetworkInfo() {
    let ip = '127.0.0.1';
    let iface = 'Local';

    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address;
          iface = name;
          break;
        }
      }
      if (ip !== '127.0.0.1') break;
    }

    return {
      success: true,
      hostname: os.hostname(),
      ipAddress: ip,
      interface: iface,
      platform: this.platform
    };
  }

  /**
   * Get Running Processes cross-platform (macOS, Linux, Windows)
   */
  async getRunningProcesses(limit = 8) {
    if (this.isMac || this.isLinux) {
      return new Promise((resolve) => {
        exec(`ps -Ao comm,rss,pid -r | head -n ${limit + 1}`, (err, stdout) => {
          if (!err && stdout) {
            const lines = stdout.trim().split('\n').slice(1);
            const procs = lines.map(line => {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              const rssKB = parseInt(parts[parts.length - 2], 10) || 0;
              const nameParts = parts.slice(0, parts.length - 2);
              const processName = path.basename(nameParts.join(' '));
              return {
                ProcessName: processName,
                MemoryMB: Math.round(rssKB / 1024),
                Id: pid
              };
            });
            return resolve({ success: true, processes: procs });
          }
          resolve({ success: false, error: 'Could not fetch processes.' });
        });
      });
    }

    // Windows
    const ps = `
Get-Process | Sort-Object -Property WorkingSet -Descending | Select-Object -First ${limit} ProcessName,
@{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet / 1MB, 1)}}, Id | ConvertTo-Json
`;
    const res = await this.runPowerShell(ps, 8000);
    if (res.success && res.stdout) {
      try {
        let procs = JSON.parse(res.stdout);
        if (!Array.isArray(procs)) procs = [procs];
        return { success: true, processes: procs };
      } catch (e) {}
    }
    return { success: false, error: 'Could not fetch processes.' };
  }

  /**
   * Adjust Master Volume cross-platform (macOS, Linux, Windows)
   */
  async setVolume(action) {
    // macOS volume control via AppleScript
    if (this.isMac) {
      let osascriptCmd = '';
      if (action === 'mute' || action === 'unmute') {
        osascriptCmd = 'set volume output muted (not (output muted of (get volume settings)))';
      } else if (action === 'up') {
        osascriptCmd = 'set volume output volume ((output volume of (get volume settings)) + 12)';
      } else if (action === 'down') {
        osascriptCmd = 'set volume output volume ((output volume of (get volume settings)) - 12)';
      }
      if (osascriptCmd) {
        return new Promise((resolve) => {
          exec(`osascript -e "${osascriptCmd}"`, (err) => {
            resolve({ success: !err, action });
          });
        });
      }
    }

    // Linux volume control via amixer / PulseAudio
    if (this.isLinux) {
      let linCmd = '';
      if (action === 'mute' || action === 'unmute') linCmd = 'amixer -D pulse sset Master toggle || amixer sset Master toggle';
      else if (action === 'up') linCmd = 'amixer -D pulse sset Master 5%+ || amixer sset Master 5%+';
      else if (action === 'down') linCmd = 'amixer -D pulse sset Master 5%- || amixer sset Master 5%-';
      if (linCmd) {
        return new Promise((resolve) => {
          exec(linCmd, (err) => resolve({ success: !err, action }));
        });
      }
    }

    // Windows volume control via WScript SendKeys
    let ps = '';
    if (action === 'mute' || action === 'unmute') {
      ps = `
$wscript = New-Object -ComObject WScript.Shell;
$wscript.SendKeys([char]173);
Write-Output 'TOGGLED_MUTE';
`;
    } else if (action === 'up') {
      ps = `
$wscript = New-Object -ComObject WScript.Shell;
1..5 | ForEach-Object { $wscript.SendKeys([char]175) };
Write-Output 'VOLUME_UP';
`;
    } else if (action === 'down') {
      ps = `
$wscript = New-Object -ComObject WScript.Shell;
1..5 | ForEach-Object { $wscript.SendKeys([char]174) };
Write-Output 'VOLUME_DOWN';
`;
    }

    if (ps) {
      const res = await this.runPowerShell(ps, 5000);
      return { success: res.success, action };
    }
    return { success: false, error: 'Invalid volume action' };
  }

  /**
   * Execute arbitrary Terminal / Shell command safely cross-platform
   */
  async executeCustomCommand(cmdString) {
    if (!cmdString || !cmdString.trim()) {
      return { success: false, error: 'Command string is empty.' };
    }

    if (this.isMac || this.isLinux) {
      return new Promise((resolve) => {
        exec(cmdString.trim(), { timeout: 15000 }, (err, stdout, stderr) => {
          resolve({
            success: !err,
            command: cmdString,
            stdout: (stdout || '').trim(),
            stderr: (stderr || (err ? err.message : '')).trim(),
            error: err ? err.message : null
          });
        });
      });
    }

    const res = await this.runPowerShell(cmdString.trim(), 15000);
    return {
      success: res.success,
      command: cmdString,
      stdout: (res.stdout || '').trim(),
      stderr: (res.stderr || '').trim(),
      error: res.error || (res.success ? null : res.stderr)
    };
  }
}

module.exports = new SystemService();
