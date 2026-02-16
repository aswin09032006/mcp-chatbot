# Cortex (MCP)

This is a production-ready web application that allows you to manage your Google Calendar, gmail, and reminders using a ChatGPT-like interface. It is built with the **Model Context Protocol (MCP)** architecture using **Node.js** for the backend and **React (Vite)** for the frontend.

## 🚀 Features

- **Natural Language Chat**: Talk to your workspace pleasantly.
- **Google Calendar Integration**: List, create, update, and delete events.
- **Gmail Integration**: List unread emails and send emails.
- **Reminders**: Set and manage reminders.
- **Smart Conflict Detection**: (Implemented via LLM reasoning)
- **Modern UI**: Dark mode, responsive, and clean design.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, MongoDB, Google APIs, Groq SDK.
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons.
- **Auth**: Google OAuth2.
- **LLM**: Groq (Llama-3.1-70b).

## 📂 Project Structure

```
workspace-chat/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── ...
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── services/
│   │   ├── tools/          # MCP Tools
│   │   └── index.js
│   └── ...
└── README.md
```

## ⚡ Setup & Run Instructions

**Note:** Due to environment restrictions during generation, you must install dependencies manually.

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (running locally or standard URI)
- Google Cloud Project with Calendar, Gmail, and People APIs enabled.
- Groq API Key.

### 2. Backend Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
   *If `package.json` was missing strict versions, `npm install express mongoose googleapis groq-sdk dotenv cors cookie-session`*
3. Configure Environment Variables:
   - Rename `.env.example` to `.env`.
   - Fill in your `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GROQ_API_KEY`, etc.
   - Set `GOOGLE_REDIRECT_URI` to `http://localhost:5000/auth/google/callback`.
4. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 4. Usage
1. Open `http://localhost:5173` in your browser.
2. Click "Sign in with Google".
3. Grant permissions.
4. Start chatting! e.g., "What meetings do I have today?"

## 🌐 Deployment

### Frontend (Netlify/Vercel)
1. Push `client` folder to a repository (or root with specific build settings).
2. Build command: `npm run build`.
3. Publish directory: `dist`.

### Backend (Render/Railway)
1. Push `server` folder.
2. Build command: `npm install`.
3. Start command: `node src/index.js`.
4. Set Environment Variables in the dashboard.
5. **Important**: Update `GOOGLE_REDIRECT_URI` and Frontend CORS origin in `server/src/index.js` for production URLs.

## 🔒 Security Notes
- Tokens are encrypted in transit (Google standard).
- Session cookies are used for auth.
- Use `https` in production.
