import { Resend } from 'resend';
import OpenPreviewSignupEmail from '@openpreview/transactional/emails/opv-signup-email';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendSignupEmailParams {
  email: string;
  name: string;
  verificationToken: string;
}

export async function sendSignupEmail({ email, name, verificationToken }: SendSignupEmailParams) {
  const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

  try {
    await resend.emails.send({
      from: 'OpenPreview <noreply@openpreview.dev>',
      to: email,
      subject: 'Welcome to OpenPreview - Verify Your Email',
      react: OpenPreviewSignupEmail({ username: name, verificationLink }),
    });
  } catch (error) {
    console.error('Error sending signup email:', error);
    // You might want to handle this error, perhaps by showing a toast to the user
  }
}