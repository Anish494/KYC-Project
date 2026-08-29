# Automated KYC Verification for Nepali Citizenship Documents

A multi-module automated Know Your Customer (KYC) verification system built for Nepali citizenship documents. The system uses computer vision and deep learning to verify document authenticity, match faces, detect liveness, and extract text — replacing manual document checking with an automated pipeline.

Inspired by the real-world work being done by [Prixa.ai](https://prixa.ai), a Nepali AI company solving real social issues through technology. This project is a personal exploration of the same problem — built solo, learned from scratch.

---

## Background

This project was built independently, taking inspiration from a similar project made by friends during their college minor project semester. The dataset was forked from [Roboflow Universe](https://universe.roboflow.com/minor-project-6nasi/annotate-augment) — around 100 Nepali citizenship images — which were then augmented (noise, blur, phone tilt) to ~6000 images and annotated with 8 field classes using Roboflow.

---

## How It Works

| Step | What Happens |
|---|---|
| 1 | User fills KYC form with citizenship details in Nepali |
| 2 | User uploads citizenship front image |
| 3 | User takes a live selfie via webcam |
| 4 | System runs all 6 verification modules |
| 5 | Aggregator combines scores and returns APPROVED or REJECTED |

---

## Features

- **Document Field Detection** — YOLOv8 trained on Nepali citizenship images detects and crops `name`, `fname`, `mname`, `photo`, `c_no`, `emblem`, `logo`, `gender` fields
- **OCR Matching** — EasyOCR extracts Nepali text from cropped fields and compares with user-entered details using Levenshtein similarity
- **Face Matching** — InsightFace `buffalo_l` extracts 512-dim embeddings from citizenship photo and selfie, compared using cosine similarity
- **Passive Liveness Detection** — Ensemble of two MiniFASNet models detects spoof attempts without requiring user interaction
- **Stamp Verification** — ORB keypoint matching + SSIM structural similarity compares detected `emblem` and `logo` against reference stamps
- **Tampering Detection** — Error Level Analysis (ELA) detects digitally edited regions in the citizenship image
- **KYC Aggregator** — Weighted scoring across all modules with hard reject rules gives final APPROVED/REJECTED verdict

---

## System Architecture

```
Citizenship Image + Selfie + Form Data
              │
              ▼
    YOLOv8 — Field Detection
    (name, fname, mname, photo, c_no, emblem, logo, gender)
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
    (2 models avg)     (error level)
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
- InsightFace (`buffalo_l`)
- EasyOCR (Nepali language)
- OpenCV (ORB)
- scikit-image (SSIM)
- Pillow (ELA)
- python-Levenshtein

---

## Project Structure

```
KYC-Project/
│
├── backend/
│   ├── main.py                  # FastAPI app + routes
│   ├── models.py                # Loads all ML models once at startup
│   ├── requirements.txt
│   └── services/
│       ├── detection.py         # YOLO field detection + cropping
│       ├── ocr.py               # EasyOCR extraction + Levenshtein matching
│       ├── face.py              # InsightFace embeddings + cosine similarity
│       ├── liveness.py          # MiniFASNet ensemble liveness check
│       ├── stamp.py             # ORB + SSIM stamp comparison
│       ├── tampering.py         # ELA-based tampering analysis
│       └── aggregator.py        # Weighted KYC decision logic
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── pages/
│   │       ├── VerifyPage.jsx   # KYC form, image upload, webcam capture
│   │       └── ResultPage.jsx   # Score breakdown and final verdict
│   ├── package.json
│   └── vite.config.js
│
├── ml/
│   ├── docservice/
│   │   └── models/
│   │       └── doc_field_detector_v3.pt    # Trained YOLOv8 weights
│   ├── liveness-service/
│   │   └── models/
│   │       ├── 2.7_80x80_MiniFASNetV2.pth
│   │       └── 4_0_0_80x80_MiniFASNetV1SE.pth
│   ├── stamp-service/
│   │   └── references/
│   │       ├── reference_emblem.jpg        # Reference government emblem
│   │       └── reference_logo.jpg          # Reference office stamp
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
├── silent_face/                 # MiniFASNet model architecture code
├── data.yaml                    # YOLO dataset config
└── README.md
```

---

## Modules

### 1. Document Field Detection
- Model: YOLOv8 custom trained (`doc_field_detector_v3.pt`)
- Dataset: ~100 base images from Roboflow, augmented to ~6000
- Classes: `name`, `fname`, `mname`, `photo`, `c_no`, `emblem`, `logo`, `gender`
- mAP@50: **0.963**
- Detection threshold: `conf_threshold=0.25`

### 2. OCR Matching (`services/ocr.py`)
- Model: EasyOCR with Nepali (`ne`) language
- Crops upscaled 3x before OCR for better accuracy
- Matching: Levenshtein distance normalized to similarity score
- Threshold: 80% similarity per field to pass
- Fields: `name`, `fname`, `mname`, `c_no`, `gender`

### 3. Face Matching (`services/face.py`)
- Model: InsightFace `buffalo_l`
- Embeddings: 512-dimensional face vectors
- Comparison: cosine similarity between citizenship photo crop and selfie
- Threshold: 0.4
- Confidence: high (≥0.6), medium (≥0.4), low (<0.4)

### 4. Liveness Detection (`services/liveness.py`)
- Models: `MiniFASNetV2` + `MiniFASNetV1SE` averaged
- Passive detection — single image, no user action needed
- Detects: printed photos, phone screen replays, spoofed submissions
- Threshold: averaged score ≥ 0.6

### 5. Stamp Verification (`services/stamp.py`)
- ORB: finds and matches keypoints between detected stamp and reference
- SSIM: structural similarity of grayscale resized images
- Checks both `emblem` (government seal) and `logo` (office stamp)
- Final score = (orb_score + ssim_score) / 2, threshold 0.4

### 6. Tampering Detection (`services/tampering.py`)
- Method: Error Level Analysis (ELA)
- Resaves image at JPEG quality=90, finds pixel-level difference
- Amplifies differences to highlight edited regions
- Metrics: `ela_mean`, `ela_std`, `bright_ratio`, `ela_max`
- genuine_score = 1 - suspicion_score, threshold 0.4

### 7. KYC Aggregator (`services/aggregator.py`)
```
weighted_score = ocr_score   * 0.25
               + face_score  * 0.25
               + live_score  * 0.20
               + stamp_score * 0.15
               + tamper_score * 0.15

Hard reject rules (override weighted score):
  - liveness is_live = False       → REJECTED (spoof attempt)
  - tampering is_genuine = False   → REJECTED (forged document)

Final decision:
  weighted_score >= 0.6 → APPROVED
  weighted_score <  0.6 → REJECTED
```

---

## Setup & Installation

### Prerequisites
- Python 3.11
- Node.js 18+
- NVIDIA GPU (tested on RTX 4060 Laptop GPU)
- CUDA 12.1

### 1. Clone the Repository

```bash
git clone https://github.com/Anish494/KYC-Project.git
cd KYC-Project
```

### 2. Backend Setup

```bash
python -m venv myenv

# Windows
myenv\Scripts\activate

# Linux/Mac
source myenv/bin/activate

# Install PyTorch with CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install onnxruntime-gpu (must be this version for CUDA 12.1)
pip install onnxruntime-gpu==1.20.0

# Install remaining dependencies
pip install -r backend/requirements.txt
```

### 3. Download Required Models

Model weights are not included in the repository. Place them in the correct folders:

| Model | Folder |
|---|---|
| `doc_field_detector_v3.pt` | `ml/docservice/models/` |
| `2.7_80x80_MiniFASNetV2.pth` | `ml/liveness-service/models/` |
| `4_0_0_80x80_MiniFASNetV1SE.pth` | `ml/liveness-service/models/` |
| InsightFace `buffalo_l` | Auto-downloaded to `~/.insightface/models/` on first run |

Liveness model weights from:
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

### Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm run dev
```

- App: `http://localhost:5173`

---

## API

### `GET /`
Health check — returns `{"status": "ok"}`

### `POST /verify`

**Form Data:**

| Field | Type | Description |
|---|---|---|
| `citizenship_front` | File | Citizenship front image (JPG/PNG) |
| `selfie` | File | Live selfie image (JPG/PNG) |
| `name` | String | Full name in Nepali |
| `fname` | String | Father's name in Nepali |
| `mname` | String | Mother's name in Nepali |
| `c_no` | String | Citizenship number |
| `gender` | String | Gender in Nepali (पुरुष / महिला / अन्य) |

**Response:**

```json
{
  "status": "APPROVED",
  "weighted_score": 0.85,
  "reason": "all checks passed",
  "detected_fields": ["name", "fname", "mname", "photo", "c_no", "emblem", "logo"],
  "breakdown": {
    "ocr":       { "score": 1.0,  "weight": "25%" },
    "face":      { "score": 0.82, "weight": "25%" },
    "liveness":  { "score": 0.75, "weight": "20%" },
    "stamp":     { "score": 0.65, "weight": "15%" },
    "tampering": { "score": 0.79, "weight": "15%" }
  },
  "details": {
    "ocr": {
      "overall_match": true,
      "fields": {
        "name":   { "status": "checked", "match": true,  "similarity": 0.923 },
        "fname":  { "status": "checked", "match": true,  "similarity": 0.889 },
        "mname":  { "status": "checked", "match": true,  "similarity": 0.901 },
        "c_no":   { "status": "checked", "match": true,  "similarity": 1.0   },
        "gender": { "status": "checked", "match": true,  "similarity": 1.0   }
      }
    },
    "face":      { "match": true,  "score": 0.82, "confidence": "high"  },
    "liveness":  { "is_live": true, "score": 0.75, "label": "real"      },
    "stamp":     { "is_genuine": true, "avg_score": 0.65                 },
    "tampering": { "is_genuine": true, "genuine_score": 0.79             }
  }
}
```

---

## Dataset

- Base: ~100 Nepali citizenship photos forked from [Roboflow Universe](https://universe.roboflow.com/minor-project-6nasi/annotate-augment)
- Augmented to ~6000 images (noise, blur, phone tilt)
- Annotated using Roboflow with 8 classes
- Format: YOLO `.txt` label files
- Split: 90% train / 10% validation

---

## Limitations

- Liveness detection works best with real webcam selfies in good lighting — downloaded photos will fail
- Face matching requires a clear face in the citizenship photo crop — small or blurry crops reduce accuracy
- Stamp verification accuracy depends on reference stamp being from the same citizenship type being tested
- OCR accuracy depends on YOLO successfully detecting the field — undetected fields are marked as `not_detected`
- Tested only on Nepali citizenship front side

---

## Inspiration

This project was built after seeing the kind of real-world AI work being done by [Prixa.ai](https://prixa.ai) in Nepal. Thanks to friends who built a similar project during their college minor project — their work gave me direction on the problem and the approach.

---

## Author

**Anish Kumar Singh**