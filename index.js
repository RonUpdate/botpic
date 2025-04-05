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

// 🔁 Ожидание результата от Replicate
const waitForReplicate = async (predictionId) => {
  const url = `https://api.replicate.com/v1/predictions/${predictionId}`;

  while (true) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const json = await res.json();

    if (json.status === 'succeeded') {
      return json.output?.[0] || null;
    }

    if (json.status === 'failed') {
      throw new Error('Replicate image generation failed');
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
};

app.post('/generate', async (req, res) => {
  const topic = req.body.topic || 'Идеи для рисования';

  try {
    // Заголовок
    const gptTitle = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: `Придумай заголовок для Pinterest-пина на тему "${topic}"` }
      ]
    });

    // Описание
    const gptDesc = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: `Напиши описание для Pinterest-пина на тему "${topic}"` }
      ]
    });

    // Запуск генерации через Replicate
    const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'db21e45c-f2ac-418d-92c8-384b2c6d03b8', // SDXL 1.0
        input: { prompt: topic }
      })
    });

    const replicateJson = await replicateRes.json();
    const predictionId = replicateJson.id;

    // Ждём результат
    const image_url = await waitForReplicate(predictionId);

    // Ответ
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
