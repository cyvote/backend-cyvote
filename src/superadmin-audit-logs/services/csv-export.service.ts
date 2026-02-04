import { Injectable } from '@nestjs/common';
import { AuditLog } from '../../audit-log/domain/audit-log';

@Injectable()
export class CsvExportService {
  /**
   * Generate CSV content from audit logs
   * @param logs Array of audit log entries
   * @returns CSV string with headers and data rows
   */
  generateCsvContent(logs: AuditLog[]): string {
    // Define CSV headers
    const headers = [
      'ID',
      'Actor ID',
      'Actor Type',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Status',
      'Message',
      'Details',
      'Created At',
    ];

    // Build header row
    const headerRow = headers.join(',');

    // Build data rows
    const dataRows = logs.map((log) => {
      return [
        this.escapeCsvValue(log.id),
        this.escapeCsvValue(log.actorId),
        this.escapeCsvValue(log.actorType),
        this.escapeCsvValue(log.action),
        this.escapeCsvValue(log.resourceType),
        this.escapeCsvValue(log.resourceId),
        this.escapeCsvValue(log.ipAddress),
        this.escapeCsvValue(log.userAgent),
        this.escapeCsvValue(log.status),
        this.escapeCsvValue(log.message),
        this.escapeCsvValue(log.details),
        this.escapeCsvValue(log.createdAt),
      ].join(',');
    });

    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Escape CSV value to handle special characters
   * @param value Any value to be escaped for CSV
   * @returns Escaped string value suitable for CSV
   */
  private escapeCsvValue(value: any): string {
    // Handle null or undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle objects (like details field)
    if (typeof value === 'object') {
      // Convert to JSON string and escape it
      const jsonString = JSON.stringify(value);
      return this.escapeString(jsonString);
    }

    // Handle other types by converting to string
    const stringValue = String(value);
    return this.escapeString(stringValue);
  }

  /**
   * Escape string for CSV format
   * Wraps in quotes if contains comma, quote, or newline
   * Doubles any quotes inside the string
   * @param str String to escape
   * @returns Escaped string
   */
  private escapeString(str: string): string {
    // Check if string needs escaping
    const needsEscaping =
      str.includes(',') || str.includes('"') || str.includes('\n');

    if (!needsEscaping) {
      return str;
    }

    // Double any quotes
    const escapedQuotes = str.replaceAll('"', '""');

    // Wrap in quotes
    return `"${escapedQuotes}"`;
  }

  /**
   * Generate filename for CSV export
   * @returns Filename with timestamp
   */
  generateFilename(): string {
    const timestamp = new Date()
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-');
    return `audit-logs-${timestamp}.csv`;
  }
}
