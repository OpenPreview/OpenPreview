import { createClient } from '@openpreview/db/server';
import { redirect } from 'next/navigation';
import OnboardingPage from './OnboardingPage';

export default async function Onboarding() {

  return <OnboardingPage  />;
}
