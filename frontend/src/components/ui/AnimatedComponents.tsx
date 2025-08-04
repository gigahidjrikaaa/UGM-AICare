"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useEffect } from 'react';
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaStar, 
  FaHeart 
} from '@/icons';

// ===== LOADING COMPONENTS =====

interface PulsingLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const PulsingLoader = ({ size = 'md', color = '#FFCA40' }: PulsingLoaderProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
      style={{ backgroundColor: color }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.div
        className="w-1/2 h-1/2 bg-white rounded-full"
        animate={{
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
};

export const SpinningLoader = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <FaSpinner className={`${sizeClasses[size]} text-[#FFCA40]`} />
    </motion.div>
  );
};

// ===== NOTIFICATION COMPONENTS =====

interface AnimatedToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  visible: boolean;
  onClose: () => void;
}

export const AnimatedToast = ({ type, message, visible, onClose }: AnimatedToastProps) => {
  const config = {
    success: { icon: FaCheckCircle, color: 'from-green-500 to-green-600', textColor: 'text-white' },
    error: { icon: FaExclamationCircle, color: 'from-red-500 to-red-600', textColor: 'text-white' },
    info: { icon: FaStar, color: 'from-[#FFCA40] to-[#FF8C00]', textColor: 'text-[#001D58]' }
  };

  const { icon: Icon, color, textColor } = config[type];

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className={`fixed top-4 right-4 z-50 bg-gradient-to-r ${color} p-4 rounded-2xl shadow-2xl max-w-sm flex items-center space-x-3`}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <Icon className={`text-xl ${textColor}`} />
          </motion.div>
          <p className={`${textColor} font-medium flex-1`}>{message}</p>
          <button 
            onClick={onClose}
            className={`${textColor} hover:opacity-70 transition-opacity`}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ===== BUTTON COMPONENTS =====

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '',
  disabled = false
}: AnimatedButtonProps) => {
  const variants = {
    primary: 'bg-gradient-to-r from-[#FFCA40] to-[#FF8C00] text-[#001D58] hover:shadow-[0_10px_30px_rgba(255,202,64,0.4)]',
    secondary: 'bg-white/20 text-white border border-white/30 hover:bg-white/30',
    outline: 'border-2 border-[#FFCA40] text-[#FFCA40] hover:bg-[#FFCA40] hover:text-[#001D58]'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        ${className}
        rounded-full font-bold transition-all duration-300 relative overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      whileHover={!disabled ? { 
        scale: 1.05,
        transition: { duration: 0.2 }
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

// ===== CARD COMPONENTS =====

interface GlassmorphismCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassmorphismCard = ({ children, className = '', hover = true }: GlassmorphismCardProps) => {
  return (
    <motion.div
      className={`
        bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 
        shadow-2xl p-6 ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={hover ? {
        y: -5,
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
        transition: { duration: 0.3 }
      } : {}}
    >
      {children}
    </motion.div>
  );
};

// ===== TEXT ANIMATION COMPONENTS =====

interface TypewriterEffectProps {
  text: string;
  className?: string;
  speed?: number;
  showCursor?: boolean;
}

export const TypewriterEffect = ({ 
  text, 
  className = '', 
  speed = 50,
  showCursor = true 
}: TypewriterEffectProps) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className={className}>
      {displayText}
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-0.5 h-5 bg-current ml-1"
        />
      )}
    </span>
  );
};

interface GradientTextProps {
  children: ReactNode;
  gradient?: string;
  className?: string;
}

export const GradientText = ({ 
  children, 
  gradient = 'from-[#FFCA40] to-[#FF8C00]', 
  className = '' 
}: GradientTextProps) => {
  return (
    <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
};

// ===== FLOATING ELEMENTS =====

export const FloatingHearts = ({ count = 5 }: { count?: number }) => {
  const hearts = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((heart) => (
        <motion.div
          key={heart}
          className="absolute"
          initial={{
            x: Math.random() * 100 + '%',
            y: '100%',
            opacity: 0
          }}
          animate={{
            y: '-10%',
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut"
          }}
        >
          <FaHeart className="text-red-400 text-lg" />
        </motion.div>
      ))}
    </div>
  );
};

export const FloatingStars = ({ count = 8 }: { count?: number }) => {
  const stars = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star}
          className="absolute"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: star * 0.5,
            ease: "easeInOut"
          }}
        >
          <FaStar className="text-[#FFCA40] text-sm" />
        </motion.div>
      ))}
    </div>
  );
};

// ===== PROGRESS COMPONENTS =====

interface AnimatedProgressProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}

export const AnimatedProgress = ({ 
  progress, 
  className = '', 
  showPercentage = true 
}: AnimatedProgressProps) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-white/70">Progress</span>
        {showPercentage && (
          <motion.span 
            className="text-sm text-[#FFCA40] font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <TypewriterEffect text={`${Math.round(progress)}%`} showCursor={false} speed={100} />
          </motion.span>
        )}
      </div>
      <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#FFCA40] to-[#FF8C00] rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ 
            duration: 1.5,
            ease: "easeOut",
            delay: 0.2
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0"
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

// ===== USAGE EXAMPLE COMPONENT =====

export const AnimatedComponentsShowcase = () => {
  const [toastVisible, setToastVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => (prev < 100 ? prev + 1 : 0));
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001D58] to-[#00308F] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <GradientText className="text-4xl font-bold text-center">
          React Bits Inspired Components
        </GradientText>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Loaders */}
          <GlassmorphismCard>
            <h3 className="text-xl font-bold text-white mb-4">Loaders</h3>
            <div className="flex space-x-4 items-center justify-center">
              <PulsingLoader />
              <SpinningLoader />
            </div>
          </GlassmorphismCard>

          {/* Buttons */}
          <GlassmorphismCard>
            <h3 className="text-xl font-bold text-white mb-4">Animated Buttons</h3>
            <div className="space-y-3">
              <AnimatedButton variant="primary" onClick={() => setToastVisible(true)}>
                Show Toast
              </AnimatedButton>
              <AnimatedButton variant="secondary">Secondary</AnimatedButton>
              <AnimatedButton variant="outline">Outline</AnimatedButton>
            </div>
          </GlassmorphismCard>

          {/* Progress */}
          <GlassmorphismCard className="md:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4">Progress Animation</h3>
            <AnimatedProgress progress={progress} />
          </GlassmorphismCard>
        </div>

        {/* Floating Elements */}
        <GlassmorphismCard className="relative overflow-hidden">
          <FloatingStars count={6} />
          <FloatingHearts count={3} />
          <h3 className="text-xl font-bold text-white mb-4">Floating Elements</h3>
          <TypewriterEffect 
            text="Watch the stars and hearts float around this card!" 
            className="text-white/80"
          />
        </GlassmorphismCard>
      </div>

      <AnimatedToast
        type="success"
        message="Toast notification triggered!"
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
};
