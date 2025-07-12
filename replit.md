# SQL Report Generator Application

## Overview

This is a comprehensive SQL Report Generator built with Python and Streamlit, providing a professional visual GUI for SQL query building, execution, and reporting. The application features an intuitive interface for writing SQL queries, executing them against PostgreSQL databases, and generating professional reports with data visualization. It's designed for water utility data management with comprehensive mock datasets including water meter readings, customer profiles, billing, and service locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
- **Framework**: Python with Streamlit for rapid GUI development
- **UI Components**: Professional Streamlit interface with custom CSS styling
- **Database**: PostgreSQL with SQLAlchemy for robust data operations
- **Data Processing**: Pandas for efficient data manipulation and analysis
- **Visualization**: Plotly for interactive charts and professional visualizations
- **Report Generation**: Custom HTML report generator with professional templates
- **Query Building**: Visual drag-and-drop query builder for non-technical users

### Core Modules
- **Main Application** (`app.py`): Streamlit GUI with tabs for query building, results, reports, and analytics
- **Database Manager** (`database.py`): PostgreSQL connection handling, query execution, and mock data generation
- **Query Builder** (`query_builder.py`): Visual query construction with validation and templates
- **Chart Builder** (`chart_builder.py`): Interactive chart creation using Plotly with multiple chart types
- **Report Generator** (`report_generator.py`): Professional HTML report generation with statistics and insights

## Key Components

### Database Layer
- **Schema Definition**: Centralized schema definitions in `shared/schema.ts`
- **Tables**: 
  - `water_meter_readings` - Meter reading data with usage metrics
  - `customer_profiles` - Customer information and account details
  - `customer_billing` - Billing records and payment status
  - `service_locations` - Service location mapping
  - `saved_queries` - User-saved SQL queries
- **Type Safety**: Drizzle generates TypeScript types from schema
- **Migrations**: Database migrations managed through Drizzle Kit

### API Layer
- **Query Execution**: `POST /api/queries/execute` - Execute arbitrary SQL queries
- **Saved Queries**: CRUD operations for managing saved queries
- **Schema Introspection**: `GET /api/schema` - Retrieve database schema information
- **Mock Data**: Automatic generation of sample data for development

### Frontend Components
- **SQL Editor**: Monaco-based editor with SQL syntax highlighting
- **Schema Browser**: Interactive database schema explorer
- **Results Table**: Paginated table for query results with export functionality
- **Query Builder**: Visual query builder modal for non-technical users
- **Floating Actions**: Quick access buttons for common operations

## Data Flow

1. **Schema Loading**: Application fetches database schema on startup
2. **Query Composition**: Users write SQL in Monaco editor or use visual query builder
3. **Query Execution**: SQL queries sent to backend via REST API
4. **Result Processing**: Backend executes queries and returns structured results
5. **Result Display**: Frontend renders results in interactive table with pagination
6. **Query Persistence**: Users can save frequently used queries for later use

## External Dependencies

### Frontend Dependencies
- **UI Components**: Comprehensive Radix UI component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **Data Fetching**: TanStack React Query for caching and synchronization
- **Form Handling**: React Hook Form with Zod validation
- **Code Editor**: Monaco Editor for professional code editing experience
- **Icons**: Lucide React for consistent iconography

### Backend Dependencies
- **Database**: Neon PostgreSQL serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **WebSocket**: WebSocket support for Neon serverless connections
- **Session Management**: PostgreSQL session store for user sessions
- **Development**: TSX for TypeScript execution in development

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: TSX with automatic restart on file changes
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Build Process**: Separate frontend (Vite) and backend (esbuild) builds

### Production Build
- **Frontend**: Static assets built with Vite and served from Express
- **Backend**: Single bundled file using esbuild with external packages
- **Database**: Production Neon database with SSL connections
- **Process Management**: Single Node.js process serving both API and static files

### Environment Configuration
- **Database URL**: Required environment variable for PostgreSQL connection
- **Development Mode**: Automatic detection with appropriate tooling
- **Replit Integration**: Special handling for Replit development environment
- **Security**: CORS and session configuration for production deployment

The application follows a modern full-stack architecture with strong type safety throughout the stack, comprehensive error handling, and a focus on developer experience with hot reloading and automatic code generation.