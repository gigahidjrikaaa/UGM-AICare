'use client';

import { ConversationsByUserView } from '@/components/conversations/ConversationsByUserView';

export default function CounselorConversationsPage() {
  return (
    <ConversationsByUserView
      portal="counselor"
      title="Patient Conversations"
      subtitle="Browse conversations by user first, then inspect each user's sessions."
      allowFlagging={false}
    />
  );
}
