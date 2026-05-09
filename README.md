# Organizational Friction Index (OFI) Platform 🚀

Welcome to the **Organizational Friction Index (OFI) Platform**, an enterprise-grade, "ServiceNow-like" web application designed to measure, analyze, and reduce cross-departmental friction within large organizations. 

Built as a robust workflow engine and employee management dashboard, the platform seamlessly handles ticketing, role-based access, and complex handoffs between departments like HR, IT, Finance, and Operations—ultimately providing actionable insights into organizational bottlenecks.

## ✨ Key Features

- **Cross-Department Workflow Engine:** A sophisticated state-machine model that facilitates seamless ticket handoffs, task tracking, and dynamic approvals between HR, IT, and Finance.
- **Role-Based Access Control (RBAC):** Strict permissions allowing administrative control over dashboards, while maintaining secure, department-specific views.
- **Dynamic Dashboarding:** Real-time data visualization and metrics to calculate the "Friction Index" based on process delays and inter-departmental interactions.
- **Enterprise Integrations:** Built-in modules for payroll processing, candidate hiring pipelines, interactive scheduling, and corporate policy management.
- **Real-Time Notifications:** Instant "toast" notification system alerting users of task updates and workflow transitions.
- **Secure Authentication:** Next-generation authentication powered by Clerk, ensuring enterprise-grade security for user onboarding and session management.

## 🛠️ Technology Stack

- **Frontend:** [Next.js (App Router)](https://nextjs.org/) + React
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) for a premium, responsive, and accessible UI
- **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL) for relational data, complex joins, and real-time event tracking
- **Authentication:** [Clerk](https://clerk.com/) for secure identity management
- **Deployment:** Ready for deployment on Vercel

## 📂 Architecture Overview

The project is structured under the `web-client` directory using the Next.js App Router paradigm:

- `/src/app/dashboard/*`: Contains specific operational modules (e.g., `/hiring`, `/payroll`, `/it-support`, `/workflow`, `/scheduler`).
- `/src/components/*`: Reusable, modular React components (e.g., Modals, Data Tables, Charts).
- `/src/lib/*`: Utility functions and external integrations (like Supabase clients).
- `/src/app/api/*`: Serverless API route handlers for secure backend operations.

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- Node.js (v18.17 or higher)
- npm, yarn, or pnpm
- Supabase account & project
- Clerk account & application

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RashiGupta1230/Organizational-Friction-Index.git
   cd Organizational-Friction-Index/web-client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the `web-client` root directory and add the necessary environment variables for Supabase and Clerk:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the App:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser to explore the dashboard.

## 📄 Database Schema

The database relies on a normalized PostgreSQL structure via Supabase. Refer to the `supabase_reset.sql` file included in the root directory to initialize the tables, triggers, and RLS policies necessary for the workflow state machine.

## 🤝 Contributing

Contributions are welcome! If you're an outsider looking to understand the system or want to report an issue, please feel free to open a GitHub Issue or submit a Pull Request.

---
*Built for modern organizations to eliminate bottlenecks and optimize operational efficiency.*
