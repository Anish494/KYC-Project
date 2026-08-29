 
import numpy as np
import cv2
from PIL import Image
from models import face_app


def get_face_embedding(image, upscale=3):
    """Extract 512-dim face embedding from image."""
    if isinstance(image, Image.Image):
        w, h = image.size
        image = image.resize((w * upscale, h * upscale), Image.LANCZOS)
        img_array = np.array(image.convert("RGB"))
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    else:
        img_bgr = image

    faces = face_app.get(img_bgr)

    if len(faces) == 0:
        return None, "no face detected"

    # Take largest face if multiple detected
    face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
    return face.embedding, "ok"


def cosine_similarity(emb1, emb2):
    """Compute cosine similarity between two embeddings."""
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))


def match_faces(image1, image2, threshold=0.4):
    """
    Compare two face images.
    image1 - citizenship photo crop (PIL Image)
    image2 - selfie (PIL Image)
    """
    emb1, status1 = get_face_embedding(image1)
    if emb1 is None:
        return {
            "match":      False,
            "score":      0.0,
            "reason":     f"citizenship photo — {status1}",
            "confidence": "low"
        }

    emb2, status2 = get_face_embedding(image2)
    if emb2 is None:
        return {
            "match":      False,
            "score":      0.0,
            "reason":     f"selfie — {status2}",
            "confidence": "low"
        }

    score      = cosine_similarity(emb1, emb2)
    confidence = "high" if score >= 0.6 else "medium" if score >= 0.4 else "low"

    return {
        "match":      score >= threshold,
        "score":      round(score, 4),
        "confidence": confidence,
        "reason":     "ok"
    }