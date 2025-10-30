# Aika Enhanced Chat - Manual Testing Guide

## 🚀 Quick Start

### Terminal 1: Start Backend
```bash
cd backend
source .venv/Scripts/activate  # Windows Git Bash
# or
.venv\Scripts\activate.ps1      # PowerShell

uvicorn app.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

**Verify:** Open http://localhost:8000/docs (should show FastAPI docs)

---

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:4000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 3.2s
```

**Verify:** Open http://localhost:4000 (should show home page)

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Low-Risk Casual Chat

**Goal:** Verify basic chat works with agent activity display

**Steps:**
1. Navigate to: http://localhost:4000/aika-enhanced
2. Sign in (if needed)
3. Send message: **"Hi Aika, how are you today?"**

**Expected Results:**
- ✓ Message appears in chat window
- ✓ Aika responds with friendly greeting
- ✓ **Agent Activity Badge** appears: "Consulted: Safety, Support"
- ✓ Processing time shown (e.g., "250ms")
- ✓ NO risk indicator (clean UI for low-risk)
- ✓ NO escalation notification
- ✓ Sound effect plays on response

**Screenshot Checklist:**
- [ ] User message bubble (purple gradient)
- [ ] Aika message bubble (white/transparent)
- [ ] Aika avatar image displayed
- [ ] Agent activity badge visible
- [ ] Timestamp formatted correctly

---

### ⚠️ Scenario 2: Medium-Risk Stress Expression

**Goal:** Test risk detection and indicator display

**Steps:**
1. Continue in same chat
2. Send: **"I'm feeling really stressed about my exams and I can't sleep well"**

**Expected Results:**
- ✓ Empathetic, supportive response
- ✓ **Agent Activity Badge**: "Consulted: Safety, Support"
- ✓ **YELLOW Risk Indicator** appears
- ✓ Risk factors listed: "Stress, Sleep Issues"
- ✓ Risk level badge: "Moderate Risk"
- ✓ NO escalation (not critical)
- ✓ May suggest CBT intervention plan

**Screenshot Checklist:**
- [ ] Yellow/amber risk indicator visible
- [ ] Risk factors displayed
- [ ] Supportive tone in response
- [ ] Agent badge shows STA + SCA consulted

---

### 🚨 Scenario 3: High-Risk Crisis Language

**Goal:** Test escalation notification and case creation

**Steps:**
1. Continue in same chat
2. Send: **"I don't think I can handle this anymore, everything feels hopeless"**

**Expected Results:**
- ✓ Crisis intervention response with immediate support
- ✓ **Agent Activity Badge**: "Consulted: Safety, Support, Service Desk"
- ✓ **RED Risk Indicator** (Critical)
- ✓ Risk factors: "Hopelessness, Crisis Language"
- ✓ **TEAL Escalation Notification**: "Case #XXXX created"
- ✓ Emergency resources provided in response
- ✓ Processing time may be higher (500-1000ms)

**Backend Console Check:**
Look for logs:
```
🚑 URGENT CASE: User X, risk=critical, factors=[...]
✅ Created case XXXX for user X (severity: critical)
```

**Screenshot Checklist:**
- [ ] Red/orange risk indicator
- [ ] Escalation notification (teal background)
- [ ] Case ID displayed
- [ ] All three agents consulted (STA+SCA+SDA)
- [ ] Emergency tone in response

---

### 🎨 Scenario 4: UI Feature Testing

**Goal:** Verify all UI interactions work

#### A. Metadata Toggle
**Steps:**
1. Click **Info (ℹ️) button** in header
2. Verify technical details appear below chat

**Expected:**
- ✓ Metadata panel expands
- ✓ Shows: session_id, agents_invoked, processing_time, etc.
- ✓ Button highlights when active
- ✓ Click again to hide

#### B. Intervention Plans
**Steps:**
1. Click **Plans (📋) button** in header
2. Sidebar opens from right

**Expected:**
- ✓ Sidebar slides in
- ✓ Shows active intervention plans (if any)
- ✓ Badge shows count (if plans exist)
- ✓ Click outside or close button to dismiss

#### C. Keyboard Shortcuts
**Steps:**
1. Focus textarea
2. Type multi-line message
3. Test shortcuts:
   - **Enter** → Sends message
   - **Shift+Enter** → New line (doesn't send)

**Expected:**
- ✓ Enter sends message immediately
- ✓ Shift+Enter creates newline
- ✓ Textarea auto-resizes as you type

#### D. Sound Effects
**Steps:**
1. Send any message
2. Wait for response
3. Listen for sound effects

**Expected:**
- ✓ User message: "bubble_user.mp3" plays
- ✓ Aika message: "bubble_aika.mp3" plays
- ✓ Sounds can be disabled in settings (future)

#### E. Markdown Rendering
**Steps:**
1. Ask Aika: **"Can you show me examples of markdown?"**
2. Aika should respond with markdown samples

**Test these in messages:**
- `**bold text**` → **bold text**
- `*italic text*` → *italic text*
- Bullet lists render correctly
- Code blocks render with syntax highlighting

---

### 📱 Scenario 5: Responsive Design

**Goal:** Test mobile/tablet layouts

**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test viewports:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1280px)

**Expected:**
- ✓ Layout adapts to screen size
- ✓ Buttons remain tappable (min 44x44px)
- ✓ Text remains readable
- ✓ No horizontal scroll
- ✓ Avatar sizes adjust appropriately

---

## 🔍 Performance Testing

### Browser DevTools Checks

#### Console Tab
**What to look for:**
- ✓ NO red errors
- ✓ Optional: Info logs showing agent activity
- ✓ Optional: Debug logs (if enabled)

**Red flags:**
- ❌ 404 errors (missing assets)
- ❌ CORS errors
- ❌ JavaScript exceptions

#### Network Tab
**Monitor:**
1. Filter: **Fetch/XHR**
2. Send a message
3. Look for: `POST /api/mental-health/aika`

**Check:**
- ✓ Status: 200 OK
- ✓ Response time: < 2000ms (typical 500-1000ms)
- ✓ Response payload includes: response, metadata, risk_assessment

**Red flags:**
- ❌ 401 Unauthorized (auth issue)
- ❌ 500 Server Error (backend crash)
- ❌ Timeout (> 30 seconds)

#### Performance Tab
**Steps:**
1. Click Record
2. Send 3-5 messages
3. Stop recording
4. Analyze

**Check:**
- ✓ FPS: ~60fps (smooth animations)
- ✓ No layout thrashing
- ✓ Minimal main thread blocking

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" error

**Symptoms:** 401 response, can't send messages

**Solutions:**
1. Clear browser cookies
2. Sign out and sign in again
3. Check `.env.local` has correct `NEXTAUTH_SECRET`
4. Verify user exists in database

---

### Issue: No agent activity badges appear

**Symptoms:** Messages send/receive but no metadata display

**Solutions:**
1. Check backend logs for orchestration
2. Verify response includes `metadata` field
3. Check browser console for errors
4. Try toggling metadata display (Info button)

---

### Issue: Sound effects don't play

**Symptoms:** No audio on messages

**Solutions:**
1. Check browser allows audio (no autoplay block)
2. Verify audio files exist in `/public/` folder
3. Check browser console for 404 on audio files
4. Ensure `messageSoundsEnabled` setting is true

---

### Issue: Backend crashes on high-risk message

**Symptoms:** 500 error, backend terminal shows traceback

**Check:**
1. Database connection working?
2. `Case` table exists? (run migrations)
3. User has valid role?
4. Check logs for specific error

**Common fixes:**
```bash
# Re-run migrations
cd backend
alembic upgrade head

# Check database connection
python -c "from app.core.database import get_db; print('DB OK')"
```

---

## ✅ Testing Checklist Summary

**Basic Functionality:**
- [ ] Can send and receive messages
- [ ] Messages display in correct order
- [ ] Timestamps show correct time
- [ ] Loading state shows while waiting
- [ ] Error handling works (test with backend off)

**Agent Activity:**
- [ ] Agent badges appear after response
- [ ] Shows correct agent names (Safety, Support, Service, Insights)
- [ ] Processing time displays
- [ ] Badge clears after next message (or stays, depending on design)

**Risk Detection:**
- [ ] Low-risk: NO risk indicator
- [ ] Medium-risk: YELLOW indicator with factors
- [ ] High-risk: ORANGE/RED indicator with factors
- [ ] Critical-risk: RED indicator + escalation

**Escalation:**
- [ ] Escalation notification appears (teal)
- [ ] Case ID displays correctly
- [ ] Backend logs show case creation
- [ ] Case appears in counselor dashboard (manual check)

**UI Interactions:**
- [ ] Metadata toggle works
- [ ] Plans sidebar opens/closes
- [ ] Keyboard shortcuts work
- [ ] Sound effects play
- [ ] Markdown renders correctly
- [ ] Avatars display correctly
- [ ] Animations smooth (no jank)

**Responsive:**
- [ ] Mobile layout (< 768px)
- [ ] Tablet layout (768-1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Touch targets adequate

**Performance:**
- [ ] Page load < 2s
- [ ] Message send/receive < 2s
- [ ] 60fps animations
- [ ] No console errors
- [ ] No memory leaks

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader compatible (optional)

---

## 📊 Success Criteria

**To pass testing and move to admin/counselor interfaces:**

1. ✅ All 5 test scenarios pass
2. ✅ No TypeScript/console errors
3. ✅ Performance targets met
4. ✅ UI quality matches original Aika
5. ✅ Agent orchestration transparent to user
6. ✅ Risk indicators work correctly
7. ✅ Escalation creates cases successfully

**Quality Bar:**
- User experience should feel identical to original Aika
- New features (agent visibility, risk indicators) should enhance, not disrupt
- No technical debt or TODOs blocking production

---

## 🎯 Next Steps After Testing

**If all tests pass:**
1. Document any issues found (non-blocking)
2. Create GitHub issue for minor improvements
3. Proceed to Phase 3 Milestone 2: Admin Dashboard
4. Proceed to Phase 3 Milestone 3: Counselor Dashboard

**If tests fail:**
1. Document failures with screenshots
2. Prioritize fixes (critical vs. nice-to-have)
3. Fix critical issues
4. Re-test
5. Iterate until passing

---

## 📸 Screenshots to Capture

For documentation/demo:

1. **Low-risk chat** - Clean interface, agent badge only
2. **Medium-risk** - Yellow indicator with factors
3. **High-risk** - Red indicator + escalation notification
4. **Metadata panel** - Technical details expanded
5. **Plans sidebar** - Intervention plans list
6. **Mobile view** - Responsive layout
7. **Backend logs** - Agent orchestration in action

---

**Good luck with testing! 🚀**

**Questions or issues?** Check:
- `docs/AIKA_ENHANCED_UI_REFACTOR_COMPLETE.md`
- `docs/AIKA_PHASE3_PLAN.md`
- Backend logs in terminal
- Browser DevTools console
