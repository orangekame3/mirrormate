FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Download model at build time (faster startup)
RUN python -c "from transformers import AutoModel, AutoTokenizer; \
    AutoTokenizer.from_pretrained('pfnet/plamo-embedding-1b', trust_remote_code=True); \
    AutoModel.from_pretrained('pfnet/plamo-embedding-1b', trust_remote_code=True)"

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
