FROM python:3.12-slim

WORKDIR /app

# Install backend dependencies
COPY backend/pyproject.toml backend/
RUN pip install --no-cache-dir -e backend/

# Copy backend code
COPY backend/ backend/

# Copy GMTNet data
COPY deploy/data/ /app/data/GMTNet/

# Expose port
EXPOSE 8765

# Start server (listen on 0.0.0.0 for container)
CMD ["python", "-m", "uvicorn", "netmath.server:app", "--host", "0.0.0.0", "--port", "8765", "--app-dir", "backend"]
