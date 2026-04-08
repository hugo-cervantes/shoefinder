import Link from 'next/link';

export default function Register() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Create an Account</h1>
        <form className="space-y-4">
          <input type="text" placeholder="First Name" className="w-full p-3 border rounded-md" />
          <input type="text" placeholder="Last Name" className="w-full p-3 border rounded-md" />
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-md" />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded-md" />
          <button type="submit" className="w-full bg-gray-900 text-white p-3 rounded-md hover:bg-gray-700 transition">
            Register
          </button>
        </form>
        <p className="text-center mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}