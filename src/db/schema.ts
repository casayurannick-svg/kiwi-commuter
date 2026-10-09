import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
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

export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().unique(),
  daysInOffice: integer('days_in_office'),
  dailyCoffeeCost: real('daily_coffee_cost'),
  dailyLunchCost: real('daily_lunch_cost'),
  dailyParkingCost: real('daily_parking_cost'),
  hourlyWage: real('hourly_wage'),
  primaryTransportMode: text('primary_transport_mode'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
