'use strict';

/**
 * Default progression configuration for THE SYSTEM.
 * All of this is stored (copy-on-first-run) into the `system_config` table
 * per user-scope-less singleton row so admins can tune it without redeploying.
 */

const DIFFICULTY_XP = {
  easy: 15,
  normal: 25,
  hard: 50,
  elite: 100,
  boss: 250,
};

const DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'elite', 'boss'];

// XP required to go from level N to N+1 (linear growth curve).
const LEVEL_XP_BASE = 100;
const LEVEL_XP_INCREMENT = 35;

function xpToReachLevel(level) {
  // XP needed to go from `level` to `level + 1`
  return Math.round(LEVEL_XP_BASE + (level - 1) * LEVEL_XP_INCREMENT);
}

// Rank thresholds by level.
const RANKS = [
  { rank: 'E', minLevel: 1, label: 'Beginner' },
  { rank: 'D', minLevel: 10, label: 'Initiate' },
  { rank: 'C', minLevel: 20, label: 'Disciplined' },
  { rank: 'B', minLevel: 30, label: 'Elite' },
  { rank: 'A', minLevel: 40, label: 'Advanced' },
  { rank: 'S', minLevel: 50, label: 'Master' },
  { rank: 'SS', minLevel: 60, label: 'Legendary' },
];

const STATS = [
  { key: 'STR', name: 'Strength', description: 'Exercise, workouts, physical activity.' },
  { key: 'INT', name: 'Intelligence', description: 'Reading, studying, learning, coding.' },
  { key: 'VIT', name: 'Vitality', description: 'Sleep, hydration, nutrition, recovery.' },
  { key: 'AGI', name: 'Agility', description: 'Walking, mobility, flexibility, movement.' },
  { key: 'DISC', name: 'Discipline', description: 'Consistency, completing planned tasks, waking on time.' },
  { key: 'FOC', name: 'Focus', description: 'Deep work, meditation, distraction-free sessions.' },
  { key: 'CHA', name: 'Social', description: 'Communication, relationships, networking.' },
];

const ACHIEVEMENTS = [
  { key: 'first_blood', name: 'FIRST BLOOD', description: 'Complete your first quest.', icon: 'sword', criteria: { type: 'quests_completed', value: 1 } },
  { key: 'unstoppable', name: 'UNSTOPPABLE', description: '7-day streak.', icon: 'flame', criteria: { type: 'streak', value: 7 } },
  { key: 'iron_will', name: 'IRON WILL', description: '30-day streak.', icon: 'shield', criteria: { type: 'streak', value: 30 } },
  { key: 'awakened', name: 'AWAKENED', description: 'Reach Level 10.', icon: 'eye', criteria: { type: 'level', value: 10 } },
  { key: 'elite', name: 'ELITE', description: 'Reach Rank A.', icon: 'star', criteria: { type: 'rank', value: 'A' } },
  { key: 'shadow_master', name: 'SHADOW MASTER', description: 'Reach Rank S.', icon: 'crown', criteria: { type: 'rank', value: 'S' } },
  { key: 'century', name: 'CENTURY', description: 'Complete 100 quests.', icon: 'medal', criteria: { type: 'quests_completed', value: 100 } },
  { key: 'perfection', name: 'PERFECTION', description: 'Complete every daily quest for 30 days.', icon: 'gem', criteria: { type: 'perfect_days', value: 30 } },
];

const ONBOARDING_FOCUS_AREAS = [
  { key: 'body', label: 'Body', stat: 'STR' },
  { key: 'mind', label: 'Mind', stat: 'INT' },
  { key: 'discipline', label: 'Discipline', stat: 'DISC' },
  { key: 'productivity', label: 'Productivity', stat: 'FOC' },
  { key: 'learning', label: 'Learning', stat: 'INT' },
  { key: 'sleep', label: 'Sleep', stat: 'VIT' },
  { key: 'health', label: 'Health', stat: 'VIT' },
  { key: 'custom', label: 'Custom', stat: null },
];

// Starter quest templates keyed by focus area.
const STARTER_QUESTS = {
  body: [
    { name: 'Workout 30 Minutes', stat: 'STR', difficulty: 'normal', frequencyType: 'daily' },
    { name: '10-Minute Stretch', stat: 'AGI', difficulty: 'easy', frequencyType: 'daily' },
  ],
  mind: [
    { name: 'Read 20 Pages', stat: 'INT', difficulty: 'normal', frequencyType: 'daily' },
    { name: 'Learn Something New', stat: 'INT', difficulty: 'easy', frequencyType: 'daily' },
  ],
  discipline: [
    { name: 'Wake Before 7AM', stat: 'DISC', difficulty: 'normal', frequencyType: 'daily' },
    { name: 'No Phone Before 9AM', stat: 'DISC', difficulty: 'hard', frequencyType: 'daily' },
  ],
  productivity: [
    { name: 'Deep Work Session (60m)', stat: 'FOC', difficulty: 'hard', frequencyType: 'daily' },
    { name: 'Plan Tomorrow Tonight', stat: 'DISC', difficulty: 'easy', frequencyType: 'daily' },
  ],
  learning: [
    { name: 'Study 30 Minutes', stat: 'INT', difficulty: 'normal', frequencyType: 'daily' },
  ],
  sleep: [
    { name: 'Sleep Before 11:30 PM', stat: 'VIT', difficulty: 'normal', frequencyType: 'daily' },
  ],
  health: [
    { name: 'Drink 2L Water', stat: 'VIT', difficulty: 'easy', frequencyType: 'daily' },
    { name: 'Eat a Vegetable-Rich Meal', stat: 'VIT', difficulty: 'easy', frequencyType: 'daily' },
  ],
  custom: [
    { name: 'Meditate 10 Minutes', stat: 'FOC', difficulty: 'easy', frequencyType: 'daily' },
  ],
};

const THEMES = ['system-dark', 'void', 'aether', 'light-system'];

module.exports = {
  DIFFICULTY_XP,
  DIFFICULTY_ORDER,
  LEVEL_XP_BASE,
  LEVEL_XP_INCREMENT,
  xpToReachLevel,
  RANKS,
  STATS,
  ACHIEVEMENTS,
  ONBOARDING_FOCUS_AREAS,
  STARTER_QUESTS,
  THEMES,
};
