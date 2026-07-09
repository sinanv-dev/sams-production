export const themeTokens = {
  // Base backgrounds
  bg: 'bg-background text-foreground transition-colors duration-200',
  
  // Card backgrounds
  card: 'bg-card border border-border text-foreground transition-colors duration-200',
  cardFlat: 'bg-card text-foreground transition-colors duration-200',
  cardWhite: 'bg-card border border-border text-foreground transition-colors duration-200',
  
  // Borders
  border: 'border-border transition-colors duration-200',
  
  // Text colors
  text: 'text-foreground transition-colors duration-200',
  textSecondary: 'text-muted-foreground transition-colors duration-200',
  textMuted: 'text-muted-foreground/60 transition-colors duration-200',
  
  // Form Inputs
  input: 'w-full bg-input border border-border rounded-xl py-2 px-4 text-sm font-medium text-foreground focus:outline-none focus:border-brand-500 focus:bg-card transition-all duration-200',
  select: 'w-full bg-input border border-border rounded-xl py-2.5 px-4 text-sm font-medium text-foreground focus:outline-none focus:border-brand-500 focus:bg-card transition-all duration-200',

  // Status Classes
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    badge: 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    badge: 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20'
  },
  danger: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    badge: 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20'
  },
  info: {
    bg: 'bg-brand-500/10',
    text: 'text-brand-400',
    border: 'border-brand-500/20',
    badge: 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20'
  }
};
