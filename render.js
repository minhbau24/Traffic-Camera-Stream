// Traffic Camera Stream Client
let ws = null;
let isStreaming = false;
let latestDetections = [];
let frameCount = 0;
let detectionCount = 0;
let startTime = null;
let fpsCounter = 0;
let lastFpsUpdate = Date.now();

const img = new Image();

// Elements
const canvas = document.getElementById("videoCanvas");
const ctx = canvas.getContext("2d");
const wsStatusEl = document.getElementById("wsStatus");
const apiStatusEl = document.getElementById("apiStatus");
const streamStatusEl = document.getElementById("streamStatus");
const frameCountEl = document.getElementById("frameCount");
const detectionCountEl = document.getElementById("detectionCount");
const uptimeEl = document.getElementById("uptime");
const fpsCounterEl = document.getElementById("fpsCounter");
const connectionStatusEl = document.getElementById("connectionStatus");
const detectionListEl = document.getElementById("detectionList");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

// Check FastAPI status
async function checkFastAPIStatus() {
    try {
        const response = await fetch('http://localhost:8000/docs');
        apiStatusEl.textContent = 'Connected';
        apiStatusEl.style.color = '#4CAF50';
        return true;
    } catch (error) {
        apiStatusEl.textContent = 'Disconnected';
        apiStatusEl.style.color = '#f44336';
        return false;
    }
}

// Start WebSocket connection
function startStream() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket connected');
        return;
    }

    ws = new WebSocket("ws://localhost:8080");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
        console.log('WebSocket connected');
        wsStatusEl.textContent = 'Connected';
        wsStatusEl.style.color = '#4CAF50';
        connectionStatusEl.className = 'connected';
        streamStatusEl.textContent = 'Running';
        streamStatusEl.style.color = '#4CAF50';

        isStreaming = true;
        startTime = Date.now();
        startBtn.disabled = true;
        stopBtn.disabled = false;
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsStatusEl.textContent = 'Disconnected';
        wsStatusEl.style.color = '#f44336';
        connectionStatusEl.className = 'disconnected';
        streamStatusEl.textContent = 'Stopped';
        streamStatusEl.style.color = '#666';

        isStreaming = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatusEl.className = 'disconnected';
    };

    // Handle incoming messages
    ws.onmessage = (evt) => {
        if (typeof evt.data === "string") {
            // JSON data (detections)
            try {
                const msg = JSON.parse(evt.data);
                if (msg.type === "detections") {
                    latestDetections = msg.data;
                    detectionCount++;
                    updateDetectionDisplay(msg.data);

                    // Debug frame sync
                    console.log(`🎯 Detection received for frame ${msg.frame || 'unknown'}, current frame: ${frameCount}`);
                }
            } catch (error) {
                console.error('Error parsing detection data:', error);
            }
        } else {
            // Binary data (JPEG frame)
            frameCount++;
            updateFPS();

            const blob = new Blob([evt.data], { type: "image/jpeg" });
            img.src = URL.createObjectURL(blob);
        }
    };
}

// Stop WebSocket connection
function stopStream() {
    if (ws) {
        ws.close();
        ws = null;
    }
    isStreaming = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

// Update FPS counter
function updateFPS() {
    const now = Date.now();
    if (now - lastFpsUpdate >= 1000) {
        fpsCounterEl.textContent = `FPS: ${fpsCounter}`;
        fpsCounter = 0;
        lastFpsUpdate = now;
    }
    fpsCounter++;
}

// Update statistics
function updateStats() {
    frameCountEl.textContent = frameCount;
    detectionCountEl.textContent = detectionCount;

    if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        uptimeEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Update detection display
function updateDetectionDisplay(detections) {
    if (!detections.boxes || detections.boxes.length === 0) {
        detectionListEl.innerHTML = '<p style="color: #666;">Không phát hiện đối tượng nào...</p>';
        return;
    }

    let html = '';
    detections.boxes.forEach((box, i) => {
        const label = detections.labels?.[i] || "unknown";
        const score = detections.scores?.[i] || 0;
        const confidence = Math.round(score * 100);

        html += `
            <div class="detection-item">
                <strong>${label}</strong> - ${confidence}%
                <small style="color: #999; margin-left: 10px;">
                    Box: [${box.map(n => Math.round(n)).join(', ')}]
                </small>
            </div>
        `;
    });

    detectionListEl.innerHTML = html;
}

// Draw frame and bounding boxes
img.onload = () => {
    // Auto-resize canvas to image size
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the image
    ctx.drawImage(img, 0, 0);

    // Draw bounding boxes and labels
    if (latestDetections.boxes && latestDetections.boxes.length > 0) {
        latestDetections.boxes.forEach((box, i) => {
            const [x1, y1, x2, y2] = box;
            const label = latestDetections.labels?.[i] || "obj";
            const score = latestDetections.scores?.[i] || 0;
            const confidence = Math.round(score * 100);

            // Draw bounding box
            ctx.strokeStyle = "#ff4444";
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            // Draw label background
            const labelText = `${label} ${confidence}%`;
            ctx.font = "bold 16px Arial";
            const textWidth = ctx.measureText(labelText).width;

            ctx.fillStyle = "rgba(255, 68, 68, 0.8)";
            ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);

            // Draw label text
            ctx.fillStyle = "white";
            ctx.fillText(labelText, x1 + 5, y1 - 8);
        });
    }

    // Release blob URL to prevent memory leaks
    URL.revokeObjectURL(img.src);
};

// Toggle fullscreen for canvas
function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        canvas.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check FastAPI status periodically
    checkFastAPIStatus();
    setInterval(checkFastAPIStatus, 5000);

    // Update stats periodically
    setInterval(updateStats, 1000);

    console.log('Traffic Camera Stream App initialized');
});

// Auto-start stream when page loads (optional)
// setTimeout(startStream, 1000);
