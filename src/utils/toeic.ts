export interface ToeicLevel {
  label: 'Gold' | 'Blue' | 'Green' | 'Brown' | 'Orange';
  color: string;
  badgeBg: string;
  badgeTextColor: string;
  full: string;
}

export function getToeicLevel(score: number): ToeicLevel {
  if (score >= 785) {
    return {
      label: 'Gold',
      color: 'gold',
      badgeBg: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-900/30 dark:text-yellow-400',
      badgeTextColor: 'text-yellow-600',
      full: 'Professional Proficiency'
    };
  }
  if (score >= 605) {
    return {
      label: 'Blue',
      color: 'blue',
      badgeBg: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400',
      badgeTextColor: 'text-blue-600',
      full: 'Working Proficiency'
    };
  }
  if (score >= 405) {
    return {
      label: 'Green',
      color: 'green',
      badgeBg: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400',
      badgeTextColor: 'text-green-600',
      full: 'Intermediate Proficiency'
    };
  }
  if (score >= 255) {
    return {
      label: 'Brown',
      color: 'brown',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400',
      badgeTextColor: 'text-amber-600',
      full: 'Elementary Proficiency'
    };
  }
  return {
    label: 'Orange',
    color: 'orange',
    badgeBg: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400',
    badgeTextColor: 'text-orange-600',
    full: 'Basic Proficiency'
  };
}
