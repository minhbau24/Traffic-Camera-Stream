const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let fastApiProcess = null;
let webSocketProcess = null;

function startFastAPI() {
    console.log("Starting FastAPI server...");

    // Khởi chạy FastAPI với uvicorn
    fastApiProcess = spawn("python", ["-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    fastApiProcess.stdout.on('data', (data) => {
        console.log(`FastAPI stdout: ${data}`);
    });

    fastApiProcess.stderr.on('data', (data) => {
        console.log(`FastAPI stderr: ${data}`);
    });

    fastApiProcess.on('close', (code) => {
        console.log(`FastAPI process exited with code ${code}`);
    });

    // Đợi FastAPI khởi động hoàn toàn với health check
    return new Promise(async (resolve) => {
        let attempts = 0;
        const maxAttempts = 10;

        const checkFastAPI = async () => {
            try {
                const response = await fetch('http://localhost:8000/docs');
                if (response.ok) {
                    console.log("FastAPI server ready at http://localhost:8000");
                    resolve();
                    return;
                }
            } catch (error) {
                // FastAPI chưa sẵn sàng
            }

            attempts++;
            if (attempts < maxAttempts) {
                console.log(`Waiting for FastAPI to start... (${attempts}/${maxAttempts})`);
                setTimeout(checkFastAPI, 1000);
            } else {
                console.log("FastAPI server ready at http://localhost:8000 (timeout)");
                resolve();
            }
        };

        // Đợi 2 giây trước khi bắt đầu check
        setTimeout(checkFastAPI, 2000);
    });
}

function stopFastAPI() {
    if (fastApiProcess) {
        console.log("Stopping FastAPI server...");
        fastApiProcess.kill();
        fastApiProcess = null;
    }
}

function startWebSocketServer() {
    console.log("Starting WebSocket server...");

    // Khởi chạy WebSocket server (server.js)
    webSocketProcess = spawn("node", ["server.js"], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    webSocketProcess.stdout.on('data', (data) => {
        console.log(`WebSocket stdout: ${data}`);
    });

    webSocketProcess.stderr.on('data', (data) => {
        console.log(`WebSocket stderr: ${data}`);
    });

    webSocketProcess.on('close', (code) => {
        console.log(`WebSocket process exited with code ${code}`);
    });

    // Đợi WebSocket server khởi động và bắt đầu stream
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("WebSocket server ready at ws://localhost:8080");
            resolve();
        }, 3000); // Tăng thời gian đợi để đảm bảo stream bắt đầu
    });
}

function stopWebSocketServer() {
    if (webSocketProcess) {
        console.log("Stopping WebSocket server...");
        webSocketProcess.kill();
        webSocketProcess = null;
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false, // Bảo mật tốt hơn
            contextIsolation: true, // Bảo mật tốt hơn
        },
    });

    win.loadFile("index.html");

    // Mở DevTools trong chế độ development
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    return win;
}

async function initializeApp() {
    console.log("🚀 Starting Traffic Camera Stream App...");

    // Khởi động FastAPI trước
    await startFastAPI();

    // Khởi động WebSocket server
    await startWebSocketServer();

    // Sau đó tạo window
    console.log("📱 Creating Electron window...");
    createWindow();

    console.log("✅ All services ready!");
}

app.whenReady().then(initializeApp);

// Thoát app khi tất cả windows đã đóng (trừ macOS)
app.on('window-all-closed', () => {
    // Tắt cả FastAPI và WebSocket server khi đóng app
    stopFastAPI();
    stopWebSocketServer();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Tạo window mới khi app được kích hoạt (macOS)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Đảm bảo tắt cả hai servers khi app bị kill
app.on('before-quit', () => {
    stopFastAPI();
    stopWebSocketServer();
});

process.on('exit', () => {
    stopFastAPI();
    stopWebSocketServer();
});
