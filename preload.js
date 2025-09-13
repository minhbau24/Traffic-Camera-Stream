// Preload script cho Electron app
// File này chạy trong renderer process và có thể truy cập Node.js APIs

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // FastAPI endpoints
    fastApiUrl: 'http://localhost:8000',

    // Helper function để gọi FastAPI
    callFastAPI: async (endpoint, options = {}) => {
        const url = `http://localhost:8000${endpoint}`;
        try {
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('FastAPI call failed:', error);
            throw error;
        }
    },

    // Specific method cho object detection
    detectObjects: async (imageFile) => {
        const formData = new FormData();
        formData.append('file', imageFile);

        try {
            const response = await fetch('http://localhost:8000/detect', {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Object detection failed:', error);
            throw error;
        }
    }
});