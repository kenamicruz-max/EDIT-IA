export type Character = { id: string; name: string; initials: string; aura: string; accent: string; image?: string; enabled: boolean };

export const characters: Character[] = [
  { id: 'goku', name: 'GOKU', initials: 'G', aura: 'ORANGE', accent: '#ff9d3d', enabled: true },
  { id: 'vegeta', name: 'VEGETA', initials: 'V', aura: 'BLUE', accent: '#6d8cff', enabled: true },
  { id: 'gohan', name: 'GOHAN', initials: 'G', aura: 'VIOLET', accent: '#b45cff', enabled: true },
  { id: 'trunks', name: 'TRUNKS', initials: 'T', aura: 'CYAN', accent: '#63d9ff', enabled: true },
  { id: 'piccolo', name: 'PICCOLO', initials: 'P', aura: 'GREEN', accent: '#6be28c', enabled: true },
  { id: 'broly', name: 'BROLY', initials: 'B', aura: 'LIME', accent: '#9ee65d', enabled: true },
];
