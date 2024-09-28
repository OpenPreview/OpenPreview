'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@openpreview/ui/components/accordion';

const faqs = [
  {
    question: 'What is OpenPreview?',
    answer:
      'OpenPreview is an open-source collaborative toolkit for streamlined development. It provides a suite of tools for requesting and implementing changes, leaving contextual comments directly on websites, and managing projects efficiently.',
  },
  {
    question: 'How does OpenPreview streamline the development process?',
    answer:
      'OpenPreview streamlines the development process through three key features: 1) Streamlined Development Process - providing tools for easy change requests and implementations, 2) Collaborative Comments - enabling team members to leave contextual comments directly on websites, and 3) Centralized Dashboard - offering a single place to access and manage all projects, comments, and changes efficiently.',
  },
  {
    question: 'How does OpenPreview improve team communication?',
    answer:
      'OpenPreview enhances team communication by allowing team members to leave contextual comments directly on the website. This feature enables seamless and efficient communication about specific elements or areas of the project.',
  },
  {
    question: 'Can OpenPreview help manage multiple projects?',
    answer:
      'Yes, OpenPreview provides a centralized dashboard where you can access and manage all your projects, comments, and changes in one place. This feature significantly improves project management efficiency.',
  },
  {
    question: 'Is OpenPreview suitable for both small and large teams?',
    answer:
      "Absolutely! OpenPreview is designed to be scalable and can accommodate teams of all sizes. Whether you're a small startup or a large enterprise, our toolkit can adapt to your needs and streamline your development process.",
  },
];

export default function FAQ() {
  return (
    <div
      id="faq"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <h2 className="mb-8 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Frequently Asked Questions
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
