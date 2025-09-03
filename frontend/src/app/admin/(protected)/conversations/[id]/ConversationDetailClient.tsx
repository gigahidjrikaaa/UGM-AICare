'use client';

import React from 'react';
import { ArrowLeft, MessageSquare, Clock, Hash } from 'lucide-react';
import Link from 'next/link';

interface ConversationDetail {
  id: number;
  user_id_hash: string;
  session_id: string;
  conversation_id: string;
  message: string;
  response: string;
  timestamp: string;
}

interface ConversationDetailClientProps {
  conversation: ConversationDetail | null;
}

export default function ConversationDetailClient({ conversation }: ConversationDetailClientProps) {
  if (!conversation) {
    return <div className="text-center p-8">Conversation not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/conversations" className="flex items-center text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">Conversation Detail</h1>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300 mb-6">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            <strong>User Hash:</strong> {conversation.user_id_hash}
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <strong>Session ID:</strong> {conversation.session_id}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <strong>Timestamp:</strong> {new Date(conversation.timestamp).toLocaleString()}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-lg text-white mb-2">User Message</h2>
            <div className="bg-white/5 p-4 rounded-lg text-gray-200 whitespace-pre-wrap">
              {conversation.message}
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-lg text-white mb-2">AI Response</h2>
            <div className="bg-white/5 p-4 rounded-lg text-gray-200 whitespace-pre-wrap">
              {conversation.response}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
