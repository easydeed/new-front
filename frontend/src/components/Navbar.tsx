'use client';

export default function Navbar() {
  return (
    <nav className="w-full sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-dark-slate/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" />
          <div className="text-dark-slate font-semibold text-lg">DeedPro</div>
        </div>
        <ul className="flex space-x-6 text-dark-slate/70">
          <li><a href="#features" className="hover:text-gentle-indigo transition-colors">Features</a></li>
          <li><a href="#pricing" className="hover:text-gentle-indigo transition-colors">Pricing</a></li>
          <li><a href="/login" className="hover:text-gentle-indigo transition-colors">Login</a></li>
        </ul>
      </div>
    </nav>
  );
}