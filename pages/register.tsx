import { useState } from 'react';
import { register } from '../lib/auth';
import Navbar from '../components/Navbar';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
  try {
    console.log('Registering user...');
    const user = await register(email, password);

    if (user) {
      console.log('User registered successfully!');
      // Redirect to home page or show success message
    }
  } catch (error) {
    console.error('Error registering:', error);
    // Show error message
  }
};

  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl">
          <h1 className="text-xl font-bold mb-4">Register</h1>

          <input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border p-2 mb-2 rounded"
          />
          <input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border p-2 mb-2 rounded"
          />
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 mb-2 rounded"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 mb-4 rounded"
          />

          <button onClick={handleRegister} className="w-full bg-black text-white py-2 rounded">
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
