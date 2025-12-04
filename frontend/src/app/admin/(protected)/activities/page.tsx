'use client';

/**
 * Admin Activities Management Page
 * 
 * Allows administrators to:
 * - View all available therapeutic activities
 * - Preview activities (try them out)
 * - See activity metadata and statistics
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiActivity, 
  FiPlay, 
  FiClock, 
  FiTag, 
  FiEye,
  FiX,
  FiHeart,
  FiWind,
  FiTarget,
} from 'react-icons/fi';

// Activity data - mirrors backend catalog
const ACTIVITIES_CATALOG = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    description: 'Teknik pernapasan 4-4-4-4 yang dipakai Navy SEALs untuk menenangkan pikiran dan mengurangi stres.',
    category: 'breathing',
    estimated_duration: 240,
    difficulty: 'beginner',
    tags: ['anxiety', 'stress', 'focus', 'calming', 'panic'],
    icon: '🔲',
  },
  {
    id: 'four-seven-eight',
    name: '4-7-8 Breathing',
    description: 'Teknik napas relaksasi dari Dr. Andrew Weil untuk tidur lebih nyenyak dan mengurangi kecemasan.',
    category: 'breathing',
    estimated_duration: 300,
    difficulty: 'beginner',
    tags: ['sleep', 'relaxation', 'anxiety', 'calming', 'insomnia'],
    icon: '💜',
  },
  {
    id: 'five-four-three-two-one',
    name: '5-4-3-2-1 Grounding',
    description: 'Teknik grounding sensorik yang menggunakan 5 indera untuk membawa kamu kembali ke saat ini.',
    category: 'grounding',
    estimated_duration: 180,
    difficulty: 'beginner',
    tags: ['anxiety', 'panic', 'dissociation', 'grounding', 'present-moment'],
    icon: '🌿',
  },
];

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  breathing: { 
    label: 'Breathing', 
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: <FiWind className="w-4 h-4" />
  },
  grounding: { 
    label: 'Grounding', 
    color: 'bg-green-500/20 text-green-300 border-green-500/30',
    icon: <FiTarget className="w-4 h-4" />
  },
  mindfulness: { 
    label: 'Mindfulness', 
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: <FiHeart className="w-4 h-4" />
  },
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-emerald-500/20 text-emerald-300' },
  intermediate: { label: 'Intermediate', color: 'bg-amber-500/20 text-amber-300' },
  advanced: { label: 'Advanced', color: 'bg-red-500/20 text-red-300' },
};

export default function AdminActivitiesPage() {
  const [previewActivity, setPreviewActivity] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredActivities = filterCategory === 'all' 
    ? ACTIVITIES_CATALOG 
    : ACTIVITIES_CATALOG.filter(a => a.category === filterCategory);

  const categories = ['all', ...new Set(ACTIVITIES_CATALOG.map(a => a.category))];

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <FiActivity className="mr-3 text-[#FFCA40]" />
            Therapeutic Activities
          </h1>
          <p className="text-gray-400 mt-1">
            View and preview interactive activities available to users
          </p>
        </div>
        
        {/* Stats */}
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-[#FFCA40]">{ACTIVITIES_CATALOG.length}</div>
            <div className="text-xs text-gray-400">Total Activities</div>
          </div>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{categories.length - 1}</div>
            <div className="text-xs text-gray-400">Categories</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterCategory === cat
                ? 'bg-[#FFCA40] text-[#001D58]'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            {cat === 'all' ? 'All Activities' : CATEGORY_CONFIG[cat]?.label || cat}
          </button>
        ))}
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((activity, index) => {
          const categoryConfig = CATEGORY_CONFIG[activity.category] || { 
            label: activity.category, 
            color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
            icon: <FiActivity className="w-4 h-4" />
          };
          const difficultyConfig = DIFFICULTY_CONFIG[activity.difficulty] || {
            label: activity.difficulty,
            color: 'bg-gray-500/20 text-gray-300'
          };

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-[#FFCA40]/30 transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{activity.icon}</div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${categoryConfig.color}`}>
                    {categoryConfig.label}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#FFCA40] transition-colors">
                {activity.name}
              </h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {activity.description}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <FiClock className="w-3.5 h-3.5" />
                  {formatDuration(activity.estimated_duration)}
                </span>
                <span className={`px-2 py-0.5 rounded ${difficultyConfig.color}`}>
                  {difficultyConfig.label}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {activity.tags.slice(0, 4).map(tag => (
                  <span 
                    key={tag}
                    className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded"
                  >
                    #{tag}
                  </span>
                ))}
                {activity.tags.length > 4 && (
                  <span className="text-xs text-gray-500">+{activity.tags.length - 4}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewActivity(activity.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#FFCA40] hover:bg-[#FFD770] text-[#001D58] font-semibold rounded-lg transition-colors"
                >
                  <FiPlay className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => window.open(`/activities?play=${activity.id}`, '_blank')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  title="Open in new tab"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-400">No activities found in this category.</p>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewActivity(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#001D58] border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Activity Preview</h2>
                <button
                  onClick={() => setPreviewActivity(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* Modal Content - Embed the activity */}
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                <iframe
                  src={`/activities?play=${previewActivity}`}
                  className="w-full h-[600px] rounded-xl border border-white/10"
                  title="Activity Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
