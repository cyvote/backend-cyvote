export type AuditLogConfig = {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  consoleEnabled: boolean;
  fileEnabled: boolean;
  filePath: string;
  maxFiles: string;
  maxSize: string;
  databaseEnabled: boolean;
};
