// Original Next route handlers; reviewed against the tracked training route tree.
export const trainingRoutes = [
  {
    path: '/api/training/accounts/logout',
    load: () => import('../../app/api/training/accounts/logout/route.ts'),
  },
  {
    path: '/api/training/accounts/me',
    load: () => import('../../app/api/training/accounts/me/route.ts'),
  },
  {
    path: '/api/training/accounts',
    load: () => import('../../app/api/training/accounts/route.ts'),
  },
  {
    path: '/api/training/admin/models',
    load: () => import('../../app/api/training/admin/models/route.ts'),
  },
  {
    path: '/api/training/admin/references',
    load: () => import('../../app/api/training/admin/references/route.ts'),
  },
  {
    path: '/api/training/admin/scenarios/[scenarioId]/versions/[version]/publish',
    load: () =>
      import('../../app/api/training/admin/scenarios/[scenarioId]/versions/[version]/publish/route.ts'),
  },
  {
    path: '/api/training/admin/scenarios/[scenarioId]/versions/[version]',
    load: () =>
      import('../../app/api/training/admin/scenarios/[scenarioId]/versions/[version]/route.ts'),
  },
  {
    path: '/api/training/admin/scenarios/import',
    load: () => import('../../app/api/training/admin/scenarios/import/route.ts'),
  },
  {
    path: '/api/training/admin/scenarios',
    load: () => import('../../app/api/training/admin/scenarios/route.ts'),
  },
  {
    path: '/api/training/admin/trainings/[id]',
    load: () => import('../../app/api/training/admin/trainings/[id]/route.ts'),
  },
  {
    path: '/api/training/admin/trainings',
    load: () => import('../../app/api/training/admin/trainings/route.ts'),
  },
  { path: '/api/training/claim', load: () => import('../../app/api/training/claim/route.ts') },
  { path: '/api/training/events', load: () => import('../../app/api/training/events/route.ts') },
  { path: '/api/training/records', load: () => import('../../app/api/training/records/route.ts') },
  {
    path: '/api/training/references/[id]',
    load: () => import('../../app/api/training/references/[id]/route.ts'),
  },
  {
    path: '/api/training/references',
    load: () => import('../../app/api/training/references/route.ts'),
  },
  {
    path: '/api/training/references/validate',
    load: () => import('../../app/api/training/references/validate/route.ts'),
  },
  {
    path: '/api/training/scenarios/[scenarioId]/versions/[version]',
    load: () => import('../../app/api/training/scenarios/[scenarioId]/versions/[version]/route.ts'),
  },
  {
    path: '/api/training/scenarios',
    load: () => import('../../app/api/training/scenarios/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/disclosures',
    load: () => import('../../app/api/training/trainings/[id]/disclosures/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/evaluate',
    load: () => import('../../app/api/training/trainings/[id]/evaluate/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/evaluation',
    load: () => import('../../app/api/training/trainings/[id]/evaluation/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/events',
    load: () => import('../../app/api/training/trainings/[id]/events/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/messages',
    load: () => import('../../app/api/training/trainings/[id]/messages/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/reply',
    load: () => import('../../app/api/training/trainings/[id]/reply/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]',
    load: () => import('../../app/api/training/trainings/[id]/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/start',
    load: () => import('../../app/api/training/trainings/[id]/start/route.ts'),
  },
  {
    path: '/api/training/trainings/[id]/transition',
    load: () => import('../../app/api/training/trainings/[id]/transition/route.ts'),
  },
  {
    path: '/api/training/trainings',
    load: () => import('../../app/api/training/trainings/route.ts'),
  },
];
