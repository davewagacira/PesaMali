import React from 'react'

export const PATHS: Record<string, React.ReactNode> = {
  dashboard: <g><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></g>,
  plusCircle: <g><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></g>,
  chart: <g><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 14l4-4 3 3 5-6"/></g>,
  barChart: <g><path d="M4 20V10M10 20V4M16 20v-7"/><path d="M2 20h20"/></g>,
  trophy: <g><path d="M8 21h8M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1"/></g>,
  sparkles: <g><path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9z"/><path d="M19 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></g>,
  settings: <g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>,
  wallet: <g><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M22 8h-6a2 2 0 0 0 0 8h6a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z"/><circle cx="17" cy="12" r=".6" fill="currentColor"/></g>,
  sun: <g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>,
  trendUp: <g><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></g>,
  trendDown: <g><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></g>,
  calendar: <g><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></g>,
  utensils: <g><path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-1.7 0-3 2-3 5 0 2 1 3 2 3v10"/><path d="M16 11h1"/></g>,
  bus: <g><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 9h16M8 21l1-4M16 21l-1-4"/><circle cx="8.5" cy="13.5" r=".6" fill="currentColor"/><circle cx="15.5" cy="13.5" r=".6" fill="currentColor"/></g>,
  home: <g><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></g>,
  phone: <g><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></g>,
  film: <g><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/></g>,
  receipt: <g><path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21z"/><path d="M9 8h6M9 12h6"/></g>,
  send: <g><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></g>,
  bulb: <g><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z"/></g>,
  scissors: <g><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 7.8 20 19M8.1 16.2 20 5"/></g>,
  target: <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></g>,
  search: <g><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></g>,
  check: <path d="M4 12.5l5 5L20 7"/>,
  lock: <g><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>,
  flame: <path d="M12 22c4 0 7-2.7 7-7 0-3-2-5.5-3.5-7C14 6.5 13 4.5 13 2c-3 2-4.5 4.6-4.5 7C7 8 6.3 7 6 5.5 4.8 7.4 4 9.8 4 12c0 6 4 10 8 10z"/>,
  piggy: <g><path d="M19 9.5c.8 0 2-.5 2-2M5 11H3v4h2"/><path d="M5 12.5C5 8.9 8.1 6 12 6s7 2.4 7 6-3.1 6.5-7 6.5c-1 0-2-.2-2.8-.5L8 20v-2.6C6.2 16.3 5 14.5 5 12.5z"/><circle cx="15" cy="11" r=".6" fill="currentColor"/><path d="M10 6.2V4.5a1.5 1.5 0 0 1 3 0"/></g>,
  shield: <g><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/></g>,
  crown: <g><path d="M3 17l-1-9 5.5 4L12 5l4.5 7L22 8l-1 9z"/><path d="M3 21h18"/></g>,
  flag: <g><path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/></g>,
  alert: <g><path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17.5v.5"/></g>,
  user: <g><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></g>,
  coins: <g><circle cx="9" cy="9" r="6"/><path d="M14.3 5.2A6 6 0 1 1 18.8 14.3"/><path d="M7 9h4M9 7v4"/></g>,
  sprout: <g><path d="M12 21v-8"/><path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-3.5 2.5-5 6-5 0 3.5-2.5 5-6 5z"/></g>,
  book: <g><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></g>,
  logout: <g><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></g>,
  bot: <g><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="13" r=".7" fill="currentColor"/><circle cx="15" cy="13" r=".7" fill="currentColor"/><path d="M9 17h6"/></g>,
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6z"/>,
  droplet: <path d="M12 2.7s6.5 7.1 6.5 11.8a6.5 6.5 0 0 1-13 0C5.5 9.8 12 2.7 12 2.7z"/>,
  wifi: <g><path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8" fill="currentColor"/></g>,
  bell: <g><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></g>,
  chevronDown: <path d="M6 9l6 6 6-6"/>,
  edit: <g><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 3 21l.5-4.5L17 3z"/></g>,
  sheet: <g><path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M4 9h16M4 15h16"/></g>,
  file: <g><path d="M4 3h10l6 6v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></g>,
  helpCircle: <g><circle cx="12" cy="12" r="10"/><path d="M12 17v.01"/><path d="M12 13a2 2 0 0 0-2-2 2 2 0 0 0-2 2c0 1 1 2 2 3s2 1 2 2"/></g>,
  repeat: <g><path d="M7 7h10v10M7 17l10-10"/></g>,
  trash: <g><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/><path d="M5 6l.5 11a3 3 0 0 0 3 2.8h7a3 3 0 0 0 3-2.8L19 6"/></g>,
  x: <g><path d="M18 6L6 18M6 6l12 12"/></g>,
}

interface IProps {
  n: string
  size?: number
  style?: React.CSSProperties
}

export function I({ n, size = 18, style }: IProps) {
  return (
    <svg
      className="ic"
      style={{ width: size, height: size, ...style }}
      viewBox="0 0 24 24"
    >
      {PATHS[n] || PATHS.receipt}
    </svg>
  )
}
