# app.py
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import io
import numpy as np
from ultralytics import YOLO

app = FastAPI()
model = YOLO("checkpoint_last.pt")  # load a custom model

@app.post("/detect")
async def detect(file: bytes = File(...)):
    # file: raw jpeg bytes (mimic our Node POST Content-Type: image/jpeg)
    try:
        img = Image.open(io.BytesIO(file)).convert("RGB")
    except Exception as e:
        return JSONResponse({"error": "invalid image"}, status_code=400)

    w, h = img.size

    # Inference
    results = model(img)
    res = results[0]  # first result for first image (since batch size = 1)

    if not res.boxes:
        return {"boxes": [], "labels": [], "scores": []}

    # Extract data
    boxes = res.boxes.xyxy.cpu().numpy().tolist()   # [[x1,y1,x2,y2], ...]
    labels = [model.names[int(c)] for c in res.boxes.cls.cpu().numpy().tolist()]  # tên class
    scores = res.boxes.conf.cpu().numpy().tolist()  # [0.9, 0.8, ...]

    return {
        "boxes": boxes,
        "labels": labels,
        "scores": scores
    }


# run: uvicorn app:app --host 0.0.0.0 --port 8000
