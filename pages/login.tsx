import Navbar from '../components/Navbar';

export default function Login() {
  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl">
          <h1 className="text-xl font-bold mb-4">Login</h1>

          <input
            placeholder="Email"
            className="w-full border p-2 mb-3 rounded"
          />
          <input
            placeholder="Password"
            type="password"
            className="w-full border p-2 mb-4 rounded"
          />

          <button className="w-full bg-black text-white py-2 rounded">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}