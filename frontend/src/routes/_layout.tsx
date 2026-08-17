import { createFileRoute, Link, Outlet, useLocation, redirect } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  FileAudio,
  Settings,
  Menu,
  SquareArrowRightExit,
  X,
} from "lucide-react"; 

import useAuth, {isLoggedIn} from "../hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    console.log("index before load")
    if (!isLoggedIn()) {
        console.log("not logged in")
        // throw redirect({
        //     to: "/login"
        // })
    } else {
        console.log("Logged in")
    }
  }
});

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: <LayoutDashboard size={18} /> },
  { label: "Upload", to: "/audio", icon: <FileAudio size={18} /> },
  { label: "Settings", to: "/settings", icon: <Settings size={18} /> },
  { label: "Logout", to: "/login", icon: <SquareArrowRightExit size={18} /> },
];

function Layout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth()

  const pageName = navItems.find((item) => item.to === location.pathname ).label

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <span className="text-lg font-semibold text-gray-900">
            Trackify
          </span>
          <button
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => {
                setMobileOpen(false);
                if (item.label == "Logout") {
                    logout()
                }
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              activeProps={{
                className: "bg-gray-900 text-white hover:bg-gray-900 hover:text-white",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-4 md:px-6">
          <button
            className="mr-3 rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-gray-900"> {pageName} </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}