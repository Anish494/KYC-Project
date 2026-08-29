import os
import sys
import torch

# ── Paths ──────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "silent_face"))

# ── Device ─────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {device}")

# ── Document Detection ─────────────────────────────────────
from ultralytics import YOLO
doc_model = YOLO(os.path.join(BASE_DIR, "ml/docservice/models/doc_field_detector_v3.pt"))
print("Document detection model loaded")

# ── Face Matching ──────────────────────────────────────────
from insightface.app import FaceAnalysis
face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
)
face_app.prepare(ctx_id=0, det_size=(640, 640))
print("Face model loaded")

# ── OCR ────────────────────────────────────────────────────
import easyocr
ocr_reader = easyocr.Reader(['ne'], gpu=torch.cuda.is_available())
print("OCR model loaded")

# ── Liveness ───────────────────────────────────────────────
import torchvision.transforms as transforms
from src.model_lib.MiniFASNet import MiniFASNetV2, MiniFASNetV1SE

def _load_liveness_model(model_name, model_class):
    path = os.path.join(BASE_DIR, f"ml/liveness-service/models/{model_name}")
    model = model_class(conv6_kernel=(5, 5))
    state = torch.load(path, map_location=device)
    if "state_dict" in state:
        state = state["state_dict"]
    state = {k.replace("module.", ""): v for k, v in state.items()}
    new_state = {}
    for k, v in state.items():
        k = k.replace(".se_fc1.", ".se_module.fc1.")
        k = k.replace(".se_fc2.", ".se_module.fc2.")
        k = k.replace(".se_bn1.", ".se_module.bn1.")
        k = k.replace(".se_bn2.", ".se_module.bn2.")
        new_state[k] = v
    model.load_state_dict(new_state, strict=False)
    model.to(device)
    model.eval()
    return model

liveness_model1 = _load_liveness_model("2.7_80x80_MiniFASNetV2.pth", MiniFASNetV2)
liveness_model2 = _load_liveness_model("4_0_0_80x80_MiniFASNetV1SE.pth", MiniFASNetV1SE)

liveness_transform = transforms.Compose([
    transforms.Resize((80, 80)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])
print("Liveness models loaded")

print("All models ready") 
