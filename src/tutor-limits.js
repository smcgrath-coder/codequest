// src/tutor-limits.js
// How much of each field the game sends to /api/tutor (Byte). The game clips to these and the server refuses
// anything bigger. Plain data, so both the browser and the Vercel Function can import it.
export const LIMITS = {
  tutorCode: 64,   // the code a grown-up hands out
  question: 300,   // what the kid types
  task: 1200,      // the room's task (the longest is 787)
  program: 4000,   // the kid's code
  output: 1500,    // what the program printed
  error: 800,      // the friendly headline and Python's own words
  feedback: 800,   // what the checker said
  hint: 300,       // each hint shown (the longest is 157)
  hints: 3,        // hints shown (rooms have 1 or 2)
  turn: 1200,      // each earlier chat message
  history: 6,      // earlier chat messages: the last three questions and answers
};

// Every JSON answer /api/tutor gives. A reply to a question is streamed as plain text instead.
export const TUTOR_STATES = ["ready", "not-configured", "locked", "recharging", "busy", "bad-request"];
