import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
  setError?: (error: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, error, setError }) => {
  const formatPhoneNumber = (digits: string) => {
    if (digits.length <= 5) {
      return digits;
    }
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    
    let isValid = false;
    let errMessage = '';

    if (cleaned.length > 0) {
      const firstDigit = cleaned[0];
      if (!['6', '7', '8', '9'].includes(firstDigit)) {
        errMessage = 'First digit must be 6, 7, 8, or 9.';
      } else if (cleaned.length < 10) {
        errMessage = 'Please enter a valid Indian mobile number.';
      } else {
        isValid = true;
      }
    }

    if (setError) {
      setError(errMessage);
    }
    onChange(cleaned, isValid);
  };

  const displayValue = formatPhoneNumber(value);

  return (
    <div className="space-y-1">
      <div className="relative flex items-center">
        {/* Country Code Prefix */}
        <div className="absolute left-3 flex items-center space-x-1.5 text-sm font-bold text-navy-800 dark:text-slate-100 border-r border-navy-100 dark:border-slate-700 pr-2.5 h-6 pointer-events-none">
          <span className="text-base leading-none">🇮🇳</span>
          <span>+91</span>
        </div>
        <input
          type="text"
          value={displayValue}
          onChange={handleTextChange}
          placeholder="98765 43210"
          className={`w-full bg-navy-50/50 dark:bg-transparent border ${
            error ? 'border-red-500 focus:border-red-500' : 'border-navy-100 dark:border-slate-700 focus:border-brand-500'
          } rounded-xl py-2.5 pl-20 pr-4 text-sm font-bold tracking-wider text-navy-850 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all duration-200`}
        />
      </div>
      {error && (
        <p className="text-[10px] font-bold text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};
