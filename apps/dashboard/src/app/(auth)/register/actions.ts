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
    const token_hash = data.properties.hashed_token;
    const verificationLink = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/onboarding`);
    verificationLink.searchParams.append('token_hash', token_hash)
    verificationLink.searchParams.append('type','magiclink')

    const result = await resend.emails.send({
      from: 'OpenPreview <noreply@openpreview.dev>',
      to: email,
      subject: 'Welcome to OpenPreview - Verify Your Email',
      react: OpenPreviewSignupEmail({ email, username: name, verificationLink: verificationLink.toString() }),
    });

    console.log(result);

    if (result.error) throw result.error;

    if (!result.data) throw new Error('No data returned from Resend');

    return { success: true, error: null };
  } catch (error) {
    console.error('Error sending signup email:', error);
    return { success: false, error: 'Failed to send signup email' };
  }
}