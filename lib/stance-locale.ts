import type { Lang } from "./copy";
import type { Stance } from "./voice";

type Line = { kicker: string; a: string; b: string; food: string; move: string };

const en: Record<string, Line> = {
  "rhythm-menstruation": { kicker: "Menstruation", a: "Rest and recovery.", b: "Your body wants warmth, iron and a little kindness.", food: "Leafy greens, lentils, ginger or chamomile tea.", move: "Gentle yoga, a walk. Rest days are allowed." },
  "rhythm-follicular": { kicker: "Follicular", a: "Your energy is rising.", b: "A good moment for something new, and for moving.", food: "Fresh salads, avocado, nuts, berries.", move: "Cardio, dancing, try something new." },
  "rhythm-ovulation": { kicker: "Ovulation", a: "Energy is high, and so is your presence.", b: "Dare something visible.", food: "Water, vegetables, quinoa, seeds.", move: "Strength, a class, harder if you feel like it." },
  "rhythm-luteal": { kicker: "Luteal", a: "Focus, and a bit of clearing up.", b: "Your body wants magnesium and kindness toward yourself.", food: "Sweet potato, almonds, spinach, omega-3.", move: "Pilates, a long walk, moderate strength." },
  "pill-pause": { kicker: "Pause", a: "This is your pause.", b: "The bleed is a withdrawal bleed, not ovulation. Warmth helps.", food: "Warm and simple. Iron if you're bleeding.", move: "Stay gentle. No plan that assumes a cycle." },
  "pill-anlauf": { kicker: "Starting up", a: "The pause is over.", b: "Energy doesn't arrive on command – I'll stay with you anyway.", food: "Eat normally. Nothing heroic.", move: "Move lightly until it feels steady." },
  "pill-mitte": { kicker: "Middle", a: "Steadier days.", b: "Put down what should stay. No cycle lecture.", food: "Regular meals, the way you like them.", move: "Training is fine if you want it. This is not an ovulation high." },
  "pill-vormbruch": { kicker: "Before the pause", a: "Just before the pause it often thins out.", b: "Track the mood without making a drama of it.", food: "Regular meals. Magnesium can come along.", move: "Shorter. Gentle is enough." },
  "pain-menstruation": { kicker: "Menstruation", a: "Your body is working.", b: "Rest and warmth will do you good today.", food: "Warm food, iron, ginger. Nothing that irritates.", move: "Gentle yoga, or lie down. No high pace." },
  "pain-follicular": { kicker: "After", a: "When the pain eases, that's air.", b: "You don't have to finish the postponed list today.", food: "Light and warm, whatever helps.", move: "Movement that starts easily. Not more." },
  "pain-ovulation": { kicker: "A stronger day", a: "A stronger day is not a promise.", b: "Pain is still allowed to be here.", food: "Eat what you feel like. Nothing you have to earn.", move: "One thing that helps. No intense habit-program." },
  "pain-luteal": { kicker: "A smaller measure", a: "Capacity gets tighter.", b: "Cut the day before the pain does.", food: "Magnesium, warm meals, smaller portions.", move: "Pilates or a walk. Rest days stay allowed." },
  "pain-none": { kicker: "Air", a: "There is capacity today.", b: "I won't turn that into a bigger assignment.", food: "Eat normally. Nothing to catch up.", move: "Move if it feels good. No catching up." },
  "pain-light": { kicker: "Noticeable", a: "Today with a margin.", b: "The pain is here and it limits the day.", food: "Warm and light. A real pause in between.", move: "Gentle. Pushing through is not a virtue." },
  "pain-strong": { kicker: "Strong", a: "Today is a small day.", b: "That is the plan, not a slip.", food: "Whatever stays easy. Warmth.", move: "Lie down, or very little. No high pace." },
  "pain-out": { kicker: "Rest", a: "Today is rest.", b: "You don't have to prove anything.", food: "Whatever lands. Asking for help is allowed.", move: "No session. Warmth, lying down, help." },
  "meno-none": { kicker: "Menopause", a: "I'm not deriving today from a cycle.", b: "Sleep, heat, mood – how are you?", food: "Eat what you feel like. Lighter, more water, if there's heat.", move: "Movement that works today. No plan that pretends to be sure." },
  "meno-heat": { kicker: "Heat", a: "Heat is the frame today.", b: "Plan shorter. Layers. A way out.", food: "Eat lighter, drink more water.", move: "Not a hot, closed room. A short walk in the air." },
  "meno-sleep": { kicker: "Sleep", a: "Sleep was thin. The day will be too.", b: "None of that is a question of character.", food: "Regular, nothing heavy in the morning.", move: "Start later. A small loop, if at all." },
  "meno-raw": { kicker: "Mood", a: "The mood is raw. Take it as weather.", b: "No big cuts today.", food: "Whatever comforts, without an explanation.", move: "Little. A walk only if it helps." },
  "meno-thin": { kicker: "Mood", a: "Thin, not dramatic.", b: "Keep the day short and concrete.", food: "One real meal, then stop.", move: "Gentle and short." },
  "meno-steady": { kicker: "Workable", a: "Today feels usable.", b: "Use it without announcing a new rhythm.", food: "What you like. Not proof that it's all over.", move: "One clear session, while it holds." },
};

const es: Record<string, Line> = {
  "rhythm-menstruation": { kicker: "Menstruación", a: "Descanso y recuperación.", b: "Tu cuerpo quiere calor, hierro y un poco de cariño.", food: "Verdura con hierro, lentejas, jengibre o manzanilla.", move: "Yoga suave, un paseo. Los días de descanso están permitidos." },
  "rhythm-follicular": { kicker: "Folicular", a: "Tu energía sube.", b: "Buen momento para algo nuevo y para moverte.", food: "Ensaladas, aguacate, frutos secos, frutos rojos.", move: "Cardio, bailar, probar algo nuevo." },
  "rhythm-ovulation": { kicker: "Ovulación", a: "Energía alta, y presencia.", b: "Atrévete a algo visible.", food: "Agua, verdura, quinoa, semillas.", move: "Fuerza, una clase, más intenso si te apetece." },
  "rhythm-luteal": { kicker: "Lútea", a: "Foco y un poco de orden.", b: "Tu cuerpo quiere magnesio y cariño contigo.", food: "Boniato, almendras, espinacas, omega-3.", move: "Pilates, un paseo largo, fuerza moderada." },
  "pill-pause": { kicker: "Pausa", a: "Esta es tu pausa.", b: "El sangrado es una hemorragia de deprivación, no una ovulación. El calor ayuda.", food: "Caliente y simple. Hierro si sangras.", move: "Suave. Ningún plan que suponga un ciclo." },
  "pill-mitte": { kicker: "Mitad", a: "Días más estables.", b: "Deja aquí lo que debe quedarse. Sin discurso de ciclo.", food: "Comidas regulares, como te gusten.", move: "Entrenar vale si te apetece. No es un pico de ovulación." },
  "meno-none": { kicker: "Menopausia", a: "Hoy no deduzco nada de un ciclo.", b: "Sueño, calor, ánimo – ¿cómo estás?", food: "Come lo que te pida el cuerpo. Con calor, más ligero y más agua.", move: "El movimiento que hoy se puede. Ningún plan que finja certeza." },
};

const fr: Record<string, Line> = {
  "rhythm-menstruation": { kicker: "Menstruation", a: "Repos et récupération.", b: "Ton corps veut de la chaleur, du fer et un peu de douceur.", food: "Légumes riches en fer, lentilles, gingembre ou camomille.", move: "Yoga doux, une marche. Les jours de repos sont permis." },
  "rhythm-follicular": { kicker: "Folliculaire", a: "Ton énergie monte.", b: "Bon moment pour du nouveau, et pour bouger.", food: "Salades, avocat, noix, fruits rouges.", move: "Cardio, danser, essayer quelque chose de neuf." },
  "rhythm-ovulation": { kicker: "Ovulation", a: "L'énergie est haute, et ta présence aussi.", b: "Ose quelque chose de visible.", food: "Eau, légumes, quinoa, graines.", move: "Force, un cours, plus intense si tu en as envie." },
  "rhythm-luteal": { kicker: "Lutéale", a: "Du focus, et un peu de rangement.", b: "Ton corps veut du magnésium et de la douceur envers toi.", food: "Patate douce, amandes, épinards, oméga-3.", move: "Pilates, une longue marche, de la force modérée." },
  "pill-pause": { kicker: "Pause", a: "C'est ta pause.", b: "Le saignement est une hémorragie de privation, pas une ovulation. La chaleur aide.", food: "Chaud et simple. Du fer si tu saignes.", move: "En douceur. Pas de programme qui suppose un cycle." },
  "pill-mitte": { kicker: "Milieu", a: "Des jours plus stables.", b: "Pose ici ce qui doit rester. Sans leçon de cycle.", food: "Des repas réguliers, comme tu les aimes.", move: "L'entraînement va si tu en as envie. Ce n'est pas un pic d'ovulation." },
  "meno-none": { kicker: "Ménopause", a: "Je ne déduis pas aujourd'hui d'un cycle.", b: "Sommeil, chaleur, humeur – comment tu vas ?", food: "Mange ce qui te fait envie. S'il y a de la chaleur, plus léger, plus d'eau.", move: "Le mouvement qui passe aujourd'hui. Pas de plan qui se croit sûr." },
};

const books: Record<Exclude<Lang, "de">, Record<string, Line>> = { en, es, fr };

export function stanceIn(lang: Lang, stance: Stance): Stance {
  if (lang === "de") return stance;
  const line = books[lang][stance.id] ?? books.en[stance.id];
  if (!line) return stance;
  return {
    ...stance,
    kicker: line.kicker,
    lines: [line.a, line.b],
    food: line.food,
    move: line.move,
  };
}
