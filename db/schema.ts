import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const routes = sqliteTable('routes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), 
  name: text('name').notNull(), 
  transportMode: text('transport_mode').notNull(), 
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
