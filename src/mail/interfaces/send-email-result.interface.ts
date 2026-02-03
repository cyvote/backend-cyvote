export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  attempts: number;
  error?: Error;
}
