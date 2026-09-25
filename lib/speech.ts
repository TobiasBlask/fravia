import type { DayLog, EventKind, Persona } from "./types";

export type Heard = {
  log: Partial<DayLog>;
  event?: { title: string; kind: EventKind };
  todo?: string;
};

const SYMPTOMS: Array<[RegExp, string]> = [
  [/krampf|cramp|calambre|crampe/i, "cramp"],
  [/kopf|headache|cabeza|tête|tete/i, "head"],
  [/brust|breast|pecho|sein/i, "breast"],
  [/haut|akne|skin|piel|peau/i, "skin"],
  [/müde|muede|tired|cansanc|fatigue/i, "tired"],
  [/hunger|appétit|appetit|apetito|craving/i, "appetite"],
];

export function hear(text: string, persona: Persona): Heard {
  const raw = text.trim();
  const log: Partial<DayLog> = {};
  const symptoms: string[] = [];
  for (const [pattern, id] of SYMPTOMS) {
    if (pattern.test(raw)) symptoms.push(id);
  }
  if (symptoms.length) log.symptoms = symptoms;

  const energy = raw.match(/(?:energie|energy|energ[ií]a|énergie)\s*([1-5])/i);
  if (energy) log.energy = Number(energy[1]);

  if (/stark|heavy|fuerte|abondant/i.test(raw) && /blut|period|bleed|sangr|règle|regle/i.test(raw)) {
    log.bleeding = "heavy";
  } else if (/leicht|light|leve|léger|leger/i.test(raw) && /blut|period|bleed|sangr|règle|regle/i.test(raw)) {
    log.bleeding = "light";
  } else if (/blut|period|bleed|sangr|règle|regle/i.test(raw)) {
    log.bleeding = "medium";
  }

  if (persona === "rhythm" && /eisprung|ovulat|ovulaci/i.test(raw)) log.ovulation = true;
  if (/kein schmerz|no pain|sin dolor|pas de douleur/i.test(raw)) log.pain = "none";
  else if (/geht nicht|can't move|no puedo|je n'y arrive/i.test(raw)) log.pain = "out";
  else if (/schmerz.*stark|strong pain|dolor fuerte|douleur forte/i.test(raw)) log.pain = "strong";
  else if (/schmerz|pain|dolor|douleur/i.test(raw)) log.pain = "light";

  if (/heiß|heiss|hot flush|sofoco|bouffée/i.test(raw)) log.heat = "hot";
  else if (/warm|calor|chaleur/i.test(raw)) log.heat = "warm";
  if (/schlecht geschlafen|broken sleep|mal dorm|mal dormi/i.test(raw)) log.sleep = "broken";

  if (raw) log.note = raw.slice(0, 280);

  const event = matchEvent(raw);
  const todo = /^(aufgabe|todo|to-do|tarea|tâche|tache)\s+(.+)/i.exec(raw);
  return {
    log,
    ...(event ? { event } : {}),
    ...(todo ? { todo: todo[2].slice(0, 140) } : {}),
  };
}

function matchEvent(raw: string): { title: string; kind: EventKind } | undefined {
  const patterns: Array<[RegExp, EventKind]> = [
    [/^(?:termin|appointment|cita|rendez-vous)\s+(.+)/i, "termin"],
    [/^(?:essen|mahlzeit|meal|comida|repas)\s+(.+)/i, "mahlzeit"],
    [/^(?:sport|training|entrenamiento)\s+(.+)/i, "sport"],
    [/^(?:geburtstag|birthday|cumpleaños|cumpleanos|anniversaire)\s+(.+)/i, "geburtstag"],
  ];
  for (const [pattern, kind] of patterns) {
    const hit = pattern.exec(raw);
    if (hit) return { title: hit[1].slice(0, 140), kind };
  }
  return undefined;
}
