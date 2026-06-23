"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_LABELS = void 0;
exports.scoreToLabel = scoreToLabel;
exports.scoreToColor = scoreToColor;
// UI display helpers
exports.CATEGORY_LABELS = {
    announcements: 'Announcement',
    annual_report: 'Annual Report',
    board_meeting: 'Board Meeting',
    corporate_action: 'Corp. Action',
    buyback: 'Buyback',
    financial_results: 'Financials',
    insider_trading: 'Insider Trade',
    investor_complaints: 'Inv. Complaints',
    shareholding_pattern: 'Shareholding',
    corporate_governance: 'Corp. Governance',
};
function scoreToLabel(score) {
    if (score >= 75)
        return 'Strong positive';
    if (score >= 55)
        return 'Mildly positive';
    if (score >= 45)
        return 'Neutral';
    if (score >= 25)
        return 'Mildly negative';
    return 'Strong negative';
}
function scoreToColor(score) {
    if (score >= 75)
        return '#16a34a'; // green-600
    if (score >= 55)
        return '#65a30d'; // lime-600
    if (score >= 45)
        return '#ca8a04'; // yellow-600
    if (score >= 25)
        return '#ea580c'; // orange-600
    return '#dc2626'; // red-600
}
