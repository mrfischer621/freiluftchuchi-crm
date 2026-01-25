import { Outlet } from 'react-router-dom';
import { BentoSidebar } from './BentoSidebar';
import { BentoHeader } from './BentoHeader';

/**
 * BentoLayout - Swiss Modern App Shell 2026
 *
 * Architecture:
 * - 100vh fixed viewport (no body scroll)
 * - CSS Grid: [Dark Sidebar | Light Content Area]
 * - High contrast: slate-900 sidebar vs slate-50 main
 * - Responsive: Sidebar collapses on mobile
 * - Main content fills available height for Kanban-style pages
 */
export default function BentoLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden flex">
      {/* Sidebar - Dark, Fixed Width */}
      <aside className="w-60 flex-shrink-0 bg-sidebar-bg border-r border-sidebar-border hidden md:flex flex-col">
        <BentoSidebar />
      </aside>

      {/* Main Content Area - Light Background */}
      <div className="flex-1 flex flex-col min-w-0 bg-app-bg">
        {/* Header - Sticky Top */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-surface-border px-6 flex items-center justify-between">
          <BentoHeader />
        </header>

        {/* Main Content - Fills remaining height */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full px-6 py-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
