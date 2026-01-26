/**
 * API client for Wildcard Trivia backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CreateRoomRequest {
  name: string;
  topics: string[];
  questionsPerRound: number;
  timePerQuestion: number;
  sessionMode?: 'player' | 'display'; // 'player' = mobile host joins as player, 'display' = web big screen
}

export interface CreateRoomResponse {
  roomId: string;
  hostToken: string;
}

export interface JoinRoomRequest {
  playerName: string;
  topic: string;  // Required field
}

export interface JoinRoomResponse {
  playerId: string;
  playerToken: string;
}

export interface Player {
  playerId: string;
  playerName: string;
  score?: number;
  topicScore?: { [topic: string]: number };  // Points per topic
  joinedAt: string;
}

export interface Question {
  id: string;
  question: string;
  topics: string[];  // Topics associated with this question
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface RoomResponse {
  roomId: string;
  name: string;
  topics: string[];
  collectedTopics: string[];  // Topics submitted by players
  questionsPerRound: number;
  timePerQuestion: number;
  hostName: string;
  players: Player[];
  status: 'waiting' | 'started' | 'finished';
  createdAt: string;
  startedAt?: string;
  questions?: Question[];
}

export interface StartGameResponse {
  success: boolean;
  message: string;
  questionsCount: number;
  playerToken?: string;
}

export interface LeaderboardEntry {
  playerId: string;
  score: number;
  topicScore: { [topic: string]: number };  // Points per topic
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export interface SubmitAnswerRequest {
  questionId: string;
  answer: string;
}

export interface SubmitAnswerResponse {
  success: boolean;
  isCorrect: boolean;
  correctAnswer: string;
  points: number;
  currentScore: number;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.detail || error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  /**
   * Create a new game room
   */
  async createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
    return fetchAPI<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get room details
   */
  async getRoom(roomId: string): Promise<RoomResponse> {
    return fetchAPI<RoomResponse>(`/api/rooms/${roomId}`);
  },

  /**
   * Join an existing room
   */
  async joinRoom(roomId: string, playerName: string, topic: string): Promise<JoinRoomResponse> {
    return fetchAPI<JoinRoomResponse>(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerName, topic }),
    });
  },

  /**
   * Start the game (host only)
   */
  async startGame(roomId: string, hostToken: string): Promise<StartGameResponse> {
    return fetchAPI<StartGameResponse>(`/api/rooms/${roomId}/start`, {
      method: 'POST',
      headers: {
        hostToken: hostToken,
      },
    });
  },

  /**
   * Get leaderboard for a room
   */
  async getLeaderboard(roomId: string): Promise<LeaderboardResponse> {
    return fetchAPI<LeaderboardResponse>(`/api/rooms/${roomId}/leaderboard`);
  },

  /**
   * Submit an answer
   */
  async submitAnswer(roomId: string, playerToken: string, questionId: string, answer: string): Promise<SubmitAnswerResponse> {
    return fetchAPI<SubmitAnswerResponse>(`/api/rooms/${roomId}/submit-answer`, {
      method: 'POST',
      headers: {
        playerToken: playerToken,
      },
      body: JSON.stringify({ questionId, answer }),
    });
  },
};

// Token storage utilities
export const tokenStorage = {
  setHostToken(roomId: string, token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`hostToken_${roomId}`, token);
    }
  },

  getHostToken(roomId: string): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`hostToken_${roomId}`);
    }
    return null;
  },

  setPlayerToken(roomId: string, token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`playerToken_${roomId}`, token);
    }
  },

  getPlayerToken(roomId: string): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`playerToken_${roomId}`);
    }
    return null;
  },
};

