'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useAccount } from '@/components/account/account-provider';
import { useI18n } from '@/lib/hooks/use-i18n';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MESSAGEABLE_STATES } from '@/lib/training/state-machine';
import './newcomer-guide.css';

const STEPS = [
  { id: 'welcome', target: 'composer', href: '/' },
  { id: 'account', target: 'account', href: '/login' },
  { id: 'scenario', target: 'scenarios', href: '/?training=hall#training' },
  { id: 'practice', target: 'practice', href: '/' },
  { id: 'models', target: 'models', href: '/' },
  { id: 'opening', target: 'composer', href: '/' },
  { id: 'room', target: 'dialogue', href: '/' },
  { id: 'emergency', target: 'emergency', href: '/' },
  { id: 'voice', target: 'voice', href: '/' },
  { id: 'feedback', target: 'support', href: '/' },
  { id: 'evaluation', target: 'evaluation', href: '/' },
  { id: 'review', target: 'review', href: '/?training=records#training' },
  { id: 'records', target: 'records', href: '/?training=records#training' },
  { id: 'events', target: 'events', href: '/?training=events#training' },
  { id: 'references', target: 'knowledge', href: '/courseware/references' },
  { id: 'settings', target: 'settings-panel', href: '/' },
  { id: 'admin', target: 'settings-panel', href: '/', admin: true },
];
export function NewcomerGuide() {
  const { account, loading } = useAccount();
  const { t } = useI18n();
  const pathname = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [step, setStep] = useState(0),
    [welcome, setWelcome] = useState(false),
    [status, setStatus] = useState<'locating' | 'located' | 'waiting' | 'missing'>('locating'),
    [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [records, setRecords] = useState<
    Array<{ training: { id: string; updatedAt: number; state: string }; evaluation: unknown }>
  >([]);
  const [recordsOwner, setRecordsOwner] = useState('');
  const [recordsState, setRecordsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) {
      setPortalHost(null);
      return;
    }
    const update = () => {
      const node = document.querySelector<HTMLElement>('[data-training-guide-host]');
      setPortalHost((previous) => (previous === node ? previous : node));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, [open]);
  const storageKey = `teacherlab-guide-v1:${account?.ownerId ?? 'guest'}`;
  const steps = STEPS.filter(
    (item) =>
      !('admin' in item) ||
      account?.adminAccess?.isOwner ||
      Boolean(account?.adminAccess?.permissions.length),
  );
  const current = steps[Math.min(step, steps.length - 1)];
  function remember() {
    try {
      localStorage.setItem(storageKey, 'seen');
    } catch {
      /* Guide remains usable without browser storage. */
    }
    setWelcome(false);
  }
  useEffect(() => {
    if (loading) return;
    try {
      setWelcome(localStorage.getItem(storageKey) !== 'seen');
    } catch {
      setWelcome(true);
    }
  }, [storageKey, loading]);
  const needsTraining = ['room', 'emergency', 'voice', 'feedback', 'evaluation', 'review'].includes(
    current.id,
  );
  const reviewing = current.id === 'review';
  useEffect(() => {
    if (!open || !needsTraining || !account?.authenticated) {
      setRecords([]);
      setRecordsState('idle');
      return;
    }
    const controller = new AbortController();
    const ownerId = account.ownerId;
    setRecordsState('loading');
    setRecordsOwner(ownerId);
    void fetch('/api/training/records', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setRecords(data.records ?? []);
          setRecordsState('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRecords([]);
          setRecordsState('error');
        }
      });
    return () => controller.abort();
  }, [open, needsTraining, reviewing, account?.authenticated, account?.ownerId, pathname]);
  useEffect(() => {
    if (!open || loading) return;
    setStatus('locating');
    if (
      needsTraining &&
      account?.authenticated &&
      (recordsOwner !== account.ownerId || recordsState === 'idle' || recordsState === 'loading')
    )
      return;
    let targetName = current.target;
    let href: string = current.href;
    let waiting = false;
    if (needsTraining) {
      const routeId = pathname.match(/^\/(?:classroom|eval)\/training\/([^/]+)$/)?.[1];
      const available = records.filter(
        (record) =>
          /^[a-zA-Z0-9-]{1,80}$/.test(record.training.id) &&
          (!reviewing || Boolean(record.evaluation)) &&
          (!['room', 'voice'].includes(current.id) ||
            record.training.state === 'created' ||
            (MESSAGEABLE_STATES as readonly string[]).includes(record.training.state)),
      );
      const selected =
        available.find((record) => record.training.id === routeId) ??
        [...available].sort((a, b) => b.training.updatedAt - a.training.updatedAt)[0];
      if (selected) {
        href = `/${reviewing ? 'eval' : 'classroom'}/training/${selected.training.id}`;
      } else {
        href = reviewing ? '/?training=records#training' : '/';
        targetName = reviewing ? 'records' : 'start';
        waiting = true;
      }
    }
    const url = new URL(href, window.location.origin);
    const queryCorrect =
      ['scenario', 'records', 'events'].includes(current.id) || (waiting && reviewing)
        ? new URLSearchParams(window.location.search).get('training') ===
          url.searchParams.get('training')
        : true;
    if (window.location.pathname !== url.pathname || !queryCorrect)
      router.push(href, { scroll: false });
    let highlighted: HTMLElement | null = null;
    const opened: HTMLDetailsElement[] = [];
    let stopped = false;
    let settingsApplied = false;
    let positionTimer: ReturnType<typeof setTimeout> | undefined;
    const locate = () => {
      if (stopped || window.location.pathname !== url.pathname) return;
      if (url.pathname === '/') {
        window.dispatchEvent(new Event('teacherlab-guide-training'));
        if (!settingsApplied && document.querySelector('[data-training-guide="composer"]')) {
          const permission = account?.adminAccess?.permissions ?? [];
          const section =
            current.id === 'settings'
              ? 'general'
              : current.id === 'admin'
                ? account?.adminAccess?.isOwner ||
                  permission.some((value) =>
                    ['scenarios.manage', 'trainings.audit', 'references.inspect'].includes(value),
                  )
                  ? 'training-admin'
                  : permission.includes('people.manage')
                    ? 'people'
                    : permission.includes('models.manage')
                      ? 'platform-models'
                      : 'general'
                : null;
          settingsApplied = !window.dispatchEvent(
            new CustomEvent('teacherlab-guide-settings', { detail: section, cancelable: true }),
          );
        }
      }
      const element = document.querySelector<HTMLElement>(`[data-training-guide="${targetName}"]`);
      if (
        !element ||
        !element.getClientRects().length ||
        element.getAttribute('aria-hidden') === 'true'
      )
        return;
      if (element === highlighted && element.classList.contains('teacherlab-guide-highlight'))
        return;
      highlighted?.classList.remove('teacherlab-guide-highlight');
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement && !parent.open) {
          parent.open = true;
          opened.push(parent);
        }
      }
      highlighted = element;
      element.classList.add('teacherlab-guide-highlight');
      element.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
      setStatus(waiting ? 'waiting' : 'located');
      if (positionTimer) clearTimeout(positionTimer);
      positionTimer = setTimeout(() => {
        if (element.isConnected) {
          const rect = element.getBoundingClientRect();
          setPlacement(rect.top + rect.height / 2 > window.innerHeight / 2 ? 'top' : 'bottom');
        }
      }, 350);
    };
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(locate, 200);
    locate();
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!highlighted) setStatus(waiting ? 'waiting' : 'missing');
    }, 8000);
    return () => {
      stopped = true;
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(timeout);
      if (positionTimer) clearTimeout(positionTimer);
      highlighted?.classList.remove('teacherlab-guide-highlight');
      for (const item of opened) item.open = false;
      if (settingsApplied && ['settings', 'admin'].includes(current.id))
        window.dispatchEvent(new CustomEvent('teacherlab-guide-settings', { detail: null }));
    };
  }, [
    open,
    current.id,
    current.target,
    current.href,
    pathname,
    loading,
    needsTraining,
    reviewing,
    records,
    recordsState,
    recordsOwner,
    account?.ownerId,
    account?.authenticated,
    account?.adminAccess,
    router,
  ]);
  function start() {
    remember();
    setStep(0);
    setOpen(true);
  }
  return (
    <>
      {!open && (
        <div className="teacherlab-guide-entry">
          {welcome && pathname === '/' && !loading && (
            <aside className="teacherlab-guide-welcome">
              <strong>{t('teacherlab.guide.welcomeTitle')}</strong>
              <p>{t('teacherlab.guide.welcomeText')}</p>
              <div>
                <Button size="sm" onClick={start}>
                  {t('teacherlab.guide.start')}
                </Button>
                <Button size="sm" variant="ghost" onClick={remember}>
                  {t('teacherlab.guide.later')}
                </Button>
              </div>
            </aside>
          )}
          <Button variant="outline" className="rounded-full shadow-sm" onClick={start}>
            <BookOpen size={16} />
            {t('teacherlab.guide.title')}
          </Button>
        </div>
      )}
      <Dialog
        open={open}
        modal={false}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) remember();
        }}
      >
        <DialogContent
          portalContainer={portalHost}
          className="teacherlab-guide-panel"
          data-placement={placement}
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <header className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-primary">
              {t('teacherlab.guide.title')} · {Math.min(step + 1, steps.length)}/{steps.length}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t('teacherlab.guide.close')}
              onClick={() => {
                setOpen(false);
                remember();
              }}
            >
              <X size={16} />
            </Button>
          </header>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
          <DialogTitle className="text-lg">
            {t(`teacherlab.guide.steps.${current.id}.title`)}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line text-sm leading-7">
            {t(`teacherlab.guide.steps.${current.id}.text`)}
          </DialogDescription>
          <div className="flex flex-wrap gap-2">
            <details className="min-w-0 flex-1 text-xs">
              <summary className="cursor-pointer p-2 text-muted-foreground">
                {t('teacherlab.guide.contents')}
              </summary>
              <nav className="mt-2 grid max-h-44 gap-1 overflow-y-auto">
                {steps.map((item, index) => (
                  <button
                    key={item.id}
                    className="rounded p-2 text-left hover:bg-muted"
                    aria-current={index === step ? 'step' : undefined}
                    onClick={() => setStep(index)}
                  >
                    {index + 1}. {t(`teacherlab.guide.steps.${item.id}.title`)}
                  </button>
                ))}
              </nav>
            </details>
          </div>
          <p role="status" className="text-xs leading-5 text-primary">
            {t(
              status === 'waiting'
                ? reviewing
                  ? 'teacherlab.guide.needEvaluation'
                  : 'teacherlab.guide.needTraining'
                : status === 'missing'
                  ? 'teacherlab.guide.targetMissing'
                  : status === 'locating'
                    ? 'teacherlab.guide.autoLocating'
                    : 'teacherlab.guide.located',
            )}
          </p>
          <footer className="flex items-center justify-between gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
            >
              <ArrowLeft size={14} />
              {t('teacherlab.guide.previous')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (step === steps.length - 1) {
                  remember();
                  setOpen(false);
                } else setStep((value) => value + 1);
              }}
            >
              {t(step === steps.length - 1 ? 'teacherlab.guide.finish' : 'teacherlab.guide.next')}
              <ArrowRight size={14} />
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </>
  );
}
