import os
import cv2
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REFERENCE_DIR = os.path.join(BASE_DIR, "ml/stamp-service/references")


def orb_similarity(img1, img2):
    """Compare two images using ORB keypoint matching."""
    if isinstance(img1, Image.Image):
        img1 = np.array(img1.convert("L"))
    if isinstance(img2, Image.Image):
        img2 = np.array(img2.convert("L"))

    img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))

    orb = cv2.ORB_create(nfeatures=500)
    kp1, des1 = orb.detectAndCompute(img1, None)
    kp2, des2 = orb.detectAndCompute(img2, None)

    if des1 is None or des2 is None:
        return 0.0

    bf      = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)

    if len(matches) == 0:
        return 0.0

    good_matches = [m for m in matches if m.distance < 50]
    return min(len(good_matches) / max(len(kp1), len(kp2)), 1.0)


def ssim_similarity(img1, img2):
    """Compare two images using structural similarity."""
    if isinstance(img1, Image.Image):
        img1 = np.array(img1.convert("L"))
    if isinstance(img2, Image.Image):
        img2 = np.array(img2.convert("L"))

    img2       = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
    score, _   = ssim(img1, img2, full=True)
    return max(score, 0.0)


def compare_stamps(crop, reference_path, threshold=0.4):
    """Compare detected stamp with reference stamp."""
    reference  = Image.open(reference_path).convert("RGB")
    orb_score  = orb_similarity(crop, reference)
    ssim_score = ssim_similarity(crop, reference)
    final_score = (orb_score + ssim_score) / 2

    return {
        "is_genuine": final_score >= threshold,
        "score":      round(final_score, 4),
        "orb_score":  round(orb_score, 4),
        "ssim_score": round(ssim_score, 4),
    }


def verify_stamp(detections, threshold=0.4):
    """
    Verify both emblem and logo stamps.
    Returns combined result.
    """
    results = {}

    for stamp_type in ["emblem", "logo"]:
        ref_path = os.path.join(REFERENCE_DIR, f"reference_{stamp_type}.jpg")

        if stamp_type not in detections:
            results[stamp_type] = {
                "is_genuine": False,
                "score":      0.0,
                "reason":     "not detected"
            }
            continue

        crop       = detections[stamp_type]["crop"]
        comparison = compare_stamps(crop, ref_path, threshold)
        comparison["reason"] = "ok"
        results[stamp_type]  = comparison

    avg_score = round(
        sum(r["score"] for r in results.values()) / len(results), 4
    )

    return {
        "is_genuine": all(r["is_genuine"] for r in results.values()),
        "avg_score":  avg_score,
        "emblem":     results.get("emblem"),
        "logo":       results.get("logo")
    }