# E-KYC — Automated KYC Verification for Nepali Citizenship Documents

A multi-module automated Know Your Customer (KYC) verification system built for Nepali citizenship documents. The system uses computer vision and deep learning to verify document authenticity, match faces, detect liveness, and extract text — replacing manual document checking with an automated pipeline.

> Built as a minor project for academic and demonstration purposes.

---

## Demo

| Step | Description |
|---|---|
| 1 | User fills KYC form with citizenship details in Nepali |
| 2 | User uploads citizenship front image |
| 3 | User takes a live selfie via webcam |
| 4 | System runs all verification modules |
| 5 | System returns APPROVED or REJECTED with score breakdown |

---

## Features

- **Document Field Detection** — YOLOv8 detects and crops key fields from citizenship image
- **OCR Matching** — EasyOCR extracts Nepali text and compares with user-entered details
- **Face Matching** — InsightFace compares citizenship photo with live selfie
- **Passive Liveness Detection** — MiniFASNet detects spoof attempts (printed photos, screens)
- **Stamp Verification** — ORB + SSIM compares government stamp with reference template
- **Tampering Detection** — Error Level Analysis (ELA) detects digitally edited documents
- **KYC Aggregator** — Weighted scoring across all modules gives final APPROVED/REJECTED verdict

---

## System Architecture

```
Citizenship Image + Selfie + Form Data
              │
              ▼
    YOLO v8 — Field Detection
    (name, photo, stamp, c_no, emblem)
              │
        ┌─────┼──────────────┐
        ▼     ▼              ▼
      OCR   Face          Stamp
   EasyOCR  InsightFace   ORB+SSIM
  Levenshtein Cosine      Template
   matching  similarity   matching
        │     │              │
        ▼     ▼              ▼
    Liveness           Tampering
    MiniFASNet          ELA Analysis
    (2 models)         (error level)
              │
              ▼
        Aggregator
    weighted scoring
    OCR(25%) Face(25%)
    Live(20%) Stamp(15%)
    Tamper(15%)
              │
              ▼
     APPROVED / REJECTED
```

---

## Tech Stack

### Frontend
- React + Vite
- Tailwind CSS
- Axios

### Backend
- FastAPI
- Uvicorn
- Python Multipart

### Machine Learning
- PyTorch + Torchvision
- Ultralytics (YOLOv8)
- InsightFace
- EasyOCR
- OpenCV
- scikit-image (SSIM)
- Pillow (ELA)
- python-Levenshtein

---

## Project Structure

```
E-KYC/
│
├── backend/
│   ├── main.py                  # FastAPI app + routes
│   ├── models.py                # Load all ML models at startup
│   ├── requirements.txt
│   └── services/
│       ├── detection.py         # YOLO document field detection
│       ├── ocr.py               # EasyOCR + Levenshtein matching
│       ├── face.py              # InsightFace embedding + cosine similarity
│       ├── liveness.py          # MiniFASNet liveness detection
│       ├── stamp.py             # ORB + SSIM stamp verification
│       ├── tampering.py         # ELA tampering detection
│       └── aggregator.py        # Weighted KYC decision
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── pages/
│   │       ├── VerifyPage.jsx   # KYC form + image upload + webcam
│   │       └── ResultPage.jsx   # Result display with score breakdown
│   ├── package.json
│   └── vite.config.js
│
├── ml/
│   ├── docservice/
│   │   └── models/
│   │       └── doc_field_detector_v3.pt   # Trained YOLO model
│   ├── liveness-service/
│   │   └── models/
│   │       ├── 2.7_80x80_MiniFASNetV2.pth
│   │       └── 4_0_0_80x80_MiniFASNetV1SE.pth
│   ├── stamp-service/
│   │   └── references/
│   │       ├── reference_emblem.jpg
│   │       └── reference_logo.jpg
│   ├── face-service/
│   └── tampering/
│
├── notebooks/
│   ├── 01_document_detection.ipynb
│   ├── 02_ocr_matching.ipynb
│   ├── 03_face_matching.ipynb
│   ├── 04_liveness_detection.ipynb
│   ├── 05_stamp_verification.ipynb
│   ├── 06_tampering_detection.ipynb
│   └── 07_kyc_aggregator.ipynb
│
├── silent_face/                 # MiniFASNet architecture
├── data.yaml                    # YOLO dataset config
├── requirements.txt
└── README.md
```

---

## Modules

### 1. Document Field Detection
- Model: YOLOv8 (custom trained)
- Dataset: ~6000 annotated Nepali citizenship images
- Classes: `name`, `fname`, `mname`, `photo`, `c_no`, `emblem`, `logo`, `gender`
- mAP@50: **0.963**

### 2. OCR Matching
- Model: EasyOCR with Nepali (`ne`) language
- Matching: Levenshtein distance similarity
- Threshold: 80% similarity to pass
- Fields checked: name, father's name, mother's name, citizenship number, gender

### 3. Face Matching
- Model: InsightFace `buffalo_l`
- Method: 512-dimensional face embeddings + cosine similarity
- Threshold: 0.4 cosine similarity
- Confidence levels: high (≥0.6), medium (≥0.4), low (<0.4)

### 4. Liveness Detection
- Model: MiniFASNet V2 + MiniFASNet V1SE (ensemble of 2)
- Method: Passive — single image analysis, no user interaction
- Detects: printed photos, screen replays, spoofed images
- Threshold: 0.6 averaged score from both models

### 5. Stamp Verification
- Method: ORB keypoint matching + SSIM structural similarity
- Reference: pre-saved stamp crops from genuine citizenship
- Classes: `emblem` (government seal) + `logo` (office stamp)
- Threshold: 0.4 combined score

### 6. Tampering Detection
- Method: Error Level Analysis (ELA)
- How: Resaves image at reduced JPEG quality, finds compression inconsistencies
- Metrics: ELA mean, std deviation, bright pixel ratio, max value
- Threshold: genuine score ≥ 0.4

### 7. KYC Aggregator
```
weighted_score = OCR(25%) + Face(25%) + Liveness(20%) + Stamp(15%) + Tampering(15%)

Hard reject rules (override score):
  - Liveness failed  → REJECTED (spoof attempt)
  - Tampering found  → REJECTED (forged document)

Final:
  weighted_score ≥ 0.6 → APPROVED
  weighted_score < 0.6 → REJECTED
```

---

## Setup & Installation

### Prerequisites
- Python 3.11
- Node.js 18+
- NVIDIA GPU (recommended — RTX 4060 or similar)
- CUDA 12.1

### 1. Clone the repository

```bash
git clone https://github.com/Anish494/KYC-Project.git
cd KYC-Project
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv myenv
myenv\Scripts\activate   # Windows
source myenv/bin/activate  # Linux/Mac

# Install dependencies
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install onnxruntime-gpu==1.20.0
pip install -r backend/requirements.txt
```

### 3. Download Required Models

The following model files are not included in the repository due to size. Place them in the correct folders:

| Model | Location |
|---|---|
| `doc_field_detector_v3.pt` | `ml/docservice/models/` |
| `2.7_80x80_MiniFASNetV2.pth` | `ml/liveness-service/models/` |
| `4_0_0_80x80_MiniFASNetV1SE.pth` | `ml/liveness-service/models/` |
| InsightFace `buffalo_l` | Downloaded automatically to `~/.insightface/` |

Liveness models can be downloaded from:
```
https://github.com/minivision-ai/Silent-Face-Anti-Spoofing
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

---

## Running the Project

### Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

API will be available at `http://localhost:8000`
Swagger docs at `http://localhost:8000/docs`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## API Endpoints

### `GET /`
Health check

### `POST /verify`
Main KYC verification endpoint

**Form Data:**
| Field | Type | Description |
|---|---|---|
| `citizenship_front` | File | Citizenship front image |
| `selfie` | File | User selfie image |
| `name` | String | Full name (Nepali) |
| `fname` | String | Father's name (Nepali) |
| `mname` | String | Mother's name (Nepali) |
| `c_no` | String | Citizenship number |
| `gender` | String | Gender (Nepali) |

**Response:**
```json
{
  "status": "APPROVED",
  "weighted_score": 0.85,
  "reason": "all checks passed",
  "breakdown": {
    "ocr":       { "score": 1.0,  "weight": "25%" },
    "face":      { "score": 0.82, "weight": "25%" },
    "liveness":  { "score": 0.75, "weight": "20%" },
    "stamp":     { "score": 0.65, "weight": "15%" },
    "tampering": { "score": 0.79, "weight": "15%" }
  },
  "details": { ... }
}
```

---

## Dataset

- ~6000 Nepali citizenship images collected and annotated
- Augmentations applied: noise, blur, phone tilt
- Annotated using Roboflow
- YOLO format (`.txt` label files)
- 90/10 train/validation split

---

## Limitations

- Liveness detection works best with real webcam photos in good lighting
- Face matching requires a clear, visible face in the citizenship photo crop
- Stamp verification accuracy depends on the reference stamp quality
- OCR accuracy depends on image quality and YOLO field detection

---

## Team

Minor Project — Computer Science
- Anish Kumar Singh

---

## License

This project is for academic and demonstration purposes only.
Not intended for production use in real KYC systems.