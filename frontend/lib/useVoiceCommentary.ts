'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from './api';

interface CommentaryItem {
  audioUrl: string;
  text?: string;
  id: string;
}

interface UseVoiceCommentaryOptions {
  volume?: number;
  autoPlay?: boolean;
}

export function useVoiceCommentary(
  roomId: string | null,
  options: UseVoiceCommentaryOptions = {}
) {
  const {
    volume = 0.8,
    autoPlay = true,
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<CommentaryItem[]>([]);
  const isPlayingRef = useRef(false);
  const currentItemRef = useRef<CommentaryItem | null>(null);

  // Initialize to false to avoid hydration mismatch (server always renders false)
  // We'll load from localStorage in useEffect after mount
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentCommentary, setCurrentCommentary] = useState<CommentaryItem | null>(null);

  // Load mute preference from localStorage after mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trivia-commentary-muted');
      if (saved === 'true') {
        setTimeout(() => {
          setIsMuted(true);
        }, 0);
      }
    }
  }, []);

  // Process queue: play next item if not playing and queue has items
  const processQueue = useCallback(() => {
    if (isPlayingRef.current || queueRef.current.length === 0 || isMuted) {
      return;
    }

    const nextItem = queueRef.current.shift();
    if (!nextItem) return;

    currentItemRef.current = nextItem;
    setCurrentCommentary(nextItem);
    isPlayingRef.current = true;

    // Create new audio element for this commentary
    const audio = new Audio(nextItem.audioUrl);
    audio.volume = volume;
    audio.preload = 'auto';

    const handleCanPlay = () => {
      setIsLoaded(true);
      if (autoPlay && !isMuted) {
        console.log('▶️ Attempting to play audio...');
        audio.play()
          .then(() => {
            console.log('✅ Audio playing successfully');
          })
          .catch((err) => {
            console.warn('❌ Failed to play commentary audio:', err);
            // Continue to next item if play fails
            isPlayingRef.current = false;
            setCurrentCommentary(null);
            processQueue();
          });
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentCommentary(null);
      currentItemRef.current = null;
      // Clean up audio element
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      // Process next item in queue
      processQueue();
    };

    const handleError = (event?: Event) => {
      // Log error details for debugging, but don't throw
      const errorMessage = event && 'message' in event ? String(event.message) : 'Unknown error';
      const audioUrl = nextItem?.audioUrl || 'unknown';
      console.warn('Failed to play commentary audio:', {
        audioUrl,
        error: errorMessage,
        errorCode: audio.error?.code,
        networkState: audio.networkState,
        readyState: audio.readyState,
      });
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentCommentary(null);
      currentItemRef.current = null;
      // Clean up and continue
      try {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audio.src = '';
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      // Process next item in queue
      processQueue();
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    audioRef.current = audio;
  }, [volume, autoPlay, isMuted]);

  // Handle mute state changes
  useEffect(() => {
    if (isMuted && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    }

    // Save mute preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('trivia-commentary-muted', String(isMuted));
    }
  }, [isMuted]);

  // Process queue when mute state changes or queue updates
  useEffect(() => {
    if (!isMuted && queueRef.current.length > 0 && !isPlayingRef.current) {
      processQueue();
    }
  }, [isMuted, processQueue]);

  /**
   * Play a commentary audio URL immediately or add to queue
   */
  const playCommentary = useCallback((audioUrl: string, text?: string, priority: boolean = false) => {
    if (!audioUrl) return;

    const item: CommentaryItem = {
      audioUrl,
      text,
      id: `${Date.now()}-${Math.random()}`,
    };

    if (priority) {
      // Insert at front of queue
      queueRef.current.unshift(item);
    } else {
      // Add to end of queue
      queueRef.current.push(item);
    }

    // Process queue if not currently playing
    if (!isPlayingRef.current && !isMuted) {
      processQueue();
    }
  }, [isMuted, processQueue]);

  /**
   * Play pre-generated question audio
   */
  const playQuestionAudio = useCallback((audioUrl: string | null | undefined) => {
    if (audioUrl) {
      playCommentary(audioUrl, undefined, false);
    }
  }, [playCommentary]);

  /**
   * Clear the queue and stop current playback
   */
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentCommentary(null);
    currentItemRef.current = null;
  }, []);

  /**
   * Skip current commentary and move to next
   */
  const skip = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentCommentary(null);
    currentItemRef.current = null;
    // Process next item
    processQueue();
  }, [processQueue]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      queueRef.current = [];
    };
  }, []);

  return {
    isMuted,
    isPlaying,
    isLoaded,
    currentCommentary,
    queueLength: queueRef.current.length,
    toggleMute,
    setVolume,
    playCommentary,
    playQuestionAudio,
    clearQueue,
    skip,
  };
}
