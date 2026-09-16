import React, { useState, useRef, useEffect, useCallback } from "react";
import "./PullToRefresh.css";

/**
 * Native-feeling PullToRefresh for mobile web applications.
 * Keeps the header fixed and applies an elastic overscroll to page content,
 * showing a sleek rotating circular loader below the header.
 */
export default function PullToRefresh({
    children,
    onRefresh,
    disabled = false,
    pullThreshold = 60,
    maxPull = 80,
    className = "",
    style = {}
}) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const containerRef = useRef(null);
    const touchStartY = useRef(0);
    const touchStartX = useRef(0);
    const canPullRef = useRef(false);
    const hasVibratedRef = useRef(false);
    const isRefreshingRef = useRef(false);

    // Keep ref in sync
    useEffect(() => {
        isRefreshingRef.current = isRefreshing;
    }, [isRefreshing]);

    // Find the scrollable container (e.g. .main-content or window)
    const getScrollTop = useCallback(() => {
        if (!containerRef.current) return 0;
        let node = containerRef.current;
        while (node && node !== document.body && node !== document.documentElement) {
            const overflowY = window.getComputedStyle(node).overflowY;
            if ((overflowY === "auto" || overflowY === "scroll") && node.scrollTop !== undefined) {
                return node.scrollTop;
            }
            node = node.parentElement;
        }
        return window.scrollY || document.documentElement.scrollTop || 0;
    }, []);

    const handleTouchStart = useCallback((e) => {
        if (disabled || isRefreshingRef.current) return;
        if (e.touches.length !== 1) return;

        const scrollTop = getScrollTop();
        if (scrollTop <= 1) {
            canPullRef.current = true;
            touchStartY.current = e.touches[0].clientY;
            touchStartX.current = e.touches[0].clientX;
            hasVibratedRef.current = false;
        } else {
            canPullRef.current = false;
        }
    }, [disabled, getScrollTop]);

    const handleTouchMove = useCallback((e) => {
        if (disabled || !canPullRef.current || isRefreshingRef.current) return;
        if (e.touches.length !== 1) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const dy = currentY - touchStartY.current;
        const dx = currentX - touchStartX.current;

        // Verify predominantly vertical swipe downwards
        if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
            // Check again that user is still at top
            if (getScrollTop() <= 1) {
                // Prevent browser native bouncing/reload
                if (e.cancelable) {
                    e.preventDefault();
                }
                setIsPulling(true);
                // Damped elastic calculation
                const damped = Math.min(maxPull, dy * 0.42);
                setPullDistance(damped);

                // Haptic feedback when crossing threshold
                if (damped >= pullThreshold && !hasVibratedRef.current) {
                    hasVibratedRef.current = true;
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                        try {
                            navigator.vibrate(14);
                        } catch (_) {}
                    }
                } else if (damped < pullThreshold) {
                    hasVibratedRef.current = false;
                }
            } else {
                canPullRef.current = false;
                setPullDistance(0);
                setIsPulling(false);
            }
        } else if (dy < 0) {
            // Scrolling up
            canPullRef.current = false;
            setPullDistance(0);
            setIsPulling(false);
        }
    }, [disabled, maxPull, pullThreshold, getScrollTop]);

    const handleTouchEnd = useCallback(async () => {
        if (!canPullRef.current || isRefreshingRef.current) return;
        canPullRef.current = false;
        setIsPulling(false);

        if (pullDistance >= pullThreshold && onRefresh) {
            setIsRefreshing(true);
            setPullDistance(48); // Settle height for active spinner

            try {
                // Guarantee minimum animation duration of 550ms for smooth perception
                await Promise.all([
                    Promise.resolve(onRefresh()),
                    new Promise((resolve) => setTimeout(resolve, 550))
                ]);
            } catch (err) {
                console.warn("[PullToRefresh] Error refreshing:", err);
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            // Animate back to resting
            setPullDistance(0);
        }
    }, [pullDistance, pullThreshold, onRefresh]);

    // Clean up if unmounted during active pull
    useEffect(() => {
        return () => {
            canPullRef.current = false;
        };
    }, []);

    // Progress 0 to 1
    const progress = Math.min(1, pullDistance / pullThreshold);
    const rotation = progress * 320;
    const isIndicatorVisible = pullDistance > 8 || isRefreshing;

    return (
        <div
            ref={containerRef}
            className={`pull-to-refresh-container ${className}`}
            style={style}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Visual Indicator (Circular Badge) */}
            <div
                className={`ptr-indicator ${isIndicatorVisible ? "ptr-visible" : ""} ${isRefreshing ? "ptr-refreshing" : ""}`}
                style={{
                    transform: isRefreshing 
                        ? "translateX(-50%) scale(1)" 
                        : `translateX(-50%) translateY(${Math.min(pullDistance, 36)}px) scale(${0.7 + progress * 0.3})`
                }}
                aria-hidden="true"
            >
                <div
                    className="ptr-spinner"
                    style={{
                        transform: isRefreshing ? undefined : `rotate(${rotation}deg)`
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                </div>
            </div>

            {/* Content with smooth spring overscroll */}
            <div
                className="ptr-content"
                style={{
                    transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : "none",
                    transition: isPulling ? "none" : "transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
            >
                {children}
            </div>
        </div>
    );
}
