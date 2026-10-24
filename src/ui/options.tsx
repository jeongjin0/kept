import { COVERAGE, METRICS, PLATFORMS, REPO_URL, activePreset, presetRule, type Metric, type PresetName } from "../lib/score";
import type { IconName } from "../lib/icons";
import { t } from "../lib/i18n";
import { GitHubLink, Icon, Mark, NumberStepper, PowerButton, PresetControl, Row, Stats, Tile, Wordmark } from "./kit";
import { SITES, useFilterState } from "./state";

const METRIC_ICON: Record<Metric, IconName> = { likes: "heart", comments: "comment", views: "eye" };

export function OptionsApp() {
  const { settings, ready, skips, totals, update, reset, resetting, resetFailed } = useFilterState();
  const preset = activePreset(settings.rule);
  const labels: Record<PresetName, string> = { lenient: t("presetLenient"), balanced: t("presetBalanced"), strict: t("presetStrict") };

  function setCondition(metric: Metric, change: { on?: boolean; min?: number }) {
    update((current) => ({ ...current, rule: { ...current.rule, [metric]: { ...current.rule[metric], ...change } } }));
  }

  return (
    <main className={ready ? "page ready" : "page"}>
      <div className="sheet">
        <header className="bar">
          <div className="brand">
            <Mark size={30} />
            <Wordmark />
          </div>
          <PowerButton on={settings.enabled} label={settings.enabled ? t("powerOn") : t("powerOff")} text={settings.enabled ? t("statusOn") : t("statusOff")} onChange={(enabled) => update((current) => ({ ...current, enabled }))} />
        </header>

        <Stats count={skips} totals={totals} />

        <section>
          <h2>{t("rulesTitle")}</h2>
          <p className="lead">{t("rulesLead")}</p>
          <div className="card">
            <div className="pad">
              <PresetControl value={preset} labels={labels} onChange={(name) => update((current) => ({ ...current, rule: presetRule(name, current.rule) }))} />
            </div>
            {METRICS.map((metric) => {
              const condition = settings.rule[metric];
              const partial = COVERAGE[metric].length < PLATFORMS.length;
              const names = COVERAGE[metric].map((platform) => SITES[platform].name).join(", ");
              return (
                <Row
                  key={metric}
                  className="condition"
                  icon={METRIC_ICON[metric]}
                  on={condition.on}
                  label={t(metric)}
                  onToggle={(on) => setCondition(metric, { on })}
                  title={
                    <>
                      {t(metric)}
                      {partial ? (
                        <span className="covers" title={t("appliesTo", names)} aria-label={t("appliesTo", names)}>
                          {COVERAGE[metric].map((platform) => <Icon key={platform} name={SITES[platform].icon} size={12} />)}
                        </span>
                      ) : null}
                    </>
                  }
                >
                  <NumberStepper value={condition.min} disabled={!condition.on} label={t("amount", t(metric))} onChange={(min) => setCondition(metric, { min })} />
                </Row>
              );
            })}
          </div>
        </section>

        <section>
          <h2>{t("sitesTitle")}</h2>
          <div className="card">
            {PLATFORMS.map((platform) => (
              <Row
                key={platform}
                icon={SITES[platform].icon}
                title={SITES[platform].name}
                on={settings.platforms[platform]}
                label={SITES[platform].name}
                onToggle={(next) => update((current) => ({ ...current, platforms: { ...current.platforms, [platform]: next } }))}
              />
            ))}
          </div>
        </section>

        <section>
          <h2>{t("behaviorTitle")}</h2>
          <div className="card">
            <Row icon="megaphone" title={t("skipAds")} on={settings.skipAds} label={t("skipAds")} onToggle={(next) => update((current) => ({ ...current, skipAds: next }))} />
            <Row
              icon="userCheck"
              on={settings.keepFollowed}
              label={t("keepFollowed")}
              onToggle={(next) => update((current) => ({ ...current, keepFollowed: next }))}
              title={t("keepFollowed")}
            />
            <Row icon="grid" title={t("filterGrids")} on={settings.filterGrids} label={t("filterGrids")} onToggle={(next) => update((current) => ({ ...current, filterGrids: next }))} />
          </div>
        </section>

        <section>
          <h2>{t("showChip")}</h2>
          <div className="card">
            <Row icon="pill" title={t("showChip")} on={settings.showSkipChip} label={t("showChip")} onToggle={(next) => update((current) => ({ ...current, showSkipChip: next }))} />
            <div className="pad stack">
              <p className="note">{t("noticeHelp")}</p>
              <fieldset className="notice-style" disabled={!settings.showSkipChip}>
                <legend>{t("noticeStyle")}</legend>
                {(["compact", "detailed"] as const).map((style) => <label key={style}><input type="radio" name="notice-style" value={style} checked={settings.noticeStyle === style} onChange={() => update((current) => ({ ...current, noticeStyle: style }))} />{t(style === "compact" ? "noticeCompact" : "noticeDetailed")}</label>)}
              </fieldset>
              <div className="notice-preview" aria-label={t("noticePreview")}>
                <span className="note">{t("noticePreview")}</span>
                <div className={settings.noticeStyle === "compact" ? "preview-chip compact" : "preview-chip"} aria-hidden="true">
                  <span>{settings.noticeStyle === "compact" ? "1" : t("chipLikes", 64)}</span><span><Icon name="undo" size={14} />{settings.noticeStyle === "detailed" ? t("undo") : null}</span>
                </div>
                <p className="note">{t("noticeSafetyHelp")}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>{t("allowTitle")}</h2>
          <div className="card">
            {settings.allowlist.length === 0 ? (
              <div className="empty">
                <Tile name="user" active={false} />
                <span>{t("allowEmpty")}</span>
              </div>
            ) : (
              settings.allowlist.map((entry) => (
                <div className="row" key={entry.platform + entry.id}>
                  <Tile name={SITES[entry.platform].icon} />
                  <span className="row-title">{entry.id}</span>
                  <button type="button" className="icon-button" aria-label={t("remove") + " · " + entry.id} title={t("remove")} onClick={() => update((current) => ({ ...current, allowlist: current.allowlist.filter((item) => item.platform !== entry.platform || item.id !== entry.id) }))}>
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="end">
          <div className="end-row">
            <button type="button" className="link" disabled={resetting} onClick={() => { void reset(); }}>
              <Icon name="reset" size={14} />
              {t("reset")}
            </button>
            <GitHubLink href={REPO_URL} />
          </div>
          {resetFailed ? <p className="lead" role="alert">{t("resetFailed")}</p> : null}
          <p className="privacy">{t("privacy")}</p>
        </footer>
      </div>
    </main>
  );
}
