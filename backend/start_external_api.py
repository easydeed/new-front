#!/usr/bin/env python3
"""
Startup script for DeedPro External Integrations API
Run this to start the external API on port 8001
"""

import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("EXTERNAL_API_PORT", 8001))
    host = os.getenv("EXTERNAL_API_HOST", "0.0.0.0")
    
    print("=" * 60)
    print("🚀 Starting DeedPro External Integrations API")
    print("=" * 60)
    print(f"🌐 Server: http://{host}:{port}")
    print(f"📚 Documentation: http://{host}:{port}/docs")
    print(f"🔗 ReDoc: http://{host}:{port}/redoc")
    print("=" * 60)
    print("Ready for SoftPro 360 and Qualia integrations!")
    print("=" * 60)
    
    uvicorn.run(
        "external_api:external_app",
        host=host,
        port=port,
        reload=os.getenv("EXTERNAL_API_RELOAD", "true").lower() == "true"
    ) 