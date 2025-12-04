/**
 * Grounding Activities Export
 * 
 * This file exports all grounding activities for registration.
 * Grounding techniques help anchor users to the present moment.
 */

export { default as FiveFourThreeTwoOne } from './FiveFourThreeTwoOne';

// Activity metadata for the registry
export const groundingActivities = [
  {
    id: 'five-four-three-two-one',
    name: '5-4-3-2-1 Grounding',
    description: 'A sensory awareness technique that uses all five senses to anchor you to the present moment.',
    category: 'grounding',
    estimatedDuration: 180,
    difficulty: 'beginner',
    tags: ['anxiety', 'panic', 'present-moment', 'sensory'],
    icon: '🌿',
    component: 'FiveFourThreeTwoOne',
  },
];
