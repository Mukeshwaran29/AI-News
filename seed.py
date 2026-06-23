import os
import uuid
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not key:
    print("Please set SUPABASE_SERVICE_ROLE_KEY. Check supabase status.")
    exit(1)

supabase: Client = create_client(url, key)

examples = [
    {
        "category": "announcements",
        "ticker": "INFY",
        "company_name": "Infosys Ltd",
        "headline": "New CPO Appointed & Credit Facility Extended",
        "pdf_summary": "The company has announced the appointment of Ms. Jayashree Pillai as Chief People Officer effective 1 July 2025, replacing the outgoing CPO who has completed her tenure. The board has also ratified the extension of existing banking credit facilities by ₹500 Cr with HDFC Bank for working capital needs.",
        "highlights": {
            "Update 1": "New CPO Appointed",
            "Update 2": "Credit Facility Extended",
            "Bank": "HDFC Bank"
        },
        "score": 85,
        "sentiment": "positive",
        "rationale": "Appointment of a new CPO and extension of working capital credit facilities indicates stability and growth.",
        "keywords": ["CPO", "Credit Facility"]
    },
    {
        "category": "annual_report",
        "ticker": "TATAMOTORS",
        "company_name": "Tata Motors Ltd",
        "headline": "FY24-25 Annual Report: Revenue ₹4.38L Cr",
        "pdf_summary": "FY25 consolidated revenue grew 12.4% YoY to ₹4,38,219 Cr driven by JLR volume recovery and strong domestic CV demand. PAT at ₹31,807 Cr — highest ever. Net debt reduced by ₹18,200 Cr. Board recommends dividend of ₹6/share (vs ₹3 in FY24). EV volumes doubled; Tiago EV market share at 22%.",
        "highlights": {
            "Revenue": "₹4.38L Cr",
            "PAT": "₹31,807 Cr",
            "Dividend": "₹6/sh",
            "Debt": "↓ ₹18,200 Cr"
        },
        "score": 95,
        "sentiment": "positive",
        "rationale": "Record PAT, significant debt reduction, and doubling of EV volumes present a very strong fundamental picture.",
        "keywords": ["Annual Report", "FY25", "Dividend"]
    },
    {
        "category": "board_meeting",
        "ticker": "HDFCBANK",
        "company_name": "HDFC Bank Ltd",
        "headline": "Intimation of Board Meeting on 19 Apr 2025",
        "pdf_summary": "Board meeting scheduled to consider and approve: (1) Audited standalone & consolidated financial results for Q4 FY25 ending 31 Mar 2025. (2) Recommendation of final dividend for FY25. (3) Reappointment of M/s Deloitte Haskins & Sells LLP as statutory auditors subject to shareholder approval.",
        "highlights": {
            "Agenda 1": "Q4 FY25 Results",
            "Agenda 2": "Final Dividend",
            "Agenda 3": "Auditor Reappointment"
        },
        "score": 50,
        "sentiment": "neutral",
        "rationale": "Standard board meeting intimation for quarterly results and dividend recommendation.",
        "keywords": ["Board Meeting", "Q4 FY25"]
    },
    {
        "category": "corporate_action",
        "ticker": "RELIANCE",
        "company_name": "Reliance Industries Ltd",
        "headline": "Interim Dividend ₹10/share Declared",
        "pdf_summary": "Interim dividend of ₹10/share declared for FY26. Record date fixed as 28 June 2025. Shareholders holding shares as of the record date will be eligible. Payment will be credited to registered bank accounts by 12 July 2025. No stock split or bonus action announced in this intimation.",
        "highlights": {
            "Dividend": "₹10/sh",
            "Ex-Date": "27 Jun",
            "Pay-By": "12 Jul"
        },
        "score": 80,
        "sentiment": "positive",
        "rationale": "Declaration of interim dividend is a direct positive return to shareholders.",
        "keywords": ["Dividend", "Record Date"]
    },
    {
        "category": "buyback",
        "ticker": "WIPRO",
        "company_name": "Wipro Ltd",
        "headline": "Board approves ₹1,612 Cr Share Buyback",
        "pdf_summary": "Board approved buyback of up to 2.69 Cr equity shares at a maximum price of ₹600/share (vs CMP ₹487), aggregating to ₹1,612 Cr — representing 9.23% of paid-up equity capital. Buyback will be via open market route through NSE/BSE. Promoter shareholding will not change as they will not participate.",
        "highlights": {
            "Amount": "₹1,612 Cr Buyback",
            "Price": "Max ₹600/sh",
            "Size": "2.69 Cr shares",
            "Notes": "Promoters not participating"
        },
        "score": 88,
        "sentiment": "positive",
        "rationale": "Share buyback at a premium to CMP signals management confidence and is accretive to EPS.",
        "keywords": ["Buyback", "Open Market"]
    },
    {
        "category": "financial_results",
        "ticker": "ASIANPAINT",
        "company_name": "Asian Paints Ltd",
        "headline": "Q4 FY25 Standalone Results",
        "pdf_summary": "Q4 FY25 revenue at ₹8,647 Cr, down 3.1% YoY due to volume pressure in decorative segment and raw material cost headwinds. EBITDA margin contracted 180 bps to 18.2%. PAT at ₹1,169 Cr, down 8.6% YoY. Management guided for modest demand recovery in H1 FY26 aided by rural consumption uptick.",
        "highlights": {
            "Revenue": "₹8,647 Cr ↓3.1%",
            "EBITDA": "18.2%",
            "PAT": "₹1,169 Cr"
        },
        "score": 35,
        "sentiment": "negative",
        "rationale": "Revenue decline and margin contraction indicate challenging operating environment.",
        "keywords": ["Q4 Results", "Earnings"]
    },
    {
        "category": "insider_trading",
        "ticker": "DIXON",
        "company_name": "Dixon Technologies",
        "headline": "Promoter Open Market Purchase - 25k shares",
        "pdf_summary": "Mr. Sunil Vachani, Chairman & MD (Promoter), acquired 25,000 equity shares at an avg. price of ₹16,240/share via open market purchase on 17 Jun 2025. Total consideration: ~₹40.6 Cr. Post-transaction promoter holding increases from 34.16% to 34.23%. No disposal transactions reported in this filing.",
        "highlights": {
            "Action": "Buy · 25,000 shares",
            "Price": "Avg ₹16,240",
            "Post-Stake": "Promoter: 34.23%"
        },
        "score": 92,
        "sentiment": "positive",
        "rationale": "Significant open market purchase by Chairman/MD is a strong bullish signal.",
        "keywords": ["Insider Trading", "Promoter Buy"]
    },
    {
        "category": "investor_complaints",
        "ticker": "ZOMATO",
        "company_name": "Zomato Ltd",
        "headline": "Quarterly Investor Complaint Report (Mar 2025)",
        "pdf_summary": "Quarterly investor complaint report as per SEBI LODR. Pending at start of quarter: 0. Received during quarter: 3. Resolved: 3. Pending at end of quarter: 0. All complaints were related to dividend non-receipt and were resolved within 7 days via SCORES portal. No regulatory directions pending.",
        "highlights": {
            "Received": "3",
            "Resolved": "3",
            "Pending": "0"
        },
        "score": 60,
        "sentiment": "neutral",
        "rationale": "Standard compliance report with zero pending complaints.",
        "keywords": ["SCORES", "Complaints"]
    },
    {
        "category": "shareholding_pattern",
        "ticker": "BAJFINANCE",
        "company_name": "Bajaj Finance Ltd",
        "headline": "Shareholding Pattern for Quarter Ended Mar 2025",
        "pdf_summary": "As of 31 Mar 2025: Promoter + Promoter Group holding stands at 54.78% (unchanged QoQ). FII/FPI holding at 19.42% (down 0.63% QoQ). DII holding at 14.11% (up 0.41% QoQ). Public/Retail at 11.69%. Total shareholders: 34.87 lakh. No encumbrance on promoter shares. 100% shares held in dematerialized form.",
        "highlights": {
            "Promoter": "54.78% (—)",
            "FII": "19.42% (↓)",
            "DII": "14.11% (↑)"
        },
        "score": 55,
        "sentiment": "neutral",
        "rationale": "Slight reshuffling between FII and DII, but overall stable promoter holding.",
        "keywords": ["Shareholding", "FII/DII"]
    }
]

print("Seeding examples...")
now = datetime.now(timezone.utc)

for i, ex in enumerate(examples):
    raw_feed_id = str(uuid.uuid4())
    # Offset pub_date slightly so they show in order
    pub_date = (now - timedelta(minutes=i*15)).isoformat()
    
    # Insert raw_feed
    supabase.table("raw_feed").insert({
        "id": raw_feed_id,
        "guid": f"demo-guid-{i}",
        "title": ex["headline"],
        "link": "https://www.nseindia.com",
        "description": "Example Description",
        "pub_date": pub_date,
        "category": ex["category"],
        "ticker": ex["ticker"],
        "processed": True
    }).execute()
    
    # Insert analyzed_events
    supabase.table("analyzed_events").insert({
        "raw_feed_id": raw_feed_id,
        "ticker": ex["ticker"],
        "company_name": ex["company_name"],
        "category": ex["category"],
        "headline": ex["headline"],
        "sentiment": ex["sentiment"],
        "score": ex["score"],
        "rationale": ex["rationale"],
        "keywords": ex["keywords"],
        "pub_date": pub_date,
        "pdf_url": "https://www.nseindia.com",
        "pdf_summary": ex["pdf_summary"],
        "highlights": ex["highlights"]
    }).execute()

print("Seeding complete!")
