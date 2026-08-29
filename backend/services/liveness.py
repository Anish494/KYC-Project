 
import torch
import numpy as np
import cv2
from PIL import Image
from models import liveness_model1, liveness_model2, liveness_transform, device


def predict_liveness(model, face_img):
    """Run single model prediction on a face image."""
    if isinstance(face_img, np.ndarray):
        face_img = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))

    tensor = liveness_transform(face_img).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(tensor)
        prob   = torch.softmax(output, dim=1)
        # class 1 = real, class 0 = fake
        real_score = prob[0][1].item()

    return real_score


def check_liveness(selfie_path, threshold=0.6):
    """
    Full liveness check.
    Averages predictions from both models.
    """
    img = Image.open(selfie_path).convert("RGB")

    score1 = predict_liveness(liveness_model1, img)
    score2 = predict_liveness(liveness_model2, img)

    final_score = (score1 + score2) / 2

    return {
        "is_live":      final_score >= threshold,
        "score":        round(final_score, 4),
        "score_model1": round(score1, 4),
        "score_model2": round(score2, 4),
        "label":        "real" if final_score >= threshold else "spoof"
    }