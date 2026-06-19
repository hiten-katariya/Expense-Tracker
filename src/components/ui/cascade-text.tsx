/**
 * TextReveal (CascadeText) — Premium SaaS heading animation
 * Framer Motion staggered character cascade with gradient, glow, magnetic hover
 * Fully accessible, dark/light mode, GPU-accelerated, mobile-first
 */
import { useRef, useMemo } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { cn } from '@/lib/utils';

export type TextRevealVariant =
  | 'gradient'      // Animated gradient across text
  | 'glow'          // Glowing white/indigo
  | 'split'         // Top half / bottom half reveal
  | 'plain';        // Solid foreground, no gradient

export interface TextRevealProps {
  /** The string to animate */
  text: string;
  /** Sub-heading displayed below with fade */
  subtitle?: string;
  /** Visual style preset */
  variant?: TextRevealVariant;
  /** Extra class names on the wrapper */
  className?: string;
  /** Extra class names per character span */
  charClassName?: string;
  /** Delay before the cascade starts (seconds) */
  startDelay?: number;
  /** Stagger between each character (seconds) */
  stagger?: number;
  /** Animation duration per character (seconds) */
  duration?: number;
  /** Whether to split by word instead of character */
  splitByWord?: boolean;
  /** Tailwind text-size class; defaults to 'text-3xl' */
  textSize?: string;
  /** If true, only animate once when scrolled into view */
  once?: boolean;
  /** Disable magnetic hover effect */
  noMagnetic?: boolean;
}

// ─── Gradient definitions ────────────────────────────────────────────────────
const VARIANT_CLASSES: Record<TextRevealVariant, string> = {
  gradient:
    'bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-pink bg-clip-text text-transparent animate-gradient-x',
  glow:
    'text-foreground drop-shadow-[0_0_18px_rgba(99,102,241,0.55)]',
  split:
    'text-foreground',
  plain:
    'text-foreground',
};

// ─── Per-character container: magnetic hover ─────────────────────────────────
function MagneticChar({
  char,
  variant,
  charClassName,
  noMagnetic,
}: {
  char: string;
  variant: TextRevealVariant;
  charClassName?: string;
  noMagnetic?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (noMagnetic || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 60) {
      x.set(dx * 0.3);
      y.set(dy * 0.3);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (char === ' ') {
    return <span className="inline-block">&nbsp;</span>;
  }

  return (
    <motion.span
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'inline-block will-change-transform select-none',
        VARIANT_CLASSES[variant],
        charClassName
      )}
      aria-hidden="true"
    >
      {char}
    </motion.span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TextReveal({
  text,
  subtitle,
  variant = 'gradient',
  className,
  charClassName,
  startDelay = 0,
  stagger = 0.035,
  duration = 0.5,
  splitByWord = false,
  textSize = 'text-3xl',
  once = true,
  noMagnetic = false,
}: TextRevealProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(containerRef, { once, margin: '0px 0px -60px 0px' });

  const tokens = useMemo(
    () => (splitByWord ? text.split(' ') : text.split('')),
    [text, splitByWord]
  );

  const charVariants = {
    hidden: {
      opacity: 0,
      y: 28,
      rotateX: -90,
      filter: 'blur(4px)',
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        delay: startDelay + i * stagger,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    }),
  };

  // Glow halo: animates behind the text
  const GlowHalo = () => (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 rounded-xl
        bg-gradient-to-r from-primary-500/[0.12] via-secondary-500/[0.08] to-accent-pink/[0.10]
        blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
    />
  );

  return (
    <div className={cn('relative group', className)}>
      {/* Screen-reader text (full string, not split) */}
      <span className="sr-only">{text}</span>

      <h1
        ref={containerRef}
        aria-hidden="true"
        className={cn(
          'relative font-extrabold tracking-tight leading-tight',
          textSize
        )}
        style={{ perspective: '600px' }}
      >
        <GlowHalo />

        {tokens.map((token, i) => (
          <motion.span
            key={i}
            custom={i}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={charVariants}
            className="inline-block"
            // Adds space back between words when splitting by word
            style={splitByWord && i < tokens.length - 1 ? { marginRight: '0.25em' } : undefined}
          >
            <MagneticChar
              char={token}
              variant={variant}
              charClassName={charClassName}
              noMagnetic={noMagnetic}
            />
          </motion.span>
        ))}
      </h1>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{
            duration: 0.5,
            delay: startDelay + tokens.length * stagger + 0.1,
            ease: 'easeOut',
          }}
          className="mt-1.5 text-sm text-foreground/55 font-normal"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

// ─── Convenience alias kept for backwards compat ──────────────────────────────
export { TextReveal as CascadeText };
