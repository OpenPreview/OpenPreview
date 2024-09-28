'use client';

import { motion } from 'framer-motion';

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    features: [
      'Live Website Previews',
      '1 project',
      '1 subdomain',
      'Single user access',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Basic',
    price: '$5',
    features: [
      'Live Website Previews',
      '3 projects',
      '5 subdomains per project',
      'Collaborative access',
      '$3 per additional member',
    ],
    cta: 'Upgrade to Basic',
  },
  {
    name: 'Pro',
    price: '$10',
    features: [
      'Live Website Previews',
      'Unlimited projects',
      'Unlimited subdomains',
      'Collaborative access',
      '2 team members included',
      '$2 per additional member',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <div
      id="pricing"
      className="relative z-20 mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-20"
    >
      <h4 className="mx-auto max-w-5xl text-3xl font-medium tracking-tight text-black lg:text-4xl lg:leading-tight dark:text-white">
        Pricing plans for teams of all sizes
      </h4>
      <p className="text-muted-foreground mt-4 max-w-2xl text-xl">
        Choose an affordable plan that's packed with the best features for
        engaging your audience, creating customer loyalty, and driving sales.
      </p>

      <div className="mt-8 space-y-4 sm:mt-12 sm:grid sm:grid-cols-1 sm:gap-6 sm:space-y-0 md:grid-cols-3">
        {pricingPlans.map((plan, index) => (
          <motion.div
            key={plan.name}
            className={`flex flex-col overflow-hidden rounded-lg shadow-lg ${
              plan.highlighted
                ? 'border-primary border-2'
                : 'border-border border'
            }`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="bg-card px-5 py-6 sm:p-7 sm:pb-5">
              <h3 className="bg-primary/10 text-primary inline-flex rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide">
                {plan.name}
              </h3>
              <div className="mt-3 flex items-baseline text-5xl font-extrabold">
                {plan.price}
                <span className="text-muted-foreground ml-1 text-2xl font-medium">
                  /mo
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-lg">
                Billed annually
              </p>
            </div>
            <div className="bg-accent flex flex-1 flex-col justify-between space-y-4 px-5 pb-6 pt-4 sm:p-7 sm:pt-5">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="text-primary h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-card-foreground ml-2 text-base">
                      {feature}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="rounded-md shadow">
                <a
                  href="#"
                  className={`border-primary flex items-center justify-center rounded-md border px-5 py-2 text-base font-medium ${
                    plan.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
