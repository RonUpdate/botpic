import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/generate', async (req, res) => {
  const topic = req.body.topic || 'Идеи для рисования';

  try {
    // Генерация заголовка
    const gptTitle = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Придумай заголовок для Pinterest-пина на тему "${topic}"`
        }
      ]
    });

    // Генерация описания
    const gptDesc = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Напиши описание для Pinterest-пина на тему "${topic}"`
        }
      ]
    });

    // Генерация картинки через fal.ai
    const response = await fetch('https://api.fal.ai/v1/run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { prompt: topic }
      })
    });

    const imageJson = await response.json();
    const image_url = imageJson.images?.[0]?.url || null;

    res.json({
      title: gptTitle.choices[0].message.content,
      description: gptDesc.choices[0].message.content,
      image_url
    });
  } catch (e) {
    console.error('❌ Ошибка генерации:', e);
    res.status(500).json({ error: 'Ошибка генерации' });
  }
});

app.listen(3000, () => console.log('✅ Сервер запущен на порту 3000'));
