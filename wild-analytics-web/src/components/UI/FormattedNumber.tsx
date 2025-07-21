import React from 'react';

interface FormattedNumberProps {
  value: number;
  suffix?: string;
  className?: string;
}

const FormattedNumber: React.FC<FormattedNumberProps> = ({ value, suffix = '', className = '' }) => {
  const formattedValue = new Intl.NumberFormat('ru-RU').format(value);
  
  return (
    <span className={className}>
      {formattedValue}{suffix ? ` ${suffix}` : ''}
    </span>
  );
};

export default FormattedNumber; 