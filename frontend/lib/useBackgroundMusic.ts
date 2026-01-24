'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBackgroundMusicOptions {
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
}

export function useBackgroundMusic(
  audioUrl: string,
  options: UseBackgroundMusicOptions = {}
) {
  const {
    autoPlay = true,
    loop = true,
    volume = 0.3,
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(() => {
    // Load mute preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trivia-music-muted');
      return saved === 'true';
    }
    return false;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio(audioUrl);
    audio.loop = loop;
    audio.volume = volume;
    audio.preload = 'auto';
    
    audioRef.current = audio;

    // Event listeners
    const handleCanPlay = () => {
      setIsLoaded(true);
      if (autoPlay && !isMuted) {
        audio.play().catch(() => {
          // Auto-play prevented by browser
        });
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl, loop, volume, autoPlay, isMuted]);

  // Handle mute state changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.pause();
    } else if (isLoaded) {
      audioRef.current.play().catch(() => {
        // Play prevented
      });
    }

    // Save mute preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('trivia-music-muted', String(isMuted));
    }
  }, [isMuted, isLoaded]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const play = useCallback(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.play().catch(() => {
        // Failed to play audio
      });
    }
  }, [isMuted]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  return {
    isMuted,
    isPlaying,
    isLoaded,
    toggleMute,
    play,
    pause,
    setVolume,
  };
}
