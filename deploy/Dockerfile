FROM python:3.12-slim

WORKDIR /app

# Install git for cloning data
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/pyproject.toml backend/
RUN pip install --no-cache-dir -e backend/

# Copy backend code
COPY backend/ backend/

# Clone GMTNet data
RUN git clone https://github.com/MathNetwork/GMTNet.git /app/data/GMTNet

# Expose port
EXPOSE 8765

CMD ["python", "-m", "uvicorn", "netmath.server:app", "--host", "0.0.0.0", "--port", "8765", "--app-dir", "backend"]
