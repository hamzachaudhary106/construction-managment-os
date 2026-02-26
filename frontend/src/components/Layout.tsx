import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import './Layout.css';

type SearchResult = { type: string; id: number; label: string; url: string };

const fullNavSections: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/projects', label: 'Projects' },
      { to: '/clients', label: 'Clients' },
      { to: '/milestones', label: 'Milestones' },
    ],
  },
  {
    label: 'Finance & contracts',
    items: [
      { to: '/finances', label: 'Finances' },
      { to: '/cost-estimation', label: 'Cost Estimation (PKR)' },
      { to: '/contracts', label: 'Contracts' },
      { to: '/bills', label: 'Bills' },
      { to: '/vendors', label: 'Vendors & Subcontractors' },
      { to: '/purchase-orders', label: 'Purchase Orders' },
      { to: '/extra-work', label: 'Extra Work' },
      { to: '/cash-transfers', label: 'Cash Transfers' },
      { to: '/investors', label: 'Investors & Partners' },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/employees', label: 'Employees' },
      { to: '/payroll', label: 'Payroll' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/documents', label: 'Documents' },
      { to: '/equipment', label: 'Equipment' },
      { to: '/site-diary', label: 'Site Diary & Issues' },
      { to: '/progress-photos', label: 'Progress Photos' },
      { to: '/site-issues', label: 'Site Issues' },
      { to: '/site-queries', label: 'Site Queries (RFI)' },
      { to: '/materials', label: 'Materials' },
      { to: '/safety', label: 'Safety' },
      { to: '/approval-documents', label: 'Approval Documents' },
      { to: '/guarantees', label: 'Bank Guarantees' },
    ],
  },
  {
    label: 'Reports & alerts',
    items: [
      { to: '/reports', label: 'Reports' },
      { to: '/notifications', label: 'Notifications' },
      { to: '/notification-settings', label: 'Notification settings' },
    ],
  },
];

const simpleNavSections: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/projects', label: 'Projects' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/bills', label: 'Bills' },
      { to: '/finances', label: 'Expenses & Income' },
      { to: '/cost-estimation', label: 'Cost Estimation (PKR)' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/documents', label: 'Documents' },
      { to: '/site', label: 'Site Log & Issues' },
    ],
  },
  {
    label: 'Alerts',
    items: [
      { to: '/notifications', label: 'Notifications' },
    ],
  },
];

const adminItems = [
  { to: '/users', label: 'Users' },
  { to: '/audit', label: 'Audit Log' },
];

const MOBILE_BREAKPOINT = 768;

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      client.get('/auth/search/', { params: { q: searchQ.trim() } })
        .then((r) => setSearchResults(r.data?.results ?? []))
        .catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const closeMobileNav = () => setMobileNavOpen(false);
  const handleNavClick = () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) closeMobileNav();
  };

  useEffect(() => {
    if (mobileNavOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  const merchantName = user?.company_name?.trim() || null;
  const productName = 'Construx360';
  const productTagline = 'Construction management';

  const logoMark = (
    <span className="brand-icon" aria-hidden>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-icon-svg">
        <path d="M16 4L4 14v12h24V14L16 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
        <path d="M12 26V16h8v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  );

  return (
    <div className={`layout ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      <div className="sidebar-overlay" aria-hidden={!mobileNavOpen} onClick={closeMobileNav} />
      <aside className="sidebar">
        <div className="sidebar-brand">
          {logoMark}
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-primary">{merchantName || productName}</span>
            <span className="sidebar-brand-byline">
              {merchantName ? (
                <span className="sidebar-byline-product">by {productName}</span>
              ) : (
                <span className="sidebar-brand-tagline">{productTagline}</span>
              )}
            </span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {(isAdmin ? fullNavSections : simpleNavSections).map((section) => (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map(({ to, label }) => (
                <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={handleNavClick}>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          {isAdmin && (
            <>
              <div className="sidebar-divider" aria-hidden />
              <div className="nav-section-label">Administration</div>
              {adminItems.map(({ to, label }) => (
                <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={handleNavClick}>
                  <span>{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.first_name || user?.username}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button type="button" className="btn-logout" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="app-header">
          <div className="app-header-inner">
            <button type="button" className="header-menu-btn" aria-label="Open menu" onClick={() => setMobileNavOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="app-header-brand">
              <span className="app-header-title">{merchantName || productName}</span>
              <span className="app-header-byline">
                {merchantName ? `by ${productName}` : productTagline}
              </span>
            </div>
            <div className={`global-search-wrap ${searchExpanded ? 'is-expanded' : ''}`} ref={searchRef}>
              <input
                type="search"
                className="global-search-input"
                placeholder="Search projects, contracts, bills…"
                value={searchQ}
                onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => { setSearchOpen(true); setSearchExpanded(true); }}
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="global-search-dropdown">
                  {searchResults.map((r) => (
                    <button
                      type="button"
                      key={`${r.type}-${r.id}`}
                      className="global-search-item"
                      onClick={() => { navigate(r.url); setSearchOpen(false); setSearchQ(''); setSearchResults([]); setSearchExpanded(false); }}
                    >
                      <span className="global-search-item-type">{r.type}</span>
                      <span className="global-search-item-label">{r.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="app-header-user"><span>{user?.first_name || user?.username}</span> · {user?.role}</span>
          </div>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
