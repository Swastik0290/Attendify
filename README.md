# Attendify

Attendify is a modern attendance management web application built with Next.js, featuring QR-code based live attendance scanning, passkey authentication, and robust role-based access control (Super Admin, Faculty, Student).

## Features
- **Dynamic QR Attendance**: Faculty can launch live rotating QR sessions that students scan using their phones.
- **Passkey Support**: Fast and secure device-bound authentication for students.
- **Institutional Roll Schema**: Flexible parser to decode roll numbers and assign students to their departments and programs automatically.
- **Roster Management**: Upload class CSV rosters to automatically register students and enroll them in courses.
- **Role-Based Access**: Specialized portals for Super Admins, Faculty members, and Students.

## Deployment
This project is configured to be deployed on **Vercel**. 

**Important:** Make sure to configure your environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel dashboard. Keep your `SUPABASE_SERVICE_ROLE_KEY` secure and do not expose it to the browser.

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Database / Auth:** Supabase
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
