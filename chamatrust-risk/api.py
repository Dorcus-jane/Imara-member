from fastapi import FastAPI
from pydantic import BaseModel
import joblib, pandas as pd
from scoring import FEATURES, score_with_reasons

app = FastAPI(title="ChamaTrust Scoring Service")
model = joblib.load("models/risk_v1.joblib")

class Member(BaseModel):
    on_time_rate: float
    tenure_months: int
    past_loans_on_time: int
    past_loans_late: int
    loan_to_savings: float
    guarantor_cover: float

@app.post("/score")
def score(m: Member):
    row = pd.DataFrame([m.model_dump()])[FEATURES]
    return score_with_reasons(model, row)

from fastapi.responses import HTMLResponse

PAGE = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ChamaTrust Risk Score</title>
<style>
 body{font-family:Arial,sans-serif;max-width:520px;margin:30px auto;padding:0 16px}
 label{display:block;margin-top:12px;font-weight:bold}
 input{width:100%;padding:8px;box-sizing:border-box}
 button{margin-top:18px;padding:10px 18px;font-size:16px;cursor:pointer}
 #out{margin-top:24px;padding:16px;border:1px solid #ccc;border-radius:8px;display:none}
 .score{font-size:48px;font-weight:bold}
</style></head><body>
<h2>ChamaTrust Risk Score</h2>
<form id="f">
 <label>On-time contribution rate (0 to 1)</label>
 <input name="on_time_rate" type="number" step="0.01" min="0" max="1" value="0.92">
 <label>Months as a member</label>
 <input name="tenure_months" type="number" step="1" min="0" value="30">
 <label>Past loans repaid on time</label>
 <input name="past_loans_on_time" type="number" step="1" min="0" value="3">
 <label>Past loans repaid late</label>
 <input name="past_loans_late" type="number" step="1" min="0" value="0">
 <label>Loan amount / savings (e.g. 1.5)</label>
 <input name="loan_to_savings" type="number" step="0.1" min="0" value="1.0">
 <label>Guarantor cover (0 to 1)</label>
 <input name="guarantor_cover" type="number" step="0.05" min="0" max="1" value="0.5">
 <button type="submit">Get score</button>
</form>
<div id="out"></div>
<script>
document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  for (const k in d) d[k] = Number(d[k]);
  const out = document.getElementById("out");
  out.style.display = "block";
  try {
    const r = await fetch("/score", {method:"POST",
      headers:{"Content-Type":"application/json"}, body: JSON.stringify(d)});
    if (!r.ok) { out.textContent = "Error: check your inputs."; return; }
    const j = await r.json();
    out.innerHTML = '<div class="score">' + j.score + '/100</div>' +
      '<p>Default probability: ' + (j.default_probability*100).toFixed(1) + '%</p>' +
      '<b>Strengths</b><ul>' + j.strengths.map(s => '<li>'+s+'</li>').join('') + '</ul>' +
      '<b>Concerns</b><ul>' + j.concerns.map(s => '<li>'+s+'</li>').join('') + '</ul>' +
      '<p><i>Advisory only: the group makes the final loan decision.</i></p>';
  } catch (err) { out.textContent = "Could not reach the API."; }
});
</script></body></html>"""

@app.get("/", response_class=HTMLResponse)
def home():
    return PAGE