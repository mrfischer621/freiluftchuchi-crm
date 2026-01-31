import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  ChevronDown,
  ChevronRight,
  Contact,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthProvider';

// Regular nav items (without submenus)
const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Sales Pipeline', path: '/sales', icon: TrendingUp },
  // Kunden is handled separately with submenu
  { name: 'Projekte', path: '/projekte', icon: Briefcase },
  { name: 'Produkte', path: '/produkte', icon: Package },
  { name: 'Zeiterfassung', path: '/zeiterfassung', icon: Clock },
  { name: 'Angebote', path: '/angebote', icon: FileSpreadsheet },
  { name: 'Rechnungen', path: '/rechnungen', icon: FileText },
  { name: 'Buchungen', path: '/buchungen', icon: Receipt },
  { name: 'Auswertungen', path: '/auswertungen', icon: BarChart },
  { name: 'Jahresabschluss', path: '/jahresabschluss', icon: CalendarCheck },
];

// Kunden submenu items
const kundenSubItems = [
  { name: 'Alle Kontakte', path: '/kontakte', icon: Contact },
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
  const location = useLocation();

  // Check if current path is in Kunden section
  const isKundenSection = location.pathname === '/kunden' ||
    location.pathname.startsWith('/kunden/') ||
    location.pathname === '/kontakte';

  // Local state for Kunden submenu (auto-expand if in section)
  const [isKundenOpen, setIsKundenOpen] = useState(isKundenSection);

  // Render regular nav item
  const renderNavItem = (item: typeof navItems[0]) => (
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
  );

  // Render Kunden section with submenu
  const renderKundenSection = () => {
    const isKundenActive = location.pathname === '/kunden' || location.pathname.startsWith('/kunden/');

    return (
      <div className="mb-0.5">
        {/* Kunden main link with expand toggle */}
        <div className="flex items-center">
          <NavLink
            to="/kunden"
            end
            className={({ isActive }) =>
              `
                flex-1 flex items-center gap-3
                px-3 py-2.5
                rounded-l-lg
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
            <Users size={18} strokeWidth={2} />
            <span>Kunden</span>
          </NavLink>
          <button
            onClick={() => setIsKundenOpen(!isKundenOpen)}
            className={`
              px-2 py-2.5
              rounded-r-lg
              transition-all duration-150
              ${
                isKundenActive && !isKundenOpen
                  ? 'bg-brand/80 text-white'
                  : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
              }
            `.trim().replace(/\s+/g, ' ')}
          >
            {isKundenOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>

        {/* Submenu items */}
        {isKundenOpen && (
          <div className="ml-4 mt-1 space-y-0.5">
            {kundenSubItems.map((subItem) => (
              <NavLink
                key={subItem.path}
                to={subItem.path}
                end
                className={({ isActive }) =>
                  `
                    flex items-center gap-2.5
                    px-3 py-2
                    rounded-lg
                    text-sm
                    transition-all duration-150
                    ${
                      isActive
                        ? 'bg-brand text-white shadow-glow-brand'
                        : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
                    }
                  `.trim().replace(/\s+/g, ' ')
                }
              >
                {subItem.icon ? (
                  <subItem.icon size={16} strokeWidth={2} />
                ) : (
                  <Users size={16} strokeWidth={2} />
                )}
                <span>{subItem.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

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
        {/* Dashboard & Sales */}
        {navItems.slice(0, 2).map(renderNavItem)}

        {/* Kunden with submenu */}
        {renderKundenSection()}

        {/* Rest of nav items */}
        {navItems.slice(2).map(renderNavItem)}
      </nav>
    </div>
  );
}
