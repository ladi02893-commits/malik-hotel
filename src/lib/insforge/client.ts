import { createClient } from '@insforge/sdk';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://c2y6x4d5.us-east.insforge.app';
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

export const insforge = createClient({
  baseUrl,
  anonKey: anonKey || undefined,
});
