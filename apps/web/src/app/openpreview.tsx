'use client';
import Script from 'next/script';

export default function OPVScript() {
  return (
    <Script
      src={`${process.env.NEXT_PUBLIC_CDN_URL}/opv2.js`}
      data-project-id={'ff2a25b3-cef8-46a1-8497-999a0ab2760f'}
      onReady={() => {
        console.log('test');
      }}
    />
  );
}
