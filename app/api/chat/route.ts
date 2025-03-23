export const runtime = "nodejs";
import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';

// APIキーが存在するか確認
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
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
          // Google Apps Scriptへのログ送信
          const logResponse = await fetch('https://script.google.com/macros/s/AKfycbyOuovT6vEhjEjpqYikG6ZI2IZtOaWxZVBHFWS7K8cI-ofDuddsiNpaBu0HFxOdqQjJ/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id,
              question: questionText,
              answer: answerText
            })
          });
          
          if (!logResponse.ok) {
            console.error('Google Sheets へのログ送信に失敗:', await logResponse.text());
          }
        } catch (error) {
          console.error('Google Sheets へのログ送信エラー:', error);
        }
      }
    });
    
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('リクエスト処理エラー:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
