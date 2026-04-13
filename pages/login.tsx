import { useState } from 'react';
import { supabase } from '../lib/auth';
import Navbar from '../components/Navbar';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      console.log('Logging in user...');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error logging in:', error);
        // Show error message
      } else {
        console.log('User logged in successfully!');
        // Redirect to home page or show success message
      }
    } catch (error) {
      console.error('Error logging in:', error);
      // Show error message
    }
  };

  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl">
          <h1 className="text-xl font-bold mb-4">Login</h1>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 mb-3 rounded"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 mb-4 rounded"
          />

          <button onClick={handleLogin} className="w-full bg-black text-white py-2 rounded">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
