 
import io
import numpy as np
from PIL import Image, ImageChops, ImageEnhance


def generate_ela(image_path, quality=90):
    """
    Generate Error Level Analysis image.
    Highlights regions with different compression levels.
    """
    original = Image.open(image_path).convert("RGB")

    # Resave at reduced quality
    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    resaved = Image.open(buffer).convert("RGB")

    # Find difference and amplify
    ela_image = ImageChops.difference(original, resaved)
    extrema   = ela_image.getextrema()
    max_diff  = max([ex[1] for ex in extrema])
    if max_diff == 0:
        max_diff = 1
    scale     = 255.0 / max_diff
    ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)

    return ela_image


def analyze_ela(image_path, threshold=0.4):
    """
    Analyze ELA image and return tampering score.
    Genuine doc  → dark uniform ELA → high genuine_score
    Tampered doc → bright spots ELA → low genuine_score
    """
    ela       = generate_ela(image_path)
    ela_array = np.array(ela).astype(np.float32)

    mean_val     = ela_array.mean() / 255.0
    std_val      = ela_array.std() / 255.0
    bright_pixels = (ela_array > 200).sum()
    bright_ratio  = bright_pixels / ela_array.size
    max_val      = ela_array.max() / 255.0

    suspicion_score = (
        mean_val     * 0.3 +
        std_val      * 0.3 +
        bright_ratio * 0.2 +
        max_val      * 0.2
    )

    genuine_score = round(1.0 - suspicion_score, 4)

    return {
        "is_genuine":      genuine_score >= threshold,
        "genuine_score":   genuine_score,
        "suspicion_score": round(suspicion_score, 4),
        "ela_mean":        round(mean_val, 4),
        "ela_std":         round(std_val, 4),
        "bright_ratio":    round(bright_ratio, 4),
    }