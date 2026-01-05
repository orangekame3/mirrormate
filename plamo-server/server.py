"""
PLaMo-Embedding-1B Server

Ollama-compatible API wrapper for PLaMo-Embedding-1B
"""

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModel, AutoTokenizer

app = FastAPI(title="PLaMo Embedding Server")

# Load model on startup
print("Loading PLaMo-Embedding-1B model...")
tokenizer = AutoTokenizer.from_pretrained(
    "pfnet/plamo-embedding-1b", trust_remote_code=True
)
model = AutoModel.from_pretrained("pfnet/plamo-embedding-1b", trust_remote_code=True)

device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
model = model.to(device)
model.eval()
print(f"Model loaded on {device}")


class EmbedRequest(BaseModel):
    model: str = "plamo-embedding-1b"
    input: str | list[str]


class EmbedResponse(BaseModel):
    model: str
    embeddings: list[list[float]]


@app.post("/api/embed")
async def embed(request: EmbedRequest) -> EmbedResponse:
    """Ollama-compatible embedding endpoint"""
    try:
        texts = request.input
        if isinstance(texts, str):
            texts = [texts]

        with torch.inference_mode():
            embeddings = model.encode_document(texts, tokenizer)

        # Convert to list of lists
        if isinstance(embeddings, torch.Tensor):
            embeddings_list = embeddings.cpu().tolist()
        else:
            embeddings_list = [e.cpu().tolist() if isinstance(e, torch.Tensor) else e for e in embeddings]

        return EmbedResponse(
            model="plamo-embedding-1b",
            embeddings=embeddings_list,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "model": "plamo-embedding-1b", "device": device}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
