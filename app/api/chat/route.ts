app/api/chat/route.ts
export const runtime = "nodejs";

import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const session_id = nanoid();
  const questionText = messages[messages.length - 1].content;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages
  });

  const stream = OpenAIStream(response, {
    async onCompletion(completion) {
      const answerText = completion;

      try {
        await fetch('https://script.google.com/macros/s/AKfycbyOuovT6vEhjEjpqYikG6ZI2IZtOaWxZVBHFWS7K8cI-ofDuddsiNpaBu0HFxOdqQjJ/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id,
            question: questionText,
            answer: answerText
          })
        });
      } catch (error) {
        console.error('Google Sheets へのログ送信エラー:', error);
      }
    }
  });

  return new StreamingTextResponse(stream);
}
