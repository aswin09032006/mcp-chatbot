# Feature Deep Dive 🚀

Cortex provides a suite of advanced features designed for productivity and seamless integration.

## 🧠 AI Browser
The AI Browser is a core differentiator of Cortex, allowing the AI to act as a research assistant.

- **URL Navigation**: Navigate to any website.
- **Element Interaction**: Click buttons, fill forms, and scroll.
- **Content Extraction**: Read and summarize web pages or PDFs.
- **Visual Feedback**: Real-time rendering of the browser state in the `SideWorkspace`.

## 📂 Google Workspace Integration
Cortex has native support for the Google ecosystem:

| Service | Capabilities |
| --- | --- |
| **Gmail** | List unread, search messages, send emails, manage labels. |
| **Calendar** | List events, create meetings, check for conflicts, delete/update events. |
| **Drive** | Search files, read document content, manage permissions. |
| **Contacts** | Search and list contact information. |

## 🧠 Long-Term Memory
Cortex doesn't just forget. It uses **RAG (Retrieval-Augmented Generation)** to maintain context over time.

- **Vector Indexing**: Important information is automatically vectorized and stored in LanceDB.
- **Contextual Retrieval**: On every query, Cortex searches its memory for relevant past interactions.
- **Manual Memory**: You can explicitly tell Cortex to "Remember this...".

## 🎙️ Voice Interaction
- **Speech-to-Text**: High-accuracy voice input for hands-free operation.
- **Continuous Mode**: Stays active for natural back-and-forth conversation.
