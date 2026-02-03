// data/levels.js
export const LEVELS_BY_WORLD = {
  world1: {
    worldTitle: "IN HET BEGIN WAS ER ... RITME!",
    levels: [
      {
        id: "w1-l1",
        label: "Les 1",
        title: "Ritme is al zo oud als de aarde",
        introScript: [
          { from: "professor", text: "Hey hallo! Welkom op de Drum School." },
          { from: "professor", text: "Wist je dat ritmes al eeuwenlang worden getikt?" },
          { from: "teacher", text: "Vandaag doen we 1 simpele super-skill: gelijk klappen in 4 tellen!" }
        ],
        practice: { bpmDefault: 70, hits: 4, grid: 4 }
      },
      {
        id: "w1-l2",
        label: "Les 2",
        title: "De maat is vol!",
        introScript: [
          { from: "teacher", text: "Ok grapje. Nu begint het pas echt..." },
          { from: "teacher", text: "We doen weer 4 tellen, maar nu met rusten." }
        ],
        practice: { bpmDefault: 70, hits: 3, grid: 4 }
      },
      {
        id: "w1-l3",
        label: "Les 3",
        title: "Gelijke ruimtes",
        introScript: [
          { from: "teacher", text: "Alles even ver uit elkaar. Dat is ritme-magic ✨" }
        ],
        practice: { bpmDefault: 75, hits: 4, grid: 4 }
      },
      {
        id: "w1-l4",
        label: "Les 4",
        title: "Snel & langzaam",
        introScript: [
          { from: "teacher", text: "Schildpad of konijn. Zelfde beat!" }
        ],
        practice: { bpmDefault: 85, hits: 4, grid: 4 }
      }
    ]
  }
};

// helpers
export function getWorld(worldId) {
  return LEVELS_BY_WORLD[worldId] || null;
}

export function findLevel(levelId) {
  for (const [wid, w] of Object.entries(LEVELS_BY_WORLD)) {
    const lvl = w.levels.find((l) => l.id === levelId);
    if (lvl) return { worldId: wid, world: w, level: lvl };
  }
  return null;
}
