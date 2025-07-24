'use client';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b bg-surface border-slate-200">
      <div className="text-primary font-bold text-xl">DeedPro</div>
      <ul className="flex space-x-6 text-text-secondary">
        <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
        <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
        <li><a href="/login" className="hover:text-primary transition-colors">Login</a></li>
      </ul>
    </nav>
  );
} 