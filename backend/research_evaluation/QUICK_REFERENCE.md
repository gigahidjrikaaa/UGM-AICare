# Quick Reference Card: Research Evaluation

## 🎯 Your Evaluation TODO List

### 1️⃣ RUN RQ4 TESTS (5 minutes)
```bash
cd backend/research_evaluation/rq4_privacy
pytest test_ia_k_anonymity.py -v
```
**Expected**: 5/5 tests pass ✅

---

### 2️⃣ SETUP LANGFUSE (30 minutes)
```bash
cd UGM-AICare
./dev.sh setup-langfuse

# Open http://localhost:8262
# Create account → Create project → Generate API keys

# Update .env:
LANGFUSE_ENABLED=true
LANGFUSE_HOST=http://localhost:8262
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

---

### 3️⃣ RUN RQ1 EVALUATION (30 minutes)
```bash
cd backend/research_evaluation/rq1_crisis_detection
python rq1_evaluate_sta.py

# Check results/:
# - rq1_results_<timestamp>.json
# - rq1_report_<timestamp>.md
```

---

### 4️⃣ EXECUTE RQ2 FLOWS (2 hours)
```bash
# Use flows from:
backend/research_evaluation/rq2_orchestration/rq2_orchestration_flows.json

# Send to: POST /api/v1/aika
# View traces: http://localhost:8262
```

---

### 5️⃣ RQ3 DUAL-RATER ASSESSMENT (2 hours)
```bash
# Scenarios:
backend/research_evaluation/rq3_coaching_quality/rq3_coaching_scenarios.json

# Rating template:
backend/research_evaluation/rq3_coaching_quality/rq3_rating_template.json

# Steps:
# 1. Send scenarios to SCA
# 2. Researcher rates (1-5 scale)
# 3. GPT-4 rates same responses
# 4. Calculate inter-rater agreement
```

---

## 📁 Where Everything Is

```
research_evaluation/
├── README.md              ← Start here for full guide
├── COMPLETION_SUMMARY.md  ← What's done, what's next
│
├── rq1_crisis_detection/
│   ├── rq1_crisis_scenarios.json  ← 50 scenarios
│   ├── rq1_evaluate_sta.py        ← Run this
│   └── results/                   ← Output here
│
├── rq2_orchestration/
│   └── rq2_orchestration_flows.json  ← 10 flows
│
├── rq3_coaching_quality/
│   ├── rq3_coaching_scenarios.json   ← 10 scenarios
│   └── rq3_rating_template.json      ← Fill this
│
└── rq4_privacy/
    └── test_ia_k_anonymity.py        ← Run this
```

---

## 📊 Progress Tracker

- [x] Create RQ4 unit tests
- [x] Generate RQ1 crisis scenarios (50)
- [x] Generate RQ2 orchestration flows (10)
- [x] Generate RQ3 coaching scenarios (10)
- [x] Create evaluation scripts
- [ ] Run RQ4 tests
- [ ] Setup Langfuse
- [ ] Run RQ1 evaluation
- [ ] Execute RQ2 flows
- [ ] Execute RQ3 assessment
- [ ] Document in thesis

**Progress: 50% complete** 🎉

---

## 🎓 Thesis Integration Quick Links

### Chapter 4.2 (RQ1)
Copy from: `rq1_crisis_detection/results/rq1_report_<timestamp>.md`

### Chapter 4.3 (RQ2)
Screenshots from: `http://localhost:8262` (Langfuse traces)

### Chapter 4.4 (RQ3)
Calculate from: `rq3_rating_template.json` (filled)

### Chapter 4.5 (RQ4)
Copy from: `rq4_privacy/README.md` (test results section)

---

## ⚡ Quick Commands Cheat Sheet

```bash
# Check if STA works
pytest backend/tests/agents/test_gemini_sta.py -v

# Check if SCA works
pytest backend/tests/agents/test_sca.py -v

# Start Langfuse
./dev.sh setup-langfuse

# Check Langfuse status
docker ps | grep langfuse

# View all datasets
ls -la research_evaluation/*/rq*.json
```

---

## 🆘 Troubleshooting

**RQ4 tests fail?**
→ Check database fixtures in `backend/tests/conftest.py`

**RQ1 evaluation stuck?**
→ Verify Gemini API key: `echo $GOOGLE_GEMINI_API_KEY`

**Langfuse not working?**
→ Check `.env` has LANGFUSE_ENABLED=true

**SCA not responding?**
→ Run: `pytest backend/tests/agents/test_sca.py -v`

---

## 📞 Need Help?

1. Read: `research_evaluation/README.md` (full guide)
2. Check: `COMPLETION_SUMMARY.md` (what's done)
3. Review: Individual RQ README files

---

**Last Updated**: November 12, 2025  
**Next Action**: Run RQ4 tests! 🚀
