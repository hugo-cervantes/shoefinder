// pages/login.tsx
import { NextPage } from 'next'

const Login: NextPage = () => {
  return (
    <div>
      <h1>Login</h1>
      <form>
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </div>
  )
}

export default Login