/**
 * CSV generation utilities for export functionality
 */

export interface CsvOptions {
  includeBom?: boolean; // Add UTF-8 BOM for Excel compatibility
}

/**
 * Escape a CSV field according to RFC 4180
 * - Fields containing comma, double quote, or newline must be enclosed in double quotes
 * - Double quotes within fields must be escaped with another double quote
 */
export function escapeCsvField(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }

  const stringField = String(field);

  // Check if field needs escaping
  const needsEscaping =
    stringField.includes(',') ||
    stringField.includes('"') ||
    stringField.includes('\n') ||
    stringField.includes('\r');

  if (needsEscaping) {
    // Escape double quotes and wrap in double quotes
    return `"${stringField.replaceAll('"', '""')}"`;
  }

  return stringField;
}

/**
 * Generate CSV content from headers and rows
 * @param headers - Array of header strings
 * @param rows - Array of row arrays
 * @param options - CSV generation options
 * @returns CSV string with proper line endings (CRLF)
 */
export function generateCsv(
  headers: string[],
  rows: string[][],
  options?: CsvOptions,
): string {
  const lines: string[] = [];

  // Add header row
  const headerLine = headers.map((h) => escapeCsvField(h)).join(',');
  lines.push(headerLine);

  // Add data rows
  for (const row of rows) {
    const rowLine = row.map((field) => escapeCsvField(field)).join(',');
    lines.push(rowLine);
  }

  // Join with CRLF line endings (RFC 4180)
  let csvContent = lines.join('\r\n');

  // Add BOM if requested (for Excel UTF-8 compatibility)
  if (options?.includeBom) {
    csvContent = '\uFEFF' + csvContent;
  }

  return csvContent;
}

/**
 * Generate timestamp filename for non-voters export
 * Format: YYYYMMDDHHmmss-non-voters.csv
 * Uses WIB timezone (GMT+7)
 */
export function generateTimestampFilename(): string {
  const now = new Date();

  // Add 7 hours offset for GMT+7 (WIB)
  const wibOffset = 7 * 60 * 60 * 1000;
  const utcOffset = now.getTimezoneOffset() * 60 * 1000;
  const wibTime = new Date(now.getTime() + utcOffset + wibOffset);

  const year = wibTime.getFullYear();
  const month = String(wibTime.getMonth() + 1).padStart(2, '0');
  const day = String(wibTime.getDate()).padStart(2, '0');
  const hours = String(wibTime.getHours()).padStart(2, '0');
  const minutes = String(wibTime.getMinutes()).padStart(2, '0');
  const seconds = String(wibTime.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}-non-voters.csv`;
}
