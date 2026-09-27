import React, { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'default' | 'wide' | 'narrow' | 'full';
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'default',
  className = ''
}) => {
  const maxWClass = {
    default: 'max-w-7xl',
    wide: 'max-w-[1440px]',
    narrow: 'max-w-4xl',
    full: 'w-full'
  }[maxWidth];

  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8 ${maxWClass} ${className}`}>
      {children}
    </div>
  );
};
