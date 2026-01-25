import React from 'react';

export interface SpatialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * SpatialButton - Physical 3D button with "press-down" interaction
 *
 * Features:
 * - Subtle inner shadow for 3D edge effect
 * - Scale(0.98) + inset shadow on :active for pressed feel
 * - 0.1s transition for snappy feedback
 */
export const SpatialButton: React.FC<SpatialButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled = false,
  ...props
}) => {
  // Base classes (shared by all variants)
  const baseClasses = `
    relative
    inline-flex items-center justify-center
    font-medium
    rounded-button
    transition-all duration-100
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
  `.trim().replace(/\s+/g, ' ');

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant styles with 3D effects
  const variantClasses = {
    primary: `
      bg-brand text-white
      shadow-[0_1px_0_0_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1)]
      hover:bg-brand-dark hover:shadow-hover
      focus:ring-brand-light
      active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)]
    `.trim().replace(/\s+/g, ' '),

    secondary: `
      bg-surface border border-gray-300 text-text-primary
      shadow-[0_1px_0_0_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.8)]
      hover:bg-gray-50 hover:border-gray-400 hover:shadow-hover
      focus:ring-brand-light
      active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.1)]
    `.trim().replace(/\s+/g, ' '),

    ghost: `
      bg-transparent text-text-secondary
      hover:bg-surface-inset hover:text-text-primary
      focus:ring-brand-light
      active:bg-gray-200
    `.trim().replace(/\s+/g, ' '),

    danger: `
      bg-red-600 text-white
      shadow-[0_1px_0_0_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1)]
      hover:bg-red-700 hover:shadow-hover
      focus:ring-red-300
      active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)]
    `.trim().replace(/\s+/g, ' '),
  };

  const combinedClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={combinedClasses}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
