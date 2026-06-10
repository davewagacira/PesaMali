# Akiba - Deployment Guide

## Deploying to Vercel

This guide covers deploying Akiba to Vercel with all required environment variables and configuration.

### Prerequisites

1. **Vercel Account**: https://vercel.com
2. **GitHub Repository**: Push your code to GitHub (public or private)
3. **Environment Variables**: Gather all required API keys and secrets

### Step 1: Database Setup (Neon PostgreSQL)

1. Create a Neon account: https://neon.tech
2. Create a new PostgreSQL database project
3. Copy the **direct connection string** (NOT pooler) - Format:
   ```
   postgresql://user:password@host.c.neon.tech/dbname?sslmode=require
   ```
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Step 2: API Keys & Credentials

Gather these API keys from their respective providers:

- **DATABASE_URL**: From Neon (direct connection, not pooler)
- **GOOGLE_GENERATIVE_AI_API_KEY**: From Google Cloud Console
- **GOOGLE_GENERATIVE_AI_MODEL**: `gemini-1.5-flash` (or similar)
- **ABLY_API_KEY**: From Ably dashboard
- **SESSION_SECRET**: Generate a random 32+ character string
  ```bash
  openssl rand -base64 32
  ```
- **GOOGLE_CLOUD_PROJECT_ID**: From Google Cloud
- **VERTEX_AI_LOCATION**: Usually `global`
- **VERTEX_AI_MODEL**: `gemini-3-flash-preview` (or similar)
- **GOOGLE_VERTEX_API_KEY**: From Google Cloud
- **AI_GATEWAY_API_KEY**: From AI Gateway provider
- **AI_GATEWAY_MODEL**: `openai/gpt-5.5` (or similar)

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

#### Option B: Using GitHub Integration (Recommended)

1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Connect your GitHub account
4. Select the Akiba repository
5. Click "Import"
6. On the "Configure Project" page:
   - Framework Preset: Next.js (should auto-detect)
   - Root Directory: `.` (default)
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 4: Set Environment Variables

In Vercel Dashboard:

1. Go to Settings → Environment Variables
2. Add each variable from Step 2
3. Set to: **Production**, **Preview**, **Development** (all three)
4. Click "Save"

**Important**: Make sure `DATABASE_URL` uses the **direct connection** (not pooler) for Vercel's serverless functions.

### Step 5: Deploy

After setting environment variables:

1. Go to "Deployments"
2. Click "Redeploy" on the latest deployment
3. Wait for build to complete

### Verification

After deployment completes:

1. Visit your Vercel deployment URL
2. Try logging in with test credentials
3. Check Vercel Logs for any errors:
   - Functions → View Logs
   - Check for Prisma or database connection errors

### Troubleshooting

#### Database Connection Issues
- **Error**: "Can't reach database server"
- **Solution**: Verify you're using the **direct** connection string, not the pooler
- The pooler may have rate limiting on Vercel's serverless functions

#### Missing Environment Variables
- Go to Settings → Environment Variables
- Ensure all variables are set
- Re-deploy after adding variables

#### Prisma Migration Issues
- Run locally first: `npx prisma migrate deploy`
- Then deploy to Vercel

#### Build Timeout
- Vercel free tier has a 45-second limit
- Pro plan allows 60 seconds
- Check build logs for what's taking time

### Monitoring

Set up monitoring in Vercel Dashboard:

1. **Analytics**: Insights → Web Analytics
2. **Errors**: Functions → Error Tracking
3. **Logs**: Real-time logs for debugging
4. **Metrics**: Monitor response times and database queries

### Rollback

If deployment has issues:

1. Go to Deployments
2. Click the previous successful deployment
3. Click "Promote to Production"

### Custom Domain

To use your own domain:

1. Go to Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### Performance Tips

1. **Database**: Ensure Neon database is in the same region
2. **Caching**: Use Vercel's default Next.js caching
3. **Images**: Images are optimized by Next.js Image component
4. **Analytics**: Monitor function execution times

### Security

The `vercel.json` includes security headers:

- X-Content-Type-Options: Prevents MIME sniffing
- X-Frame-Options: Prevents clickjacking
- X-XSS-Protection: XSS protection
- Referrer-Policy: Controls referrer information
- Permissions-Policy: Restricts browser APIs

### Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Neon Docs**: https://neon.tech/docs
