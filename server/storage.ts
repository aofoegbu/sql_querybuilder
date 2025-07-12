import { 
  waterMeterReadings, 
  customerProfiles, 
  customerBilling, 
  serviceLocations, 
  savedQueries,
  type SavedQuery, 
  type InsertSavedQuery,
  type QueryResult,
  type TableSchema,
  type ColumnInfo
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Query operations
  executeQuery(sqlQuery: string): Promise<QueryResult>;
  getSavedQueries(): Promise<SavedQuery[]>;
  getSavedQuery(id: number): Promise<SavedQuery | undefined>;
  createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery>;
  updateSavedQuery(id: number, query: Partial<InsertSavedQuery>): Promise<SavedQuery>;
  deleteSavedQuery(id: number): Promise<void>;
  
  // Schema operations
  getTableSchemas(): Promise<TableSchema[]>;
  
  // Mock data generation
  generateMockData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async executeQuery(sqlQuery: string): Promise<QueryResult> {
    try {
      const startTime = Date.now();
      
      // Execute the query
      const result = await db.execute(sql.raw(sqlQuery));
      
      const executionTime = Date.now() - startTime;
      
      // Extract column names from the result
      const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
      
      // Convert rows to array format
      const rows = result.rows.map(row => columns.map(col => row[col]));
      
      return {
        columns,
        rows,
        rowCount: result.rows.length,
        executionTime
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  async getSavedQueries(): Promise<SavedQuery[]> {
    return await db.select().from(savedQueries).orderBy(savedQueries.createdAt);
  }

  async getSavedQuery(id: number): Promise<SavedQuery | undefined> {
    const [query] = await db.select().from(savedQueries).where(eq(savedQueries.id, id));
    return query || undefined;
  }

  async createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery> {
    const [newQuery] = await db
      .insert(savedQueries)
      .values({
        ...query,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newQuery;
  }

  async updateSavedQuery(id: number, query: Partial<InsertSavedQuery>): Promise<SavedQuery> {
    const [updatedQuery] = await db
      .update(savedQueries)
      .set({
        ...query,
        updatedAt: new Date()
      })
      .where(eq(savedQueries.id, id))
      .returning();
    return updatedQuery;
  }

  async deleteSavedQuery(id: number): Promise<void> {
    await db.delete(savedQueries).where(eq(savedQueries.id, id));
  }

  async getTableSchemas(): Promise<TableSchema[]> {
    // Get table information from PostgreSQL system tables
    const tablesResult = await db.execute(sql`
      SELECT 
        t.table_name,
        COUNT(c.column_name) as column_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `);

    const schemas: TableSchema[] = [];

    for (const table of tablesResult.rows) {
      const tableName = table.table_name as string;
      
      // Get column information
      const columnsResult = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);

      // Get primary key information
      const pkResult = await db.execute(sql`
        SELECT column_name
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
        WHERE tc.table_name = ${tableName}
        AND tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      `);

      const primaryKeys = pkResult.rows.map(row => row.column_name as string);

      const columns: ColumnInfo[] = columnsResult.rows.map(col => ({
        name: col.column_name as string,
        type: col.data_type as string,
        nullable: col.is_nullable === 'YES',
        isPrimaryKey: primaryKeys.includes(col.column_name as string)
      }));

      // Get approximate row count
      let rowCount = 0;
      try {
        const countResult = await db.execute(sql`
          SELECT reltuples::bigint AS estimate
          FROM pg_class
          WHERE relname = ${tableName}
        `);
        rowCount = Number(countResult.rows[0]?.estimate || 0);
      } catch (error) {
        // Fallback to actual count for smaller tables
        try {
          const actualCountResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
          rowCount = Number(actualCountResult.rows[0]?.count || 0);
        } catch (e) {
          rowCount = 0;
        }
      }

      schemas.push({
        name: tableName,
        columns,
        rowCount
      });
    }

    return schemas;
  }

  async generateMockData(): Promise<void> {
    // Check if data already exists
    const existingData = await db.select().from(customerProfiles).limit(1);
    if (existingData.length > 0) {
      return; // Data already exists
    }

    // Generate customer profiles
    const customers: any[] = [];
    const zones = ['Zone-A', 'Zone-B', 'Zone-C', 'Zone-D'];
    const accountTypes = ['residential', 'commercial', 'industrial'];
    
    for (let i = 1; i <= 1000; i++) {
      customers.push({
        customerId: i,
        firstName: `Customer${i}`,
        lastName: `LastName${i}`,
        email: `customer${i}@example.com`,
        phone: `555-${String(i).padStart(4, '0')}`,
        address: `${i} Main St`,
        city: `City${Math.floor(i / 100) + 1}`,
        state: 'CA',
        zipCode: String(90000 + (i % 1000)).padStart(5, '0'),
        accountType: accountTypes[i % accountTypes.length],
        isActive: true
      });
    }

    await db.insert(customerProfiles).values(customers);

    // Generate service locations
    const locations: any[] = [];
    for (let i = 1; i <= 1000; i++) {
      locations.push({
        customerId: i,
        meterId: `WM-${String(i).padStart(4, '0')}`,
        locationName: `Property ${i}`,
        address: `${i} Service Rd`,
        city: `City${Math.floor(i / 100) + 1}`,
        state: 'CA',
        zipCode: String(90000 + (i % 1000)).padStart(5, '0'),
        zone: zones[i % zones.length],
        meterType: i % 3 === 0 ? 'Smart Meter' : 'Standard Meter',
        installDate: new Date(2020 + (i % 4), (i % 12), Math.min(i % 28 + 1, 28)),
        lastMaintenanceDate: new Date(2023, (i % 12), Math.min(i % 28 + 1, 28)),
        isActive: true
      });
    }

    await db.insert(serviceLocations).values(locations);

    // Generate water meter readings (24 months of data)
    const readings: any[] = [];
    let readingId = 1;
    
    for (let customerId = 1; customerId <= 1000; customerId++) {
      const meterId = `WM-${String(customerId).padStart(4, '0')}`;
      const zone = zones[customerId % zones.length];
      
      // Generate 24 months of monthly readings
      for (let month = 0; month < 24; month++) {
        const readingDate = new Date(2022, month % 12, 15 + (month >= 12 ? 365 : 0));
        const baseUsage = 200 + (customerId % 300); // Base usage varies by customer
        const seasonalFactor = 1 + 0.3 * Math.sin((month % 12) * Math.PI / 6); // Summer spike
        const randomFactor = 0.8 + Math.random() * 0.4; // ±20% random variation
        const usageGallons = Math.round(baseUsage * seasonalFactor * randomFactor * 100) / 100;
        
        readings.push({
          meterId,
          readingDate,
          usageGallons,
          locationZone: zone,
          customerId
        });
      }
    }

    // Insert readings in batches
    const batchSize = 1000;
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      await db.insert(waterMeterReadings).values(batch);
    }

    // Generate billing records
    const billings: any[] = [];
    
    for (let customerId = 1; customerId <= 1000; customerId++) {
      // Generate 24 months of billing
      for (let month = 0; month < 24; month++) {
        const periodStart = new Date(2022, month % 12, 1 + (month >= 12 ? 365 : 0));
        const periodEnd = new Date(2022, (month % 12) + 1, 0 + (month >= 12 ? 365 : 0));
        const dueDate = new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after period end
        
        const baseUsage = 200 + (customerId % 300);
        const seasonalFactor = 1 + 0.3 * Math.sin((month % 12) * Math.PI / 6);
        const randomFactor = 0.8 + Math.random() * 0.4;
        const usageGallons = Math.round(baseUsage * seasonalFactor * randomFactor * 100) / 100;
        
        const ratePerGallon = 0.003 + (customerId % 3) * 0.001; // Different rate tiers
        const baseFee = 25.00;
        const totalAmount = Math.round((baseFee + usageGallons * ratePerGallon) * 100) / 100;
        
        const paymentStatus = Math.random() > 0.1 ? 'paid' : (Math.random() > 0.5 ? 'pending' : 'overdue');
        const paidDate = paymentStatus === 'paid' ? 
          new Date(dueDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null;
        
        billings.push({
          customerId,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          usageGallons,
          ratePerGallon,
          baseFee,
          totalAmount,
          dueDate,
          paidDate,
          paymentStatus
        });
      }
    }

    // Insert billings in batches
    for (let i = 0; i < billings.length; i += batchSize) {
      const batch = billings.slice(i, i + batchSize);
      await db.insert(customerBilling).values(batch);
    }

    // Generate some saved queries
    const queries = [
      {
        name: 'Monthly Usage Report',
        description: 'Total water usage by location zone for the current month',
        sqlQuery: `SELECT 
    location_zone,
    COUNT(*) as meter_count,
    SUM(usage_gallons) as total_usage,
    AVG(usage_gallons) as avg_usage,
    MAX(usage_gallons) as max_usage
FROM water_meter_readings 
WHERE reading_date >= date_trunc('month', CURRENT_DATE)
GROUP BY location_zone
ORDER BY total_usage DESC`
      },
      {
        name: 'High Usage Customers',
        description: 'Customers with above-average water consumption',
        sqlQuery: `SELECT 
    cp.customer_id,
    cp.first_name,
    cp.last_name,
    cp.account_type,
    SUM(wmr.usage_gallons) as total_usage,
    COUNT(wmr.id) as reading_count
FROM customer_profiles cp
JOIN water_meter_readings wmr ON cp.customer_id = wmr.customer_id
WHERE wmr.reading_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY cp.customer_id, cp.first_name, cp.last_name, cp.account_type
HAVING SUM(wmr.usage_gallons) > (
    SELECT AVG(total_usage) FROM (
        SELECT SUM(usage_gallons) as total_usage
        FROM water_meter_readings
        WHERE reading_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY customer_id
    ) avg_calc
)
ORDER BY total_usage DESC`
      },
      {
        name: 'Billing Summary',
        description: 'Monthly billing summary with payment status',
        sqlQuery: `SELECT 
    DATE_TRUNC('month', billing_period_start) as billing_month,
    COUNT(*) as total_bills,
    SUM(total_amount) as total_revenue,
    SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as collected_revenue,
    COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_count,
    ROUND(
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) * 100.0 / SUM(total_amount), 
        2
    ) as collection_rate
FROM customer_billing
WHERE billing_period_start >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', billing_period_start)
ORDER BY billing_month DESC`
      }
    ];

    await db.insert(savedQueries).values(queries);
  }
}

export const storage = new DatabaseStorage();
