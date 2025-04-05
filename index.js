import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Асинхронное ожидание результата от Replicate
const waitForReplicate = async (id) => {
  const statusUrl = `https://api.replicate.com/v1/predictions/${id}`;

  while (true) {
    const res = await fetch(statusUrl, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const json = await res.json();

    if (json.status === 'succeeded') {
      return json.output?.[0] || null;
    }

    if (json.status === 'failed') {
      throw new Error('🛑 Репликация не удалась');
    }

    await new Promise((r) => setTimeout(r, 2000)); // ждем 2 сек
  }
};

app.post('/generate', async (req, res) => {
  const topic = req.body.topic || 'Идеи для рисования';

  try {
    // Заголовок
    const gptTitle = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Придумай заголовок для Pinterest-пина на тему "${topic}"` }]
    });

    // Описание
    const gptDesc = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Напиши описание для Pinterest-пина на тему "${topic}"` }]
    });

    // 1. Создание предсказания
    const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc', // актуальная SDXL
        input: { prompt: topic }
      })
    });

    const prediction = await predictionRes.json();

    // 2. Ожидаем завершения
    const image_url = await waitForReplicate(prediction.id);

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
