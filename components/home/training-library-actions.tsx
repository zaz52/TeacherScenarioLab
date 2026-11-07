'use client';
import { useEffect, useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { useAccount } from '@/components/account/account-provider';
import { useI18n } from '@/lib/hooks/use-i18n';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { LibraryKind, RemovedItem } from '@/lib/training/library';
export const TRAINING_LIBRARY_CHANGED = 'teacherlab-training-library-changed';
async function change(kind: LibraryKind, key: string, action: 'remove' | 'restore') {
  const response = await fetch('/api/training-library', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, key, action }),
  });
  if (!response.ok) throw Error();
  window.dispatchEvent(new Event(TRAINING_LIBRARY_CHANGED));
}
export function LibraryRemoveButton({
  kind,
  itemKey,
  title,
}: {
  kind: LibraryKind;
  itemKey: string;
  title: string;
}) {
  const { account } = useAccount();
  const { t } = useI18n();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    setOpen(false);
    setError(false);
  }, [account?.ownerId]);
  if (!account?.authenticated) return null;
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`${t('teacherlab.library.remove')} ${title}`}
        onClick={() => {
          setError(false);
          setOpen(true);
        }}
      >
        <Trash2 size={14} />
        {t('teacherlab.library.remove')}
      </button>
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('teacherlab.library.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {title}
              <br />
              {t(
                kind === 'scenario'
                  ? 'teacherlab.library.scenarioHint'
                  : 'teacherlab.library.trainingHint',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t('teacherlab.library.failed')}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('teacherlab.library.cancel')}</AlertDialogCancel>
            <Button
              disabled={busy}
              variant="destructive"
              onClick={async () => {
                setBusy(true);
                try {
                  await change(kind, itemKey, 'remove');
                  setOpen(false);
                } catch {
                  setError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(busy ? 'teacherlab.library.working' : 'teacherlab.library.remove')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export function LibraryTrash({ kind }: { kind: LibraryKind }) {
  const { account } = useAccount();
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<RemovedItem[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(false),
    [busy, setBusy] = useState('');
  useEffect(() => {
    setOpen(false);
    setItems([]);
    setError(false);
  }, [account?.ownerId]);
  useEffect(() => {
    if (!open || !account?.authenticated) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setItems([]);
    void fetch('/api/training-library', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const data = await r.json();
        if (!controller.signal.aborted) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, account?.ownerId, account?.authenticated]);
  if (!account?.authenticated) return null;
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Trash2 size={14} />
        {t('teacherlab.library.trash')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {t(
                kind === 'scenario'
                  ? 'teacherlab.library.deletedScenarios'
                  : 'teacherlab.library.deletedTrainings',
              )}
            </DialogTitle>
            <DialogDescription>{t('teacherlab.library.restoreHint')}</DialogDescription>
          </DialogHeader>
          {loading ? (
            <p>{t('teacherlab.library.working')}</p>
          ) : (
            <ul className="space-y-3">
              {items
                .filter((item) => item.kind === kind)
                .map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{item.title}</p>
                      <time className="text-xs text-muted-foreground">
                        {new Date(item.removedAt).toLocaleString(locale)}
                      </time>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(busy)}
                      onClick={async () => {
                        setBusy(item.key);
                        setError(false);
                        try {
                          await change(kind, item.key, 'restore');
                          setItems((previous) =>
                            previous.filter(
                              (value) => value.kind !== kind || value.key !== item.key,
                            ),
                          );
                        } catch {
                          setError(true);
                        } finally {
                          setBusy('');
                        }
                      }}
                    >
                      <RotateCcw size={14} />
                      {t('teacherlab.library.restore')}
                    </Button>
                  </li>
                ))}
              {!items.some((item) => item.kind === kind) && (
                <li className="py-5 text-sm text-muted-foreground">
                  {t('teacherlab.library.empty')}
                </li>
              )}
            </ul>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t('teacherlab.library.failed')}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
