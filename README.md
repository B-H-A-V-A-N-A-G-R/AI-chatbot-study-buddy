# AI Study Buddy

A learning project for **Spring AI** (using **Anthropic Claude**) with a **React** frontend.
Every source file has comments explaining *why* the code is written the way it is.

| Tab | What it does | Spring AI concepts practiced |
|---|---|---|
| **Tutor chat** | A tutor that remembers the conversation | `ChatClient`, system prompt, advisors, chat memory, `CONVERSATION_ID`, `SimpleLoggerAdvisor`, `ChatResponse` token usage |
| **Explain** | Explains a topic at your level, streamed or whole | Prompt templates (`.st` file), `.stream()`, `.chatResponse()` |
| **Quiz** | Generates a multiple-choice quiz | `.entity()`, structured output, `validateSchema()`, low temperature, validating LLM output |

## Project layout

```
study-buddy/
├── backend/                         Spring Boot + Spring AI (Anthropic)
│   ├── pom.xml
│   └── src/main
│       ├── java/com/example/studybuddy
│       │   ├── StudyBuddyApplication.java      <- the class you run in IntelliJ
│       │   ├── config/AiConfig.java            <- START HERE: the two ChatClients, memory, advisors
│       │   ├── service/TutorService.java       <- memory + conversation id
│       │   ├── service/ExplainService.java     <- template, streaming, token usage
│       │   ├── service/QuizService.java        <- entity() + validation
│       │   ├── controller/                     <- REST endpoints + error handler
│       │   └── dto/                            <- records = the JSON shapes
│       └── resources
│           ├── application.yml                 <- API key (from env var), model, logging
│           └── prompts/explain.st              <- the prompt template
└── frontend/                        React (Vite)
    ├── vite.config.js                          <- forwards /api to Spring (no CORS setup)
    └── src
        ├── api.js                              <- ALL backend calls, incl. the stream reader
        ├── App.jsx                             <- tabs
        └── components/ TutorChat, Explain, Quiz, TokenBadge
```

## Before you start

1. **Java 17 or newer** (check with `java -version`).
2. **Node.js 18 or newer** (check with `node -v`).
3. **An Anthropic API key.** Create one at https://console.anthropic.com (Settings > API keys). The account
   needs some credit; $5 is plenty for learning. Set a monthly spend limit in the console.
   Treat the key like a password: never commit it, zip it, or paste it into chat.

IntelliJ already includes Maven, so you don't need to install it separately.

## Run the backend in IntelliJ

1. **Open the project.** `File > Open`, choose the **`backend`** folder (the one containing `pom.xml`).
   If asked, choose **Open as Project** and **Trust Project**. IntelliJ imports it as a Maven project and
   downloads the dependencies (watch the progress bar at the bottom; the first time takes a few minutes).
2. **Set the Java version.** `File > Project Structure > Project`, set the SDK to Java 17 or newer
   (IntelliJ can download one for you: *Add SDK > Download JDK*).
3. **Reload Maven if needed.** Open the Maven tool window (right edge) and click the circular **Reload** icon.
4. **Open `StudyBuddyApplication.java`** (src/main/java/com/example/studybuddy). Click the green run arrow
   next to `public static void main`, and choose **Run 'StudyBuddyApplication'**. It will fail on this first
   run because the API key isn't set yet. That is expected; do the next step.
5. **Set your API key (the important step).**
   - `Run > Edit Configurations...`
   - Select **StudyBuddyApplication** on the left.
   - Click **Modify options** > **Environment variables** (if you don't see the field).
   - In the *Environment variables* box type: `ANTHROPIC_API_KEY=sk-ant-...your key...`
   - Click **OK**.
6. **Run again** with the green play button. When the Run window shows `Started StudyBuddyApplication`,
   the backend is up on port 8080.

Quick check: open http://localhost:8080/api/study/explain?topic=Java%20records in your browser.
You should get an explanation (the first call can take a few seconds).

## Run the frontend

Easiest: use IntelliJ's built-in **Terminal** tab (bottom of the window), which opens in the `backend` folder:

```bash
cd ../frontend
npm install
npm run dev
```

(Or run the same commands in any terminal inside the `frontend` folder.) Then open **http://localhost:5173**.
Keep both the backend and `npm run dev` running.

## Try these (they make the concepts visible)

1. **Memory.** In *Tutor chat* say "My name is Ravi", then ask "What is my name?". Click **New chat**
   and ask again: it no longer knows. Same conversation id = same memory.
2. **Why memory costs money.** Watch the *prompt* token number under each answer. It grows every turn
   because the whole history is re-sent (LLMs are stateless).
3. **See the real prompt.** Look at IntelliJ's Run window. `SimpleLoggerAdvisor` prints the full request,
   including the old messages the memory advisor added.
4. **Stream vs full.** In *Explain*, compare **Stream** with **Full answer + tokens**.
5. **Structured output.** In *Quiz*, generate a quiz and look at how the answers arrive as typed data.
6. **The missing id error.** Remove the `.advisors(a -> a.param(ChatMemory.CONVERSATION_ID, ...))` line in
   `TutorService`, re-run, and send a message to see the `IllegalArgumentException`.
7. **Change the model.** In `application.yml` switch `claude-haiku-5-5` to `claude-sonnet-5-5` and compare
   the quality and the token counts.

## Test the API without the UI

```bash
curl -X POST localhost:8080/api/tutor/chats

curl -X POST localhost:8080/api/tutor/chats/<id>/messages \
  -H "Content-Type: application/json" -d '{"message":"My name is Ravi"}'

curl -N "localhost:8080/api/study/explain/stream?topic=Java%20records&level=beginner"

curl "localhost:8080/api/study/quiz?topic=Java%20streams&count=3"
```

## How the conversation id flows

1. React calls `POST /api/tutor/chats`. The server returns a random UUID (Spring AI does not make ids for you).
2. React saves it in `localStorage` and sends it in the URL of **every** message.
3. `TutorService` passes it as `ChatMemory.CONVERSATION_ID`. The memory advisor uses it as the key to load
   and save that conversation's messages.
4. A page refresh reuses the saved id and reloads the history from `GET /api/tutor/chats/{id}/messages`.

For a real app with login, prefix the id with the username on the server (`username + ":" + chatId`) so
users can never read each other's chats.

## Next steps

- **Persistent memory:** add the JDBC chat-memory repository starter and a database driver, configure
  `spring.datasource.*`, and replace `InMemoryChatMemoryRepository` in `AiConfig` with
  `JdbcChatMemoryRepository`. Nothing else changes. Check the Chat Memory reference page for the exact artifact name.
- **RAG:** add a vector store and `QuestionAnswerAdvisor` so the tutor can answer from your own notes.
- **Tools:** give the tutor a `@Tool` method, for example one that looks up a student's quiz scores.

## Troubleshooting

- **Maven can't resolve dependencies / version errors:** this project targets Spring AI 2.x on Spring Boot 4.x.
  Generate a fresh project at https://start.spring.io with the *Anthropic Claude* dependency, and copy the Boot
  and Spring AI versions it picks into `pom.xml`, then reload Maven. Some method names can differ slightly
  between versions; IntelliJ's autocomplete (Ctrl+Space) shows the right ones.
- **"Could not resolve placeholder 'ANTHROPIC_API_KEY'" or a 401 error:** the environment variable isn't set in
  the Run Configuration (step 5), or the key is wrong. Re-open `Run > Edit Configurations` and check it.
  If you change a Run Configuration, stop and start the app again.
- **Error mentioning credit balance or 429:** your Anthropic account has no credit or hit a rate limit.
  Check the console's Billing page.
- **404 / "model not found":** the model name in `application.yml` is wrong. Check the current names in the
  Anthropic docs.
- **Answers get cut off:** raise `max-tokens` in `application.yml`.
- **Port 8080 already in use:** change `server.port` in `application.yml` to `8081` and the proxy `target` in
  `frontend/vite.config.js` to `http://localhost:8081`.
- **The Quiz tab shows an error about the model output:** click Generate again. If it keeps happening,
  try `claude-sonnet-5-5`.
