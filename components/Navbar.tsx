import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuToggle = () => {
    setShowMenu(!showMenu);
  };

  const handleLogout = () => {
    // Perform logout logic here
    // ...
    setShowMenu(false);
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b">
      <h1 className="text-2xl font-bold">SoleMate</h1>

      <div className="flex gap-6 text-sm font-medium">
        <Link href="/">Home</Link>
        <Link href="/catalog">Catalog</Link>
      </div>

      {showMenu ? (
        <div className="relative">
          <button
            className="cursor-pointer"
            onClick={handleMenuToggle}
          >
            <span className="text-2xl">User Icon</span>
          </button>
          <div
            className={`absolute top-full right-0 mt-2 p-4 bg-white border border-gray-300 rounded shadow-lg ${
              showMenu ? 'block' : 'hidden'
            }`}
          >
            <h3 className="text-sm font-medium">User Name</h3>
            <button className="text-sm font-medium text-blue-500 hover:text-blue-700" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <Link href="/login">
          <button className="text-sm font-medium text-blue-500 hover:text-blue-700">Login</button>
        </Link>
      )}
    </nav>
  );
}
