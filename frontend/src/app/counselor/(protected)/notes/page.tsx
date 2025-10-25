'use client';

import { useState, useEffect } from 'react';
import {
  FiEdit,
  FiTrash2,
  FiPlus,
  FiCalendar,
  FiUser,
  FiFileText,
  FiClock,
  FiAlertTriangle,
} from 'react-icons/fi';

interface SessionNote {
  note_id: string;
  patient_id_hash: string;
  patient_name?: string;
  session_date: string;
  duration_minutes: number;
  note_content: string;
  mood_rating?: number;
  progress_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function CounselorNotesPage() {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const data = await apiCall<SessionNote[]>('/api/counselor/notes');
      
      // Mock data
      const mockNotes: SessionNote[] = [
        {
          note_id: 'NOTE-001',
          patient_id_hash: 'user_abc123',
          patient_name: 'Patient A',
          session_date: '2025-10-20',
          duration_minutes: 60,
          note_content: 'Patient showed improvement in managing anxiety symptoms. Discussed coping strategies for upcoming exams.',
          mood_rating: 7,
          progress_notes: 'Good progress with CBT techniques',
          created_at: new Date('2025-10-20').toISOString(),
          updated_at: new Date('2025-10-20').toISOString(),
        },
        {
          note_id: 'NOTE-002',
          patient_id_hash: 'user_def456',
          patient_name: 'Patient B',
          session_date: '2025-10-18',
          duration_minutes: 45,
          note_content: 'Follow-up session. Patient reported using breathing exercises successfully during stressful moments.',
          mood_rating: 8,
          created_at: new Date('2025-10-18').toISOString(),
          updated_at: new Date('2025-10-18').toISOString(),
        },
      ];
      
      setNotes(mockNotes);
      setError(null);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Failed to load session notes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredNotes = notes.filter((note) => {
    if (searchQuery === '') return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      note.patient_name?.toLowerCase().includes(searchLower) ||
      note.patient_id_hash.toLowerCase().includes(searchLower) ||
      note.note_content.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading session notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <FiAlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-red-300 font-semibold mb-2">Failed to load session notes</p>
          <p className="text-red-300/70 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FiFileText className="w-8 h-8 text-[#FFCA40]" />
            Session Notes
          </h1>
          <p className="text-white/60">Document and review clinical session notes</p>
        </div>
        <button className="px-4 py-2 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all flex items-center gap-2">
          <FiPlus className="w-4 h-4" />
          New Session Note
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search notes by patient or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{notes.length}</div>
          <div className="text-xs text-white/60 mt-1">Total Notes</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {notes.filter((n) => {
              const noteDate = new Date(n.session_date);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return noteDate >= weekAgo;
            }).length}
          </div>
          <div className="text-xs text-white/60 mt-1">This Week</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {notes.reduce((sum, n) => sum + n.duration_minutes, 0)}
          </div>
          <div className="text-xs text-white/60 mt-1">Total Minutes</div>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
            <FiFileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No session notes found</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.note_id}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                {/* Header */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-white/90">{note.note_id}</span>
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <FiCalendar className="w-3 h-3" />
                      {formatDate(note.session_date)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <FiClock className="w-3 h-3" />
                      {note.duration_minutes}m
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/80">
                      {note.patient_name || note.patient_id_hash}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button title="Edit note" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all">
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button title="Delete note" className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 transition-all">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mood Rating */}
              {note.mood_rating !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-white/60">Mood Rating:</span>
                    <div className="flex gap-1">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-4 rounded ${
                            i < note.mood_rating!
                              ? 'bg-[#FFCA40]'
                              : 'bg-white/10'
                          }`}
                        ></div>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-[#FFCA40]">
                      {note.mood_rating}/10
                    </span>
                  </div>
                </div>
              )}

              {/* Note Content */}
              <div className="bg-white/5 rounded-lg p-4 mb-3">
                <p className="text-sm font-medium text-white/70 mb-2">Session Notes:</p>
                <p className="text-sm text-white/90 leading-relaxed">{note.note_content}</p>
              </div>

              {/* Progress Notes */}
              {note.progress_notes && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-300 mb-1">Progress:</p>
                  <p className="text-sm text-green-200/80">{note.progress_notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Created: {formatDate(note.created_at)}</span>
                {note.updated_at !== note.created_at && (
                  <span>Last updated: {formatDate(note.updated_at)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
