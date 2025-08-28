'use client';

import React from 'react';
import { useLiveTalkStore } from '@/store/useLiveTalkStore';

const DeviceSelector = () => {
  const {
    microphones,
    speakers,
    selectedMicrophone,
    selectedSpeaker,
    setSelectedMicrophone,
    setSelectedSpeaker,
  } = useLiveTalkStore();

  return (
    <div className="flex gap-4 p-2 bg-gray-800 rounded-lg">
      <div className="flex-1">
        <label htmlFor="mic-select" className="text-xs text-gray-400">
          Microphone
        </label>
        <select
          id="mic-select"
          value={selectedMicrophone || ''}
          onChange={(e) => setSelectedMicrophone(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded-md text-sm"
        >
          {microphones.map((mic) => (
            <option key={mic.deviceId} value={mic.deviceId}>
              {mic.label || `Microphone ${mic.deviceId}`}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Note: Changing the microphone requires updating your browser's default setting.
        </p>
      </div>
      <div className="flex-1">
        <label htmlFor="speaker-select" className="text-xs text-gray-400">
          Speaker
        </label>
        <select
          id="speaker-select"
          value={selectedSpeaker || ''}
          onChange={(e) => setSelectedSpeaker(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded-md text-sm"
        >
          {speakers.map((speaker) => (
            <option key={speaker.deviceId} value={speaker.deviceId}>
              {speaker.label || `Speaker ${speaker.deviceId}`}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Note: Speaker selection may not be supported on all browsers.
        </p>
      </div>
    </div>
  );
};

export default DeviceSelector;
