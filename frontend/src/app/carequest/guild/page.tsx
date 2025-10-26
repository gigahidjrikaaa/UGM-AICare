'use client';

import { useState } from 'react';

/**
 * Guild System Page
 * 
 * Features:
 * - Guild roster (member list with stats)
 * - Guild chat (real-time messaging)
 * - Guild management (settings, invite/kick)
 * - Guild achievements
 */
export default function GuildPage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'chat' | 'settings'>('roster');

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Guild System</h1>
        <p className="text-gray-600">
          Connect with fellow UGM students on your mental health journey
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'roster'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Guild Roster
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Guild Chat
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {activeTab === 'roster' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Guild Members</h2>
            <p className="text-gray-600 mb-6">
              View all members of your guild and their progress
            </p>
            
            {/* TODO: Fetch and display guild members */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      M{i}
                    </div>
                    <div>
                      <div className="font-semibold">Member {i}</div>
                      <div className="text-sm text-gray-600">
                        Harmony Rank: {i} | JOY: {i * 100} | CARE: {i * 50}
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Guild Chat</h2>
            <p className="text-gray-600 mb-6">
              Chat with your guild members in real-time
            </p>
            
            {/* TODO: Implement real-time chat */}
            <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4">
              <p className="text-center text-gray-500 mt-20">
                Chat feature coming soon...
              </p>
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
              <button
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Guild Settings</h2>
            <p className="text-gray-600 mb-6">
              Manage your guild configuration
            </p>
            
            {/* TODO: Implement guild settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guild Name
                </label>
                <input
                  type="text"
                  placeholder="Enter guild name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guild Description
                </label>
                <textarea
                  placeholder="Describe your guild..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                ></textarea>
              </div>
              
              <button
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
