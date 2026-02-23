/**
 * PDF Font Loader for Montserrat
 *
 * Fetches Montserrat TTF files from /public/fonts/ and registers them
 * with a jsPDF document instance. Falls back to 'helvetica' gracefully
 * if the font files are not available or not yet downloaded.
 *
 * Font files required in /public/fonts/:
 *   - Montserrat-Regular.ttf
 *   - Montserrat-Bold.ttf
 *
 * Download instructions: see /public/fonts/README.md
 *
 * === Why the magic-byte check? ===
 * Vite dev server and Vercel's SPA rewrite ("source": "/(.*)") return
 * index.html (200 OK) for any unmatched path, including missing font files.
 * Without validation, that HTML gets base64-encoded and fed to jsPDF as a
 * font, causing "Cannot read properties of undefined (reading 'Unicode')".
 * The magic check rejects any response that isn't a real TTF/OTF binary.
 */

import type jsPDF from 'jspdf';

// TTF/OTF magic numbers (first 4 bytes, big-endian uint32)
const VALID_FONT_MAGICS = new Set([
  0x00010000, // TrueType (most .ttf files)
  0x74727565, // 'true'  (Apple TrueType)
  0x4F54544F, // 'OTTO'  (OpenType CFF)
]);

// Module-level cache — loaded once per app session
let cachedRegular: string | null = null;
let cachedBold: string | null = null;
let fontSetupDone = false;

/**
 * Fetch a font file as base64.
 * Returns null if the response is not a valid TTF/OTF binary
 * (catches the SPA-fallback-HTML problem).
 */
async function fetchAsBase64(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();

    // Validate TTF magic bytes — reject HTML / any non-font response
    if (buffer.byteLength < 4) return null;
    const magic = new DataView(buffer).getUint32(0);
    if (!VALID_FONT_MAGICS.has(magic)) return null;

    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

/**
 * Register fonts into a jsPDF document instance.
 * Wrapped in try/catch so any internal jsPDF parser error
 * cannot bubble up and break PDF generation.
 */
function registerFonts(doc: jsPDF, regular: string, bold: string): boolean {
  try {
    doc.addFileToVFS('Montserrat-Regular.ttf', regular);
    doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
    doc.addFileToVFS('Montserrat-Bold.ttf', bold);
    doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
    return true;
  } catch (err) {
    console.warn('[pdfFonts] Font registration failed, falling back to helvetica:', err);
    return false;
  }
}

/**
 * Load and register Montserrat font into a jsPDF document.
 * Returns the font family name to use ('Montserrat' or 'helvetica' fallback).
 */
export async function setupPdfFonts(doc: jsPDF): Promise<string> {
  // Already loaded and cached — just register into this new doc instance
  if (fontSetupDone && cachedRegular && cachedBold) {
    return registerFonts(doc, cachedRegular, cachedBold) ? 'Montserrat' : 'helvetica';
  }

  // Previously attempted and either failed or fonts not present
  if (fontSetupDone) {
    return 'helvetica';
  }

  fontSetupDone = true; // Mark before async work to prevent duplicate fetches

  const [regular, bold] = await Promise.all([
    fetchAsBase64('/fonts/Montserrat-Regular.ttf'),
    fetchAsBase64('/fonts/Montserrat-Bold.ttf'),
  ]);

  if (!regular || !bold) {
    // Font files not present (or not valid TTFs) — silent fallback
    return 'helvetica';
  }

  if (!registerFonts(doc, regular, bold)) {
    return 'helvetica';
  }

  // Cache only after successful registration
  cachedRegular = regular;
  cachedBold = bold;

  return 'Montserrat';
}
