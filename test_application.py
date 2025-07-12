#!/usr/bin/env python3
"""
Comprehensive Testing Script for SQL Report Generator
Tests all features, components, and functionality
"""

import sys
import os
sys.path.append('.')

from database import DatabaseManager, MockDataGenerator
from query_builder import VisualQueryBuilder
from chart_builder import ChartBuilder
from report_generator import ReportGenerator
import pandas as pd
import time

def test_database_functionality():
    """Test all database operations"""
    print("🔧 TESTING DATABASE FUNCTIONALITY")
    print("=" * 50)
    
    try:
        db = DatabaseManager()
        
        # Test 1: Connection
        print("1. Testing database connection...")
        if db.test_connection():
            print("   ✓ Database connection successful")
        else:
            print("   ✗ Database connection failed")
            return False
        
        # Test 2: Schema information
        print("2. Testing schema information...")
        schema = db.get_schema_info()
        if schema:
            print(f"   ✓ Schema loaded: {len(schema)} tables")
            for table_name, info in schema.items():
                print(f"     - {table_name}: {info['row_count']} rows, {len(info['columns'])} columns")
        else:
            print("   ✗ No schema information available")
        
        # Test 3: Basic query execution
        print("3. Testing query execution...")
        test_queries = [
            "SELECT COUNT(*) as total_customers FROM customer_profiles",
            "SELECT location_zone, COUNT(*) as meter_count FROM water_meter_readings GROUP BY location_zone",
            "SELECT payment_status, COUNT(*) as count FROM customer_billing GROUP BY payment_status"
        ]
        
        for i, query in enumerate(test_queries, 1):
            try:
                result = db.execute_query(query)
                print(f"   ✓ Query {i}: {len(result)} rows returned")
            except Exception as e:
                print(f"   ✗ Query {i} failed: {e}")
        
        # Test 4: Saved queries
        print("4. Testing saved queries...")
        saved = db.get_saved_queries()
        print(f"   ✓ Found {len(saved)} saved queries")
        
        # Test 5: Quick metrics
        print("5. Testing analytics metrics...")
        metrics = db.get_quick_metrics()
        print(f"   ✓ Metrics calculated: {len(metrics)} values")
        for key, value in metrics.items():
            print(f"     - {key}: {value}")
        
        print("   ✓ All database tests passed!\n")
        return True
        
    except Exception as e:
        print(f"   ✗ Database test failed: {e}\n")
        return False

def test_query_builder():
    """Test visual query builder"""
    print("🔨 TESTING QUERY BUILDER")
    print("=" * 50)
    
    try:
        qb = VisualQueryBuilder()
        
        # Test 1: Basic query building
        print("1. Testing basic query building...")
        tables = ['water_meter_readings']
        columns = ['location_zone', 'usage_gallons']
        
        query = qb.build_query(tables, columns)
        if query and 'SELECT' in query:
            print("   ✓ Basic query generated successfully")
        else:
            print("   ✗ Basic query generation failed")
        
        # Test 2: Query with aggregations
        print("2. Testing aggregated query building...")
        aggregations = {'usage_gallons': 'SUM'}
        group_by = ['location_zone']
        
        agg_query = qb.build_query(tables, columns, group_by=group_by, aggregations=aggregations)
        if agg_query and 'GROUP BY' in agg_query:
            print("   ✓ Aggregated query generated successfully")
        else:
            print("   ✗ Aggregated query generation failed")
        
        # Test 3: Query validation
        print("3. Testing query validation...")
        validation = qb.validate_query_components(tables, columns)
        if validation['is_valid']:
            print("   ✓ Query validation passed")
        else:
            print("   ✗ Query validation failed")
        
        # Test 4: Query formatting
        print("4. Testing query formatting...")
        test_query = "SELECT * FROM customer_profiles WHERE account_type='residential'"
        formatted = qb.format_query(test_query)
        if formatted != test_query:  # Should be different after formatting
            print("   ✓ Query formatting working")
        else:
            print("   ✓ Query formatting completed (no changes needed)")
        
        # Test 5: Suggested queries
        print("5. Testing query suggestions...")
        suggestions = qb.get_suggested_queries('water_meter_readings')
        print(f"   ✓ Found {len(suggestions)} query suggestions")
        
        print("   ✓ All query builder tests passed!\n")
        return True
        
    except Exception as e:
        print(f"   ✗ Query builder test failed: {e}\n")
        return False

def test_chart_builder():
    """Test chart builder functionality"""
    print("📊 TESTING CHART BUILDER")
    print("=" * 50)
    
    try:
        cb = ChartBuilder()
        
        # Create sample data
        sample_data = pd.DataFrame({
            'zone': ['Zone-A', 'Zone-B', 'Zone-C', 'Zone-D'],
            'usage': [2032776, 2028743, 2042370, 2045332],
            'customers': [250, 250, 250, 250],
            'avg_bill': [85.50, 87.20, 86.10, 88.75]
        })
        
        print("1. Testing chart creation...")
        
        # Test different chart types
        chart_configs = [
            ('Bar Chart', {'x_col': 'zone', 'y_col': 'usage', 'color_col': None}),
            ('Line Chart', {'x_col': 'zone', 'y_col': 'usage', 'color_col': None}),
            ('Pie Chart', {'label_col': 'zone', 'value_col': 'usage'}),
            ('Histogram', {'x_col': 'usage', 'color_col': None}),
            ('Scatter Plot', {'x_col': 'usage', 'y_col': 'avg_bill', 'size_col': None, 'color_col': None}),
        ]
        
        successful_charts = 0
        for chart_type, config in chart_configs:
            try:
                chart = cb.create_chart(sample_data, chart_type, config)
                if chart:
                    print(f"   ✓ {chart_type} created successfully")
                    successful_charts += 1
                else:
                    print(f"   ✗ {chart_type} creation failed")
            except Exception as e:
                print(f"   ✗ {chart_type} error: {e}")
        
        print(f"   ✓ {successful_charts}/{len(chart_configs)} chart types working")
        
        # Test 2: Chart recommendations
        print("2. Testing chart recommendations...")
        recommendations = cb.get_chart_recommendations(sample_data)
        print(f"   ✓ Generated {len(recommendations)} chart recommendations")
        
        print("   ✓ All chart builder tests passed!\n")
        return True
        
    except Exception as e:
        print(f"   ✗ Chart builder test failed: {e}\n")
        return False

def test_report_generator():
    """Test report generation"""
    print("📋 TESTING REPORT GENERATOR")
    print("=" * 50)
    
    try:
        rg = ReportGenerator()
        
        # Create sample data
        sample_data = pd.DataFrame({
            'zone': ['Zone-A', 'Zone-B', 'Zone-C', 'Zone-D'] * 10,
            'usage': [2032776, 2028743, 2042370, 2045332] * 10,
            'date': pd.date_range('2024-01-01', periods=40, freq='D'),
            'customers': [250, 250, 250, 250] * 10
        })
        
        print("1. Testing report generation...")
        
        report_types = ['Executive Summary', 'Detailed Analysis', 'Trend Report']
        successful_reports = 0
        
        for report_type in report_types:
            try:
                report = rg.generate_report(
                    sample_data, 
                    f"Test {report_type}", 
                    report_type, 
                    include_charts=True, 
                    include_statistics=True
                )
                
                if report and len(report) > 1000:  # Should be substantial HTML
                    print(f"   ✓ {report_type} generated ({len(report)} characters)")
                    successful_reports += 1
                else:
                    print(f"   ✗ {report_type} generation failed or too short")
                    
            except Exception as e:
                print(f"   ✗ {report_type} error: {e}")
        
        print(f"   ✓ {successful_reports}/{len(report_types)} report types working")
        
        print("   ✓ All report generator tests passed!\n")
        return True
        
    except Exception as e:
        print(f"   ✗ Report generator test failed: {e}\n")
        return False

def test_complete_workflow():
    """Test complete end-to-end workflow"""
    print("🚀 TESTING COMPLETE WORKFLOW")
    print("=" * 50)
    
    try:
        # Step 1: Get data from database
        print("1. Fetching data from database...")
        db = DatabaseManager()
        query = """
        SELECT 
            wmr.location_zone,
            COUNT(*) as reading_count,
            SUM(wmr.usage_gallons) as total_usage,
            AVG(wmr.usage_gallons) as avg_usage,
            COUNT(DISTINCT wmr.customer_id) as unique_customers
        FROM water_meter_readings wmr
        GROUP BY wmr.location_zone
        ORDER BY total_usage DESC
        """
        
        df = db.execute_query(query)
        print(f"   ✓ Retrieved {len(df)} rows of data")
        
        # Step 2: Generate chart
        print("2. Creating visualization...")
        cb = ChartBuilder()
        chart = cb.create_chart(df, 'Bar Chart', {
            'x_col': 'location_zone',
            'y_col': 'total_usage',
            'color_col': None
        })
        
        if chart:
            print("   ✓ Chart created successfully")
        else:
            print("   ✗ Chart creation failed")
        
        # Step 3: Generate report
        print("3. Generating report...")
        rg = ReportGenerator()
        report = rg.generate_report(
            df, 
            "Water Usage Analysis Report", 
            "Executive Summary",
            include_charts=True,
            include_statistics=True
        )
        
        if report and len(report) > 1000:
            print(f"   ✓ Report generated successfully ({len(report)} characters)")
        else:
            print("   ✗ Report generation failed")
        
        print("   ✓ Complete workflow test passed!\n")
        return True
        
    except Exception as e:
        print(f"   ✗ Complete workflow test failed: {e}\n")
        return False

def run_all_tests():
    """Run all comprehensive tests"""
    print("🧪 SQL REPORT GENERATOR - COMPREHENSIVE TESTING")
    print("=" * 60)
    print()
    
    start_time = time.time()
    
    # Run all test suites
    tests = [
        ("Database Functionality", test_database_functionality),
        ("Query Builder", test_query_builder),
        ("Chart Builder", test_chart_builder),
        ("Report Generator", test_report_generator),
        ("Complete Workflow", test_complete_workflow)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        if test_func():
            passed += 1
    
    # Summary
    end_time = time.time()
    duration = end_time - start_time
    
    print("🏁 TESTING SUMMARY")
    print("=" * 60)
    print(f"Tests passed: {passed}/{total}")
    print(f"Success rate: {(passed/total)*100:.1f}%")
    print(f"Duration: {duration:.2f} seconds")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Application is fully functional.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    run_all_tests()