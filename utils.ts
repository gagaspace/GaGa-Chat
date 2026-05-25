import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const AI_ASSISTANT_ID = '00000000-0000-0000-0000-000000000001';
export const AI_ASSISTANT_NAME = 'GaGa AI Assistant';
export const AI_ASSISTANT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=gaga-ai';
export const AI_ASSISTANT_STATUS_MESSAGE = 'AI Assistant';

export const isAIUserId = (id?: string) => id === AI_ASSISTANT_ID;

export const AI_ASSISTANT_PROFILE = {
  id: AI_ASSISTANT_ID,
  name: AI_ASSISTANT_NAME,
  avatar: AI_ASSISTANT_AVATAR,
  status: 'online' as const,
  statusMessage: AI_ASSISTANT_STATUS_MESSAGE,
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
