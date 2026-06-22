TEMPLATES = {
    ('financial_results', 'positive'): [
        "Revenue beat analyst estimates with {keywords[0]} showing strength.",
        "Quarterly results exceeded expectations driven by {keywords[0]}.",
    ],
    ('financial_results', 'negative'): [
        "Results missed estimates with pressure on {keywords[0]}.",
        "Earnings disappointed as {keywords[0]} weighed on margins.",
    ],
    ('insider_trading', 'positive'): [
        "Insider buying signals management confidence in {company}.",
        "Promoter acquisition suggests bullish outlook for {company}.",
    ],
    ('insider_trading', 'negative'): [
        "Insider selling raises caution flags for {company}.",
        "Promoter stake reduction may signal near-term headwinds.",
    ],
    ('corporate_action', 'positive'): [
        "Corporate action indicates shareholder value creation at {company}.",
        "Action suggests capital efficiency improvement for {company}.",
    ],
    ('buyback', 'positive'): [
        "Buyback signals management conviction in {company}'s undervaluation.",
        "{company} buyback demonstrates strong cash position and shareholder focus.",
    ],
    ('shareholding_pattern', 'positive'): [
        "FII/DII inflow indicates institutional confidence in {company}.",
        "Rising institutional ownership reflects positive outlook for {company}.",
    ],
    ('shareholding_pattern', 'negative'): [
        "FII outflow raises questions about near-term prospects for {company}.",
        "Declining institutional stake warrants monitoring for {company}.",
    ],
    # Default fallbacks
    ('__default__', 'positive'): [
        "Event suggests positive developments for {company}.",
        "Announcement reflects favourable outlook for {ticker}.",
    ],
    ('__default__', 'negative'): [
        "Event raises concerns about near-term performance of {company}.",
        "Announcement may present headwinds for {ticker}.",
    ],
    ('__default__', 'neutral'): [
        "Disclosure is routine with limited immediate market impact for {company}.",
        "Event is informational in nature for {company}.",
    ],
}

def generate_rationale(category: str, sentiment: str, company: str,
                        ticker: str, keywords: list[str]) -> str:
    key = (category, sentiment)
    templates = TEMPLATES.get(key, TEMPLATES.get(('__default__', sentiment),
                              ["Sentiment analysis indicates {sentiment} outlook for {company}."]))
    # Pick deterministically based on ticker hash (consistent per company)
    template = templates[hash(ticker) % len(templates)]
    kw = keywords if keywords else ['operations']
    return template.format(
        company=company or ticker,
        ticker=ticker,
        keywords=kw,
        sentiment=sentiment,
    )
