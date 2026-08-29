 
from PIL import Image
from models import doc_model


def detect_and_crop(image_path, conf_threshold=0.25):
    """
    Run YOLO on citizenship image.
    Returns dict of detected fields with their crops.
    """
    results = doc_model.predict(
        source=image_path,
        conf=conf_threshold,
        verbose=False
    )
    original_image = Image.open(image_path).convert("RGB")
    detections = {}

    for box in results[0].boxes:
        cls_id   = int(box.cls[0])
        cls_name = doc_model.names[cls_id]
        conf     = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        # Keep highest confidence detection per class
        if cls_name in detections and detections[cls_name]["confidence"] >= conf:
            continue

        crop = original_image.crop((x1, y1, x2, y2))
        detections[cls_name] = {
            "crop":       crop,
            "confidence": conf,
            "bbox":       (x1, y1, x2, y2)
        }

    return detections