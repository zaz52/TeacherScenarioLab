'use client';

import { MotionSurface } from '@/components/ui/site-motion';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Settings, Boxes, CreditCard, GraduationCap, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useAgentRuntimeAvailable } from '@/lib/hooks/use-agent-runtime-available';
import { settingsSections } from '@/lib/model-settings/shape';
import { useModelSettingsView } from '@/lib/model-settings/use-model-settings';
import { cn } from '@/lib/utils';
import { GeneralSettings } from './general-settings';
import { SkillSettings } from './skill-settings';
import { TokenPlanSettings } from './token-plan-settings';
import { CourseModelMap } from './models';
import {
  ModelServicesPanel,
  SERVICE_TABS,
  SERVICE_TAB_DESCRIPTIONS,
  TAB_CAPABILITY,
  type ServiceTab,
} from './model-services';
import { ServerSettingsGate } from './server-settings';
import type { SettingsSection } from '@/lib/types/settings';
import { AccountPanel } from '@/components/account/account-panel';
import { useAccount } from '@/components/account/account-provider';
import { PeopleSettings } from './people-settings';
import { MailSettings } from './mail-settings';
import { UserTrainingModels } from './user-training-models';
import TrainingAdmin from './training-admin';
import { ModelCenter as TrainingModelCenter } from './training-model-center';
import { hasAdminPermission } from '@/lib/training/admin-permissions';

export { SERVICE_TAB_LABELS, type ServiceTab } from './model-services';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: SettingsSection;
}

const NAV: { id: SettingsSection; icon: typeof Settings; label: string }[] = [
  { id: 'account', icon: Settings, label: 'teacherlab.account' },
  { id: 'token-plan', icon: CreditCard, label: 'settings.tokenPlan.nav' },
  { id: 'model-services', icon: Boxes, label: 'settings.modelServices.nav' },
  { id: 'course-models', icon: GraduationCap, label: 'settings.courseModels.nav' },
  { id: 'training-routing', icon: GraduationCap, label: 'teacherlab.trainingModels' },
  { id: 'training-admin', icon: Settings, label: 'teacherlab.scenarioAdmin' },
  { id: 'people', icon: Settings, label: 'teacherlab.people' },
  { id: 'mail', icon: Settings, label: 'teacherlab.mail' },
  { id: 'platform-models', icon: Boxes, label: 'teacherlab.platformModels' },
  { id: 'skills', icon: Sparkles, label: 'settings.skills.nav' },
  { id: 'general', icon: Settings, label: 'settings.systemSettings' },
];

/**
 * The settings dialog. Token Plan, Model Services and Course Model show the
 * workspace's model configuration: it lives on the server, and every change
 * is written there as it is made. Token Plan and Model Services are listed
 * only where they can change something (see `settingsSections`); Course
 * Model always is. Skills and General are the user's own.
 */
export function SettingsDialog({ open, onOpenChange, initialSection }: SettingsDialogProps) {
  const { t } = useI18n();
  const { account } = useAccount();
  const isAdmin = account?.roles.includes('admin') === true;
  const access = account?.adminAccess;
  const canUseAdminSection = (id: SettingsSection) => {
    if (!isAdmin) return false;
    if (id === 'mail') return access?.isOwner === true;
    if (id === 'people') return hasAdminPermission(access, 'people.manage');
    if (id === 'platform-models') return hasAdminPermission(access, 'models.manage');
    return ['scenarios.manage', 'trainings.audit', 'references.inspect'].some((permission) =>
      hasAdminPermission(
        access,
        permission as 'scenarios.manage' | 'trainings.audit' | 'references.inspect',
      ),
    );
  };

  // Navigation
  const [requestedSection, setActiveSection] = useState<SettingsSection>('account');
  // Skills are served by the agent runtime (`/api/agent/skills` 404s without
  // it), so the section is offered only once the server says the runtime is
  // available. Until then — and on a deployment without it — the item is
  // hidden, and a request to open it lands on the first section instead.
  const skillsAvailable = useAgentRuntimeAvailable();
  // Until the model settings are read, every section is listed; each one
  // shows its own loading state.
  const modelView = useModelSettingsView();
  const sections = modelView ? settingsSections(modelView) : null;
  const serviceTabs = sections
    ? SERVICE_TABS.filter((tab) => sections.modelServices.includes(TAB_CAPABILITY[tab]))
    : SERVICE_TABS;
  const listed = (id: SettingsSection) =>
    !NAV.some((item) => item.id === id)
      ? false
      : ['training-admin', 'people', 'mail', 'platform-models'].includes(id)
        ? canUseAdminSection(id)
        : id === 'skills'
          ? skillsAvailable
          : id === 'token-plan'
            ? !sections || sections.tokenPlan
            : id === 'model-services'
              ? serviceTabs.length > 0
              : true;
  const nav = NAV.filter(({ id }) => listed(id));
  // A section that is not listed (asked for, or the default) lands on the first one.
  const activeSection = listed(requestedSection) ? requestedSection : nav[0].id;
  // 「模型服务」分区内的服务 tab（沿用旧一级分区值）
  const [requestedTab, setServiceTab] = useState<ServiceTab>('providers');
  const serviceTab = serviceTabs.includes(requestedTab) ? requestedTab : serviceTabs[0];

  // Navigate to initialSection when dialog opens
  useEffect(() => {
    if (open && initialSection) {
      if (SERVICE_TABS.includes(initialSection as ServiceTab)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync service tab from legacy section value
        setServiceTab(initialSection as ServiceTab);
        setActiveSection('model-services');
      } else {
        setActiveSection(initialSection);
      }
    }
  }, [open, initialSection]);

  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(192);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { startX, startWidth } = resizeRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(120, Math.min(360, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Get header content based on section
  const getHeaderContent = () => {
    switch (activeSection) {
      case 'model-services':
        return (
          <div>
            <h2 className="text-lg font-semibold">{t('settings.modelServices.nav')}</h2>
            <p className="text-xs text-muted-foreground">
              {t(SERVICE_TAB_DESCRIPTIONS[serviceTab])}
            </p>
          </div>
        );
      case 'course-models':
        return <h2 className="text-lg font-semibold">{t('settings.courseModels.nav')}</h2>;
      case 'general':
        return <h2 className="text-lg font-semibold">{t('settings.systemSettings')}</h2>;
      case 'skills':
        return (
          <>
            <Sparkles className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t('settings.skills.title')}</h2>
          </>
        );
      case 'token-plan':
        return <h2 className="text-lg font-semibold">{t('settings.tokenPlan.nav')}</h2>;
      default:
        return (
          <h2 className="text-lg font-semibold">
            {t(NAV.find((item) => item.id === activeSection)?.label ?? 'settings.title')}
          </h2>
        );
    }
  };

  const fillsHeight = activeSection === 'model-services' || activeSection === 'course-models';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-training-guide="settings-panel"
        data-training-guide-host=""
        className="home-settings-dialog h-[85vh] p-0 gap-0 block max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t('settings.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('settings.description')}</DialogDescription>
        {/* Below `sm` the nav becomes a strip above the panel. */}
        <div className="teacherlab-settings-shell flex h-full flex-col overflow-hidden sm:flex-row">
          <label className="admin-mobile-nav">
            <Settings size={18} className="shrink-0 text-muted-foreground" />
            <select
              aria-label={t('teacherlab.adminUi.chooseSection')}
              value={activeSection}
              onChange={(event) => setActiveSection(event.target.value as SettingsSection)}
            >
              {nav.map(({ id, label }) => (
                <option key={id} value={id}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          {/* Left Sidebar - Navigation */}
          <div
            className="admin-desktop-nav flex-shrink-0 bg-muted/20 sm:w-[var(--settings-nav-width)] sm:space-y-1 sm:overflow-y-auto sm:p-3"
            style={{ '--settings-nav-width': `${sidebarWidth}px` } as React.CSSProperties}
          >
            <div className="mb-4 px-3 pt-2">
              <p className="text-sm font-semibold">TeacherScenarioLab</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('teacherlab.adminUi.settingsScope')}
              </p>
            </div>
            {nav.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                data-testid={`settings-nav-${id}`}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex shrink-0 items-center gap-3 whitespace-nowrap px-3 py-2 text-sm rounded-lg transition-colors text-left min-w-0 sm:w-full sm:whitespace-normal',
                  activeSection === id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(label)}</span>
              </button>
            ))}
          </div>

          {/* Sidebar resize handle */}
          <div
            onMouseDown={(e) => handleResizeStart(e)}
            className="hidden flex-shrink-0 w-[5px] cursor-col-resize group sm:flex justify-center"
          >
            <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
          </div>

          {/* Right - Configuration Panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b p-4 sm:p-5">
              <div className="min-w-0">{getHeaderContent()}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.close')}
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <MotionSurface
              motionKey={activeSection}
              className={cn(
                'min-w-0 overflow-x-hidden p-4 sm:p-6',
                fillsHeight ? 'flex min-h-0 flex-1 flex-col pt-3' : 'flex-1 overflow-y-auto',
              )}
            >
              {activeSection === 'account' && <AccountPanel />}
              {activeSection !== 'account' &&
                activeSection !== 'general' &&
                !account?.authenticated && <AccountPanel />}
              {account?.authenticated && (
                <>
                  {activeSection === 'people' && canUseAdminSection('people') && <PeopleSettings />}
                  {activeSection === 'mail' && canUseAdminSection('mail') && <MailSettings />}
                  {activeSection === 'training-admin' && canUseAdminSection('training-admin') && (
                    <TrainingAdmin />
                  )}
                  {activeSection === 'platform-models' && canUseAdminSection('platform-models') && (
                    <TrainingModelCenter view="overview" embedded />
                  )}
                  {activeSection === 'training-routing' && <UserTrainingModels />}
                  {activeSection === 'general' && <GeneralSettings />}

                  {activeSection === 'skills' && <SkillSettings />}

                  {activeSection === 'token-plan' && (
                    <ServerSettingsGate>
                      {(view, apply) => <TokenPlanSettings view={view} apply={apply} />}
                    </ServerSettingsGate>
                  )}

                  {activeSection === 'course-models' && (
                    <ServerSettingsGate>
                      {(view, apply) => (
                        <CourseModelMap
                          view={view}
                          apply={apply}
                          onManageProviders={() => {
                            setServiceTab('providers');
                            setActiveSection('model-services');
                          }}
                        />
                      )}
                    </ServerSettingsGate>
                  )}

                  {activeSection === 'model-services' && (
                    <ServerSettingsGate>
                      {(view, apply) => (
                        <ModelServicesPanel
                          view={view}
                          apply={apply}
                          tabs={serviceTabs}
                          tab={serviceTab}
                          onTabChange={setServiceTab}
                        />
                      )}
                    </ServerSettingsGate>
                  )}
                </>
              )}
              {activeSection === 'general' && !account?.authenticated && <GeneralSettings />}
            </MotionSurface>

            {/* Footer: every change is saved as it is made; only close here. */}
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t bg-muted/30">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {t('settings.close')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
