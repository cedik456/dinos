export type AthleteHomeData = {
  athlete: {
    firstName: string;
  };
  context: string;
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
};

export type CoachHomeData = {
  coach: {
    firstName: string;
  };
  context: string;
};

const athleteHomeFixture: AthleteHomeData = {
  athlete: {
    firstName: "Mika",
  },
  context: "Your coaching overview",
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
};

const coachHomeFixture: CoachHomeData = {
  coach: {
    firstName: "Ced",
  },
  context: "Your private coaching overview",
};

export async function getAthleteHome(): Promise<AthleteHomeData> {
  return athleteHomeFixture;
}

export async function getCoachHome(): Promise<CoachHomeData> {
  return coachHomeFixture;
}
