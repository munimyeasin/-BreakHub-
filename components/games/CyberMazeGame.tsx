'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Star,
  Zap,
  Key,
  Shield,
  Sparkles,
  Timer,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lock,
  Unlock,
  Layers,
  Award,
  ChevronRight,
  AlertTriangle,
  Flame,
  Check,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { gamification } from '@/lib/gamification';

interface CyberMazeGameProps {
  gameId: string;
  onGameOver: (finalScore: number) => void;
}

// Tile Entity Constants
const TILE = {
  EMPTY: 0,
  WALL: 1,
  SPAWN: 2,
  EXIT: 3,
  CORE: 4,         // Energy Data Core (+100 pts)
  KEY_CYAN: 5,     // Cyan Keycard
  GATE_CYAN: 6,    // Cyan Security Laser Gate
  KEY_PINK: 7,     // Pink Keycard
  GATE_PINK: 8,    // Pink Security Laser Gate
  KEY_GOLD: 9,     // Gold Master Key
  GATE_GOLD: 10,   // Gold Security Laser Gate
  WARP_A: 11,      // Teleporter Pad A
  WARP_B: 12,      // Teleporter Pad B
  SPEED_BOOST: 13  // Overclock Speed Pad
};

export interface MazeLevel {
  id: number;
  name: string;
  subtitle: string;
  gridWidth: number;
  gridHeight: number;
  map: number[][];
  timeLimit: number; // in seconds (60s)
  parTime: number;   // for 3-star rating (< parTime)
  darkRadar?: boolean; // fog of war / dynamic spotlight
}

// 10 Handcrafted 60-Second Cyber Labyrinth Levels
export const MAZE_LEVELS: MazeLevel[] = [
  // Level 1: BOOT SECTOR (11x11)
  {
    id: 1,
    name: 'BOOT SECTOR',
    subtitle: 'Neural Link Initialization',
    gridWidth: 11,
    gridHeight: 11,
    timeLimit: 60,
    parTime: 35,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 4, 0, 0, 0, 4, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 4, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
      [1, 0, 1, 4, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 0, 0, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
  },

  // Level 2: CIRCUIT ALLEY (11x13)
  {
    id: 2,
    name: 'CIRCUIT ALLEY',
    subtitle: 'Overclocked Branching Nodes',
    gridWidth: 11,
    gridHeight: 13,
    timeLimit: 60,
    parTime: 35,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 4, 0, 0, 0, 4, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 13, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 4, 0, 0, 1, 0, 1, 4, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 0, 0, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
  },

  // Level 3: CYAN FIREWALL (13x13)
  {
    id: 3,
    name: 'CYAN FIREWALL',
    subtitle: 'Security Laser Barrier Protocol',
    gridWidth: 13,
    gridHeight: 13,
    timeLimit: 60,
    parTime: 38,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 4, 0, 0, 0, 1, 4, 5, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 1, 4, 0, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1],
      [1, 0, 0, 0, 1, 4, 0, 1, 0, 0, 0, 4, 1],
      [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 6, 1],
      [1, 4, 0, 1, 0, 0, 0, 4, 1, 0, 0, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
  },

  // Level 4: DUAL GATEWAY (13x15)
  {
    id: 4,
    name: 'DUAL GATEWAY',
    subtitle: 'Two-Stage Biometric Security',
    gridWidth: 13,
    gridHeight: 15,
    timeLimit: 60,
    parTime: 40,
    map: [
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  2,  0,  0,  1,  4,  0,  0,  0,  1,  4,  0,  1],
      [ 1,  1,  1,  0,  1,  0,  1,  1,  0,  1,  0,  0,  1],
      [ 1,  5,  0,  0,  0,  0,  1,  0,  0,  1,  0,  1,  1],
      [ 1,  1,  1,  1,  1,  0,  1,  0,  1,  1,  0,  1,  1],
      [ 1,  4,  0,  0,  1,  0,  6,  0,  1,  4,  0,  7,  1],
      [ 1,  0,  1,  0,  1,  1,  1,  0,  1,  1,  0,  0,  1],
      [ 1,  0,  1,  0,  0,  0,  1,  0,  0,  0,  0,  1,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  1,  0,  1,  1],
      [ 1,  0,  0,  4,  1,  0,  0, 13,  0,  1,  0,  0,  1],
      [ 1,  1,  1,  0,  1,  1,  0,  1,  0,  1,  1,  0,  1],
      [ 1,  4,  0,  0,  0,  1,  0,  1,  0,  0,  1,  0,  1],
      [ 1,  0,  1,  1,  0,  1,  0,  1,  1,  0,  1,  8,  1],
      [ 1,  0,  0,  4,  0,  0,  0,  0,  1,  0,  0,  3,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
    ]
  },

  // Level 5: QUANTUM RELAY (15x15)
  {
    id: 5,
    name: 'QUANTUM RELAY',
    subtitle: 'Instant Subatomic Portal Jump',
    gridWidth: 15,
    gridHeight: 15,
    timeLimit: 60,
    parTime: 40,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 4, 0, 0, 0, 1, 0, 0, 0, 4, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 4, 0, 0, 0, 0, 1, 11, 0, 1, 0, 1, 5, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 4, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 12, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 4, 0, 0, 1, 0, 1, 6, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
  },

  // Level 6: DARKNET RADAR (15x17)
  {
    id: 6,
    name: 'DARKNET RADAR',
    subtitle: 'Spotlight Stealth Infiltration',
    gridWidth: 15,
    gridHeight: 17,
    timeLimit: 60,
    parTime: 42,
    darkRadar: true,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 4, 0, 0, 0, 1, 4, 0, 0, 4, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 5, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [1, 4, 0, 0, 1, 0, 1, 4, 1, 0, 0, 0, 0, 7, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 4, 1, 0, 1],
      [1, 0, 1, 1, 1, 6, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 4, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 8, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
  },

  // Level 7: GRIDLOCK NEXUS (17x17)
  {
    id: 7,
    name: 'GRIDLOCK NEXUS',
    subtitle: 'High-Density Switch Matrix',
    gridWidth: 17,
    gridHeight: 17,
    timeLimit: 60,
    parTime: 42,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 4, 0, 0, 0, 1, 4, 0, 0, 0, 1, 5, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 4, 0, 0, 0, 0, 1, 13, 0, 0, 0, 4, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 4, 0, 0, 0, 0, 1, 7, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 4, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 6, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 4, 1, 11, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 4, 0, 0, 1],
      [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 8, 1],
      [1, 12, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
  },

  // Level 8: SYNAPSE LABYRINTH (17x19)
  {
    id: 8,
    name: 'SYNAPSE LABYRINTH',
    subtitle: 'Triple Clearance Tri-Gate',
    gridWidth: 17,
    gridHeight: 19,
    timeLimit: 60,
    parTime: 44,
    map: [
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  2,  0,  0,  0,  4,  0,  0,  0,  0,  4,  0,  0,  0,  0,  5,  1],
      [ 1,  0,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  4,  1,  0,  1,  1,  1,  4,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  0,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  6,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,  4,  0,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  1,  1,  0,  1],
      [ 1,  7,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0, 13,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  1,  1,  0,  1],
      [ 1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  8,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  9,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  1],
      [ 1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  0, 10,  3,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
    ]
  },

  // Level 9: APEX OVERCLOCK (19x19)
  {
    id: 9,
    name: 'APEX OVERCLOCK',
    subtitle: 'Hyperspace Conduit Nexus',
    gridWidth: 19,
    gridHeight: 19,
    timeLimit: 60,
    parTime: 45,
    map: [
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  2,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  5,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1, 11,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  4,  0,  0,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  6,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  7,  0,  0,  0,  0,  0,  0,  0, 12,  0,  0,  0,  0,  0,  0,  0, 13,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1],
      [ 1,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  8,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  9,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  1],
      [ 1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0, 10,  3,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
    ]
  },

  // Level 10: MAINFRAME ESCAPE (21x21)
  {
    id: 10,
    name: 'MAINFRAME ESCAPE',
    subtitle: 'The Master Apex Labyrinth',
    gridWidth: 21,
    gridHeight: 21,
    timeLimit: 60,
    parTime: 48,
    darkRadar: true,
    map: [
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  2,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  5,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1, 11,  1,  1,  1,  0,  1,  1,  1,  0,  1,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  0,  1],
      [ 1,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  0,  1],
      [ 1,  0,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  6,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1],
      [ 1,  7,  0,  0,  0,  0,  0,  0,  0, 12,  0,  0,  0,  0,  0,  0,  0, 13,  0,  0,  1],
      [ 1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1],
      [ 1,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  8,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  9,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  0,  1],
      [ 1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0, 13,  0,  0,  1],
      [ 1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  1,  1],
      [ 1,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0,  0,  0,  0,  4,  0,  0, 10,  3,  1],
      [ 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
    ]
  }
];

export default function CyberMazeGame({ gameId, onGameOver }: CyberMazeGameProps) {
  // Level & Progression State
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [levelBestTimes, setLevelBestTimes] = useState<Record<number, number>>({});

  // Active Play State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLevelCleared, setIsLevelCleared] = useState<boolean>(false);
  const [isGameWonAll, setIsGameWonAll] = useState<boolean>(false);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Gameplay Run Metrics
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [keysHeld, setKeysHeld] = useState<{ cyan: boolean; pink: boolean; gold: boolean }>({
    cyan: false,
    pink: false,
    gold: false
  });
  const [coresCollectedInLevel, setCoresCollectedInLevel] = useState<number>(0);
  const [totalCoresInLevel, setTotalCoresInLevel] = useState<number>(0);
  const [speedBoostActive, setSpeedBoostActive] = useState<boolean>(false);

  // Refs for zero-latency game loop and rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Dynamic grid map state (mutable during gameplay for pickups and gates)
  const activeMapRef = useRef<number[][]>([]);
  const playerGridPosRef = useRef<{ r: number; c: number }>({ r: 1, c: 1 });
  const playerRenderPosRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 });
  const playerDirRef = useRef<{ dr: number; dc: number }>({ dr: 0, dc: 1 });
  const trailParticlesRef = useRef<Array<{ x: number; y: number; alpha: number; color: string }>>([]);
  const pulseRipplesRef = useRef<Array<{ x: number; y: number; r: number; maxR: number; color: string; alpha: number }>>([]);
  const floatingTextsRef = useRef<Array<{ x: number; y: number; text: string; color: string; alpha: number }>>([]);

  const keysHeldRef = useRef(keysHeld);
  keysHeldRef.current = keysHeld;

  const currentLevel = MAZE_LEVELS[currentLevelIdx] || MAZE_LEVELS[0];
  const timeLimit = currentLevel.timeLimit || 60;
  const timeProgress = Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100));
  const timeMinutes = Math.floor(timeLeft / 60);
  const timeSeconds = timeLeft % 60;
  const formattedTimeStr = `${timeMinutes.toString().padStart(2, '0')}:${timeSeconds.toString().padStart(2, '0')}`;

  // Initialize Persistent Storage
  useEffect(() => {
    try {
      const savedUnlocked = localStorage.getItem('stressbuster_maze_unlocked');
      if (savedUnlocked) setUnlockedLevel(Math.max(1, parseInt(savedUnlocked, 10)));

      const savedStars = localStorage.getItem('stressbuster_maze_stars');
      if (savedStars) setLevelStars(JSON.parse(savedStars));

      const savedTimes = localStorage.getItem('stressbuster_maze_times');
      if (savedTimes) setLevelBestTimes(JSON.parse(savedTimes));
    } catch {}
  }, []);

  // Web Audio Procedural Synthesis
  const playSfx = useCallback((type: 'step' | 'core' | 'key' | 'gate' | 'teleport' | 'boost' | 'warn' | 'win' | 'timeout') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'step') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'core') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'key') {
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + idx * 0.04);
          g.gain.setValueAtTime(0.14, now + idx * 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.04);
          o.stop(now + idx * 0.04 + 0.25);
        });
      } else if (type === 'gate') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'teleport') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.18);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'boost') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.15);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'warn') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(660, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.08);
          g.gain.setValueAtTime(0.15, now + idx * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.4);
        });
      } else if (type === 'timeout') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {}
  }, [soundEnabled]);

  // Load Level Map and Reset Entities
  const loadLevel = useCallback((lvlIdx: number) => {
    const level = MAZE_LEVELS[lvlIdx] || MAZE_LEVELS[0];
    const mapClone = level.map.map(row => [...row]);
    activeMapRef.current = mapClone;

    let spawnR = 1;
    let spawnC = 1;
    let coreCount = 0;

    for (let r = 0; r < level.gridHeight; r++) {
      for (let c = 0; c < level.gridWidth; c++) {
        const tile = mapClone[r][c];
        if (tile === TILE.SPAWN) {
          spawnR = r;
          spawnC = c;
        } else if (tile === TILE.CORE) {
          coreCount++;
        }
      }
    }

    playerGridPosRef.current = { r: spawnR, c: spawnC };
    playerRenderPosRef.current = { x: spawnC, y: spawnR };
    playerDirRef.current = { dr: 0, dc: 1 };
    trailParticlesRef.current = [];
    pulseRipplesRef.current = [];
    floatingTextsRef.current = [];

    setKeysHeld({ cyan: false, pink: false, gold: false });
    setCoresCollectedInLevel(0);
    setTotalCoresInLevel(coreCount);
    setTimeLeft(level.timeLimit);
    setSpeedBoostActive(false);
    setIsLevelCleared(false);
    setIsGameWonAll(false);
    setIsTimedOut(false);
  }, []);

  // Start Level Run
  const startLevel = (lvlIdx: number) => {
    setCurrentLevelIdx(lvlIdx);
    loadLevel(lvlIdx);
    setIsPlaying(true);
    setIsLevelSelectOpen(false);
  };

  // Timer Tick (1-Minute strict countdown)
  useEffect(() => {
    if (!isPlaying || isLevelCleared || isTimedOut) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setIsTimedOut(true);
          setIsPlaying(false);
          playSfx('timeout');
          return 0;
        }

        if (prev <= 11 && prev > 1) {
          playSfx('warn');
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPlaying, isLevelCleared, isTimedOut, playSfx]);

  // Player Move Request Logic
  const movePlayer = useCallback((dr: number, dc: number) => {
    if (!isPlaying || isLevelCleared || isTimedOut) return;

    const { r, c } = playerGridPosRef.current;
    const targetR = r + dr;
    const targetC = c + dc;
    const map = activeMapRef.current;
    const level = MAZE_LEVELS[currentLevelIdx];

    if (!map || targetR < 0 || targetR >= level.gridHeight || targetC < 0 || targetC >= level.gridWidth) {
      return;
    }

    const targetTile = map[targetR][targetC];

    // 1. Wall Collision
    if (targetTile === TILE.WALL) {
      return;
    }

    // 2. Cyan Security Gate Collision
    if (targetTile === TILE.GATE_CYAN) {
      if (keysHeldRef.current.cyan) {
        map[targetR][targetC] = TILE.EMPTY;
        playSfx('gate');
        pulseRipplesRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.5,
          r: 0.2,
          maxR: 1.5,
          color: '#C0F7FE',
          alpha: 1
        });
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'CYAN GATE UNLOCKED',
          color: '#000000',
          alpha: 1
        });
      } else {
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'REQUIRES CYAN KEY',
          color: '#FE90E8',
          alpha: 1
        });
        return;
      }
    }

    // 3. Pink Security Gate Collision
    if (targetTile === TILE.GATE_PINK) {
      if (keysHeldRef.current.pink) {
        map[targetR][targetC] = TILE.EMPTY;
        playSfx('gate');
        pulseRipplesRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.5,
          r: 0.2,
          maxR: 1.5,
          color: '#FE90E8',
          alpha: 1
        });
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'PINK GATE UNLOCKED',
          color: '#000000',
          alpha: 1
        });
      } else {
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'REQUIRES PINK KEY',
          color: '#FE90E8',
          alpha: 1
        });
        return;
      }
    }

    // 4. Gold Security Gate Collision
    if (targetTile === TILE.GATE_GOLD) {
      if (keysHeldRef.current.gold) {
        map[targetR][targetC] = TILE.EMPTY;
        playSfx('gate');
        pulseRipplesRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.5,
          r: 0.2,
          maxR: 1.5,
          color: '#F7CB46',
          alpha: 1
        });
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'MASTER GATE UNLOCKED',
          color: '#000000',
          alpha: 1
        });
      } else {
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'REQUIRES MASTER KEY',
          color: '#FE90E8',
          alpha: 1
        });
        return;
      }
    }

    // Update Grid Pos & Direction
    playerGridPosRef.current = { r: targetR, c: targetC };
    playerDirRef.current = { dr, dc };
    playSfx('step');

    // Add Trail Particle
    trailParticlesRef.current.push({
      x: c + 0.5,
      y: r + 0.5,
      alpha: 0.8,
      color: speedBoostActive ? '#FE90E8' : '#C0F7FE'
    });

    // Handle Item Pickups on target cell
    if (targetTile === TILE.CORE) {
      map[targetR][targetC] = TILE.EMPTY;
      setCoresCollectedInLevel(prev => prev + 1);
      setTotalScore(prev => prev + 100);
      playSfx('core');
      floatingTextsRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.2,
        text: '+100',
        color: '#000000',
        alpha: 1
      });
      pulseRipplesRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.5,
        r: 0.1,
        maxR: 1,
        color: '#F7CB46',
        alpha: 1
      });
    } else if (targetTile === TILE.KEY_CYAN) {
      map[targetR][targetC] = TILE.EMPTY;
      setKeysHeld(prev => ({ ...prev, cyan: true }));
      setTotalScore(prev => prev + 250);
      playSfx('key');
      floatingTextsRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.2,
        text: 'KEYCARD ACQUIRED!',
        color: '#000000',
        alpha: 1
      });
    } else if (targetTile === TILE.KEY_PINK) {
      map[targetR][targetC] = TILE.EMPTY;
      setKeysHeld(prev => ({ ...prev, pink: true }));
      setTotalScore(prev => prev + 250);
      playSfx('key');
      floatingTextsRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.2,
        text: 'PINK KEYCARD ACQUIRED!',
        color: '#000000',
        alpha: 1
      });
    } else if (targetTile === TILE.KEY_GOLD) {
      map[targetR][targetC] = TILE.EMPTY;
      setKeysHeld(prev => ({ ...prev, gold: true }));
      setTotalScore(prev => prev + 500);
      playSfx('key');
      floatingTextsRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.2,
        text: 'GOLD MASTER KEY ACQUIRED!',
        color: '#000000',
        alpha: 1
      });
    } else if (targetTile === TILE.SPEED_BOOST) {
      setSpeedBoostActive(true);
      playSfx('boost');
      floatingTextsRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.2,
        text: '⚡ OVERCLOCK BOOST!',
        color: '#000000',
        alpha: 1
      });
    } else if (targetTile === TILE.WARP_A || targetTile === TILE.WARP_B) {
      const destType = targetTile === TILE.WARP_A ? TILE.WARP_B : TILE.WARP_A;
      for (let wr = 0; wr < level.gridHeight; wr++) {
        for (let wc = 0; wc < level.gridWidth; wc++) {
          if (map[wr][wc] === destType) {
            playerGridPosRef.current = { r: wr, c: wc };
            playerRenderPosRef.current = { x: wc, y: wr };
            playSfx('teleport');
            pulseRipplesRef.current.push({
              x: wc + 0.5,
              y: wr + 0.5,
              r: 0.2,
              maxR: 2.2,
              color: '#FE90E8',
              alpha: 1
            });
            floatingTextsRef.current.push({
              x: wc + 0.5,
              y: wr + 0.2,
              text: 'QUANTUM WARP',
              color: '#000000',
              alpha: 1
            });
            break;
          }
        }
      }
    } else if (targetTile === TILE.EXIT) {
      handleLevelComplete();
    }
  }, [isPlaying, isLevelCleared, isTimedOut, currentLevelIdx, speedBoostActive, playSfx]);

  // Level Clear Handler
  const handleLevelComplete = () => {
    setIsLevelCleared(true);
    setIsPlaying(false);
    playSfx('win');

    const level = MAZE_LEVELS[currentLevelIdx];
    const timeUsed = level.timeLimit - timeLeft;
    const timeBonus = Math.max(0, timeLeft * 50);
    const levelClearBonus = (currentLevelIdx + 1) * 500;
    const finalLevelScore = totalScore + timeBonus + levelClearBonus;
    setTotalScore(finalLevelScore);

    let stars = 1;
    if (timeLeft >= 20) stars = 2;
    if (timeLeft >= (level.timeLimit - level.parTime)) stars = 3;

    const newStars = { ...levelStars, [currentLevelIdx + 1]: Math.max(levelStars[currentLevelIdx + 1] || 0, stars) };
    setLevelStars(newStars);
    try {
      localStorage.setItem('stressbuster_maze_stars', JSON.stringify(newStars));
    } catch {}

    const newBestTimes = {
      ...levelBestTimes,
      [currentLevelIdx + 1]: Math.min(levelBestTimes[currentLevelIdx + 1] || 999, timeUsed)
    };
    setLevelBestTimes(newBestTimes);
    try {
      localStorage.setItem('stressbuster_maze_times', JSON.stringify(newBestTimes));
    } catch {}

    const nextLvl = currentLevelIdx + 2;
    if (nextLvl <= MAZE_LEVELS.length && nextLvl > unlockedLevel) {
      setUnlockedLevel(nextLvl);
      try {
        localStorage.setItem('stressbuster_maze_unlocked', String(nextLvl));
      } catch {}
    }

    if (currentLevelIdx === MAZE_LEVELS.length - 1) {
      setIsGameWonAll(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else if (stars === 3) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }

    gamification.grantXp(150 + stars * 50, `Completed Maze Lvl ${currentLevelIdx + 1}`);
    onGameOver(finalLevelScore);
  };

  // Keyboard Event Listeners (Arrows & WASD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        movePlayer(-1, 0);
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        movePlayer(1, 0);
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        movePlayer(0, -1);
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        movePlayer(0, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, movePlayer]);

  // Touch Swipe Gesture Detection on Canvas
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartPosRef.current || e.changedTouches.length === 0) return;
    const start = touchStartPosRef.current;
    const end = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const minSwipeDist = 18;
    if (Math.max(absX, absY) > minSwipeDist) {
      if (absX > absY) {
        movePlayer(0, dx > 0 ? 1 : -1);
      } else {
        movePlayer(dy > 0 ? 1 : -1, 0);
      }
    }
    touchStartPosRef.current = null;
  };

  // HTML5 Canvas 2D Game Loop & Rendering (Neo-Brutalism)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const level = MAZE_LEVELS[currentLevelIdx] || MAZE_LEVELS[0];
      const map = activeMapRef.current;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear Screen with Warm Neo-Brutalism Ground
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, width, height);

      // 2. Dot Matrix Ground Grid
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let gx = 12; gx < width; gx += 20) {
        for (let gy = 12; gy < height; gy += 20) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (map.length === 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const gridW = level.gridWidth;
      const gridH = level.gridHeight;

      // Calculate Tile Cell Size to fit 360x640 Canvas with padding
      const paddingX = 14;
      const paddingY = 14;
      const availableW = width - paddingX * 2;
      const availableH = height - paddingY * 2;

      const tileSize = Math.min(availableW / gridW, availableH / gridH);
      const offsetX = paddingX + (availableW - gridW * tileSize) / 2;
      const offsetY = paddingY + (availableH - gridH * tileSize) / 2;

      // Smooth Interpolation for Player Render Position
      const targetRenderX = playerGridPosRef.current.c;
      const targetRenderY = playerGridPosRef.current.r;
      const lerpSpeed = speedBoostActive ? 22 : 14;
      playerRenderPosRef.current.x += (targetRenderX - playerRenderPosRef.current.x) * Math.min(1, dt * lerpSpeed);
      playerRenderPosRef.current.y += (targetRenderY - playerRenderPosRef.current.y) * Math.min(1, dt * lerpSpeed);

      const playerPxX = offsetX + (playerRenderPosRef.current.x + 0.5) * tileSize;
      const playerPxY = offsetY + (playerRenderPosRef.current.y + 0.5) * tileSize;

      // 3. Draw Floor Cells & Subtle Grid
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= gridH; r++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + r * tileSize);
        ctx.lineTo(offsetX + gridW * tileSize, offsetY + r * tileSize);
        ctx.stroke();
      }
      for (let c = 0; c <= gridW; c++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + c * tileSize, offsetY);
        ctx.lineTo(offsetX + c * tileSize, offsetY + gridH * tileSize);
        ctx.stroke();
      }

      // 4. Draw Tiles (Walls, Pickups, Gates, Portals)
      for (let r = 0; r < gridH; r++) {
        for (let c = 0; c < gridW; c++) {
          const tile = map[r][c];
          const x = offsetX + c * tileSize;
          const y = offsetY + r * tileSize;
          const cx = x + tileSize / 2;
          const cy = y + tileSize / 2;

          if (tile === TILE.WALL) {
            // Hard Drop Shadow (+2, +2)
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 2, y + 2, tileSize - 2, tileSize - 2);

            // Crisp White Wall Block
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x, y, tileSize - 2, tileSize - 2);

            // Solid Black Outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, tileSize - 2, tileSize - 2);

            // Center Pastel Swatch Accent
            ctx.fillStyle = '#FFDC8B';
            ctx.fillRect(x + tileSize * 0.35, y + tileSize * 0.35, tileSize * 0.3, tileSize * 0.3);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + tileSize * 0.35, y + tileSize * 0.35, tileSize * 0.3, tileSize * 0.3);
          } else if (tile === TILE.CORE) {
            // Energy Data Core (Pulsing Neo-Brutalist Diamond)
            const pulse = (Math.sin(time * 0.006 + r + c) + 1) * 0.5;
            const coreR = (tileSize * 0.22) + pulse * (tileSize * 0.05);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.002);

            // Shadow
            ctx.fillStyle = '#000000';
            ctx.fillRect(-coreR + 2, -coreR + 2, coreR * 2, coreR * 2);

            // Swatch
            ctx.fillStyle = '#F7CB46';
            ctx.fillRect(-coreR, -coreR, coreR * 2, coreR * 2);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(-coreR, -coreR, coreR * 2, coreR * 2);
            ctx.restore();
          } else if (tile === TILE.KEY_CYAN) {
            // Cyan Keycard
            ctx.save();
            ctx.translate(cx, cy + Math.sin(time * 0.005) * 2);

            // Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(2, -tileSize * 0.12 + 2, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06 + 2, -tileSize * 0.05 + 2, tileSize * 0.12, tileSize * 0.3);

            // Swatch
            ctx.fillStyle = '#C0F7FE';
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.fillRect(-tileSize * 0.06, tileSize * 0.15, tileSize * 0.18, tileSize * 0.08);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.restore();
          } else if (tile === TILE.KEY_PINK) {
            // Pink Keycard
            ctx.save();
            ctx.translate(cx, cy + Math.sin(time * 0.005 + 1) * 2);

            // Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(2, -tileSize * 0.12 + 2, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06 + 2, -tileSize * 0.05 + 2, tileSize * 0.12, tileSize * 0.3);

            // Swatch
            ctx.fillStyle = '#FE90E8';
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.fillRect(-tileSize * 0.06, tileSize * 0.15, tileSize * 0.18, tileSize * 0.08);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.restore();
          } else if (tile === TILE.KEY_GOLD) {
            // Gold Master Key
            ctx.save();
            ctx.translate(cx, cy + Math.sin(time * 0.005 + 2) * 2);

            // Shadow
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(2, -tileSize * 0.12 + 2, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06 + 2, -tileSize * 0.05 + 2, tileSize * 0.12, tileSize * 0.3);

            // Swatch
            ctx.fillStyle = '#F7CB46';
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.fillRect(-tileSize * 0.06, tileSize * 0.15, tileSize * 0.18, tileSize * 0.08);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.restore();
          } else if (tile === TILE.GATE_CYAN) {
            // Cyan Laser Security Gate
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 3, y + 3, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#C0F7FE';
            ctx.fillRect(x + 1, y + 1, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 1, y + 1, tileSize - 4, tileSize - 4);

            // Hazard stripes
            ctx.beginPath();
            ctx.moveTo(x + 2, y + tileSize - 4);
            ctx.lineTo(x + tileSize - 4, y + 2);
            ctx.stroke();
          } else if (tile === TILE.GATE_PINK) {
            // Pink Laser Security Gate
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 3, y + 3, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#FE90E8';
            ctx.fillRect(x + 1, y + 1, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 1, y + 1, tileSize - 4, tileSize - 4);

            ctx.beginPath();
            ctx.moveTo(x + 2, y + tileSize - 4);
            ctx.lineTo(x + tileSize - 4, y + 2);
            ctx.stroke();
          } else if (tile === TILE.GATE_GOLD) {
            // Gold Master Security Gate
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 3, y + 3, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#F7CB46';
            ctx.fillRect(x + 1, y + 1, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 1, y + 1, tileSize - 4, tileSize - 4);

            ctx.beginPath();
            ctx.moveTo(x + 2, y + tileSize - 4);
            ctx.lineTo(x + tileSize - 4, y + 2);
            ctx.stroke();
          } else if (tile === TILE.WARP_A || tile === TILE.WARP_B) {
            // Quantum Teleport Jump Pad
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.003);

            ctx.fillStyle = '#000000';
            ctx.fillRect(-tileSize * 0.35 + 2, -tileSize * 0.35 + 2, tileSize * 0.7, tileSize * 0.7);

            ctx.fillStyle = '#FE90E8';
            ctx.fillRect(-tileSize * 0.35, -tileSize * 0.35, tileSize * 0.7, tileSize * 0.7);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(-tileSize * 0.35, -tileSize * 0.35, tileSize * 0.7, tileSize * 0.7);

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, tileSize * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          } else if (tile === TILE.SPEED_BOOST) {
            // Overclock Speed Pad
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 3, y + 3, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#99E885';
            ctx.fillRect(x + 1, y + 1, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 1, y + 1, tileSize - 4, tileSize - 4);

            ctx.fillStyle = '#000000';
            ctx.font = `bold ${Math.floor(tileSize * 0.55)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', cx, cy);
          } else if (tile === TILE.EXIT) {
            // Exit Portal Vortex Gateway
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.004);

            ctx.fillStyle = '#000000';
            ctx.fillRect(-tileSize * 0.4 + 2.5, -tileSize * 0.4 + 2.5, tileSize * 0.8, tileSize * 0.8);

            ctx.fillStyle = '#99E885';
            ctx.fillRect(-tileSize * 0.4, -tileSize * 0.4, tileSize * 0.8, tileSize * 0.8);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeRect(-tileSize * 0.4, -tileSize * 0.4, tileSize * 0.8, tileSize * 0.8);

            ctx.fillStyle = '#C0F7FE';
            ctx.fillRect(-tileSize * 0.22, -tileSize * 0.22, tileSize * 0.44, tileSize * 0.44);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(-tileSize * 0.22, -tileSize * 0.22, tileSize * 0.44, tileSize * 0.44);
            ctx.restore();
          }
        }
      }

      // 5. Draw Trail Particles
      for (let i = trailParticlesRef.current.length - 1; i >= 0; i--) {
        const p = trailParticlesRef.current[i];
        p.alpha -= dt * 2.2;
        if (p.alpha <= 0) {
          trailParticlesRef.current.splice(i, 1);
          continue;
        }

        const px = offsetX + p.x * tileSize;
        const py = offsetY + p.y * tileSize;

        ctx.fillStyle = '#000000';
        ctx.globalAlpha = p.alpha * 0.4;
        ctx.fillRect(px - tileSize * 0.15, py - tileSize * 0.15, tileSize * 0.3, tileSize * 0.3);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(px - tileSize * 0.15, py - tileSize * 0.15, tileSize * 0.3, tileSize * 0.3);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - tileSize * 0.15, py - tileSize * 0.15, tileSize * 0.3, tileSize * 0.3);
        ctx.globalAlpha = 1.0;
      }

      // 6. Draw Player Runner Node (Neo-Brutalist Avatar with Hard Shadow & Solid Border)
      ctx.save();
      ctx.translate(playerPxX, playerPxY);

      const pColor = speedBoostActive ? '#FE90E8' : '#C0F7FE';
      const playerRadius = tileSize * 0.36;

      // Hard Drop Shadow
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(2.5, 2.5, playerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Body Circle
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner Core / Pupil
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Heading Direction Arrow Indicator
      const { dr, dc } = playerDirRef.current;
      const angle = Math.atan2(dr, dc);
      ctx.rotate(angle);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(playerRadius * 0.7, 0);
      ctx.lineTo(playerRadius * 0.2, -playerRadius * 0.35);
      ctx.lineTo(playerRadius * 0.2, playerRadius * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 7. Draw Pulse Ripples
      for (let i = pulseRipplesRef.current.length - 1; i >= 0; i--) {
        const r = pulseRipplesRef.current[i];
        r.r += dt * 3.5;
        r.alpha -= dt * 2.0;
        if (r.alpha <= 0 || r.r >= r.maxR) {
          pulseRipplesRef.current.splice(i, 1);
          continue;
        }

        const rx = offsetX + r.x * tileSize;
        const ry = offsetY + r.y * tileSize;

        ctx.strokeStyle = '#000000';
        ctx.globalAlpha = r.alpha;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(rx, ry, r.r * tileSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // 8. Draw Floating Text Popups
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= dt * 0.8;
        ft.alpha -= dt * 1.5;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
          continue;
        }

        const fx = offsetX + ft.x * tileSize;
        const fy = offsetY + ft.y * tileSize;

        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';

        // Shadow
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = ft.alpha;
        ctx.fillText(ft.text, fx + 1.5, fy + 1.5);

        // Foreground
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, fx, fy);
        ctx.globalAlpha = 1.0;
      }

      // 9. Darknet Radar / Fog of War (Levels with darkRadar)
      if (level.darkRadar) {
        ctx.save();
        const radarRadius = tileSize * 3.8;
        const grad = ctx.createRadialGradient(playerPxX, playerPxY, tileSize * 0.8, playerPxX, playerPxY, radarRadius);
        grad.addColorStop(0, 'rgba(250, 248, 245, 0)');
        grad.addColorStop(0.7, 'rgba(250, 248, 245, 0.7)');
        grad.addColorStop(1, 'rgba(250, 248, 245, 0.98)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Perimeter line
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(playerPxX, playerPxY, radarRadius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentLevelIdx, speedBoostActive]);

  return (
    <div className="relative w-full max-w-[380px] flex flex-col items-center select-none font-sans">
      {/* TOP RUNNING COUNTDOWN TIMER BANNER */}
      <div className="w-full mb-2 p-2.5 rounded-2xl bg-white border-3 border-black shadow-neo-sm flex flex-col gap-1.5">
        {/* Top Controls & Timer Readout */}
        <div className="flex items-center justify-between">
          {/* Left: Sector Level & Score */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsLevelSelectOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-portal-yellow hover:bg-portal-cyan border-2 border-black text-black text-[11px] font-black shadow-neo-xs hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all"
              title="Select Sector Level"
            >
              <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>LVL {currentLevelIdx + 1}</span>
            </button>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-portal-butter border-2 border-black text-[11px] font-black text-black shadow-neo-xs">
              <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{totalScore}</span>
            </div>
          </div>

          {/* Center: Running Countdown Display */}
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-black text-xs sm:text-sm border-2 border-black shadow-neo-xs transition-all ${
                timeLeft <= 10
                  ? 'bg-portal-pink text-black animate-pulse'
                  : timeLeft <= 20
                  ? 'bg-portal-yellow text-black'
                  : 'bg-portal-cyan text-black'
              }`}
            >
              <Timer className={`w-3.5 h-3.5 stroke-[2.5] ${timeLeft <= 10 ? 'animate-spin' : ''}`} />
              <span>{formattedTimeStr}</span>
            </div>
          </div>

          {/* Right: Sound Toggle */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-1.5 rounded-lg bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none"
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />}
            </button>
          </div>
        </div>

        {/* Running Depletion Progress Bar */}
        <div className="w-full flex flex-col gap-0.5">
          <div className="w-full h-3 rounded-full bg-[#FAF8F5] border-2 border-black overflow-hidden p-0.5 relative shadow-neo-xs">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear border-r-2 border-black ${
                timeLeft <= 10
                  ? 'bg-portal-pink'
                  : timeLeft <= 20
                  ? 'bg-portal-yellow'
                  : 'bg-portal-green'
              }`}
              style={{ width: `${timeProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono font-black tracking-wider px-0.5 text-black">
            <span className="uppercase">
              {timeLeft <= 10 ? '🚨 TIME CRITICAL' : timeLeft <= 20 ? '⚠️ TIME WARNING' : '⏱️ TIME REMAINING'}
            </span>
            <span>
              {timeLeft}s / {timeLimit}s ({Math.round(timeProgress)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Level Info & Keys Strip */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-white border-3 border-black shadow-neo-sm text-[10px]">
        <div className="flex items-center gap-1.5 text-black font-black">
          <span className="uppercase tracking-wider">{currentLevel.name}</span>
          <span className="text-slate-400">•</span>
          <span className="bg-[#FAF8F5] px-2 py-0.5 rounded-lg border-2 border-black text-[10px]">
            Cores: <strong>{coresCollectedInLevel}/{totalCoresInLevel}</strong>
          </span>
        </div>

        {/* Keycards Inventory */}
        <div className="flex items-center gap-1">
          {keysHeld.cyan && (
            <span className="px-1.5 py-0.5 rounded-md bg-portal-cyan text-black font-black border-2 border-black shadow-neo-xs">
              🔑 CYAN
            </span>
          )}
          {keysHeld.pink && (
            <span className="px-1.5 py-0.5 rounded-md bg-portal-pink text-black font-black border-2 border-black shadow-neo-xs">
              🔑 PINK
            </span>
          )}
          {keysHeld.gold && (
            <span className="px-1.5 py-0.5 rounded-md bg-portal-yellow text-black font-black border-2 border-black shadow-neo-xs">
              🔑 GOLD
            </span>
          )}
        </div>
      </div>

      {/* Main Game Viewport - Standard 9:16 Portrait Canvas with Figma Corner Handles */}
      <div className="relative w-full aspect-[9/16] bg-[#FAF8F5] rounded-2xl overflow-hidden border-4 border-black shadow-neo-lg flex items-center justify-center touch-none">
        {/* Figma Corner Handles */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-black shadow-neo-xs z-20 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full object-contain cursor-pointer block select-none"
        />

        {/* Start / Intro Screen */}
        {!isPlaying && !isLevelCleared && !isTimedOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fadeIn z-10">
            <div className="relative bg-white border-4 border-black rounded-2xl p-4 sm:p-5 shadow-neo-xl w-full max-w-[310px] space-y-3 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div>
                <span className="inline-block px-3 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider shadow-neo-xs">
                  • [ SECTOR BREACH ] •
                </span>
                <h2 className="text-xl font-black text-black mt-1 uppercase">
                  {currentLevel.name}
                </h2>
                <p className="text-xs text-slate-700 font-bold">{currentLevel.subtitle}</p>
              </div>

              <div className="bg-[#FAF8F5] border-2 border-black rounded-xl p-3 w-full text-left text-xs space-y-1.5 text-black font-bold shadow-neo-xs">
                <div className="flex items-center justify-between">
                  <span>Time Limit:</span>
                  <strong className="bg-portal-yellow px-1.5 py-0.5 rounded border border-black">60 SECONDS</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Objective:</span>
                  <strong className="text-black">Collect Cores & Exit</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Controls:</span>
                  <strong className="text-black">Swipe / D-Pad / Arrows</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => startLevel(currentLevelIdx)}
                  className="flex-1 py-3 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-black stroke-[2.5]" />
                  <span>START BREACH</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLevelSelectOpen(true)}
                  className="px-3.5 py-3 rounded-xl bg-white hover:bg-portal-butter border-3 border-black text-black text-xs font-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all"
                >
                  Levels
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Level Clear Overlay */}
        {isLevelCleared && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fadeIn z-10">
            <div className="relative bg-white border-4 border-black rounded-2xl p-4 sm:p-5 shadow-neo-xl w-full max-w-[310px] space-y-3 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div>
                <span className="inline-block px-3 py-0.5 rounded-md bg-portal-green border-2 border-black text-black text-[10px] font-black uppercase tracking-wider shadow-neo-xs">
                  🏆 SECTOR OVERRIDDEN
                </span>
                <h2 className="text-lg font-black text-black mt-1 uppercase">
                  {isGameWonAll ? 'ALL 10 SECTORS CLEARED!' : 'BREACH SUCCESS!'}
                </h2>
                <p className="text-xs text-slate-700 font-black">
                  Cleared with {timeLeft}s remaining!
                </p>
              </div>

              {/* Stars */}
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map(s => {
                  const earned = (levelStars[currentLevelIdx + 1] || 1) >= s;
                  return (
                    <Star
                      key={s}
                      className={`w-7 h-7 stroke-[2.5] ${
                        earned ? 'text-black fill-portal-yellow' : 'text-slate-300 fill-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="bg-[#FAF8F5] border-2 border-black rounded-xl p-3 w-full text-left text-xs space-y-1 text-black font-bold shadow-neo-xs">
                <div className="flex items-center justify-between">
                  <span>Time Bonus:</span>
                  <strong className="text-black">+{timeLeft * 50} pts</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cores Gathered:</span>
                  <strong className="text-black">{coresCollectedInLevel}/{totalCoresInLevel}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-black/20 pt-1">
                  <span>Total Score:</span>
                  <strong className="text-black font-mono font-black text-sm">{totalScore} pts</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => startLevel(currentLevelIdx)}
                  className="px-3.5 py-3 rounded-xl bg-white hover:bg-portal-butter border-3 border-black text-black text-xs font-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-1"
                  title="Replay Level"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Replay</span>
                </button>

                {currentLevelIdx < MAZE_LEVELS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => startLevel(currentLevelIdx + 1)}
                    className="flex-1 py-3 px-4 rounded-xl bg-portal-cyan hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1"
                  >
                    <span>NEXT SECTOR</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsLevelSelectOpen(true)}
                    className="flex-1 py-3 px-4 rounded-xl bg-portal-yellow hover:bg-portal-cyan text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    LEVEL SELECT
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeout Fail Overlay */}
        {isTimedOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fadeIn z-10">
            <div className="relative bg-white border-4 border-black rounded-2xl p-4 sm:p-5 shadow-neo-xl w-full max-w-[310px] space-y-3 text-center text-black animate-scaleIn">
              {/* Figma Handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black pointer-events-none" />

              <div>
                <span className="inline-block px-3 py-0.5 rounded-md bg-portal-pink border-2 border-black text-black text-[10px] font-black uppercase tracking-wider shadow-neo-xs">
                  ⚡ SYSTEM PURGE ⚡
                </span>
                <h2 className="text-lg font-black text-black mt-1 uppercase">
                  BREACH TIMEOUT!
                </h2>
                <p className="text-xs text-slate-700 font-bold">
                  The 60-second window expired.
                </p>
              </div>

              <button
                type="button"
                onClick={() => startLevel(currentLevelIdx)}
                className="w-full py-3 px-4 rounded-xl bg-portal-pink hover:bg-portal-yellow text-black font-black text-xs uppercase tracking-wider border-3 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>RETRY SECTOR (60s)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* On-Screen Mobile Virtual D-Pad */}
      <div className="w-full mt-2.5 grid grid-cols-3 gap-2 max-w-[260px] p-2 bg-white rounded-2xl border-3 border-black shadow-neo-sm">
        <div />
        <button
          type="button"
          onClick={() => movePlayer(-1, 0)}
          className="h-11 rounded-xl bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black text-base flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          aria-label="Up"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div />

        <button
          type="button"
          onClick={() => movePlayer(0, -1)}
          className="h-11 rounded-xl bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black text-base flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          aria-label="Left"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={() => movePlayer(1, 0)}
          className="h-11 rounded-xl bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black text-base flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          aria-label="Down"
        >
          <ArrowDown className="w-5 h-5 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={() => movePlayer(0, 1)}
          className="h-11 rounded-xl bg-white hover:bg-portal-yellow text-black border-2 border-black shadow-neo-xs font-black text-base flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          aria-label="Right"
        >
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Level Selection Drawer / Modal */}
      {isLevelSelectOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative bg-white border-4 border-black rounded-3xl w-full max-w-[360px] max-h-[85vh] flex flex-col overflow-hidden shadow-neo-xl">
            {/* Header */}
            <div className="px-4 py-3 border-b-3 border-black flex items-center justify-between bg-portal-yellow">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-black stroke-[2.5]" />
                <h3 className="text-sm font-black text-black uppercase">MAZE SECTOR SELECT</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLevelSelectOpen(false)}
                className="p-1 rounded-lg bg-white border-2 border-black text-black hover:bg-portal-pink font-black shadow-neo-xs transition-all"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-2 flex-1 bg-[#FAF8F5]">
              {MAZE_LEVELS.map((lvl, idx) => {
                const isLocked = idx + 1 > unlockedLevel;
                const stars = levelStars[idx + 1] || 0;
                const isCurrent = idx === currentLevelIdx;

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => startLevel(idx)}
                    className={`w-full p-2.5 rounded-xl border-3 border-black flex items-center justify-between text-left transition-all ${
                      isCurrent
                        ? 'bg-portal-yellow shadow-neo'
                        : isLocked
                        ? 'bg-slate-200 opacity-50 cursor-not-allowed border-slate-400'
                        : 'bg-white shadow-neo-xs hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:shadow-none'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs ${
                          isCurrent
                            ? 'bg-black text-white'
                            : isLocked
                            ? 'bg-slate-400 text-black'
                            : 'bg-portal-cyan text-black'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-black leading-tight">{lvl.name}</h4>
                        <p className="text-[10px] text-slate-600 font-bold">{lvl.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 stroke-[2] ${
                            stars >= s ? 'text-black fill-portal-yellow' : 'text-slate-300 fill-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
