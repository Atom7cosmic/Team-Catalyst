# OrgOS - AI-Powered Organization Operating System

OrgOS is a comprehensive, AI-powered organization management platform designed to streamline workforce operations, enhance productivity, and provide intelligent insights for engineering teams.

## Features

- **AI-Powered Meeting Analysis**: Self-hosted transcription with Whisper.cpp, speaker diarization, and LLM-powered insights
- **Performance Tracking**: Real-time performance scoring with trend analysis
- **Intelligent Recommendations**: AI-driven promotion and attrition risk prediction using LangChain and LangGraph
- **Live Meeting Rooms**: WebRTC-powered video conferencing with recording
- **Attendance Management**: Automated check-in/check-out with heatmap visualization
- **Task & Sprint Management**: Agile project management tools
- **Org Chart Visualization**: Interactive D3.js organization hierarchy

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Zustand (State Management)
- Socket.io Client
- Recharts (Data Visualization)
- D3.js (Org Chart)

### Backend
- Node.js / Express.js
- MongoDB with Mongoose
- Redis (BullMQ, Sessions)
- Socket.io (WebRTC Signaling)
- JWT Authentication (Access + Refresh Tokens)
- AWS S3 / Cloudflare R2 (Audio Storage)

### AI Stack
- Groq API (LLM inference - Llama3-70B)
- LangChain.js (LLM Orchestration)
- LangGraph.js (Multi-step AI Workflows)
- ChromaDB (Vector Database)
- @xenova/transformers (Local Embeddings)
- Whisper.cpp (Self-hosted Transcription)
- FFmpeg (Audio Processing)

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- MongoDB Atlas account (or local MongoDB)
- AWS S3 or Cloudflare R2 bucket
- Groq API key (get one at https://console.groq.com)
- Redis (or use Docker Compose)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourorg/orgos.git
cd orgos
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Set up Whisper.cpp**
```bash
cd backend
chmod +x scripts/setupWhisper.sh
./scripts/setupWhisper.sh
```

4. **Start with Docker Compose**
```bash
docker-compose up -d
```

5. **Seed the database**
```bash
cd backend
npm run seed
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- ChromaDB: http://localhost:8000

### Demo Credentials

All demo accounts use password: `Password123!`

- **Admin**: admin@orgos.app
- **CEO**: ceo@orgos.app
- **CTO**: cto@orgos.app
- **VP Engineering**: vp@orgos.app
- **Engineering Managers**: em1@orgos.app, em2@orgos.app
- **Software Engineers**: se1@orgos.app - se4@orgos.app
- **Junior Engineers**: jr1@orgos.app, jr2@orgos.app
- **Tech Lead**: tl@orgos.app
- **Senior Engineer**: sr@orgos.app
- **QA Engineer**: qa@orgos.app
- **Intern**: intern@orgos.app

## Environment Variables

See `.env.example` for all required variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/orgos

# JWT Secrets
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# AWS S3 / Cloudflare R2
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1

# Groq API
GROQ_API_KEY=your-groq-key

# Redis
REDIS_URL=redis://localhost:6379

# Email (Resend)
RESEND_API_KEY=your-resend-key

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Frontend URLs
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Whisper Model
WHISPER_MODEL_PATH=./models/whisper/ggml-base.bin
```

## AI Weightage System

### Performance Score Formula
```
score = (taskCompletionRate × 0.40) +
        (deadlineAdherenceRate × 0.30) +
        (meetingContributionNormalized × 0.20) +
        (workingHoursNormalized × 0.10)
```

**Justification:**
- **Task Completion (40%)**: Primary measure of output in engineering context
- **Deadline Adherence (30%)**: Reliability and planning quality signal
- **Meeting Contribution (20%)**: Collaboration quality metric
- **Working Hours (10%)**: Minimal weight - output matters more than hours

### Resignation Risk Score Formula
```
riskScore = (pulseScoreComponent × 0.30) +
            (performanceTrendComponent × 0.20) +
            (promotionPassOverComponent × 0.25) +
            (tenureComponent × 0.10) +
            (meetingEngagementComponent × 0.10) +
            (similarAtRiskComponent × 0.05)
```

**Components:**
- **Pulse Score (30%)**: Self-reported satisfaction, strongest predictor
- **Promotion Pass-Over (25%)**: Growth blocker detection
- **Performance Trend (20%)**: Behavioral change capture
- **Tenure (10%)**: Baseline attrition patterns
- **Meeting Engagement (10%)**: Early disengagement signal
- **Similar At-Risk (5%)**: Pattern matching via ChromaDB

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────>│    API      │────>│   MongoDB   │
│  (Next.js)  │<────│  (Express)  │<────│             │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │   Workers   │
       │            │  (BullMQ)   │
       │            └──────┬──────┘
       │                   │
┌──────┴──────┐     ┌──────┴──────┐
│   Socket.io │<───>│   Redis     │
│  (WebRTC)   │     │             │
└─────────────┘     └─────────────┘
                            │
                     ┌──────┴──────┐
                     │  ChromaDB   │
                     │ (Vectors)   │
                     └─────────────┘
```

## API Documentation

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Meetings
- `GET /api/meetings` - List meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings/:id/upload-recording` - Upload recording
- `POST /api/meetings/:id/qa` - RAG Q&A
- `GET /api/meetings/:id/similar` - Find similar meetings

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `GET /api/users/org-chart` - Get org chart data

### Tasks, Sprints, Recommendations
See API routes in `/backend/routes`

## Development

### Running Locally

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Workers:**
```bash
cd backend
npm run worker
```

### Database Migrations
```bash
cd backend
npm run seed
```

## Production Deployment

1. Set production environment variables
2. Build Docker images: `docker-compose build`
3. Deploy to your infrastructure
4. Set up SSL certificates
5. Configure DNS

## Security

- JWT access tokens (15 min expiry)
- HTTP-only refresh token cookies (7 day expiry)
- bcrypt password hashing (12 rounds)
- Rate limiting on auth endpoints
- Input validation with Joi
- CORS protection
- Helmet.js security headers

## License

MIT License - See LICENSE file

## Support

For issues and feature requests, please use GitHub Issues.

## Acknowledgments

- Whisper.cpp by Georgi Gerganov
- ChromaDB for vector storage
- Groq for LLM inference
- LangChain for AI orchestration
