"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/", label: "Live Feed" },
  { href: "/locations", label: "My Locations" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <span>🌍</span>
            <span>Earthquake Tracker</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton>
              <button className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="px-3 py-1.5 text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          </Show>
        </div>
      </div>
    </nav>
  );
}
