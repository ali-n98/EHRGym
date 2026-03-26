import asyncio
import sys
import os
import uvicorn

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

if __name__ == "__main__":
    # Check for reload flag or headless env var if needed
    reload = "--reload" in sys.argv
    
    uvicorn.run(
        "env_server.app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=reload
    )