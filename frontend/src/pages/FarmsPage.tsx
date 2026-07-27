import { useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { FarmProfile } from '../app/appTypes';
import {
  areaUnitLabelKey,
  cropLabelKey,
  methodLabelKey,
  soilLabelKey,
  stageLabelKey,
} from '../i18n';
import { FarmForm } from './FarmForm';

/**
 * Farms page — list, add, edit, and delete farms
 * (docs/05_UI_UX_Spec.md Farm Management).
 */

interface Props {
  store: AppStore;
}

type Mode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; profile: FarmProfile };

export function FarmsPage({ store }: Props) {
  const { t } = store;
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (mode.kind === 'add' || mode.kind === 'edit') {
    return (
      <div className="page">
        <FarmForm
          initial={mode.kind === 'edit' ? mode.profile : undefined}
          t={t}
          onSave={async (draft) => {
            await store.saveFarm(draft);
            setMode({ kind: 'list' });
          }}
          onCancel={() => setMode({ kind: 'list' })}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <h2 className="page__title">{t('farms.title')}</h2>
        <button type="button" className="btn btn--primary" onClick={() => setMode({ kind: 'add' })}>
          {t('farms.add')}
        </button>
      </div>

      {store.profiles.length === 0 ? (
        <p className="empty-state">{t('farms.empty')}</p>
      ) : (
        <ul className="farm-list">
          {store.profiles.map(({ farm, crop, soil }) => (
            <li key={farm.id} className="farm-list__item">
              <div className="farm-list__main">
                <h3 className="farm-list__name">{farm.name}</h3>
                <p className="farm-list__meta">
                  {t(cropLabelKey(crop.name))} · {t(stageLabelKey(crop.growthStage))} ·{' '}
                  {t(soilLabelKey(soil.name))} {t('farms.soilSuffix')}
                </p>
                <p className="farm-list__meta">
                  {farm.area} {t(areaUnitLabelKey(farm.areaUnit))} ·{' '}
                  {t(methodLabelKey(farm.irrigationMethod))}
                  {farm.location.label ? ` · ${farm.location.label}` : ''}
                </p>
              </div>
              <div className="farm-list__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setMode({ kind: 'edit', profile: { farm, crop, soil } })}
                >
                  {t('farms.edit')}
                </button>
                {confirmDelete === farm.id ? (
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={async () => {
                      await store.deleteFarm(farm.id);
                      setConfirmDelete(null);
                    }}
                  >
                    {t('farms.confirm')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm btn--danger-text"
                    onClick={() => setConfirmDelete(farm.id)}
                  >
                    {t('farms.delete')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
