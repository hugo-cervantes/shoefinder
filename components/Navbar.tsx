import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b">
      <h1 className="text-2xl font-bold">SoleMate</h1>

      <div className="flex gap-6 text-sm font-medium">
        <Link href="/">Home</Link>
        <Link href="/catalog">Catalog</Link>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </div>
    </nav>
  );
}
