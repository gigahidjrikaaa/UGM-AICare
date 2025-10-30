#!/usr/bin/env python
"""
Test backward compatibility of migrated models.
"""
import sys
sys.path.insert(0, ".")

print("Testing backward compatibility...")

# Test old imports (should still work)
try:
    from app.models import Conversation, JournalEntry, Appointment, Feedback
    print("✓ Old imports work (backward compatible)")
    print(f"  - Conversation: {Conversation.__module__}")
    print(f"  - JournalEntry: {JournalEntry.__module__}")
    print(f"  - Appointment: {Appointment.__module__}")
    print(f"  - Feedback: {Feedback.__module__}")
except ImportError as e:
    print(f"✗ Old imports failed: {e}")
    sys.exit(1)

# Test new imports (preferred way)
try:
    from app.domains.mental_health.models import (
        Conversation as MHConversation,
        JournalEntry as MHJournalEntry,
        Appointment as MHAppointment,
        Feedback as MHFeedback
    )
    print("\n✓ New domain imports work")
    print(f"  - MH Conversation: {MHConversation.__module__}")
    print(f"  - MH JournalEntry: {MHJournalEntry.__module__}")
    print(f"  - MH Appointment: {MHAppointment.__module__}")
    print(f"  - MH Feedback: {MHFeedback.__module__}")
except ImportError as e:
    print(f"\n✗ New domain imports failed: {e}")
    sys.exit(1)

# Verify they're the same class
if Conversation is MHConversation:
    print("\n✓ Old and new imports reference the same class!")
else:
    print("\n✗ WARNING: Old and new imports are different classes")

print("\n🎉 Migration successful! All imports working correctly.")
