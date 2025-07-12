"""
Chart Builder for SQL Report Generator
Creates interactive charts and visualizations using Plotly
"""

import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ChartBuilder:
    """Creates interactive charts from DataFrame data"""
    
    def __init__(self):
        self.color_palettes = {
            'default': px.colors.qualitative.Set3,
            'professional': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'],
            'corporate': ['#003f5c', '#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a'],
            'water_theme': ['#0077be', '#00a8cc', '#7fb069', '#4a90a4', '#2e5984', '#1e3a5f']
        }
        
        self.chart_themes = {
            'professional': {
                'paper_bgcolor': 'white',
                'plot_bgcolor': 'white',
                'font': {'family': 'Arial, sans-serif', 'size': 12, 'color': '#2e2e2e'},
                'title': {'font': {'size': 16, 'color': '#1e1e1e'}},
                'xaxis': {'gridcolor': '#e6e6e6', 'linecolor': '#d1d1d1'},
                'yaxis': {'gridcolor': '#e6e6e6', 'linecolor': '#d1d1d1'}
            }
        }
    
    def create_chart(self, df: pd.DataFrame, chart_type: str, config: Dict[str, Any]) -> Optional[go.Figure]:
        """Create chart based on type and configuration"""
        try:
            if df.empty:
                return None
            
            chart_methods = {
                'Bar Chart': self._create_bar_chart,
                'Line Chart': self._create_line_chart,
                'Scatter Plot': self._create_scatter_plot,
                'Pie Chart': self._create_pie_chart,
                'Histogram': self._create_histogram,
                'Box Plot': self._create_box_plot,
                'Heatmap': self._create_heatmap,
                'Area Chart': self._create_area_chart,
                'Treemap': self._create_treemap
            }
            
            if chart_type not in chart_methods:
                logger.warning(f"Unsupported chart type: {chart_type}")
                return None
            
            chart = chart_methods[chart_type](df, config)
            
            if chart:
                # Apply professional theme
                chart.update_layout(self.chart_themes['professional'])
                chart.update_layout(
                    height=500,
                    margin=dict(l=50, r=50, t=80, b=50),
                    showlegend=True
                )
            
            return chart
            
        except Exception as e:
            logger.error(f"Failed to create {chart_type}: {str(e)}")
            return None
    
    def _create_bar_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create bar chart"""
        x_col = config.get('x_col')
        y_col = config.get('y_col')
        color_col = config.get('color_col')
        
        if not x_col or not y_col:
            raise ValueError("Bar chart requires x and y columns")
        
        color = color_col if color_col and color_col != "None" else None
        
        fig = px.bar(
            df, 
            x=x_col, 
            y=y_col, 
            color=color,
            title=f'{y_col} by {x_col}',
            color_discrete_sequence=self.color_palettes['water_theme']
        )
        
        # Customize layout
        fig.update_layout(
            xaxis_title=x_col.replace('_', ' ').title(),
            yaxis_title=y_col.replace('_', ' ').title(),
            xaxis_tickangle=-45 if len(df[x_col].unique()) > 5 else 0
        )
        
        return fig
    
    def _create_line_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create line chart"""
        x_col = config.get('x_col')
        y_col = config.get('y_col')
        color_col = config.get('color_col')
        
        if not x_col or not y_col:
            raise ValueError("Line chart requires x and y columns")
        
        color = color_col if color_col and color_col != "None" else None
        
        # Sort by x column for proper line connection
        df_sorted = df.sort_values(x_col)
        
        fig = px.line(
            df_sorted, 
            x=x_col, 
            y=y_col, 
            color=color,
            title=f'{y_col} Trend over {x_col}',
            color_discrete_sequence=self.color_palettes['water_theme']
        )
        
        # Add markers
        fig.update_traces(mode='lines+markers', marker=dict(size=6))
        
        fig.update_layout(
            xaxis_title=x_col.replace('_', ' ').title(),
            yaxis_title=y_col.replace('_', ' ').title()
        )
        
        return fig
    
    def _create_scatter_plot(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create scatter plot"""
        x_col = config.get('x_col')
        y_col = config.get('y_col')
        size_col = config.get('size_col')
        color_col = config.get('color_col')
        
        if not x_col or not y_col:
            raise ValueError("Scatter plot requires x and y columns")
        
        size = size_col if size_col and size_col != "None" else None
        color = color_col if color_col and color_col != "None" else None
        
        fig = px.scatter(
            df, 
            x=x_col, 
            y=y_col, 
            size=size,
            color=color,
            title=f'{y_col} vs {x_col}',
            color_discrete_sequence=self.color_palettes['water_theme']
        )
        
        # Add trendline
        fig.add_scatter(
            x=df[x_col], 
            y=np.poly1d(np.polyfit(df[x_col], df[y_col], 1))(df[x_col]),
            mode='lines',
            name='Trend',
            line=dict(dash='dash', color='red', width=2)
        )
        
        fig.update_layout(
            xaxis_title=x_col.replace('_', ' ').title(),
            yaxis_title=y_col.replace('_', ' ').title()
        )
        
        return fig
    
    def _create_pie_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create pie chart"""
        label_col = config.get('label_col')
        value_col = config.get('value_col')
        
        if not label_col or not value_col:
            raise ValueError("Pie chart requires label and value columns")
        
        # Aggregate values by label in case of duplicates
        pie_data = df.groupby(label_col)[value_col].sum().reset_index()
        
        fig = px.pie(
            pie_data, 
            values=value_col, 
            names=label_col,
            title=f'Distribution of {value_col} by {label_col}',
            color_discrete_sequence=self.color_palettes['water_theme']
        )
        
        fig.update_traces(
            textposition='inside', 
            textinfo='percent+label',
            hovertemplate='<b>%{label}</b><br>Value: %{value}<br>Percentage: %{percent}<extra></extra>'
        )
        
        return fig
    
    def _create_histogram(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create histogram"""
        x_col = config.get('x_col')
        color_col = config.get('color_col')
        
        if not x_col:
            raise ValueError("Histogram requires x column")
        
        color = color_col if color_col and color_col != "None" else None
        
        fig = px.histogram(
            df, 
            x=x_col, 
            color=color,
            title=f'Distribution of {x_col}',
            nbins=30,
            color_discrete_sequence=self.color_palettes['water_theme']
        )
        
        # Add statistics
        mean_val = df[x_col].mean()
        median_val = df[x_col].median()
        
        fig.add_vline(
            x=mean_val, 
            line_dash="dash", 
            line_color="red",
            annotation_text=f"Mean: {mean_val:.2f}"
        )
        
        fig.add_vline(
            x=median_val, 
            line_dash="dot", 
            line_color="blue",
            annotation_text=f"Median: {median_val:.2f}"
        )
        
        fig.update_layout(
            xaxis_title=x_col.replace('_', ' ').title(),
            yaxis_title='Frequency'
        )
        
        return fig
    
    def _create_box_plot(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create box plot"""
        x_col = config.get('x_col')
        color_col = config.get('color_col')
        
        if not x_col:
            raise ValueError("Box plot requires x column")
        
        if color_col and color_col != "None":
            fig = px.box(
                df, 
                y=x_col, 
                x=color_col,
                title=f'Distribution of {x_col} by {color_col}',
                color=color_col,
                color_discrete_sequence=self.color_palettes['water_theme']
            )
        else:
            fig = px.box(
                df, 
                y=x_col,
                title=f'Distribution of {x_col}',
                color_discrete_sequence=self.color_palettes['water_theme']
            )
        
        fig.update_layout(
            yaxis_title=x_col.replace('_', ' ').title()
        )
        
        return fig
    
    def _create_heatmap(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create heatmap for correlation analysis"""
        # Select only numeric columns
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            raise ValueError("Heatmap requires numeric data")
        
        # Calculate correlation matrix
        corr_matrix = numeric_df.corr()
        
        fig = px.imshow(
            corr_matrix,
            title='Correlation Heatmap',
            color_continuous_scale='RdBu',
            aspect='auto'
        )
        
        fig.update_layout(
            xaxis_title='Variables',
            yaxis_title='Variables'
        )
        
        return fig
    
    def _create_area_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create area chart"""
        x_col = config.get('x_col')
        y_col = config.get('y_col')
        color_col = config.get('color_col')
        
        if not x_col or not y_col:
            raise ValueError("Area chart requires x and y columns")
        
        # Sort by x column
        df_sorted = df.sort_values(x_col)
        
        if color_col and color_col != "None":
            fig = px.area(
                df_sorted, 
                x=x_col, 
                y=y_col, 
                color=color_col,
                title=f'{y_col} Area over {x_col}',
                color_discrete_sequence=self.color_palettes['water_theme']
            )
        else:
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=df_sorted[x_col],
                y=df_sorted[y_col],
                fill='tonexty',
                mode='lines',
                name=y_col,
                line=dict(color=self.color_palettes['water_theme'][0])
            ))
            fig.update_layout(title=f'{y_col} Area over {x_col}')
        
        fig.update_layout(
            xaxis_title=x_col.replace('_', ' ').title(),
            yaxis_title=y_col.replace('_', ' ').title()
        )
        
        return fig
    
    def _create_treemap(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create treemap"""
        label_col = config.get('label_col')
        value_col = config.get('value_col')
        
        if not label_col or not value_col:
            raise ValueError("Treemap requires label and value columns")
        
        # Aggregate values by label
        treemap_data = df.groupby(label_col)[value_col].sum().reset_index()
        
        fig = px.treemap(
            treemap_data,
            path=[label_col],
            values=value_col,
            title=f'Treemap of {value_col} by {label_col}',
            color_discrete_sequence=self.color_palettes['water_theme']
        )
        
        return fig
    
    def create_dashboard_layout(self, charts: List[go.Figure], layout_type: str = "grid") -> go.Figure:
        """Create multi-chart dashboard layout"""
        try:
            num_charts = len(charts)
            
            if num_charts == 0:
                return None
            
            if layout_type == "grid":
                # Determine grid layout
                if num_charts <= 2:
                    rows, cols = 1, num_charts
                elif num_charts <= 4:
                    rows, cols = 2, 2
                elif num_charts <= 6:
                    rows, cols = 2, 3
                else:
                    rows, cols = 3, 3
                
                # Create subplots
                fig = make_subplots(
                    rows=rows, 
                    cols=cols,
                    subplot_titles=[f"Chart {i+1}" for i in range(num_charts)],
                    vertical_spacing=0.1,
                    horizontal_spacing=0.1
                )
                
                # Add charts to subplots
                for i, chart in enumerate(charts[:rows*cols]):
                    row = (i // cols) + 1
                    col = (i % cols) + 1
                    
                    for trace in chart.data:
                        fig.add_trace(trace, row=row, col=col)
                
                fig.update_layout(
                    height=300 * rows,
                    showlegend=False,
                    title_text="Dashboard Overview"
                )
                
                return fig
            
        except Exception as e:
            logger.error(f"Failed to create dashboard layout: {str(e)}")
            return None
    
    def get_chart_recommendations(self, df: pd.DataFrame) -> List[Dict[str, str]]:
        """Recommend appropriate chart types based on data"""
        recommendations = []
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        date_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
        
        # Time series recommendations
        if date_cols and numeric_cols:
            recommendations.append({
                'type': 'Line Chart',
                'reason': 'Ideal for showing trends over time',
                'x_col': date_cols[0],
                'y_col': numeric_cols[0]
            })
        
        # Categorical analysis
        if categorical_cols and numeric_cols:
            recommendations.append({
                'type': 'Bar Chart',
                'reason': 'Great for comparing categories',
                'x_col': categorical_cols[0],
                'y_col': numeric_cols[0]
            })
            
            recommendations.append({
                'type': 'Pie Chart',
                'reason': 'Shows proportion of categories',
                'label_col': categorical_cols[0],
                'value_col': numeric_cols[0]
            })
        
        # Numeric analysis
        if len(numeric_cols) >= 2:
            recommendations.append({
                'type': 'Scatter Plot',
                'reason': 'Reveals relationships between variables',
                'x_col': numeric_cols[0],
                'y_col': numeric_cols[1]
            })
            
            recommendations.append({
                'type': 'Heatmap',
                'reason': 'Shows correlations between all numeric variables',
                'note': 'Correlation analysis'
            })
        
        # Distribution analysis
        if numeric_cols:
            recommendations.append({
                'type': 'Histogram',
                'reason': 'Shows data distribution',
                'x_col': numeric_cols[0]
            })
            
            recommendations.append({
                'type': 'Box Plot',
                'reason': 'Identifies outliers and quartiles',
                'x_col': numeric_cols[0]
            })
        
        return recommendations
    
    def export_chart(self, fig: go.Figure, filename: str, format_type: str = "html") -> str:
        """Export chart to file"""
        try:
            if format_type == "html":
                return fig.to_html(include_plotlyjs='cdn')
            elif format_type == "png":
                return fig.to_image(format="png")
            elif format_type == "svg":
                return fig.to_image(format="svg")
            elif format_type == "pdf":
                return fig.to_image(format="pdf")
            else:
                raise ValueError(f"Unsupported export format: {format_type}")
                
        except Exception as e:
            logger.error(f"Failed to export chart: {str(e)}")
            return None