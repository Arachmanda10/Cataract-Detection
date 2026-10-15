import os
import io
import secrets
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "cataract_model.tflite"
CLASS_NAMES = ["cataract", "normal"]  # urutan sama persis dengan saat training
IMG_SIZE = (224, 224)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

# Tempat menyimpan model yang dimuat sekali saat server menyala
state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dijalankan SEKALI sebelum server menerima request
    interpreter = Interpreter(model_path=str(MODEL_PATH))
    interpreter.allocate_tensors()
    state["interpreter"] = interpreter
    state["input_index"] = interpreter.get_input_details()[0]["index"]
    state["output_index"] = interpreter.get_output_details()[0]["index"]
    state["lock"] = threading.Lock()
    yield
    # Dijalankan saat server dimatikan
    state.clear()


app = FastAPI(title="Cataract ML Service", version="1.0.0", lifespan=lifespan)


def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("ML_API_KEY")
    if not expected:
        raise HTTPException(status_code=500, detail="ML_API_KEY belum diatur di server")
    if not x_api_key or not secrets.compare_digest(
        x_api_key.encode(), expected.encode()
    ):
        raise HTTPException(status_code=401, detail="API key tidak valid")


def preprocess(data: bytes) -> np.ndarray:
    try:
        image = Image.open(io.BytesIO(data))
        if image.format not in ALLOWED_FORMATS:
            raise HTTPException(status_code=415, detail="Format harus JPEG, PNG, atau WebP")
        image = image.convert("RGB").resize(IMG_SIZE, Image.Resampling.BILINEAR)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="File bukan gambar yang valid")

    array = np.asarray(image, dtype=np.float32)
    array = array / 127.5 - 1.0  # sama dengan mobilenet_v2.preprocess_input: [0,255] -> [-1,1]
    return np.expand_dims(array, axis=0)  # (224,224,3) -> (1,224,224,3)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "interpreter" in state}


@app.post("/predict", dependencies=[Depends(verify_api_key)])
def predict(file: UploadFile):
    data = file.file.read(MAX_FILE_SIZE + 1)
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Ukuran file maksimal 5 MB")

    batch = preprocess(data)

    # Interpreter tidak dirancang dipakai bersamaan oleh banyak thread, jadi dikunci
    with state["lock"]:
        start = time.perf_counter()
        state["interpreter"].set_tensor(state["input_index"], batch)
        state["interpreter"].invoke()
        output = state["interpreter"].get_tensor(state["output_index"])[0]
        inference_ms = (time.perf_counter() - start) * 1000

    return {
        "label": CLASS_NAMES[int(np.argmax(output))],
        "confidence": float(np.max(output)),
        "probabilities": {name: float(p) for name, p in zip(CLASS_NAMES, output)},
        "inference_ms": round(inference_ms, 2),
    }