import bcrypt from "bcryptjs";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  compareCars,
  getCarById,
  getCarsByIds,
  getCarsForList,
  getMaintenanceByModel,
  getMaintenanceCatalog,
  suggestCars
} from "./carCatalog.js";
import { initDatabase, query } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "troque-esta-chave-jwt-em-producao";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30m";
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const PASSWORD_RESET_MINUTES = Number(process.env.PASSWORD_RESET_MINUTES || 30);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

app.use(cors());
app.use(express.json());

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function generateOpaqueToken() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildUserPayload(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    criado_em: row.criado_em
  };
}

function isLikelyProduction() {
  return process.env.NODE_ENV === "production";
}

async function issueSession(user) {
  const token = createAccessToken(user);
  const refreshToken = generateOpaqueToken();
  const tokenHash = hashToken(refreshToken);
  const expiration = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO refresh_tokens (usuario_id, token_hash, expira_em)
      VALUES ($1, $2, $3)
    `,
    [user.id, tokenHash, expiration]
  );

  return {
    token,
    refreshToken
  };
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) {
    return;
  }

  const tokenHash = hashToken(rawToken);
  await query(
    `
      UPDATE refresh_tokens
      SET revogado_em = NOW()
      WHERE token_hash = $1 AND revogado_em IS NULL
    `,
    [tokenHash]
  );
}

function requireAuth(req, res, next) {
  const rawAuthorization = req.headers.authorization || "";
  const [scheme, token] = rawAuthorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Token de acesso obrigatório." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "Token inválido ou expirado." });
    }

    req.auth = {
      userId,
      email: payload.email
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

function resolveAuthUserId(req) {
  const rawAuthorization = req.headers.authorization || "";
  const [scheme, token] = rawAuthorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.userId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch (_error) {
    return null;
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: "error", db: "disconnected", details: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const nome = req.body?.nome?.trim();
  const email = req.body?.email?.trim().toLowerCase();
  const senha = req.body?.senha;

  if (!nome || !email || !senha) {
    return res.status(400).json({ message: "nome, email e senha são obrigatórios." });
  }

  if (senha.length < 6) {
    return res.status(400).json({ message: "A senha precisa ter no mínimo 6 caracteres." });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await query(
      `
        INSERT INTO usuarios (nome, email, senha)
        VALUES ($1, $2, $3)
        RETURNING id, nome, email, criado_em
      `,
      [nome, email, senhaHash]
    );

    const user = buildUserPayload(result.rows[0]);
    const session = await issueSession(user);

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user,
      token: session.token,
      refreshToken: session.refreshToken
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Este email já está em uso." });
    }

    return res.status(500).json({ message: "Erro ao cadastrar usuário.", details: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const senha = req.body?.senha;

  if (!email || !senha) {
    return res.status(400).json({ message: "email e senha são obrigatórios." });
  }

  try {
    const result = await query(
      `
        SELECT id, nome, email, senha, criado_em
        FROM usuarios
        WHERE email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Email ou senha inválidos." });
    }

    const usuario = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ message: "Email ou senha inválidos." });
    }

    const user = buildUserPayload(usuario);
    const session = await issueSession(user);

    return res.json({
      message: "Login realizado com sucesso.",
      user,
      token: session.token,
      refreshToken: session.refreshToken
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao realizar login.", details: error.message });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken é obrigatório." });
  }

  try {
    const tokenHash = hashToken(refreshToken);
    const result = await query(
      `
        SELECT r.id AS refresh_id, u.id, u.nome, u.email, u.criado_em
        FROM refresh_tokens r
        INNER JOIN usuarios u ON u.id = r.usuario_id
        WHERE r.token_hash = $1
          AND r.revogado_em IS NULL
          AND r.expira_em > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Refresh token inválido ou expirado." });
    }

    const user = buildUserPayload(result.rows[0]);

    await query(
      `
        UPDATE refresh_tokens
        SET revogado_em = NOW()
        WHERE id = $1
      `,
      [result.rows[0].refresh_id]
    );

    const session = await issueSession(user);

    return res.json({
      message: "Sessão renovada com sucesso.",
      user,
      token: session.token,
      refreshToken: session.refreshToken
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao renovar sessão.", details: error.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const refreshToken = req.body?.refreshToken;

  try {
    await revokeRefreshToken(refreshToken);
    return res.json({ message: "Logout realizado com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao realizar logout.", details: error.message });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "email é obrigatório." });
  }

  try {
    const userResult = await query(
      `
        SELECT id, nome, email, criado_em
        FROM usuarios
        WHERE email = $1
      `,
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.json({
        message: "Se o email estiver cadastrado, você receberá as instruções para redefinir a senha."
      });
    }

    const user = userResult.rows[0];
    const resetToken = generateOpaqueToken();
    const tokenHash = hashToken(resetToken);
    const expiration = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);

    await query(
      `
        UPDATE password_reset_tokens
        SET usado_em = NOW()
        WHERE usuario_id = $1 AND usado_em IS NULL
      `,
      [user.id]
    );

    await query(
      `
        INSERT INTO password_reset_tokens (usuario_id, token_hash, expira_em)
        VALUES ($1, $2, $3)
      `,
      [user.id, tokenHash, expiration]
    );

    const payload = {
      message: "Solicitação registrada. Use o token para redefinir sua senha.",
      expiresInMinutes: PASSWORD_RESET_MINUTES
    };

    if (!isLikelyProduction()) {
      payload.resetToken = resetToken;
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao solicitar redefinição.", details: error.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const resetToken = req.body?.resetToken;
  const novaSenha = req.body?.novaSenha;

  if (!resetToken || !novaSenha) {
    return res.status(400).json({ message: "resetToken e novaSenha são obrigatórios." });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ message: "A nova senha precisa ter no mínimo 6 caracteres." });
  }

  try {
    const tokenHash = hashToken(resetToken);
    const tokenResult = await query(
      `
        SELECT id, usuario_id
        FROM password_reset_tokens
        WHERE token_hash = $1
          AND usado_em IS NULL
          AND expira_em > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      return res.status(400).json({ message: "Token de redefinição inválido ou expirado." });
    }

    const tokenRow = tokenResult.rows[0];
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await query(
      `
        UPDATE usuarios
        SET senha = $1
        WHERE id = $2
      `,
      [senhaHash, tokenRow.usuario_id]
    );

    await query(
      `
        UPDATE password_reset_tokens
        SET usado_em = NOW()
        WHERE id = $1
      `,
      [tokenRow.id]
    );

    await query(
      `
        UPDATE refresh_tokens
        SET revogado_em = NOW()
        WHERE usuario_id = $1 AND revogado_em IS NULL
      `,
      [tokenRow.usuario_id]
    );

    return res.json({ message: "Senha redefinida com sucesso. Faça login novamente." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao redefinir senha.", details: error.message });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
        SELECT id, nome, email, criado_em
        FROM usuarios
        WHERE id = $1
      `,
      [req.auth.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    return res.json({ user: buildUserPayload(result.rows[0]) });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar usuário.", details: error.message });
  }
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const nome = req.body?.nome?.trim();
  const email = req.body?.email?.trim().toLowerCase();

  if (!nome || !email) {
    return res.status(400).json({ message: "nome e email são obrigatórios." });
  }

  try {
    const result = await query(
      `
        UPDATE usuarios
        SET nome = $1, email = $2
        WHERE id = $3
        RETURNING id, nome, email, criado_em
      `,
      [nome, email, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    return res.json({
      message: "Perfil atualizado com sucesso.",
      user: buildUserPayload(result.rows[0])
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Este email já está em uso." });
    }

    return res.status(500).json({ message: "Erro ao atualizar perfil.", details: error.message });
  }
});

app.get("/api/cars", (_req, res) => {
  res.json({ cars: getCarsForList() });
});

app.post("/api/cars/compare", async (req, res) => {
  const modelIds = Array.isArray(req.body?.modelIds) ? req.body.modelIds : [];

  if (modelIds.length === 0) {
    return res.status(400).json({ message: "Selecione ao menos um modelo para comparar." });
  }

  if (modelIds.length > 4) {
    return res.status(400).json({ message: "Selecione no máximo 4 modelos por comparação." });
  }

  const resultado = compareCars(req.body);

  const userId = resolveAuthUserId(req);
  if (userId) {
    try {
      await query(
        `
          INSERT INTO historico_comparacoes (
            usuario_id,
            model_ids_json,
            km_mensal,
            preco_combustivel,
            resultados_json
          )
          VALUES ($1, $2::jsonb, $3, $4, $5::jsonb)
        `,
        [
          userId,
          JSON.stringify(modelIds),
          resultado.km_mensal,
          resultado.preco_combustivel,
          JSON.stringify(resultado.resultados || [])
        ]
      );
    } catch (_error) {
      // Do not break user flow if history persistence fails.
    }
  }

  return res.json(resultado);
});

app.post("/api/cars/simulator", (req, res) => {
  const { orcamento, rendaMensal, uso, perfil, prioridade } = req.body || {};

  if (!orcamento || !rendaMensal || !uso || !perfil || !prioridade) {
    return res.status(400).json({
      message: "Preencha orçamento, renda mensal, uso, perfil e prioridade para gerar sugestões."
    });
  }

  const resultado = suggestCars(req.body);
  return res.json(resultado);
});

app.get("/api/comparisons/history", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));

  try {
    const result = await query(
      `
        SELECT id, model_ids_json, km_mensal, preco_combustivel, resultados_json, criado_em
        FROM historico_comparacoes
        WHERE usuario_id = $1
        ORDER BY criado_em DESC
        LIMIT $2
      `,
      [userId, limit]
    );

    const historico = result.rows.map((row) => ({
      id: row.id,
      modelIds: row.model_ids_json || [],
      kmMensal: Number(row.km_mensal),
      precoCombustivel: Number(row.preco_combustivel),
      resultados: row.resultados_json || [],
      criadoEm: row.criado_em
    }));

    return res.json({ historico });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar histórico.", details: error.message });
  }
});

app.get("/api/maintenance", (req, res) => {
  const modelId = req.query.modelId;

  if (modelId) {
    const details = getMaintenanceByModel(modelId);

    if (!details) {
      return res.status(404).json({ message: "Modelo não encontrado." });
    }

    return res.json(details);
  }

  return res.json({ modelos: getMaintenanceCatalog() });
});

app.get("/api/maintenance/:modelId", (req, res) => {
  const details = getMaintenanceByModel(req.params.modelId);

  if (!details) {
    return res.status(404).json({ message: "Modelo não encontrado." });
  }

  return res.json(details);
});

app.get("/api/favorites", requireAuth, async (req, res) => {
  const userId = req.auth.userId;

  try {
    const result = await query(
      `
        SELECT car_id
        FROM favoritos_carros
        WHERE usuario_id = $1
        ORDER BY criado_em DESC
      `,
      [userId]
    );

    const favoriteIds = result.rows.map((row) => row.car_id);
    const favorites = getCarsByIds(favoriteIds);

    return res.json({ favoriteIds, favorites });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar favoritos.", details: error.message });
  }
});

app.use(express.static(frontendDistPath));

app.get(/^\/(?!api).*/, (_req, res) => {
  if (existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }

  return res.status(503).send("Frontend não compilado. Execute: npm run build");
});

app.post("/api/favorites", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const carId = req.body?.carId;

  if (!carId) {
    return res.status(400).json({ message: "carId é obrigatório." });
  }

  const car = getCarById(carId);
  if (!car) {
    return res.status(404).json({ message: "Carro não encontrado no catálogo." });
  }

  try {
    await query(
      `
        INSERT INTO favoritos_carros (usuario_id, car_id)
        VALUES ($1, $2)
        ON CONFLICT (usuario_id, car_id) DO NOTHING
      `,
      [userId, carId]
    );

    return res.status(201).json({ message: "Carro favoritado com sucesso.", favorite: car });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    return res.status(500).json({ message: "Erro ao favoritar carro.", details: error.message });
  }
});

app.delete("/api/favorites", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const carId = req.body?.carId;

  if (!carId) {
    return res.status(400).json({ message: "carId é obrigatório." });
  }

  try {
    await query(
      `
        DELETE FROM favoritos_carros
        WHERE usuario_id = $1 AND car_id = $2
      `,
      [userId, carId]
    );

    return res.json({ message: "Carro removido dos favoritos." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao remover favorito.", details: error.message });
  }
});

async function startServer() {
  try {
    await initDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Servidor backend rodando em http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        console.log(`Servidor já está em execução em http://localhost:${PORT}`);
        process.exit(0);
      }

      console.error("Falha ao iniciar o backend:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Falha ao iniciar o backend:", error.message);
    process.exit(1);
  }
}

startServer();

