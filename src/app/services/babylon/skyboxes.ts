export interface ISkyboxPreset {
  id: string;
  label: string;
  rotation: number;
}

// Matches the Babylon sandbox default
export const DEFAULT_MICRO_SURFACE = 0.7;

export const SKYBOX_PRESETS: ISkyboxPreset[] = [
  {
    id: 'sanGiuseppeBridge',
    label: 'k_entity-feature-settings-skybox-preset-default',
    rotation: 5.54,
  },
  { id: 'ulmerMuenster', label: 'k_entity-feature-settings-skybox-preset-plaza', rotation: 1.9 },
  { id: 'studio', label: 'k_entity-feature-settings-skybox-preset-studio', rotation: 0 },
];
