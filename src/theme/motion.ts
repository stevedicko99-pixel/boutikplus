// Motion tokens — durées et courbes d'animation partagées.
// Calibrées pour rester fluides sur les appareils low-end (pas de jank).

export const motion = {
  durations: {
    instant: 90,     // feedback tactile immédiat
    quick: 160,       // micro-interactions (hover, press)
    base: 240,        // transitions standards (cartes, onglets)
    smooth: 360,     // entrées de section
    slow: 520,        // apparitions hero
  },
  easings: {
    // cubic-bezier reconnus, identiques sur native et web
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.5, 1.5, 0.5, 1)',
    linear: 'linear',
  },
  // Classes utilitaires web (injectées via Platform.select)
  web: {
    pressableHover: 'transition-duration:160ms; transition-property:transform, box-shadow, background-color; transition-timing-function:cubic-bezier(0.2,0,0,1);',
    cardLift: 'transition-duration:240ms; transition-property:transform, box-shadow; transition-timing-function:cubic-bezier(0.2,0,0,1);',
  },
} as const;

export type AppMotion = typeof motion;
