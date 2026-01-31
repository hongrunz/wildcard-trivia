import { setup, assign } from 'xstate';
import { RoomResponse } from './api';

export interface LeaderboardEntry {
  playerId: string;
  rank: number;
  playerName: string;
  points: number;
  topicScore?: { [topic: string]: number };
}

// Context holds the game data
export interface GameContext {
  currentRound: number;
  room: RoomResponse | null;
  gameStartedAt: Date | null;
  /** When the current question was shown; used so the question timer always resets and uses timePerQuestion. */
  questionStartedAt: Date | null;
  /** When we transitioned to answer revelation (submitted); used to start the review timer. */
  reviewStartedAt: Date | null;
  isCorrect: boolean;
  /** The answer string the player submitted (for showing on answer-reveal screen). */
  selectedAnswer: string | null;
  score: number;
  leaderboard: LeaderboardEntry[];
  error: string;
  currentQuestionIndex: number; // Track which question we're on (0-indexed)
}

// Events that can trigger state transitions
export type GameEvent =
  | { type: 'GAME_LOADED'; room: RoomResponse; startedAt: Date }
  | { type: 'ROOM_UPDATED'; room: RoomResponse }
  | { type: 'TIMER_EXPIRED' }
  | { type: 'ANSWER_SUBMITTED'; isCorrect: boolean; score: number; selectedAnswer?: string }
  | { type: 'ROUND_FINISHED'; leaderboard: LeaderboardEntry[] }
  | { type: 'ROUND_BREAK_COMPLETE' }
  | { type: 'GAME_FINISHED'; leaderboard: LeaderboardEntry[]}
  | { type: 'QUESTION_CHANGED' }
  | { type: 'ROUND_CHANGED'; startedAt: Date; room: RoomResponse }
  | { type: 'LEADERBOARD_UPDATED'; leaderboard: LeaderboardEntry[] }
  | { type: 'PLAYER_JOINED'; player: { playerId: string; playerName: string; joinedAt: string } }
  | { type: 'ALL_ANSWERED' }
  | { type: 'ERROR'; error: string };

export const gameStateMachine = setup({
  types: {} as {
    context: GameContext;
    events: GameEvent;
  },
  actions: {
    updateRoom: assign({
      room: ({ event }) => (event as Extract<GameEvent, { type: 'ROOM_UPDATED' }>).room,
    }),
    updateLeaderboard: assign({
      leaderboard: ({ event }) => (event as Extract<GameEvent, { type: 'LEADERBOARD_UPDATED' }>).leaderboard,
    }),
    addPlayer: assign({
      room: ({ context, event }) => {
        const playerEvent = event as Extract<GameEvent, { type: 'PLAYER_JOINED' }>;
        if (!context.room) return null;
        
        const playerExists = context.room.players.some(
          (p) => p.playerId === playerEvent.player.playerId
        );
        
        if (playerExists) return context.room;
        
        return {
          ...context.room,
          players: [
            ...context.room.players,
            {
              playerId: playerEvent.player.playerId,
              playerName: playerEvent.player.playerName,
              score: 0,
              joinedAt: playerEvent.player.joinedAt,
            }
          ],
        };
      },
    }),
  },
}).createMachine({
  id: 'game',
  initial: 'loading',
  context: {
    room: null,
    gameStartedAt: null,
    questionStartedAt: null,
    reviewStartedAt: null,
    isCorrect: false,
    selectedAnswer: null as string | null,
    score: 0,
    leaderboard: [],
    error: '',
    currentQuestionIndex: 0,
    currentRound: 0,
  },
  onTransition: ({ value, context, event }: { value: string | Record<string, unknown> | undefined; context: GameContext; event: GameEvent }) => {
    console.log('🔄 Game State Transition:', {
      to: value,
      event: event.type,
      context: {
        hasRoom: !!context.room,
        roomId: context.room?.roomId,
        currentRound: context.room?.currentRound,
        numRounds: context.room?.numRounds,
        gameStartedAt: context.gameStartedAt,
        score: context.score,
        error: context.error || undefined,
      },
    });
  },
  states: {
    loading: {
      on: {
        GAME_LOADED: {
          target: 'question',
          actions: assign({
            room: ({ event }) => (event as Extract<GameEvent, { type: 'GAME_LOADED' }>).room,
            gameStartedAt: ({ event }) => (event as Extract<GameEvent, { type: 'GAME_LOADED' }>).startedAt,
            error: () => '',
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => (event as Extract<GameEvent, { type: 'ERROR' }>).error,
          }),
        },
      },
    },

    question: {
      // Reset isCorrect, reviewStartedAt, selectedAnswer, and set when this question started so timer resets per question
      entry: assign({
        isCorrect: () => false,
        reviewStartedAt: () => null,
        selectedAnswer: () => null,
        questionStartedAt: () => new Date(),
      }),
      on: {
        ANSWER_SUBMITTED: {
          actions: assign({
            isCorrect: ({ event }) => (event as Extract<GameEvent, { type: 'ANSWER_SUBMITTED' }>).isCorrect,
            score: ({ event }) => (event as Extract<GameEvent, { type: 'ANSWER_SUBMITTED' }>).score,
            selectedAnswer: ({ event }) => (event as Extract<GameEvent, { type: 'ANSWER_SUBMITTED' }>).selectedAnswer ?? null,
          }),
        },
        TIMER_EXPIRED: {
          target: 'submitted',
          actions: assign({
            isCorrect: ({ context }) => context.isCorrect,
            reviewStartedAt: () => new Date(),
          }),
        },
        ALL_ANSWERED: {
          target: 'submitted',
          actions: assign({
            isCorrect: ({ context }) => context.isCorrect,
            reviewStartedAt: () => new Date(),
          }),
        },
        ROOM_UPDATED: {
          actions: 'updateRoom',
        },
        LEADERBOARD_UPDATED: {
          actions: 'updateLeaderboard',
        },
        PLAYER_JOINED: {
          actions: 'addPlayer',
        },
      },
    },

    submitted: {
      // Review time: 8 seconds to show answer and leaderboard
      // After 8 seconds, check if we've completed all questions in the round
      // If currentQuestionIndex + 1 >= questionsPerRound, send ROUND_FINISHED
      // Otherwise, transition to next question
      after: {
        8000: [
          {
            target: 'roundFinished',
            guard: ({ context }: { context: GameContext }) => {
              // Check if the next question would exceed questionsPerRound
              // (currentQuestionIndex is 0-indexed, so we check if next index >= questionsPerRound)
              const questionsPerRound = context.room?.questionsPerRound ?? 0;
              return context.currentQuestionIndex + 1 >= questionsPerRound;
            },
            actions: assign({
              leaderboard: ({ context }) => context.leaderboard,
            }),
          },
          {
            target: 'question',
            actions: assign({
              currentQuestionIndex: ({ context }) => context.currentQuestionIndex + 1,
            }),
          },
        ],
      },
      on: {
        // Player submitted after we already transitioned via ALL_ANSWERED (e.g. they were the last to submit).
        // Update context so the reveal screen shows their selected answer.
        ANSWER_SUBMITTED: {
          actions: assign({
            isCorrect: ({ event }) => (event as Extract<GameEvent, { type: 'ANSWER_SUBMITTED' }>).isCorrect,
            score: ({ event }) => (event as Extract<GameEvent, { type: 'ANSWER_SUBMITTED' }>).score,
            selectedAnswer: ({ event }) => (event as Extract<GameEvent, { type: 'ANSWER_SUBMITTED' }>).selectedAnswer ?? null,
          }),
        },
        QUESTION_CHANGED: {
          target: 'question',
          actions: assign({
            currentQuestionIndex: ({ context }) => context.currentQuestionIndex + 1,
          }),
        },
        ROUND_FINISHED: {
          target: 'roundFinished',
          actions: assign({
            leaderboard: ({ event }) => (event as Extract<GameEvent, { type: 'ROUND_FINISHED' }>).leaderboard,
          }),
        },
        GAME_FINISHED: {
          target: 'finished',
          actions: assign({
            leaderboard: ({ event }) => (event as Extract<GameEvent, { type: 'GAME_FINISHED' }>).leaderboard,
          }),
        },
        ROOM_UPDATED: {
          actions: 'updateRoom',
        },
        LEADERBOARD_UPDATED: {
          actions: 'updateLeaderboard',
        },
        PLAYER_JOINED: {
          actions: 'addPlayer',
        },
      },
    },

    roundFinished: {
      after: {
        // Round break time: 10 seconds between rounds
        10000: [
          {
            target: 'finished',
            guard: ({ context }) => {
              // Check if we've completed all rounds
              const numRounds = context.room?.numRounds ?? 0;
              const currentRound = context.room?.currentRound ?? 0;
              return currentRound >= numRounds;
            },
            actions: assign({
              leaderboard: ({ context }) => context.leaderboard,
            }),
          },
          {
            target: 'newRound',
          },
        ],
      },
      on: {
        ROOM_UPDATED: {
          actions: 'updateRoom',
        },
        LEADERBOARD_UPDATED: {
          actions: 'updateLeaderboard',
        },
      },
    },

    newRound: {
      on: {
        ROUND_CHANGED: {
          target: 'question',
          actions: assign({
            gameStartedAt: ({ event }) => (event as Extract<GameEvent, { type: 'ROUND_CHANGED' }>).startedAt,
            room: ({ event }) => (event as Extract<GameEvent, { type: 'ROUND_CHANGED' }>).room,
            currentQuestionIndex: () => 0, // Reset question index for new round
          }),
        },
        ROOM_UPDATED: {
          actions: 'updateRoom',
        },
        LEADERBOARD_UPDATED: {
          actions: 'updateLeaderboard',
        },
      },
    },

    finished: {
      type: 'final',
      on: {
        ROOM_UPDATED: {
          actions: 'updateRoom',
        },
        LEADERBOARD_UPDATED: {
          actions: 'updateLeaderboard',
        },
      },
    },

    error: {
      on: {
        GAME_LOADED: {
          target: 'question',
          actions: assign({
            room: ({ event }) => (event as Extract<GameEvent, { type: 'GAME_LOADED' }>).room,
            gameStartedAt: ({ event }) => (event as Extract<GameEvent, { type: 'GAME_LOADED' }>).startedAt,
            error: () => '',
          }),
        },
      },
    },
  },
});
