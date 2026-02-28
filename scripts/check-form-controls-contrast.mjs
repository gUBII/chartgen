/**
 * UAT Script: Check Form Controls Contrast
 * Verifies WCAG 2.1 contrast compliance for CSS variables used in form controls.
 */

import fs from 'fs';
import path from 'path';

const CSS_PATH = './src/app/globals.css';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(l1, l2) {
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

function runUAT() {
  console.log('--- FORM CONTRAST UAT ---');
  
  if (!fs.existsSync(CSS_PATH)) {
    console.error('Error: globals.css not found.');
    process.exit(1);
  }

  const css = fs.readFileSync(CSS_PATH, 'utf8');
  
  // Extract variables
  const bgBaseMatch = css.match(/--bg-base:\s*(#[a-fA-F0-9]{6})/);
  const textMainMatch = css.match(/--text-main:\s*(#[a-fA-F0-9]{6})/);

  if (!bgBaseMatch || !textMainMatch) {
    console.error('Error: Could not find color variables in CSS.');
    process.exit(1);
  }

  const bgHex = bgBaseMatch[1];
  const textHex = textMainMatch[1];

  const bgRgb = hexToRgb(bgHex);
  const textRgb = hexToRgb(textHex);

  const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const textLum = getLuminance(textRgb.r, textRgb.g, textRgb.b);

  const ratio = getContrastRatio(bgLum, textLum);

  console.log(`Background: ${bgHex} (Lum: ${bgLum.toFixed(4)})`);
  console.log(`Text: ${textHex} (Lum: ${textLum.toFixed(4)})`);
  console.log(`Contrast Ratio: ${ratio.toFixed(2)}:1`);

  if (ratio >= 4.5) {
    console.log('Result: PASS (WCAG 2.1 AA Compliant)');
    process.exit(0);
  } else {
    console.log('Result: FAIL (Fails WCAG 2.1 AA requirement of 4.5:1)');
    process.exit(1);
  }
}

runUAT();
