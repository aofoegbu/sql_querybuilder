#!/usr/bin/env python3
"""
Runner script for the SQL Report Generator Streamlit application
"""

import subprocess
import sys
import os

def main():
    """Run the Streamlit application"""
    try:
        # Set environment variables for better performance
        os.environ['STREAMLIT_SERVER_HEADLESS'] = 'true'
        os.environ['STREAMLIT_SERVER_ENABLE_CORS'] = 'false'
        os.environ['STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION'] = 'false'
        
        # Run Streamlit
        cmd = [
            sys.executable, '-m', 'streamlit', 'run', 'app.py',
            '--server.port', '8080',
            '--server.address', '0.0.0.0',
            '--server.headless', 'true',
            '--server.runOnSave', 'true',
            '--server.allowRunOnSave', 'true'
        ]
        
        print("Starting SQL Report Generator...")
        print("The application will be available at: http://0.0.0.0:8080")
        
        # Start the process
        process = subprocess.run(cmd, check=True)
        
    except KeyboardInterrupt:
        print("\nShutting down SQL Report Generator...")
    except Exception as e:
        print(f"Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()