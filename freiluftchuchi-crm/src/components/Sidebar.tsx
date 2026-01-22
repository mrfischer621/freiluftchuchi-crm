import { NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  Clock,
  FileText,
  Receipt,
  ChevronDown,
  Check
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Kunden', path: '/kunden', icon: Users },
  { name: 'Projekte', path: '/projekte', icon: Briefcase },
  { name: 'Produkte', path: '/produkte', icon: Package },
  { name: 'Zeiterfassung', path: '/zeiterfassung', icon: Clock },
  { name: 'Rechnungen', path: '/rechnungen', icon: FileText },
  { name: 'Buchungen', path: '/buchungen', icon: Receipt },
];

export default function Sidebar() {
  const { companies, selectedCompany, setSelectedCompany, isLoading } = useCompany();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // DEBUG: Log companies data
  useEffect(() => {
    console.log('🔍 Sidebar - Companies Array:', companies);
    console.log('🔍 Sidebar - Companies Count:', companies.length);
    console.log('🔍 Sidebar - Selected Company:', selectedCompany);
    console.log('🔍 Sidebar - Is Loading:', isLoading);
  }, [companies, selectedCompany, isLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleCompanySelect = (company: typeof selectedCompany) => {
    if (company) {
      setSelectedCompany(company);
      setIsDropdownOpen(false);
    }
  };

  return (
    <aside className="w-60 bg-white shadow-md">
      {/* Company Switcher */}
      <div className="p-6 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isLoading}
          className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
        >
          <h1 className="text-xl font-bold text-freiluft truncate">
            {isLoading ? 'Laden...' : selectedCompany?.name || 'Firma auswählen'}
          </h1>
          <ChevronDown
            size={18}
            className={`text-gray-500 flex-shrink-0 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && !isLoading && (
          <div className="absolute top-full left-6 right-6 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {companies.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-sm">
                ⚠️ Keine Firmen gefunden. Prüfen Sie RLS-Berechtigungen.
              </div>
            ) : (
              companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleCompanySelect(company)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-teal-50 transition-colors text-left"
                >
                  <span className="font-medium text-gray-900">{company.name}</span>
                  {selectedCompany?.id === company.id && (
                    <Check size={18} className="text-freiluft" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
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
