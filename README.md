
# AI Service Platform

A full-stack application for managing and providing AI model services through different providers like OpenAI, Anthropic, and Google.

## Features

- User authentication and management
- Admin dashboard for managing API keys and monitoring usage
- Credit-based system for AI service usage
- Support for multiple AI providers
- Query history and analytics

## Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Shadcn UI components
- Recharts for data visualization
- React Hook Form for form management

### Backend
- Express.js
- TypeScript
- PostgreSQL with Drizzle ORM
- Passport.js for authentication

## Getting Started

### Prerequisites

- Node.js v20 or higher
- PostgreSQL database

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=your_session_secret
```

For AI providers, set your API keys through the admin interface after setup.

### Development

1. Install dependencies:
   ```
   npm install
   ```

2. Push the database schema:
   ```
   npm run db:push
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Access the application at http://localhost:5000

### Production

1. Build the application:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm run start
   ```

## Project Structure

```
├── client/               # Frontend React application
│   ├── src/              # Source files
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Utility functions
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   └── index.html        # HTML template
├── server/               # Backend Express application
│   ├── services/         # Service modules
│   ├── auth.ts           # Authentication logic
│   ├── db.ts             # Database connection
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── storage.ts        # Storage utilities
├── shared/               # Shared code between client and server
│   └── schema.ts         # Database schema
└── migrations/           # Database migrations
```

## Deployment on Replit

This project is configured to run on Replit. The deployment is set up in the `.replit` file.

### Deploying to Production

1. Click the "Deploy" button in the Replit IDE
2. Choose "Cloudrun" as the deployment target
3. Use the following settings:
   - Build command: `npm run build`
   - Run command: `npm run start`

## Database Schema

The application uses the following database tables:

- `users`: Stores user information including credits and admin status
- `queries`: Records of AI model usage with token counts and costs
- `api_keys`: API keys for different AI service providers

## License

MIT
