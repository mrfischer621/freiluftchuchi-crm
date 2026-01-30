import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Briefcase,
  Package,
  Clock,
  FileSpreadsheet,
  FileText,
  Receipt,
  BarChart,
  CalendarCheck,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthProvider';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Sales Pipeline', path: '/sales', icon: TrendingUp },
  { name: 'Kunden', path: '/kunden', icon: Users },
  { name: 'Projekte', path: '/projekte', icon: Briefcase },
  { name: 'Produkte', path: '/produkte', icon: Package },
  { name: 'Zeiterfassung', path: '/zeiterfassung', icon: Clock },
  { name: 'Angebote', path: '/angebote', icon: FileSpreadsheet },
  { name: 'Rechnungen', path: '/rechnungen', icon: FileText },
  { name: 'Buchungen', path: '/buchungen', icon: Receipt },
  { name: 'Auswertungen', path: '/auswertungen', icon: BarChart },
  { name: 'Jahresabschluss', path: '/jahresabschluss', icon: CalendarCheck },
];

/**
 * BentoSidebar - Swiss Modern Dark Navigation 2026
 *
 * Design:
 * - Dark background (slate-900)
 * - Light text (slate-400)
 * - High contrast active state (blue-600 + white)
 * - Subtle hover states
 */
export function BentoSidebar() {
  const { selectedCompany, isLoading } = useCompany();
  const { user } = useAuth();

  return (
    <div className="h-full flex flex-col">
      {/* Company Header */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <h1 className="text-base font-semibold text-white tracking-tight truncate">
          {isLoading ? 'Laden...' : selectedCompany?.name || 'Freiluftchuchi'}
        </h1>
        {user && (
          <p className="text-xs text-sidebar-text truncate mt-1">
            {user.email}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `
                flex items-center gap-3
                px-3 py-2.5
                rounded-lg
                mb-0.5
                text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? 'bg-brand text-white shadow-glow-brand'
                    : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
                }
              `.trim().replace(/\s+/g, ' ')
            }
          >
            <item.icon size={18} strokeWidth={2} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
