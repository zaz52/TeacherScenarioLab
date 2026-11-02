'use client';
import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import './admin-console.css';

export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <header className="admin-heading">
      <div className="min-w-0">
        <p className="admin-brand">
          <ShieldCheck size={15} />
          TeacherScenarioLab · {t('teacherlab.adminUi.console')}
        </p>
        <h1>{title}</h1>
        <p className="admin-description">{description}</p>
      </div>
      {action && <div className="admin-actions">{action}</div>}
    </header>
  );
}
export function AdminPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p className="admin-description">{description}</p>}
        </div>
        {action && <div className="admin-actions">{action}</div>}
      </div>
      {children}
    </section>
  );
}
export function AdminNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p className={`admin-notice${error ? ' admin-error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
