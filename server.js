// server.js
const { spawn } = require('child_process');
const WebSocket = require('ws');
const axios = require('axios');

// 👉 Đổi thành file video để test
const VIDEO_FILE = 'sample2.mp4';  // để cùng folder với server.js
const FASTAPI_URL = 'http://localhost:8000/detect';
const FormData = require('form-data');

// WebSocket server cho Electron (FE)
const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', ws => {
    console.log('FE connected');
});

// Spawn ffmpeg: đọc từ video file -> xuất MJPEG frames với loop vô hạn
// -stream_loop -1 => loop vô hạn
// -r 5 => 5 fps (200ms giữa các frames)
const ffmpeg = spawn('ffmpeg', [
    '-stream_loop', '-1',  // Loop vô hạn
    '-i', VIDEO_FILE,
    '-r', '5',              // 5 FPS
    '-f', 'image2pipe',
    '-qscale', '5',
    '-vcodec', 'mjpeg',
    '-'
]);

let frameBuffer = Buffer.alloc(0);
let lastFrameTime = Date.now();
const FRAME_INTERVAL = 200; // 200ms = 5 FPS (1000ms / 5)

// Queue để chứa frames và gửi theo timing
const frameQueue = [];
let isProcessingQueue = false;

// Xử lý queue frames theo timing
function processFrameQueue() {
    if (isProcessingQueue || frameQueue.length === 0) return;

    isProcessingQueue = true;
    const frame = frameQueue.shift();

    // 1) Gửi frame tới tất cả FE client
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(frame);
    });

    // 2) Gửi frame tới FastAPI detect (throttled)
    sendToFastAPI(frame).catch(err =>
        console.error('detect err', err.message)
    );

    // 3) Đặt delay cho frame tiếp theo
    setTimeout(() => {
        isProcessingQueue = false;
        processFrameQueue(); // Xử lý frame tiếp theo
    }, FRAME_INTERVAL);
}

// Ghép chunk và cắt từng JPEG frame
ffmpeg.stdout.on('data', chunk => {
    frameBuffer = Buffer.concat([frameBuffer, chunk]);
    let start = 0;
    while (true) {
        const soi = frameBuffer.indexOf(Buffer.from([0xff, 0xd8]), start); // Start of Image
        const eoi = frameBuffer.indexOf(Buffer.from([0xff, 0xd9]), soi + 2); // End of Image
        if (soi !== -1 && eoi !== -1) {
            const jpeg = frameBuffer.slice(soi, eoi + 2);

            // Thêm frame vào queue thay vì gửi ngay lập tức
            frameQueue.push(jpeg);

            // Bắt đầu xử lý queue nếu chưa bắt đầu
            if (!isProcessingQueue) {
                processFrameQueue();
            }

            // Cắt buffer đã xử lý
            frameBuffer = frameBuffer.slice(eoi + 2);
            start = 0;
        } else {
            break;
        }
    }
});

ffmpeg.stderr.on('data', d => {
    // In log ffmpeg (nếu muốn debug)
    // console.log('ffmpeg:', d.toString());
});

ffmpeg.on('close', code => {
    console.log('ffmpeg closed', code);
});

// Gửi ảnh sang FastAPI detect (throttled)
let sending = false;
let lastDetectionTime = 0;
const DETECTION_INTERVAL = 1000; // 1 giây/1 detection để tránh spam

async function sendToFastAPI(jpegBuffer) {
    const now = Date.now();

    // Kiểm tra throttling
    if (sending || (now - lastDetectionTime) < DETECTION_INTERVAL) {
        return;
    }

    sending = true;
    lastDetectionTime = now;

    try {
        const form = new FormData();
        form.append('file', jpegBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });

        const resp = await axios.post(FASTAPI_URL, form, {
            headers: form.getHeaders(),
            timeout: 5000,
        });

        const payload = JSON.stringify({ type: 'detections', data: resp.data });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(payload);
        });

        console.log(`Detection completed - found ${resp.data.boxes?.length || 0} objects`);
    } catch (error) {
        console.error('FastAPI error:', error.message);
    } finally {
        sending = false;
    }
}

console.log('🚦 Traffic Camera Stream Server Starting...');
console.log(`📁 Video file: ${VIDEO_FILE}`);
console.log(`🌐 WebSocket server: ws://localhost:8080`);
console.log(`🤖 FastAPI endpoint: ${FASTAPI_URL}`);
console.log(`⏱️  Frame rate: 5 FPS (${FRAME_INTERVAL}ms interval)`);
console.log(`🔍 Detection rate: 1 per second`);
console.log('✅ Server is ready! Connect from Electron app...');
