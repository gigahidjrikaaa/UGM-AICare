/**
 * TypingEngine - Handles real-time typing validation and metrics
 * 
 * Features:
 * - Character-by-character validation
 * - WPM (Words Per Minute) calculation
 * - Accuracy tracking (mistakes vs total characters)
 * - Sentence selection from database
 */

interface SentenceDB {
  sentences: Array<{
    text_en: string;
    text_id: string;
    difficulty: number;
    category: string;
  }>;
}

interface SentenceFilters {
  difficulty: number;
  category: string;
  language: 'en' | 'id';
}

export interface TypingResult {
  type: 'character' | 'backspace';
  input: string;
  isComplete: boolean;
  wpm: number;
  accuracy: number;
  mistakes: number;
}

export class TypingEngine {
  private sentencesDB: SentenceDB;
  private currentSentence: string = '';
  private userInput: string = '';
  private startTime: number = 0;
  private mistakes: number = 0;

  constructor(sentencesDB: SentenceDB) {
    this.sentencesDB = sentencesDB;
    console.log(`[TypingEngine] Initialized with ${sentencesDB.sentences.length} sentences`);
  }

  /**
   * Get a random sentence matching filters
   */
  getSentence(filters: SentenceFilters): string {
    const filtered = this.sentencesDB.sentences.filter(
      (s) => s.difficulty === filters.difficulty && s.category === filters.category
    );

    if (filtered.length === 0) {
      console.warn('[TypingEngine] No sentences match filters, using fallback');
      return 'I am capable of handling challenges with grace and strength.';
    }

    const selected = filtered[Math.floor(Math.random() * filtered.length)];
    this.currentSentence = filters.language === 'en' ? selected.text_en : selected.text_id;
    this.startTime = Date.now();
    this.mistakes = 0;
    this.userInput = '';

    console.log(`[TypingEngine] Selected sentence (${filters.difficulty}/${filters.category}):`, this.currentSentence);
    return this.currentSentence;
  }

  /**
   * Handle keyboard input
   */
  handleKeyPress(key: string): TypingResult {
    if (key === 'Backspace') {
      this.userInput = this.userInput.slice(0, -1);
      return {
        type: 'backspace',
        input: this.userInput,
        isComplete: false,
        wpm: 0,
        accuracy: 0,
        mistakes: this.mistakes,
      };
    }

    // Only accept single printable characters
    if (key.length === 1) {
      const expected = this.currentSentence[this.userInput.length];
      
      // Track mistakes
      if (key !== expected) {
        this.mistakes++;
      }

      this.userInput += key;

      // Check completion
      const isComplete = this.userInput === this.currentSentence;
      const wpm = isComplete ? this.calculateWPM() : 0;
      const accuracy = isComplete ? this.calculateAccuracy() : 0;

      if (isComplete) {
        console.log(`[TypingEngine] Sentence complete! WPM: ${wpm}, Accuracy: ${accuracy}%`);
      }

      return {
        type: 'character',
        input: this.userInput,
        isComplete,
        wpm,
        accuracy,
        mistakes: this.mistakes,
      };
    }

    // Ignore other keys (Shift, Ctrl, etc.)
    return {
      type: 'character',
      input: this.userInput,
      isComplete: false,
      wpm: 0,
      accuracy: 0,
      mistakes: this.mistakes,
    };
  }

  /**
   * Reset for next sentence
   */
  reset(): void {
    this.userInput = '';
    this.startTime = Date.now();
    this.mistakes = 0;
  }

  /**
   * Calculate Words Per Minute
   */
  private calculateWPM(): number {
    const timeInMinutes = (Date.now() - this.startTime) / 60000;
    const words = this.currentSentence.split(' ').length;
    return Math.round(words / timeInMinutes);
  }

  /**
   * Calculate accuracy percentage
   */
  private calculateAccuracy(): number {
    const totalChars = this.currentSentence.length;
    const correctChars = totalChars - this.mistakes;
    return Math.round((correctChars / totalChars) * 100);
  }

  /**
   * Get current sentence for display
   */
  getCurrentSentence(): string {
    return this.currentSentence;
  }

  /**
   * Get user input for display
   */
  getUserInput(): string {
    return this.userInput;
  }
}
