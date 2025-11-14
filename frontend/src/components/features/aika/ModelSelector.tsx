/**
 * Model Selector Component
 * 
 * Dropdown to select preferred Gemini model for Aika chat
 */

'use client';

import React from 'react';
import { ChevronDown, Cpu } from 'lucide-react';

export interface ModelOption {
  value: string;
  label: string;
  description: string;
  isRecommended?: boolean;
}

export const AVAILABLE_GEMINI_MODELS: ModelOption[] = [
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Cepat & stabil (Rekomendasi)',
    isRecommended: true,
  },
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Reasoning terbaik, lebih lambat',
  },
  {
    value: 'gemini-2.5-flash-preview-09-2025',
    label: 'Gemini 2.5 Flash Preview',
    description: 'Fitur terbaru (experimental)',
  },
  {
    value: 'gemini-2.5-flash-lite-preview-09-2025',
    label: 'Gemini 2.5 Flash Lite',
    description: 'Sangat cepat, hemat biaya',
  },
  {
    value: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    description: 'Versi stabil sebelumnya',
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  disabled = false 
}: ModelSelectorProps) {
  const currentModel = AVAILABLE_GEMINI_MODELS.find(m => m.value === selectedModel) || AVAILABLE_GEMINI_MODELS[0];

  return (
    <div className="relative inline-block">
      <label htmlFor="model-select" className="sr-only">
        Pilih Model AI
      </label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="appearance-none pl-9 pr-8 py-1.5 bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg border border-white/20 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
        title="Pilih Model Gemini"
      >
        {AVAILABLE_GEMINI_MODELS.map((model) => (
          <option 
            key={model.value} 
            value={model.value}
            className="bg-[#001d58] text-white"
          >
            {model.label} {model.isRecommended ? '★' : ''}
          </option>
        ))}
      </select>
      
      {/* Icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Cpu className="h-4 w-4 text-white/70" />
      </div>
      
      {/* Chevron */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-white/70" />
      </div>
      
      {/* Description tooltip */}
      <div className="absolute top-full mt-1 left-0 right-0 text-xs text-white/70 bg-black/50 rounded px-2 py-1 whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {currentModel.description}
      </div>
    </div>
  );
}
