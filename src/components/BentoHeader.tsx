import { useAuth } from '../context/AuthProvider';
import { useCompany } from '../context/CompanyContext';
import { Bell, User, Menu } from 'lucide-react';

/**
 * BentoHeader - Swiss Modern Top Bar 2026
 *
 * Features:
 * - Clean white background
 * - Breadcrumb area (left)
 * - User actions (right)
 * - Mobile menu trigger
 */
export function BentoHeader() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  return (
    <>
      {/* Left Side - Mobile Menu + Breadcrumb */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors"
          aria-label="Menu öffnen"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        {/* Breadcrumb / Page Title Area */}
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">
            {selectedCompany?.name || 'Freiluftchuchi CRM'}
          </span>
        </nav>
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="
            p-2
            rounded-lg
            text-text-secondary
            hover:text-text-primary
            hover:bg-slate-100
            transition-colors duration-150
            relative
          "
          aria-label="Benachrichtigungen"
        >
          <Bell size={18} strokeWidth={2} />
          {/* Notification Dot (optional) */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" /> */}
        </button>

        {/* User Avatar/Menu */}
        <button
          className="
            flex items-center gap-2
            px-3 py-2
            rounded-lg
            bg-slate-100
            text-text-primary
            hover:bg-slate-200
            transition-colors duration-150
          "
        >
          <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center">
            <User size={14} strokeWidth={2} className="text-white" />
          </div>
          <span className="text-sm font-medium hidden sm:block">
            {user?.email?.split('@')[0] || 'User'}
          </span>
        </button>
      </div>
    </>
  );
}
