import React from 'react';

interface LogoProps {
  customLogoPath?: string;
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ customLogoPath, size = 22, className = '' }) => {
  const logoSrc = customLogoPath || '/cscode.png';

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={logoSrc}
        alt="Crafted Studio Code Logo"
        style={{ width: size, height: size }}
        className="object-contain rounded-md transition-transform duration-300 hover:scale-105"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    </div>
  );
};
