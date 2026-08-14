import { useState, useEffect, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import useAuth from "../hooks/useAuth";

export const Route = createFileRoute('/signup')({
    component: Signup
})

function Signup() {
  const { signupMutation } = useAuth();

  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    if (signupMutation.isPending) {return};
    e.preventDefault()
    signupMutation.mutate({email, password, full_name});
  }

  useEffect(() => {
    console.log(signupMutation.status)
  }, [signupMutation.status])

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create an account</h1>
        <p className="subtitle">Sign up to get started</p>

        {signupMutation.isError && <div className="error-msg">{signupMutation.error.message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>

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
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={signupMutation.isPending}>
            {signupMutation.isPending ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
