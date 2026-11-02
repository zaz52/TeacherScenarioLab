'use client';

import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  useDeferredValue,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp,
  Menu,
  Plus,
  MoreHorizontal,
  Paperclip,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  Copy,
  Folder,
  FolderPlus,
  ImagePlus,
  Pencil,
  Trash2,
  Search,
  Settings,
  Sun,
  Moon,
  Monitor,
  ChevronUp,
  Upload,
  Sparkles,
  Atom,
  X,
  Presentation,
  Loader2,
} from 'lucide-react';
import '@/app/home-mobile.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HomeLibrary } from '@/components/home/home-library';
import { useAccount } from '@/components/account/account-provider';
import { TrainingHomeBlock } from './training-home-block';
import { useEpidemicComposer, EpidemicRolePill, EpidemicModelPill } from './epidemic-composer';
import { useMobileLayout } from '@/lib/adaptive/adaptive-provider';
import { installPageScrollBoundary } from '@/lib/adaptive/page-scroll-boundary';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/hooks/use-i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
import { createLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput, InputGroupButton } from '@/components/ui/input-group';
import { Textarea as UITextarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SettingsDialog } from '@/components/settings';
import { GenerationToolbar } from '@/components/generation/generation-toolbar';
import { AgentBar } from '@/components/agent/agent-bar';
import { useTheme } from '@/lib/hooks/use-theme';
import {
  courseGenerationUsable,
  requireModelCapabilities,
} from '@/lib/model-settings/capabilities';
import {
  RunApiError,
  discardGenerationRun,
  runApiErrorText,
} from '@/lib/generation-run-client/api';
import {
  RunStartRefusedError,
  startClassicRun,
  startDefinitelyRefused,
} from '@/lib/generation-run-client/start';
import {
  useCourseMaterials,
  type CourseMaterialMessage,
} from '@/lib/generation-run-client/use-course-materials';
import { useCourseMaterialCapabilities } from '@/lib/generation-run-client/use-course-material-capabilities';
import { useOwnerRuns } from '@/lib/generation-run-client/use-owner-runs';
import {
  courseRunHref,
  courseRunStatus,
  pendingCourseName,
  pendingCourseRuns,
  runsByCourse,
  type CourseRunStatus,
} from '@/lib/generation-run-client/course-card';
import type { RunSnapshot } from '@/lib/generation-run-client/types';
import { CourseRunStatusLabel } from '@/components/generation/course-run-status-label';
import { useModelCapabilities } from '@/lib/model-settings/use-model-settings';
import {
  StageListItem,
  listStages,
  deleteStageData,
  renameStage,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  setStageFolder,
  FolderNameError,
  LIBRARY_CHANGED_EVENT,
  type DeleteFolderMode,
} from '@/lib/utils/stage-storage';
import type { FolderRecord } from '@/lib/types/folder';
import { displayNameWidth, FOLDER_NAME_MAX_WIDTH } from '@/lib/utils/folder-name-validation';
import { FolderCard } from '@/components/discovery/folder-card';
import { NewFolderDialog } from '@/components/discovery/folder-dialogs';
import { MoveToFolderMenu } from '@/components/discovery/move-to-folder-menu';
import { LibrarySkeleton } from '@/components/discovery/library-skeleton';
import { SlideThumbnail } from '@/components/slide-renderer/SlideThumbnail';
import type { Slide } from '@openmaic/dsl';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCourseThumbnails } from '@/lib/hooks/use-course-thumbnails';
import { ThumbnailSkeleton } from '@/components/discovery/thumbnail-skeleton';
import { useNearViewport } from '@/lib/hooks/use-near-viewport';
import { SpeechButton } from '@/components/audio/speech-button';
import { useImportClassroom } from '@/lib/import/use-import-classroom';
import {
  isProWorkbenchEnabled,
  isPptxImportEnabled,
  shouldShowVocationalTestUi,
} from '@/lib/config/feature-flags';
import { useImportPptx } from '@/lib/import/use-import-pptx';
import { InteractiveModeButton } from '@/components/generation/interactive-mode-button';
import { ProBadge } from '@/components/workbench/ProBadge';
import { arrivedByProSwap, startProSwap } from '@/lib/workbench/pro-swap';
import {
  readLastWorkspaceSessionId,
  workspaceResumeHref,
} from '@/lib/workbench/workspace-session-memory';

const log = createLogger('Home');

const RECENT_OPEN_STORAGE_KEY = 'recentClassroomsOpen';
const INTERACTIVE_MODE_STORAGE_KEY = 'interactiveModeEnabled';

// PPTX import is still scaffolding: `useImportPptx` has no `onImported` consumer
// yet, so the flow only logs the parsed slides. Hide the entry point behind a
// flag until it's wired end-to-end, so the UI doesn't expose a no-op button.
const PPTX_IMPORT_ENABLED = isPptxImportEnabled();

/** The configured runtime probe result, retained across client navigations. */
let workbenchRuntimeCache: boolean | null = null;

interface FormState {
  requirement: string;
  interactiveMode: boolean;
  vocationalTestMode: boolean;
}

const initialFormState: FormState = {
  requirement: '',
  interactiveMode: false,
  vocationalTestMode: false,
};

function HomePage({ trainingEntry }: { trainingEntry: boolean }) {
  const { account } = useAccount();
  const [isTraining, setIsTraining] = useState(trainingEntry);
  const training = useEpidemicComposer(isTraining);
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const mobile = useMobileLayout();
  useEffect(() => {
    if (!mobile) return;
    return installPageScrollBoundary(document);
  }, [mobile]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [mobileMaterialsOpen, setMobileMaterialsOpen] = useState(false);
  const [materialNotice, setMaterialNotice] = useState<string | null>(null);
  const materialNoticeVersion = useRef(0);
  const clearMaterialNotice = useCallback(() => {
    materialNoticeVersion.current += 1;
    setMaterialNotice(null);
  }, []);
  const [mobileViewMotion, setMobileViewMotion] = useState<'forward' | 'back' | null>(null);
  const mobileOptionsContentRef = useRef<HTMLDivElement>(null);
  const mobileOptionsTitleRef = useRef<HTMLHeadingElement>(null);
  const openMobileOptions = () => {
    setMobileViewMotion(null);
    setMobileMaterialsOpen(false);
    setMobileOptionsOpen(true);
  };
  const openMobileMaterials = () => {
    setMobileViewMotion(mobileOptionsOpen ? 'forward' : null);
    setMobileMaterialsOpen(true);
    setMobileOptionsOpen(true);
    requestAnimationFrame(() => mobileOptionsTitleRef.current?.focus());
  };
  const returnToMobileOptions = () => {
    clearMaterialNotice();
    setMobileViewMotion('back');
    setMobileMaterialsOpen(false);
    requestAnimationFrame(() => {
      mobileOptionsContentRef.current
        ?.querySelector<HTMLButtonElement>(
          '[data-testid="course-material-pill"], [data-testid="course-material-button"]',
        )
        ?.focus();
    });
  };
  // Do not replay the classic hero's entrance after the route handoff already
  // carried the lockup and composer into place. The entrance is CSS, not a
  // JS-driven animation, so the server-rendered hero is painted (and fades in)
  // before the page's scripts have loaded instead of staying invisible.
  const [swapped] = useState(arrivedByProSwap);
  const heroEnter = (classes: string) =>
    swapped
      ? undefined
      : `animate-in fill-mode-both ease-out motion-reduce:animate-none ${classes}`;
  const showVocationalTestUi = shouldShowVocationalTestUi();
  const workbenchBuildEnabled = isProWorkbenchEnabled();
  const [workbenchRuntimeEnabled, setWorkbenchRuntimeEnabled] = useState(
    workbenchRuntimeCache === true,
  );
  useEffect(() => {
    if (!workbenchBuildEnabled || workbenchRuntimeCache !== null) return;
    let cancelled = false;
    fetch('/api/agent/runtime')
      .then((response) => {
        // Not cached: a 401 before the access code is accepted is not an answer.
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((body) => {
        workbenchRuntimeCache = body?.enabled === true;
        if (!cancelled) setWorkbenchRuntimeEnabled(workbenchRuntimeCache);
      })
      .catch(() => {
        // A failed probe keeps the entry hidden and allows a later visit to retry.
      });
    return () => {
      cancelled = true;
    };
  }, [workbenchBuildEnabled]);
  const workbenchEntryEnabled = workbenchBuildEnabled && workbenchRuntimeEnabled;
  const enterWorkbench = () => {
    const href = workspaceResumeHref(readLastWorkspaceSessionId());
    startProSwap(href, (next) => router.push(next));
  };
  useEffect(() => {
    if (workbenchEntryEnabled) router.prefetch('/workspace');
  }, [router, workbenchEntryEnabled]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    import('@/lib/types/settings').SettingsSection | undefined
  >(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section =
      params.get('settings') ?? (params.get('training') === 'account' ? 'account' : null);
    if (section) {
      setSettingsSection(section as import('@/lib/types/settings').SettingsSection);
      setSettingsOpen(true);
    }
  }, []);
  const openSettings = (section: import('@/lib/types/settings').SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  // Generation needs the course slots it resolves (outline, content, actions)
  // to name a model, whether or not the llm root does (the server's view;
  // while it cannot be read the server has the last word).
  const hasUsableProvider = courseGenerationUsable(useModelCapabilities());
  const [recentOpen, setRecentOpen] = useState(true);
  const persistRecentOpen = (next: boolean) => {
    setRecentOpen(next);
    try {
      localStorage.setItem(RECENT_OPEN_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  // Hydrate client-only state after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_OPEN_STORAGE_KEY);
      if (saved !== null) setRecentOpen(saved !== 'false');
    } catch {
      /* localStorage unavailable */
    }
    try {
      const savedInteractiveMode = localStorage.getItem(INTERACTIVE_MODE_STORAGE_KEY);
      if (savedInteractiveMode === 'true') {
        setForm((prev) => ({ ...prev, interactiveMode: true }));
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const [themeOpen, setThemeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True while the Generate click starts the run. Doubles as the guard flag
  // that freezes the course material set for the duration of the start and as
  // the switch that disables the toolbar's add/remove/Retry affordances, so
  // the run is always started from a set that cannot change under it.
  const [preparingGenerate, setPreparingGenerate] = useState(false);
  const [classrooms, setClassrooms] = useState<StageListItem[]>([]);
  // First-slide thumbnails load lazily, per card near the viewport: the list
  // renders as soon as /api/stages answers, never behind every course's
  // document and media.
  const { thumbnails, requestThumbnail, retainThumbnails } = useCourseThumbnails();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Course folders — device-local grouping. `currentFolderId === undefined`
  // is the root view (folders + unfiled courses); a folder id navigates into
  // that folder's course list. Searching flattens every course regardless of
  // folder and annotates each with its folder name.
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  // True once the initial classroom + folder loads resolve. Guards layout
  // selection so the hero does not flip between full-screen and compact as the
  // two async reads land (avoids a visible layout shift on first paint).
  const [hydrated, setHydrated] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const newFolderButtonRef = useRef<HTMLButtonElement>(null);
  // When set, the new-folder dialog is creating a folder AND moving this course
  // into it (entered via the move-menu's "new folder" entry).
  const [createAndMoveTarget, setCreateAndMoveTarget] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!themeOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [themeOpen]);

  const loadClassrooms = async () => {
    if (!account?.authenticated || isTraining) return;
    try {
      const list = await listStages();
      setClassrooms(list);
      retainThumbnails(new Set(list.map((c) => c.id)));
    } catch (err) {
      log.error('Failed to load classrooms:', err);
      toast.error('Persistence is unavailable. Saved classrooms could not be loaded.');
    }
  };

  // Courses being generated on the server: a card from the moment the run
  // starts, live through the owner's run stream.
  const { runs, forget: forgetRun } = useOwnerRuns({
    enabled: !!account?.authenticated && !isTraining,
    onCourseChanged: () => void loadClassrooms(),
  });

  const loadFolders = async () => {
    if (!account?.authenticated || isTraining) return;
    try {
      setFolders(await listFolders());
    } catch (err) {
      log.error('Failed to load folders:', err);
    }
  };

  // Capture the active folder when an import starts so the imported course
  // lands in that folder, not whichever folder is active when the async import
  // resolves (the user may have navigated away in the meantime).
  const importFolderRef = useRef<string | undefined>(undefined);
  const handleImportSuccess = async (importedStageId: string) => {
    const folderId = importFolderRef.current;
    importFolderRef.current = undefined;
    // File the imported course into the folder that was active when the
    // import began, before refreshing the list so the card appears in place.
    if (folderId) {
      try {
        await setStageFolder(importedStageId, folderId);
      } catch (err) {
        log.error('Failed to assign imported course to folder:', err);
        toast.error(t('classroom.moveFailed'));
      }
    }
    await loadClassrooms();
  };
  const { importing, fileInputRef, triggerFileSelect, handleFileChange } =
    useImportClassroom(handleImportSuccess);
  const triggerImport = () => {
    importFolderRef.current = currentFolderId;
    triggerFileSelect();
  };

  const {
    importing: pptxImporting,
    fileInputRef: pptxFileInputRef,
    triggerFileSelect: triggerPptxFileSelect,
    handleFileChange: handlePptxFileChange,
  } = useImportPptx();

  useEffect(() => {
    // Clear stale media store to prevent cross-course thumbnail contamination.
    // The store may hold tasks from a previously visited classroom whose elementIds
    // (gen_img_1, etc.) collide with other courses' placeholders.
    useMediaGenerationStore.getState().revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });

    // Read sessionStorage on the client only (avoids SSR hydration mismatch).
    // Both reads resolve before flipping `hydrated`, so the hero layout does
    // not thrash as each lands independently.
    void Promise.all([loadClassrooms(), loadFolders()]).finally(() => setHydrated(true));

    // Courses can arrive in the background (the one-way import of what this
    // browser stored before persistence moved to the server).
    const onLibraryChanged = () => {
      void Promise.all([loadClassrooms(), loadFolders()]);
    };
    window.addEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);

    return () => {
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onLibraryChanged);
    };
  }, [account?.authenticated, isTraining]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const confirmDelete = async (id: string) => {
    setPendingDeleteId(null);
    try {
      // A card whose course does not exist yet is its run: discarding the run
      // deletes it. Deleting a course ends its run.
      const pendingRun = runs.find((run) => run.id === id);
      if (pendingRun) {
        await discardGenerationRun(id);
        forgetRun(id);
        return;
      }
      await deleteStageData(id);
      await loadClassrooms();
    } catch (err) {
      log.error('Failed to delete classroom:', err);
      toast.error('Failed to delete classroom');
    }
  };

  const handleRename = async (id: string, newName: string) => {
    try {
      await renameStage(id, newName);
      setClassrooms((prev) => prev.map((c) => (c.id === id ? { ...c, name: newName } : c)));
    } catch (err) {
      log.error('Failed to rename classroom:', err);
      toast.error(t('classroom.renameFailed'));
    }
  };

  // ─── Folder handlers ────────────────────────────────────────────────
  const handleCreateFolder = async (name: string) => {
    const folder = await createFolder(name);
    setFolders((prev) => [...prev, folder]);
    // If this create came from the move-menu's "new folder" entry, move the
    // requesting course into the freshly created folder.
    if (createAndMoveTarget) {
      await handleMoveCourse(createAndMoveTarget, folder.id);
      setCreateAndMoveTarget(null);
    }
  };

  const handleRenameFolder =
    (folder: FolderRecord) =>
    async (newName: string): Promise<string | null> => {
      // Empty or unchanged input just exits editing without an error.
      const trimmed = newName.trim();
      if (!trimmed || trimmed === folder.name) return null;
      try {
        await renameFolder(folder.id, newName);
        setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, name: trimmed } : f)));
        return null;
      } catch (err) {
        if (err instanceof FolderNameError) {
          if (err.kind === 'duplicate') return t('classroom.folderNameExists');
          if (err.kind === 'tooLong')
            return t('classroom.folderWidth', {
              width: displayNameWidth(trimmed),
              max: FOLDER_NAME_MAX_WIDTH,
            });
          return t('classroom.folderNameHint');
        }
        log.error('Failed to rename folder:', err);
        return t('classroom.folderRenameFailed');
      }
    };

  const confirmDeleteFolder = async (folder: FolderRecord, mode: DeleteFolderMode) => {
    try {
      await deleteFolder(folder.id, mode);
      if (currentFolderId === folder.id) setCurrentFolderId(undefined);
    } catch (err) {
      log.error('Failed to delete folder:', err);
      toast.error(t('classroom.folderDeleteFailed'));
    } finally {
      // Always refresh authoritative state: in 'remove' mode a partial failure
      // may have durably deleted some courses before throwing, and the UI must
      // reflect that rather than leaving stale cards/counts behind.
      await Promise.all([loadFolders(), loadClassrooms()]);
    }
  };

  const handleMoveCourse = async (stageId: string, folderId: string | undefined) => {
    // Optimistic update for snappy UI; the persistence call follows.
    setClassrooms((prev) => prev.map((c) => (c.id === stageId ? { ...c, folderId } : c)));
    try {
      await setStageFolder(stageId, folderId);
    } catch (err) {
      log.error('Failed to move course:', err);
      toast.error(t('classroom.moveFailed'));
      // Revert on failure.
      await loadClassrooms();
    }
  };

  // From the move-menu's "new folder" entry: remember the course, then open the
  // folder dialog. The actual create+move happens in handleCreateFolder once the
  // name is confirmed. (A Radix DropdownMenu is modal, so the name input cannot
  // live inside it; the dialog is the focus surface.)
  const handleCreateAndMove = (stageId: string) => () => {
    setCreateAndMoveTarget(stageId);
    setNewFolderOpen(true);
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const filteredClassrooms = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) return classrooms;
    return classrooms.filter((c) => {
      const name = c.name?.toLowerCase() ?? '';
      const desc = c.description?.toLowerCase() ?? '';
      return name.includes(q) || desc.includes(q);
    });
  }, [classrooms, deferredSearchQuery]);

  // Folder-aware view model. Searching collapses the hierarchy: every matching
  // course is shown flat, annotated with its folder name. Otherwise the root
  // view shows folder tiles + unfiled courses, and a folder view shows only
  // that folder's members.
  const folderNameById = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const isSearching = deferredSearchQuery.trim().length > 0;
  // The course tiles rendered in the active view: search flattens everything;
  // a folder shows only its members; the root shows unfiled courses (folder
  // tiles are rendered separately above them).
  const visibleClassrooms = useMemo(() => {
    if (isSearching) return filteredClassrooms;
    if (currentFolderId) return filteredClassrooms.filter((c) => c.folderId === currentFolderId);
    return filteredClassrooms.filter(
      (c) => c.folderId === undefined || !folderNameById.has(c.folderId),
    );
  }, [filteredClassrooms, isSearching, currentFolderId, folderNameById]);
  const currentFolderClassrooms = useMemo(
    () => (currentFolderId ? classrooms.filter((c) => c.folderId === currentFolderId) : []),
    [classrooms, currentFolderId],
  );
  const courseCountByFolder = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of classrooms) {
      if (c.folderId) counts.set(c.folderId, (counts.get(c.folderId) ?? 0) + 1);
    }
    return counts;
  }, [classrooms]);
  // Up to 3 member course covers (first-slide thumbnails) per folder, for the
  // folder tile's cover stack. Members are ordered by updatedAt desc so the
  // frontmost cover is the most recently touched course. The members that
  // fill (or, not loaded yet, may fill) those 3 slots are the tile's cover
  // candidates: it loads their thumbnails while it is near the viewport, and a
  // member without a slide gives its slot to the next one.
  const folderCovers = useMemo(() => {
    const byFolder = new Map<string, { slides: Slide[]; candidates: StageListItem[] }>();
    for (const c of [...classrooms].sort((a, b) => b.updatedAt - a.updatedAt)) {
      if (!c.folderId) continue;
      const covers = byFolder.get(c.folderId) ?? { slides: [], candidates: [] };
      byFolder.set(c.folderId, covers);
      if (covers.candidates.length >= 3) continue;
      const slide = thumbnails[c.id];
      if (slide === null) continue;
      covers.candidates.push(c);
      if (slide) covers.slides.push(slide);
    }
    return byFolder;
  }, [classrooms, thumbnails]);
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  const listedStageIds = useMemo(() => new Set(classrooms.map((c) => c.id)), [classrooms]);
  const runByStageId = useMemo(() => runsByCourse(runs), [runs]);
  // Runs whose course is not in the library yet are cards of their own.
  const pendingRuns = useMemo(
    () => pendingCourseRuns(runs, listedStageIds),
    [runs, listedStageIds],
  );
  const showPendingRuns = !isSearching && currentFolderId === undefined;

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    try {
      if (field === 'interactiveMode')
        localStorage.setItem(INTERACTIVE_MODE_STORAGE_KEY, String(value));
    } catch {
      /* ignore */
    }
  };

  // Attached materials upload and extract at once; Generate waits for them.
  const courseMaterials = useCourseMaterials();
  const reportRemovedMaterials = useCallback(
    (message: string) => {
      setMaterialNotice(message);
      // Settings can change the parser while the material panel is unmounted.
      if (!(mobile && mobileOptionsOpen && mobileMaterialsOpen)) toast.error(message);
    },
    [mobile, mobileOptionsOpen, mobileMaterialsOpen],
  );
  useCourseMaterialCapabilities(
    courseMaterials.materials,
    courseMaterials.remove,
    reportRemovedMaterials,
    preparingGenerate,
  );
  const materialMessage = (message: CourseMaterialMessage) =>
    message.text ?? (message.key ? t(message.key, message.values) : '');

  const addCourseMaterials = async (files: File[]) => {
    // The set is frozen while a run is being started.
    if (preparingGenerate) return;
    const version = materialNoticeVersion.current;
    const refusal = await courseMaterials.add(files);
    if (version === materialNoticeVersion.current) {
      setMaterialNotice(refusal ? materialMessage(refusal) : null);
    }
  };

  const removeCourseMaterial = (id: string) => {
    if (preparingGenerate) return;
    courseMaterials.remove(id);
  };

  const handleGenerate = async () => {
    if (!account?.authenticated) {
      openSettings('account');
      return;
    }
    if (isTraining) {
      const id = await training.start(form.requirement);
      if (id) router.push(`/classroom/training/${id}`);
      return;
    }
    // No model/provider guard here: generation is gated by `canGenerate`
    // (requires a usable provider), and under the #580 invariant a usable
    // provider always has a concrete model. State A (no usable provider)
    // surfaces through the toolbar's single Configure-Provider affordance.
    if (preparingGenerate) return;
    if (!form.requirement.trim()) {
      setError(t('upload.requirementRequired'));
      return;
    }

    setError(null);

    // The set is frozen while the run starts (`preparingGenerate` makes add,
    // remove and Retry inert), from the ready materials in their order.
    setPreparingGenerate(true);
    // The run releases the materials it is started from once it is over.
    // Handed off before anything is awaited: a navigation in between must not
    // delete them under the run.
    const materialIds = courseMaterials.handOff();
    try {
      // Nothing is started from settings that could not be read.
      const capabilities = await requireModelCapabilities();
      if (!capabilities) throw new Error(t('generation.modelSettingsUnavailable'));
      // Nor from a material that went meanwhile: its chip shows it removed.
      if (materialIds.length > 0 && !(await courseMaterials.verify())) {
        throw new Error(t('toolbar.materialUnavailable'));
      }
      const run = await startClassicRun({
        requirement: form.requirement,
        materialIds,
        interactive: form.vocationalTestMode ? true : form.interactiveMode,
        taskEngine: form.vocationalTestMode,
        capabilities,
      });
      router.push(`/generation-preview?run=${encodeURIComponent(run.id)}`);
    } catch (err) {
      log.error('Error starting generation:', err);
      // Only a definitive refusal says no run holds them: they stay attached.
      // A lost answer may hide a run that releases them when it is over.
      if (!(err instanceof RunApiError) || startDefinitelyRefused(err)) {
        courseMaterials.takeBack(materialIds);
      }
      if (err instanceof RunStartRefusedError) {
        setError(t(err.reason, err.values));
      } else if (err instanceof RunApiError) {
        setError(runApiErrorText(err, t));
      } else {
        setError(err instanceof Error ? err.message : t('upload.generateFailed'));
      }
    } finally {
      // Unfreeze the set once prep settles (navigation unmounts this page, so
      // this is normally a no-op on the way out).
      setPreparingGenerate(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('classroom.today');
    if (diffDays === 1) return t('classroom.yesterday');
    if (diffDays < 7) return `${diffDays} ${t('classroom.daysAgo')}`;
    return date.toLocaleDateString();
  };

  // Generate waits for every attached material to be uploaded and extracted.
  const actionBusy = preparingGenerate || training.busy;
  const canGenerate = isTraining
    ? !!training.scenario && !training.loading && !training.busy
    : !!form.requirement.trim() && hasUsableProvider && courseMaterials.allReady;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canGenerate && !actionBusy) handleGenerate();
    }
  };

  useEffect(() => {
    if (!mobile) {
      setHistoryOpen(false);
      setMobileOptionsOpen(false);
      setMobileMaterialsOpen(false);
    }
  }, [mobile]);
  useEffect(() => {
    if (!mobileOptionsOpen) clearMaterialNotice();
  }, [mobileOptionsOpen, clearMaterialNotice]);
  useEffect(() => {
    const input = textareaRef.current;
    if (!input) return;
    if (!mobile) {
      input.style.height = '';
      return;
    }
    input.style.height = '48px';
    input.style.height = `${Math.min(144, Math.max(48, input.scrollHeight))}px`;
  }, [mobile, form.requirement]);

  const generationToolbar = (
    <GenerationToolbar
      materialView={mobile ? (mobileMaterialsOpen ? 'panel' : 'entry') : 'popover'}
      onMaterialOpen={mobile ? openMobileMaterials : undefined}
      courseMaterials={courseMaterials.materials}
      onCourseMaterialsAdd={(files) => void addCourseMaterials(files)}
      onCourseMaterialRemove={removeCourseMaterial}
      onCourseMaterialRetry={(id) => {
        if (!preparingGenerate) courseMaterials.retry(id);
      }}
      onPdfError={setMaterialNotice}
      materialNotice={materialNotice}
      onMaterialClose={clearMaterialNotice}
      materialsLocked={preparingGenerate}
      onSettingsOpen={(section) => {
        setSettingsSection(section);
        setSettingsOpen(true);
      }}
    />
  );

  return (
    <div
      data-testid="home-page"
      data-mobile={mobile}
      data-training={isTraining}
      className="home-page min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center p-4 pt-16 md:p-8 md:pt-16 overflow-x-hidden"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileChange}
        className="hidden"
      />
      {PPTX_IMPORT_ENABLED && (
        <input
          ref={pptxFileInputRef}
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={handlePptxFileChange}
          className="hidden"
        />
      )}
      {mobile && !isTraining && (
        <button
          type="button"
          data-testid="home-history-open"
          className="home-history-open"
          aria-label={t('classroom.recentClassrooms')}
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen(true)}
        >
          <Menu size={22} />
        </button>
      )}
      {/* Shared language, theme and desktop settings controls. */}
      <div
        ref={toolbarRef}
        className="home-top-tools fixed top-4 right-4 z-50 flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-2 py-1.5 rounded-full border border-gray-100/50 dark:border-gray-700/50 shadow-sm"
      >
        {/* Language Selector */}
        <LanguageSwitcher onOpen={() => setThemeOpen(false)} />

        <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />

        {/* Theme Selector */}
        <div className="relative">
          <button
            aria-label={t('settings.theme')}
            onClick={() => {
              setThemeOpen(!themeOpen);
            }}
            className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:shadow-sm transition-all"
          >
            {theme === 'light' && <Sun className="w-4 h-4" />}
            {theme === 'dark' && <Moon className="w-4 h-4" />}
            {theme === 'system' && <Monitor className="w-4 h-4" />}
          </button>
          {themeOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]">
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                  theme === 'light' &&
                    'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                )}
              >
                <Sun className="w-4 h-4" />
                {t('settings.themeOptions.light')}
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setThemeOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                  theme === 'dark' &&
                    'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                )}
              >
                <Moon className="w-4 h-4" />
                {t('settings.themeOptions.dark')}
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setThemeOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2',
                  theme === 'system' &&
                    'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                )}
              >
                <Monitor className="w-4 h-4" />
                {t('settings.themeOptions.system')}
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />

        {/* Settings Button */}
        <div className="home-desktop-settings relative">
          <button
            aria-label={t('settings.title')}
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:shadow-sm transition-all group"
          >
            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setSettingsSection(undefined);
        }}
        initialSection={settingsSection}
      />

      {/* ═══ Background Decor ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '6s' }}
        />
      </div>

      {/* ═══ Hero section: title + input (centered, wider) ═══ */}
      <div
        className={cn(
          'home-hero relative z-20 w-full max-w-[800px] flex flex-col items-center mt-[10vh]',
          heroEnter('fade-in slide-in-from-bottom-5 duration-600'),
        )}
      >
        {/* ── Logo ── */}
        <div className="home-brand relative" data-pro-morph="lockup">
          <div
            className={cn(
              'mb-2 text-center',
              heroEnter('fade-in zoom-in-90 duration-500 delay-100'),
            )}
          >
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
              教师情境实训实验室
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">TeacherScenarioLab</p>
          </div>
          {workbenchEntryEnabled ? (
            <div
              className="absolute left-full top-0 ml-1.5 mt-[10px] md:ml-2 md:mt-[14px]"
              data-pro-morph="badge"
            >
              <ProBadge
                active={false}
                onToggle={() => (mobile ? toast.info(t('home.desktopOnly')) : enterWorkbench())}
              />
            </div>
          ) : null}
        </div>

        {mobile && <h1 className="home-mobile-heading">{t('home.mobileTitle')}</h1>}
        {/* ── Slogan ── */}
        <p
          className={cn(
            'home-slogan text-sm text-muted-foreground/60 mb-8',
            heroEnter('fade-in duration-300 delay-250'),
          )}
        >
          {isTraining
            ? t('teacherlab.composer.subtitle')
            : t(mobile ? 'home.mobileSubtitle' : 'home.slogan')}
        </p>

        <div className="mb-5 flex items-center gap-2 rounded-full border border-border/50 bg-background/60 p-1 text-xs">
          <button
            type="button"
            aria-pressed={isTraining}
            onClick={() => setIsTraining(true)}
            className={cn(
              'rounded-full px-4 py-2 transition-colors',
              isTraining && 'bg-primary/10 text-primary',
            )}
          >
            {t('teacherlab.composer.trainingMode')}
          </button>
          <button
            type="button"
            aria-pressed={!isTraining}
            onClick={() => setIsTraining(false)}
            className={cn(
              'rounded-full px-4 py-2 transition-colors',
              !isTraining && 'bg-primary/10 text-primary',
            )}
          >
            {t('teacherlab.composer.courseMode')}
          </button>
        </div>
        {/* ── Unified input area ── */}
        <div
          className={cn(
            'home-input-wrap w-full',
            heroEnter('fade-in zoom-in-97 duration-300 delay-350'),
          )}
        >
          <div
            data-pro-morph="composer"
            className="home-composer w-full rounded-2xl border border-border/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl shadow-black/[0.03] dark:shadow-black/20 transition-shadow focus-within:shadow-2xl focus-within:shadow-violet-500/[0.06]"
          >
            {/* ── Greeting + Profile + Agents ── */}
            {!mobile && (
              <div className="home-profile relative z-20 flex items-start justify-between">
                <GreetingBar onOpen={() => openSettings('account')} />
                <div className="pr-3 pt-3.5 shrink-0">
                  {isTraining ? <EpidemicRolePill composer={training} /> : <AgentBar />}
                </div>
              </div>
            )}

            {isTraining && (
              <div className="px-4 pb-2">
                <select
                  aria-label={t('teacherlab.composer.scenario')}
                  className="max-w-full rounded-full border border-border/40 bg-transparent px-3 py-1 text-xs text-muted-foreground"
                  value={
                    training.scenario
                      ? `${training.scenario.scenarioId}@${training.scenario.version}`
                      : ''
                  }
                  onChange={(event) => {
                    const selected = training.scenarios.find(
                      (value) => `${value.scenarioId}@${value.version}` === event.target.value,
                    );
                    if (selected) training.selectScenario(selected);
                  }}
                  disabled={training.busy || training.loading}
                >
                  {!training.scenario && (
                    <option value="">
                      {training.loading
                        ? t('training.trainingLoading')
                        : t('teacherlab.composer.noScenarios')}
                    </option>
                  )}
                  {training.scenarios.map((value) => (
                    <option
                      key={`${value.scenarioId}@${value.version}`}
                      value={`${value.scenarioId}@${value.version}`}
                    >
                      {value.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isTraining && mobile && (
              <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
                <EpidemicRolePill composer={training} />
                <select
                  aria-label={t('training.mode')}
                  value={training.mode}
                  onChange={(event) => training.setMode(event.target.value as 'scripted' | 'model')}
                  className="rounded-full border bg-transparent px-3 py-2 text-xs"
                >
                  <option value="scripted">{t('training.modeScripted')}</option>
                  <option value="model">{t('training.modeModel')}</option>
                </select>
              </div>
            )}
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              data-testid="home-requirement"
              disabled={isTraining && training.busy}
              aria-label={
                isTraining ? t('teacherlab.composer.placeholder') : t('home.mobilePlaceholder')
              }
              placeholder={
                isTraining
                  ? t('teacherlab.composer.placeholder')
                  : t(mobile ? 'home.mobilePlaceholder' : 'upload.requirementPlaceholder')
              }
              className="w-full resize-none border-0 bg-transparent px-4 pt-1 pb-2 text-[13px] leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none min-h-[140px] max-h-[300px]"
              value={form.requirement}
              onChange={(e) => updateForm('requirement', e.target.value)}
              onKeyDown={handleKeyDown}
              rows={mobile ? 2 : 4}
            />

            {/* Toolbar row */}
            <div className="home-composer-controls px-3 pb-3 flex items-end gap-2">
              <div className="home-desktop-generation flex-1 min-w-0">
                {isTraining ? (
                  <EpidemicModelPill
                    composer={training}
                    onSettings={() => openSettings('model-services')}
                  />
                ) : (
                  !mobile && generationToolbar
                )}
              </div>

              {mobile && !isTraining && courseMaterials.materials.length > 0 && (
                <button
                  type="button"
                  className="home-material-status"
                  onClick={openMobileMaterials}
                  aria-label={t('toolbar.courseMaterialsSelected', {
                    n: courseMaterials.materials.length,
                  })}
                >
                  {courseMaterials.materials.some((item) => item.status === 'failed') ? (
                    <AlertCircle size={14} className="text-destructive" />
                  ) : courseMaterials.allReady ? (
                    <Paperclip size={14} />
                  ) : (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  <span>
                    {t('toolbar.courseMaterialsSelected', { n: courseMaterials.materials.length })}
                  </span>
                </button>
              )}
              {mobile && !isTraining && (
                <button
                  type="button"
                  className="home-options-open"
                  data-testid="home-options-open"
                  aria-label={t('home.courseOptions')}
                  onClick={openMobileOptions}
                >
                  <Plus size={22} />
                </button>
              )}
              {/* Interactive mode toggle */}
              {!mobile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InteractiveModeButton
                      pressed={isTraining ? training.mode === 'model' : form.interactiveMode}
                      label={
                        isTraining ? t('training.modeModel') : t('toolbar.interactiveModeLabel')
                      }
                      onPressedChange={(pressed) =>
                        isTraining
                          ? training.setMode(pressed ? 'model' : 'scripted')
                          : updateForm('interactiveMode', pressed)
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {isTraining
                      ? t('teacherlab.composer.modeHint')
                      : t('toolbar.interactiveModeHint')}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Keep the recorder mounted when text replaces its idle control. */}
              <SpeechButton
                className="home-speech"
                size="md"
                hiddenWhenIdle={mobile && (!!form.requirement.trim() || preparingGenerate)}
                onTranscription={(text) => {
                  setForm((prev) => {
                    const next = prev.requirement + (prev.requirement ? ' ' : '') + text;
                    return { ...prev, requirement: next };
                  });
                }}
              />

              {/* Send button */}
              <button
                data-testid="home-generate"
                aria-label={
                  isTraining ? t('teacherlab.composer.enterTraining') : t('toolbar.enterClassroom')
                }
                hidden={!isTraining && mobile && !form.requirement.trim() && !preparingGenerate}
                onClick={handleGenerate}
                disabled={!canGenerate || actionBusy}
                className={cn(
                  'home-send shrink-0 h-8 rounded-lg flex items-center justify-center gap-1.5 transition-all px-3',
                  canGenerate && !actionBusy
                    ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm cursor-pointer'
                    : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
                )}
              >
                <span className="text-xs font-medium">
                  {actionBusy
                    ? t('stage.generating')
                    : isTraining
                      ? t('teacherlab.composer.enterTraining')
                      : t('toolbar.enterClassroom')}
                </span>
                {actionBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {isTraining && training.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {training.error}
          </p>
        )}
        {showVocationalTestUi && !isTraining && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2 flex w-full justify-start px-1"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.vocationalTestMode}
                  onClick={() => updateForm('vocationalTestMode', !form.vocationalTestMode)}
                  className={cn(
                    'inline-flex h-7 items-center gap-2 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                    form.vocationalTestMode
                      ? 'border-cyan-400/70 bg-cyan-50 text-cyan-700 shadow-[0_0_10px_rgba(6,182,212,0.16)] dark:bg-cyan-950/40 dark:text-cyan-300'
                      : 'border-border/70 bg-background/70 text-muted-foreground hover:border-cyan-300/60 hover:text-cyan-700 dark:hover:text-cyan-300',
                  )}
                >
                  <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-cyan-700 dark:bg-cyan-900/45 dark:text-cyan-300">
                    测试功能
                  </span>
                  <Sparkles className="size-3.5" />
                  <span>职教任务</span>
                  <span
                    className={cn(
                      'relative h-3.5 w-6 rounded-full transition-colors',
                      form.vocationalTestMode ? 'bg-cyan-500' : 'bg-muted-foreground/25',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0.5 top-0.5 size-2.5 rounded-full bg-white transition-transform',
                        form.vocationalTestMode ? 'translate-x-2.5' : 'translate-x-0',
                      )}
                    />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                从当前输入框提交职教实操训练测试
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="home-error mt-3 w-full p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
            >
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ Recent classrooms — collapsible ═══ */}
      {/* The library action bar is always present: it carries the New-folder /
          import / search actions, so a brand-new user with zero courses and
          zero folders can still create the first folder or import. One stable
          action surface across root, folder, and empty. Until the library and
          folder reads resolve, the section shows a skeleton of its own layout
          (server-rendered, so it is on screen before the page's scripts run). */}
      {isTraining ? (
        <div className="relative z-10 mt-8 w-full max-w-[1000px]">
          {account?.authenticated ? (
            <TrainingHomeBlock
              unified
              onSelectScenario={(value) => {
                training.selectScenario(value);
                textareaRef.current?.focus();
              }}
            />
          ) : (
            <button
              onClick={() => openSettings('account')}
              className="rounded-full border bg-background/60 px-5 py-2 text-sm"
            >
              {t('teacherlab.loginRegister')}
            </button>
          )}
        </div>
      ) : (
        <HomeLibrary
          mobile={mobile}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          title={t('classroom.recentClassrooms')}
          headerAction={
            !currentFolderId && !isSearching ? (
              <button
                type="button"
                ref={newFolderButtonRef}
                data-testid="home-new-folder"
                aria-label={t('classroom.newFolderTitle')}
                title={t('classroom.newFolderTitle')}
                onClick={() => setNewFolderOpen(true)}
              >
                <FolderPlus size={20} />
              </button>
            ) : undefined
          }
        >
          {mobile && (
            <div className="home-mobile-library-search">
              {currentFolderId && (
                <button
                  type="button"
                  className="home-folder-back"
                  onClick={() => setCurrentFolderId(undefined)}
                >
                  <ChevronRight className="rotate-180 size-4" />
                  {t('classroom.recentClassrooms')}
                </button>
              )}
              {currentFolder && <p className="mb-3 text-sm font-medium">{currentFolder.name}</p>}
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input
                  data-testid="home-mobile-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('classroom.searchPlaceholder')}
                  aria-label={t('classroom.searchAriaLabel')}
                  className="w-full h-10 rounded-xl border border-border bg-background pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          )}
          {/* Trigger — divider-line with centered text. Fixed height keeps the
              bar geometrically stable when the New-folder action or the folder
              path appears/disappears (entering vs leaving a folder). */}
          <div className="home-library-actions group w-full flex items-center gap-4 h-9">
            <div className="flex-1 h-px bg-border/40 group-hover:bg-border/70 transition-colors" />
            <div className="shrink-0 flex items-center gap-3 text-[13px] text-muted-foreground/60 select-none">
              <button
                onClick={() => {
                  if (currentFolderId) setCurrentFolderId(undefined);
                  else persistRecentOpen(!recentOpen);
                }}
                className="flex items-center gap-2 hover:text-foreground/70 transition-colors cursor-pointer"
              >
                <Clock className="size-3.5" />
                {t('classroom.recentClassrooms')}
                {currentFolder && (
                  <>
                    <ChevronRight className="size-3 opacity-40" />
                    <span className="text-foreground/80 truncate max-w-[160px]">
                      {currentFolder.name}
                    </span>
                  </>
                )}
                {hydrated ? (
                  <span className="text-[11px] tabular-nums opacity-60">
                    {currentFolder ? currentFolderClassrooms.length : classrooms.length}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="h-3 w-4 rounded-sm bg-slate-200/70 dark:bg-slate-700/50 animate-pulse"
                  />
                )}
                <motion.div
                  animate={{ rotate: recentOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <ChevronDown className="size-3.5" />
                </motion.div>
              </button>

              {/* Search toggle — icon that expands into an input in place */}
              <AnimatePresence initial={false}>
                {!searchOpen ? (
                  <motion.button
                    key="search-icon"
                    ref={searchButtonRef}
                    type="button"
                    aria-label={t('classroom.searchAriaLabel')}
                    onClick={() => {
                      setSearchOpen(true);
                      if (!recentOpen) persistRecentOpen(true);
                      requestAnimationFrame(() => searchInputRef.current?.focus());
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="flex items-center justify-center size-6 rounded-full text-muted-foreground/50 hover:text-foreground/70 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Search className="size-3.5" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="search-input"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 200 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <InputGroup
                      className={cn(
                        'h-7 text-[12px] rounded-full bg-muted/40 border-transparent shadow-none',
                        'transition-colors',
                        'hover:bg-muted/60',
                        'has-[[data-slot=input-group-control]:focus-visible]:bg-muted/60',
                        'has-[[data-slot=input-group-control]:focus-visible]:border-transparent',
                        'has-[[data-slot=input-group-control]:focus-visible]:ring-0',
                      )}
                    >
                      <InputGroupInput
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            if (searchQuery) {
                              setSearchQuery('');
                            } else {
                              setSearchOpen(false);
                              requestAnimationFrame(() => searchButtonRef.current?.focus());
                            }
                          }
                        }}
                        onBlur={() => {
                          if (!searchQuery) {
                            setSearchOpen(false);
                          }
                        }}
                        placeholder={t('classroom.searchPlaceholder')}
                        aria-label={t('classroom.searchAriaLabel')}
                        className="h-7 pl-3 placeholder:text-muted-foreground/50"
                      />
                      {searchQuery && (
                        <InputGroupButton
                          size="icon-xs"
                          aria-label={t('classroom.clearSearch')}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchQuery('');
                            searchInputRef.current?.focus();
                          }}
                        >
                          <X />
                        </InputGroupButton>
                      )}
                    </InputGroup>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                data-testid="home-course-import"
                onClick={triggerImport}
                disabled={importing}
                className="group/import grid grid-cols-[auto_0fr] hover:grid-cols-[auto_1fr] items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/50 transition-all duration-200 cursor-pointer"
              >
                <Upload className="size-3" />
                <span className="overflow-hidden opacity-0 group-hover/import:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  {t('import.classroom')}
                </span>
              </button>
              {PPTX_IMPORT_ENABLED && (
                <button
                  onClick={triggerPptxFileSelect}
                  disabled={pptxImporting}
                  className="group/import-pptx grid grid-cols-[auto_0fr] hover:grid-cols-[auto_1fr] items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                >
                  <Presentation className="size-3" />
                  <span className="overflow-hidden opacity-0 group-hover/import-pptx:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    {t('import.pptx')}
                  </span>
                </button>
              )}
              {/* New folder — round icon button, matches the import/upload affordances. */}
              {!currentFolderId && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    if (!recentOpen) persistRecentOpen(true);
                    setNewFolderOpen(true);
                  }}
                  aria-label={t('classroom.newFolderTitle')}
                  title={t('classroom.newFolderTitle')}
                  className="inline-flex items-center justify-center size-7 rounded-full bg-muted/40 text-muted-foreground ring-1 ring-border/50 hover:bg-muted hover:text-foreground hover:ring-border transition-[background-color,color,box-shadow] cursor-pointer"
                >
                  <FolderPlus className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1 h-px bg-border/40 group-hover:bg-border/70 transition-colors" />
          </div>

          {/* Expandable content. Present from the first render, so it does not
              play its expand animation then: the server-rendered skeleton must
              be visible without the page's scripts. */}
          <AnimatePresence initial={false}>
            {(mobile || recentOpen) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full overflow-hidden"
              >
                {!hydrated ? (
                  <LibrarySkeleton />
                ) : folders.length === 0 && classrooms.length === 0 && pendingRuns.length === 0 ? (
                  <div className="pt-8 pb-2 text-center text-[13px] text-muted-foreground/60">
                    {mobile ? (
                      <div className="home-empty-library">
                        <Presentation size={36} strokeWidth={1.4} />
                        <p>{t('home.emptyLibraryTitle')}</p>
                        <span>{t('home.emptyLibraryBody')}</span>
                      </div>
                    ) : (
                      t('classroom.emptyLibraryHint')
                    )}
                  </div>
                ) : !isSearching && currentFolderId && currentFolderClassrooms.length === 0 ? (
                  // Empty folder: hint directly below the centered path bar.
                  <div className="pt-8 text-center">
                    <p className="text-[14px] text-muted-foreground">
                      {t('classroom.emptyFolderHint')}
                    </p>
                  </div>
                ) : isSearching && filteredClassrooms.length === 0 ? (
                  <div className="pt-8 pb-2 text-center text-[13px] text-muted-foreground/60">
                    {t('classroom.searchEmpty')}
                  </div>
                ) : (
                  <div className={mobile ? '' : 'pt-8'}>
                    {/* Breadcrumb — shown only while searching (the folder path
                        already lives in the centered header above). */}
                    {isSearching && (
                      <div className="mb-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentFolderId(undefined);
                            setSearchQuery('');
                            setSearchOpen(false);
                          }}
                          className="hover:text-foreground transition-colors"
                        >
                          {t('classroom.recentClassrooms')}
                        </button>
                        <ChevronRight className="size-3.5" />
                        <span className="text-foreground font-medium">
                          {t('classroom.searchResults')}
                        </span>
                        <span className="ml-1.5 text-[12px] text-muted-foreground tabular-nums">
                          ({filteredClassrooms.length})
                        </span>
                      </div>
                    )}

                    {/* No entrance when the grid first appears: it takes the
                      skeleton's place, and fading or staggering it in would
                      flash an empty section in between. Switching views (and
                      cards added later) still animate. */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={
                          isSearching
                            ? 'search'
                            : currentFolderId
                              ? `folder-${currentFolderId}`
                              : 'root'
                        }
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="home-library-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8"
                      >
                        {/* Root + non-search: render folder tiles first. */}
                        {!isSearching &&
                          currentFolderId === undefined &&
                          folders.map((folder, i) => (
                            <motion.div
                              key={folder.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
                            >
                              <FolderCard
                                mobile={mobile}
                                folder={folder}
                                courseCount={courseCountByFolder.get(folder.id) ?? 0}
                                coverSlides={folderCovers.get(folder.id)?.slides ?? []}
                                coverCandidates={folderCovers.get(folder.id)?.candidates ?? []}
                                requestThumbnail={requestThumbnail}
                                onOpen={() => setCurrentFolderId(folder.id)}
                                onRename={handleRenameFolder(folder)}
                                onDelete={(mode) => confirmDeleteFolder(folder, mode)}
                                onDropCourse={(stageId) => handleMoveCourse(stageId, folder.id)}
                              />
                            </motion.div>
                          ))}

                        {/* Courses still being generated, before their course exists. */}
                        {showPendingRuns &&
                          pendingRuns.map((run) => (
                            <motion.div
                              key={run.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.35, ease: 'easeOut' }}
                            >
                              <ClassroomCard
                                mobile={mobile}
                                classroom={pendingRunListItem(run)}
                                formatDate={formatDate}
                                runStatus={courseRunStatus(run)}
                                pendingCourse
                                onDelete={handleDelete}
                                onRename={handleRename}
                                confirmingDelete={pendingDeleteId === run.id}
                                onConfirmDelete={() => confirmDelete(run.id)}
                                onCancelDelete={() => setPendingDeleteId(null)}
                                onClick={() => {
                                  setHistoryOpen(false);
                                  router.push(courseRunHref(run));
                                }}
                              />
                            </motion.div>
                          ))}

                        {/* Course tiles for the active view. */}
                        {visibleClassrooms.map((classroom, i) => (
                          <motion.div
                            key={classroom.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
                          >
                            <ClassroomCard
                              mobile={mobile}
                              classroom={classroom}
                              slide={thumbnails[classroom.id]}
                              requestThumbnail={requestThumbnail}
                              formatDate={formatDate}
                              runStatus={(() => {
                                const run = runByStageId.get(classroom.id);
                                return run ? courseRunStatus(run) : null;
                              })()}
                              onDelete={handleDelete}
                              onRename={handleRename}
                              confirmingDelete={pendingDeleteId === classroom.id}
                              onConfirmDelete={() => confirmDelete(classroom.id)}
                              onCancelDelete={() => setPendingDeleteId(null)}
                              onClick={() => {
                                setHistoryOpen(false);
                                const run = runByStageId.get(classroom.id);
                                router.push(
                                  run ? courseRunHref(run) : `/classroom/${classroom.id}`,
                                );
                              }}
                              overlay={
                                <>
                                  <MoveToFolderMenu
                                    variant={mobile ? 'items' : 'icon'}
                                    folders={folders}
                                    currentFolderId={classroom.folderId}
                                    onMove={(folderId) => handleMoveCourse(classroom.id, folderId)}
                                    onCreateAndMove={handleCreateAndMove(classroom.id)}
                                  />
                                  {/* Search view: show the owning folder as a badge. */}
                                  {!mobile && isSearching && classroom.folderId && (
                                    <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-md bg-violet-500/80 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm pointer-events-none">
                                      <Folder className="size-2.5" />
                                      {folderNameById.get(classroom.folderId) ?? ''}
                                    </span>
                                  )}
                                </>
                              }
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Keep the portalled folder dialog inside the library's React tree.
            Touch dismissal must not also reach the drawer underneath it. */}
          <NewFolderDialog
            open={newFolderOpen}
            onOpenChange={(open) => {
              setNewFolderOpen(open);
              if (!open) setCreateAndMoveTarget(null);
            }}
            folders={folders}
            onCreate={handleCreateFolder}
            onCloseAutoFocus={(event) => {
              if (!mobile || !historyOpen) return;
              event.preventDefault();
              requestAnimationFrame(() => {
                const target =
                  newFolderButtonRef.current ??
                  document.querySelector<HTMLInputElement>('[data-testid="home-mobile-search"]');
                target?.focus();
              });
            }}
          />
        </HomeLibrary>
      )}

      {/* TeacherScenarioLab — training entry on the fork's home page.
          The old parallel /training tree now lives here: scenario hall,
          records, account and event ledger as tabs. Rooms are under
          /classroom/training/[id], reviews under /eval/training/[id]. */}

      {mobile && (
        <Dialog
          open={mobileOptionsOpen}
          onOpenChange={(open) => {
            setMobileOptionsOpen(open);
            if (open) {
              setMobileViewMotion(null);
              setMobileMaterialsOpen(false);
            }
          }}
        >
          <DialogContent
            ref={mobileOptionsContentRef}
            data-testid="home-mobile-options"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              requestAnimationFrame(() => mobileOptionsTitleRef.current?.focus());
            }}
            className={cn('home-mobile-options', mobileMaterialsOpen && 'home-materials-view')}
            aria-describedby={undefined}
          >
            <div
              key={mobileMaterialsOpen ? 'materials' : 'options'}
              className="home-options-page"
              data-view={mobileMaterialsOpen ? 'materials' : 'options'}
              data-motion={mobileViewMotion ?? undefined}
            >
              <div
                className={mobileMaterialsOpen ? 'home-materials-header' : 'home-options-header'}
              >
                {mobileMaterialsOpen && (
                  <button
                    type="button"
                    className="flex h-11 min-w-0 items-center gap-1 text-xs"
                    aria-label={t('home.backToCourseOptions')}
                    onClick={returnToMobileOptions}
                  >
                    <ChevronLeft size={18} className="shrink-0 rtl:rotate-180" />
                    <span className="truncate">{t('home.courseOptions')}</span>
                  </button>
                )}
                <DialogTitle ref={mobileOptionsTitleRef} tabIndex={-1}>
                  {t(mobileMaterialsOpen ? 'home.courseMaterials' : 'home.courseOptions')}
                </DialogTitle>
                {mobileMaterialsOpen && <span aria-hidden="true" />}
              </div>
              <div
                className={
                  mobileMaterialsOpen ? 'home-materials-body' : 'home-options-body space-y-4'
                }
                data-testid={mobileMaterialsOpen ? 'home-materials-body' : 'home-options-body'}
              >
                {!mobileMaterialsOpen && (
                  <div className="home-mobile-teaching-options flex flex-wrap items-start gap-3">
                    <GreetingBar reserveSpace />
                    {isTraining ? <EpidemicRolePill composer={training} /> : <AgentBar />}
                  </div>
                )}
                <div>{generationToolbar}</div>
                {!mobileMaterialsOpen && (
                  <>
                    <InteractiveModeButton
                      pressed={isTraining ? training.mode === 'model' : form.interactiveMode}
                      label={
                        isTraining ? t('training.modeModel') : t('toolbar.interactiveModeLabel')
                      }
                      onPressedChange={(pressed) =>
                        isTraining
                          ? training.setMode(pressed ? 'model' : 'scripted')
                          : updateForm('interactiveMode', pressed)
                      }
                    />
                    <button
                      type="button"
                      className="flex h-11 items-center gap-2 text-sm"
                      onClick={() => {
                        setMobileOptionsOpen(false);
                        setSettingsOpen(true);
                      }}
                    >
                      <Settings size={18} />
                      {t('home.allSettings')}
                    </button>
                    <p className="text-xs text-muted-foreground">{t('home.examplesLabel')}</p>
                    <div className="flex flex-wrap gap-2">
                      {['home.examplePython', 'home.exampleFourier'].map((key) => (
                        <button
                          key={key}
                          type="button"
                          className="rounded-full border border-border px-3 py-2 text-sm"
                          onClick={() => {
                            updateForm('requirement', t(key));
                            setMobileOptionsOpen(false);
                            requestAnimationFrame(() => textareaRef.current?.focus());
                          }}
                        >
                          {t(key)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {mobileMaterialsOpen && (
                <div className="home-materials-footer">
                  <Button type="button" className="h-11 w-full" onClick={returnToMobileOptions}>
                    {t('home.materialsDone')}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Footer — flows with content, at the very end */}
      <div className="home-footer mt-auto pt-12 pb-4 text-center text-xs text-muted-foreground/40">
        OpenMAIC Open Source Project
      </div>
    </div>
  );
}

function GreetingBar({
  reserveSpace = false,
  onOpen,
}: {
  reserveSpace?: boolean;
  onOpen?: () => void;
}) {
  const { account } = useAccount();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => (onOpen ? onOpen() : window.location.assign('/?settings=account'))}
      className={cn(
        'm-3 inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/40 px-2 py-1.5 text-sm font-medium',
        reserveSpace && 'min-w-36',
      )}
    >
      <img src="/avatars/user.png" alt="" className="h-10 w-10 rounded-full bg-violet-100" />
      <span>
        {account?.authenticated
          ? t('teacherlab.composer.greeting', {
              name: account.displayName || t('teacherlab.member'),
            })
          : t('teacherlab.loginRegister')}
      </span>
      <ChevronDown size={12} className="text-muted-foreground" />
    </button>
  );
}

// ─── Classroom Card — clean, minimal style ──────────────────────
/** A card for a run whose course does not exist yet. */
function pendingRunListItem(run: RunSnapshot): StageListItem {
  return {
    id: run.id,
    name: pendingCourseName(run),
    sceneCount: run.progress.scenesCompleted,
    createdAt: Date.parse(run.createdAt),
    updatedAt: Date.parse(run.updatedAt),
    interactiveMode: run.input.interactive,
    taskEngineMode: run.input.taskEngine,
  };
}

function ClassroomCard({
  mobile = false,
  classroom,
  slide,
  requestThumbnail,
  formatDate,
  runStatus = null,
  pendingCourse = false,
  overlay,
  onDelete,
  onRename,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  onClick,
}: {
  mobile?: boolean;
  classroom: StageListItem;
  /** The first slide; null when the course has none, undefined until loaded. */
  slide?: Slide | null;
  /** Loads the thumbnail while the card is near the viewport (absent: nothing to load). */
  requestThumbnail?: (stageId: string, version: number) => () => void;
  formatDate: (ts: number) => string;
  /** The state of the run generating this course, while it runs. */
  runStatus?: CourseRunStatus | null;
  /** The card is a run whose course does not exist yet: it can only be opened or deleted. */
  pendingCourse?: boolean;
  /** Extra absolutely-positioned layers over the thumbnail (move menu, badges). */
  overlay?: React.ReactNode;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onRename: (id: string, newName: string) => void;
  confirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const renameAfterMenuRef = useRef(false);
  const [moving, setMoving] = useState(false);
  const nearViewport = useNearViewport(thumbRef);

  useEffect(() => {
    if (!nearViewport || !requestThumbnail) return;
    return requestThumbnail(classroom.id, classroom.updatedAt);
  }, [nearViewport, requestThumbnail, classroom.id, classroom.updatedAt]);

  useEffect(() => {
    const el = thumbRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setThumbWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // On phones, wait until the menu releases its focus trap before editing.
    if (editing && !mobile) nameInputRef.current?.focus();
  }, [editing, mobile]);

  const isTaskEngineMode = classroom.taskEngineMode === true;
  const showModeBadge = classroom.interactiveMode || isTaskEngineMode;
  const ModeBadgeIcon = isTaskEngineMode ? Sparkles : Atom;
  const modeBadgeLabel = isTaskEngineMode ? 'Vocational Mode' : t('toolbar.interactiveModeLabel');

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameDraft(classroom.name);
    setEditing(true);
  };

  const commitRename = () => {
    if (!editing) return;
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== classroom.name) {
      onRename(classroom.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      className={cn('home-course-card group cursor-pointer', mobile && 'home-course-card-mobile')}
      role={mobile ? 'link' : undefined}
      tabIndex={mobile ? 0 : undefined}
      aria-label={mobile ? classroom.name : undefined}
      onKeyDown={(event) => {
        if (
          mobile &&
          event.target === event.currentTarget &&
          event.key === 'Enter' &&
          !confirmingDelete
        )
          onClick();
      }}
      onClick={confirmingDelete ? undefined : onClick}
      draggable={!mobile && !confirmingDelete && !editing && !pendingCourse}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/stage-id', classroom.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        // Notify folder cards to clear any lingering drop highlight (Escape-
        // cancelled drags may not fire dragleave on every target).
        window.dispatchEvent(new CustomEvent('course-drag-end'));
      }}
    >
      {/* Thumbnail — large radius, no border, subtle bg */}
      <div
        ref={thumbRef}
        className="home-course-thumbnail relative w-full aspect-[16/9] rounded-2xl bg-slate-100 dark:bg-slate-800/80 overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]"
      >
        {slide && thumbWidth > 0 ? (
          <SlideThumbnail
            slide={slide}
            size={thumbWidth}
            viewportSize={slide.viewportSize ?? 1000}
            viewportRatio={slide.viewportRatio ?? 0.5625}
          />
        ) : slide || (slide === undefined && requestThumbnail) ? (
          // Still loading, or loaded and waiting for the card's width.
          <ThumbnailSkeleton />
        ) : !slide ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center">
              <span className="text-xl opacity-50">📄</span>
            </div>
          </div>
        ) : null}

        {showModeBadge && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                aria-label={modeBadgeLabel}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'absolute bottom-2 left-2 inline-flex items-center justify-center size-5 rounded-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm z-10',
                  isTaskEngineMode
                    ? 'text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/35'
                    : 'text-cyan-600 dark:text-cyan-300 ring-1 ring-cyan-500/30',
                )}
              >
                <ModeBadgeIcon className="size-3" />
              </span>
            </TooltipTrigger>
            {/* Negative sideOffset compensates for the global Tooltip Arrow's
                rotate-45 bounding box, which Radix reserves as spacing. */}
            <TooltipContent
              side="top"
              align="start"
              sideOffset={-4}
              collisionPadding={0}
              className="text-xs"
            >
              {modeBadgeLabel}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Delete — top-right, only on hover */}
        <AnimatePresence>
          {!mobile && !confirmingDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-destructive/80 text-white hover:text-white backdrop-blur-sm rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(classroom.id, e);
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
              {!pendingCourse && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-11 size-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white hover:text-white backdrop-blur-sm rounded-full"
                  onClick={startRename}
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
              {overlay}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline delete confirmation overlay */}
        <AnimatePresence>
          {confirmingDelete && !mobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-[6px]"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[13px] font-medium text-white/90">
                {t('classroom.deleteConfirmTitle')}?
              </span>
              <div className="flex gap-2">
                <button
                  className="px-3.5 py-1 rounded-lg text-[12px] font-medium bg-white/15 text-white/80 hover:bg-white/25 backdrop-blur-sm transition-colors"
                  onClick={onCancelDelete}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="px-3.5 py-1 rounded-lg text-[12px] font-medium bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                  onClick={onConfirmDelete}
                >
                  {t('classroom.delete')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info — outside the thumbnail */}
      <div className="home-course-meta mt-2.5 px-1 flex items-center gap-2">
        {mobile && runStatus?.kind === 'paused' && (
          <span className="home-course-resume">
            <span>{t('home.resumeGeneration')}</span>
            <ChevronRight size={12} className="shrink-0" />
          </span>
        )}
        {runStatus ? (
          <CourseRunStatusLabel status={runStatus} />
        ) : (
          <span className="shrink-0 inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
            {classroom.sceneCount} {t('classroom.slides')} · {formatDate(classroom.updatedAt)}
          </span>
        )}
        {editing ? (
          <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <input
              ref={nameInputRef}
              data-home-course-rename
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                }
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              onBlur={commitRename}
              maxLength={100}
              placeholder={t('classroom.renamePlaceholder')}
              className="w-full bg-transparent border-b border-violet-400/60 text-[15px] font-medium text-foreground/90 outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <p
                className="font-medium text-[15px] truncate text-foreground/90 min-w-0 cursor-text"
                onDoubleClick={pendingCourse ? undefined : startRename}
              >
                {classroom.name}
              </p>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={4}
              className="!max-w-[min(90vw,32rem)] break-words whitespace-normal"
            >
              <div className="flex items-center gap-1.5">
                <span className="break-all">{classroom.name}</span>
                <button
                  className="shrink-0 p-0.5 rounded hover:bg-foreground/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(classroom.name);
                    toast.success(t('classroom.nameCopied'));
                  }}
                >
                  <Copy className="size-3 opacity-60" />
                </button>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {mobile && confirmingDelete && (
        <div
          className="home-mobile-delete-confirm"
          role="alert"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="home-delete-copy">
            <p className="home-delete-title">{classroom.name}</p>
            <p>{t('classroom.deleteConfirmTitle')}?</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancelDelete}>
              {t('common.cancel')}
            </button>
            <button type="button" className="text-destructive" onClick={onConfirmDelete}>
              {t('classroom.delete')}
            </button>
          </div>
        </div>
      )}
      {mobile && !confirmingDelete && (
        <div className="home-mobile-card-actions" onClick={(event) => event.stopPropagation()}>
          <DropdownMenu
            onOpenChange={(open) => {
              if (!open) setMoving(false);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="home-course-more"
                aria-label={`${t('home.courseOptions')}: ${classroom.name}`}
              >
                <MoreHorizontal size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="home-course-menu min-w-44 [&_[data-slot=dropdown-menu-item]]:min-h-11"
              align="end"
              onClick={(event) => event.stopPropagation()}
              onCloseAutoFocus={(event) => {
                if (renameAfterMenuRef.current) {
                  event.preventDefault();
                  renameAfterMenuRef.current = false;
                  requestAnimationFrame(() => nameInputRef.current?.focus());
                }
              }}
            >
              {moving ? (
                <>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setMoving(false);
                    }}
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    {t('common.back')}
                  </DropdownMenuItem>
                  {overlay}
                </>
              ) : (
                <>
                  {!pendingCourse && (
                    <>
                      <DropdownMenuItem
                        onClick={(event) => {
                          renameAfterMenuRef.current = true;
                          startRename(event);
                        }}
                      >
                        <Pencil size={16} />
                        {t('classroom.rename')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          setMoving(true);
                        }}
                      >
                        <Folder size={16} />
                        {t('classroom.moveToFolder')}
                        <ChevronRight size={16} className="ml-auto" />
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(event) => onDelete(classroom.id, event)}
                  >
                    <Trash2 size={16} />
                    {t('classroom.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export default function LearningWorkspace({ trainingEntry = false }: { trainingEntry?: boolean }) {
  return <HomePage trainingEntry={trainingEntry} />;
}
