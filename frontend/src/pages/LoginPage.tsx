import { useState } from "react";
import { useAuth } from "../lib/auth";

const TEST_USERS = [
  { email: "alice@exchange.dev", label: "Alice (Submitter)" },
  { email: "bob@exchange.dev", label: "Bob (Validator)" },
  { email: "carol@exchange.dev", label: "Carol (Supervisor)" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(email: string) {
    setLoading(true);
    setError("");
    try {
      await login(email);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">Enterprise Back-Office</h1>
        <p className="text-sm text-gray-500 mb-6">Document Validation Workflow</p>

        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Sign in as test user</p>
          {TEST_USERS.map((u) => (
            <button
              key={u.email}
              onClick={() => handleLogin(u.email)}
              disabled={loading}
              className="w-full text-left px-4 py-2.5 border rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors text-sm"
            >
              {u.label}
              <span className="block text-xs text-gray-400">{u.email}</span>
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
