"""
Visual Query Builder for SQL Report Generator
Provides drag-and-drop query building functionality
"""

from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class VisualQueryBuilder:
    """Builds SQL queries from visual components"""
    
    def __init__(self):
        self.query_templates = {
            'basic_select': "SELECT {columns} FROM {table}",
            'select_with_where': "SELECT {columns} FROM {table} WHERE {conditions}",
            'select_with_group': "SELECT {columns} FROM {table} GROUP BY {group_by}",
            'select_with_order': "SELECT {columns} FROM {table} ORDER BY {order_by}",
            'complex_query': "SELECT {columns} FROM {table} WHERE {conditions} GROUP BY {group_by} ORDER BY {order_by}"
        }
    
    def build_query(self, tables: List[str], columns: List[str], 
                   group_by: List[str] = None, aggregations: Dict[str, str] = None,
                   filters: List[Dict] = None, order_by: List[str] = None) -> str:
        """Build SQL query from components"""
        try:
            # Build SELECT clause
            select_columns = self._build_select_columns(columns, aggregations)
            
            # Build FROM clause
            from_clause = self._build_from_clause(tables)
            
            # Build WHERE clause
            where_clause = self._build_where_clause(filters) if filters else ""
            
            # Build GROUP BY clause
            group_clause = self._build_group_by_clause(group_by) if group_by else ""
            
            # Build ORDER BY clause
            order_clause = self._build_order_by_clause(order_by, aggregations) if order_by else ""
            
            # Assemble final query
            query_parts = [f"SELECT {select_columns}", f"FROM {from_clause}"]
            
            if where_clause:
                query_parts.append(where_clause)
            
            if group_clause:
                query_parts.append(group_clause)
            
            if order_clause:
                query_parts.append(order_clause)
            
            final_query = "\n".join(query_parts)
            
            logger.info("Query built successfully")
            return final_query
            
        except Exception as e:
            logger.error(f"Failed to build query: {str(e)}")
            raise
    
    def _build_select_columns(self, columns: List[str], aggregations: Dict[str, str] = None) -> str:
        """Build SELECT column list with aggregations"""
        select_items = []
        
        for column in columns:
            if aggregations and column in aggregations:
                agg_func = aggregations[column]
                col_name = column.split('.')[-1]  # Get column name without table prefix
                select_items.append(f"{agg_func}({column}) AS {agg_func.lower()}_{col_name}")
            else:
                select_items.append(column)
        
        return ",\n    ".join(select_items)
    
    def _build_from_clause(self, tables: List[str]) -> str:
        """Build FROM clause with joins if multiple tables"""
        if len(tables) == 1:
            return tables[0]
        
        # For simplicity, assume first table is main table
        # In a real implementation, you'd analyze relationships
        main_table = tables[0]
        joins = []
        
        for table in tables[1:]:
            # Basic join logic - would need to be enhanced based on schema relationships
            if 'customer' in table and 'customer' in main_table:
                joins.append(f"JOIN {table} ON {main_table}.customer_id = {table}.customer_id")
            else:
                joins.append(f"JOIN {table} ON {main_table}.id = {table}.id")  # Generic join
        
        return main_table + "\n" + "\n".join(joins)
    
    def _build_where_clause(self, filters: List[Dict]) -> str:
        """Build WHERE clause from filter conditions"""
        if not filters:
            return ""
        
        conditions = []
        for filter_item in filters:
            column = filter_item.get('column')
            operator = filter_item.get('operator', '=')
            value = filter_item.get('value')
            
            if column and value is not None:
                if isinstance(value, str) and operator in ['=', '!=', 'LIKE']:
                    conditions.append(f"{column} {operator} '{value}'")
                else:
                    conditions.append(f"{column} {operator} {value}")
        
        return f"WHERE {' AND '.join(conditions)}" if conditions else ""
    
    def _build_group_by_clause(self, group_by: List[str]) -> str:
        """Build GROUP BY clause"""
        if not group_by:
            return ""
        
        return f"GROUP BY {', '.join(group_by)}"
    
    def _build_order_by_clause(self, order_by: List[str], aggregations: Dict[str, str] = None) -> str:
        """Build ORDER BY clause"""
        if not order_by:
            return ""
        
        order_items = []
        for item in order_by:
            if aggregations and item in aggregations:
                agg_func = aggregations[item]
                col_name = item.split('.')[-1]
                order_items.append(f"{agg_func.lower()}_{col_name} DESC")
            else:
                order_items.append(f"{item} ASC")
        
        return f"ORDER BY {', '.join(order_items)}"
    
    def get_suggested_queries(self, table_name: str) -> List[Dict[str, str]]:
        """Get suggested queries for a specific table"""
        suggestions = {
            'water_meter_readings': [
                {
                    'name': 'Daily Usage Summary',
                    'description': 'Daily water usage totals',
                    'query': """SELECT 
    reading_date::date as date,
    SUM(usage_gallons) as total_usage,
    AVG(usage_gallons) as avg_usage,
    COUNT(*) as reading_count
FROM water_meter_readings
WHERE reading_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY reading_date::date
ORDER BY date DESC"""
                },
                {
                    'name': 'Zone Performance',
                    'description': 'Usage analysis by zone',
                    'query': """SELECT 
    location_zone,
    SUM(usage_gallons) as total_usage,
    AVG(usage_gallons) as avg_usage,
    COUNT(DISTINCT meter_id) as meter_count
FROM water_meter_readings
WHERE reading_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY location_zone
ORDER BY total_usage DESC"""
                }
            ],
            'customer_billing': [
                {
                    'name': 'Revenue Analysis',
                    'description': 'Monthly revenue breakdown',
                    'query': """SELECT 
    DATE_TRUNC('month', billing_period_start) as month,
    SUM(total_amount) as revenue,
    COUNT(*) as bill_count,
    AVG(total_amount) as avg_bill
FROM customer_billing
GROUP BY DATE_TRUNC('month', billing_period_start)
ORDER BY month DESC"""
                },
                {
                    'name': 'Payment Status Report',
                    'description': 'Analysis of payment statuses',
                    'query': """SELECT 
    payment_status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    AVG(total_amount) as avg_amount
FROM customer_billing
WHERE billing_period_start >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY payment_status
ORDER BY total_amount DESC"""
                }
            ],
            'customer_profiles': [
                {
                    'name': 'Customer Distribution',
                    'description': 'Customer breakdown by type and location',
                    'query': """SELECT 
    account_type,
    state,
    COUNT(*) as customer_count,
    COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM customer_profiles
GROUP BY account_type, state
ORDER BY customer_count DESC"""
                }
            ]
        }
        
        return suggestions.get(table_name, [])
    
    def validate_query_components(self, tables: List[str], columns: List[str]) -> Dict[str, Any]:
        """Validate query components"""
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Check if tables are selected
        if not tables:
            validation_result['is_valid'] = False
            validation_result['errors'].append("At least one table must be selected")
        
        # Check if columns are selected
        if not columns:
            validation_result['is_valid'] = False
            validation_result['errors'].append("At least one column must be selected")
        
        # Check column-table consistency
        for column in columns:
            if '.' in column:
                table_name = column.split('.')[0]
                if table_name not in tables:
                    validation_result['warnings'].append(f"Column {column} references table {table_name} which is not selected")
        
        return validation_result
    
    def format_query(self, query: str) -> str:
        """Format SQL query for better readability"""
        try:
            # Basic formatting rules
            formatted = query.strip()
            
            # Keywords that should start new lines
            keywords = [
                'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
                'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'UNION'
            ]
            
            # Replace keywords with newline + keyword
            for keyword in keywords:
                formatted = formatted.replace(f' {keyword} ', f'\n{keyword} ')
                formatted = formatted.replace(f'\t{keyword} ', f'\n{keyword} ')
            
            # Clean up extra whitespace and split into lines
            lines = []
            for line in formatted.split('\n'):
                line = line.strip()
                if line:
                    # Indent non-keyword lines
                    if not any(line.startswith(kw) for kw in keywords):
                        line = '    ' + line
                    lines.append(line)
            
            return '\n'.join(lines)
            
        except Exception as e:
            logger.error(f"Failed to format query: {str(e)}")
            return query  # Return original if formatting fails
    
    def get_query_explanation(self, query: str) -> str:
        """Generate explanation for a SQL query"""
        try:
            explanation_parts = []
            query_lower = query.lower()
            
            # Analyze SELECT clause
            if 'select' in query_lower:
                if 'sum(' in query_lower or 'count(' in query_lower or 'avg(' in query_lower:
                    explanation_parts.append("This query performs aggregation calculations")
                if 'distinct' in query_lower:
                    explanation_parts.append("Returns only unique values")
            
            # Analyze FROM clause
            if 'join' in query_lower:
                explanation_parts.append("Combines data from multiple tables")
            
            # Analyze WHERE clause
            if 'where' in query_lower:
                explanation_parts.append("Filters data based on specific conditions")
            
            # Analyze GROUP BY clause
            if 'group by' in query_lower:
                explanation_parts.append("Groups results for aggregation")
            
            # Analyze ORDER BY clause
            if 'order by' in query_lower:
                if 'desc' in query_lower:
                    explanation_parts.append("Results sorted in descending order")
                else:
                    explanation_parts.append("Results sorted in ascending order")
            
            if not explanation_parts:
                explanation_parts.append("Basic data selection query")
            
            return ". ".join(explanation_parts) + "."
            
        except Exception as e:
            logger.error(f"Failed to generate query explanation: {str(e)}")
            return "Query explanation not available"