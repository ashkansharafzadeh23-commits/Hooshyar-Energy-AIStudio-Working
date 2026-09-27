import React from 'react';

interface ResponsiveDataViewProps {
  desktopView: React.ReactNode;
  mobileView: React.ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ResponsiveDataView: React.FC<ResponsiveDataViewProps> = ({
  desktopView,
  mobileView,
  breakpoint = 'md',
  className = ''
}) => {
  const desktopClasses = {
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block'
  }[breakpoint];

  const mobileClasses = {
    sm: 'block sm:hidden',
    md: 'block md:hidden',
    lg: 'block lg:hidden',
    xl: 'block xl:hidden'
  }[breakpoint];

  return (
    <div className={`w-full ${className}`}>
      <div className={desktopClasses}>{desktopView}</div>
      <div className={mobileClasses}>{mobileView}</div>
    </div>
  );
};

export default ResponsiveDataView;
