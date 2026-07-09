import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, error }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Autofocus first input on mount
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const otpArray = value.split('');
    // Handle multiple digits (pasted content)
    if (val.length > 1) {
      const pastedData = val.slice(0, 6).split('');
      const updatedValue = Array.from({ length: 6 }, (_, i) => pastedData[i] || '').join('');
      onChange(updatedValue);
      // Focus last filled box
      const nextFocusIndex = Math.min(pastedData.length, 5);
      inputsRef.current[nextFocusIndex]?.focus();
      return;
    }

    otpArray[index] = val;
    const newValue = otpArray.join('');
    onChange(newValue);

    // Focus next box
    if (index < 5 && val) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const otpArray = value.split('');
      if (!otpArray[index] && index > 0) {
        // If current box is empty, delete previous and focus previous
        otpArray[index - 1] = '';
        onChange(otpArray.join(''));
        inputsRef.current[index - 1]?.focus();
      } else {
        // Delete current
        otpArray[index] = '';
        onChange(otpArray.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText.length > 0) {
      const filledText = Array.from({ length: 6 }, (_, i) => pastedText[i] || '').join('');
      onChange(filledText);
      const nextFocusIndex = Math.min(pastedText.length, 5);
      inputsRef.current[nextFocusIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2 max-w-sm mx-auto">
      {Array.from({ length: 6 }).map((_, index) => {
        const char = value[index] || '';
        return (
          <input
            key={index}
            ref={(el) => { inputsRef.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6} // allow larger paste but input is limited
            value={char}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            className={`w-12 h-14 bg-navy-50/50 dark:bg-slate-900 border text-center text-xl font-black rounded-xl focus:outline-none transition-all duration-150 ${
              error
                ? 'border-red-500 text-red-500 focus:border-red-500'
                : 'border-navy-100 dark:border-slate-800 text-navy-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
            }`}
          />
        );
      })}
    </div>
  );
};
