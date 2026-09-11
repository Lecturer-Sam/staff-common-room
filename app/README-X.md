# NACCA QuizBank

> An **offline-first Progressive Web App (PWA)** delivering NaCCA-aligned quizzes for Ghana's Junior High School curriculum (B7–B9 / JHS 1–3). Installable on any device, works without internet, and stores progress locally.

---
 @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 } @theme {
   /* Brand colours (keep existing, add + refine variants) */
   --color-navy:       #0F172A;
+  --color-navy-800:   #1E293B;   /* for card-in-navy, active tab */
+  --color-navy-700:   #334155;   /* chip backgrounds */
   --color-accent:     #FACC15;
+  --color-accent-hover:#FDE047;  /* CTA hover */
   --color-surface:    #F8FAFC;   /* desktop bg only */
+  --color-surface-dark:#0B1220;  /* mobile full-screen bg */
+  --color-ink:        #0F172A;   /* default body on light */
+  --color-ink-inv:    #F8FAFC;   /* default body on dark */

   /* Semantic status pills (for sub-strand cards) */
+  --color-status-progress-bg: #FEF3C7;  /* amber-100 */
+  --color-status-progress-fg: #B45309;  /* amber-700 */
+  --color-status-notstarted-bg:#F1F5F9; /* slate-100 */
+  --color-status-notstarted-fg:#64748B; /* slate-500 */
+  --color-status-completed-bg: #D1FAE5; /* emerald-100 */
+  --color-status-completed-fg: #047857; /* emerald-700 */

   /* Typography: add display serif for mobile "Browse" title */
+  --font-display: 'Playfair Display', 'Georgia', serif;  /* "Browse" big word */
   --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
   --font-mono: 'JetBrains Mono', ui-monospace, monospace;

   /* Radii (add larger) */
   --radius-card:  1.25rem;
+  --radius-chip:  1rem;       /* status pills / breadcrumb pills */
+  --radius-2xl:   1.5rem;     /* outer card wrap */
   --radius-btn:   9999px;

+  /* Shadows from mockups */
+  --shadow-soft:   0 8px 30px -20px rgba(0,0,0,0.30);
+  --shadow-heavy:  0 12px 40px -20px rgba(0,0,0,0.25);
+  --shadow-float:  0 30px 80px -20px rgba(0,0,0,0.50);
 }
## ✨ Features

### 📚 Curriculum Navigation
- **5-level drill-down hierarchy**: Class → Subject → Strand → Sub-strand → Content Standard
- Sticky breadcrumb stepper to jump back to any level
- 8 subjects: Mathematics, English Language, Integrated Science, Social Studies, Computing, Career Technology, Religious & Moral Education, Creative Arts & Design

### 🎯 Quiz Engine
- **5 question types**:
  - `mcq` – Single-best answer multiple choice
  - `multi` – Multi-select (all correct options must be chosen)
  - `tf` – True / False
  - `num` – Numeric entry
  - `short` – Short text answer
- **3 difficulty levels**: Easy · Medium · Hard
- Collapsible question map with answered / flagged / current indicators
- Per-question flagging for review
- Live progress bar + elapsed timer
- Difficulty-aware scoring breakdown on results screen
- Weak-areas review showing questions answered incorrectly

### 📊 Progress & Analytics
- **Daily streak** counter (with today/yesterday grace period)
- **Mastery Grid** — colour-coded heatmap of every Content Standard in a class
- **Radar Chart** — subject-by-subject mastery comparison (Recharts)
- **Attempt History** — last 50 quizzes with score, time, and date
- "Continue Learning" cards — surfaces your lowest-mastery standards first
- One-click **CSV export** of all attempt data

### 💾 Offline-First Architecture
- **IndexedDB** via Dexie — curriculum, questions, and attempt history live on-device
- **Service Worker** (Workbox via vite-plugin-pwa) with:
  - App-shell precaching
  - Stale-while-revalidate for JSON data
  - Network-first with cache fallback for same-origin assets
- **Sync queue** (persisted to localStorage) — attempts saved offline are queued for backend sync when reconnected
- Offline indicator banner + pending-sync badge in the header

### 🛠️ Data Manager (More Screen)
- **Import questions** via drag-and-drop `.json` or `.csv` (includes preview + validation errors)
- **Export questions** to CSV (round-trippable — exported files can be re-imported)
- **Export results** (attempts) to CSV
- Storage usage meter (IndexedDB quota estimate)
- Wipe & re-seed the question bank from bundled data (preserves your attempt history)

### 📱 PWA Experience
- Installable on Android, iOS, and desktop (Add to Home Screen → standalone app)
- Web manifest with app shortcuts (Jump directly to Practice)
- Auto-updating service worker — new versions activate immediately
- SVG icons (192 & 512 px) + maskable support
- Portrait-optimised mobile layout with bottom navigation

---

## 🏗️ Architecture

### Technology Stack

| Layer          | Library / Tool                         | Purpose                                        |
|----------------|----------------------------------------|------------------------------------------------|
| Framework      | [React 19](https://react.dev/)         | UI library                                     |
| Build          | [Vite 8](https://vitejs.dev/)          | Dev server + build (Rolldown bundler)          |
| Styling        | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first CSS with `@theme` tokens      |
| Routing        | [React Router 7](https://reactrouter.com/) | Client-side navigation with layout nesting  |
| Database       | [Dexie 4](https://dexie.org/)          | IndexedDB wrapper + `useLiveQuery` reactivity  |
| State          | [Zustand 5](https://zustand-demo.pmnd.rs/) | 3 stores (quiz, drilldown, offline)        |
| Charts         | [Recharts 3](https://recharts.org/)    | Radar chart + data viz                         |
| CSV            | [PapaParse 5](https://www.papaparse.com/) | CSV import/export                          |
| Icons          | [Lucide React](https://lucide.dev/)    | Consistent icon set                            |
| PWA            | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | Service Worker + manifest            |
| Lint           | ESLint 10 + `eslint-plugin-react-hooks` | Static analysis                             |

### Project Structure

```
src/
├── components/
│   ├── layout/          # AppShell, BottomNav, BreadcrumbStepper, OfflineIndicator
│   ├── pwa/             # InstallPrompt, SyncIndicator
│   └── quiz/            # QuizPlayer, QuestionCard, QuestionMap, Timer, FlagButton, OptionButton
├── db/
│   ├── db.js            # Dexie schema (7 tables) + indexes
│   └── seed.js          # First-boot JSON → IndexedDB seeder with version gate
├── lib/
│   ├── analytics.js     # Mastery, streak, radar, weak-standards calculators
│   └── csvMapper.js     # CSV ↔ Question object bidirectional mapping
├── routes/
│   ├── drilldown/       # ClassGrid, SubjectGrid, StrandList, SubStrandList, ContentStandardList
│   ├── Home.jsx         # Dashboard + drill-down entry point
│   ├── Practice.jsx     # QuizPlayer mount (or idle prompt)
│   ├── Progress.jsx     # Mastery grid · history · radar tabs
│   ├── Results.jsx      # Score ring, breakdown, retry, review
│   └── More.jsx         # Data Manager (import / export / re-seed)
├── stores/
│   ├── quizStore.js     # Active quiz session (non-persisted)
│   ├── drilldownStore.js# Curriculum nav path (persisted to localStorage)
│   └── offlineStore.js  # Network status + sync queue (queue persisted)
├── App.jsx              # RouterProvider mount
├── main.jsx             # Boot: seed DB → mount React
├── router.jsx           # BrowserRouter tree with AppShell layout
└── index.css            # Tailwind import + design-token theme

public/
├── data/
│   ├── curriculum.json  # Classes, subjects, strands, subStrands, contentStandards
│   └── questions.json   # 409 sample questions (meta.count = 409)
├── manifest.webmanifest # PWA manifest (hand-authored, not auto-generated)
├── icon-192.svg
├── icon-512.svg
└── favicon.svg

update/
└── tools/               # Authoring pipeline (Python) — generates data files
    ├── build_data.py    # curriculum.py + items_jhs1..3.py → curriculum.json, questions.json
    ├── curriculum.py    # Curriculum hierarchy definitions (CLASSES, SUBJECTS, TREE)
    ├── items_jhs1.py    # JHS1 question bank
    ├── items_jhs2.py    # JHS2 question bank
    └── items_jhs3.py    # JHS3 question bank
```

### Database Schema (IndexedDB via Dexie)

Version 1 — 7 tables:

| Table            | Key      | Indexes                                                                    |
|------------------|----------|----------------------------------------------------------------------------|
| `classes`        | `&id`    | `code`, `order`                                                            |
| `subjects`       | `&id`    | `code`                                                                     |
| `strands`        | `&id`    | `classId`, `subjectId`, `[classId+subjectId]`                              |
| `subStrands`     | `&id`    | `strandId`, `classId`, `subjectId`, `[classId+subjectId]`                  |
| `contentStandards`| `&id`   | `subStrandId`, `strandId`, `classId`, `subjectId`, `code`, `[classId+subjectId]` |
| `questions`      | `&id`    | `csId`, `classId`, `subjectId`, `type`, `difficulty`, `[classId+subjectId]`, `[csId+difficulty]`, `*tags` |
| `attempts`       | `++id`   | `csId`, `classId`, `subjectId`, `date`, `synced`                           |

Notation: `&` = unique PK, `++` = auto-increment, `[a+b]` = compound, `*` = multi-entry.

### Boot Sequence

1. `main.jsx` calls `seedIfNeeded()` **before** rendering
   - Checks `localStorage['nacca_seed_v'] === SEED_VERSION`
   - If fresh: fetches `/data/curriculum.json` + `/data/questions.json` in parallel
   - Single Dexie `rw` transaction bulk-inserts all 6 curriculum/question tables
   - Sets the seed gate so subsequent boots skip instantly
2. `<App />` mounts → `RouterProvider` → `AppShell` layout → matching route
3. `AppShell` registers `online`/`offline` listeners → `useOfflineStore.setOnline()`
4. Each route reads live from Dexie via `useLiveQuery`

### Route Tree

```
/                              AppShell (header + bottom nav + outlet)
├─ (index)                     Home (dashboard → drill-down)
├─ practice                    Practice (QuizPlayer || idle prompt)
├─ progress                    Progress (3 tabs: grid / history / radar)
├─ results                     Results (post-quiz summary, via nav state)
└─ more                        More (Data Manager)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (Vite 8 requires Node 18+)
- **Yarn** ≥ 4 (project uses Zero-Installs / PnP — see `.yarn/` + `.pnp.cjs`)
  - Or: `npm install` should work too, but lockfile is `yarn.lock`

### Installation

```bash
# Clone the repo
cd quizza

# Dependencies are already cached in .yarn/ (Zero-Installs).
# If you need to refresh:
yarn install
```

### Development

```bash
# Start Vite dev server (HMR, port default 5173)
yarn dev

# Lint the project
yarn lint

# Production build → dist/
yarn build

# Preview the production build (tests SW, PWA)
yarn preview
```

> **Service Worker in dev**: Disabled by default in `vite.config.js` (`devOptions.enabled: false`). Set `enabled: true` to test offline behaviour locally — note that Vite HMR will be served through the SW and may need a reload.

### Testing Offline Behaviour

1. Run `yarn build && yarn preview`
2. Open the preview URL in a browser
3. Once loaded, stop the preview server or set DevTools → Network → Offline
4. Refresh — the app shell and data should load from the SW cache

---

## 📦 Data Files & Authoring Pipeline

### JSON Data Format

The app ships with two bundled data files in `public/data/`. They are fetched on first boot and written to IndexedDB.

**`curriculum.json`** shape:

```jsonc
{
  "meta": { "name": "…", "version": "1.0.0", "levels": ["class","subject","strand","subStrand","contentStandard"] },
  "classes":          [ { "id", "code", "name", "label", "order" } ],
  "subjects":         [ { "id", "code", "name", "icon", "colour", "blurb" } ],
  "strands":          [ { "id", "classId", "subjectId", "num", "name", "code" } ],
  "subStrands":       [ { "id", "strandId", "classId", "subjectId", "num", "name", "code" } ],
  "contentStandards": [ { "id", "subStrandId", "strandId", "classId", "subjectId",
                          "code", "title", "indicators", "coreCompetencies" } ]
}
```

**`questions.json`** shape:

```jsonc
{
  "meta": { "version": "1.0.0", "types": ["mcq","multi","tf","num","short"],
            "difficulties": ["easy","medium","hard"], "count": 409 },
  "items": [
    {
      "id": "ma-b1-001",
      "csId": "jhs1-mathematics-b7-1-1-1",
      "classId": "jhs1",
      "subjectId": "mathematics",
      "type": "mcq",
      "difficulty": "easy",
      "stem": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,                         // index for mcq/tf; number for num;
                                           // number[] for multi; string[] for short
      "explanation": "Why the answer is correct.",
      "tags": ["integers"]
    }
  ]
}
```

### Regenerating Data (Python Authoring Pipeline)

The `update/tools/` folder contains the original authoring scripts:

```python
# curriculum.py   — CLASSES, SUBJECTS, TREE (hierarchy definition)
# items_jhs1.py   — ITEMS_JHS1 { question_id: {...} }
# items_jhs2.py   — ITEMS_JHS2
# items_jhs3.py   — ITEMS_JHS3
# build_data.py   — Assembles all of the above → curriculum.json + questions.json
```

Run (requires Python ≥ 3.10):

```bash
cd update/tools
python -m build_data
```

Output lands in `update/data/`. Copy the two JSON files into `public/data/`, then bump `SEED_VERSION` in `src/db/seed.js` so existing users get the re-seed on next launch.

### CSV Import / Export Format

Questions can be round-tripped via CSV. Columns (case-insensitive headers):

| Column        | Description                                                          |
|---------------|----------------------------------------------------------------------|
| `csId`        | Content standard id, e.g. `jhs1-mathematics-b7-1-1-1`               |
| `classId`     | `jhs1` / `jhs2` / `jhs3`                                            |
| `subjectId`   | `mathematics`, `english`, …                                         |
| `type`        | `mcq` \| `multi` \| `tf` \| `num` \| `short`                        |
| `difficulty`  | `easy` \| `medium` \| `hard`                                        |
| `stem`        | Question text                                                        |
| `optionA`…`F` | Option text (leave blank for `num`/`short`)                          |
| `answer`      | 0-based index (mcq/tf), comma-separated indices (multi), number (num), text (short) |
| `explanation` | Optional rationale                                                   |
| `tags`        | Comma-separated tag list                                             |

Use the More → Data Manager screen to drop a CSV file, or export the current question bank to CSV.

---

## 🧠 State Management

### `useQuizStore` — Active Quiz Session
Ephemeral (not persisted). Lifecycle: `startQuiz()` → `answer()` / `toggleFlag()` → `next()/prev()/goTo()` → `finishQuiz()` → `resetQuiz()`. `finishQuiz()` returns a fully-formed `attempts` record (scored, timed, with per-question correctness) ready for Dexie insertion.

### `useDrilldownStore` — Navigation Path
Persisted (`zustand/middleware` → `localStorage['nacca-drilldown']`). 5-level path: `classId` → `subjectId` → `strandId` → `subStrandId` → `standardId`. Each setter clears all levels below it.

### `useOfflineStore` — Network & Sync Queue
Partial-persist: only `syncQueue` is persisted to `localStorage['nacca-offline']`; `isOnline` re-derives from `navigator.onLine` on each boot and is updated by `online`/`offline` event listeners in `AppShell`.

---

## 🎨 Design Tokens

All visual tokens live in `@theme` block in [index.css](file:///c:/Users/KING/Documents/devs/pwas/quizza/src/index.css#L4-L23):

| Token          | Value      | Use                              |
|----------------|------------|----------------------------------|
| `--navy`       | `#0F172A`  | Primary brand / text             |
| `--accent`     | `#FACC15`  | CTAs, progress, highlights       |
| `--surface`    | `#F8FAFC`  | Background                       |
| `--correct`    | `#10B981`  | Correct answer / ≥70% mastery    |
| `--pending`    | `#F59E0B`  | Flagged / 40–69% mastery         |
| `--wrong`      | `#EF4444`  | Incorrect / <40% mastery         |

Mastery thresholds used across progress, results, and continue-learning cards:
- **≥ 70%** → Mastered (Emerald)
- **40 – 69%** → Progressing (Amber)
- **< 40%** → Needs Work (Red)
- **No attempts** → Not Attempted (Slate)

---

## 🛠️ Build & Caching Strategy

`vite.config.js` splits large vendor libraries into dedicated lazy chunks to keep the app shell TTI small:

```
manualChunks:
  recharts  — recharts (deferred until Progress screen renders)
  router    — react-router-dom
  dexie     — dexie + dexie-react-hooks
```

Service Worker (Workbox) runtime rules:
- `/data/*.json` → **StaleWhileRevalidate** (cached instantly, updated in background; 30-day expiry)
- Same-origin everything else → **NetworkFirst** with 5s timeout, then cache (7-day expiry)

Precache manifest includes: JS/CSS/HTML/SVG/PNG chunks plus the explicit `includeAssets` list (icons + both JSON data files).

---

## 🔧 Development Tips

### Force Re-seed the Database
```js
// Browser console
localStorage.removeItem('nacca_seed_v'); location.reload();
```
Or use More → Data Manager → **Wipe & Re-seed Questions** (preserves attempts).

### Reset Drill-down Path
```js
localStorage.removeItem('nacca-drilldown'); location.reload();
```

### Clear Offline Sync Queue
```js
localStorage.removeItem('nacca-offline'); location.reload();
```

### ESLint
Configuration: flat-config ESLint 10 in [eslint.config.js](file:///c:/Users/KING/Documents/devs/pwas/quizza/eslint.config.js). Ignores `dist/`, applies `js:recommended`, `react-hooks:recommended`, and `react-refresh:vite`.

---

## 📄 License & Data Notice

The bundled sample questions and curriculum text in `public/data/*.json` and `update/tools/items_*.py` are **illustrative placeholder content for UI prototyping**. Replace with officially licensed NaCCA curriculum text and teacher-authored items before classroom use.

---

## 🧭 Roadmap

See [NACCA QuizBank — Build Roadmap.md](file:///c:/Users/KING/Documents/devs/pwas/quizza/NACCA%20QuizBank%20%E2%80%94%20Build%20Roadmap.md) for the original product plan, and `.kiro/steering/roadmap.md` for in-progress steering notes.
