import { pgTable, text, serial, integer, decimal, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Water meter readings table
export const waterMeterReadings = pgTable("water_meter_readings", {
  id: serial("id").primaryKey(),
  meterId: varchar("meter_id", { length: 50 }).notNull(),
  readingDate: timestamp("reading_date").notNull(),
  usageGallons: decimal("usage_gallons", { precision: 10, scale: 2 }).notNull(),
  locationZone: varchar("location_zone", { length: 20 }).notNull(),
  customerId: integer("customer_id").notNull(),
});

// Customer profiles table
export const customerProfiles = pgTable("customer_profiles", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  accountType: varchar("account_type", { length: 20 }).notNull(), // residential, commercial, industrial
  isActive: boolean("is_active").default(true),
});

// Customer billing table
export const customerBilling = pgTable("customer_billing", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  usageGallons: decimal("usage_gallons", { precision: 10, scale: 2 }).notNull(),
  ratePerGallon: decimal("rate_per_gallon", { precision: 6, scale: 4 }).notNull(),
  baseFee: decimal("base_fee", { precision: 8, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull(), // pending, paid, overdue
});

// Service locations table
export const serviceLocations = pgTable("service_locations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  meterId: varchar("meter_id", { length: 50 }).notNull(),
  locationName: varchar("location_name", { length: 200 }),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  zone: varchar("zone", { length: 20 }).notNull(),
  meterType: varchar("meter_type", { length: 50 }).notNull(),
  installDate: timestamp("install_date").notNull(),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  isActive: boolean("is_active").default(true),
});

// Saved queries table
export const savedQueries = pgTable("saved_queries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  sqlQuery: text("sql_query").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const customerProfilesRelations = relations(customerProfiles, ({ many }) => ({
  meterReadings: many(waterMeterReadings),
  billings: many(customerBilling),
  serviceLocations: many(serviceLocations),
}));

export const waterMeterReadingsRelations = relations(waterMeterReadings, ({ one }) => ({
  customer: one(customerProfiles, {
    fields: [waterMeterReadings.customerId],
    references: [customerProfiles.customerId],
  }),
}));

export const customerBillingRelations = relations(customerBilling, ({ one }) => ({
  customer: one(customerProfiles, {
    fields: [customerBilling.customerId],
    references: [customerProfiles.customerId],
  }),
}));

export const serviceLocationsRelations = relations(serviceLocations, ({ one }) => ({
  customer: one(customerProfiles, {
    fields: [serviceLocations.customerId],
    references: [customerProfiles.customerId],
  }),
}));

// Zod schemas
export const insertWaterMeterReadingSchema = createInsertSchema(waterMeterReadings);
export const insertCustomerProfileSchema = createInsertSchema(customerProfiles);
export const insertCustomerBillingSchema = createInsertSchema(customerBilling);
export const insertServiceLocationSchema = createInsertSchema(serviceLocations);
export const insertSavedQuerySchema = createInsertSchema(savedQueries);

// Types
export type WaterMeterReading = typeof waterMeterReadings.$inferSelect;
export type InsertWaterMeterReading = z.infer<typeof insertWaterMeterReadingSchema>;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;
export type CustomerBilling = typeof customerBilling.$inferSelect;
export type InsertCustomerBilling = z.infer<typeof insertCustomerBillingSchema>;
export type ServiceLocation = typeof serviceLocations.$inferSelect;
export type InsertServiceLocation = z.infer<typeof insertServiceLocationSchema>;
export type SavedQuery = typeof savedQueries.$inferSelect;
export type InsertSavedQuery = z.infer<typeof insertSavedQuerySchema>;

// Query execution result type
export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

// Schema info type for browser
export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}
