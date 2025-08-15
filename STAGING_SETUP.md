# Staging Environment Setup

## Manual Steps Required:
1. **Vercel**: Create new project from `staging` branch
   - Name: `deedpro-staging`
   - Root Directory: `frontend`
   - Environment: Copy from prod but point to staging backend

2. **Render**: Create new web service from `staging` branch  
   - Name: `deedpro-staging-api`
   - Root Directory: `backend`
   - Environment: Copy from prod with staging database

3. **Database**: Create staging PostgreSQL instance
   - Copy schema from production
   - Use separate data for testing
