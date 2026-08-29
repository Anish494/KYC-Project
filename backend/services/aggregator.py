 
def kyc_decision(
    ocr_result,
    face_result,
    liveness_result,
    stamp_result,
    tampering_result
):
    """
    Combines all module results into final KYC decision.
    
    Weights:
      OCR matching    25%
      Face matching   25%
      Liveness        20%
      Stamp           15%
      Tampering       15%
    
    Hard reject rules (override score):
      - Liveness failed  -> REJECTED
      - Tampering found  -> REJECTED
    """

    # ── Extract scores ───────────────────────────────────
    ocr_score    = 1.0 if ocr_result.get("overall_match") else 0.0
    face_score   = float(face_result.get("score", 0.0))
    live_score   = float(liveness_result.get("score", 0.0))
    stamp_score  = float(stamp_result.get("avg_score", 0.0))
    tamper_score = float(tampering_result.get("genuine_score", 0.0))

    # ── Hard rules ───────────────────────────────────────
    hard_reject_reason = None

    if not liveness_result.get("is_live"):
        hard_reject_reason = "liveness check failed — possible spoof attempt"

    if not tampering_result.get("is_genuine"):
        hard_reject_reason = "tampering detected — document may be forged"

    # ── Weighted score ───────────────────────────────────
    weighted_score = (
        ocr_score    * 0.25 +
        face_score   * 0.25 +
        live_score   * 0.20 +
        stamp_score  * 0.15 +
        tamper_score * 0.15
    )

    # ── Final decision ───────────────────────────────────
    if hard_reject_reason:
        status = "REJECTED"
        reason = hard_reject_reason
    elif weighted_score >= 0.6:
        status = "APPROVED"
        reason = "all checks passed"
    else:
        status = "REJECTED"
        reason = "insufficient verification score"

    return {
        "status":         status,
        "weighted_score": round(weighted_score, 4),
        "reason":         reason,
        "breakdown": {
            "ocr":       {"score": ocr_score,    "weight": "25%"},
            "face":      {"score": face_score,   "weight": "25%"},
            "liveness":  {"score": live_score,   "weight": "20%"},
            "stamp":     {"score": stamp_score,  "weight": "15%"},
            "tampering": {"score": tamper_score, "weight": "15%"},
        }
    }