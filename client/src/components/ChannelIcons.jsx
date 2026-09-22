import React from "react";

export const WhatsAppIcon = ({ size = 18, color, className = "", style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.16C10.56 20.16 9.11 19.76 7.85 19.01L7.55 18.83L4.44 19.65L5.27 16.61L5.07 16.3C4.24 14.98 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16ZM16.56 14.39C16.31 14.26 15.09 13.66 14.86 13.58C14.63 13.5 14.47 13.46 14.3 13.7C14.14 13.95 13.65 14.52 13.5 14.69C13.35 14.86 13.2 14.88 12.95 14.76C12.7 14.63 11.9 14.37 10.95 13.52C10.21 12.86 9.71 12.05 9.56 11.8C9.41 11.55 9.55 11.41 9.67 11.29C9.78 11.18 9.92 11 10.04 10.86C10.16 10.72 10.21 10.62 10.29 10.45C10.37 10.29 10.33 10.14 10.27 10.02C10.21 9.9 9.71 8.68 9.51 8.17C9.31 7.68 9.1 7.74 8.95 7.74H8.47C8.3 7.74 8.04 7.8 7.81 8.05C7.59 8.3 6.96 8.88 6.96 10.06C6.96 11.24 7.82 12.38 7.94 12.54C8.06 12.7 9.63 15.12 12.04 16.16C12.61 16.41 13.06 16.56 13.41 16.67C13.99 16.85 14.51 16.83 14.93 16.76C15.4 16.69 16.37 16.17 16.57 15.6C16.78 15.03 16.78 14.55 16.72 14.45C16.66 14.35 16.5 14.29 16.25 14.16L16.56 14.39Z"
      fill={color || "#25D366"}
    />
  </svg>
);

export const EmailIcon = ({ size = 18, color = "currentColor", className = "", style = {} }) => {
  const strokeColor = color;
  const fillColor = color;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, color, ...style }}
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill={fillColor} fillOpacity="0.16" stroke={strokeColor} strokeWidth="1.8" />
      <path
        d="M4.5 7L10.8 11.8C11.52 12.35 12.48 12.35 13.2 11.8L19.5 7"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const SmsIcon = ({ size = 18, color = "currentColor", className = "", style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, color, ...style }}
  >
    <rect x="3" y="3" width="18" height="18" rx="4.5" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.8" />
    <path d="M7 8H17M7 12H14M7 16H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
