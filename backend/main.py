import os
import uuid
import shutil
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from services.detection  import detect_and_crop
from services.ocr        import verify_ocr, run_ocr_on_crop
from services.face       import match_faces
from services.liveness   import check_liveness
from services.stamp      import verify_stamp
from services.tampering  import analyze_ela
from services.aggregator import kyc_decision

app = FastAPI(title="E-KYC API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_DIR = os.path.join(BASE_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "E-KYC API is running"}


@app.post("/debug-ocr")
async def debug_ocr(citizenship_front: UploadFile = File(...)):
    session_id   = str(uuid.uuid4())[:8]
    temp_session = os.path.join(TEMP_DIR, session_id)
    os.makedirs(temp_session, exist_ok=True)
    front_path   = os.path.join(temp_session, "front.jpg")

    with open(front_path, "wb") as f:
        f.write(await citizenship_front.read())

    try:
        detections  = detect_and_crop(front_path)
        ocr_results = {}
        for field, data in detections.items():
            text, conf = run_ocr_on_crop(data["crop"])
            ocr_results[field] = {
                "extracted_text": text,
                "confidence":     round(float(conf), 3),
                "crop_size":      list(data["crop"].size)
            }
        return {
            "detected_fields": list(detections.keys()),
            "ocr":             ocr_results
        }
    finally:
        shutil.rmtree(temp_session, ignore_errors=True)


@app.post("/verify")
async def verify_kyc(
    citizenship_front: UploadFile = File(...),
    selfie:            UploadFile = File(...),
    fname:             str = Form(...),
    mname:             str = Form(...),
    name:              str = Form(...),
    c_no:              str = Form(...),
    gender:            str = Form(...),
):
    session_id   = str(uuid.uuid4())[:8]
    temp_session = os.path.join(TEMP_DIR, session_id)
    os.makedirs(temp_session, exist_ok=True)

    front_path  = os.path.join(temp_session, "front.jpg")
    selfie_path = os.path.join(temp_session, "selfie.jpg")

    with open(front_path, "wb") as f:
        f.write(await citizenship_front.read())
    with open(selfie_path, "wb") as f:
        f.write(await selfie.read())

    try:
        detections = detect_and_crop(front_path)

        user_data  = {
            "fname": fname, "mname": mname,
            "name":  name,  "c_no":  c_no,
            "gender": gender
        }
        ocr_result = verify_ocr(detections, user_data)

        if "photo" in detections:
            photo_crop  = detections["photo"]["crop"]
            selfie_img  = Image.open(selfie_path).convert("RGB")
            face_result = match_faces(photo_crop, selfie_img)
        else:
            face_result = {
                "match": False, "score": 0.0,
                "reason": "photo not detected", "confidence": "low"
            }

        liveness_result  = check_liveness(selfie_path)
        stamp_result     = verify_stamp(detections)
        tampering_result = analyze_ela(front_path)

        final = kyc_decision(
            ocr_result, face_result,
            liveness_result, stamp_result, tampering_result
        )

        return {
            "status":          final["status"],
            "weighted_score":  float(final["weighted_score"]),
            "reason":          final["reason"],
            "detected_fields": list(detections.keys()),
            "breakdown": {
                k: {"score": float(v["score"]), "weight": v["weight"]}
                for k, v in final["breakdown"].items()
            },
            "details": {
                "ocr": {
                    "overall_match": bool(ocr_result["overall_match"]),
                    "fields": {
                        k: {
                            "status":     v["status"],
                            "match":      bool(v.get("match", False)),
                            "similarity": float(v.get("similarity", 0.0))
                        }
                        for k, v in ocr_result["fields"].items()
                    }
                },
                "face": {
                    "match":      bool(face_result["match"]),
                    "score":      float(face_result["score"]),
                    "reason":     face_result.get("reason", ""),
                    "confidence": face_result.get("confidence", "low"),
                },
                "liveness": {
                    "is_live": bool(liveness_result["is_live"]),
                    "score":   float(liveness_result["score"]),
                    "label":   liveness_result["label"],
                },
                "stamp": {
                    "is_genuine": bool(stamp_result["is_genuine"]),
                    "avg_score":  float(stamp_result["avg_score"]),
                    "emblem": {
                        "is_genuine": bool(stamp_result["emblem"]["is_genuine"]),
                        "score":      float(stamp_result["emblem"]["score"]),
                    },
                    "logo": {
                        "is_genuine": bool(stamp_result["logo"]["is_genuine"]),
                        "score":      float(stamp_result["logo"]["score"]),
                    },
                },
                "tampering": {
                    "is_genuine":      bool(tampering_result["is_genuine"]),
                    "genuine_score":   float(tampering_result["genuine_score"]),
                    "suspicion_score": float(tampering_result["suspicion_score"]),
                },
            }
        }

    finally:
        shutil.rmtree(temp_session, ignore_errors=True)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)