import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

app.post("/api/generate-plan", async (req, res) => {
  try {
    const { subject, level, timePerDay, objective, deadline, studentName, studentClass } = req.body;

    if (!subject || !level || !timePerDay || !objective || !studentName || !studentClass) {
      return res.status(400).json({ 
        error: "Faltam informações obrigatórias. Por favor, forneça o assunto, nível, tempo disponível, objetivo, seu nome e sua classe." 
      });
    }

    const prompt = `
      Você é o "Mentor Estuda Ao", um assistente de elite focado em levar estudantes angolanos à excelência académica (notas 18-20, admissões disputadas).
      
      Filosofia de Excelência:
      1. Princípio de Pareto: 20% de teoria essencial e 80% de prática intensa.
      2. Intercalação: Explique como alternar esta disciplina com outras (Ex: Se hoje é ${subject}, amanhã deve ser Física ou Química para manter o cérebro activo).
      3. Revisão Activa: Force o aluno a explicar a matéria em voz alta ou resolver sem olhar para a cábula.
      4. Contexto Local: Use exemplos da realidade de Angola (SME, sonangol, asfalto, mercados locais, exames da UAN/Agostinho Neto).

      Dados do Aluno (Respeite este perfil):
      - Nome: ${studentName}
      - Classe: ${studentClass}
      - Disciplina: ${subject}
      - Nível Actual: ${level}
      - Tempo: ${timePerDay}
      - Objectivo Final: ${objective}

      Formato da Resposta (Markdown):
      # 🚀 Roteiro de Excelência: [Assunto]
      ## 📝 Mensagem do Mentor
      [Uma mensagem curta e directa para o ${studentName}, focada na disciplina necessária para a ${studentClass}]

      ## 📅 Ciclo Semanal Sugerido
      [Sugira como encaixar ${subject} na semana. Ex: Segundas e Quartas (Matemática), Terças e Quintas (Física). Mostre a lógica da rotação para não cansar o cérebro]

      ## 🛠️ Plano de Ataque (Exercícios Reais)
      [Divida por blocos de tempo. Ex: 25min (Foco Total) + 5min (Pausa). Inclua exercícios com LaTeX. Use exemplos de exames nacionais de Angola]

      ## 🧠 Técnica de Retenção (Para não esquecer)
      [Sugira um methodo prático: Flashcards, Resumo Cego ou Ensinar a um Colega]

      ## 🇦🇴 Dica "Drena" (Caminho das Pedras)
      [Uma dica específica sobre como este assunto cai nos exames da UAN ou exames nacionais de Luanda/resto do país]

      No final diga sempre: "O sucesso não é sorte, é preparação. Força, ${studentName}!"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text;

    res.json({ plan: text });
  } catch (error) {
    console.error("Erro ao gerar plano:", error);
    res.status(500).json({ error: "Erro interno ao processar o seu plano de estudo." });
  }
});

async function startServer() {
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
    console.log(`Estuda Ao rodando em http://localhost:${PORT}`);
  });
}

startServer();
