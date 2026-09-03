import { resolveIssueVars, type FarmIssue, type FarmIssueSeverity } from '../services';
import { confidenceBadgeKey, localeFor, type Language, type TranslateFn } from '../i18n';
import { speak, speechOutputSupported } from '../services/speech';

/**
 * ImprovementPlanCard — the prioritised farm improvement plan (PRD §15).
 *
 * Renders whatever `detectFarmIssues` found, worst first. It holds no agronomic
 * logic and makes no decision about what matters: the detectors decided both the
 * severity and the order, and this card's only judgement is how many to show
 * before folding the rest away.
 *
 * IT IS FIRST IN THE SIDEBAR, AND IT IS USUALLY SHORT.
 * A prioritised plan and a warning dump look identical when the list is long, so
 * the value of this card comes from the detectors' restraint rather than from
 * anything here. `TOP_ISSUE_COUNT` items are shown open; the remainder go behind
 * one `<details>` expander. The count is shared with `assistantContext`, so the
 * three items a farmer reads here are exactly the three the Copilot is told
 * about — asking "what should I fix?" cannot produce a different list.
 *
 * THE EMPTY STATE IS THE GOOD NEWS, NOT AN ERROR.
 * "Nothing stands out today" is a real answer and is worded as one. A farm with
 * no issues is the outcome the list is aiming at, and hiding the card entirely
 * would leave a farmer unsure whether it was checked or broken.
 *
 * EVERY ITEM SAYS HOW SURE IT IS (PRD §28 Guardrail 6).
 * The confidence chip is the same `rec.confidenceBadge.*` vocabulary as the
 * recommendation card, so "Low confidence" means the same thing in both places.
 * It is not decoration: several detectors rest on a 250 m soil map or a ~90 m
 * elevation map, and an item a farmer might spend money on has to carry that.
 *
 * NO TEXT HERE IS BUILT BY CONCATENATION.
 * Titles, explanations and actions are whole translated sentences with
 * `{placeholders}` filled by `resolveIssueVars`, which also translates the enum
 * values (crop, soil, method, disease) so a Bengali farmer does not read a
 * Bengali sentence with "Clay Loam" in the middle of it.
 */

interface Props {
  /** Ranked issues from `detectFarmIssues`. Empty is a normal, expected state. */
  issues: readonly FarmIssue[];
  /** How many to show expanded; the rest go behind the expander. */
  topCount: number;
  t: TranslateFn;
  language: Language;
}

/**
 * Severity marker. Deliberately not green at any level: every item in this list
 * is something to attend to, and the dashboard has taught the farmer that green
 * means "nothing to do". Green appears only in the empty state, where it is true.
 */
const SEVERITY_ICON: Record<FarmIssueSeverity, string> = {
  HIGH: '🔴',
  MEDIUM: '🟡',
  LOW: '🔵',
};

/** Lower-case severity for the CSS modifier, e.g. `--high`. */
function severityModifier(severity: FarmIssueSeverity): string {
  return severity.toLowerCase();
}

function IssueItem({ issue, t, language }: { issue: FarmIssue; t: TranslateFn; language: Language }) {
  const vars = resolveIssueVars(issue, t);
  const title = t(issue.titleKey, vars);
  const explanation = t(issue.explanationKey, vars);
  const actions = issue.actionKeys.map((key) => t(key, vars));
  const spokenText = [title, explanation, t('improve.actions'), ...actions].join('. ');

  return (
    <li className={`improve-plan__item improve-plan__item--${severityModifier(issue.severity)}`}>
      <div className="improve-plan__item-head">
        <h4 className="improve-plan__item-title">{t(issue.titleKey, vars)}</h4>
        <button
          type="button"
          className="improve-plan__speak"
          onClick={() => speak(spokenText, localeFor(language))}
          aria-label={t('assistant.readAloud')}
          title={t('assistant.readAloud')}
          disabled={!speechOutputSupported()}
        >
          🔊 <span>{t('assistant.readAloud')}</span>
        </button>
        <span
          className={`improve-plan__severity improve-plan__severity--${severityModifier(issue.severity)}`}
        >
          <span aria-hidden="true">{SEVERITY_ICON[issue.severity]}</span>{' '}
          {t(`improve.severity.${issue.severity}`)}
        </span>
      </div>

      <p className="improve-plan__explain">{t(issue.explanationKey, vars)}</p>

      <p className="improve-plan__confidence">
        <span className="provenance-chip">{t(confidenceBadgeKey(issue.confidence))}</span>
      </p>

      <p className="improve-plan__actions-label">{t('improve.actions')}</p>
      <ul className="improve-plan__actions">
        {issue.actionKeys.map((key) => (
          <li key={key}>{t(key, vars)}</li>
        ))}
      </ul>
    </li>
  );
}

export function ImprovementPlanCard({ issues, topCount, t, language }: Props) {
  if (issues.length === 0) {
    return (
      <section className="improve-plan" aria-label={t('improve.title')}>
        <h3 className="improve-plan__title">{t('improve.title')}</h3>
        <p className="improve-plan__none">
          <span aria-hidden="true">🟢</span> {t('improve.none')}
        </p>
        <p className="improve-plan__hint">{t('improve.noneHint')}</p>
      </section>
    );
  }

  const top = issues.slice(0, topCount);
  const rest = issues.slice(topCount);

  return (
    <section className="improve-plan" aria-label={t('improve.title')}>
      <h3 className="improve-plan__title">{t('improve.title')}</h3>
      <p className="improve-plan__subtitle">{t('improve.subtitle')}</p>

      <ol className="improve-plan__list">
        {top.map((issue) => (
          <IssueItem key={issue.id} issue={issue} t={t} language={language} />
        ))}
      </ol>

      {rest.length > 0 && (
        <details className="improve-plan__details">
          <summary className="improve-plan__details-summary">
            {t('improve.moreCount', { count: rest.length })}
          </summary>
          <ol className="improve-plan__list improve-plan__list--rest">
            {rest.map((issue) => (
              <IssueItem key={issue.id} issue={issue} t={t} language={language} />
            ))}
          </ol>
        </details>
      )}

      {/* Last, like `PhSuitabilityCard`'s source line: the plan is what the
          farmer came for, and this is what stops them reading a map estimate as
          a measurement of their field. */}
      <p className="improve-plan__source">{t('improve.disclaimer')}</p>
    </section>
  );
}
