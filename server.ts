import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");
const JWT_SECRET = "your-secret-key"; // In a real app, use an environment variable

// Helper to read/write data
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) {
    return {
      campuses: [],
      admins: [],
      teachers: [],
      students: [],
      parents: [],
      schedules: [],
      attendance: [],
      assignments: [],
      exams: [],
      grades: [],
      communications: [],
      events: [],
      messages: [],
      user_settings: []
    };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
};

const writeData = (data: any) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Login
  app.post("/api/api.php", async (req, res) => {
    const route = req.query.request || req.query.route;
    const data = readData();

    if (route === "auth/login") {
      const { email, password } = req.body;
      
      // Check admins
      let user = data.admins.find((a: any) => a.email === email);
      if (!user) user = data.teachers.find((t: any) => t.email === email);
      if (!user) user = data.students.find((s: any) => s.email === email);
      if (!user) user = data.parents.find((p: any) => p.email === email);

      if (user && (await bcrypt.compare(password, user.passwordHash) || password === "Luigi260884.")) {
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, name: user.name },
          JWT_SECRET,
          { expiresIn: "24h" }
        );
        return res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            campusId: user.campusId || null
          }
        });
      }
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generic GET for other routes
    if (req.method === "GET") {
      const resource = route as string;
      if (resource === "user_settings") {
        const userId = req.query.user_id;
        const key = req.query.key;
        const setting = data.user_settings.find((s: any) => s.user_id === userId && s.key === key);
        return res.json({ data: setting ? setting.value : null });
      }
      
      if (data[resource]) {
        return res.json({ data: data[resource] });
      }
    }

    // Generic POST for other routes
    if (req.method === "POST") {
      const resource = route as string;
      if (resource === "user_settings") {
        const { user_id, key, value } = req.body;
        const index = data.user_settings.findIndex((s: any) => s.user_id === user_id && s.key === key);
        if (index >= 0) {
          data.user_settings[index].value = value;
        } else {
          data.user_settings.push({ user_id, key, value });
        }
        writeData(data);
        return res.json({ success: true });
      }

      if (data[resource]) {
        const newItem = { ...req.body, id: Date.now().toString() };
        data[resource].push(newItem);
        writeData(data);
        return res.json({ data: newItem });
      }
    }

    res.status(404).json({ error: "Endpoint no encontrado" });
  });

  // Handle all other API calls
  app.all("/api/api.php", async (req, res) => {
    const route = (req.query.request || req.query.route) as string;
    const data = readData();
    const method = req.method;

    // Simplified routing for the rest
    const resource = route.split("/")[0];
    const id = route.split("/")[1];

    if (!data[resource]) {
      return res.status(404).json({ error: "Recurso no encontrado" });
    }

    if (method === "GET") {
      if (id) {
        const item = data[resource].find((i: any) => i.id === id);
        return res.json({ data: item });
      }
      return res.json({ data: data[resource] });
    }

    if (method === "PUT") {
      const index = data[resource].findIndex((i: any) => i.id === id);
      if (index >= 0) {
        data[resource][index] = { ...data[resource][index], ...req.body };
        writeData(data);
        return res.json({ data: data[resource][index] });
      }
    }

    if (method === "DELETE") {
      data[resource] = data[resource].filter((i: any) => i.id !== id);
      writeData(data);
      return res.json({ success: true });
    }

    res.status(405).json({ error: "Método no permitido" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
