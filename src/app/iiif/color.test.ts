import { describe, expect, test } from 'bun:test';
import { hexToRgb, rgbToHex } from './color';

describe('color', () => {
  test('hexToRgb parses #RRGGBB', () => {
    expect(hexToRgb('#99CCFF')).toEqual({ r: 153, g: 204, b: 255 });
  });

  test('hexToRgb accepts missing hash and lowercase', () => {
    expect(hexToRgb('a0ffa0')).toEqual({ r: 160, g: 255, b: 160 });
  });

  test('hexToRgb rejects invalid input', () => {
    expect(hexToRgb('#FFF')).toBeUndefined();
    expect(hexToRgb('#GGGGGG')).toBeUndefined();
  });

  test('rgbToHex produces uppercase #RRGGBB and clamps', () => {
    expect(rgbToHex({ r: 153, g: 204, b: 255 })).toBe('#99CCFF');
    expect(rgbToHex({ r: -4, g: 300, b: 15.6 })).toBe('#00FF10');
  });
});
