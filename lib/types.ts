export type Persona = "rhythm" | "pill" | "pain" | "menopause";

export type Bleeding = "none" | "light" | "medium" | "heavy";
export type Pain = "none" | "light" | "strong" | "out";
export type Mood = "even" | "thin" | "raw";
export type Heat = "none" | "warm" | "hot";
export type Sleep = "steady" | "broken" | "short";

export type Profile = {
  persona: Persona;
  lastPeriodStart?: string;
  cycleLength?: number;
  periodLength?: number;
  lutealLength?: number;
  packLength?: number;
};

export type DayLog = {
  date: string;
  bleeding: Bleeding;
  energy?: number;
  note: string;
  pain?: Pain;
  mood?: Mood;
  heat?: Heat;
  sleep?: Sleep;
};

export type TintKey =
  | "menstruation"
  | "follicular"
  | "ovulation"
  | "luteal"
  | "paper";
