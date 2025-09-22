import React from 'react';
import { TextQuestionDraft, MultipleChoiceQuestionDraft, RatingQuestionDraft, QuestionDraft } from '@/types/surveys';

export interface QuestionListEditorProps {
  questions: QuestionDraft[];
  optionInputs: string[]; // per-question pending option input
  errors: Record<number, string | undefined>;
  mode: 'create' | 'edit';
  onQuestionsChange: (questions: QuestionDraft[]) => void;
  onOptionInputsChange: (vals: string[]) => void;
  onErrorChange?: (errors: Record<number, string | undefined>) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (index: number) => void;
  onAddOption: (index: number) => void;
  onRemoveOption: (qIdx: number, opt: string) => void;
  renderControls?: (index: number) => React.ReactNode; // custom trailing controls (e.g., remove button)
}

// NOTE: This is a first extraction pass—page still uses inline implementation.
// Next step would be to replace page inline blocks with this component usage.

export const QuestionListEditor: React.FC<QuestionListEditorProps> = ({
  questions,
  optionInputs,
  errors,
  onAddQuestion,
  onRemoveQuestion,
  onAddOption,
  onRemoveOption,
  onQuestionsChange,
  onOptionInputsChange,
  renderControls,
}) => {
  const handleQuestionField = (index: number, field: string, value: string) => {
    onQuestionsChange(questions.map((q, i) => {
      if (i !== index) return q;
      if (field === 'question_type') {
        if (value === 'text') return { id: q.id, question_text: q.question_text, question_type: 'text', options: [] } as TextQuestionDraft;
        if (value === 'multiple-choice') return { id: q.id, question_text: q.question_text, question_type: 'multiple-choice', options: [] } as MultipleChoiceQuestionDraft;
        return { id: q.id, question_text: q.question_text, question_type: 'rating', options: { scale: { min: 1, max: 5 } } } as RatingQuestionDraft;
      }
      return { ...q, [field]: value } as QuestionDraft;
    }));
  };

  const handleRatingScale = (index: number, key: 'min'|'max', value: number) => {
    onQuestionsChange(questions.map((q, i) => {
      if (i !== index) return q;
      if (q.question_type !== 'rating') return q; // safeguard
      return {
        ...q,
        options: { scale: { ...q.options.scale, [key]: value } }
      } as RatingQuestionDraft;
    }));
  };

  return (
    <div>
      {questions.map((q, i) => (
        <div key={q.id ?? `q-${i}`} className="p-4 border border-white/20 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-300">Question {i + 1}</label>
            {renderControls ? renderControls(i) : (
              <button
                aria-label={`Remove question ${i+1}`}
                title="Remove question"
                onClick={() => onRemoveQuestion(i)}
                className="text-red-400 hover:text-red-300"
                type="button"
              >×</button>
            )}
          </div>
          <input
            value={q.question_text}
            onChange={(e) => handleQuestionField(i, 'question_text', e.target.value)}
            placeholder="Question text"
            className="w-full mb-2 px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none"
          />
          <select
            value={q.question_type}
            onChange={(e) => handleQuestionField(i, 'question_type', e.target.value)}
            className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            aria-label="Question type"
          >
            <option value="text" className="bg-gray-800">Text</option>
            <option value="multiple-choice" className="bg-gray-800">Multiple Choice</option>
            <option value="rating" className="bg-gray-800">Rating</option>
          </select>
          {q.question_type === 'multiple-choice' && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={optionInputs[i] || ''}
                  onChange={(e) => onOptionInputsChange(optionInputs.map((v, idx) => idx === i ? e.target.value : v))}
                  placeholder="Add an option"
                  className="flex-1 px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none"
                />
                <button type="button" onClick={() => onAddOption(i)} className="px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-md hover:bg-white/20">Add</button>
              </div>
              {q.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map(opt => (
                    <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 text-white">
                      {opt}
                      <button aria-label={`Remove option ${opt}`} title="Remove option" type="button" onClick={() => onRemoveOption(i, opt)} className="text-red-400 hover:text-red-300">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {q.question_type === 'rating' && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="number"
                value={q.options.scale.min}
                onChange={(e) => handleRatingScale(i, 'min', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white"
                aria-label="Rating scale minimum"
                placeholder="Min"
              />
              <input
                type="number"
                value={q.options.scale.max}
                onChange={(e) => handleRatingScale(i, 'max', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white"
                aria-label="Rating scale maximum"
                placeholder="Max"
              />
            </div>
          )}
          {errors[i] && <p className="mt-2 text-xs text-red-400" role="alert">{errors[i]}</p>}
        </div>
      ))}
      <button
        type="button"
        onClick={onAddQuestion}
        className="inline-flex items-center px-3 py-2 text-sm border border-white/20 rounded-md text-white bg-white/10 hover:bg-white/20"
      >Add Question</button>
    </div>
  );
};
