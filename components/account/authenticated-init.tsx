'use client';
import { useAccount } from './account-provider';
import { AgentRegistryInit } from '@/components/agent-registry-init';
import { ModelSettingsInit } from '@/components/model-settings-init';
import { StorageHealthNotice } from '@/components/storage-health-notice';
import { ProSwapWatcher } from '@/components/workbench/ProSwapWatcher';
export function AuthenticatedInit() {
  const { account } = useAccount();
  if (!account?.authenticated) return null;
  return (
    <>
      <ModelSettingsInit />
      <AgentRegistryInit />
      <ProSwapWatcher />
      <StorageHealthNotice />
    </>
  );
}
