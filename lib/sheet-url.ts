/** Spreadsheet IDs are the 40-odd char slug in /spreadsheets/d/<id>/edit. */
const URL_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const BARE_ID_PATTERN = /^[a-zA-Z0-9-_]{20,}$/;

/**
 * Accepts a full Google Sheets URL or a bare spreadsheet ID and returns the ID.
 * Returns null when the input is neither.
 */
export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(URL_PATTERN);
  if (fromUrl) return fromUrl[1];

  if (BARE_ID_PATTERN.test(trimmed)) return trimmed;

  return null;
}
