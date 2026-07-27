type VibeQuestLogoMarkProps = {
  className?: string;
};

type VibeQuestBrandProps = {
  className?: string;
  labelClassName?: string;
};

export function VibeQuestLogoMark({ className = "h-7 w-7 sm:h-8 sm:w-8" }: VibeQuestLogoMarkProps) {
  return (
    <span className={`relative flex ${className} shrink-0 items-center justify-center`} aria-hidden="true">
      <span className="absolute top-1 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue shadow-[0_0_18px_rgba(0,240,255,0.28)]" />
      <span className="absolute top-3 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/85" />
      <span className="absolute top-5 h-3.5 w-5 rotate-45 rounded-[2px] bg-electric-blue/65" />
    </span>
  );
}

export function VibeQuestBrand({
  className = "flex min-w-0 items-center gap-2 sm:gap-3",
  labelClassName = "block truncate text-[18px] font-black tracking-[-0.03em] text-white sm:text-[22px]",
}: VibeQuestBrandProps) {
  return (
    <span className={className}>
      <VibeQuestLogoMark />
      <span className={labelClassName}>VibeQuest</span>
    </span>
  );
}
