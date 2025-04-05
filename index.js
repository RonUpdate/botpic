import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import Replicate from 'replicate';

dotenv.config();

const app = express();
app.use(express.json());

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Replicate SDK
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

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

    // Генерация картинки через Replicate SDK
    const output = await replicate.run(
      'stability-ai/sdxl', // можешь заменить на другую модель
      {
        input: { prompt: topic }
      }
    );

    const image_url = Array.isArray(output) ? output[0] : null;

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
