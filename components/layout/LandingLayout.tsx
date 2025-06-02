
import React from 'react';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  // This layout is now a simple wrapper. 
  // LandingPage.tsx will handle its own full-page styling, including backgrounds.
  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      {children}
    </div>
  );
};