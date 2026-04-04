import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Free-text area with optional native datalist suggestions (pick or type).
 */
export function AreaPicker({
  id,
  value,
  onChange,
  areas = [],
  placeholder = 'Choose or type your area',
  disabled,
  className,
  'data-testid': testId,
}) {
  const listId = id ? `${id}-area-suggestions` : 'area-suggestions-default';
  const hasSuggestions = Array.isArray(areas) && areas.length > 0;

  return (
    <>
      <Input
        id={id}
        data-testid={testId}
        list={hasSuggestions ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(className)}
        autoComplete="off"
      />
      {hasSuggestions && (
        <datalist id={listId}>
          {areas.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      )}
    </>
  );
}
