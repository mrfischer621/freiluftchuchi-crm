import React, { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

export interface GhostInputProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  variant?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  disabled?: boolean;
}

/**
 * GhostInput - Inline editing component that transforms from text to input
 *
 * States:
 * - Idle: Looks like normal text (h2/p), no border/background
 * - Hover: Subtle gray background (rounded)
 * - Focus: Electric border-ring + white background
 *
 * Interaction:
 * - Enter to save
 * - Escape to cancel
 * - Auto-focus on click
 */
export const GhostInput: React.FC<GhostInputProps> = ({
  value,
  onSave,
  placeholder = 'Click to edit...',
  variant = 'p',
  className = '',
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal value with prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (internalValue.trim() !== value) {
      onSave(internalValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInternalValue(value); // Reset to original
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  // Typography mapping for text variants
  const typographyClasses = {
    h1: 'text-4xl font-semibold tracking-tighter',
    h2: 'text-3xl font-semibold tracking-tighter',
    h3: 'text-2xl font-semibold tracking-tighter',
    p: 'text-base font-normal',
  };

  // Idle/Hover state (appears as text)
  if (!isEditing) {
    return (
      <div
        className={`
          inline-block
          ${typographyClasses[variant]}
          ${isHovered && !disabled ? 'bg-surface-inset' : 'bg-transparent'}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text'}
          text-text-primary
          px-2 py-1
          rounded-input
          transition-all duration-150
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        onClick={() => !disabled && setIsEditing(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {value || <span className="text-text-tertiary">{placeholder}</span>}
      </div>
    );
  }

  // Focus state (transforms into input field)
  return (
    <input
      ref={inputRef}
      type="text"
      value={internalValue}
      onChange={(e) => setInternalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      disabled={disabled}
      className={`
        inline-block
        ${typographyClasses[variant]}
        bg-surface
        text-text-primary
        px-2 py-1
        rounded-input
        border-2 border-brand
        ring-4 ring-brand-light/30
        outline-none
        transition-all duration-150
        min-w-[120px]
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      placeholder={placeholder}
    />
  );
};
