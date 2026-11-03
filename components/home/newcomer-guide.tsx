'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, ArrowLeft, ArrowRight, LocateFixed, X } from 'lucide-react';
import { useAccount } from '@/components/account/account-provider';
import { useI18n } from '@/lib/hooks/use-i18n';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import './newcomer-guide.css';

const STEPS = [
  { id: 'welcome', target: 'composer', href: '/' },
  { id: 'account', target: 'settings', href: '/login' },
  { id: 'scenario', target: 'scenarios', href: '/?training=hall#training' },
  { id: 'practice', target: 'practice', href: '/' },
  { id: 'models', target: 'models', href: '/' },
  { id: 'opening', target: 'composer', href: '/' },
  { id: 'room', target: 'dialogue', href: '/' },
  { id: 'voice', target: 'dialogue', href: '/' },
  { id: 'feedback', target: 'support', href: '/' },
  { id: 'evaluation', target: 'evaluation', href: '/' },
  { id: 'review', target: 'review', href: '/?training=records#training' },
  { id: 'records', target: 'history', href: '/?training=records#training' },
  { id: 'events', target: 'history', href: '/?training=events#training' },
  { id: 'references', target: 'knowledge', href: '/courseware/references' },
  { id: 'settings', target: 'settings', href: '/' },
  { id: 'admin', target: 'settings', href: '/', admin: true },
];
export function NewcomerGuide() {
  const { account, loading } = useAccount();
  const { t } = useI18n();
  const pathname = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [step, setStep] = useState(0),
    [welcome, setWelcome] = useState(false),
    [locating, setLocating] = useState(''),
    [located, setLocated] = useState(false);
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
    setOpen(false);
    setStep(0);
  }, [storageKey, loading]);
  useEffect(() => {
    setLocated(false);
    setLocating('');
  }, [step]);
  useEffect(() => {
    if (!open) setLocating('');
  }, [open]);
  useEffect(() => {
    if (!locating) return;
    let target: HTMLElement | null = null;
    let tries = 0;
    let clear: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      target = document.querySelector<HTMLElement>(`[data-training-guide="${locating}"]`);
      if (target && target.getClientRects().length) {
        clearInterval(timer);
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'center',
        });
        target.classList.add('teacherlab-guide-highlight');
        setLocated(true);
        clear = setTimeout(() => {
          target?.classList.remove('teacherlab-guide-highlight');
          setLocating('');
        }, 5500);
      } else if (++tries >= 15) {
        clearInterval(timer);
        setLocating('');
      }
    }, 100);
    return () => {
      clearInterval(timer);
      if (clear) clearTimeout(clear);
      target?.classList.remove('teacherlab-guide-highlight');
    };
  }, [locating, pathname]);
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
          className="teacherlab-guide-panel"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocating('');
                requestAnimationFrame(() => setLocating(current.target));
                const target = document.querySelector<HTMLElement>(
                  `[data-training-guide="${current.target}"]`,
                );
                if (!target || !target.getClientRects().length) {
                  if (current.href) router.push(current.href);
                }
              }}
            >
              <LocateFixed size={14} />
              {t('teacherlab.guide.locate')}
            </Button>
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
          {located && (
            <p role="status" className="text-xs text-primary">
              {t('teacherlab.guide.located')}
            </p>
          )}
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
