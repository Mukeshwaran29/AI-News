# Model loading (load once at module level, not per-call)
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

MODEL_ID = "ProsusAI/finbert"   # replace with fine-tuned ID when available

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
sentiment_pipeline = pipeline(
    "text-classification",
    model=model,
    tokenizer=tokenizer,
    return_all_scores=True,
    truncation=True,
    max_length=512,
)

def _calculate_sentiment(pipeline_output: list[dict]) -> dict:
    scores = {r['label'].lower(): r['score'] for r in pipeline_output}
    pos = scores.get('positive', 0.0)
    neg = scores.get('negative', 0.0)
    composite = round(((pos - neg + 1) / 2) * 100)
    composite = max(0, min(100, composite))
    if composite >= 55:
        label = 'positive'
    elif composite <= 45:
        label = 'negative'
    else:
        label = 'neutral'
    return {"label": label, "score": composite, "raw_scores": scores}

def score_text(text: str) -> dict:
    """
    Returns:
      {
        "label": "positive" | "neutral" | "negative",
        "score": int 0–100,
        "raw_scores": {"positive": float, "neutral": float, "negative": float}
      }
    """
    results = sentiment_pipeline(text[:512])[0]
    return _calculate_sentiment(results)

def score_texts(texts: list[str]) -> list[dict]:
    """
    Runs batch inference on a list of texts.
    """
    if not texts:
        return []
    truncated_texts = [text[:512] for text in texts]
    results = sentiment_pipeline(truncated_texts)
    return [_calculate_sentiment(res) for res in results]
