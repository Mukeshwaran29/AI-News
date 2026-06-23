import spacy
from keybert import KeyBERT

nlp = spacy.load("en_core_web_sm")
kw_model = KeyBERT()

def _process_doc(doc) -> dict:
    orgs = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
    persons = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
    amounts = [ent.text for ent in doc.ents if ent.label_ == "MONEY"]
    
    ticker_val = None
    for org in orgs:
        # Check if matches the ticker pattern
        if org.isupper() and 2 <= len(org) <= 20:
            ticker_val = org
            break
            
    return {
        "ticker": ticker_val,
        "company": orgs[0] if orgs else None,
        "persons": persons[:5],
        "amounts": amounts[:5],
    }

def extract_entities(text: str) -> dict:
    """
    Returns:
      {
        "ticker": str | None,     # ORG entity matching ^[A-Z]{2,20}$ pattern
        "company": str | None,    # First ORG entity (full name)
        "persons": list[str],     # PERSON entities
        "amounts": list[str],     # MONEY entities
      }
    """
    doc = nlp(text[:1000])
    return _process_doc(doc)

def extract_entities_batch(texts: list[str]) -> list[dict]:
    """
    Uses spaCy's optimized nlp.pipe to extract ORG, PERSON, and MONEY entities in batch.
    """
    if not texts:
        return []
    docs = nlp.pipe([t[:1000] for t in texts])
    return [_process_doc(doc) for doc in docs]

def extract_keywords_batch(texts: list[str], top_n: int = 5) -> list[list[str]]:
    """
    Extracts keywords for a batch of texts.
    """
    results = []
    for text in texts:
        if not text.strip():
            results.append([])
            continue
        keywords = kw_model.extract_keywords(
            text[:512],
            keyphrase_ngram_range=(1, 2),
            stop_words='english',
            top_n=top_n,
        )
        results.append([kw for kw, _ in keywords])
    return results

def extract_keywords(text: str, top_n: int = 5) -> list[str]:
    """
    Uses KeyBERT to extract top_n keywords/keyphrases.
    Returns list of strings (no scores).
    """
    if not text.strip():
        return []
    return extract_keywords_batch([text], top_n)[0]
