FEATURES = ["on_time_rate", "tenure_months", "past_loans_on_time",
            "past_loans_late", "loan_to_savings", "guarantor_cover"]

READABLE = {
    "on_time_rate":       lambda v: f"{v*100:.0f}% of contributions paid on time",
    "tenure_months":      lambda v: f"{int(v)} months as a member",
    "past_loans_on_time": lambda v: f"{int(v)} past loans repaid on time",
    "past_loans_late":    lambda v: f"{int(v)} past loans repaid late",
    "loan_to_savings":    lambda v: f"loan is {v:.1f}x their savings",
    "guarantor_cover":    lambda v: f"guarantors cover {v*100:.0f}% of the loan",
}

def score_with_reasons(model, row):
    """row: one-row DataFrame with FEATURES columns."""
    clf = model[-1]
    z = model[:-1].transform(row)[0]
    contrib = clf.coef_[0] * z                      # + raises risk, - lowers risk
    p_default = float(model.predict_proba(row)[0, 1])
    pairs = sorted(zip(FEATURES, contrib), key=lambda t: t[1])
    helps = [READABLE[f](row[f].iloc[0]) for f, c in pairs[:2] if c < 0]
    hurts = [READABLE[f](row[f].iloc[0]) for f, c in pairs[::-1][:2] if c > 0]
    return {"score": round((1 - p_default) * 100),
            "default_probability": round(p_default, 3),
            "strengths": helps, "concerns": hurts}