# Render Backend Keep-Alive Pinger

This lightweight package allows you to keep your Render Free Tier web service active to prevent it from going to sleep (which it does after 15 minutes of inactivity).

## Option A: Deploying to Vercel (Pro Tier required for 5-min intervals)

If you have a Vercel Pro account (which allows 1-minute to 5-minute crons):

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Navigate to this directory and deploy:
   ```bash
   cd render-keepalive
   vercel
   ```
3. Once deployed, push it to production:
   ```bash
   vercel --prod
   ```

*Note: Free Hobby Tier Vercel accounts are restricted to 2 cron executions per day.*

---

## Option B: The Ultimate 100% Free Solution (Recommended)

Instead of Vercel, you can set up a free monitoring system that naturally keeps your backend active:

### 1. UptimeRobot (Highly Recommended)
1. Go to [UptimeRobot](https://uptimerobot.com/) and register a free account.
2. Click **Add New Monitor**.
3. Select **Monitor Type**: `HTTP(s)`.
4. Set **Friendly Name**: `NEXRA Backend Keep-Alive`.
5. Set **URL (or IP)**: `https://nexra-api.onrender.com/` (or your backend's `/` route).
6. Set **Monitoring Interval**: `Every 5 minutes` (Free Tier limit).
7. Save. It will now ping your app every 5 minutes automatically, keeping Render awake!

### 2. Cron-Job.org
1. Go to [Cron-Job.org](https://cron-job.org/) and register a free account.
2. Go to **Cronjobs** -> **Create Cronjob**.
3. Title: `NEXRA Keep-Alive`.
4. Address: `https://nexra-api.onrender.com/`.
5. Schedule: Under **Execution times**, set it to **Every 5 minutes**.
6. Save. It will run the request exactly every 5 minutes on a cron.
