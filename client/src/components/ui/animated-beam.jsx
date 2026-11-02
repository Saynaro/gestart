"use client";

import { useEffect, useId, useState } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

export const AnimatedBeam = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = Math.random() * 3 + 4,
  delay = 0,
  pathColor = "gray",
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = "#ffaa40",
  gradientStopColor = "#9c40ff",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, "");
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const isInView = useInView(containerRef, { once: false, amount: 0.1 });

  // Calculate the path whenever refs change
  useEffect(() => {
    const updatePath = () => {
      const containerEl = containerRef?.current;
      const fromEl = fromRef?.current;
      const toEl = toRef?.current;

      if (containerEl && fromEl && toEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const svgWidth = containerRect.width;
        const svgHeight = containerRect.height;
        setSvgDimensions({ width: svgWidth, height: svgHeight });

        const startX =
          fromRect.left - containerRect.left + fromRect.width / 2 + startXOffset;
        const startY =
          fromRect.top - containerRect.top + fromRect.height / 2 + startYOffset;
        const endX =
          toRect.left - containerRect.left + toRect.width / 2 + endXOffset;
        const endY =
          toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

        const controlX = (startX + endX) / 2;
        const controlY = (startY + endY) / 2 - curvature;
        const d = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
        setPathD(d);
      }
    };

    const resizeObserver = new ResizeObserver(() => updatePath());
    if (containerRef?.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (fromRef?.current) {
      resizeObserver.observe(fromRef.current);
    }
    if (toRef?.current) {
      resizeObserver.observe(toRef.current);
    }

    updatePath();

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ]);

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      className={cn(
        "pointer-events-none absolute left-0 top-0 select-none stroke-2",
        className
      )}
    >
      <path
        d={pathD}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        stroke={`url(#${id})`}
        strokeWidth={pathWidth}
        strokeOpacity="1"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: reverse ? "100%" : "0%",
            x2: reverse ? "200%" : "-100%",
            y1: "0%",
            y2: "0%",
          }}
          animate={
            isInView
              ? {
                  x1: reverse ? "-100%" : "100%",
                  x2: reverse ? "0%" : "200%",
                  y1: "0%",
                  y2: "0%",
                }
              : undefined
          }
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            duration,
            delay,
            ease: "linear",
          }}
        >
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="32.5%" stopColor={gradientStartColor} />
          <stop offset="67.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};
