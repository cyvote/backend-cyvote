export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}
