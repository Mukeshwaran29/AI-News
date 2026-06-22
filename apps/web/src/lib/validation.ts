import { z } from 'zod'

export const TickerSchema = z
  .string()
  .regex(/^[A-Z0-9&-]{2,20}$/, 'Invalid ticker format')

export const CursorSchema = z
  .string()
  .datetime({ offset: true })
  .optional()

export const ScoreThresholdSchema = z
  .number()
  .int()
  .min(0)
  .max(100)

export const CategorySchema = z.enum([
  'announcements', 'annual_report', 'board_meeting', 'corporate_action',
  'buyback', 'financial_results', 'insider_trading',
  'investor_complaints', 'shareholding_pattern', 'corporate_governance',
]).optional()

export const FeedQuerySchema = z.object({
  ticker:   TickerSchema.optional(),
  category: CategorySchema,
  cursor:   CursorSchema,
  limit:    z.coerce.number().int().min(1).max(100).default(50),
})

export const WatchlistAddSchema = z.object({
  ticker:      TickerSchema,
  alert_above: ScoreThresholdSchema.optional(),
  alert_below: ScoreThresholdSchema.optional(),
})
