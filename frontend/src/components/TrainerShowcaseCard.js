import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const PHOTO_FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect fill="#d4d4d8" width="128" height="128"/><circle cx="64" cy="52" r="18" fill="#a1a1aa"/><ellipse cx="64" cy="102" rx="36" ry="28" fill="#a1a1aa"/></svg>'
  );

/**
 * Portrait showcase card (teal panel, hero crop, name + credentials + pill).
 * Matches “coach gallery” style; PNGs with transparency blend into the teal panel.
 */
export function TrainerShowcaseCard({
  trainer,
  onClick,
  variant = 'grid',
  className,
  'data-testid': testId
}) {
  const branded = trainer.photo_branding_enabled !== false;
  const displayName = trainer.trainer_name || trainer.specialty || 'Trainer';
  const credentials =
    [trainer.experience_brief, trainer.certifications].filter(Boolean).join(' · ') ||
    `${trainer.specialty || 'Fitness'} specialist`;

  const badge =
    trainer.reviews_count > 0
      ? `${trainer.reviews_count}+ REVIEWS`
      : trainer.rating > 0
        ? `${Number(trainer.rating).toFixed(1)} ★ RATING`
        : 'NEW TRAINER';

  const [imgFailed, setImgFailed] = useState(false);
  const src = imgFailed ? PHOTO_FALLBACK : trainer.photo;

  const zoneHeights =
    variant === 'hero'
      ? 'min-h-[min(72vh,520px)] sm:min-h-[440px]'
      : variant === 'compact'
        ? 'min-h-[220px]'
        : 'min-h-[300px]';

  const titleSize =
    variant === 'hero' ? 'text-4xl sm:text-5xl' : variant === 'compact' ? 'text-xl' : 'text-2xl sm:text-3xl';

  const subtitleSize = variant === 'compact' ? 'text-xs' : variant === 'hero' ? 'text-base sm:text-lg' : 'text-sm';

  if (!branded) {
    return (
      <article
        onClick={onClick}
        onKeyDown={(e) => onClick && e.key === 'Enter' && onClick(e)}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        data-testid={testId}
        className={cn(
          'rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left w-full',
          onClick && 'cursor-pointer',
          className
        )}
      >
        <img
          src={src}
          alt=""
          className={cn('w-full object-cover', variant === 'compact' ? 'h-40' : 'h-52')}
          onError={() => setImgFailed(true)}
        />
        <div className="p-4">
          <h3 className="font-bold text-lg text-zinc-900 font-['Outfit']">{displayName}</h3>
          <p className="text-sm text-zinc-600 line-clamp-2 mt-1">{credentials}</p>
          {trainer.hourly_rate != null && (
            <p className="mt-2 text-blue-600 font-semibold">₹{trainer.hourly_rate}/hour</p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick(e)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid={testId}
      className={cn(
        'rounded-3xl overflow-hidden bg-[#3d565e] text-white shadow-xl ring-1 ring-zinc-400/30 text-left w-full',
        variant === 'hero' && 'max-w-xl',
        onClick && 'cursor-pointer hover:brightness-[1.03] transition-[filter,box-shadow]',
        className
      )}
    >
      <div className={cn('relative w-full', zoneHeights)}>
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[50%_12%]"
          onError={() => setImgFailed(true)}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#2a4148] via-[#3d565e]/50 to-transparent pointer-events-none"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-[4.5rem] sm:bottom-24 px-4 sm:px-5 z-10 pointer-events-none">
          <h3 className={cn('font-bold font-[\'Outfit\'] tracking-tight text-white drop-shadow-md', titleSize)}>
            {displayName}
          </h3>
          <p className={cn('mt-1 text-white/95 drop-shadow line-clamp-2', subtitleSize)}>{credentials}</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 px-4 pb-5 pt-0 -mt-12 relative z-10">
        <span className="rounded-full bg-white/20 backdrop-blur-sm border border-white/35 px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] text-white shadow-lg">
          {badge}
        </span>
        {trainer.hourly_rate != null && variant !== 'hero' && (
          <p className="text-sm text-white/85 font-medium">₹{trainer.hourly_rate}/hour</p>
        )}
      </div>
    </article>
  );
}
