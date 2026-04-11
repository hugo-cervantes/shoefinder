import Navbar from '../components/Navbar';

export default function Register() {
  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl">
          <h1 className="text-xl font-bold mb-4">Register</h1>

          <input placeholder="First Name" className="w-full border p-2 mb-2 rounded" />
          <input placeholder="Last Name" className="w-full border p-2 mb-2 rounded" />
          <input placeholder="Email" className="w-full border p-2 mb-2 rounded" />
          <input placeholder="Password" type="password" className="w-full border p-2 mb-4 rounded" />

          <button className="w-full bg-black text-white py-2 rounded">
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}