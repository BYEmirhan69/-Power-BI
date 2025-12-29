// Email service exports
export {
  emailService,
  sendEmail as sendEmailHelpers,
  type EmailTemplate,
  type SendEmailOptions,
  type EmailPreferences,
  type EmailQueueItem,
  type EmailStatus,
} from "./email-service";

// Resend client exports
export {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  type EmailOptions,
  type EmailResult,
} from "./resend-client";

// Verification email exports
export { sendVerificationEmail } from "./verification-email";
