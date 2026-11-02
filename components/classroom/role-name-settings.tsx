'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAccount } from '@/components/account/account-provider';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useI18n } from '@/lib/hooks/use-i18n';
import { characterRole, type PresentableCharacter } from '@/lib/training/character-presentation';

type Names = Record<string, string>;
const changedEvent = 'teacherlab-role-names-changed';

export function useRoleNames(scenarioId?: string, version?: number) {
  const { account } = useAccount();
  const key =
    account?.authenticated && scenarioId && version
      ? `tsl-role-names:${account.ownerId}:${scenarioId}@${version}`
      : '';
  const [stored, setStored] = useState<{ key: string; names: Names }>({ key: '', names: {} });
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    setSaveError(false);
    if (!key) return;
    const load = () => {
      let names: Names = {};
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          names = Object.fromEntries(
            Object.entries(value).filter(
              ([, name]) => typeof name === 'string' && name.trim().length > 0 && name.length <= 80,
            ),
          );
        }
      } catch {
        /* Display names are optional. */
      }
      setStored({ key, names });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) load();
    };
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) load();
    };
    load();
    window.addEventListener('storage', onStorage);
    window.addEventListener(changedEvent, onChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(changedEvent, onChange);
    };
  }, [key]);
  const save = useCallback(
    (value: Names) => {
      if (!key) return false;
      const names = Object.fromEntries(
        Object.entries(value)
          .map(([id, name]) => [id, name.trim().slice(0, 80)] as const)
          .filter(([, name]) => name),
      );
      try {
        localStorage.setItem(key, JSON.stringify(names));
        setStored({ key, names });
        setSaveError(false);
        window.dispatchEvent(new CustomEvent(changedEvent, { detail: key }));
        return true;
      } catch {
        setSaveError(true);
        return false;
      }
    },
    [key],
  );
  return { names: stored.key === key ? stored.names : {}, save, saveError, enabled: Boolean(key) };
}

export function RoleNameSettings({
  characters,
  settings,
}: {
  characters: PresentableCharacter[];
  settings: ReturnType<typeof useRoleNames>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Names>({});
  return (
    <>
      <button
        type="button"
        disabled={!settings.enabled}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
        onClick={() => {
          setDraft({ ...settings.names });
          setOpen(true);
        }}
      >
        <Pencil size={13} />
        {t('teacherlab.simulation.customNames')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle>{t('teacherlab.simulation.customNames')}</DialogTitle>
          <DialogDescription>{t('teacherlab.simulation.customNamesHint')}</DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (
                settings.save(Object.fromEntries(characters.map(({ id }) => [id, draft[id] ?? ''])))
              )
                setOpen(false);
            }}
          >
            {characters.map((character) => (
              <label key={character.id} className="block text-sm">
                {t(`teacherlab.simulation.roles.${characterRole(character)}`)}
                <input
                  maxLength={80}
                  value={draft[character.id] ?? ''}
                  placeholder={t('teacherlab.simulation.optionalName')}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, [character.id]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                />
              </label>
            ))}
            {settings.saveError && (
              <p role="alert" className="text-sm text-destructive">
                {t('teacherlab.simulation.nameSaveError')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft({})}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                {t('teacherlab.simulation.resetNames')}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white"
              >
                {t('teacherlab.simulation.saveNames')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
