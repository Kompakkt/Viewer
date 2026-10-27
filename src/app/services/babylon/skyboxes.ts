export interface ISkyboxPreset {
  id: string;
  label: string;
  rotation: number;
}

// Matches the Babylon sandbox default
export const DEFAULT_MICRO_SURFACE = 0.7;

export const SKYBOX_PRESETS: ISkyboxPreset[] = [
  { id: 'sanGiuseppeBridge', label: 'Default', rotation: 5.54 },
  { id: 'ulmerMuenster', label: 'Plaza', rotation: 1.9 },
  { id: 'studio', label: 'Studio', rotation: 0 },
];
