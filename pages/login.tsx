import Link from 'next/link';

export default function Login() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Login to Shoefinder</h1>
        <form className="space-y-4">
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-md" />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded-md" />
          <button type="submit" className="w-full bg-gray-900 text-white p-3 rounded-md hover:bg-gray-700 transition">
            Login
          </button>
        </form>
        <p className="text-center mt-4">
          Don’t have an account?{' '}
          <Link href="/register" className="text-blue-500 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}