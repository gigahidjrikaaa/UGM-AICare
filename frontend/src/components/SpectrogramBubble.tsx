
import React from 'react';

type SpectrogramBubbleProps = {
  isActive: boolean;
};

const SpectrogramBubble: React.FC<SpectrogramBubbleProps> = ({ isActive }) => {
  return (
    <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
      <div className={`w-20 h-20 bg-blue-300 rounded-full transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
        {/* This is a placeholder for the spectrogram animation */}
      </div>
    </div>
  );
};

export default SpectrogramBubble;
