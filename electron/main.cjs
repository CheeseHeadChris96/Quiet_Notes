const { app, BrowserWindow, Menu, dialog, ipcMain, clipboard, nativeImage, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const page = path.join(__dirname, '../src/index.html');
let updates=null;
function trustedWindow(event) {
  if (event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== pathToFileURL(page).href) throw new Error('Unknown page');
  return BrowserWindow.fromWebContents(event.sender);
}
ipcMain.handle('app:check-updates',async event=>{trustedWindow(event);return updates?updates.check(true):{status:'development'};});
ipcMain.handle('text:open', async event => {
  const win = trustedWindow(event);
  try {
    const result = await dialog.showOpenDialog(win, { title: 'Open text as a note', properties: ['openFile'], filters: [{name:'Text and Markdown',extensions:['txt','md','markdown']}] });
    if (result.canceled) return null;
    const filename = result.filePaths[0];
    if ((await fs.stat(filename)).size > 2_000_000) throw new Error('Choose a text file smaller than 2 MB.');
    const content = new TextDecoder('utf-8', {fatal:true}).decode(await fs.readFile(filename));
    if (content.includes('\0')) throw new Error('Choose a UTF-8 text file.');
    return {name:path.basename(filename),content};
  } catch (error) { return {error:error.message}; }
});
ipcMain.handle('text:save', async (event, data) => {
  const win = trustedWindow(event);
  try {
    if (!data || typeof data.name !== 'string' || typeof data.content !== 'string' || Buffer.byteLength(data.content,'utf8') > 20_000_000) throw new Error('Invalid text file or file too large.');
    const name = path.basename(data.name).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180) || 'Untitled.txt';
    const result = await dialog.showSaveDialog(win, {title:'Save text file',defaultPath:name,filters:[{name:'Text and Markdown',extensions:['txt','md','markdown']}],properties:['createDirectory','showOverwriteConfirmation']});
    if (result.canceled) return null;
    await fs.writeFile(result.filePath, data.content, 'utf8');
    return {name:path.basename(result.filePath)};
  } catch (error) { return {error:error.message}; }
});
function photoBytes(data){
  if(!(data instanceof Uint8Array)||!data.length||data.length>20_000_000)throw new Error('Invalid photo or photo too large.');
  const bytes=Buffer.from(data);if(nativeImage.createFromBuffer(bytes).isEmpty())throw new Error('This photo could not be opened.');return bytes;
}
ipcMain.handle('photo:copy',async(event,data)=>{try{trustedWindow(event);clipboard.writeImage(nativeImage.createFromBuffer(photoBytes(data)));return {ok:true};}catch(error){return {error:error.message};}});
ipcMain.handle('photo:save',async(event,data)=>{
  try{
    const win=trustedWindow(event),bytes=photoBytes(data?.bytes);
    if(typeof data.name!=='string')throw new Error('Invalid photo name.');
    const name=path.basename(data.name).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180)||'Photo.png';
    const result=await dialog.showSaveDialog(win,{title:'Save photo',defaultPath:name,properties:['createDirectory','showOverwriteConfirmation']});
    if(result.canceled)return null;await fs.writeFile(result.filePath,bytes);return {name:path.basename(result.filePath)};
  }catch(error){return {error:error.message};}
});
function createWindow() {
  const win = new BrowserWindow({ width: 780, height: 780, minWidth: 520, minHeight: 500, backgroundColor: '#ffffff', title: 'Quiet Notes', webPreferences: { preload: path.join(__dirname,'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, '../src/index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
  ]));
  createWindow();
  if(app.isPackaged){
    const {createChecker}=require('./updates.cjs');
    const stateFile=path.join(app.getPath('userData'),'update-checks.json');
    updates=createChecker({version:app.getVersion(),platform:process.platform,arch:process.arch,
      readState:async()=>JSON.parse(await fs.readFile(stateFile,'utf8')),
      writeState:state=>fs.writeFile(stateFile,JSON.stringify(state),'utf8'),
      openExternal:url=>shell.openExternal(url),
      showMessage:options=>{const win=BrowserWindow.getFocusedWindow()||BrowserWindow.getAllWindows()[0];return win?dialog.showMessageBox(win,options):dialog.showMessageBox(options);}
    });
    const start=setTimeout(()=>updates.check(),10000);start.unref();
    const timer=setInterval(()=>updates.check(),6*60*60*1000);timer.unref();
    app.on('before-quit',()=>{clearTimeout(start);clearInterval(timer);});
  }
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
