import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface OpenPreviewSignupEmailProps {
  email: string;
  username: string;
  verificationLink: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}`
  : '';

export const OpenPreviewSignupEmail = ({
  email,
  username = 'New User',
  verificationLink = 'https://OpenPreview.dev/verify-email',
}: OpenPreviewSignupEmailProps) => {
  const previewText = `Welcome to OpenPreview! Please verify your email.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/static/openpreview-logo.png`}
                width="40"
                height="37"
                alt="OpenPreview"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#222f5a]">
              Welcome to <strong>OpenPreview</strong>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-[#222f5a]">
              Hello {username},
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#222f5a]">
              Thank you for signing up for OpenPreview. We're excited to have
              you on board!
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#222f5a]">
              To get started, please verify your email address by clicking the
              button below:
            </Text>
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-[#222f5a] px-4 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={verificationLink}
              >
                Verify Email Address
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-[#222f5a]">
              Or copy and paste this URL into your browser:{' '}
              <Link
                href={verificationLink}
                className="text-blue-600 no-underline"
              >
                {verificationLink}
              </Link>
            </Text>
            <Text className="mt-[32px] text-[12px] leading-[24px] text-[#666666]">
              If you have any questions or need assistance, please don't
              hesitate to contact our support team.
            </Text>
            <Text className="mt-[32px] text-center text-[10px] leading-[16px] text-[#888888]">
              This email was intended for {email}. If you did not sign up for
              OpenPreview, please ignore this email or contact us at{' '}
              <Link
                href="mailto:support@openpreview.dev"
                className="text-blue-600 no-underline"
              >
                support@openpreview.dev
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OpenPreviewSignupEmail;
