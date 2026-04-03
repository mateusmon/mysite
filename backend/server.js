import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import { initDatabase, query } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
    return res.status(400).json({ message: "nome, email e senha sao obrigatorios." });
  }

  if (senha.length < 6) {
    return res.status(400).json({ message: "A senha precisa ter no minimo 6 caracteres." });
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

    return res.status(201).json({
      message: "Usuario cadastrado com sucesso.",
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Este email ja esta em uso." });
    }

    return res.status(500).json({ message: "Erro ao cadastrar usuario.", details: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const senha = req.body?.senha;

  if (!email || !senha) {
    return res.status(400).json({ message: "email e senha sao obrigatorios." });
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
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    const usuario = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    return res.json({
      message: "Login realizado com sucesso.",
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        criado_em: usuario.criado_em
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao realizar login.", details: error.message });
  }
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Servidor backend rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o backend:", error.message);
    process.exit(1);
  }
}

startServer();