# FileChat - Transform the Way You Interact with Your Files

This is a [Next.js](https://nextjs.org) project that allows users to upload, manage, and chat with their files in a seamless, intuitive environment.

## Supabase Integration

This application uses Supabase for authentication and file storage. The app requires the following features:

1. User registration and login with Supabase Auth
2. Automatic profile creation when a user registers
3. File upload and management

## Getting Started

### 1. Set up Supabase

Before running the application, you need to set up your Supabase project:

1. Create a `.env.local` file in the root directory with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Run the SQL migration in your Supabase project (available in `supabase/migrations/20250308_create_profiles_table_and_trigger.sql`)
   - This will create the profiles table and the trigger to automatically create a profile when a user registers
   - It will also create the user_files table for storing file metadata

3. Set up Supabase Storage
   - Create a new bucket named `files` with public access

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a custom font family.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
