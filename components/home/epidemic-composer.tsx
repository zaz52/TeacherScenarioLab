'use client';

import { useEffect, useState } from 'react';
import { Bot, ChevronDown, Paperclip } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useAccount } from '@/components/account/account-provider';
import { useModelSettingsView } from '@/lib/model-settings/use-model-settings';
import { characterLabel, characterAvatar } from '@/lib/training/character-presentation';
import { TRAINING_LIBRARY_CHANGED } from './training-library-actions';
import type { UserRouting } from '@/lib/training/user-model-routing';
import {
  DEFAULT_PRACTICE,
  parsePractice,
  PARENT_PROFILES,
  PRACTICE_GRADES,
  SCENARIO_CASES,
  gradeLabel,
  type PracticeConfig,
} from '@/lib/training/practice-config';
import { RoleNameSettings, useRoleNames } from '@/components/classroom/role-name-settings';

export interface ComposerScenario {
  scenarioId: string;
  version: number;
  title: string;
  characters: Array<{ id: string; name: string; role: string }>;
}

export function useEpidemicComposer(enabled: boolean) {
  const { t } = useI18n();
  const { account } = useAccount();
  const view = useModelSettingsView();
  const [scenarios, setScenarios] = useState<ComposerScenario[]>([]);
  const [selected, setSelected] = useState('');
  const [characterId, setCharacterId] = useState('parent-1');
  const [mode, setMode] = useState<'scripted' | 'model'>('model');
  const [practice, setPractice] = useState<PracticeConfig>(DEFAULT_PRACTICE);
  const [routing, setRouting] = useState<UserRouting>({
    roleplay: null,
    evaluation: null,
    characters: {},
  });
  const [revision, setRevision] = useState(0);
  const [libraryRevision, setLibraryRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setLibraryRevision((value) => value + 1);
    window.addEventListener(TRAINING_LIBRARY_CHANGED, refresh);
    return () => window.removeEventListener(TRAINING_LIBRARY_CHANGED, refresh);
  }, []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = (value: ComposerScenario) => `${value.scenarioId}@${value.version}`;
  const scenario =
    scenarios.find((value) => key(value) === selected) ??
    scenarios.find((value) => value.scenarioId === 'epi-class-fever') ??
    scenarios[0];
  const roleNames = useRoleNames(scenario?.scenarioId, scenario?.version);
  useEffect(() => {
    if (!scenario) return;
    setPractice((previous) => ({
      ...previous,
      grade:
        scenario.scenarioId === 'epi-class-fever'
          ? previous.grade === 'scenario'
            ? 'g3'
            : previous.grade
          : 'scenario',
      focus: scenario.characters.some((c) => c.role === 'parent') ? previous.focus : 'campus',
    }));
  }, [scenario?.scenarioId]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void fetch('/api/training/scenarios')
      .then(async (response) => {
        if (!response.ok) throw Error();
        const data = await response.json();
        if (active) setScenarios(data.scenarios ?? []);
      })
      .catch(() => {
        if (active) setError(t('training.trainingLoadFailed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, t, libraryRevision, account?.ownerId]);
  useEffect(() => {
    if (!enabled || !account?.authenticated) return;
    let active = true;
    void fetch('/api/training/models/routing')
      .then(async (response) => {
        if (!response.ok) throw Error();
        const data = await response.json();
        if (active) setRouting(data.routing);
      })
      .catch(() => {
        if (active) setError(t('teacherlab.errors.ACCOUNT_SERVICE_UNAVAILABLE'));
      });
    return () => {
      active = false;
    };
  }, [enabled, account?.authenticated, t]);
  const characters =
    scenario?.characters.filter(
      (value) => practice.focus !== 'family' || value.role === 'parent',
    ) ?? [];
  const role =
    characters.find((value) => value.id === characterId) ??
    characters.find((value) => value.role === 'parent') ??
    characters[0];
  const model = role ? (routing.characters[role.id] ?? routing.roleplay) : routing.roleplay;
  const models =
    view?.providers
      .filter((provider) => provider.source === 'workspace')
      .flatMap((provider) =>
        (provider.models ?? provider.capabilities.chat?.models.map((value) => value.id) ?? []).map(
          (id) => ({ ref: `${provider.id}:${id}`, label: id }),
        ),
      ) ?? [];
  async function changeModel(ref: string) {
    if (busy || !account?.authenticated || !role) return;
    setBusy(true);
    setError('');
    const next = {
      ...routing,
      roleplay: ref ? routing.roleplay : null,
      characters: { ...routing.characters, [role.id]: ref || null },
    };
    try {
      const response = await fetch('/api/training/models/routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw Error();
      setRouting(next);
    } catch {
      setError(t('teacherlab.errors.PERSONAL_MODEL_REQUIRED'));
    } finally {
      setBusy(false);
    }
  }
  async function start(opening: string) {
    if (!scenario || busy || !account?.authenticated) return null;
    if (!parsePractice(practice)) {
      setError(t('teacherlab.practice.customRequired'));
      return null;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/training-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.scenarioId,
          scenarioVersion: scenario.version,
          practice,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.training?.id) throw Error();
      const id = data.training.id as string;
      try {
        localStorage.setItem(`tsl-room-draft-${id}`, opening);
        sessionStorage.setItem(
          `tsl-room-entry-${id}`,
          JSON.stringify({ characterId: role?.id ?? '', mode }),
        );
      } catch {
        /* The created training remains available when browser storage is blocked. */
      }
      return id;
    } catch {
      setError(t('training.hallStartFailed'));
      return null;
    } finally {
      setBusy(false);
    }
  }
  return {
    scenarios,
    revision,
    addScenario(value: ComposerScenario) {
      const safe = {
        scenarioId: value.scenarioId,
        version: value.version,
        title: value.title,
        characters: value.characters,
      };
      setScenarios((previous) => [safe, ...previous.filter((item) => key(item) !== key(safe))]);
      setSelected(key(safe));
      setCharacterId(
        safe.characters.find((item) => item.role === 'parent')?.id ?? safe.characters[0]?.id ?? '',
      );
      setRevision((previous) => previous + 1);
    },
    scenario,
    characters,
    practice,
    setPractice,
    roleNames,
    characterId: role?.id ?? '',
    setCharacterId,
    mode,
    setMode,
    model,
    models,
    changeModel,
    loading,
    busy,
    error,
    start,
    selectScenario(value: ComposerScenario) {
      setSelected(key(value));
      const parent = value.characters.find((character) => character.role === 'parent');
      setPractice((previous) => ({ ...previous, focus: parent ? 'family' : 'campus' }));
      setCharacterId(parent?.id ?? value.characters[0]?.id ?? '');
    },
  };
}
export type EpidemicComposer = ReturnType<typeof useEpidemicComposer>;

export function EpidemicRolePill({ composer }: { composer: EpidemicComposer }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground max-sm:hidden">
          {t('teacherlab.composer.practiceWith')}
        </span>
        <img
          src={characterAvatar(
            composer.scenario?.characters.find((value) => value.id === composer.characterId) ?? {
              id: 'teacher-1',
              role: 'teacher',
              name: '',
            },
          )}
          alt=""
          className="h-10 w-10 rounded-full bg-violet-100"
        />
        <select
          aria-label={t('teacherlab.composer.role')}
          className="max-w-32 bg-transparent text-sm outline-none"
          value={composer.characterId}
          onChange={(event) => composer.setCharacterId(event.target.value)}
          disabled={composer.busy}
        >
          {composer.characters.map((role) => (
            <option key={role.id} value={role.id}>
              {characterLabel(role, t, composer.roleNames.names)}
            </option>
          ))}
        </select>
      </div>
      <RoleNameSettings characters={composer.characters} settings={composer.roleNames} />
    </div>
  );
}

export function EpidemicModelPill({
  composer,
  onSettings,
}: {
  composer: EpidemicComposer;
  onSettings: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <label className="flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-2 text-xs">
        <Bot className="h-4 w-4 shrink-0 text-blue-600" />
        <select
          aria-label={t('teacherlab.composer.model')}
          value={composer.model ?? ''}
          disabled={composer.busy}
          onChange={(event) => void composer.changeModel(event.target.value)}
          className="max-w-44 bg-transparent font-medium outline-none"
        >
          <option value="">{t('teacherlab.smartRouting')}</option>
          {composer.model && (
            <option value={composer.model}>{t('teacherlab.personalRoute')}</option>
          )}
        </select>
        <button
          type="button"
          onClick={onSettings}
          aria-label={t('teacherlab.composer.manageModels')}
          className="rounded-full px-1 text-violet-600 hover:bg-violet-50"
        >
          <ChevronDown size={12} />
        </button>
      </label>
      <span
        title={t('teacherlab.composer.materialsHint')}
        className="rounded-full border border-border/60 p-2 text-muted-foreground/40"
      >
        <Paperclip size={16} />
      </span>
    </div>
  );
}
