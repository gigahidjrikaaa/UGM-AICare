// components/FeedbackForm.tsx
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useSession } from "next-auth/react";

// Optional: Define types for clarity
type GoalAchievedOption = 'Yes' | 'No' | 'Partially' | null;
type RatingOption = 1 | 2 | 3 | 4 | 5 | null;
type NpsOption = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | null;

// Helper function for hashing (ensure this is defined or imported)
async function hashIdentifier(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); 
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface FeedbackFormProps {
  // Removed sessionId prop as per user request for general feedback
  onClose: () => void; 
  onSubmitSuccess: () => void; 
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onClose, onSubmitSuccess }) => {
  const { data: session, status } = useSession();
  
  // State for each question
  const [easeOfUse, setEaseOfUse] = useState<RatingOption>(null);
  const [understanding, setUnderstanding] = useState<RatingOption>(null);
  const [feltUnderstood, setFeltUnderstood] = useState<RatingOption>(null);
  const [goalAchieved, setGoalAchieved] = useState<GoalAchievedOption>(null);
  const [nps, setNps] = useState<NpsOption>(null);
  const [improvementSuggestion, setImprovementSuggestion] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hashedUserId, setHashedUserId] = useState<string | null>(null);

  // Get hashed user ID from session
  useEffect(() => {
     const getHashedId = async () => {
       if (status === "authenticated" && session?.user?.id) {
          try {
              const hash = await hashIdentifier(session.user.id); // Use actual hashing
              setHashedUserId(hash);
          } catch(hashError) {
              console.error("Error hashing user ID:", hashError);
              setHashedUserId(null); // Handle hashing error
          }
       } else {
          setHashedUserId(null); // No user ID if not authenticated
       }
     };
     getHashedId();
  }, [session, status]);

  const isSubmitDisabled = isLoading || !improvementSuggestion || improvementSuggestion.trim().length < 5;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) {
        if (!improvementSuggestion || improvementSuggestion.trim().length < 5) {
             setError("Please provide an improvement suggestion (minimum 5 characters).");
        }
        return;
    } 

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      // Ensure the endpoint matches your router prefix + endpoint path
      const backendUrl = `${baseUrl}/api/v1/feedback/`; 

      const payload = {
        // Send null if user isn't logged in or hash isn't ready
        user_identifier: hashedUserId, 
        session_id: null, // Explicitly null for general feedback
        
        ease_of_use_rating: easeOfUse,
        chatbot_understanding_rating: understanding,
        felt_understood_rating: feltUnderstood,
        nps_rating: nps,
        goal_achieved: goalAchieved,
        improvement_suggestion: improvementSuggestion.trim(),
        // category: null, // Only include if you have a category input
      };
      
      console.log("Submitting feedback payload:", payload); // For debugging

      await axios.post(backendUrl, payload);

      onSubmitSuccess(); 
      onClose();         

    } catch (err) {
      console.error("Feedback submission error:", err);
      let message = "Failed to submit feedback. Please try again later.";
      if (axios.isAxiosError(err)) {
         if (err.response?.data?.detail) {
              // Handle detailed errors from FastAPI validation if available
              if (Array.isArray(err.response.data.detail)) {
                   message = err.response.data.detail.map((d: { loc: string | unknown[]; msg: unknown; }) => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join('; ');
              } else {
                   message = `Error: ${err.response.data.detail}`;
              }
         } else if (err.response?.status) {
              message = `Error: Submission failed (status ${err.response.status}).`;
         }
      } else if (err instanceof Error) {
         message = `Error: ${err.message}`;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isSubmitDisabled, improvementSuggestion, hashedUserId, easeOfUse, understanding, feltUnderstood, nps, goalAchieved, onSubmitSuccess, onClose]);
  
  // --- Helper for Rendering Rating Scales (Example) ---
  const renderRatingScale = (
       label: string, 
       idPrefix: string, 
       currentValue: RatingOption, 
       setter: (value: RatingOption) => void,
       options: {value: number, label: string}[]
   ) => (
       <div className="mb-4">
           <label className="block mb-1 font-medium">{label}</label>
           <div className="flex flex-wrap gap-2">
               {options.map(opt => (
                   <label key={`${idPrefix}-${opt.value}`} className="flex items-center space-x-1 cursor-pointer px-2 py-1 border border-gray-600 rounded hover:bg-gray-600 transition">
                       <input 
                           type="radio" 
                           name={idPrefix} 
                           value={opt.value} 
                           checked={currentValue === opt.value} 
                           onChange={() => setter(opt.value as RatingOption)}
                           className="form-radio h-4 w-4 text-blue-500"
                           disabled={isLoading}
                       />
                       <span className="text-sm">{opt.label} ({opt.value})</span>
                   </label>
               ))}
                {currentValue !== null && (
                    <button 
                        type="button" 
                        onClick={() => setter(null)} 
                        className="text-xs text-gray-400 hover:text-white ml-2"
                        disabled={isLoading}
                    >
                        Clear
                    </button>
                )}
           </div>
       </div>
   );

  // --- Form Structure (Style with Tailwind CSS) ---
  return (
    <div className="p-5 bg-gray-800 text-white rounded-lg shadow-xl max-w-lg w-full mx-auto border border-gray-700"> 
      <h2 className="text-2xl font-semibold mb-5 text-center">Share Your Feedback</h2>
      <p className="text-sm text-gray-400 mb-6 text-center">Your feedback helps us improve UGM-AICare for everyone.</p>
      
      <form onSubmit={handleSubmit} noValidate>

        {/* Q1: Ease of Use */}
        {renderRatingScale(
            "1. Overall, how easy or difficult was it to use the UGM-AICare webapp today?", 
            "easeOfUse", easeOfUse, setEaseOfUse, 
            [ {value: 1, label: "Very Difficult"}, {value: 2, label: "Difficult"}, {value: 3, label: "Neutral"}, {value: 4, label: "Easy"}, {value: 5, label: "Very Easy"} ]
        )}

        {/* Q2: Chatbot Understanding */}
        {renderRatingScale(
            "2. How well did Aika understand you during your chat?", 
            "understanding", understanding, setUnderstanding, 
            [ {value: 1, label: "Not at all"}, {value: 2, label: "Poorly"}, {value: 3, label: "Moderately"}, {value: 4, label: "Well"}, {value: 5, label: "Very Well"} ]
        )}

        {/* Q3: Feeling Heard */}
        {renderRatingScale(
            "3. During your conversation, how much did you feel heard or understood?", 
            "feltUnderstood", feltUnderstood, setFeltUnderstood, 
            [ {value: 1, label: "Not at all"}, {value: 2, label: "A Little"}, {value: 3, label: "Moderately"}, {value: 4, label: "Mostly"}, {value: 5, label: "Very Much"} ]
        )}

        {/* Q4: Goal Achievement */}
        <div className="mb-4">
            <label className="block mb-1 font-medium">4. Did you accomplish your main goal for visiting today?</label>
            <div className="flex flex-wrap gap-2">
                {(['Yes', 'No', 'Partially'] as const).map(opt => (
                     <label key={`goal-${opt}`} className="flex items-center space-x-1 cursor-pointer px-2 py-1 border border-gray-600 rounded hover:bg-gray-600 transition">
                         <input 
                             type="radio" 
                             name="goalAchieved" 
                             value={opt} 
                             checked={goalAchieved === opt} 
                             onChange={() => setGoalAchieved(opt)}
                             className="form-radio h-4 w-4 text-blue-500"
                             disabled={isLoading}
                         />
                         <span className="text-sm">{opt}</span>
                     </label>
                ))}
                 {goalAchieved !== null && (
                    <button 
                        type="button" 
                        onClick={() => setGoalAchieved(null)} 
                        className="text-xs text-gray-400 hover:text-white ml-2"
                        disabled={isLoading}
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>

        {/* Q5: NPS */}
         <div className="mb-4">
            <label className="block mb-1 font-medium">5. How likely are you to recommend UGM-AICare to another student? <span className="text-gray-400 text-sm">(0=Not Likely, 10=Very Likely)</span></label>
            <div className="flex flex-wrap justify-center gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                     <label key={`nps-${score}`} className={`flex items-center justify-center cursor-pointer h-8 w-8 border border-gray-600 rounded text-sm hover:bg-gray-600 transition ${nps === score ? 'bg-blue-600 border-blue-500' : 'bg-gray-700'}`}>
                         <input 
                             type="radio" 
                             name="nps" 
                             value={score} 
                             checked={nps === score} 
                             onChange={() => setNps(score as NpsOption)}
                             className="sr-only" // Hide actual radio button
                             disabled={isLoading}
                         />
                         {score}
                     </label>
                ))}
                 {nps !== null && (
                    <button 
                        type="button" 
                        onClick={() => setNps(null)} 
                        className="text-xs text-gray-400 hover:text-white ml-2 self-center"
                        disabled={isLoading}
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>

        {/* Q6: Improvement Suggestion */}
        <div className="mb-6">
          <label htmlFor="feedback-improvement" className="block mb-1 font-medium">
                6. What is the *one main thing* we could improve? <span className="text-red-400">*</span>
          </label>
          <textarea
            id="feedback-improvement"
            value={improvementSuggestion}
            onChange={(e) => setImprovementSuggestion(e.target.value)}
            placeholder="Please be specific..."
            rows={3}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
            required
            minLength={5}
            disabled={isLoading}
          />
           <p className="text-xs text-gray-400 mt-1">Minimum 5 characters required.</p>
        </div>

        {/* Error Display */}
        {error && <p className="text-red-400 text-sm mb-4 bg-red-900 bg-opacity-30 p-2 rounded border border-red-700">{error}</p>}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition text-sm font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            disabled={isSubmitDisabled}
          >
            {isLoading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;