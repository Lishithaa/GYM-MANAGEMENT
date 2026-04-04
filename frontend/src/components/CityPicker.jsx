import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Searchable city picker with "Popular cities" and a footer to type any city not in the list.
 */
export function CityPicker({
  value,
  onChange,
  cities = [],
  popular = [],
  /** e.g. [{ value: '_all', label: 'All cities' }] — shown above search results */
  topChoices,
  placeholder = 'Select city',
  /** Shown on the trigger when `value` is empty (e.g. “All cities” for browse filters). */
  emptySelectionLabel,
  disabled,
  triggerClassName,
  id,
  'data-testid': testId,
}) {
  const [open, setOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState('');

  const popularSet = useMemo(() => new Set(popular), [popular]);
  const popularInList = useMemo(
    () => (popular || []).filter((c) => cities.includes(c)),
    [popular, cities]
  );
  const restCities = useMemo(() => cities.filter((c) => !popularSet.has(c)), [cities, popularSet]);

  const applyCity = (city) => {
    const t = String(city || '').trim();
    if (!t) return;
    onChange(t);
    setOpen(false);
    setCustomDraft('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCustomDraft('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          data-testid={testId}
          disabled={disabled}
          aria-expanded={open}
          className={cn('h-10 w-full justify-between font-normal', triggerClassName)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            <span className="truncate">{value ? value : emptySelectionLabel || placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,360px)] max-h-[min(85vh,520px)] flex flex-col overflow-hidden p-0"
        align="start"
        sideOffset={6}
        collisionPadding={16}
      >
        <Command shouldFilter className="flex max-h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
          <CommandInput placeholder="Search your city" className="shrink-0 border-b" />
          {/* Above the scroll list so it is never hidden below a long “Popular / More cities” scroll (dialogs + Safari). */}
          <div className="shrink-0 space-y-2 border-b bg-zinc-100 p-3 dark:bg-zinc-800/80">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Other city</p>
            <p className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
              Not in the list? Type here, then Use or Enter.
            </p>
            <div className="flex gap-2">
              <Input
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder="e.g. Ongole, Vizag"
                className="h-9 bg-white dark:bg-zinc-950"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    applyCity(customDraft);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                type="button"
                variant="secondary"
                className="h-9 shrink-0 px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  applyCity(customDraft);
                }}
              >
                Use
              </Button>
            </div>
          </div>
          <CommandList className="max-h-[min(40vh,260px)] flex-1 overflow-y-auto overflow-x-hidden">
            <CommandEmpty>No city found in list — use Other city above.</CommandEmpty>
            {Array.isArray(topChoices) && topChoices.length > 0 && (
              <CommandGroup heading="Filter">
                {topChoices.map(({ value: v, label }) => (
                  <CommandItem
                    key={v}
                    value={label}
                    onSelect={() => {
                      onChange(v);
                      setOpen(false);
                      setCustomDraft('');
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === v ? 'opacity-100' : 'opacity-0')} />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {popularInList.length > 0 && (
              <CommandGroup heading="Popular cities">
                {popularInList.map((city) => (
                  <CommandItem key={`p-${city}`} value={city} onSelect={() => applyCity(city)}>
                    <Check className={cn('mr-2 h-4 w-4', value === city ? 'opacity-100' : 'opacity-0')} />
                    {city}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading={popularInList.length ? 'More cities' : 'Cities'}>
              {restCities.map((city) => (
                <CommandItem key={city} value={city} onSelect={() => applyCity(city)}>
                  <Check className={cn('mr-2 h-4 w-4', value === city ? 'opacity-100' : 'opacity-0')} />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
