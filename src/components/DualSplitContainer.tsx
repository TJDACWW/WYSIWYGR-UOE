import React, { useEffect, useRef, useState } from 'react';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface DualSplitContainerProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftAriaLabel: string;
  rightAriaLabel: string;
  splitRatio: number;
  onSplitRatioChange: (nextRatio: number) => void;
  leftBg?: string;
  rightBg?: string;
  leftPaddingClass?: string;
  rightPaddingClass?: string;
}

export const DualSplitContainer: React.FC<DualSplitContainerProps> = ({
  leftPanel,
  rightPanel,
  leftAriaLabel,
  rightAriaLabel,
  splitRatio,
  onSplitRatioChange,
  leftBg = 'var(--bg-panel)',
  rightBg = 'var(--bg-canvas)',
  leftPaddingClass = 'p-5 sm:p-6 lg:p-8',
  rightPaddingClass = 'p-5 sm:p-6 lg:p-8',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > window.innerHeight;
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  const updateRatioFromClientPos = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (isLandscape) {
      if (rect.width <= 0) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      onSplitRatioChange(Math.round(Math.min(82, Math.max(18, pct)) * 10) / 10);
    } else {
      if (rect.height <= 0) return;
      const pct = ((clientY - rect.top) / rect.height) * 100;
      onSplitRatioChange(Math.round(Math.min(82, Math.max(18, pct)) * 10) / 10);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateRatioFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    updateRatioFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 3;
    if (
      (isLandscape && e.key === 'ArrowLeft') ||
      (!isLandscape && e.key === 'ArrowUp')
    ) {
      e.preventDefault();
      onSplitRatioChange(Math.max(18, splitRatio - step));
    } else if (
      (isLandscape && e.key === 'ArrowRight') ||
      (!isLandscape && e.key === 'ArrowDown')
    ) {
      e.preventDefault();
      onSplitRatioChange(Math.min(82, splitRatio + step));
    }
  };

  const clampedRatio = Math.min(82, Math.max(18, splitRatio));

  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 flex overflow-hidden select-text ${
        isLandscape ? 'flex-row' : 'flex-col'
      }`}
      style={{
        backgroundColor: 'var(--bg-canvas)',
        userSelect: isDragging ? 'none' : undefined,
      }}
    >
      {/* Left / Top Independent Scroll Panel */}
      <section
        aria-label={leftAriaLabel}
        className={`min-h-0 min-w-0 overflow-y-auto exercise-scroll print-reset-scroll ${leftPaddingClass}`}
        style={{
          backgroundColor: leftBg,
          flexBasis: `${clampedRatio}%`,
          flexGrow: 0,
          flexShrink: 0,
          height: isLandscape ? '100%' : undefined,
          width: isLandscape ? undefined : '100%',
        }}
      >
        {leftPanel}
      </section>

      {/* Visible Touch & Mouse Draggable Divider Handle */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation={isLandscape ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(clampedRatio)}
        aria-valuemin={18}
        aria-valuemax={82}
        aria-label="Resize panels"
        title="Drag to resize panels"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`no-print relative shrink-0 flex items-center justify-center touch-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
          isLandscape ? 'w-3 h-full cursor-col-resize' : 'h-3 w-full cursor-row-resize'
        }`}
        style={{
          backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--bg-elevated)',
          borderLeft: isLandscape ? '1px solid var(--border-subtle)' : undefined,
          borderRight: isLandscape ? '1px solid var(--border-subtle)' : undefined,
          borderTop: !isLandscape ? '1px solid var(--border-subtle)' : undefined,
          borderBottom: !isLandscape ? '1px solid var(--border-subtle)' : undefined,
        }}
      >
        {/* Prominent Visible Touch/Click Grip Element on Dividing Line */}
        <div
          className={`flex items-center justify-center rounded-full border shadow-sm transition-transform ${
            isLandscape ? 'w-6 h-12' : 'h-6 w-12'
          } ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
          style={{
            backgroundColor: isDragging ? 'var(--accent-bg)' : 'var(--bg-panel)',
            borderColor: isDragging ? 'var(--accent-bg)' : 'var(--border-strong)',
            color: isDragging ? 'var(--accent-text)' : 'var(--text-secondary)',
          }}
        >
          {isLandscape ? (
            <GripVertical className="w-4 h-4" />
          ) : (
            <GripHorizontal className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Right / Bottom Independent Scroll Panel */}
      <section
        aria-label={rightAriaLabel}
        className={`flex-1 min-h-0 min-w-0 overflow-y-auto exercise-scroll print-reset-scroll ${rightPaddingClass}`}
        style={{
          backgroundColor: rightBg,
          height: isLandscape ? '100%' : undefined,
          width: isLandscape ? undefined : '100%',
        }}
      >
        {rightPanel}
      </section>
    </div>
  );
};
