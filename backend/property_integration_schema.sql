-- Property Integration Database Schema Updates
-- For Google Places, SiteX Data, and TitlePoint API integration

-- Enhanced Property Cache Table for API integration
CREATE TABLE IF NOT EXISTS property_cache_enhanced (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    
    -- Google Places Data
    google_place_id VARCHAR(255),
    formatted_address TEXT NOT NULL,
    street_address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    zip_code VARCHAR(10),
    neighborhood VARCHAR(255),
    
    -- SiteX Data
    apn VARCHAR(50),
    fips VARCHAR(20),
    sitex_validated BOOLEAN DEFAULT FALSE,
    
    -- TitlePoint Data
    legal_description TEXT,
    primary_owner TEXT,
    secondary_owner TEXT,
    vesting_details TEXT,
    tax_first_installment DECIMAL(12,2),
    tax_second_installment DECIMAL(12,2),
    county_name VARCHAR(100),
    titlepoint_enriched BOOLEAN DEFAULT FALSE,
    
    -- API Response Cache (JSON)
    google_response JSONB,
    sitex_response JSONB,
    titlepoint_response JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    
    -- Indexes for performance
    UNIQUE(user_id, formatted_address)
);

-- API Usage Logging Table
CREATE TABLE IF NOT EXISTS api_integration_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    
    -- API Service Info
    service_name VARCHAR(50) NOT NULL, -- 'google_places', 'sitex', 'titlepoint'
    method_name VARCHAR(100),
    endpoint_url TEXT,
    
    -- Request/Response Data
    request_data JSONB,
    response_data JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Error Handling
    error_message TEXT,
    success BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- Property Search History
CREATE TABLE IF NOT EXISTS property_search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    search_query TEXT NOT NULL,
    selected_address TEXT,
    search_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_cache_enhanced_user_id ON property_cache_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_property_cache_enhanced_address ON property_cache_enhanced(formatted_address);
CREATE INDEX IF NOT EXISTS idx_property_cache_enhanced_apn ON property_cache_enhanced(apn);
CREATE INDEX IF NOT EXISTS idx_property_cache_enhanced_expires ON property_cache_enhanced(expires_at);

CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_integration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_service ON api_integration_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_integration_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON property_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON property_search_history(created_at);

-- Update trigger for property_cache_enhanced
CREATE OR REPLACE FUNCTION update_property_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_cache_enhanced_updated_at
    BEFORE UPDATE ON property_cache_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_property_cache_updated_at();
