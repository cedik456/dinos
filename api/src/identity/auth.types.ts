import type { Request } from 'express';
import type { Account } from '../database/schema';

export type ClerkRequest = Request & { clerkSubject?: string };
export type AccountRequest = ClerkRequest & { account?: Account };
