import { z } from 'zod';

// Register
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// Login
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Update Preferences
export const UpdatePreferencesSchema = z.object({
  trackingMode: z.enum(['work-only', 'always']).optional(),
  eyeTrackingEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  focusThreshold: z.number().min(0).max(1).optional(),
  breakDuration: z.number().optional(),
});

// Add/Remove from lists
export const ListItemSchema = z.object({
  type: z.enum(['app', 'url']),
  value: z.string(),
});
