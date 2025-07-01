import { useState } from 'react';
import Button from '../components/button/button';

export interface LoginProps {
  onLogin: (token: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [token, setToken] = useState('');

  return (
    <div className="flex items-center gap-4">
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="API Token"
        className=" rounded-md outline-none ring-outset ring-1 bg-white p-2 focus-visible:ring-2 focus-visible:ring-offset-2 ring-slate-200 hover:ring-slate-400 focus-visible:ring-blue-500"
      />
      <Button onClick={() => onLogin(token)}>Login</Button>
    </div>
  );
}

export default Login;
