/**
 * Dashboard UI Configuration
 *
 * Single source of truth for all dashboard UI tokens.
 * Change values here to update the look & feel across every dashboard page.
 */

export const uiConfig = {
  /** Brand identity */
  brand: {
    name: 'MoveSure',
    /** Text part of the logo */
    logoClass: 'text-[15px] font-bold text-slate-900 tracking-tight',
    /** Accent icon background */
    iconBg: 'bg-indigo-600',
  },

  /** Page-level layout */
  layout: {
    /** Sidebar width */
    sidebarWidth: 'w-72',
    /** Top navbar height */
    headerHeight: 'h-14',
    /** Max width for centred content pages */
    contentMaxWidth: 'max-w-7xl',
    /** Horizontal padding for centred content area */
    pagePadding: 'px-4 sm:px-6 lg:px-8',
    /** Vertical padding for centred content area */
    pageVerticalPadding: 'py-4',
    /** Padding inside the panel when a sidebar is present */
    panelPadding: 'p-6',
  },

  /** Background & surface colours */
  colors: {
    /** App / page background */
    pageBg: 'bg-slate-50',
    /** Top navbar */
    navBg: 'bg-white',
    navBorder: 'border-b border-slate-200',
    navShadow: '',
    /** Card / panel */
    cardBg: 'bg-white',
    cardBorder: 'border border-slate-200',
    /** Sidebar */
    sidebarBg: 'bg-white',
    sidebarBorder: 'border-r border-slate-200',
  },

  /** Primary accent colour (used for active states, CTAs, avatars) */
  accent: {
    /** solid background */
    bg: 'bg-indigo-600',
    /** light tint background */
    tint: 'bg-indigo-50',
    /** text colour */
    text: 'text-indigo-700',
    /** icon colour */
    icon: 'text-indigo-600',
    /** border */
    border: 'border-indigo-200',
  },

  /** Typography */
  text: {
    primary: 'text-slate-900',
    secondary: 'text-slate-500',
    muted: 'text-slate-400',
    label: 'text-slate-700',
  },

  /** Active/selected states */
  active: {
    navLink: 'text-slate-900 font-semibold',
    sidebarLink: 'bg-indigo-50 text-indigo-700 font-medium',
  },

  /** Border radius */
  radius: {
    card: 'rounded-xl',
    cardLg: 'rounded-2xl',
    button: 'rounded-lg',
    input: 'rounded-lg',
    badge: 'rounded-full',
  },
} as const;

export type UIConfig = typeof uiConfig;
