import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  Clock,
  FileText,
  Receipt,
  BarChart,
  CalendarCheck,
  Settings,
  LogOut
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthProvider';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Kunden', path: '/kunden', icon: Users },
  { name: 'Projekte', path: '/projekte', icon: Briefcase },
  { name: 'Produkte', path: '/produkte', icon: Package },
  { name: 'Zeiterfassung', path: '/zeiterfassung', icon: Clock },
  { name: 'Rechnungen', path: '/rechnungen', icon: FileText },
  { name: 'Buchungen', path: '/buchungen', icon: Receipt },
  { name: 'Auswertungen', path: '/auswertungen', icon: BarChart },
  { name: 'Jahresabschluss', path: '/jahresabschluss', icon: CalendarCheck },
  { name: 'Einstellungen', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { selectedCompany, isLoading } = useCompany();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
    <aside className="w-60 bg-white shadow-md flex flex-col">
      {/* Company Header */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-freiluft truncate">
          {isLoading ? 'Laden...' : selectedCompany?.name || 'Firma'}
        </h1>
        {user && (
          <p className="text-sm text-gray-500 truncate mt-1">{user.email}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-3 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-teal-100 text-freiluft font-medium'
                  : 'text-gray-700 hover:bg-teal-50'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign Out Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
