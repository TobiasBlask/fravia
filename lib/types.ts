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
  feedToken?: string;
  diet?: string;
  movement?: string;
  referral?: string;
  displayName?: string;
  irregular?: boolean;
  endo?: "none" | "suspected" | "diagnosed";
};

export type EventKind = "termin" | "mahlzeit" | "sport" | "geburtstag";
export type SeriesFreq =
  | "none"
  | "daily"
  | "weekdays"
  | "weekdays-sat"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "halfyearly"
  | "yearly";

export type DayEvent = {
  id: string;
  title: string;
  kind: EventKind;
  date: string;
  time?: string;
  end?: string;
  location?: string;
  remind?: number;
  note?: string;
  freq: string;
  seriesId: string;
  shared?: boolean;
};

export type DayTodo = {
  id: string;
  title: string;
  date: string;
  done: boolean;
  freq: string;
  seriesId: string;
  energy?: number;
  flexible?: boolean;
  shared?: boolean;
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
  symptoms?: string[];
  ovulation?: boolean;
};

export type TintKey =
  | "menstruation"
  | "follicular"
  | "ovulation"
  | "luteal"
  | "paper";
