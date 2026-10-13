import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ICONS, type IconName } from "../lib/icons";
import { formatCount, parseCount, stepValue } from "../lib/numbers";
import { PRESETS, PRESET_LIKES, type PresetName, type TotalSkips } from "../lib/score";
import { formatDay, formatDuration, savedMs } from "../lib/saved";
import { t } from "../lib/i18n";

export function Icon(props: { name: IconName; size?: number }) {
  const size = props.size ?? 16;
  return (
    <svg className="icon" viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[props.name].map((shape, index) => {
        if (shape.t === "path") return <path key={index} d={shape.d} fill={shape.fill ? "currentColor" : undefined} stroke={shape.fill ? "none" : undefined} />;
        if (shape.t === "rect") return <rect key={index} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} />;
        return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill ? "currentColor" : undefined} />;
      })}
    </svg>
  );
}

export function Wordmark() {
  const name = t("appName");
  const split = name.lastIndexOf("Plus");
  return <h1>{split > 0 ? <>{name.slice(0, split)}<span className="plus">Plus</span></> : name}</h1>;
}

export function Mark(props: { size?: number }) {
  const size = props.size ?? 22;
  return (
    <svg className="mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="mark-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--accent), white 10%)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--accent), black 5%)" }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#mark-tile)" />
      {size > 22 ? <rect x="0.6" y="0.6" width="30.8" height="30.8" rx="8.4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" /> : null}
      <g transform="translate(-.4 0)" style={{ stroke: "var(--accent-ink)", fill: "none" }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.6 11.2H13.2" opacity="0.38" />
        <path d="M5.6 16H13.2" opacity="0.7" />
        <path d="M9 20.8H13.2" opacity="0.38" />
        <path d="M16.4 8.4 27.4 16 16.4 23.6Z" strokeWidth="2.6" style={{ fill: "var(--accent-ink)" }} />
      </g>
    </svg>
  );
}

export function Switch(props: { on: boolean; label: string; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={props.on} aria-label={props.label} disabled={props.disabled} className={props.on ? "switch on" : "switch"} onClick={(event) => {
      event.stopPropagation();
      props.onChange(!props.on);
    }}>
      <span className="thumb" />
    </button>
  );
}

export function PowerButton(props: { on: boolean; label: string; text?: string; onChange: (next: boolean) => void }) {
  return (
    <button type="button" className={(props.on ? "power on" : "power") + (props.text ? " wide" : "")} aria-pressed={props.on} aria-label={props.label} title={props.label} onClick={() => props.onChange(!props.on)}>
      <Icon name="power" size={16} />
      {props.text ? <span>{props.text}</span> : null}
    </button>
  );
}

export function Tile(props: { name: IconName; active?: boolean }) {
  return (
    <span className={props.active === false ? "tile off" : "tile"}>
      <Icon name={props.name} size={16} />
    </span>
  );
}

export function Row(props: { icon: IconName; title: ReactNode; on?: boolean; onToggle?: (next: boolean) => void; label: string; children?: ReactNode; className?: string }) {
  return (
    <div className={["row", props.on === false ? "off" : "", props.className ?? ""].join(" ")} role={props.onToggle ? "group" : undefined} aria-label={props.onToggle ? props.label : undefined}>
      <Tile name={props.icon} active={props.on} />
      <span className="row-title">{props.title}</span>
      {props.children}
      {props.onToggle ? <Switch on={Boolean(props.on)} label={props.label} onChange={props.onToggle} /> : null}
    </div>
  );
}

export function PresetControl(props: { value: PresetName | null; labels: Record<PresetName, string>; onChange: (next: PresetName) => void }) {
  const index = props.value ? PRESETS.indexOf(props.value) : -1;
  const focusRef = useRef<Array<HTMLButtonElement | null>>([]);
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const from = index < 0 ? 1 : index;
    const next = (from + (event.key === "ArrowRight" ? 1 : PRESETS.length - 1)) % PRESETS.length;
    props.onChange(PRESETS[next]);
    focusRef.current[next]?.focus();
  }
  return (
    <div className="presets" role="radiogroup" aria-label={t("rulesTitle")} onKeyDown={onKey}>
      <span className="thumb-slide" style={{ transform: "translateX(" + Math.max(index, 0) * 100 + "%)", opacity: index < 0 ? 0 : 1 }} />
      {PRESETS.map((name, position) => (
        <button key={name} ref={(node) => { focusRef.current[position] = node; }} type="button" role="radio" title={t("presetTitle", formatCount(PRESET_LIKES[name]))} aria-checked={props.value === name} tabIndex={props.value === name || (index < 0 && position === 1) ? 0 : -1} className={props.value === name ? "preset on" : "preset"} onClick={() => props.onChange(name)}>
          <strong>{props.labels[name]}</strong>
          <span className="sub">
            <Icon name="heart" size={11} />
            {formatCount(PRESET_LIKES[name])}
          </span>
        </button>
      ))}
    </div>
  );
}

export function NumberStepper(props: { value: number; disabled?: boolean; label: string; onChange: (next: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const selectAfterFocus = useRef(false);
  const cancelBlur = useRef(false);
  const errorId = useId();
  useEffect(() => { setDraft(null); setInvalid(false); }, [props.value]);
  useLayoutEffect(() => {
    if (!selectAfterFocus.current) return;
    selectAfterFocus.current = false;
    input.current?.select();
  }, [draft]);
  function commit() {
    if (cancelBlur.current) { cancelBlur.current = false; return; }
    if (draft == null) return;
    const parsed = parseCount(draft);
    if (parsed == null) { setInvalid(true); return; }
    setInvalid(false);
    setDraft(null);
    if (parsed != null && parsed !== props.value) props.onChange(parsed);
  }
  return (
    <div className="number-control">
    <div className={props.disabled ? "stepper disabled" : "stepper"}>
      <button type="button" className="step" aria-label={t("lessAria") + " · " + props.label} disabled={props.disabled} onClick={() => props.onChange(stepValue(props.value, -1))}>
        <Icon name="minus" size={14} />
      </button>
      <input
        ref={input}
        className="amount"
        inputMode="numeric"
        aria-label={props.label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        title={props.value.toLocaleString()}
        disabled={props.disabled}
        value={draft ?? formatCount(props.value)}
        onFocus={(event) => {
          cancelBlur.current = false;
          selectAfterFocus.current = true;
          setDraft(draft ?? String(props.value));
          if (draft != null) event.currentTarget.select();
        }}
        onChange={(event) => { setDraft(event.target.value); setInvalid(false); }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            cancelBlur.current = true;
            setDraft(null);
            setInvalid(false);
            event.currentTarget.blur();
          }
        }}
      />
      <button type="button" className="step" aria-label={t("moreAria") + " · " + props.label} disabled={props.disabled} onClick={() => props.onChange(stepValue(props.value, 1))}>
        <Icon name="plus" size={14} />
      </button>
    </div>
    {invalid ? <span className="number-error" id={errorId} role="alert">{t("invalidNumber")}</span> : null}
    </div>
  );
}

export function GitHubLink(props: { href: string }) {
  return (
    <a className="github" href={props.href} target="_blank" rel="noreferrer" title={t("githubTitle")}>
      <Icon name="github" size={16} />
      {t("github")}
    </a>
  );
}

// The popup's top card: today's count, and under it what the skips have saved so far.
export function Hero(props: { count: number; totals: TotalSkips }) {
  return (
    <div className="hero" aria-live="polite">
      <div className="hero-top">
        <span className="big">{props.count.toLocaleString()}</span>
        <span className="hero-label">{t("skippedToday")}</span>
      </div>
      <div className="hero-saved" role="img" aria-label={t("savedAccessible", formatDuration(savedMs(props.totals), "narrow"))}>
        <Icon name="clock" size={13} />
        <b>{t("savedValue", formatDuration(savedMs(props.totals), "narrow"))}</b>
      </div>
    </div>
  );
}

// Settings page: today, all time, and the estimated time saved.
export function Stats(props: { count: number; totals: TotalSkips }) {
  return (
    <div className="stats-block">
      <div className="stats" aria-live="polite">
        <div className="stat">
          <span className="big">{props.count.toLocaleString()}</span>
          <span className="hero-label">{t("skippedToday")}</span>
        </div>
        <div className="stat">
          <span className="big">{props.totals.count.toLocaleString()}</span>
          <span className="hero-label">{t("statTotal")}</span>
        </div>
        <div className="stat saved" role="img" aria-label={t("savedAccessible", formatDuration(savedMs(props.totals), "narrow"))}>
          <span className="saved-value"><Icon name="clock" size={15} /><span className="big">{formatDuration(savedMs(props.totals), "narrow")}</span></span>
        </div>
      </div>
      <p className="stats-note">{t("statSince", formatDay(props.totals.since))}</p>
    </div>
  );
}

export function Segmented<T extends string>(props: { value: T; options: Array<{ value: T; label: string; icon: IconName }>; label: string; disabled?: boolean; onChange: (next: T) => void }) {
  const index = props.options.findIndex((option) => option.value === props.value);
  const focusRef = useRef<Array<HTMLButtonElement | null>>([]);
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (props.disabled || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) return;
    event.preventDefault();
    const count = props.options.length;
    const next = ((index < 0 ? 0 : index) + (event.key === "ArrowRight" ? 1 : count - 1)) % count;
    props.onChange(props.options[next].value);
    focusRef.current[next]?.focus();
  }
  return (
    <div className={props.disabled ? "presets simple disabled" : "presets simple"} role="radiogroup" aria-label={props.label} aria-disabled={props.disabled || undefined} onKeyDown={onKey} style={{ gridTemplateColumns: "repeat(" + props.options.length + ", 1fr)" }}>
      <span className="thumb-slide" style={{ width: "calc((100% - 6px) / " + props.options.length + ")", transform: "translateX(" + Math.max(index, 0) * 100 + "%)", opacity: index < 0 ? 0 : 1 }} />
      {props.options.map((option, position) => (
        <button key={option.value} ref={(node) => { focusRef.current[position] = node; }} type="button" role="radio" disabled={props.disabled} aria-checked={props.value === option.value} tabIndex={props.value === option.value || (index < 0 && position === 0) ? 0 : -1} className={props.value === option.value ? "preset on" : "preset"} onClick={() => props.onChange(option.value)}>
          <Icon name={option.icon} size={16} />
          <strong>{option.label}</strong>
        </button>
      ))}
    </div>
  );
}
