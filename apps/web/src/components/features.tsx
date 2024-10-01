'use client';

import DotPattern from '@openpreview/ui/components/dot-pattern';
import { cn } from '@openpreview/ui/lib/utils';
import createGlobe from 'cobe';
import Image from 'next/image';
import React, { useEffect, useRef } from 'react';

export default function Features() {
  const features = [
    {
      title: 'Streamlined Development Process',
      description:
        'Speed up your workflow with easy-to-use tools for requesting and implementing changes.',
      skeleton: <SkeletonOne />,
      className: 'col-span-1 lg:col-span-4 border-b lg:border-r border-border',
    },
    {
      title: 'Collaborative Comments',
      description:
        'Leave contextual comments directly on the website for seamless team communication.',
      skeleton: <SkeletonTwo />,
      className: 'border-b col-span-1 lg:col-span-2 border-border',
    },
    {
      title: 'Centralized Dashboard',
      description:
        'Access all your projects, comments, and changes in one place for efficient management.',
      skeleton: <SkeletonFour />,
      className: 'col-span-1 lg:col-span-6 border-b lg:border-none',
    },
  ];

  return (
    <div
      id="features"
      className="relative z-20 mx-auto max-w-7xl py-10 lg:py-20"
    >
      <div className="px-8">
        <h4 className="text-foreground mx-auto max-w-5xl text-center text-3xl font-medium tracking-tight lg:text-5xl lg:leading-tight">
          OpenPreview: Your Collaborative Toolkit
        </h4>
        <p className="text-muted-foreground mx-auto my-4 max-w-2xl text-center text-sm font-normal lg:text-base">
          An open-source toolbar for streamlined development, collaborative
          comments, and efficient project management—all in one place.
        </p>
      </div>
      <div className="relative">
        <div className="border-border mt-12 grid grid-cols-1 rounded-md lg:grid-cols-6 xl:border">
          {features.map(feature => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className="h-full w-full">{feature.skeleton}</div>
              {feature.title === 'Centralized Dashboard' && (
                <DotPattern
                  className="absolute inset-0 -z-10 h-full w-full opacity-50"
                  width={20}
                  height={20}
                  cx={1}
                  cy={1}
                  cr={1}
                />
              )}
            </FeatureCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(`relative overflow-hidden p-4 sm:p-8`, className)}>
      {children}
    </div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="text-foreground mx-auto max-w-5xl text-left text-xl tracking-tight md:text-2xl md:leading-snug">
      {children}
    </p>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="text-muted-foreground mx-0 my-2 max-w-sm text-left text-sm font-normal md:text-sm">
      {children}
    </p>
  );
};

const SkeletonOne = () => {
  return (
    <div className="relative flex h-full gap-10 px-2 py-8">
      <div className="shadow-left group mx-auto h-full w-full shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]">
        <div className="flex h-full w-full flex-1 flex-col space-y-2">
          <Image
            src="https://investa.so/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FJournalDash.9a943d64.png&w=3840&q=75"
            alt="Streamlined Development Process"
            width={800}
            height={800}
            className="aspect-square h-full w-full rounded-sm object-cover object-left-top"
          />
        </div>
      </div>
    </div>
  );
};

const SkeletonTwo = () => {
  return (
    <div className="relative flex h-full flex-col items-start gap-4 overflow-hidden p-8">
      <div className="flex w-full flex-col space-y-6">
        {[1, 2, 3].map((_, idx) => (
          <div
            key={idx}
            className="flex items-start space-x-4 rounded-lg bg-gray-100 p-4 shadow-md dark:bg-gray-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
              {String.fromCharCode(65 + idx)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 self-end">
        <div className="flex h-10 w-32 items-center justify-center rounded-full bg-blue-500 font-semibold text-white">
          Add Comment
        </div>
      </div>
    </div>
  );
};

const SkeletonFour = () => {
  return (
    <div className="relative mt-10 flex h-60 flex-col items-center bg-transparent md:h-60">
      <Globe className="absolute -bottom-80 -right-10 md:-bottom-72 md:-right-10" />
    </div>
  );
};
const Globe = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.05, 0.05, 0.2], // Navy blue
      markerColor: [0.1, 0.8, 1],
      glowColor: [1, 1, 1],
      markers: [
        // Default markers without user location
        { location: [37.7595, -122.4367], size: 0.03 }, // San Francisco
        { location: [40.7128, -74.006], size: 0.03 }, // New York
        { location: [51.5074, -0.1278], size: 0.03 }, // London
        { location: [35.6762, 139.6503], size: 0.03 }, // Tokyo
      ],
      onRender: state => {
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600, maxWidth: '100%', aspectRatio: 1 }}
      className={className}
    />
  );
};
