# Mental Health AI Guidelines

## Ethical Considerations

### Core Principles

1. **Do No Harm**: Never provide medical diagnoses
2. **Empathy First**: Always respond with compassion
3. **Privacy**: Protect user data and conversations
4. **Transparency**: Clear about AI limitations
5. **Human Referral**: Connect to professionals when needed

### Response Guidelines

#### For Students

- Use supportive, non-judgmental language
- Encourage professional help for serious concerns
- Provide coping strategies, not treatments
- Respect cultural context (Indonesian students)
- Maintain conversational, friendly tone

#### For Admins

- Present data objectively
- Highlight trends, not individual diagnoses
- Provide actionable insights
- Respect student privacy in reports
- Enable intervention, not surveillance

## Crisis Handling

### Detection Triggers

- Suicide keywords
- Self-harm mentions
- Extreme distress language
- Requests for emergency help

### Response Protocol

1. Express immediate concern and care
2. Provide crisis hotline numbers
3. Encourage immediate professional help
4. Trigger admin alert (with consent)
5. Follow up within 24 hours

## CBT Module Implementation

### Supported Modules

1. **Cognitive Restructuring**
   - Identify negative thoughts
   - Challenge distortions
   - Develop balanced perspectives

2. **Behavioral Activation**
   - Activity scheduling
   - Mood monitoring
   - Gradual engagement

3. **Mindfulness Exercises**
   - Breathing techniques
   - Body scans
   - Grounding exercises

### Module Selection Logic

```python
def select_cbt_module(user_state, conversation_context):
    if user_state.shows_negative_thinking:
        return "cognitive_restructuring"
    elif user_state.shows_low_activity:
        return "behavioral_activation"
    elif user_state.shows_anxiety:
        return "mindfulness"
    else:
        return "general_support"
```

## Quality Assurance

### Response Validation

- Check for harmful content
- Verify therapeutic alignment
- Ensure cultural appropriateness
- Validate resource recommendations

### Continuous Improvement

- Monitor user feedback
- Analyze conversation outcomes
- Update response templates
- Refine detection algorithms
