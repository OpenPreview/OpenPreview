'use server';

import { createAdminClient } from '@openpreview/db/admin';
import { OpenPreviewSignupEmail } from '@openpreview/transactional/emails/opv-signup-email';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSignupEmail({
  email,
  name,
  password,
}: {
  email: string;
  name: string;
  password: string;
}) {
  const adminClient = createAdminClient();

  try {
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: password,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) throw error;

    const verificationLink = data.properties.action_link;

    await resend.emails.send({
      from: 'OpenPreview <noreply@openpreview.dev>',
      to: email,
      subject: 'Welcome to OpenPreview - Verify Your Email',
      react: OpenPreviewSignupEmail({ email, username: name, verificationLink }),
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Error sending signup email:', error);
    return { success: false, error: 'Failed to send signup email' };
  }
}