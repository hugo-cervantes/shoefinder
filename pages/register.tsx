// pages/register.tsx
import { NextPage } from 'next'

const Register: NextPage = () => {
  return (
    <div>
      <h1>Create Account</h1>
      <form>
        <input type="text" placeholder="First Name" required />
        <input type="text" placeholder="Last Name" required />
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Password" required />
        <button type="submit">Register</button>
      </form>
    </div>
  )
}

export default Register