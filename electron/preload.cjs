'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronConfig', {
  /** Read the current config from main process */
  get: () => ipcRenderer.invoke('config:get'),

  /** Persist config updates (partial object) */
  set: (updates) => ipcRenderer.invoke('config:set', updates),

  /** Used by setup.html to submit the initial Immich server URL */
  submit: (serverUrl) => ipcRenderer.send('setup:submit', serverUrl),
})
