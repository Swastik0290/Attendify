# AttendanceIQ - Complete System

A full-stack student attendance application built with Next.js 15, Tailwind CSS, and Supabase.

This V1 release includes the complete pipeline for:
- Super Admin dashboard (Subject management, Faculty management, Settings)
- Faculty dashboard (Roster uploads, QR code generation, Live monitoring)
- Student portal (Google Login, QR code scanning, Attendance history)

## 🚀 How to Host on Vercel (To scan on your phone)

To use your phone to scan the QR code as a student, the app needs to be hosted on the internet, not just `localhost`. Vercel provides free hosting for Next.js apps.

### Step 1: Push to GitHub
1. Create a free account on [GitHub](https://github.com).
2. Create a **New Repository** (make it Public or Private).
3. Open your terminal in this project folder and run:
   ```bash
   git add .
   git commit -m "V1 Final Release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

*Tip: Every time you make changes in the future, just run:*
```bash
git add .
git commit -m "My new updates"
git push
```
*(Vercel will automatically detect the push and update your live website!)*

### Step 2: Deploy to Vercel
1. Create a free account on [Vercel](https://vercel.com) using your GitHub account.
2. Click **Add New... > Project**.
3. Find your newly created GitHub repository in the list and click **Import**.
4. **CRITICAL STEP:** Before clicking "Deploy", open the **Environment Variables** section. You must copy the keys from your local `.env.local` file exactly:
   - `NEXT_PUBLIC_SUPABASE_URL` = (your supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)
5. Click **Deploy**.
6. Wait 2-3 minutes. Vercel will give you a live URL (e.g. `https://attendance-app-xyz.vercel.app`).

### Step 3: Test on Your Phone!
1. Open the Vercel link on your computer and log in as Faculty.
2. Start an attendance session and show the QR code on your laptop screen.
3. Open the **same Vercel link** on your smartphone.
4. Log in as a Student using your Google account (make sure your email is on the roster for that subject).
5. Click **Scan QR Code** and scan your laptop screen!

---

## 🔑 Default Super Admin Login
When you deploy, use these credentials to set up the system:
- **Email:** `superadmin@attendanceiq.test`
- **Password:** `Password123!`

*(You can change this password in the Supabase Dashboard -> Authentication -> Users if needed).*

## ⚠️ Important Note about Google Login
If you plan to use Google Login in production (on Vercel), you must:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/).
2. Navigate to **Authentication > URL Configuration**.
3. Under **Site URL**, put your live Vercel URL.
4. Under **Redirect URLs**, add `https://YOUR_VERCEL_URL.vercel.app/auth/callback`
5. Go to **Providers > Google** and ensure it is turned on with your Google Client ID and Secret. 

*If Google OAuth is not configured, Faculty and Students can still log in using the "Email & Password" tab if the Admin has created a password for them!*
