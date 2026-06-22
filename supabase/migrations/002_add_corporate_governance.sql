-- Migration 002: Add corporate_governance category and update feed categories
-- This supports the new nsearchives.nseindia.com feed sources

ALTER TYPE feed_category ADD VALUE IF NOT EXISTS 'corporate_governance';
