'use client';

import { Button } from '@ui/components/button';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { sampleArcs } from './default';

const World = dynamic(() => import('@ui/components/globe').then(m => m.World), {
  ssr: false,
});

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const globeConfig = {
    pointSize: 4,
    globeColor: '#062056',
    showAtmosphere: true,
    atmosphereColor: '#FFFFFF',
    atmosphereAltitude: 0.1,
    emissive: '#062056',
    emissiveIntensity: 0.1,
    shininess: 0.9,
    polygonColor: 'rgba(255,255,255,0.7)',
    ambientLight: '#38bdf8',
    directionalLeftLight: '#ffffff',
    directionalTopLight: '#ffffff',
    pointLight: '#ffffff',
    arcTime: 1000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    initialPosition: { lat: 22.3193, lng: 114.1694 },
    autoRotate: true,
    autoRotateSpeed: 0.5,
  };

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-8">
      <div className="w-full max-w-xl px-4 text-center">
        <h1 className="text-foreground mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          OpenPreview
        </h1>
        <p className="text-muted-foreground mx-auto mb-6 max-w-md text-lg">
          OpenPreview is a powerful preview domain toolbar for websites. Add
          comments and collaborate directly on your web pages.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </div>
      <div className="relative h-[400px] w-full max-w-5xl md:h-[600px]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-40 w-full select-none" />
        {mounted && (
          <div className="absolute inset-0 z-10">
            <World data={sampleArcs} globeConfig={globeConfig} />
          </div>
        )}
      </div>
    </div>
  );
}
