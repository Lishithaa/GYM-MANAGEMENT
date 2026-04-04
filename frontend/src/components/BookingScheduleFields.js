import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SELECT_CLASS =
  'flex h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function TimeRow({ label, namePrefix, idPrefix }) {
  return (
    <div>
      <span className="text-sm font-medium leading-none">{label}</span>
      <div className="flex gap-2 items-center mt-2">
        <select name={`${namePrefix}_h`} className={SELECT_CLASS} defaultValue="" id={`${idPrefix}_h`} aria-label={`${label} hour`}>
          <option value="">Hour</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-zinc-500 shrink-0">:</span>
        <select name={`${namePrefix}_m`} className={SELECT_CLASS} defaultValue="" id={`${idPrefix}_m`} aria-label={`${label} minute`}>
          <option value="">Min</option>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Safari often does not commit native type="date" / type="time" values for FormData inside dialogs.
 * Plain text date + select-based times work reliably.
 */
export function BookingScheduleFields({ dateInputId = 'booking-date', dateTestId = 'booking-date-input' }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <>
      <div>
        <Label htmlFor={dateInputId}>Date</Label>
        <Input
          id={dateInputId}
          name="date"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="YYYY-MM-DD"
          defaultValue={today}
          className="mt-1 font-mono"
          data-testid={dateTestId}
        />
        <p className="text-xs text-zinc-500 mt-1">Format: year-month-day (e.g. 2026-04-05)</p>
      </div>
      <TimeRow label="Start time (24h)" namePrefix="start" idPrefix="booking-start" />
      <TimeRow label="End time (24h)" namePrefix="end" idPrefix="booking-end" />
    </>
  );
}

export function parseBookingScheduleForm(form) {
  const fd = new FormData(form);
  const date = String(fd.get('date') ?? '').trim();
  const sh = fd.get('start_h');
  const sm = fd.get('start_m');
  const eh = fd.get('end_h');
  const em = fd.get('end_m');

  const missing =
    !date ||
    sh === null ||
    sh === '' ||
    sm === null ||
    sm === '' ||
    eh === null ||
    eh === '' ||
    em === null ||
    em === '';

  if (missing) {
    return { error: 'Please fill all booking details' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Date must be YYYY-MM-DD (e.g. 2026-04-05)' };
  }

  return {
    date,
    start_time: `${sh}:${sm}`,
    end_time: `${eh}:${em}`,
  };
}
