'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

/**
 * CareQuest Landing Page
 * 
 * Explains:
 * - What CareQuest is
 * - How it fits into UGM-AICare
 * - Harmony, JOY, and $CARE currencies
 * - Call-to-action: Play Now button
 */
export default function CareQuestPage() {
  const { joy, care, harmony } = useGameStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">CareQuest</span>
            </h1>
            <p className="text-2xl text-gray-600 mb-8">
              Your Mental Health Adventure at UGM
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block"
          >
            <Link
              href="/carequest/world"
              className="inline-block px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transform"
            >
              🎮 Play Now
            </Link>
          </motion.div>
        </div>

        {/* Current Progress (if player has started) */}
        {(joy > 0 || care > 0 || harmony > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto mb-12"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Your Progress
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{joy}</div>
                <div className="text-sm text-gray-600">JOY</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{care}</div>
                <div className="text-sm text-gray-600">$CARE</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">Rank {Math.floor(harmony / 100) + 1}</div>
                <div className="text-sm text-gray-600">Harmony</div>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* What is CareQuest */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6 text-center">
              What is CareQuest?
            </h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                <strong>CareQuest</strong> is an interactive mental health RPG designed specifically for UGM students. 
                Instead of mindlessly clicking buttons, you practice <strong>real therapeutic skills</strong> through 
                typing positive affirmations, CBT reframes, and coping statements.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
                  <div className="text-5xl mb-3">🗺️</div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-2">Explore UGM Campus</h3>
                  <p className="text-sm text-blue-700">
                    Navigate a digital twin of Universitas Gadjah Mada, discover hidden locations, and meet NPCs
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-center">
                  <div className="text-5xl mb-3">⌨️</div>
                  <h3 className="text-xl font-semibold text-purple-900 mb-2">Type to Combat Anxiety</h3>
                  <p className="text-sm text-purple-700">
                    Defeat mental health monsters by typing therapeutic sentences with accuracy and speed
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-center">
                  <div className="text-5xl mb-3">🎯</div>
                  <h3 className="text-xl font-semibold text-green-900 mb-2">Complete Daily Quests</h3>
                  <p className="text-sm text-green-700">
                    Earn rewards by completing mindfulness exercises, mood journaling, and CBT workshops
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Fits into UGM-AICare */}
      <section className="bg-gradient-to-br from-indigo-100 to-purple-100 py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6 text-center">
              Part of the UGM-AICare Ecosystem
            </h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-gray-700 mb-8 leading-relaxed text-center">
                CareQuest is <strong>one component</strong> of UGM-AICare's comprehensive mental health platform 
                for Indonesian university students.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-3xl mr-3">🤖</span>
                    AI Chatbot (Aika)
                  </h3>
                  <p className="text-gray-700 text-sm">
                    24/7 conversational support using Google Gemini 2.5 API, providing CBT-informed guidance 
                    and crisis detection.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-3xl mr-3">📊</span>
                    Progress Dashboard
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Track your mental health journey with mood trends, quest completion rates, and wellness metrics.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-3xl mr-3">👥</span>
                    Counselor Integration
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Licensed counselors can view your CareQuest progress, assign therapeutic homework, and 
                    monitor crisis alerts.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-3xl mr-3">🎮</span>
                    CareQuest (You Are Here)
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Gamified mental health practice where therapeutic exercises feel like an adventure, 
                    not a chore.
                  </p>
                </div>
              </div>

              <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <p className="text-gray-700 leading-relaxed">
                  <strong className="text-blue-600">Why Gamification?</strong> Research shows that 
                  gamification increases engagement with mental health interventions by 40-60%. 
                  By making therapeutic practice <em>fun</em>, students are more likely to build 
                  consistent habits that improve wellbeing.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Understanding the Currencies */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6 text-center">
              Understanding Your Resources
            </h2>
            <div className="max-w-5xl mx-auto">
              <p className="text-lg text-gray-700 mb-8 text-center">
                CareQuest uses three interconnected currencies that reflect your mental health journey:
              </p>

              <div className="space-y-6">
                {/* JOY */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-start">
                    <div className="text-6xl mr-6">😊</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-yellow-900 mb-2">JOY</h3>
                      <p className="text-gray-700 mb-3">
                        <strong>Purpose:</strong> Represents your emotional wellbeing and positive experiences.
                      </p>
                      <p className="text-gray-700 mb-3">
                        <strong>How to Earn:</strong>
                      </p>
                      <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                        <li>Complete daily quests (mindfulness, mood journaling)</li>
                        <li>Win combat encounters against mental health monsters</li>
                        <li>Practice gratitude exercises</li>
                        <li>Achieve high typing accuracy (reinforces positive affirmations)</li>
                      </ul>
                      <p className="text-gray-700 mt-3">
                        <strong>What It Does:</strong> JOY contributes to your overall Harmony score and unlocks 
                        new quest types focused on joy cultivation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* $CARE */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-start">
                    <div className="text-6xl mr-6">💚</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-green-900 mb-2">$CARE</h3>
                      <p className="text-gray-700 mb-3">
                        <strong>Purpose:</strong> A blockchain-backed token representing self-care actions and 
                        community support.
                      </p>
                      <p className="text-gray-700 mb-3">
                        <strong>How to Earn:</strong>
                      </p>
                      <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                        <li>Win typing combat encounters (scaled by difficulty)</li>
                        <li>Complete CBT workshops and coping skill exercises</li>
                        <li>Participate in guild activities (mutual support)</li>
                        <li>Maintain daily quest streaks</li>
                      </ul>
                      <p className="text-gray-700 mt-3">
                        <strong>What It Does:</strong> Spend $CARE in the <strong>Block Market</strong> for 
                        real-world rewards (café vouchers, UGM merchandise, bookstore credits). It's your 
                        bridge between virtual progress and tangible benefits.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Harmony */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-start">
                    <div className="text-6xl mr-6">⚖️</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-purple-900 mb-2">Harmony Score</h3>
                      <p className="text-gray-700 mb-3">
                        <strong>Purpose:</strong> Your overall mental health balance and progression level.
                      </p>
                      <p className="text-gray-700 mb-3">
                        <strong>How It Works:</strong>
                      </p>
                      <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                        <li>Calculated from your accumulated JOY and $CARE</li>
                        <li>Increases slowly (represents sustainable wellbeing, not quick fixes)</li>
                        <li>Unlocks new game features as you rank up</li>
                        <li>Determines sentence difficulty in typing combat</li>
                      </ul>
                      <p className="text-gray-700 mt-3">
                        <strong>Harmony Ranks:</strong>
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                        <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                          <div className="font-semibold text-purple-900">Rank 1</div>
                          <div className="text-sm text-gray-600">Novice</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                          <div className="font-semibold text-purple-900">Rank 2</div>
                          <div className="text-sm text-gray-600">Apprentice</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                          <div className="font-semibold text-purple-900">Rank 3</div>
                          <div className="text-sm text-gray-600">Journeyman</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                          <div className="font-semibold text-purple-900">Rank 4</div>
                          <div className="text-sm text-gray-600">Expert</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                          <div className="font-semibold text-purple-900">Rank 5</div>
                          <div className="text-sm text-gray-600">Master</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                          <div className="font-semibold text-purple-900">Rank 6</div>
                          <div className="text-sm text-gray-600">Grandmaster</div>
                        </div>
                      </div>
                      <p className="text-gray-700 mt-3">
                        <strong>What It Does:</strong> Higher Harmony unlocks harder (but more therapeutic) 
                        sentences, boss fights, guild features, and exclusive Block Market items.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How They Work Together */}
              <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  How They Work Together
                </h3>
                <div className="text-center">
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    Win Combat → Earn <span className="font-semibold text-yellow-600">JOY</span> + 
                    <span className="font-semibold text-green-600"> $CARE</span>
                  </p>
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    Accumulate JOY + $CARE → Increase <span className="font-semibold text-purple-600">Harmony Score</span>
                  </p>
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    Higher Harmony → Unlock Harder Sentences (More Therapeutic) + New Features
                  </p>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Spend $CARE → Get Real Rewards (Vouchers, Merch)
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-600 py-16 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Practice mental health skills, defeat anxiety monsters, and earn real rewards 
              while building consistent wellbeing habits.
            </p>
            <Link
              href="/carequest/world"
              className="inline-block px-12 py-4 bg-white text-purple-600 text-xl font-bold rounded-full hover:bg-gray-100 transition-all shadow-2xl hover:scale-105 transform"
            >
              🎮 Start Playing Now
            </Link>

            <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Link
                href="/carequest/guild"
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all"
              >
                <div className="text-4xl mb-3">👥</div>
                <h3 className="text-xl font-semibold mb-2">Join a Guild</h3>
                <p className="text-sm opacity-90">Connect with fellow students</p>
              </Link>

              <Link
                href="/carequest/market"
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all"
              >
                <div className="text-4xl mb-3">🛒</div>
                <h3 className="text-xl font-semibold mb-2">Block Market</h3>
                <p className="text-sm opacity-90">Spend $CARE on real rewards</p>
              </Link>

              <Link
                href="/carequest/activities"
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all"
              >
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-xl font-semibold mb-2">Activities</h3>
                <p className="text-sm opacity-90">Mindfulness & CBT exercises</p>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-gray-400">
            CareQuest is part of <strong>UGM-AICare</strong> – Mental Health AI Platform for Indonesian University Students
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Developed with ❤️ by UGM Research Team | Powered by Google Gemini 2.5 API
          </p>
        </div>
      </footer>
    </div>
  );
}
