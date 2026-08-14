import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import useAuth, { isLoggedIn } from "../hooks/useAuth";

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: () => {
    console.log("login before load")
  }
})

function Login() {
  const { loginMutation } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    if (loginMutation.isPending) return
    e.preventDefault();
    loginMutation.mutate({email, password});
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Log in to your account</p>

        {loginMutation.isError && <div className="error-msg">{loginMutation.error.message
        }</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="auth-switch">
          <Link to="/signup">Don't have an account? </Link>
        </div>
      </div>
    </div>
  );
}
