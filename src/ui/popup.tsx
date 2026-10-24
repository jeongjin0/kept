import { useState } from "react";
import { PLATFORMS, REPO_URL, activePreset, isAllowlisted, presetRule, type PresetName } from "../lib/score";
import { t } from "../lib/i18n";
import { GitHubLink, Hero, Icon, Mark, PowerButton, PresetControl, Row, Wordmark } from "./kit";
import { SITES, useFilterState } from "./state";

export function PopupApp() {
  const { settings, ready, skips, totals, active, update, allowCurrent, control, acting, actionFailed } = useFilterState(true);
  const [kept, setKept] = useState(false);
  const [keepError, setKeepError] = useState(false);
  const creatorKept = kept || Boolean(active?.creatorId && active.platform && isAllowlisted(settings, active.platform, active.creatorId));
  const preset = activePreset(settings.rule);
  const recovering = Boolean(active?.controls?.paused || active?.controls?.canUndo || actionFailed);
  const labels: Record<PresetName, string> = { lenient: t("presetLenient"), balanced: t("presetBalanced"), strict: t("presetStrict") };
  const classes = ["popup", ready ? "ready" : "", settings.enabled ? "" : "paused"].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <header className="bar">
        <div className="brand">
          <Mark size={24} />
          <Wordmark />
        </div>
        <PowerButton on={settings.enabled} label={settings.enabled ? t("powerOn") : t("powerOff")} onChange={(enabled) => update((current) => ({ ...current, enabled }))} />
      </header>
      <div className="body">
        <Hero count={skips} totals={totals} />
        {active?.controls && (active.controls.paused || active.controls.canUndo || actionFailed) ? (
          <section className="playback card" aria-label={t("playbackTitle")}>
            {active.controls.paused ? <p role="status">{t("pauseReason")}</p> : null}
            <div className="playback-actions">
              {active.controls.paused ? <button type="button" className="action primary" disabled={acting || active.controls.busy} onClick={() => void control("continue")}>{t("keepGoing")}</button> : null}
              {active.controls.canLower ? <button type="button" className="action" disabled={acting} onClick={() => void control("lower")}>{t("lowerBar")}</button> : null}
              {active.controls.canUndo ? <button type="button" className={active.controls.paused ? "action undo-only" : "action"} aria-label={t("undo")} title={t("undo")} disabled={acting} onClick={() => void control("undo")}><Icon name="undo" size={14} />{active.controls.paused ? null : t("undo")}</button> : null}
            </div>
          </section>
        ) : null}
        {actionFailed ? <p className="note" role="alert">{t("playbackError")}</p> : null}
        <PresetControl value={preset} labels={labels} onChange={(name) => update((current) => ({ ...current, rule: presetRule(name, current.rule) }))} />
        <div className="card">
          <Row icon="megaphone" title={t("skipAds")} on={settings.skipAds} label={t("skipAds")} onToggle={(next) => update((current) => ({ ...current, skipAds: next }))} />
          <Row icon="pill" title={t("showChip")} on={settings.showSkipChip} label={t("showChip")} onToggle={(next) => update((current) => ({ ...current, showSkipChip: next }))} />
        </div>
        {!recovering ? <div className="card">
          {PLATFORMS.filter((platform) => !active?.platform || active.platform === platform).map((platform) => (
            <Row
              key={platform}
              icon={SITES[platform].icon}
              title={SITES[platform].name}
              on={settings.platforms[platform]}
              label={SITES[platform].name}
              onToggle={(next) => update((current) => ({ ...current, platforms: { ...current.platforms, [platform]: next } }))}
            />
          ))}
        </div> : null}
        {active?.creatorId ? (
          <button type="button" className="action" disabled={creatorKept} onClick={() => {
            setKeepError(false);
            void allowCurrent().then(() => setKept(true)).catch(() => setKeepError(true));
          }}>
            <Icon name={creatorKept ? "check" : "user"} size={14} />
            {creatorKept ? t("creatorKept") : t("keepCreator")}
          </button>
        ) : null}
        {active?.platform === "instagram" && active.instagramSignedOut ? <p className="note">{t("signedOut")}</p> : keepError ? <p className="note" role="alert">{t("keepError")}</p> : null}
      </div>
      <footer className="foot">
        <button type="button" className="link" onClick={() => void chrome.runtime.openOptionsPage()}>
          <Icon name="sliders" size={14} />
          {t("settings")}
          {preset ? null : <span className="badge">{t("custom")}</span>}
        </button>
        <GitHubLink href={REPO_URL} />
      </footer>
    </div>
  );
}
