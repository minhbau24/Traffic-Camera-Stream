# 🚦 Traffic Camera Stream - Real-time Object Detection

Ứng dụng theo dõi camera giao thông với phát hiện đối tượng thời gian thực sử dụng Electron, FastAPI, WebSocket và YOLO.

## 📋 Tổng quan

Hệ thống all-in-one tích hợp:
- **Electron App**: Giao diện người dùng hiện đại
- **FastAPI**: API server cho object detection với YOLO
- **WebSocket Server**: Streaming video real-time
- **FFmpeg**: Xử lý video và chuyển đổi frames

## 🎯 Tính năng

- ✅ Stream video real-time từ file MP4
- ✅ Object detection với YOLO model (phát hiện xe cộ)
- ✅ Hiển thị bounding boxes và confidence scores
- ✅ FPS counter và thống kê real-time
- ✅ Auto-start tất cả services với một lệnh
- ✅ Frame synchronization giữa video và detection
- ✅ Video loop vô hạn
- ✅ FastAPI warmup để tránh detection trễ

## 🛠️ Yêu cầu hệ thống

### Software
- **Node.js** (v14 trở lên)
- **Python** (v3.8 trở lên)
- **FFmpeg** (cài đặt và có trong PATH)

### Python Packages
```bash
pip install fastapi uvicorn pillow numpy ultralytics
```

### Node.js Packages
```bash
npm install
```

## 📁 Cấu trúc dự án

```
test1/
├── app.py                 # FastAPI server (object detection)
├── main.js               # Electron main process
├── preload.js            # Electron preload script
├── index.html            # Giao diện chính
├── render.js             # WebSocket client logic
├── server.js             # WebSocket server + FFmpeg
├── package.json          # Node.js dependencies
├── checkpoint_last.pt    # YOLO model weights
├── sample2.mp4           # Video test (camera giao thông)
└── README.md             # Tài liệu này
```

## 🚀 Cách chạy

### 1. Cài đặt dependencies

```bash
# Node.js packages
npm install

# Python packages (trong virtual environment)
pip install fastapi uvicorn pillow numpy ultralytics
```

### 2. Chạy ứng dụng

Chỉ cần một lệnh duy nhất:

```bash
npm run electron
```

**Hoặc:**

```bash
npm run app
```

### 3. Sử dụng

1. **Ứng dụng sẽ tự động:**
   - Khởi chạy FastAPI server (port 8000)
   - Khởi chạy WebSocket server (port 8080)
   - Mở Electron window

2. **Trong ứng dụng:**
   - Nhấn "🎬 Bắt đầu Stream" để kết nối WebSocket
   - Xem video stream với object detection real-time
   - Nhấn "🔍 Toàn màn hình" để xem fullscreen

## 📊 Thông số kỹ thuật

| Thông số | Giá trị |
|----------|---------|
| Video FPS | 5 FPS |
| Detection Rate | 1 detection/giây |
| WebSocket Port | 8080 |
| FastAPI Port | 8000 |
| Frame Interval | 200ms |
| Detection Timeout | 5 giây |

## 🎮 Các script NPM

```bash
npm run electron       # Chạy ứng dụng hoàn chình (khuyến nghị)
npm run app           # Tương tự electron
npm run fastapi       # Chỉ chạy FastAPI server
npm start             # Chỉ chạy WebSocket server
npm run electron-dev  # Chạy Electron với DevTools
```

## 🔧 Cấu hình

### Thay đổi video source
Chỉnh sửa trong `server.js`:
```javascript
const VIDEO_FILE = 'your-video.mp4';
```

### Thay đổi FPS
Chỉnh sửa trong `server.js`:
```javascript
const FRAME_INTERVAL = 200; // 200ms = 5 FPS
```

### Thay đổi detection frequency
Chỉnh sửa trong `server.js`:
```javascript
const DETECTION_INTERVAL = 1000; // 1 giây/detection
```

## 📖 API Documentation

### FastAPI Endpoints
- **GET /docs**: Swagger documentation
- **POST /detect**: Object detection endpoint
  - Input: Multipart form với file ảnh
  - Output: JSON với boxes, labels, scores

### WebSocket Messages
- **Binary**: JPEG frame data
- **JSON**: Detection results
```json
{
  "type": "detections",
  "data": {
    "boxes": [[x1, y1, x2, y2], ...],
    "labels": ["Car_Topview", ...],
    "scores": [0.95, ...]
  },
  "frame": 123
}
```

## 🐛 Troubleshooting

### "WebSocket: Disconnected"
- Đảm bảo WebSocket server đang chạy (npm run electron)
- Kiểm tra port 8080 không bị chiếm dụng

### "FastAPI: Disconnected"
- Đảm bảo Python dependencies đã cài đặt
- Kiểm tra port 8000 không bị chiếm dụng
- Kiểm tra YOLO model file `checkpoint_last.pt`

### "FastAPI error: timeout"
- Model YOLO cần thời gian warmup lần đầu
- Đợi một chút để FastAPI khởi động hoàn toàn

### Video không hiển thị
- Kiểm tra file `sample2.mp4` tồn tại
- Đảm bảo FFmpeg đã cài đặt và có trong PATH

## 🎨 Giao diện

- **Dark theme**: Phù hợp cho monitoring 24/7
- **Real-time stats**: FPS, frame count, detection count
- **Connection status**: WebSocket và FastAPI status
- **Detection display**: Danh sách objects được phát hiện
- **Control buttons**: Start/Stop stream, fullscreen

## 🔒 Bảo mật

- **Context Isolation**: Enabled trong Electron
- **Node Integration**: Disabled trong renderer
- **Preload Script**: Secure API exposure
- **Local Network**: Tất cả services chạy localhost

## 🚀 Performance

- **Frame Sync**: Detection results được sync với video frames
- **Throttling**: Detection được giới hạn để tránh spam FastAPI
- **Memory Management**: Auto cleanup blob URLs
- **Process Management**: Auto kill tất cả processes khi thoát

## 📝 Changelog

### v1.0.0
- ✅ All-in-one solution với một lệnh chạy
- ✅ Frame synchronization
- ✅ FastAPI warmup
- ✅ Video loop vô hạn
- ✅ Real-time object detection
- ✅ Modern UI với dark theme

## 👥 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra phần Troubleshooting
2. Xem logs trong terminal
3. Mở DevTools trong Electron (F12)
4. Tạo issue với logs chi tiết

---

**Tạo bởi:** GitHub Copilot  
**Ngày cập nhật:** September 13, 2025  
**Version:** 1.0.0