'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const electronAPI = {
  getSources: (types) => ipcRenderer.invoke('get-sources', types),
  getSystemAudioSources: () => ipcRenderer.invoke('get-system-audio-sources'),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  getDefaultSaveDir: () => ipcRenderer.invoke('get-default-save-dir'),
  writeFile: (data, filePath) => ipcRenderer.invoke('write-file', Buffer.from(data), filePath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  getFileSize: (filePath) => ipcRenderer.invoke('get-file-size', filePath),
  convertToMp4: (inputPath, outputPath) => ipcRenderer.invoke('convert-to-mp4', inputPath, outputPath),
  convertToGif: (inputPath, outputPath, options) => ipcRenderer.invoke('convert-to-gif', inputPath, outputPath, options),
  onConversionProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('on-conversion-progress', handler);
    return () => ipcRenderer.removeListener('on-conversion-progress', handler);
  },
  onGlobalShortcut: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on('on-global-shortcut', handler);
    return () => ipcRenderer.removeListener('on-global-shortcut', handler);
  },
  onMainProcessMessage: (callback) => {
    const handler = (_event, message) => callback(message);
    ipcRenderer.on('main-process-message', handler);
    return () => ipcRenderer.removeListener('main-process-message', handler);
  },
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getMediaDevices: () => {
    if (!navigator.mediaDevices?.enumerateDevices) return Promise.resolve([]);
    return navigator.mediaDevices.enumerateDevices().then(
      devices => devices.map(d => ({ deviceId: d.deviceId, kind: d.kind, label: d.label }))
    );
  },
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
