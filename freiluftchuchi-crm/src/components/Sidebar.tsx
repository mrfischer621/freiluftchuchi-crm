import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  FileText
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Kunden', path: '/kunden', icon: Users },
  { name: 'Projekte', path: '/projekte', icon: Briefcase },
  { name: 'Zeiterfassung', path: '/zeiterfassung', icon: Clock },
  { name: 'Rechnungen', path: '/rechnungen', icon: FileText },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white shadow-md">
      <div className="p-6">
        <h1 className="text-xl font-bold text-freiluft">Freiluftchuchi</h1>
      </div>
      <nav className="px-3">
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
    </aside>
  );
}
