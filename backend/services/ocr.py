import numpy as np
from PIL import Image
import Levenshtein
from models import ocr_reader


def run_ocr_on_crop(pil_image, upscale=3):
    """Extract text from a cropped field image."""
    w, h = pil_image.size
    upscaled = pil_image.resize((w * upscale, h * upscale), Image.LANCZOS)
    img_array = np.array(upscaled)
    results = ocr_reader.readtext(
        img_array,
        text_threshold=0.4,
        low_text=0.3,
        link_threshold=0.3
    )
    extracted_text = " ".join([text for (_, text, conf) in results])
    avg_conf = sum([conf for (_, _, conf) in results]) / len(results) if results else 0
    return extracted_text, avg_conf


def normalize_text(text):
    """Remove spaces and strip text."""
    text = text.strip()
    text = " ".join(text.split())
    return text.replace(" ", "")


def match_field(ocr_text, user_text, threshold=0.80):
    """Compare OCR extracted text with user provided text."""
    ocr_norm  = normalize_text(ocr_text)
    user_norm = normalize_text(user_text)

    if not ocr_norm or not user_norm:
        return {"match": False, "similarity": 0.0}

    distance   = Levenshtein.distance(ocr_norm, user_norm)
    max_len    = max(len(ocr_norm), len(user_norm))
    similarity = 1 - (distance / max_len)

    return {
        "match":      similarity >= threshold,
        "similarity": round(similarity, 3)
    }


def verify_ocr(detections, user_data):
    """
    Run OCR on all detected fields and compare with user data.
    Returns match result for each field.
    """
    fields  = ["fname", "mname", "name", "c_no", "gender"]
    results = {}

    for field in fields:
        if field not in detections:
            results[field] = {
                "status": "not_detected",
                "match":  False
            }
            continue

        if field not in user_data or not user_data[field]:
            results[field] = {
                "status": "no_user_value",
                "match":  False
            }
            continue

        ocr_text, _ = run_ocr_on_crop(detections[field]["crop"])
        match = match_field(ocr_text, user_data[field])
        results[field] = {
            "status":     "checked",
            "match":      match["match"],
            "similarity": match["similarity"]
        }

    overall_match = all(r["match"] for r in results.values())

    return {
        "overall_match": overall_match,
        "fields":        results
    }