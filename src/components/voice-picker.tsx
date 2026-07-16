export type NarrationVoiceKey = "us_female" | "us_male" | "uk_female" | "uk_male";

export const NARRATION_VOICES: {
  key: NarrationVoiceKey;
  flag: string;
  accent: string;
  gender: string;
  label: string;
}[] = [
  { key: "uk_female", flag: "🇬🇧", accent: "British", gender: "Female", label: "Natalie" },
  { key: "uk_male", flag: "🇬🇧", accent: "British", gender: "Male", label: "Daniel" },
  { key: "us_female", flag: "🇺🇸", accent: "American", gender: "Female", label: "Charlotte" },
  { key: "us_male", flag: "🇺🇸", accent: "American", gender: "Male", label: "Adam" },
];

export function VoicePickerGrid({
  value,
  onPick,
  disabled,
}: {
  value: NarrationVoiceKey | null;
  onPick: (key: NarrationVoiceKey) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {NARRATION_VOICES.map((v) => {
        const selected = value === v.key;
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => onPick(v.key)}
            disabled={disabled}
            className={
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 " +
              (selected
                ? "border-star/60 bg-star/10"
                : "border-hairline bg-surface-elevated hover:border-lavender/40")
            }
          >
            <span className="text-2xl">{v.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base text-foreground">
                {v.accent} {v.gender}
              </p>
              <p className="text-xs text-foreground/50">{v.label}</p>
            </div>
            {selected && (
              <span className="text-[10px] font-mono uppercase tracking-widest text-star">
                ● Active
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
