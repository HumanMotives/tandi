// data/worlds.js
export const WORLDS = [
  {
    id: "w1",
    titleSmall: "Wereld 1",
    titleBig: "Eerste Stapjes",
    thumb: "./assets/img/world_1.png",
    requiredStarsToUnlock: 0,

    // NEW: levels for this world
    levels: [
      { id: "W1-L1", title: "Level 1", requiredStarsToUnlock: 0, lessonId: "W1-L1" },
      { id: "W1-L2", title: "Level 2", requiredStarsToUnlock: 0, lessonId: "W1-L2" },
      { id: "W1-L3", title: "Level 3", requiredStarsToUnlock: 0, lessonId: "W1-L3" },
      { id: "W1-L4", title: "Level 4", requiredStarsToUnlock: 0, lessonId: "W1-L4" }
    ]
  },
  {
    id: "w2",
    titleSmall: "Wereld 2",
    titleBig: "Voel de Vibe",
    thumb: "./assets/img/world_2.png",
    requiredStarsToUnlock: 6,

    levels: [
      { id: "W2-L1", title: "Level 1", requiredStarsToUnlock: 6, lessonId: "W2-L1" },
      { id: "W2-L2", title: "Level 2", requiredStarsToUnlock: 6, lessonId: "W2-L2" },
      { id: "W2-L3", title: "Level 3", requiredStarsToUnlock: 6, lessonId: "W2-L3" }
    ]
  },
  {
    id: "w3",
    titleSmall: "Wereld 3",
    titleBig: "Groovy",
    thumb: "./assets/img/world_3.png",
    requiredStarsToUnlock: 14,

    levels: [
      { id: "W3-L1", title: "Level 1", requiredStarsToUnlock: 14, lessonId: "W3-L1" },
      { id: "W3-L2", title: "Level 2", requiredStarsToUnlock: 14, lessonId: "W3-L2" }
    ]
  },
  {
    id: "w4",
    titleSmall: "Wereld 4",
    titleBig: "Showtime",
    thumb: "./assets/img/world_4.png",
    requiredStarsToUnlock: 24,

    levels: [
      { id: "W4-L1", title: "Level 1", requiredStarsToUnlock: 24, lessonId: "W4-L1" }
    ]
  },
  {
    id: "w5",
    titleSmall: "Wereld 5",
    titleBig: "Galaxy Star",
    thumb: "./assets/img/world_5.png",
    requiredStarsToUnlock: 36,

    levels: [
      { id: "W5-L1", title: "Level 1", requiredStarsToUnlock: 36, lessonId: "W5-L1" }
    ]
  }
];
