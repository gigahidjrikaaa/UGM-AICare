'use client';

/**
 * Activities Page
 * 
 * Features:
 * - Mini-games callable from main webapp
 * - Mindfulness exercises
 * - CBT workshops
 * - Mood journaling
 * - Breathing exercises
 */

interface Activity {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'mindfulness' | 'cbt' | 'journal' | 'exercise';
  rewards: {
    joy?: number;
    care?: number;
    harmony?: number;
  };
  icon: string;
  color: string;
}

export default function ActivitiesPage() {
  // TODO: Fetch from backend
  const activities: Activity[] = [
    {
      id: '1',
      title: 'Daily Mindfulness',
      description: 'Complete a 5-minute guided breathing exercise to center yourself',
      duration: '5 min',
      category: 'mindfulness',
      rewards: { joy: 10, harmony: 2 },
      icon: '🧘',
      color: 'bg-blue-500',
    },
    {
      id: '2',
      title: 'Mood Journal',
      description: 'Record your emotions and reflect on your day',
      duration: '10 min',
      category: 'journal',
      rewards: { care: 15, harmony: 3 },
      icon: '📔',
      color: 'bg-green-500',
    },
    {
      id: '3',
      title: 'CBT Thought Challenge',
      description: 'Practice cognitive restructuring with guided prompts',
      duration: '15 min',
      category: 'cbt',
      rewards: { joy: 20, care: 10, harmony: 5 },
      icon: '🧠',
      color: 'bg-purple-500',
    },
    {
      id: '4',
      title: 'Box Breathing',
      description: 'Four-square breathing technique for instant calm',
      duration: '3 min',
      category: 'exercise',
      rewards: { joy: 5, harmony: 1 },
      icon: '💨',
      color: 'bg-cyan-500',
    },
    {
      id: '5',
      title: 'Gratitude Practice',
      description: 'Write down three things you are grateful for today',
      duration: '5 min',
      category: 'journal',
      rewards: { joy: 15, care: 5 },
      icon: '🙏',
      color: 'bg-yellow-500',
    },
    {
      id: '6',
      title: 'Progressive Muscle Relaxation',
      description: 'Systematically tense and relax muscle groups',
      duration: '12 min',
      category: 'exercise',
      rewards: { joy: 18, harmony: 4 },
      icon: '💪',
      color: 'bg-red-500',
    },
  ];

  const handleStartActivity = (activityId: string) => {
    console.log(`Starting activity: ${activityId}`);
    // TODO: Launch activity modal or navigate to activity detail
    alert('Activity launching... (Coming soon)');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Activities & Mini-Games</h1>
        <p className="text-gray-600">
          Engage in therapeutic activities to improve your mental wellbeing and earn rewards
        </p>
      </div>

      {/* Daily streak */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-lg p-6 mb-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-90 mb-1">Your Daily Streak</div>
            <div className="text-4xl font-bold">7 Days 🔥</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90 mb-1">Activities Completed</div>
            <div className="text-2xl font-semibold">23 Total</div>
          </div>
        </div>
      </div>

      {/* Activities grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            {/* Header */}
            <div className={`${activity.color} p-6 text-white`}>
              <div className="text-5xl mb-3 text-center">{activity.icon}</div>
              <h3 className="text-xl font-bold text-center">{activity.title}</h3>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4 min-h-12">
                {activity.description}
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between mb-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">⏱️</span>
                  <span className="text-gray-700 font-medium">{activity.duration}</span>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                  {activity.category}
                </span>
              </div>

              {/* Rewards */}
              <div className="flex items-center space-x-3 mb-4 text-sm">
                <span className="text-gray-500">Rewards:</span>
                {activity.rewards.joy && (
                  <span className="text-yellow-600 font-semibold">+{activity.rewards.joy} JOY</span>
                )}
                {activity.rewards.care && (
                  <span className="text-green-600 font-semibold">+{activity.rewards.care} CARE</span>
                )}
                {activity.rewards.harmony && (
                  <span className="text-purple-600 font-semibold">
                    +{activity.rewards.harmony} Harmony
                  </span>
                )}
              </div>

              {/* Action button */}
              <button
                onClick={() => handleStartActivity(activity.id)}
                className={`w-full ${activity.color} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity`}
              >
                Start Activity
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon notice */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="text-blue-800 font-semibold mb-2">
          🎮 More Activities Coming Soon
        </div>
        <p className="text-sm text-blue-700">
          We are developing more interactive mini-games and therapeutic activities. Stay tuned!
        </p>
      </div>
    </div>
  );
}
