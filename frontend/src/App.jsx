import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const INITIAL_REGISTER = {
  nome: "",
  email: "",
  senha: ""
};

const INITIAL_LOGIN = {
  email: "",
  senha: ""
};

function App() {
  const [tab, setTab] = useState("register");
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loggedUser, setLoggedUser] = useState(null);

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao cadastrar usuario.");
      }

      setStatus({ type: "success", message: data.message });
      setRegisterForm(INITIAL_REGISTER);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao realizar login.");
      }

      setStatus({ type: "success", message: data.message });
      setLoggedUser(data.user);
      setLoginForm(INITIAL_LOGIN);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      setLoggedUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="card">
        <h1>Cadastro e Login</h1>

        <div className="tabs" role="tablist" aria-label="auth tabs">
          <button
            className={tab === "register" ? "tab active" : "tab"}
            type="button"
            onClick={() => setTab("register")}
          >
            Cadastrar
          </button>
          <button
            className={tab === "login" ? "tab active" : "tab"}
            type="button"
            onClick={() => setTab("login")}
          >
            Entrar
          </button>
        </div>

        {tab === "register" ? (
          <form className="form" onSubmit={submitRegister}>
            <label>
              Nome
              <input
                type="text"
                name="nome"
                value={registerForm.nome}
                onChange={handleRegisterChange}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                name="senha"
                value={registerForm.senha}
                onChange={handleRegisterChange}
                minLength={6}
                required
              />
            </label>

            <button className="submit" type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Criar conta"}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={submitLogin}>
            <label>
              Email
              <input
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                name="senha"
                value={loginForm.senha}
                onChange={handleLoginChange}
                required
              />
            </label>

            <button className="submit" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}

        {status.message ? (
          <div className={status.type === "success" ? "status success" : "status error"}>
            {status.message}
          </div>
        ) : null}

        {loggedUser ? (
          <div className="logged-user">
            <strong>Usuario autenticado:</strong>
            <span>ID: {loggedUser.id}</span>
            <span>Nome: {loggedUser.nome}</span>
            <span>Email: {loggedUser.email}</span>
            <span>Criado em: {new Date(loggedUser.criado_em).toLocaleString("pt-BR")}</span>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
