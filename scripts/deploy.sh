#!/bin/bash

# 🚀 Production Deployment Script
# Dynamic Wizard Architecture Overhaul - Phase 4
# Automated deployment with comprehensive validation and monitoring

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
SKIP_TESTS=${2:-false}
FORCE_DEPLOY=${3:-false}

# Deployment settings
FRONTEND_URL="https://your-app.vercel.app"
BACKEND_URL="https://your-backend.onrender.com"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
ROLLBACK_ON_FAILURE=true

echo -e "${BLUE}🚀 Starting Dynamic Wizard Deployment${NC}"
echo -e "${BLUE}Environment: ${DEPLOYMENT_ENV}${NC}"
echo -e "${BLUE}Timestamp: $(date)${NC}"
echo ""

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service health
wait_for_health() {
    local url=$1
    local timeout=$2
    local start_time=$(date +%s)
    
    log "Waiting for $url to be healthy..."
    
    while true; do
        if curl -f -s "$url/health" > /dev/null; then
            log "✅ $url is healthy"
            return 0
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            error "❌ Timeout waiting for $url to be healthy"
            return 1
        fi
        
        echo -n "."
        sleep 5
    done
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        warning "⚠️ Skipping tests (SKIP_TESTS=true)"
        return 0
    fi
    
    log "🧪 Running test suite..."
    
    # Frontend tests
    log "Running frontend tests..."
    cd frontend
    npm ci --silent
    npm run test:ci || {
        error "Frontend tests failed"
        return 1
    }
    npm run test:integration || {
        error "Frontend integration tests failed"
        return 1
    }
    cd ..
    
    # Backend tests
    log "Running backend tests..."
    cd backend
    pip install -r requirements.txt --quiet
    python -m pytest tests/ -v --tb=short || {
        error "Backend tests failed"
        return 1
    }
    cd ..
    
    log "✅ All tests passed"
}

# Function to run security checks
run_security_checks() {
    log "🔒 Running security checks..."
    
    # Frontend security audit
    cd frontend
    npm audit --audit-level moderate || {
        warning "Frontend security audit found issues"
    }
    cd ..
    
    # Backend security check
    cd backend
    safety check -r requirements.txt || {
        warning "Backend security check found issues"
    }
    cd ..
    
    log "✅ Security checks completed"
}

# Function to run performance benchmarks
run_performance_benchmarks() {
    log "📊 Running performance benchmarks..."
    
    cd frontend
    npm run test:performance || {
        warning "Performance benchmarks failed"
    }
    cd ..
    
    log "✅ Performance benchmarks completed"
}

# Function to backup database
backup_database() {
    if [ -z "$DATABASE_URL" ]; then
        warning "DATABASE_URL not set, skipping backup"
        return 0
    fi
    
    log "💾 Creating database backup..."
    
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump "$DATABASE_URL" > "backups/$backup_file" || {
        error "Database backup failed"
        return 1
    }
    
    log "✅ Database backup created: $backup_file"
}

# Function to run database migrations
run_migrations() {
    if [ -z "$DATABASE_URL" ]; then
        warning "DATABASE_URL not set, skipping migrations"
        return 0
    fi
    
    log "🗄️ Running database migrations..."
    
    cd backend
    alembic upgrade head || {
        error "Database migration failed"
        return 1
    }
    cd ..
    
    log "✅ Database migrations completed"
}

# Function to deploy frontend
deploy_frontend() {
    log "🌐 Deploying frontend to Vercel..."
    
    cd frontend
    
    # Build the application
    npm run build || {
        error "Frontend build failed"
        return 1
    }
    
    # Deploy to Vercel
    if [ "$DEPLOYMENT_ENV" = "production" ]; then
        vercel --prod --confirm || {
            error "Frontend deployment failed"
            return 1
        }
    else
        vercel --confirm || {
            error "Frontend deployment failed"
            return 1
        }
    fi
    
    cd ..
    
    log "✅ Frontend deployed successfully"
}

# Function to deploy backend
deploy_backend() {
    log "🔧 Deploying backend to Render..."
    
    # Push to Render via Git
    git push render main || {
        error "Backend deployment failed"
        return 1
    }
    
    # Wait for deployment to complete
    log "Waiting for backend deployment to complete..."
    sleep 60
    
    log "✅ Backend deployed successfully"
}

# Function to run post-deployment tests
run_post_deployment_tests() {
    log "🔍 Running post-deployment tests..."
    
    # Wait for services to be healthy
    wait_for_health "$FRONTEND_URL" $HEALTH_CHECK_TIMEOUT || return 1
    wait_for_health "$BACKEND_URL" $HEALTH_CHECK_TIMEOUT || return 1
    
    # Run end-to-end tests
    cd frontend
    npm run test:e2e:production || {
        error "End-to-end tests failed"
        return 1
    }
    cd ..
    
    # Test critical user journeys
    log "Testing critical user journeys..."
    python scripts/test_critical_journeys.py || {
        error "Critical journey tests failed"
        return 1
    }
    
    log "✅ Post-deployment tests passed"
}

# Function to update monitoring
update_monitoring() {
    log "📊 Updating monitoring configuration..."
    
    # Update health check endpoints
    curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
        -d "api_key=$UPTIMEROBOT_API_KEY" \
        -d "id=$UPTIMEROBOT_MONITOR_ID" \
        -d "url=$FRONTEND_URL/health" || {
        warning "Failed to update frontend monitoring"
    }
    
    # Update Sentry release
    if command_exists sentry-cli; then
        sentry-cli releases new "$(git rev-parse HEAD)" || {
            warning "Failed to create Sentry release"
        }
        sentry-cli releases set-commits "$(git rev-parse HEAD)" --auto || {
            warning "Failed to set Sentry commits"
        }
    fi
    
    log "✅ Monitoring updated"
}

# Function to send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || {
            warning "Failed to send Slack notification"
        }
    fi
    
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 Deployment $status: $message\"}" \
            "$DISCORD_WEBHOOK_URL" || {
            warning "Failed to send Discord notification"
        }
    fi
}

# Function to rollback deployment
rollback_deployment() {
    error "🚨 INITIATING EMERGENCY ROLLBACK"
    
    # Get last known good commit
    local last_good_commit=$(git log --oneline -n 10 | grep "deploy:" | head -1 | cut -d' ' -f1)
    
    if [ -z "$last_good_commit" ]; then
        error "No previous deployment found for rollback"
        return 1
    fi
    
    log "Rolling back to commit: $last_good_commit"
    
    # Rollback frontend
    cd frontend
    vercel rollback --yes || {
        error "Frontend rollback failed"
    }
    cd ..
    
    # Rollback backend
    git reset --hard "$last_good_commit"
    git push render main --force || {
        error "Backend rollback failed"
    }
    
    # Wait and verify
    sleep 60
    wait_for_health "$FRONTEND_URL" 120
    wait_for_health "$BACKEND_URL" 120
    
    send_notification "ROLLED BACK" "Deployment rolled back to $last_good_commit"
    
    log "✅ Rollback completed"
}

# Function to cleanup
cleanup() {
    log "🧹 Cleaning up temporary files..."
    
    # Remove temporary build files
    rm -rf frontend/.next/cache
    rm -rf backend/__pycache__
    rm -rf backend/.pytest_cache
    
    # Clean up old backups (keep last 10)
    if [ -d "backups" ]; then
        ls -t backups/*.sql | tail -n +11 | xargs -r rm
    fi
    
    log "✅ Cleanup completed"
}

# Main deployment function
main() {
    local deployment_start_time=$(date +%s)
    
    # Check prerequisites
    log "🔍 Checking prerequisites..."
    
    if ! command_exists git; then
        error "Git is required but not installed"
        exit 1
    fi
    
    if ! command_exists node; then
        error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command_exists python; then
        error "Python is required but not installed"
        exit 1
    fi
    
    if ! command_exists curl; then
        error "curl is required but not installed"
        exit 1
    fi
    
    # Check if we're on the correct branch
    local current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$FORCE_DEPLOY" != "true" ]; then
        error "Not on main branch. Use FORCE_DEPLOY=true to override"
        exit 1
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        if [ "$FORCE_DEPLOY" != "true" ]; then
            error "Uncommitted changes detected. Use FORCE_DEPLOY=true to override"
            exit 1
        else
            warning "Deploying with uncommitted changes"
        fi
    fi
    
    log "✅ Prerequisites check passed"
    
    # Create backups directory
    mkdir -p backups
    
    # Send start notification
    send_notification "STARTED" "Deployment to $DEPLOYMENT_ENV started"
    
    # Run deployment steps
    if run_tests && \
       run_security_checks && \
       run_performance_benchmarks && \
       backup_database && \
       run_migrations && \
       deploy_frontend && \
       deploy_backend && \
       run_post_deployment_tests && \
       update_monitoring; then
        
        local deployment_end_time=$(date +%s)
        local deployment_duration=$((deployment_end_time - deployment_start_time))
        
        # Tag successful deployment
        git tag "deploy-$(date +%Y%m%d-%H%M%S)" -m "Successful deployment to $DEPLOYMENT_ENV"
        git push origin --tags
        
        log "🎉 Deployment completed successfully!"
        log "⏱️ Total deployment time: ${deployment_duration}s"
        
        send_notification "SUCCESS" "Deployment to $DEPLOYMENT_ENV completed in ${deployment_duration}s"
        
        # Final health check
        log "🏥 Final health check..."
        wait_for_health "$FRONTEND_URL" 60
        wait_for_health "$BACKEND_URL" 60
        
        log "✅ All services are healthy"
        
    else
        error "❌ Deployment failed"
        
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_deployment
        fi
        
        send_notification "FAILED" "Deployment to $DEPLOYMENT_ENV failed"
        exit 1
    fi
    
    # Cleanup
    cleanup
    
    log "🚀 Deployment process completed!"
}

# Trap to handle script interruption
trap 'error "Deployment interrupted"; cleanup; exit 1' INT TERM

# Run main function
main "$@"


