export type WeekDay = {
  day: string;
  date: number;
  state: "complete" | "today" | "upcoming" | "rest";
};

export type AthleteHomeData = {
  athlete: {
    firstName: string;
    initials: string;
  };
  context: string;
  week: WeekDay[];
  workout: {
    name: string;
    exerciseCount: number;
    estimatedMinutes: number;
    status: string;
  };
  nutrition: {
    calories: number;
    calorieTarget: number;
    protein: number;
    proteinTarget: number;
  };
  sleepHours: number;
  weightKg: number;
  weeklyProgress: {
    completed: number;
    assigned: number;
    volumeKg: number;
  };
};

export type CoachReviewItem = {
  id: string;
  athleteName: string;
  initials: string;
  reason: string;
  activity: string;
  status: string;
  tone: "success" | "warning" | "danger" | "neutral";
};

export type CoachHomeData = {
  coach: {
    firstName: string;
    initials: string;
  };
  context: string;
  activeAthletes: number;
  needsReview: CoachReviewItem[];
  weeklyMetrics: {
    adherencePercent: number;
    checkInsSubmitted: number;
    overdueItems: number;
  };
};

const athleteHomeFixture: AthleteHomeData = {
  athlete: {
    firstName: "Mika",
    initials: "MS",
  },
  context: "Sunday, 16 August",
  week: [
    { day: "Mon", date: 10, state: "complete" },
    { day: "Tue", date: 11, state: "complete" },
    { day: "Wed", date: 12, state: "rest" },
    { day: "Thu", date: 13, state: "complete" },
    { day: "Fri", date: 14, state: "complete" },
    { day: "Sat", date: 15, state: "rest" },
    { day: "Sun", date: 16, state: "today" },
  ],
  workout: {
    name: "Upper body strength",
    exerciseCount: 6,
    estimatedMinutes: 55,
    status: "Ready for today",
  },
  nutrition: {
    calories: 1840,
    calorieTarget: 2100,
    protein: 118,
    proteinTarget: 135,
  },
  sleepHours: 7.6,
  weightKg: 71.8,
  weeklyProgress: {
    completed: 4,
    assigned: 5,
    volumeKg: 12840,
  },
};

const coachHomeFixture: CoachHomeData = {
  coach: {
    firstName: "Ced",
    initials: "CN",
  },
  context: "8 active athletes · Sunday overview",
  activeAthletes: 8,
  needsReview: [
    {
      id: "review-mika",
      athleteName: "Mika Santos",
      initials: "MS",
      reason: "Upper body workout submitted",
      activity: "18 min ago",
      status: "Review workout",
      tone: "success",
    },
    {
      id: "review-alex",
      athleteName: "Alex Reyes",
      initials: "AR",
      reason: "Weekly check-in is overdue",
      activity: "2 days overdue",
      status: "Follow up",
      tone: "danger",
    },
    {
      id: "review-sam",
      athleteName: "Sam Lim",
      initials: "SL",
      reason: "Added a nutrition note",
      activity: "1 hr ago",
      status: "Read note",
      tone: "warning",
    },
  ],
  weeklyMetrics: {
    adherencePercent: 82,
    checkInsSubmitted: 6,
    overdueItems: 2,
  },
};

export async function getAthleteHome(): Promise<AthleteHomeData> {
  return athleteHomeFixture;
}

export async function getCoachHome(): Promise<CoachHomeData> {
  return coachHomeFixture;
}
