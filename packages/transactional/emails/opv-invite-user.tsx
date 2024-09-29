import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface OpenPreviewInviteUserEmailProps {
  username: string;
  userImage: string;
  invitedByUsername: string;
  invitedByEmail: string;
  teamName: string;
  role: string;
  teamImage: string;
  inviteLink: string;
  inviteFromIp: string;
  inviteFromLocation: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}`
  : '';

export const OpenPreviewInviteUserEmail = ({
  username = 'Jane Doe',
  userImage = `${baseUrl}/static/OpenPreview-user.png`,
  invitedByUsername = 'John Doe',
  invitedByEmail = 'john.doe@example.com',
  teamName = 'My Project',
  role = 'Viewer',
  teamImage = `${baseUrl}/static/OpenPreview-team.png`,
  inviteLink = 'https://OpenPreview.dev/teams/invite/foo',
  inviteFromIp = '204.13.186.218',
  inviteFromLocation = 'São Paulo, Brazil',
}: OpenPreviewInviteUserEmailProps) => {
  const previewText = `Join ${invitedByUsername} on OpenPreview`;

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
              Join <strong>{teamName}</strong> on <strong>OpenPreview</strong>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-[#222f5a]">
              Hello {username},
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#222f5a]">
              <strong>{invitedByUsername}</strong> (
              <Link
                href={`mailto:${invitedByEmail}`}
                className="text-blue-600 no-underline"
              >
                {invitedByEmail}
              </Link>
              ) has invited you to the <strong>{teamName}</strong> team on{' '}
              <strong>OpenPreview</strong> as <strong>{role}</strong>.
            </Text>
            <Section>
              <Row>
                <Column align="right">
                  <Img
                    className="rounded-full border-2 border-solid border-[#eaeaea]"
                    src={userImage}
                    width="64"
                    height="64"
                  />
                </Column>
                <Column align="center">
                  <Img
                    src={`${baseUrl}/static/openpreview-arrow.png`}
                    width="12"
                    height="9"
                    alt="invited you to"
                  />
                </Column>
                <Column align="left">
                  <Img
                    className="rounded-full border-2 border-solid border-[#eaeaea]"
                    src={teamImage}
                    width="64"
                    height="64"
                  />
                </Column>
              </Row>
            </Section>
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-[#222f5a] px-4 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={inviteLink}
              >
                Join the team
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-[#222f5a]">
              or copy and paste this URL into your browser:{' '}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This invitation was intended for{' '}
              <span className="text-[#222f5a]">{username} </span>.This invite
              was sent from{' '}
              <span className="text-[#222f5a]">{inviteFromIp}</span> located in{' '}
              <span className="text-[#222f5a]">{inviteFromLocation}</span>. If
              you were not expecting this invitation, you can ignore this email.
              If you are concerned about your account's safety, please reply to
              this email to get in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OpenPreviewInviteUserEmail;
