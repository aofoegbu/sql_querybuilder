#!/usr/bin/env python3
"""
SQL Report Generator - Main Streamlit Application
A professional visual GUI for SQL query building, execution, and reporting
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import psycopg2
import os
from datetime import datetime, timedelta
import json
import io
import base64
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from database import DatabaseManager, MockDataGenerator
from query_builder import VisualQueryBuilder
from report_generator import ReportGenerator
from chart_builder import ChartBuilder

# Page configuration
st.set_page_config(
    page_title="SQL Report Generator",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for professional styling
st.markdown("""
<style>
    .main {
        padding-top: 2rem;
    }
    .stApp > header {
        background-color: transparent;
    }
    .stApp {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .main-container {
        background: white;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        margin: 1rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        margin: 0.5rem 0;
    }
    .sql-editor {
        background-color: #1e1e1e;
        border-radius: 8px;
        padding: 1rem;
        font-family: 'Consolas', 'Monaco', monospace;
    }
    .sidebar-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 1rem;
        text-align: center;
    }
    .query-result-header {
        background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 1rem;
    }
    .stButton > button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 25px;
        padding: 0.5rem 2rem;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    .success-banner {
        background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
        text-align: center;
        font-weight: bold;
    }
    .error-banner {
        background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
        text-align: center;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

class SQLReportGenerator:
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.query_builder = VisualQueryBuilder()
        self.report_generator = ReportGenerator()
        self.chart_builder = ChartBuilder()
        
        # Initialize session state
        if 'current_query' not in st.session_state:
            st.session_state.current_query = ""
        if 'query_results' not in st.session_state:
            st.session_state.query_results = None
        if 'saved_queries' not in st.session_state:
            st.session_state.saved_queries = []
        if 'schema_info' not in st.session_state:
            st.session_state.schema_info = {}
        if 'chart_config' not in st.session_state:
            st.session_state.chart_config = {}

    def run(self):
        """Main application runner"""
        # Header
        st.markdown("""
        <div class="main-container">
            <h1 style="text-align: center; color: #667eea; margin-bottom: 2rem;">
                📊 SQL Report Generator
            </h1>
            <p style="text-align: center; color: #666; font-size: 1.2rem;">
                Professional data analysis and reporting with visual query building
            </p>
        </div>
        """, unsafe_allow_html=True)

        # Sidebar
        self.render_sidebar()
        
        # Main content area
        self.render_main_content()

    def render_sidebar(self):
        """Render the sidebar with database info and tools"""
        with st.sidebar:
            st.markdown("""
            <div class="sidebar-header">
                <h2>🗄️ Database Tools</h2>
            </div>
            """, unsafe_allow_html=True)
            
            # Database connection status
            self.render_connection_status()
            
            # Schema browser
            self.render_schema_browser()
            
            # Saved queries
            self.render_saved_queries()
            
            # Query templates
            self.render_query_templates()

    def render_connection_status(self):
        """Render database connection status"""
        st.subheader("📡 Connection Status")
        
        try:
            if self.db_manager.test_connection():
                st.success("✅ PostgreSQL Connected")
                
                # Database statistics
                stats = self.db_manager.get_database_stats()
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("Tables", stats.get('table_count', 0))
                with col2:
                    st.metric("Total Records", f"{stats.get('total_records', 0):,}")
                    
            else:
                st.error("❌ Connection Failed")
                if st.button("Initialize Database"):
                    self.initialize_database()
                    
        except Exception as e:
            st.error(f"Connection Error: {str(e)}")
            if st.button("Setup Database"):
                self.initialize_database()

    def render_schema_browser(self):
        """Render database schema browser"""
        st.subheader("🏗️ Schema Browser")
        
        try:
            schema_info = self.db_manager.get_schema_info()
            
            for table_name, table_info in schema_info.items():
                with st.expander(f"📋 {table_name} ({table_info['row_count']:,} rows)"):
                    for column in table_info['columns']:
                        col_type = column['type']
                        is_pk = "🔑" if column['is_primary_key'] else ""
                        nullable = "❓" if column['nullable'] else "❗"
                        st.text(f"{is_pk}{nullable} {column['name']} ({col_type})")
                        
        except Exception as e:
            st.warning("Schema not available. Initialize database first.")

    def render_saved_queries(self):
        """Render saved queries section"""
        st.subheader("💾 Saved Queries")
        
        try:
            saved_queries = self.db_manager.get_saved_queries()
            
            for query in saved_queries:
                if st.button(f"📝 {query['name']}", key=f"load_{query['id']}"):
                    st.session_state.current_query = query['sql_query']
                    st.rerun()
                    
        except Exception as e:
            st.info("No saved queries available")

    def render_query_templates(self):
        """Render query templates"""
        st.subheader("📋 Query Templates")
        
        templates = {
            "Water Usage Summary": """
SELECT 
    location_zone,
    COUNT(*) as meter_count,
    SUM(usage_gallons) as total_usage,
    AVG(usage_gallons) as avg_usage,
    MAX(usage_gallons) as max_usage
FROM water_meter_readings 
WHERE reading_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY location_zone
ORDER BY total_usage DESC
            """.strip(),
            
            "Customer Billing Report": """
SELECT 
    cp.first_name || ' ' || cp.last_name as customer_name,
    cp.account_type,
    SUM(cb.total_amount) as total_billed,
    COUNT(cb.id) as bill_count,
    AVG(cb.total_amount) as avg_bill
FROM customer_profiles cp
JOIN customer_billing cb ON cp.customer_id = cb.customer_id
WHERE cb.billing_period_start >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY cp.customer_id, cp.first_name, cp.last_name, cp.account_type
ORDER BY total_billed DESC
            """.strip(),
            
            "High Usage Analysis": """
SELECT 
    wmr.meter_id,
    cp.account_type,
    wmr.location_zone,
    AVG(wmr.usage_gallons) as avg_daily_usage,
    COUNT(*) as reading_count
FROM water_meter_readings wmr
JOIN customer_profiles cp ON wmr.customer_id = cp.customer_id
WHERE wmr.reading_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY wmr.meter_id, cp.account_type, wmr.location_zone
HAVING AVG(wmr.usage_gallons) > 300
ORDER BY avg_daily_usage DESC
            """.strip()
        }
        
        for name, query in templates.items():
            if st.button(f"📄 {name}", key=f"template_{name}"):
                st.session_state.current_query = query
                st.rerun()

    def render_main_content(self):
        """Render main content area"""
        tab1, tab2, tab3, tab4 = st.tabs(["🔧 Query Builder", "📊 Results & Charts", "📈 Reports", "⚡ Quick Analytics"])
        
        with tab1:
            self.render_query_builder_tab()
            
        with tab2:
            self.render_results_tab()
            
        with tab3:
            self.render_reports_tab()
            
        with tab4:
            self.render_analytics_tab()

    def render_query_builder_tab(self):
        """Render query builder interface"""
        st.markdown("""
        <div class="query-result-header">
            <h3>🔧 Visual Query Builder</h3>
            <p>Build SQL queries with drag-and-drop interface or write custom SQL</p>
        </div>
        """, unsafe_allow_html=True)
        
        col1, col2 = st.columns([3, 1])
        
        with col1:
            # Query building mode selection
            query_mode = st.radio(
                "Query Building Mode:",
                ["Visual Builder", "SQL Editor"],
                horizontal=True
            )
            
            if query_mode == "Visual Builder":
                self.render_visual_query_builder()
            else:
                self.render_sql_editor()
                
        with col2:
            st.subheader("🎯 Quick Actions")
            
            if st.button("▶️ Execute Query", type="primary"):
                self.execute_query()
                
            if st.button("💾 Save Query"):
                self.save_query_dialog()
                
            if st.button("📋 Format SQL"):
                if st.session_state.current_query:
                    # Basic SQL formatting
                    formatted = self.format_sql(st.session_state.current_query)
                    st.session_state.current_query = formatted
                    st.rerun()
                    
            if st.button("🗑️ Clear"):
                st.session_state.current_query = ""
                st.session_state.query_results = None
                st.rerun()

    def render_visual_query_builder(self):
        """Render visual query builder interface"""
        st.subheader("📐 Visual Query Builder")
        
        # Get schema for builder
        try:
            schema_info = self.db_manager.get_schema_info()
            
            # Table selection
            st.write("**1. Select Tables:**")
            selected_tables = []
            cols = st.columns(len(schema_info))
            
            for idx, table_name in enumerate(schema_info.keys()):
                with cols[idx % len(cols)]:
                    if st.checkbox(table_name, key=f"table_{table_name}"):
                        selected_tables.append(table_name)
            
            if selected_tables:
                # Column selection
                st.write("**2. Select Columns:**")
                selected_columns = []
                
                for table in selected_tables:
                    st.write(f"From {table}:")
                    table_cols = st.columns(3)
                    
                    for idx, column in enumerate(schema_info[table]['columns']):
                        with table_cols[idx % 3]:
                            col_key = f"{table}.{column['name']}"
                            if st.checkbox(f"{column['name']} ({column['type']})", key=f"col_{col_key}"):
                                selected_columns.append(col_key)
                
                # Aggregation options
                if selected_columns:
                    st.write("**3. Aggregations (Optional):**")
                    agg_col1, agg_col2 = st.columns(2)
                    
                    with agg_col1:
                        group_by_cols = st.multiselect("Group By:", selected_columns)
                    
                    with agg_col2:
                        aggregations = {}
                        for col in selected_columns:
                            if col not in group_by_cols:
                                agg_type = st.selectbox(
                                    f"Aggregate {col.split('.')[-1]}:",
                                    ["None", "SUM", "COUNT", "AVG", "MIN", "MAX"],
                                    key=f"agg_{col}"
                                )
                                if agg_type != "None":
                                    aggregations[col] = agg_type
                    
                    # Generate SQL
                    if st.button("🔄 Generate SQL"):
                        sql_query = self.query_builder.build_query(
                            tables=selected_tables,
                            columns=selected_columns,
                            group_by=group_by_cols,
                            aggregations=aggregations
                        )
                        st.session_state.current_query = sql_query
                        st.rerun()
                        
        except Exception as e:
            st.error(f"Error loading schema: {str(e)}")

    def render_sql_editor(self):
        """Render SQL editor"""
        st.subheader("💻 SQL Editor")
        
        # SQL text area with syntax highlighting effect
        query = st.text_area(
            "Write your SQL query:",
            value=st.session_state.current_query,
            height=300,
            help="Use Ctrl+Enter to execute"
        )
        
        if query != st.session_state.current_query:
            st.session_state.current_query = query
        
        # Query validation
        if query:
            if self.validate_sql(query):
                st.success("✅ Valid SQL syntax")
            else:
                st.warning("⚠️ Please check SQL syntax")

    def render_results_tab(self):
        """Render query results and charts"""
        if st.session_state.query_results is not None:
            df = st.session_state.query_results
            
            st.markdown("""
            <div class="query-result-header">
                <h3>📊 Query Results</h3>
            </div>
            """, unsafe_allow_html=True)
            
            # Results summary
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Rows", len(df))
            with col2:
                st.metric("Columns", len(df.columns))
            with col3:
                st.metric("Memory Usage", f"{df.memory_usage(deep=True).sum() / 1024:.1f} KB")
            with col4:
                if st.button("📥 Export Results"):
                    self.export_results(df)
            
            # Data display options
            display_tab1, display_tab2, display_tab3 = st.tabs(["📋 Table View", "📈 Charts", "📊 Statistics"])
            
            with display_tab1:
                # Pagination for large datasets
                if len(df) > 100:
                    page_size = st.select_slider("Rows per page:", [50, 100, 250, 500], value=100)
                    total_pages = (len(df) - 1) // page_size + 1
                    page = st.selectbox("Page:", range(1, total_pages + 1))
                    
                    start_idx = (page - 1) * page_size
                    end_idx = min(start_idx + page_size, len(df))
                    st.dataframe(df.iloc[start_idx:end_idx], use_container_width=True)
                else:
                    st.dataframe(df, use_container_width=True)
            
            with display_tab2:
                self.render_chart_builder(df)
            
            with display_tab3:
                self.render_data_statistics(df)
        else:
            st.info("Execute a query to see results here")

    def render_chart_builder(self, df):
        """Render interactive chart builder"""
        st.subheader("📈 Interactive Chart Builder")
        
        if df.empty:
            st.warning("No data available for charting")
            return
        
        # Chart configuration
        col1, col2 = st.columns([1, 2])
        
        with col1:
            chart_type = st.selectbox(
                "Chart Type:",
                ["Bar Chart", "Line Chart", "Scatter Plot", "Pie Chart", "Histogram", "Box Plot"]
            )
            
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
            
            if chart_type in ["Bar Chart", "Line Chart"]:
                x_col = st.selectbox("X-axis:", categorical_cols + numeric_cols)
                y_col = st.selectbox("Y-axis:", numeric_cols)
                color_col = st.selectbox("Color by:", ["None"] + categorical_cols)
                
            elif chart_type == "Scatter Plot":
                x_col = st.selectbox("X-axis:", numeric_cols)
                y_col = st.selectbox("Y-axis:", numeric_cols)
                size_col = st.selectbox("Size by:", ["None"] + numeric_cols)
                color_col = st.selectbox("Color by:", ["None"] + categorical_cols)
                
            elif chart_type == "Pie Chart":
                label_col = st.selectbox("Labels:", categorical_cols)
                value_col = st.selectbox("Values:", numeric_cols)
                
            elif chart_type in ["Histogram", "Box Plot"]:
                x_col = st.selectbox("Column:", numeric_cols)
                color_col = st.selectbox("Group by:", ["None"] + categorical_cols)
        
        with col2:
            # Generate and display chart
            try:
                chart = self.chart_builder.create_chart(
                    df, chart_type, locals()
                )
                if chart:
                    st.plotly_chart(chart, use_container_width=True)
            except Exception as e:
                st.error(f"Chart generation error: {str(e)}")

    def render_data_statistics(self, df):
        """Render data statistics"""
        st.subheader("📊 Data Statistics")
        
        # Basic statistics
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**Numeric Columns:**")
            numeric_df = df.select_dtypes(include=[np.number])
            if not numeric_df.empty:
                st.dataframe(numeric_df.describe())
            else:
                st.info("No numeric columns found")
        
        with col2:
            st.write("**Categorical Columns:**")
            categorical_df = df.select_dtypes(include=['object'])
            if not categorical_df.empty:
                for col in categorical_df.columns:
                    st.write(f"**{col}:**")
                    value_counts = categorical_df[col].value_counts().head(5)
                    st.bar_chart(value_counts)
            else:
                st.info("No categorical columns found")

    def render_reports_tab(self):
        """Render reports generation interface"""
        st.markdown("""
        <div class="query-result-header">
            <h3>📈 Report Generator</h3>
            <p>Generate professional reports from your query results</p>
        </div>
        """, unsafe_allow_html=True)
        
        if st.session_state.query_results is not None:
            df = st.session_state.query_results
            
            # Report configuration
            col1, col2 = st.columns([1, 2])
            
            with col1:
                st.subheader("📋 Report Configuration")
                
                report_title = st.text_input("Report Title:", "Data Analysis Report")
                report_type = st.selectbox("Report Type:", ["Executive Summary", "Detailed Analysis", "Trend Report"])
                include_charts = st.checkbox("Include Charts", True)
                include_statistics = st.checkbox("Include Statistics", True)
                
                if st.button("🔄 Generate Report"):
                    report_html = self.report_generator.generate_report(
                        df, report_title, report_type, include_charts, include_statistics
                    )
                    st.session_state.current_report = report_html
            
            with col2:
                # Report preview
                if hasattr(st.session_state, 'current_report'):
                    st.subheader("📄 Report Preview")
                    st.components.v1.html(st.session_state.current_report, height=600)
                    
                    # Download button
                    st.download_button(
                        "📥 Download Report",
                        st.session_state.current_report,
                        file_name=f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html",
                        mime="text/html"
                    )
        else:
            st.info("Execute a query first to generate reports")

    def render_analytics_tab(self):
        """Render quick analytics dashboard"""
        st.markdown("""
        <div class="query-result-header">
            <h3>⚡ Quick Analytics Dashboard</h3>
            <p>Instant insights from your database</p>
        </div>
        """, unsafe_allow_html=True)
        
        try:
            # Quick metrics
            metrics = self.db_manager.get_quick_metrics()
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.markdown("""
                <div class="metric-card">
                    <h3>💧 Total Water Usage</h3>
                    <h2>{:,.0f} Gallons</h2>
                    <p>Last 30 days</p>
                </div>
                """.format(metrics.get('total_usage', 0)), unsafe_allow_html=True)
            
            with col2:
                st.markdown("""
                <div class="metric-card">
                    <h3>👥 Active Customers</h3>
                    <h2>{:,}</h2>
                    <p>Current period</p>
                </div>
                """.format(metrics.get('active_customers', 0)), unsafe_allow_html=True)
            
            with col3:
                st.markdown("""
                <div class="metric-card">
                    <h3>💰 Revenue</h3>
                    <h2>${:,.2f}</h2>
                    <p>Monthly total</p>
                </div>
                """.format(metrics.get('total_revenue', 0)), unsafe_allow_html=True)
            
            with col4:
                st.markdown("""
                <div class="metric-card">
                    <h3>📊 Collection Rate</h3>
                    <h2>{:.1f}%</h2>
                    <p>Payment efficiency</p>
                </div>
                """.format(metrics.get('collection_rate', 0)), unsafe_allow_html=True)
            
            # Quick charts
            st.subheader("📈 Trend Analysis")
            
            chart_col1, chart_col2 = st.columns(2)
            
            with chart_col1:
                # Usage trend
                usage_trend = self.db_manager.get_usage_trend()
                if usage_trend is not None:
                    fig = px.line(usage_trend, x='date', y='usage', title='Daily Water Usage Trend')
                    st.plotly_chart(fig, use_container_width=True)
            
            with chart_col2:
                # Zone comparison
                zone_data = self.db_manager.get_zone_comparison()
                if zone_data is not None:
                    fig = px.bar(zone_data, x='zone', y='total_usage', title='Usage by Zone')
                    st.plotly_chart(fig, use_container_width=True)
                    
        except Exception as e:
            st.error(f"Analytics loading error: {str(e)}")
            if st.button("Initialize Analytics"):
                self.initialize_database()

    def execute_query(self):
        """Execute the current SQL query"""
        if not st.session_state.current_query.strip():
            st.error("Please enter a SQL query")
            return
        
        try:
            with st.spinner("Executing query..."):
                result_df = self.db_manager.execute_query(st.session_state.current_query)
                st.session_state.query_results = result_df
                
                st.success(f"✅ Query executed successfully! Retrieved {len(result_df)} rows.")
                
        except Exception as e:
            st.error(f"Query execution failed: {str(e)}")

    def save_query_dialog(self):
        """Show save query dialog"""
        if not st.session_state.current_query.strip():
            st.error("No query to save")
            return
        
        with st.form("save_query_form"):
            query_name = st.text_input("Query Name:")
            query_description = st.text_area("Description (optional):")
            
            if st.form_submit_button("💾 Save Query"):
                if query_name:
                    try:
                        self.db_manager.save_query(
                            query_name, 
                            st.session_state.current_query, 
                            query_description
                        )
                        st.success("Query saved successfully!")
                    except Exception as e:
                        st.error(f"Failed to save query: {str(e)}")
                else:
                    st.error("Please enter a query name")

    def export_results(self, df):
        """Export query results"""
        export_format = st.selectbox("Export Format:", ["CSV", "Excel", "JSON"])
        
        if export_format == "CSV":
            csv = df.to_csv(index=False)
            st.download_button(
                "📥 Download CSV",
                csv,
                file_name=f"query_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
        elif export_format == "Excel":
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False)
            excel_data = output.getvalue()
            
            st.download_button(
                "📥 Download Excel",
                excel_data,
                file_name=f"query_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        elif export_format == "JSON":
            json_data = df.to_json(orient='records', indent=2)
            st.download_button(
                "📥 Download JSON",
                json_data,
                file_name=f"query_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )

    def initialize_database(self):
        """Initialize database with sample data"""
        try:
            with st.spinner("Initializing database..."):
                mock_generator = MockDataGenerator()
                mock_generator.generate_all_data()
                
                st.success("✅ Database initialized successfully!")
                st.rerun()
                
        except Exception as e:
            st.error(f"Database initialization failed: {str(e)}")

    def validate_sql(self, query: str) -> bool:
        """Basic SQL validation"""
        if not query.strip():
            return False
        
        # Basic checks
        query_lower = query.lower().strip()
        
        # Check for basic SQL structure
        if not any(keyword in query_lower for keyword in ['select', 'insert', 'update', 'delete', 'with']):
            return False
        
        # Check for balanced parentheses
        if query.count('(') != query.count(')'):
            return False
        
        return True

    def format_sql(self, query: str) -> str:
        """Basic SQL formatting"""
        # Simple formatting rules
        formatted = query.strip()
        
        # Add line breaks after major keywords
        keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN']
        
        for keyword in keywords:
            formatted = formatted.replace(keyword, f'\n{keyword}')
        
        # Clean up extra whitespace
        lines = [line.strip() for line in formatted.split('\n') if line.strip()]
        return '\n'.join(lines)

def main():
    """Main application entry point"""
    app = SQLReportGenerator()
    app.run()

if __name__ == "__main__":
    main()