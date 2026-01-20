# VisInv - Professional Invoice Management SaaS

A modern, full-featured invoice management system built with React, Supabase, and Tailwind CSS.

## Features

### Core Features
- ✅ Email & Google OAuth authentication
- ✅ Client management
- ✅ Invoice creation and management
- ✅ Multiple invoice templates
- ✅ PDF generation and download
- ✅ Email invoice delivery
- ✅ Multi-language support (Swedish & English)
- ✅ Team collaboration (Premium)
- ✅ Custom invoice templates (Premium)
- ✅ Stripe subscription management

### Free Tier
- Up to 10 invoices
- Basic client management
- Predefined templates
- Email & print invoices
- PDF download

### Premium Tier
- Unlimited invoices
- Custom templates
- Team collaboration
- Advanced analytics
- Recurring invoices
- Multi-currency support
- Automated reminders
- Priority support

## Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Redux Toolkit** - State management
- **React Router** - Routing
- **i18next** - Internationalization

### Backend & Services
- **Supabase** - Database, Auth, Storage
- **Stripe** - Payment processing
- **Resend** - Email delivery
- **jsPDF** - PDF generation

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Stripe account (for payments)
- Resend account (for emails)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   VITE_RESEND_API_KEY=your_resend_api_key
   ```

3. **Set up Supabase database**
   
   Run the SQL scripts in `DATABASE.md` to create:
   - Tables
   - RLS policies
   - Functions
   - Storage buckets

4. **Configure Supabase Authentication**
   - Enable Email authentication
   - Enable Google OAuth provider
   - Set redirect URLs:
     - Site URL: `http://localhost:5173`
     - Redirect URLs: `http://localhost:5173/auth/callback`

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Project Structure

```
visinv/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── layout/       # Layout components
│   │   ├── invoices/     # Invoice-related components
│   │   ├── clients/      # Client-related components
│   │   └── ...
│   ├── features/         # Redux slices
│   │   ├── auth/
│   │   ├── invoices/
│   │   ├── clients/
│   │   └── ...
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utility functions
│   ├── i18n/             # Internationalization
│   ├── config/           # Configuration files
│   └── store/            # Redux store
├── public/               # Static assets
└── ...
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style
- Use functional components with hooks
- Follow React best practices
- Use Tailwind utility classes
- Keep components small and focused

## Database Setup

See [DATABASE.md](DATABASE.md) for complete database schema and setup instructions.

Key tables:
- `profiles` - User profiles
- `clients` - Customer information
- `invoices` - Invoice headers
- `invoice_rows` - Invoice line items
- `products` - Product catalog
- `templates` - Invoice templates
- `teams` - Team information
- `subscriptions` - Stripe subscriptions

## Deployment

### Environment Setup

1. Set up production environment variables
2. Create Supabase production project
3. Set up Stripe production keys
4. Configure Resend for production

### Build

```bash
npm run build
```

### Deploy

The `dist` folder can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

### Post-Deployment

1. Update Supabase redirect URLs
2. Update Stripe webhook endpoints
3. Test authentication flow
4. Verify email sending

## Admin Access

Admin features are available to: `thomas@communitaslabs.io`

Admin can:
- Access all premium features
- View admin dashboard
- Manage users and teams
- View platform analytics
- Access audit logs

## Documentation

- [FEATURES.md](FEATURES.md) - Complete feature list with user stories
- [DATABASE.md](DATABASE.md) - Database schema and setup

## Support

For support, email: thomas@communitaslabs.io

---

Built with ❤️ using React, Supabase, and Tailwind CSS
