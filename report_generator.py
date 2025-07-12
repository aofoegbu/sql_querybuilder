"""
Report Generator for SQL Report Generator
Creates professional HTML and PDF reports from query results
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import base64
import io
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ReportGenerator:
    """Generates professional reports from DataFrame data"""
    
    def __init__(self):
        self.report_templates = {
            'executive_summary': self._executive_summary_template,
            'detailed_analysis': self._detailed_analysis_template,
            'trend_report': self._trend_report_template
        }
        
        self.css_styles = """
        <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .report-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007acc;
        }
        .header h1 {
            color: #007acc;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header .subtitle {
            color: #666;
            font-size: 1.2em;
        }
        .meta-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007acc;
        }
        .section {
            margin: 30px 0;
        }
        .section h2 {
            color: #007acc;
            font-size: 1.8em;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        .section h3 {
            color: #495057;
            font-size: 1.4em;
            margin: 20px 0 10px 0;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .metric-card .value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-card .label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .data-table th {
            background: #007acc;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        .data-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e9ecef;
        }
        .data-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .data-table tr:hover {
            background: #e3f2fd;
        }
        .chart-container {
            margin: 30px 0;
            text-align: center;
        }
        .insights-box {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .insights-box h4 {
            color: #2e7d32;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            color: #666;
            font-size: 0.9em;
        }
        .summary-stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .stat-item {
            text-align: center;
            margin: 10px;
        }
        .stat-item .number {
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }
        .stat-item .description {
            color: #666;
            font-size: 0.9em;
        }
        .recommendation {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
        }
        .recommendation h5 {
            color: #856404;
            margin-top: 0;
        }
        .print-only {
            display: none;
        }
        @media print {
            .print-only {
                display: block;
            }
            .no-print {
                display: none;
            }
        }
        </style>
        """
    
    def generate_report(self, df: pd.DataFrame, title: str, report_type: str, 
                       include_charts: bool = True, include_statistics: bool = True) -> str:
        """Generate complete HTML report"""
        try:
            template_func = self.report_templates.get(
                report_type.lower().replace(' ', '_'),
                self.report_templates['detailed_analysis']
            )
            
            report_html = template_func(df, title, include_charts, include_statistics)
            return report_html
            
        except Exception as e:
            logger.error(f"Failed to generate report: {str(e)}")
            return self._error_report(str(e))
    
    def _executive_summary_template(self, df: pd.DataFrame, title: str, 
                                  include_charts: bool, include_statistics: bool) -> str:
        """Executive summary report template"""
        
        # Generate key insights
        insights = self._generate_insights(df)
        
        # Generate summary statistics
        summary_stats = self._generate_summary_stats(df)
        
        # Create charts if requested
        charts_html = ""
        if include_charts and not df.empty:
            charts_html = self._generate_chart_section(df)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{title}</title>
            <meta charset="utf-8">
            {self.css_styles}
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>{title}</h1>
                    <div class="subtitle">Executive Summary Report</div>
                </div>
                
                <div class="meta-info">
                    <strong>Report Generated:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br>
                    <strong>Data Points:</strong> {len(df):,} records<br>
                    <strong>Columns Analyzed:</strong> {len(df.columns)}<br>
                    <strong>Report Type:</strong> Executive Summary
                </div>
                
                <div class="section">
                    <h2>📊 Key Metrics</h2>
                    <div class="metric-grid">
                        {self._generate_metric_cards(summary_stats)}
                    </div>
                </div>
                
                <div class="section">
                    <h2>🔍 Key Insights</h2>
                    <div class="insights-box">
                        <h4>Automated Analysis Results:</h4>
                        {insights}
                    </div>
                </div>
                
                {charts_html}
                
                <div class="section">
                    <h2>📋 Data Summary</h2>
                    {self._generate_data_preview(df, max_rows=10)}
                </div>
                
                <div class="section">
                    <h2>💡 Recommendations</h2>
                    {self._generate_recommendations(df)}
                </div>
                
                <div class="footer">
                    <p>This report was automatically generated by SQL Report Generator</p>
                    <p>© {datetime.now().year} - Confidential Business Intelligence Report</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def _detailed_analysis_template(self, df: pd.DataFrame, title: str, 
                                  include_charts: bool, include_statistics: bool) -> str:
        """Detailed analysis report template"""
        
        # Generate detailed statistics
        detailed_stats = self._generate_detailed_statistics(df) if include_statistics else ""
        
        # Create charts if requested
        charts_html = ""
        if include_charts and not df.empty:
            charts_html = self._generate_comprehensive_charts(df)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{title}</title>
            <meta charset="utf-8">
            {self.css_styles}
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>{title}</h1>
                    <div class="subtitle">Detailed Analysis Report</div>
                </div>
                
                <div class="meta-info">
                    <strong>Report Generated:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br>
                    <strong>Dataset Size:</strong> {len(df):,} rows × {len(df.columns)} columns<br>
                    <strong>Memory Usage:</strong> {df.memory_usage(deep=True).sum() / 1024:.1f} KB<br>
                    <strong>Analysis Scope:</strong> Complete dataset analysis
                </div>
                
                <div class="section">
                    <h2>📊 Dataset Overview</h2>
                    {self._generate_dataset_overview(df)}
                </div>
                
                {detailed_stats}
                
                <div class="section">
                    <h2>📋 Complete Data View</h2>
                    {self._generate_data_preview(df, max_rows=50)}
                </div>
                
                {charts_html}
                
                <div class="section">
                    <h2>🔍 Data Quality Assessment</h2>
                    {self._generate_data_quality_section(df)}
                </div>
                
                <div class="footer">
                    <p>This detailed analysis was generated by SQL Report Generator</p>
                    <p>© {datetime.now().year} - Comprehensive Data Analysis Report</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def _trend_report_template(self, df: pd.DataFrame, title: str, 
                             include_charts: bool, include_statistics: bool) -> str:
        """Trend analysis report template"""
        
        # Identify potential time columns
        date_columns = df.select_dtypes(include=['datetime64']).columns.tolist()
        
        trend_analysis = ""
        if date_columns:
            trend_analysis = self._generate_trend_analysis(df, date_columns[0])
        else:
            trend_analysis = "<p>No time-based columns detected for trend analysis.</p>"
        
        charts_html = ""
        if include_charts and not df.empty:
            charts_html = self._generate_trend_charts(df)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{title}</title>
            <meta charset="utf-8">
            {self.css_styles}
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>{title}</h1>
                    <div class="subtitle">Trend Analysis Report</div>
                </div>
                
                <div class="meta-info">
                    <strong>Report Generated:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br>
                    <strong>Analysis Period:</strong> {self._get_date_range(df)}<br>
                    <strong>Data Points:</strong> {len(df):,} records<br>
                    <strong>Focus:</strong> Temporal patterns and trends
                </div>
                
                <div class="section">
                    <h2>📈 Trend Analysis</h2>
                    {trend_analysis}
                </div>
                
                {charts_html}
                
                <div class="section">
                    <h2>📊 Period Summary</h2>
                    {self._generate_period_summary(df)}
                </div>
                
                <div class="footer">
                    <p>This trend analysis was generated by SQL Report Generator</p>
                    <p>© {datetime.now().year} - Time Series Analysis Report</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def _generate_insights(self, df: pd.DataFrame) -> str:
        """Generate automated insights from data"""
        insights = []
        
        if df.empty:
            return "<p>No data available for analysis.</p>"
        
        # Basic insights
        insights.append(f"• Dataset contains {len(df):,} records across {len(df.columns)} columns")
        
        # Numeric columns insights
        numeric_cols = df.select_dtypes(include=['number']).columns
        if not numeric_cols.empty:
            for col in numeric_cols[:3]:  # Top 3 numeric columns
                mean_val = df[col].mean()
                max_val = df[col].max()
                min_val = df[col].min()
                insights.append(f"• {col}: Average {mean_val:.2f}, Range {min_val:.2f} to {max_val:.2f}")
        
        # Categorical insights
        categorical_cols = df.select_dtypes(include=['object']).columns
        for col in categorical_cols[:2]:  # Top 2 categorical columns
            unique_count = df[col].nunique()
            most_common = df[col].mode().iloc[0] if not df[col].mode().empty else "N/A"
            insights.append(f"• {col}: {unique_count} unique values, most common: '{most_common}'")
        
        # Missing data insights
        missing_data = df.isnull().sum()
        if missing_data.sum() > 0:
            cols_with_missing = missing_data[missing_data > 0]
            insights.append(f"• Missing data found in {len(cols_with_missing)} columns")
        else:
            insights.append("• No missing data detected")
        
        return "<br>".join(insights)
    
    def _generate_summary_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate summary statistics"""
        stats = {}
        
        numeric_df = df.select_dtypes(include=['number'])
        if not numeric_df.empty:
            stats['total_records'] = len(df)
            stats['numeric_columns'] = len(numeric_df.columns)
            stats['avg_values'] = numeric_df.mean().mean()
            stats['data_completeness'] = ((df.count().sum() / (len(df) * len(df.columns))) * 100)
        else:
            stats['total_records'] = len(df)
            stats['numeric_columns'] = 0
            stats['avg_values'] = 0
            stats['data_completeness'] = 100
        
        return stats
    
    def _generate_metric_cards(self, stats: Dict[str, Any]) -> str:
        """Generate HTML for metric cards"""
        cards_html = []
        
        metrics = [
            ('total_records', 'Total Records', ':,'),
            ('numeric_columns', 'Numeric Columns', ''),
            ('avg_values', 'Average Value', ':.2f'),
            ('data_completeness', 'Data Completeness', ':.1f%')
        ]
        
        for key, label, format_spec in metrics:
            if key in stats:
                if format_spec:
                    value = f"{stats[key]:{format_spec}}"
                else:
                    value = str(stats[key])
                
                cards_html.append(f"""
                <div class="metric-card">
                    <div class="value">{value}</div>
                    <div class="label">{label}</div>
                </div>
                """)
        
        return "\n".join(cards_html)
    
    def _generate_data_preview(self, df: pd.DataFrame, max_rows: int = 10) -> str:
        """Generate HTML table preview of data"""
        if df.empty:
            return "<p>No data to display.</p>"
        
        # Limit rows and handle large datasets
        preview_df = df.head(max_rows)
        
        # Convert to HTML table
        table_html = preview_df.to_html(
            classes='data-table',
            table_id='data-preview',
            escape=False,
            index=False
        )
        
        if len(df) > max_rows:
            table_html += f"<p><em>Showing first {max_rows} of {len(df):,} total records</em></p>"
        
        return table_html
    
    def _generate_chart_section(self, df: pd.DataFrame) -> str:
        """Generate charts section for report"""
        if df.empty:
            return ""
        
        charts_html = ['<div class="section"><h2>📊 Visual Analysis</h2>']
        
        # Generate a few key charts
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        # Chart 1: Distribution of first numeric column
        if numeric_cols:
            try:
                fig = px.histogram(df, x=numeric_cols[0], title=f'Distribution of {numeric_cols[0]}')
                chart_html = fig.to_html(include_plotlyjs='cdn', div_id='chart1')
                charts_html.append(f'<div class="chart-container">{chart_html}</div>')
            except:
                pass
        
        # Chart 2: Bar chart of first categorical column
        if categorical_cols and numeric_cols:
            try:
                # Aggregate data for better visualization
                agg_df = df.groupby(categorical_cols[0])[numeric_cols[0]].sum().reset_index()
                fig = px.bar(agg_df, x=categorical_cols[0], y=numeric_cols[0], 
                           title=f'{numeric_cols[0]} by {categorical_cols[0]}')
                chart_html = fig.to_html(include_plotlyjs='cdn', div_id='chart2')
                charts_html.append(f'<div class="chart-container">{chart_html}</div>')
            except:
                pass
        
        charts_html.append('</div>')
        return "\n".join(charts_html)
    
    def _generate_comprehensive_charts(self, df: pd.DataFrame) -> str:
        """Generate comprehensive charts for detailed analysis"""
        if df.empty:
            return ""
        
        charts_html = ['<div class="section"><h2>📈 Comprehensive Visual Analysis</h2>']
        
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        chart_counter = 1
        
        # Multiple chart types
        chart_configs = [
            ('histogram', 'Distribution Analysis'),
            ('bar', 'Category Comparison'),
            ('scatter', 'Correlation Analysis'),
            ('box', 'Statistical Distribution')
        ]
        
        for chart_type, section_title in chart_configs:
            try:
                if chart_type == 'histogram' and numeric_cols:
                    fig = px.histogram(df, x=numeric_cols[0], title=f'{section_title}: {numeric_cols[0]}')
                elif chart_type == 'bar' and categorical_cols and numeric_cols:
                    agg_df = df.groupby(categorical_cols[0])[numeric_cols[0]].sum().reset_index()
                    fig = px.bar(agg_df, x=categorical_cols[0], y=numeric_cols[0], title=section_title)
                elif chart_type == 'scatter' and len(numeric_cols) >= 2:
                    fig = px.scatter(df, x=numeric_cols[0], y=numeric_cols[1], title=section_title)
                elif chart_type == 'box' and numeric_cols:
                    fig = px.box(df, y=numeric_cols[0], title=f'{section_title}: {numeric_cols[0]}')
                else:
                    continue
                
                chart_html = fig.to_html(include_plotlyjs='cdn', div_id=f'chart{chart_counter}')
                charts_html.append(f'<div class="chart-container">{chart_html}</div>')
                chart_counter += 1
                
            except Exception as e:
                logger.warning(f"Failed to generate {chart_type} chart: {str(e)}")
                continue
        
        charts_html.append('</div>')
        return "\n".join(charts_html)
    
    def _generate_recommendations(self, df: pd.DataFrame) -> str:
        """Generate automated recommendations"""
        recommendations = []
        
        if df.empty:
            return "<p>No recommendations available for empty dataset.</p>"
        
        # Data quality recommendations
        missing_data = df.isnull().sum()
        if missing_data.sum() > 0:
            recommendations.append({
                'title': 'Data Quality Improvement',
                'content': f'Consider addressing missing data in {(missing_data > 0).sum()} columns to improve analysis accuracy.'
            })
        
        # Performance recommendations
        if len(df) > 10000:
            recommendations.append({
                'title': 'Performance Optimization',
                'content': 'Large dataset detected. Consider using data sampling or aggregation for faster analysis.'
            })
        
        # Analysis recommendations
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) >= 2:
            recommendations.append({
                'title': 'Advanced Analysis',
                'content': 'Multiple numeric columns detected. Consider correlation analysis and predictive modeling.'
            })
        
        # Default recommendation
        if not recommendations:
            recommendations.append({
                'title': 'Data Exploration',
                'content': 'Explore different visualization types and statistical analyses to uncover hidden patterns.'
            })
        
        rec_html = []
        for rec in recommendations:
            rec_html.append(f"""
            <div class="recommendation">
                <h5>{rec['title']}</h5>
                <p>{rec['content']}</p>
            </div>
            """)
        
        return "\n".join(rec_html)
    
    def _generate_detailed_statistics(self, df: pd.DataFrame) -> str:
        """Generate detailed statistics section"""
        if df.empty:
            return ""
        
        stats_html = ['<div class="section"><h2>📊 Detailed Statistics</h2>']
        
        # Numeric statistics
        numeric_df = df.select_dtypes(include=['number'])
        if not numeric_df.empty:
            stats_html.append('<h3>Numeric Columns Analysis</h3>')
            desc_stats = numeric_df.describe()
            stats_table = desc_stats.to_html(classes='data-table')
            stats_html.append(stats_table)
        
        # Categorical statistics
        categorical_df = df.select_dtypes(include=['object'])
        if not categorical_df.empty:
            stats_html.append('<h3>Categorical Columns Analysis</h3>')
            cat_stats = []
            for col in categorical_df.columns:
                unique_count = categorical_df[col].nunique()
                most_common = categorical_df[col].mode().iloc[0] if not categorical_df[col].mode().empty else "N/A"
                cat_stats.append({
                    'Column': col,
                    'Unique Values': unique_count,
                    'Most Common': most_common,
                    'Missing': categorical_df[col].isnull().sum()
                })
            
            cat_df = pd.DataFrame(cat_stats)
            cat_table = cat_df.to_html(classes='data-table', index=False)
            stats_html.append(cat_table)
        
        stats_html.append('</div>')
        return "\n".join(stats_html)
    
    def _generate_dataset_overview(self, df: pd.DataFrame) -> str:
        """Generate dataset overview section"""
        overview_html = []
        
        # Column types breakdown
        dtype_counts = df.dtypes.value_counts()
        overview_html.append('<h3>Column Types</h3>')
        overview_html.append('<div class="summary-stats">')
        
        for dtype, count in dtype_counts.items():
            overview_html.append(f"""
            <div class="stat-item">
                <div class="number">{count}</div>
                <div class="description">{str(dtype)} columns</div>
            </div>
            """)
        
        overview_html.append('</div>')
        
        return "\n".join(overview_html)
    
    def _generate_data_quality_section(self, df: pd.DataFrame) -> str:
        """Generate data quality assessment"""
        quality_html = []
        
        # Missing data analysis
        missing_data = df.isnull().sum()
        total_cells = len(df) * len(df.columns)
        missing_percentage = (missing_data.sum() / total_cells) * 100
        
        quality_html.append(f"""
        <div class="insights-box">
            <h4>Data Completeness</h4>
            <p>Overall data completeness: {100 - missing_percentage:.1f}%</p>
            <p>Missing values: {missing_data.sum():,} out of {total_cells:,} total cells</p>
        </div>
        """)
        
        # Columns with missing data
        if missing_data.sum() > 0:
            missing_cols = missing_data[missing_data > 0]
            quality_html.append('<h3>Columns with Missing Data</h3>')
            missing_df = pd.DataFrame({
                'Column': missing_cols.index,
                'Missing Count': missing_cols.values,
                'Missing %': (missing_cols.values / len(df) * 100).round(2)
            })
            quality_html.append(missing_df.to_html(classes='data-table', index=False))
        
        return "\n".join(quality_html)
    
    def _error_report(self, error_message: str) -> str:
        """Generate error report"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Report Generation Error</title>
            {self.css_styles}
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1 style="color: #dc3545;">Report Generation Error</h1>
                </div>
                <div class="section">
                    <p>An error occurred while generating the report:</p>
                    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px;">{error_message}</pre>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _get_date_range(self, df: pd.DataFrame) -> str:
        """Get date range from dataframe"""
        date_cols = df.select_dtypes(include=['datetime64']).columns
        if date_cols.empty:
            return "No date columns detected"
        
        try:
            first_date_col = date_cols[0]
            min_date = df[first_date_col].min()
            max_date = df[first_date_col].max()
            return f"{min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}"
        except:
            return "Date range unavailable"
    
    def _generate_trend_analysis(self, df: pd.DataFrame, date_col: str) -> str:
        """Generate trend analysis content"""
        try:
            # Basic trend analysis
            df_sorted = df.sort_values(date_col)
            date_range = self._get_date_range(df)
            
            analysis_html = f"""
            <div class="insights-box">
                <h4>Temporal Analysis Results</h4>
                <p>• Analysis period: {date_range}</p>
                <p>• Total data points: {len(df):,}</p>
                <p>• Time span: {(df[date_col].max() - df[date_col].min()).days} days</p>
            </div>
            """
            
            return analysis_html
            
        except Exception as e:
            return f"<p>Trend analysis error: {str(e)}</p>"
    
    def _generate_trend_charts(self, df: pd.DataFrame) -> str:
        """Generate trend-specific charts"""
        return self._generate_chart_section(df)  # Reuse chart generation
    
    def _generate_period_summary(self, df: pd.DataFrame) -> str:
        """Generate period summary"""
        date_cols = df.select_dtypes(include=['datetime64']).columns
        if date_cols.empty:
            return "<p>No date columns available for period analysis.</p>"
        
        # Basic period statistics
        summary_html = """
        <div class="summary-stats">
            <div class="stat-item">
                <div class="number">{}</div>
                <div class="description">Total Records</div>
            </div>
        </div>
        """.format(len(df))
        
        return summary_html