import { GoogleGenerativeAI } from "@google/generative-ai";

const requireEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const geminiKey = requireEnv(import.meta.env.VITE_GEMINI_API_KEY, 'VITE_GEMINI_API_KEY');
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const getAIResponse = async (prompt: string, history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []) => {
  try {
    const chat = model.startChat({
      history: history.length > 0 ? history : [
        {
          role: "user",
          parts: [{ text: "You are GaGa AI Assistant, a friendly and helpful AI integrated into GaGa Chat. You should be concise, use emojis occasionally, and keep the tone positive. The user's name might be provided in the prompt." }]
        },
        {
          role: "model",
          parts: [{ text: "Hello! I am GaGa AI Assistant. How can I help you today? 😊" }]
        }
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm sorry, I'm having trouble thinking right now. Please try again later!";
  }
};
