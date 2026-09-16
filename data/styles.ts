export type EditStyle = { id: string; name: string; description: string; duration: string; features: string[]; accent: string; icon: string; referenceKey?: string; thumbnailKey?: string; enabled: boolean };

export const editStyles: EditStyle[] = [
  { id: 'amv', name: 'AMV', description: 'Cortes expresivos y ritmo musical.', duration: '15–30s', features: ['SYNC', 'IMPACT'], accent: '#ff9d3d', icon: '◈', enabled: true },
  { id: 'beat-sync', name: 'BEAT SYNC', description: 'Cortes guiados por el beat.', duration: '10–25s', features: ['BEATS', 'FLOW'], accent: '#7c8cff', icon: '≋', enabled: true },
  { id: 'fast-cut', name: 'FAST CUT', description: 'Montaje rápido y energético.', duration: '8–20s', features: ['SPEED', 'IMPACT'], accent: '#ff5d6c', icon: '⚡', enabled: true },
  { id: 'cinematic', name: 'CINEMATIC', description: 'Tensión, atmósfera y ritmo amplio.', duration: '20–45s', features: ['MOOD', 'COLOR'], accent: '#b45cff', icon: '▣', enabled: true },
  { id: 'hard-edit', name: 'HARD EDIT', description: 'Golpes, flashes y transiciones fuertes.', duration: '8–18s', features: ['HARD', 'FLASH'], accent: '#ffce4a', icon: '✦', enabled: true },
  { id: 'velocity', name: 'VELOCITY', description: 'Movimiento y aceleraciones controladas.', duration: '10–25s', features: ['MOTION', 'FLOW'], accent: '#55d9ff', icon: '»', enabled: true },
];
