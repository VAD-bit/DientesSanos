import React, { useState, useEffect } from 'react';
import { isoToDisplay, formatBirthDateInput } from '../utils/dateTime';

export default function DateMaskInput({ value, onChange, placeholder = "DD/MM/AAAA", style, className }) {
  const [displayValue, setDisplayValue] = useState('');

  // Sync incoming ISO value to display format
  useEffect(() => {
    // If the value is a valid ISO date (YYYY-MM-DD), display it as DD/MM/YYYY
    if (value && value.includes('-')) {
      setDisplayValue(isoToDisplay(value));
    } else if (!value) {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    // Allow deleting past the slashes correctly
    if (raw.length < displayValue.length && displayValue.endsWith('/')) {
      const newDisplay = raw.slice(0, -1); // Remove the slash and the number before it? No, just slice
      const { display, iso } = formatBirthDateInput(newDisplay);
      setDisplayValue(display);
      onChange(iso || display); // send ISO if valid, otherwise send the partial display string so they can keep typing
    } else {
      const { display, iso } = formatBirthDateInput(raw);
      setDisplayValue(display);
      
      // If valid ISO (all 8 digits entered), send it up. Otherwise send the display string
      // so the parent can hold it in state and know the field is not complete yet.
      // Or we can just send the ISO only if complete, and empty string if incomplete.
      // It depends on the parent component's validation. Usually, we want to send the ISO 
      // if valid, and the display string if invalid so that the parent can re-render us
      // if it strictly controls the value.
      onChange(iso || display);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className || "form-input"}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      style={style}
    />
  );
}
