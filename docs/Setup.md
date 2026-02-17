# Setup & Configuration Guide ⚙️

Follow these instructions to set up Cortex for development or production.

## 1. Environment Variables

Create a `.env` file in the `server` directory with the following keys:

### Authentication (Google)
- `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
- `GOOGLE_REDIRECT_URI`: Usually `http://localhost:5000/auth/google/callback`.

### AI Core
- `GROQ_API_KEY`: API key from Groq Console.
- `DEFAULT_MODEL`: e.g., `llama-3.1-70b-versatile`.

### Databases
- `MONGODB_URI`: Connection string for MongoDB.
- `LANCEDB_DIR`: Path for the local vector database (default: `./.lancedb`).

### Application
- `PORT`: Server port (default: `5000`).
- `CLIENT_URL`: Frontend URL (default: `http://localhost:5173`).

## 2. Google Cloud Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
   - People API
   - Google Drive API
4. Configure the OAuth Consent Screen.
5. Create OAuth 2.0 Client IDs (Web Application).

## 3. Development Mode

### Running the Server
```bash
cd server
npm install
npm run dev
```

### Running the Desktop App
```bash
cd client
npm install
npm run electron:dev
```

## 4. Troubleshooting
- **CORS Errors**: Ensure `CLIENT_URL` in `.env` matches your frontend address.
- **Audio Issues**: Ensure the application has microphone permissions in your OS settings.
- **MCP Tool Failures**: Check `server/mcp_hub.log` for detailed error messages.
