import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post("/generate", async (req, res) => {
  const topic = req.body.topic || "Идеи для рисования";

  try {
    const gptTitle = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: `Придумай заголовок для Pinterest-пина на тему "${topic}"` }],
    });

    const gptDesc = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: `Напиши описание для Pinterest-пина на тему "${topic}"` }],
    });

    const response = await fetch("https://api.fal.ai/v1/run/fal-ai/fast-sdxl", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: { prompt: topic } })
    });

    const json = await response.json();
    const image_url = json.images?.[0]?.url || null;

    res.json({
      title: gptTitle.data.choices[0].message.content,
      description: gptDesc.data.choices[0].message.content,
      image_url
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка генерации" });
  }
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));
