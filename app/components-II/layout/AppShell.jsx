// 1. src/components/layout/AppShell.jsx — The Root Wrapper

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import MobileNav from "./MobileNav";
import MobileSheet from "./MobileSheet";

export default function AppShell({ children, pageTitle, pageSubtitle }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar — hidden on mobile, fixed on lg+ */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen flex flex-col lg:ml-64">
        <TopHeader
          pageTitle={pageTitle}
          onMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 xl:p-8 pb-24 lg:pb-8">
          {(pageTitle || pageSubtitle) && (
            <div className="mb-6">
              {pageTitle && (
                <h1 className="text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-app-text mb-1">
                  {pageTitle}
                </h1>
              )}
              {pageSubtitle && (
                <p className="text-sm text-app-text-secondary">{pageSubtitle}</p>
              )}
            </div>
          )}
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </main>

      {/* Mobile Sheet Drawer */}
      <MobileSheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}
