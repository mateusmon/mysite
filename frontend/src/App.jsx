import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const AUTH_STORAGE_KEY = "garage_logged_user";
const AUTH_TOKEN_STORAGE_KEY = "garage_auth_token";
const AUTH_REFRESH_TOKEN_STORAGE_KEY = "garage_refresh_token";
const SETTINGS_STORAGE_KEY_PREFIX = "garage_user_settings_";

const INITIAL_REGISTER = { nome: "", email: "", senha: "" };
const INITIAL_LOGIN = { email: "", senha: "" };
const INITIAL_PASSWORD_RESET = { resetToken: "", novaSenha: "" };
const INITIAL_SIMULATOR = {
  orcamento: 120000,
  rendaMensal: 8000,
  uso: "urbano",
  perfil: "solteiro",
  prioridade: "economia"
};

const DEFAULT_SITE_SETTINGS = {
  emailNotifications: true,
  newsletter: false,
  priceAlerts: true,
  compactView: false
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function normalizeText(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeLoose(value) {
  return normalizeText(value).replace(/([a-z0-9])\1+/g, "$1");
}

function getSettingsKey(userId) {
  return `${SETTINGS_STORAGE_KEY_PREFIX}${userId}`;
}

function withAuthHeaders(token, headers = {}) {
  if (!token) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`
  };
}

function requestJson(url, options = {}) {
  return fetch(url, options).then(async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Erro ao processar requisição.");
    }

    return data;
  });
}

function isTokenError(message) {
  const normalized = normalizeText(message || "");
  return normalized.includes("token");
}

function isSessionError(message) {
  const normalized = normalizeText(message || "");
  return normalized.includes("sessao");
}

function App() {
  const [authTab, setAuthTab] = useState("register");
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ type: "", message: "" });
  const [loggedUser, setLoggedUser] = useState(() => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      const refresh = localStorage.getItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw && token && refresh ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
    } catch (_error) {
      return "";
    }
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    try {
      return localStorage.getItem(AUTH_REFRESH_TOKEN_STORAGE_KEY) || "";
    } catch (_error) {
      return "";
    }
  });
  const [recoverEmail, setRecoverEmail] = useState("");
  const [resetForm, setResetForm] = useState(INITIAL_PASSWORD_RESET);

  const [toolTab, setToolTab] = useState("overview");
  const [cars, setCars] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState({ type: "", message: "" });

  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteBusyId, setFavoriteBusyId] = useState("");
  const [favoriteSearch, setFavoriteSearch] = useState("");

  const [selectedModels, setSelectedModels] = useState([]);
  const [compareSearch, setCompareSearch] = useState("");
  const [kmMensal, setKmMensal] = useState(1200);
  const [precoCombustivel, setPrecoCombustivel] = useState(5.79);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState([]);
  const [comparisonHistory, setComparisonHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [simulatorForm, setSimulatorForm] = useState(INITIAL_SIMULATOR);
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState([]);
  const [profileForm, setProfileForm] = useState({ nome: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS);

  const [selectedMaintenanceModel, setSelectedMaintenanceModel] = useState("");
  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState(null);

  const carsById = useMemo(() => new Map(cars.map((car) => [car.id, car])), [cars]);

  const normalizedCompareSearch = normalizeText(compareSearch);
  const looseCompareSearch = normalizeLoose(compareSearch);
  const filteredCompareCars = cars
    .filter((car) => {
      const normalizedModel = normalizeText(car.modelo);
      if (normalizedModel.includes(normalizedCompareSearch)) {
        return true;
      }

      return normalizeLoose(normalizedModel).includes(looseCompareSearch);
    })
    .slice(0, 40);

  const normalizedMaintenanceSearch = normalizeText(maintenanceSearch);
  const looseMaintenanceSearch = normalizeLoose(maintenanceSearch);
  const filteredMaintenanceCars = cars.filter((car) => {
    const normalizedModel = normalizeText(car.modelo);
    if (normalizedModel.includes(normalizedMaintenanceSearch)) {
      return true;
    }

    return normalizeLoose(normalizedModel).includes(looseMaintenanceSearch);
  });

  const favoriteCars = favoriteIds
    .map((carId) => carsById.get(carId))
    .filter(Boolean);

  const normalizedFavoriteSearch = normalizeText(favoriteSearch);
  const looseFavoriteSearch = normalizeLoose(favoriteSearch);
  const filteredFavoriteCars = favoriteCars.filter((car) => {
    const normalizedModel = normalizeText(car.modelo);
    if (normalizedModel.includes(normalizedFavoriteSearch)) {
      return true;
    }

    return normalizeLoose(normalizedModel).includes(looseFavoriteSearch);
  });

  useEffect(() => {
    try {
      if (loggedUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (_error) {
      // Ignore localStorage errors without breaking the app.
    }
  }, [loggedUser]);

  useEffect(() => {
    try {
      if (authToken) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch (_error) {
      // Ignore localStorage errors without breaking the app.
    }
  }, [authToken]);

  useEffect(() => {
    try {
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      } else {
        localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
      }
    } catch (_error) {
      // Ignore localStorage errors without breaking the app.
    }
  }, [refreshToken]);

  useEffect(() => {
    if (!loggedUser) {
      setProfileForm({ nome: "", email: "" });
      setSiteSettings(DEFAULT_SITE_SETTINGS);
      return;
    }

    setProfileForm({ nome: loggedUser.nome || "", email: loggedUser.email || "" });

    try {
      const raw = localStorage.getItem(getSettingsKey(loggedUser.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        setSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...parsed });
      } else {
        setSiteSettings(DEFAULT_SITE_SETTINGS);
      }
    } catch (_error) {
      setSiteSettings(DEFAULT_SITE_SETTINGS);
    }
  }, [loggedUser]);

  useEffect(() => {
    if (!loggedUser) {
      return;
    }

    try {
      localStorage.setItem(getSettingsKey(loggedUser.id), JSON.stringify(siteSettings));
    } catch (_error) {
      // ignore
    }
  }, [loggedUser, siteSettings]);

  useEffect(() => {
    if (!loggedUser) {
      return;
    }

    const loadCars = async () => {
      setCatalogLoading(true);

      try {
        const data = await requestJson(`${API_URL}/api/cars`);
        const loadedCars = data.cars || [];

        setCars(loadedCars);
        setDashboardStatus({ type: "", message: "" });

        if (loadedCars.length > 0) {
          setSelectedModels([loadedCars[0].id, loadedCars[1]?.id].filter(Boolean));
          setSelectedMaintenanceModel(loadedCars[0].id);
        }
      } catch (error) {
        setDashboardStatus({ type: "error", message: error.message });
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCars();
  }, [loggedUser]);

  useEffect(() => {
    if (!loggedUser || !authToken) {
      return;
    }

    const loadFavorites = async () => {
      setFavoriteLoading(true);

      try {
        const data = await requestWithAuth(`${API_URL}/api/favorites`);
        setFavoriteIds(data.favoriteIds || []);
      } catch (error) {
        setFavoriteIds([]);
        setDashboardStatus({ type: "error", message: error.message });
        if (isTokenError(error.message) || isSessionError(error.message)) {
          clearSession();
        }
      } finally {
        setFavoriteLoading(false);
      }
    };

    loadFavorites();
  }, [loggedUser, authToken]);

  useEffect(() => {
    if (!loggedUser || !authToken) {
      return;
    }

    loadComparisonHistory();
  }, [loggedUser, authToken]);

  useEffect(() => {
    if (!loggedUser || !selectedMaintenanceModel) {
      return;
    }

    const loadMaintenance = async () => {
      setMaintenanceLoading(true);

      try {
        const data = await requestJson(`${API_URL}/api/maintenance/${selectedMaintenanceModel}`);
        setMaintenanceData(data);
      } catch (error) {
        setMaintenanceData(null);
        setDashboardStatus({ type: "error", message: error.message });
      } finally {
        setMaintenanceLoading(false);
      }
    };

    loadMaintenance();
  }, [loggedUser, selectedMaintenanceModel]);

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const clearSession = () => {
    setLoggedUser(null);
    setAuthToken("");
    setRefreshToken("");
    setFavoriteIds([]);
    setComparisonHistory([]);
    setCars([]);
  };

  const refreshSession = async () => {
    if (!refreshToken) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    try {
      const data = await requestJson(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });

      setLoggedUser(data.user);
      setAuthToken(data.token || "");
      setRefreshToken(data.refreshToken || "");

      return data.token || "";
    } catch (error) {
      clearSession();
      throw error;
    }
  };

  const requestWithAuth = async (url, options = {}) => {
    if (!authToken) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const baseHeaders = options.headers || {};
    try {
      return await requestJson(url, {
        ...options,
        headers: withAuthHeaders(authToken, baseHeaders)
      });
    } catch (error) {
      if (!isTokenError(error.message)) {
        throw error;
      }

      const newToken = await refreshSession();
      if (!newToken) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      return requestJson(url, {
        ...options,
        headers: withAuthHeaders(newToken, baseHeaders)
      });
    }
  };

  const loadComparisonHistory = async () => {
    if (!loggedUser || !authToken) {
      setComparisonHistory([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const data = await requestWithAuth(`${API_URL}/api/comparisons/history?limit=15`);
      setComparisonHistory(data.historico || []);
    } catch (error) {
      setComparisonHistory([]);
      setDashboardStatus({ type: "error", message: error.message });
      if (isTokenError(error.message) || isSessionError(error.message)) {
        clearSession();
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthStatus({ type: "", message: "" });

    try {
      const data = await requestJson(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm)
      });

      setAuthStatus({ type: "success", message: data.message });
      setRegisterForm(INITIAL_REGISTER);
      setLoggedUser(data.user);
      setAuthToken(data.token || "");
      setRefreshToken(data.refreshToken || "");
    } catch (error) {
      setAuthStatus({ type: "error", message: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthStatus({ type: "", message: "" });

    try {
      const data = await requestJson(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      setAuthStatus({ type: "success", message: data.message });
      setLoginForm(INITIAL_LOGIN);
      setLoggedUser(data.user);
      setAuthToken(data.token || "");
      setRefreshToken(data.refreshToken || "");
    } catch (error) {
      setAuthStatus({ type: "error", message: error.message });
      clearSession();
    } finally {
      setAuthLoading(false);
    }
  };

  const submitForgotPassword = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthStatus({ type: "", message: "" });

    try {
      const data = await requestJson(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoverEmail })
      });

      const extraToken = data.resetToken ? ` Token: ${data.resetToken}` : "";
      setAuthStatus({ type: "success", message: `${data.message}${extraToken}` });
    } catch (error) {
      setAuthStatus({ type: "error", message: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthStatus({ type: "", message: "" });

    try {
      const data = await requestJson(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetForm)
      });

      setAuthStatus({ type: "success", message: data.message });
      setResetForm(INITIAL_PASSWORD_RESET);
      setAuthTab("login");
    } catch (error) {
      setAuthStatus({ type: "error", message: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleSetting = (settingKey) => {
    setSiteSettings((prev) => ({ ...prev, [settingKey]: !prev[settingKey] }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    if (!loggedUser || !authToken) {
      return;
    }

    setProfileLoading(true);
    setDashboardStatus({ type: "", message: "" });

    try {
      const data = await requestWithAuth(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: profileForm.nome,
          email: profileForm.email
        })
      });

      setLoggedUser(data.user);
      setDashboardStatus({ type: "success", message: data.message });
    } catch (error) {
      setDashboardStatus({ type: "error", message: error.message });
      if (isTokenError(error.message) || isSessionError(error.message)) {
        clearSession();
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const isFavorite = (carId) => favoriteIds.includes(carId);

  const toggleFavorite = async (carId) => {
    if (!loggedUser || !authToken || favoriteBusyId) {
      return;
    }

    setFavoriteBusyId(carId);
    setDashboardStatus({ type: "", message: "" });

    try {
      if (isFavorite(carId)) {
        await requestWithAuth(`${API_URL}/api/favorites`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId })
        });

        setFavoriteIds((prev) => prev.filter((id) => id !== carId));
      } else {
        await requestWithAuth(`${API_URL}/api/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId })
        });

        setFavoriteIds((prev) => [carId, ...prev.filter((id) => id !== carId)]);
      }
    } catch (error) {
      setDashboardStatus({ type: "error", message: error.message });
      if (isTokenError(error.message) || isSessionError(error.message)) {
        clearSession();
      }
    } finally {
      setFavoriteBusyId("");
    }
  };

  const handleToggleModel = (modelId) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }

      if (prev.length >= 4) {
        return [...prev.slice(1), modelId];
      }

      return [...prev, modelId];
    });
  };

  const submitComparison = async (event) => {
    event.preventDefault();
    setComparisonLoading(true);
    setDashboardStatus({ type: "", message: "" });

    try {
      const data = await requestWithAuth(`${API_URL}/api/cars/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelIds: selectedModels,
          kmMensal,
          precoCombustivel
        })
      });

      setComparisonResult(data.resultados || []);
      await loadComparisonHistory();
    } catch (error) {
      setComparisonResult([]);
      setDashboardStatus({ type: "error", message: error.message });
      if (isTokenError(error.message) || isSessionError(error.message)) {
        clearSession();
      }
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleSimulatorChange = (event) => {
    const { name, value } = event.target;
    setSimulatorForm((prev) => ({
      ...prev,
      [name]: name === "orcamento" || name === "rendaMensal" ? Number(value) : value
    }));
  };

  const submitSimulator = async (event) => {
    event.preventDefault();
    setSimulatorLoading(true);
    setDashboardStatus({ type: "", message: "" });

    try {
      const data = await requestJson(`${API_URL}/api/cars/simulator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simulatorForm)
      });

      setSimulatorResult(data.sugestoes || []);
    } catch (error) {
      setSimulatorResult([]);
      setDashboardStatus({ type: "error", message: error.message });
    } finally {
      setSimulatorLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await requestJson(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (_error) {
      // Ignore logout failures and clear local session anyway.
    }

    setLoggedUser(null);
    setAuthToken("");
    setRefreshToken("");
    setAuthTab("login");
    setAuthStatus({ type: "", message: "" });
    setDashboardStatus({ type: "", message: "" });
    setFavoriteIds([]);
    setFavoriteSearch("");
    setComparisonResult([]);
    setComparisonHistory([]);
    setSimulatorResult([]);
    setMaintenanceData(null);
    setCompareSearch("");
    setMaintenanceSearch("");
    setProfileForm({ nome: "", email: "" });
    setSiteSettings(DEFAULT_SITE_SETTINGS);
    setCars([]);
  };

  if (!loggedUser) {
    return (
      <main className="auth-layout">
        <section className="auth-card">
          <h1> MMP Garage </h1>
          <p className="lead">Cadastre-se e descubra o carro ideal para o seu perfil.</p>

          <div className="tabs" role="tablist" aria-label="auth tabs">
            <button
              className={authTab === "register" ? "tab active" : "tab"}
              type="button"
              onClick={() => setAuthTab("register")}
            >
              Criar conta
            </button>
            <button
              className={authTab === "login" ? "tab active" : "tab"}
              type="button"
              onClick={() => setAuthTab("login")}
            >
              Entrar
            </button>
            <button
              className={authTab === "recover" ? "tab active" : "tab"}
              type="button"
              onClick={() => setAuthTab("recover")}
            >
              Recuperar senha
            </button>
          </div>

          {authTab === "register" ? (
            <form className="form" onSubmit={submitRegister}>
              <label>
                Nome
                <input type="text" name="nome" value={registerForm.nome} onChange={handleRegisterChange} required />
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

              <button className="submit" type="submit" disabled={authLoading}>
                {authLoading ? "Criando..." : "Criar conta"}
              </button>
            </form>
          ) : authTab === "login" ? (
            <form className="form" onSubmit={submitLogin}>
              <label>
                Email
                <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} required />
              </label>

              <label>
                Senha
                <input type="password" name="senha" value={loginForm.senha} onChange={handleLoginChange} required />
              </label>

              <button className="submit" type="submit" disabled={authLoading}>
                {authLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <div className="form">
              <form className="form" onSubmit={submitForgotPassword}>
                <label>
                  Email da conta
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(event) => setRecoverEmail(event.target.value)}
                    required
                  />
                </label>
                <button className="submit" type="submit" disabled={authLoading}>
                  {authLoading ? "Enviando..." : "Enviar token de recuperação"}
                </button>
              </form>

              <form className="form" onSubmit={submitResetPassword}>
                <label>
                  Token de recuperação
                  <input
                    type="text"
                    value={resetForm.resetToken}
                    onChange={(event) => setResetForm((prev) => ({ ...prev, resetToken: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  Nova senha
                  <input
                    type="password"
                    minLength={6}
                    value={resetForm.novaSenha}
                    onChange={(event) => setResetForm((prev) => ({ ...prev, novaSenha: event.target.value }))}
                    required
                  />
                </label>

                <button className="submit" type="submit" disabled={authLoading}>
                  {authLoading ? "Redefinindo..." : "Redefinir senha"}
                </button>
              </form>
            </div>
          )}

          {authStatus.message ? (
            <div className={authStatus.type === "success" ? "status success" : "status error"}>
              {authStatus.message}
            </div>
          ) : null}

        </section>
      </main>
    );
  }

  return (
    <main className={`dashboard-layout${siteSettings.compactView ? " compact-mode" : ""}`}>
      <div className="outside-tabs" role="tablist" aria-label="atalhos">
        <button
          type="button"
          className={toolTab === "favorites" ? "outside-tab active" : "outside-tab"}
          onClick={() => setToolTab("favorites")}
        >
          Favoritos
        </button>
        <button
          type="button"
          className={toolTab === "profile" ? "outside-tab active" : "outside-tab"}
          onClick={() => setToolTab("profile")}
        >
          Perfil
        </button>
      </div>

      <section className="dashboard-card">
        <header className="dashboard-header">
          <div>
            <h1> MMP Garage</h1>
            <p>
              Olá, <strong>{loggedUser.nome}</strong>. Compare custos, simule perfil e acompanhe manutenção.
            </p>
          </div>
          <div className="dashboard-actions">
            {toolTab !== "overview" ? (
              <button className="ghost-button" type="button" onClick={() => setToolTab("overview")}>
                Início
              </button>
            ) : null}
            <button className="ghost-button" type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        {dashboardStatus.message ? (
          <div className={dashboardStatus.type === "success" ? "status success" : "status error"}>
            {dashboardStatus.message}
          </div>
        ) : null}

        {catalogLoading ? <p className="loading">Carregando catalogo...</p> : null}
        {favoriteLoading ? <p className="loading">Sincronizando favoritos...</p> : null}

        {toolTab === "overview" ? (
          <section className="tool-panel">
            <h2>Painel principal</h2>
            <p className="search-meta">Escolha uma seção para explorar comparações, favoritos, simulação e manutenção.</p>
            <div className="overview-grid">
              <article className="overview-card">
                <h3>Comparador de custo</h3>
                <p>Compare até 4 modelos por vez com foco em gasto mensal.</p>
                <button className="ghost-button" type="button" onClick={() => setToolTab("compare")}>
                  Ir para comparador
                </button>
              </article>
              <article className="overview-card">
                <h3>Histórico</h3>
                <p>Veja os últimos comparativos salvos na sua conta.</p>
                <button className="ghost-button" type="button" onClick={() => setToolTab("history")}>
                  Ver histórico
                </button>
              </article>

              <article className="overview-card">
                <h3>Simulador de perfil</h3>
                <p>Receba sugestões com base em orçamento, uso e prioridade.</p>
                <button className="ghost-button" type="button" onClick={() => setToolTab("simulator")}>
                  Ir para simulador
                </button>
              </article>
              <article className="overview-card">
                <h3>Peças</h3>
                <p>Consulte revisões, peças comuns e problemas conhecidos.</p>
                <button className="ghost-button" type="button" onClick={() => setToolTab("maintenance")}>
                  Ir para manutenção
                </button>
              </article>

            </div>
          </section>
        ) : null}

        {toolTab === "compare" ? (
          <section className="tool-panel">
            <h2> Comparador de custo do carro</h2>
            <form className="form" onSubmit={submitComparison}>
              <div className="grid two">
                <label>
                  KM mensal
                  <input
                    type="number"
                    min={200}
                    step={100}
                    value={kmMensal}
                    onChange={(event) => setKmMensal(Number(event.target.value))}
                    required
                  />
                </label>

                <label>
                  Preço do combustível (R$/L)
                  <input
                    type="number"
                    min={3}
                    step="0.01"
                    value={precoCombustivel}
                    onChange={(event) => setPrecoCombustivel(Number(event.target.value))}
                    required
                  />
                </label>
              </div>

              <label>
                Pesquisar modelo para comparar
                <input
                  type="text"
                  value={compareSearch}
                  onChange={(event) => setCompareSearch(event.target.value)}
                  placeholder="Ex: Onix 2025"
                />
              </label>

              <p className="search-meta">
                Mostrando {filteredCompareCars.length} de {cars.length} modelos. Selecionados: {selectedModels.length}/4.
              </p>

              <div className="option-list">
                {filteredCompareCars.map((car) => (
                  <div key={car.id} className="option-item">
                    <label className="option-main">
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(car.id)}
                        onChange={() => handleToggleModel(car.id)}
                      />
                      <span>{car.modelo}</span>
                    </label>
                    <button
                      className={isFavorite(car.id) ? "fav-btn active" : "fav-btn"}
                      type="button"
                      onClick={() => toggleFavorite(car.id)}
                      disabled={favoriteBusyId === car.id}
                    >
                      {isFavorite(car.id) ? "\u2605" : "\u2606"}
                    </button>
                  </div>
                ))}
              </div>

              {filteredCompareCars.length === 0 ? (
                <p className="empty-list">Nenhum modelo encontrado com essa pesquisa.</p>
              ) : null}

              <button className="submit" type="submit" disabled={comparisonLoading}>
                {comparisonLoading ? "Comparando..." : "Comparar agora"}
              </button>
            </form>

            {comparisonResult.length > 0 ? (
              <div className="table-wrap">
                <p className="winner-line">
                  Melhor custo mensal: <strong>{comparisonResult[0].modelo}</strong>
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Preço</th>
                      <th>Consumo</th>
                      <th>Seguro estimado</th>
                      <th>Manutenção estimada</th>
                      <th>Gasto mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.map((car) => (
                      <tr key={car.id}>
                        <td>{car.modelo}</td>
                        <td>{formatMoney(car.preco)}</td>
                        <td>{numberFormatter.format(car.consumo_km_l)} km/l</td>
                        <td>{formatMoney(car.seguro_mensal)}</td>
                        <td>{formatMoney(car.manutencao_mensal)}</td>
                        <td>{formatMoney(car.gasto_mensal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}

        {toolTab === "history" ? (
          <section className="tool-panel">
            <h2>Histórico de comparações</h2>
            {historyLoading ? <p className="loading">Carregando histórico...</p> : null}

            {!historyLoading && comparisonHistory.length === 0 ? (
              <p className="empty-list">Você ainda não tem comparações salvas.</p>
            ) : null}

            {!historyLoading && comparisonHistory.length > 0 ? (
              <div className="history-grid">
                {comparisonHistory.map((item) => (
                  <article className="history-card" key={item.id}>
                    <header>
                      <h3>
                        {item.resultados?.[0]?.modelo
                          ? `Melhor resultado: ${item.resultados[0].modelo}`
                          : "Comparação"}
                      </h3>
                      <span>{new Date(item.criadoEm).toLocaleString("pt-BR")}</span>
                    </header>
                    <p>
                      Parâmetros: {item.kmMensal} km/mês - Combustível {formatMoney(item.precoCombustivel)}
                    </p>
                    <ul>
                      {(item.resultados || []).slice(0, 3).map((car) => (
                        <li key={`${item.id}-${car.id}`}>
                          {car.modelo} - {formatMoney(car.gasto_mensal)}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {toolTab === "favorites" ? (
          <section className="tool-panel">
            <h2> Favoritos</h2>
            <label>
              Pesquisar nos favoritos
              <input
                type="text"
                value={favoriteSearch}
                onChange={(event) => setFavoriteSearch(event.target.value)}
                placeholder="Ex: BMW 2024"
              />
            </label>

            {filteredFavoriteCars.length === 0 ? (
              <p className="empty-list">Nenhum favorito encontrado. Use o botão estrela na aba de comparação.</p>
            ) : (
              <div className="favorite-grid">
                {filteredFavoriteCars.map((car) => (
                  <article className="favorite-card" key={car.id}>
                    <header>
                      <h3>{car.modelo}</h3>
                      <button
                        className="fav-btn active"
                        type="button"
                        onClick={() => toggleFavorite(car.id)}
                        disabled={favoriteBusyId === car.id}
                      >
                        {"\u2605"}
                      </button>
                    </header>
                    <p>Preço: {formatMoney(car.preco)}</p>
                    <p>Consumo: {numberFormatter.format(car.consumo_km_l)} km/l</p>
                    <p>Seguro: {formatMoney(car.seguro_mensal)}</p>
                    <p>Manutenção: {formatMoney(car.manutencao_mensal)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {toolTab === "simulator" ? (
          <section className="tool-panel">
            <h2> Simulador: qual carro combina comigo?</h2>
            <form className="form" onSubmit={submitSimulator}>
              <div className="grid two">
                <label>
                  Orçamento máximo
                  <input
                    type="number"
                    name="orcamento"
                    min={50000}
                    step={1000}
                    value={simulatorForm.orcamento}
                    onChange={handleSimulatorChange}
                    required
                  />
                </label>

                <label>
                  Quanto você ganha por mês
                  <input
                    type="number"
                    name="rendaMensal"
                    min={1200}
                    step={100}
                    value={simulatorForm.rendaMensal}
                    onChange={handleSimulatorChange}
                    required
                  />
                </label>

                <label>
                  Tipo de uso
                  <select name="uso" value={simulatorForm.uso} onChange={handleSimulatorChange}>
                    <option value="urbano">Uso urbano</option>
                    <option value="estrada">Uso em estrada</option>
                  </select>
                </label>

                <label>
                  Perfil
                  <select name="perfil" value={simulatorForm.perfil} onChange={handleSimulatorChange}>
                    <option value="solteiro">Solteiro</option>
                    <option value="familia">Família</option>
                  </select>
                </label>

                <label>
                  Prioridade
                  <select name="prioridade" value={simulatorForm.prioridade} onChange={handleSimulatorChange}>
                    <option value="economia">Economia</option>
                    <option value="desempenho">Desempenho</option>
                  </select>
                </label>
              </div>

              <button className="submit" type="submit" disabled={simulatorLoading}>
                {simulatorLoading ? "Gerando sugestões..." : "Ver sugestões"}
              </button>
            </form>

            <div className="suggestions-grid">
              {simulatorResult.map((car) => (
                <article className="suggestion-card" key={car.id}>
                  <header>
                    <h3>{car.modelo}</h3>
                    <span className="score">Score {car.score}</span>
                  </header>
                  <p>Preço médio: {formatMoney(car.preco)}</p>
                  <p>Gasto mensal estimado: {formatMoney(car.gasto_mensal_estimado)}</p>
                  <p>Consumo: {numberFormatter.format(car.consumo_km_l)} km/l</p>
                  <ul>
                    {car.motivos.map((motivo) => (
                      <li key={motivo}>{motivo}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {toolTab === "maintenance" ? (
          <section className="tool-panel">
            <h2> Peças </h2>
            <div className="grid one">
              <label>
                Pesquisar modelo
                <input
                  type="text"
                  value={maintenanceSearch}
                  onChange={(event) => setMaintenanceSearch(event.target.value)}
                  placeholder="Ex: Corolla 2024"
                />
              </label>

              <label>
                Selecione o modelo
                <select
                  value={
                    filteredMaintenanceCars.some((car) => car.id === selectedMaintenanceModel)
                      ? selectedMaintenanceModel
                      : ""
                  }
                  onChange={(event) => {
                    if (event.target.value) {
                      setSelectedMaintenanceModel(event.target.value);
                    }
                  }}
                >
                  {filteredMaintenanceCars.length === 0 ? (
                    <option value="">Nenhum modelo encontrado</option>
                  ) : (
                    filteredMaintenanceCars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.modelo}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            {maintenanceLoading ? <p className="loading">Buscando dados de manutenção...</p> : null}

            {maintenanceData ? (
              <div className="maintenance-grid">
                <article>
                  <h3>Revisões comuns</h3>
                  <ul>
                    {maintenanceData.revisoes_comuns.map((item) => (
                      <li key={item.item}>
                        {item.item} - {formatMoney(item.custo_medio)}
                      </li>
                    ))}
                  </ul>
                </article>

                <article>
                  <h3>Peças mais trocadas</h3>
                  <ul>
                    {maintenanceData.pecas_mais_trocadas.map((item) => (
                      <li key={item.item}>
                        {item.item} - {formatMoney(item.custo_medio)}
                      </li>
                    ))}
                  </ul>
                </article>

                <article>
                  <h3>Custos médios</h3>
                  <p>Manutenção mensal: {formatMoney(maintenanceData.custo_medio_mensal)}</p>
                  <p>Média de revisões: {formatMoney(maintenanceData.custo_medio_revisoes)}</p>
                  <p>Média de peças: {formatMoney(maintenanceData.custo_medio_pecas)}</p>
                </article>

                <article>
                  <h3>Problemas conhecidos</h3>
                  <ul>
                    {maintenanceData.problemas_conhecidos.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
            ) : null}
          </section>
        ) : null}

        {toolTab === "profile" ? (
          <section className="tool-panel">
            <h2> Perfil e configurações</h2>
            <div className="profile-grid">
              <article className="profile-card">
                <h3>Seus dados</h3>
                <form className="form" onSubmit={submitProfile}>
                  <label>
                    Nome
                    <input
                      type="text"
                      name="nome"
                      value={profileForm.nome}
                      onChange={handleProfileChange}
                      required
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      required
                    />
                  </label>

                  <button className="submit" type="submit" disabled={profileLoading}>
                    {profileLoading ? "Salvando..." : "Salvar dados"}
                  </button>
                </form>
              </article>

              <article className="profile-card">
                <h3>Configurações básicas</h3>
                <div className="settings-list">
                  <label className="switch-row">
                    <span>Notificações por email</span>
                    <input
                      type="checkbox"
                      checked={siteSettings.emailNotifications}
                      onChange={() => handleToggleSetting("emailNotifications")}
                    />
                  </label>

                  <label className="switch-row">
                    <span>Receber newsletter</span>
                    <input
                      type="checkbox"
                      checked={siteSettings.newsletter}
                      onChange={() => handleToggleSetting("newsletter")}
                    />
                  </label>

                  <label className="switch-row">
                    <span>Alertas de preço dos favoritos</span>
                    <input
                      type="checkbox"
                      checked={siteSettings.priceAlerts}
                      onChange={() => handleToggleSetting("priceAlerts")}
                    />
                  </label>

                  <label className="switch-row">
                    <span>Modo compacto da interface</span>
                    <input
                      type="checkbox"
                      checked={siteSettings.compactView}
                      onChange={() => handleToggleSetting("compactView")}
                    />
                  </label>
                </div>
              </article>
            </div>
          </section>
        ) : null}

      </section>
    </main>
  );
}

export default App;










