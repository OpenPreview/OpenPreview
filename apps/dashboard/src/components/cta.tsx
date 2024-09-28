'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CTA() {
  return (
    <div className="relative z-20 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-primary overflow-hidden rounded-lg shadow-xl"
      >
        <div className="px-6 py-12 sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-primary-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-white">Try OpenPreview today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                href="#"
                className="text-primary rounded-md bg-white px-6 py-3 font-bold transition duration-150 ease-in-out hover:bg-opacity-90"
              >
                Get started
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                href="#"
                className="bg-primary-foreground text-primary rounded-md px-6 py-3 font-bold transition duration-150 ease-in-out hover:bg-opacity-90"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
