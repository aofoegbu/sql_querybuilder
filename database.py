"""
Database Manager for SQL Report Generator
Handles PostgreSQL connections, query execution, and data management
"""

import psycopg2
import pandas as pd
import os
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import random
import numpy as np
from sqlalchemy import create_engine, text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self):
        self.connection_string = os.getenv('DATABASE_URL')
        self.engine = None
        self._initialize_engine()
    
    def _initialize_engine(self):
        """Initialize SQLAlchemy engine"""
        try:
            if self.connection_string:
                self.engine = create_engine(self.connection_string)
                logger.info("Database engine initialized successfully")
            else:
                logger.error("DATABASE_URL environment variable not found")
        except Exception as e:
            logger.error(f"Failed to initialize database engine: {str(e)}")
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            if not self.engine:
                return False
            
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                return result.fetchone() is not None
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False
    
    def execute_query(self, query: str) -> pd.DataFrame:
        """Execute SQL query and return results as DataFrame"""
        try:
            if not self.engine:
                raise Exception("Database engine not initialized")
            
            with self.engine.connect() as conn:
                df = pd.read_sql_query(text(query), conn)
                logger.info(f"Query executed successfully, returned {len(df)} rows")
                return df
                
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise
    
    def get_schema_info(self) -> Dict[str, Any]:
        """Get database schema information"""
        try:
            schema_query = """
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
            FROM information_schema.tables t
            LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
            LEFT JOIN (
                SELECT ku.table_name, ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
            WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position
            """
            
            schema_df = self.execute_query(schema_query)
            
            # Get row counts for each table
            schema_info = {}
            for table_name in schema_df['table_name'].unique():
                try:
                    count_query = f"SELECT COUNT(*) as row_count FROM \"{table_name}\""
                    count_df = self.execute_query(count_query)
                    row_count = count_df.iloc[0]['row_count']
                except:
                    row_count = 0
                
                table_columns = schema_df[schema_df['table_name'] == table_name]
                columns = []
                
                for _, col in table_columns.iterrows():
                    columns.append({
                        'name': col['column_name'],
                        'type': col['data_type'],
                        'nullable': col['is_nullable'] == 'YES',
                        'is_primary_key': col['is_primary_key']
                    })
                
                schema_info[table_name] = {
                    'columns': columns,
                    'row_count': row_count
                }
            
            return schema_info
            
        except Exception as e:
            logger.error(f"Failed to get schema info: {str(e)}")
            return {}
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get basic database statistics"""
        try:
            stats_query = """
            SELECT 
                COUNT(DISTINCT table_name) as table_count
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            """
            
            stats_df = self.execute_query(stats_query)
            table_count = stats_df.iloc[0]['table_count']
            
            # Get total record count across all tables
            total_records = 0
            try:
                tables_query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                """
                tables_df = self.execute_query(tables_query)
                
                for _, row in tables_df.iterrows():
                    table_name = row['table_name']
                    try:
                        count_query = f'SELECT COUNT(*) as count FROM "{table_name}"'
                        count_df = self.execute_query(count_query)
                        total_records += count_df.iloc[0]['count']
                    except:
                        continue
            except:
                pass
            
            return {
                'table_count': table_count,
                'total_records': total_records
            }
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {str(e)}")
            return {'table_count': 0, 'total_records': 0}
    
    def get_saved_queries(self) -> List[Dict[str, Any]]:
        """Get saved queries"""
        try:
            query = """
            SELECT id, name, description, sql_query, created_at
            FROM saved_queries
            ORDER BY created_at DESC
            """
            df = self.execute_query(query)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to get saved queries: {str(e)}")
            return []
    
    def save_query(self, name: str, sql_query: str, description: str = None):
        """Save a SQL query"""
        try:
            insert_query = """
            INSERT INTO saved_queries (name, sql_query, description, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            with self.engine.connect() as conn:
                conn.execute(
                    text(insert_query),
                    (name, sql_query, description, datetime.now(), datetime.now())
                )
                conn.commit()
                
            logger.info(f"Query '{name}' saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save query: {str(e)}")
            raise
    
    def get_quick_metrics(self) -> Dict[str, float]:
        """Get quick analytics metrics"""
        try:
            metrics = {}
            
            # Total water usage (last 30 days)
            usage_query = """
            SELECT COALESCE(SUM(usage_gallons), 0) as total_usage
            FROM water_meter_readings
            WHERE reading_date >= CURRENT_DATE - INTERVAL '30 days'
            """
            try:
                usage_df = self.execute_query(usage_query)
                metrics['total_usage'] = float(usage_df.iloc[0]['total_usage'])
            except:
                metrics['total_usage'] = 0
            
            # Active customers
            customers_query = """
            SELECT COUNT(DISTINCT customer_id) as active_customers
            FROM customer_profiles
            WHERE is_active = true
            """
            try:
                customers_df = self.execute_query(customers_query)
                metrics['active_customers'] = int(customers_df.iloc[0]['active_customers'])
            except:
                metrics['active_customers'] = 0
            
            # Monthly revenue
            revenue_query = """
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue
            FROM customer_billing
            WHERE billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)
            """
            try:
                revenue_df = self.execute_query(revenue_query)
                metrics['total_revenue'] = float(revenue_df.iloc[0]['total_revenue'])
            except:
                metrics['total_revenue'] = 0
            
            # Collection rate
            collection_query = """
            SELECT 
                CASE 
                    WHEN SUM(total_amount) > 0 
                    THEN (SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) * 100.0 / SUM(total_amount))
                    ELSE 0 
                END as collection_rate
            FROM customer_billing
            WHERE billing_period_start >= CURRENT_DATE - INTERVAL '90 days'
            """
            try:
                collection_df = self.execute_query(collection_query)
                metrics['collection_rate'] = float(collection_df.iloc[0]['collection_rate'])
            except:
                metrics['collection_rate'] = 0
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get quick metrics: {str(e)}")
            return {
                'total_usage': 0,
                'active_customers': 0,
                'total_revenue': 0,
                'collection_rate': 0
            }
    
    def get_usage_trend(self) -> Optional[pd.DataFrame]:
        """Get daily usage trend data"""
        try:
            trend_query = """
            SELECT 
                reading_date::date as date,
                SUM(usage_gallons) as usage
            FROM water_meter_readings
            WHERE reading_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY reading_date::date
            ORDER BY date
            """
            return self.execute_query(trend_query)
        except Exception as e:
            logger.error(f"Failed to get usage trend: {str(e)}")
            return None
    
    def get_zone_comparison(self) -> Optional[pd.DataFrame]:
        """Get usage comparison by zone"""
        try:
            zone_query = """
            SELECT 
                location_zone as zone,
                SUM(usage_gallons) as total_usage
            FROM water_meter_readings
            WHERE reading_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY location_zone
            ORDER BY total_usage DESC
            """
            return self.execute_query(zone_query)
        except Exception as e:
            logger.error(f"Failed to get zone comparison: {str(e)}")
            return None


class MockDataGenerator:
    """Generates mock data for the SQL Report Generator"""
    
    def __init__(self):
        self.db_manager = DatabaseManager()
    
    def generate_all_data(self):
        """Generate all mock data tables"""
        self.create_tables()
        self.generate_customer_profiles()
        self.generate_service_locations()
        self.generate_water_meter_readings()
        self.generate_customer_billing()
        self.generate_saved_queries()
    
    def create_tables(self):
        """Create all necessary tables"""
        tables_sql = """
        -- Drop existing tables if they exist
        DROP TABLE IF EXISTS water_meter_readings CASCADE;
        DROP TABLE IF EXISTS customer_billing CASCADE;
        DROP TABLE IF EXISTS service_locations CASCADE;
        DROP TABLE IF EXISTS customer_profiles CASCADE;
        DROP TABLE IF EXISTS saved_queries CASCADE;
        
        -- Customer profiles table
        CREATE TABLE customer_profiles (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL UNIQUE,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            address TEXT NOT NULL,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(50) NOT NULL,
            zip_code VARCHAR(10) NOT NULL,
            account_type VARCHAR(20) NOT NULL,
            is_active BOOLEAN DEFAULT true
        );
        
        -- Service locations table
        CREATE TABLE service_locations (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            meter_id VARCHAR(50) NOT NULL,
            location_name VARCHAR(200),
            address TEXT NOT NULL,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(50) NOT NULL,
            zip_code VARCHAR(10) NOT NULL,
            zone VARCHAR(20) NOT NULL,
            meter_type VARCHAR(50) NOT NULL,
            install_date TIMESTAMP NOT NULL,
            last_maintenance_date TIMESTAMP,
            is_active BOOLEAN DEFAULT true
        );
        
        -- Water meter readings table
        CREATE TABLE water_meter_readings (
            id SERIAL PRIMARY KEY,
            meter_id VARCHAR(50) NOT NULL,
            reading_date TIMESTAMP NOT NULL,
            usage_gallons DECIMAL(10, 2) NOT NULL,
            location_zone VARCHAR(20) NOT NULL,
            customer_id INTEGER NOT NULL
        );
        
        -- Customer billing table
        CREATE TABLE customer_billing (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            billing_period_start TIMESTAMP NOT NULL,
            billing_period_end TIMESTAMP NOT NULL,
            usage_gallons DECIMAL(10, 2) NOT NULL,
            rate_per_gallon DECIMAL(6, 4) NOT NULL,
            base_fee DECIMAL(8, 2) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            due_date TIMESTAMP NOT NULL,
            paid_date TIMESTAMP,
            payment_status VARCHAR(20) NOT NULL
        );
        
        -- Saved queries table
        CREATE TABLE saved_queries (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            sql_query TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        try:
            with self.db_manager.engine.connect() as conn:
                conn.execute(text(tables_sql))
                conn.commit()
            logger.info("Tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create tables: {str(e)}")
            raise
    
    def generate_customer_profiles(self):
        """Generate customer profile data"""
        customers = []
        account_types = ['residential', 'commercial', 'industrial']
        states = ['CA', 'TX', 'FL', 'NY', 'IL']
        
        for i in range(1, 1001):
            customers.append({
                'customer_id': i,
                'first_name': f'Customer{i}',
                'last_name': f'LastName{i}',
                'email': f'customer{i}@example.com',
                'phone': f'555-{str(i).zfill(4)}',
                'address': f'{i} Main St',
                'city': f'City{(i % 50) + 1}',
                'state': random.choice(states),
                'zip_code': str(90000 + (i % 1000)).zfill(5),
                'account_type': account_types[i % len(account_types)],
                'is_active': True
            })
        
        # Convert to DataFrame and insert
        df = pd.DataFrame(customers)
        try:
            df.to_sql('customer_profiles', self.db_manager.engine, if_exists='append', index=False)
            logger.info(f"Generated {len(customers)} customer profiles")
        except Exception as e:
            logger.error(f"Failed to insert customer profiles: {str(e)}")
            raise
    
    def generate_service_locations(self):
        """Generate service location data"""
        locations = []
        zones = ['Zone-A', 'Zone-B', 'Zone-C', 'Zone-D']
        meter_types = ['Smart Meter', 'Standard Meter', 'Digital Meter']
        
        for i in range(1, 1001):
            install_date = datetime.now() - timedelta(days=random.randint(365, 1825))
            maintenance_date = install_date + timedelta(days=random.randint(180, 365))
            
            locations.append({
                'customer_id': i,
                'meter_id': f'WM-{str(i).zfill(4)}',
                'location_name': f'Property {i}',
                'address': f'{i} Service Rd',
                'city': f'City{(i % 50) + 1}',
                'state': 'CA',
                'zip_code': str(90000 + (i % 1000)).zfill(5),
                'zone': zones[i % len(zones)],
                'meter_type': random.choice(meter_types),
                'install_date': install_date,
                'last_maintenance_date': maintenance_date,
                'is_active': True
            })
        
        df = pd.DataFrame(locations)
        try:
            df.to_sql('service_locations', self.db_manager.engine, if_exists='append', index=False)
            logger.info(f"Generated {len(locations)} service locations")
        except Exception as e:
            logger.error(f"Failed to insert service locations: {str(e)}")
            raise
    
    def generate_water_meter_readings(self):
        """Generate water meter reading data"""
        readings = []
        zones = ['Zone-A', 'Zone-B', 'Zone-C', 'Zone-D']
        
        # Generate 6 months of daily readings for each customer
        for customer_id in range(1, 1001):
            meter_id = f'WM-{str(customer_id).zfill(4)}'
            zone = zones[customer_id % len(zones)]
            
            base_usage = 150 + (customer_id % 200)  # Base daily usage varies by customer
            
            for day_offset in range(180):  # 6 months of data
                reading_date = datetime.now() - timedelta(days=day_offset)
                
                # Add seasonal variation and randomness
                seasonal_factor = 1 + 0.3 * np.sin((day_offset % 365) * 2 * np.pi / 365)
                random_factor = 0.7 + random.random() * 0.6  # ±30% random variation
                usage_gallons = round(base_usage * seasonal_factor * random_factor, 2)
                
                readings.append({
                    'meter_id': meter_id,
                    'reading_date': reading_date,
                    'usage_gallons': usage_gallons,
                    'location_zone': zone,
                    'customer_id': customer_id
                })
        
        # Insert in batches to avoid memory issues
        batch_size = 10000
        total_readings = len(readings)
        
        for i in range(0, total_readings, batch_size):
            batch = readings[i:i + batch_size]
            df = pd.DataFrame(batch)
            try:
                df.to_sql('water_meter_readings', self.db_manager.engine, if_exists='append', index=False)
                logger.info(f"Inserted batch {i // batch_size + 1}/{(total_readings - 1) // batch_size + 1}")
            except Exception as e:
                logger.error(f"Failed to insert readings batch: {str(e)}")
                raise
        
        logger.info(f"Generated {total_readings} water meter readings")
    
    def generate_customer_billing(self):
        """Generate customer billing data"""
        billings = []
        payment_statuses = ['paid', 'pending', 'overdue']
        rate_tiers = [0.003, 0.004, 0.005]  # Different rate tiers
        
        # Generate 6 months of monthly billing for each customer
        for customer_id in range(1, 1001):
            rate_per_gallon = rate_tiers[customer_id % len(rate_tiers)]
            
            for month_offset in range(6):
                # Calculate billing period
                period_start = (datetime.now() - timedelta(days=30 * month_offset)).replace(day=1)
                period_end = (period_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                due_date = period_end + timedelta(days=30)
                
                # Calculate usage for the period (approximate monthly usage)
                base_monthly_usage = (150 + (customer_id % 200)) * 30
                usage_variation = 0.8 + random.random() * 0.4
                usage_gallons = round(base_monthly_usage * usage_variation, 2)
                
                # Calculate billing amounts
                base_fee = 25.00
                total_amount = round(base_fee + (usage_gallons * rate_per_gallon), 2)
                
                # Determine payment status and date
                payment_status = random.choices(
                    payment_statuses, 
                    weights=[0.8, 0.15, 0.05]  # 80% paid, 15% pending, 5% overdue
                )[0]
                
                paid_date = None
                if payment_status == 'paid':
                    paid_date = due_date - timedelta(days=random.randint(1, 30))
                
                billings.append({
                    'customer_id': customer_id,
                    'billing_period_start': period_start,
                    'billing_period_end': period_end,
                    'usage_gallons': usage_gallons,
                    'rate_per_gallon': rate_per_gallon,
                    'base_fee': base_fee,
                    'total_amount': total_amount,
                    'due_date': due_date,
                    'paid_date': paid_date,
                    'payment_status': payment_status
                })
        
        df = pd.DataFrame(billings)
        try:
            df.to_sql('customer_billing', self.db_manager.engine, if_exists='append', index=False)
            logger.info(f"Generated {len(billings)} billing records")
        except Exception as e:
            logger.error(f"Failed to insert billing records: {str(e)}")
            raise
    
    def generate_saved_queries(self):
        """Generate sample saved queries"""
        queries = [
            {
                'name': 'Monthly Usage Report',
                'description': 'Total water usage by location zone for the current month',
                'sql_query': """SELECT 
    location_zone,
    COUNT(*) as meter_count,
    SUM(usage_gallons) as total_usage,
    AVG(usage_gallons) as avg_usage,
    MAX(usage_gallons) as max_usage
FROM water_meter_readings 
WHERE reading_date >= date_trunc('month', CURRENT_DATE)
GROUP BY location_zone
ORDER BY total_usage DESC""",
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'name': 'High Usage Customers',
                'description': 'Customers with above-average water consumption',
                'sql_query': """SELECT 
    cp.customer_id,
    cp.first_name,
    cp.last_name,
    cp.account_type,
    SUM(wmr.usage_gallons) as total_usage,
    COUNT(wmr.id) as reading_count
FROM customer_profiles cp
JOIN water_meter_readings wmr ON cp.customer_id = wmr.customer_id
WHERE wmr.reading_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cp.customer_id, cp.first_name, cp.last_name, cp.account_type
HAVING SUM(wmr.usage_gallons) > (
    SELECT AVG(monthly_usage) FROM (
        SELECT SUM(usage_gallons) as monthly_usage
        FROM water_meter_readings
        WHERE reading_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY customer_id
    ) avg_calc
)
ORDER BY total_usage DESC""",
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'name': 'Billing Summary',
                'description': 'Monthly billing summary with payment status',
                'sql_query': """SELECT 
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
WHERE billing_period_start >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', billing_period_start)
ORDER BY billing_month DESC""",
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        ]
        
        df = pd.DataFrame(queries)
        try:
            df.to_sql('saved_queries', self.db_manager.engine, if_exists='append', index=False)
            logger.info(f"Generated {len(queries)} saved queries")
        except Exception as e:
            logger.error(f"Failed to insert saved queries: {str(e)}")
            raise