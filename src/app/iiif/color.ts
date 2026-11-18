export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const hexToRgb = (hex: string): RGB | undefined => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return undefined;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const clampByte = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

export const rgbToHex = ({ r, g, b }: RGB): string =>
  `#${[r, g, b]
    .map(value => clampByte(value).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
