import type { Metadata, Viewport } from 'next';
import { AdaptiveProvider } from '@/lib/adaptive/adaptive-provider';
import { identifyRequestDevice } from '@/lib/adaptive/request-device';
import { cookies, headers } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import './site-motion.css';
import { SiteMotion } from '@/components/ui/site-motion';
import '@openmaic/renderer/fonts.css';
import 'animate.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { Toaster } from '@/components/ui/sonner';
import { AccessCodeGuard } from '@/components/access-code-guard';
import { NewcomerGuide } from '@/components/home/newcomer-guide';
import { AccountProvider } from '@/components/account/account-provider';
import { AuthenticatedInit } from '@/components/account/authenticated-init';
import { loadLocaleResource } from '@/lib/i18n/load-resource';
import { LOCALE_COOKIE, resolveRequestLocale } from '@/lib/i18n/resolve-locale';

// The UI font is loaded from @fontsource's stylesheet rather than next/font,
// because only the stylesheet carries the per-subset `unicode-range`
// declarations. Pointing next/font at `inter-latin-wght-normal.woff2` loaded
// exactly one subset, so every character outside Latin — Cyrillic for ru-RU,
// tone-marked letters for vi-VN — fell back to an arbitrary OS font and
// rendered in a different typeface mid-word.
//
// Declaring the other subset files as sibling faces of the same family does not
// fix it either: faces with identical descriptors and no `unicode-range` do not
// fall through per glyph, so the browser simply picks one.
//
// `--font-sans` moves to globals.css since the family no longer comes from
// next/font's generated class.
import '@fontsource-variable/inter';

/**
 * Applies the dark theme before the first paint. `ThemeProvider` resolves the
 * theme (the `theme` key in localStorage, else the system preference) only
 * once the page's scripts run, so a server-rendered page would otherwise be
 * painted light and flip to dark afterwards. Keep in step with
 * `lib/hooks/use-theme.tsx`.
 */
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

// Keep the browser's default cutout avoidance: full-screen routes such as
// classroom do not yet pad their controls for edge-to-edge rendering.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://teacherlab.weiyiai.top'),
  title: '教师情境实训实验室 | TeacherScenarioLab',
  description:
    'TeacherScenarioLab 教师情境实训实验室：通过 AI 模拟真实教育情境，训练教师的沟通、信息核实、教育判断和多方协同处置能力。',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The client hydrates with this same locale and bundle instead of detecting
  // its own, so the first render matches the server's HTML.
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveRequestLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get('accept-language'),
  });
  const resources = await loadLocaleResource(locale);
  const { initialMobileLayout } = identifyRequestDevice(headerStore.get('user-agent'));

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <noscript>
          <style>{`.magic-blur-fade { opacity: 1 !important; filter: none !important; transform: none !important; }`}</style>
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AdaptiveProvider initialMobileLayout={initialMobileLayout}>
          <ThemeProvider>
            <I18nProvider initialLocale={locale} initialResources={resources}>
              <SiteMotion>
                <AccountProvider>
                  <AccessCodeGuard>
                    {children}
                    <NewcomerGuide />
                  </AccessCodeGuard>
                  <Toaster position="top-center" />
                  {/* After the Toaster: this one raises a toast on mount when
                persistence is already broken, and a toast raised before its
                host exists has nowhere to go. */}
                  <AuthenticatedInit />
                </AccountProvider>
              </SiteMotion>
            </I18nProvider>
          </ThemeProvider>
        </AdaptiveProvider>
      </body>
    </html>
  );
}
