"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import DeviceSelector from './DeviceSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute bottom-full right-0 mb-2 w-80 bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Audio Settings</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-colors rounded-full p-1"
              aria-label="Close settings"
            >
              <FiX size={20} />
            </button>
          </div>
          <DeviceSelector />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;