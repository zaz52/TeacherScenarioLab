'use client';

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'motion/react';

function animateSurface(element: HTMLElement | null, slide = false) {
  if (
    !element ||
    typeof element.animate !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  return element.animate(
    slide
      ? [
          { opacity: 0.65, translate: '0 6px' },
          { opacity: 1, translate: '0 0' },
        ]
      : [{ opacity: 0.65 }, { opacity: 1 }],
    { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
}

/** No route keys or DOM wrapper: navigation keeps the existing state and layout. */
export function SiteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    let animation: Animation | undefined;
    const frame = requestAnimationFrame(() => {
      animation = animateSurface(document.querySelector<HTMLElement>('main, [data-page-motion]'));
    });
    return () => {
      cancelAnimationFrame(frame);
      animation?.cancel();
    };
  }, [pathname]);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Animate an existing panel on selection changes without remounting its form. */
export function MotionSurface({
  motionKey,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { motionKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const animation = animateSurface(ref.current, true);
    return () => animation?.cancel();
  }, [motionKey]);
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
