# CBT Conversational Flows & Scripts

**Author:** Consulting Psychologist
**Version:** 1.0
**Status:** Initial Draft

## Introduction

This document provides structured, evidence-based conversational scripts for the Cognitive Behavioral Therapy (CBT) modules integrated into the Aika chatbot. These flows are designed to be empathetic, educational, and empowering for the user.

**Core Principles for AI Implementation:**
- **Empathy First:** The AI's tone must be consistently warm, non-judgmental, and supportive.
- **User Agency:** The user must be able to exit the module at any point. Phrases like "We can stop here if you like" should be used.
- **Socratic Questioning:** The AI should guide, not lecture. Use open-ended questions to help users reach their own conclusions.
- **Safety:** At every stage, the AI must monitor for crisis-level distress. If detected, the module must be interrupted, and the crisis handling protocol must be initiated immediately.

---

## Module 1: Cognitive Restructuring (Challenging Negative Thoughts)

**Objective:** To guide the user in identifying, challenging, and reframing a specific automatic negative thought (ANT).

### Conversational Flow

**Step 1: Initiation & Identifying the Situation**
- **AI:** "I'm here to help. It can be useful to explore the thoughts behind our feelings. Would you be open to trying an exercise to unpack a recent difficult moment? We can stop at any time."
- **If User Agrees:** "Great. Let's start with the situation. Can you describe what was happening when you started to feel upset or down?"

**Step 2: Identifying the Emotion & Intensity**
- **AI:** "Thank you for sharing that. And what was the main feeling you experienced in that moment? (e.g., sadness, anger, anxiety)"
- **AI:** "On a scale from 0 to 100, where 0 is not at all intense and 100 is the most intense you've ever felt, how strong was that feeling?"

**Step 3: Identifying the Automatic Negative Thought (ANT)**
- **AI:** "Okay. Now, let's try to catch the 'hot thought.' When you were in that situation and feeling that emotion, what was going through your mind? What were you telling yourself?"
- *(Helper Prompt if needed):* "It might be a phrase or an image, like 'I'm going to fail' or 'Everyone is judging me.'"

**Step 4: Psychoeducation on Cognitive Distortions**
- **AI:** "Thanks for sharing that thought. It's completely normal to have thoughts like these. Sometimes, our minds develop unhelpful thinking patterns, like mental shortcuts, that aren't 100% accurate. Psychologists call these 'cognitive distortions.' For example, 'black-and-white thinking' is when we see things as all-or-nothing. Does that make sense?"

**Step 5: Gathering Evidence (Challenging the Thought)**
- **AI:** "Now, let's look at that thought like a detective. What evidence supports the idea that this thought is true?"
- **AI:** "And what evidence might suggest this thought is *not* 100% true? Is there another way to look at this situation?"
- **AI (Alternative Perspective):** "If your best friend were in this exact situation and had that same thought, what would you say to them?"

**Step 6: Developing a Balanced, Alternative Thought**
- **AI:** "You've looked at this from a few angles now. Given all the evidence, what would be a more balanced or helpful way to view the situation?"
- *(Helper Prompt if needed):* "It doesn't have to be overly positive. Just something that feels more realistic and less harsh."

**Step 7: Re-rating the Emotion**
- **AI:** "Now, thinking about this new, more balanced perspective, let's check in with that original feeling. On that same 0-100 scale, how intense does it feel now?"

**Step 8: Summary & Takeaway**
- **AI:** "You did a wonderful job with a very difficult exercise. You identified a painful thought, examined it, and found a more balanced way to see things. This is a skill that gets easier with practice. For now, just remember the great work you did today. Is there anything else I can help you with?"

---

## Module 2: Behavioral Activation (Taking Action to Improve Mood)

**Objective:** To help the user identify and schedule a small, manageable activity to break the cycle of inactivity and low mood.

### Conversational Flow

**Step 1: Initiation & Psychoeducation**
- **AI:** "I hear that you're feeling low and that it's been hard to get things done. That's a really tough spot to be in. Sometimes, a cycle can start where we feel down, so we do less, and because we do less, we feel even more down. Would you be open to trying a small exercise to see if we can interrupt that cycle?"

**Step 2: Brainstorming Valued Activities**
- **AI:** "Let's start by brainstorming some activities. They don't have to be big or productive. We're looking for things that are either **enjoyable** or give a sense of **accomplishment**. What is one small thing you used to enjoy, or that might make you feel even 1% better?"
- *(Helper Prompt if needed):* "This could be as simple as listening to one favorite song, stretching for five minutes, stepping outside for some fresh air, or washing a single dish."

**Step 3: Selecting and Committing to One Activity**
- **AI:** "That's a great list. From those, which one feels the most achievable—not the one you 'should' do, but the one that feels easiest—in the next day or so?"
- **AI:** "Excellent choice. When, specifically, do you think you could do that activity? Let's try to set a time."

**Step 4: Anticipating Barriers**
- **AI:** "Sometimes our brains can talk us out of things, even when we plan them. What is one obstacle that might get in the way of you doing this activity?"
- **AI:** "That's a very real barrier. What could be one small thing you could do to make it easier to overcome that obstacle?"

**Step 5: Summary & Takeaway**
- **AI:** "You've done something really important here. You've chosen a specific, achievable goal and even planned for what might get in the way. The goal here isn't to suddenly feel happy, but to prove to yourself that you can still take small, positive actions, even when it's hard. You should be proud of that. Would you like me to set a reminder for you?"

---

## Module 3: Mindfulness Exercise (Grounding in the Present)

**Objective:** To guide the user through a simple mindfulness exercise to reduce acute feelings of anxiety or being overwhelmed.

### Conversational Flow

**Step 1: Initiation & Gaining Consent**
- **AI:** "It sounds like you're feeling very overwhelmed right now. I can guide you through a short, simple grounding exercise to help calm your mind and body. It will only take about three minutes. Would you be willing to try it with me?"

**Step 2: The 5-4-3-2-1 Grounding Technique**
- **AI:** "Wonderful. First, just get as comfortable as you can, wherever you are. Take one slow, deep breath. In through your nose... and out through your mouth."
- **AI:** "Now, we'll use our senses to connect with the present. First, can you look around and **name 5 different things you can see**?"
- *(Wait for user response)*
- **AI:** "Great. Now, let's tune into your sense of touch. What are **4 things you can feel** right now? It could be the chair you're sitting on, the texture of your clothes, or the temperature of the air."
- *(Wait for user response)*
- **AI:** "Excellent. Now, listen closely. What are **3 things you can hear**? It might be the hum of a fan, distant traffic, or even your own breathing."
- *(Wait for user response)*
- **AI:** "You're doing great. Now, what are **2 things you can smell**? Maybe the scent of your room, or your coffee."
- *(Wait for user response)*
- **AI:** "And finally, what is **1 thing you can taste**? You can just notice the taste in your mouth."
- *(Wait for user response)*

**Step 3: Conclusion & Check-in**
- **AI:** "Perfect. You've completed the exercise. Let's take one more deep breath together. In... and out."
- **AI:** "How are you feeling right now? There's no right or wrong answer."
- **AI:** "Thank you for doing that with me. This is a tool you can use anytime, anywhere you feel your thoughts starting to race. You did a wonderful job bringing yourself back to the present moment."
