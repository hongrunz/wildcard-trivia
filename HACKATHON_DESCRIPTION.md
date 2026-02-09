## Inspiration

Trivia is an iconic social catalyst, yet it is often exclusionary by design. By relying on static, Western-centric knowledge, it creates "cultural dead zones" for those from diverse backgrounds, turning what should be a bridge into a barrier.

This inspired our team to look closer: if the games we play to "connect" actually reinforce isolation, how can we use AI to fix the fundamental way humans interact?

## What it does

Wildcard Trivia uses Gemini 3 to transform a traditionally static game into a dynamic, inclusive experience:

- **The Intersection Engine:** We prompt Gemini 3 to synthesize real-time questions at the technical and cultural intersection of every player's specific interests. This ensures no one is "out of their element" and everyone's background is treated as an asset.
- **Trivi, the AI Host:** Our specialized AI persona, powered by Gemini Live API, provides real time commentary and guidance, maintaining high energy and ensuring an interactive experience for all.
- **Connection-First Awards:** At the game's conclusion, Gemini 3 analyzes performance data to generate custom awards. Instead of just crowning a winner, the model highlights unique contributions and shared achievements.

## How we built it

**Frontend Architecture:**
- Built with Next.js 16 (App Router) and React 19, using TypeScript for type safety
- Implemented a state machine with XState to manage complex game flow (loading → onboarding → playing → review → finished)
- Real-time synchronization via WebSocket connections for seamless multiplayer coordination
- Mobile-first responsive design using styled-components
- Voice commentary system with audio queue management and Redis-backed caching

**Backend Infrastructure:**
- FastAPI (Python) backend with async/await for high concurrency
- RESTful API endpoints for room creation, player joining, question generation, and game statistics
- Redis as the primary data store for rooms, players, questions, and leaderboards
- WebSocket manager for broadcasting game state updates to all connected clients

**Gemini 3 Integration:**
- **Question Generation:** Custom prompts to Gemini 3 (`gemini-3-flash-preview`) that synthesize questions at the intersection of player-submitted topics, ensuring cultural relevance and difficulty balance
- **Text-to-Speech:** Gemini Live API (`gemini-2.5-flash-native-audio-preview`) for generating Trivi's voice commentary with Redis caching to minimize latency
- **Award Generation:** Algorithm-driven award system that analyzes topic-specific performance to create personalized recognition (e.g., "Subject Matter Authority on Cricket", "Sharing a love for K-Pop")

## Challenges we ran into

Ensuring low-latency text-to-speech (TTS) playback was a major challenge. We experimented with different Google/Gemini TTS products and landed on the Live API, which provides the fastest response. To further optimize, we pre-called and cached TTS audio for each question in parallel before gameplay began, so that audio would play instantly and smoothly when needed.

## Accomplishments we're proud of

We turned trivia from an exclusive experience into an inclusive one, shipped a seamless audio/visual multiplayer flow, and a unique AI-powered experience that reliably get laughs and spark conversation.

## What we learned

Inclusion dramatically boosts engagement, and giving players control over content completely changes the energy in the room.
Clear constraints make AI outputs more playful, useful, and reliable.

## What's next for Wildcard Trivia!

Trivia is just our starting point. Beyond just making the game more engaging and effective for community & team building, we're using it to prove a much larger thesis: that Gemini 3 can power a scalable model for human-centric AI. What begins as a game is actually a universal blueprint for empathy, designed to bridge cultural gaps and rebuild community on a global scale.
