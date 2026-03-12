import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const footerLinks = {
  Services: [
    { label: "Culture Surveys", href: "/services#culture-surveys" },
    { label: "Leadership Development", href: "/services#leadership" },
    { label: "The Compass", href: "/services#compass" },
    { label: "Sentiment Analysis", href: "/services#sentiment" },
    { label: "M&A Integration", href: "/services#ma" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-nsp-orange-400/25 bg-nsp-blue-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo size="sm" variant="light" />
            <p className="mt-4 text-sm leading-relaxed text-nsp-orange-100/80">
              People-centered consulting that transforms organizations through
              data-driven insights and actionable strategies.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-sm font-bold text-white">
                {heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-nsp-orange-100/80 transition-colors duration-[180ms] hover:text-nsp-green-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-nsp-orange-400/25 pt-8">
          <p className="text-center text-xs text-nsp-orange-100/70">
            &copy; {new Date().getFullYear()} North Star Partners. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
