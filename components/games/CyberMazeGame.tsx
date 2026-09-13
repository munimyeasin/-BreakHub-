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
  Check
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
        // High sparkling pickup chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'key') {
        // Triumphant dual synth chord
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
        // Laser barrier dissolution hum
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'teleport') {
        // Quantum warp frequency sweep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.18);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'boost') {
        // Turbo overclock hiss
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.15);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'warn') {
        // Low time alarm pulse
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(660, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'win') {
        // Victory fanfare
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
        // Failure buzzer
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

    // Find spawn position and total data cores
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
          // Timeout reached
          clearInterval(timerIntervalRef.current!);
          setIsTimedOut(true);
          setIsPlaying(false);
          playSfx('timeout');
          return 0;
        }

        // Low time audio pulse
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
          color: '#00f0ff',
          alpha: 1
        });
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'CYAN GATE UNLOCKED',
          color: '#00f0ff',
          alpha: 1
        });
      } else {
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'REQUIRES CYAN KEY',
          color: '#ff0055',
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
          color: '#ff00ea',
          alpha: 1
        });
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'PINK GATE UNLOCKED',
          color: '#ff00ea',
          alpha: 1
        });
      } else {
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'REQUIRES PINK KEY',
          color: '#ff0055',
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
          color: '#ffd700',
          alpha: 1
        });
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'MASTER GATE UNLOCKED',
          color: '#ffd700',
          alpha: 1
        });
      } else {
        floatingTextsRef.current.push({
          x: targetC + 0.5,
          y: targetR + 0.2,
          text: 'REQUIRES MASTER KEY',
          color: '#ff0055',
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
      color: speedBoostActive ? '#ff00ea' : '#00f0ff'
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
        color: '#00f0ff',
        alpha: 1
      });
      pulseRipplesRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.5,
        r: 0.1,
        maxR: 1,
        color: '#00f0ff',
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
        color: '#00f0ff',
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
        color: '#ff00ea',
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
        color: '#ffd700',
        alpha: 1
      });
    } else if (targetTile === TILE.SPEED_BOOST) {
      setSpeedBoostActive(true);
      playSfx('boost');
      floatingTextsRef.current.push({
        x: targetC + 0.5,
        y: targetR + 0.2,
        text: '⚡ OVERCLOCK BOOST!',
        color: '#ffe600',
        alpha: 1
      });
    } else if (targetTile === TILE.WARP_A || targetTile === TILE.WARP_B) {
      // Find matching destination portal
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
              color: '#a855f7',
              alpha: 1
            });
            floatingTextsRef.current.push({
              x: wc + 0.5,
              y: wr + 0.2,
              text: 'QUANTUM WARP',
              color: '#a855f7',
              alpha: 1
            });
            break;
          }
        }
      }
    } else if (targetTile === TILE.EXIT) {
      // Level Complete Victory Trigger
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

    // Calculate Stars (1-3)
    let stars = 1;
    if (timeLeft >= 20) stars = 2;
    if (timeLeft >= (level.timeLimit - level.parTime)) stars = 3;

    // Save Progress
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

    // Unlock Next Level
    const nextLvl = currentLevelIdx + 2;
    if (nextLvl <= MAZE_LEVELS.length && nextLvl > unlockedLevel) {
      setUnlockedLevel(nextLvl);
      try {
        localStorage.setItem('stressbuster_maze_unlocked', String(nextLvl));
      } catch {}
    }

    // Check All Levels Won
    if (currentLevelIdx === MAZE_LEVELS.length - 1) {
      setIsGameWonAll(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else if (stars === 3) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }

    // Gamification Hook: Award XP & sync score
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

  // HTML5 Canvas 2D Game Loop & Rendering
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

      // Clear Screen with Dark Cyberpunk Grid Background
      ctx.fillStyle = '#060312';
      ctx.fillRect(0, 0, width, height);

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

      // 1. Draw Maze Grid Background & Floor Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
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

      // 2. Draw Tiles (Walls, Pickups, Gates, Portals)
      for (let r = 0; r < gridH; r++) {
        for (let c = 0; c < gridW; c++) {
          const tile = map[r][c];
          const x = offsetX + c * tileSize;
          const y = offsetY + r * tileSize;
          const cx = x + tileSize / 2;
          const cy = y + tileSize / 2;

          if (tile === TILE.WALL) {
            // Neon Cyberpunk Wall Block
            ctx.fillStyle = '#0f0926';
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

            ctx.strokeStyle = '#1e144a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

            // Wall Neon Circuit Accent
            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.fillRect(x + tileSize * 0.35, y + tileSize * 0.35, tileSize * 0.3, tileSize * 0.3);
          } else if (tile === TILE.CORE) {
            // Energy Data Core (Pulsing diamond)
            const pulse = (Math.sin(time * 0.006 + r + c) + 1) * 0.5;
            const coreR = (tileSize * 0.22) + pulse * (tileSize * 0.06);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.002);
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.fillRect(-coreR, -coreR, coreR * 2, coreR * 2);
            ctx.restore();
          } else if (tile === TILE.KEY_CYAN) {
            // Cyan Keycard
            ctx.save();
            ctx.translate(cx, cy + Math.sin(time * 0.005) * 2);
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.fillRect(-tileSize * 0.06, tileSize * 0.15, tileSize * 0.18, tileSize * 0.08);
            ctx.restore();
          } else if (tile === TILE.KEY_PINK) {
            // Pink Keycard
            ctx.save();
            ctx.translate(cx, cy + Math.sin(time * 0.005 + 1) * 2);
            ctx.fillStyle = '#ff00ea';
            ctx.shadowColor = '#ff00ea';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.fillRect(-tileSize * 0.06, tileSize * 0.15, tileSize * 0.18, tileSize * 0.08);
            ctx.restore();
          } else if (tile === TILE.KEY_GOLD) {
            // Gold Master Key
            ctx.save();
            ctx.translate(cx, cy + Math.sin(time * 0.005 + 2) * 2);
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, -tileSize * 0.12, tileSize * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-tileSize * 0.06, -tileSize * 0.05, tileSize * 0.12, tileSize * 0.3);
            ctx.fillRect(-tileSize * 0.06, tileSize * 0.15, tileSize * 0.18, tileSize * 0.08);
            ctx.restore();
          } else if (tile === TILE.GATE_CYAN) {
            // Cyan Laser Security Gate
            ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 9;
            ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

            // Diagonal hazard stripes
            ctx.beginPath();
            ctx.moveTo(x + 3, y + tileSize - 3);
            ctx.lineTo(x + tileSize - 3, y + 3);
            ctx.stroke();
          } else if (tile === TILE.GATE_PINK) {
            // Pink Laser Security Gate
            ctx.fillStyle = 'rgba(255, 0, 234, 0.18)';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#ff00ea';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ff00ea';
            ctx.shadowBlur = 9;
            ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

            ctx.beginPath();
            ctx.moveTo(x + 3, y + tileSize - 3);
            ctx.lineTo(x + tileSize - 3, y + 3);
            ctx.stroke();
          } else if (tile === TILE.GATE_GOLD) {
            // Gold Master Security Gate
            ctx.fillStyle = 'rgba(255, 215, 0, 0.22)';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

            ctx.beginPath();
            ctx.moveTo(x + 3, y + tileSize - 3);
            ctx.lineTo(x + tileSize - 3, y + 3);
            ctx.stroke();
          } else if (tile === TILE.WARP_A || tile === TILE.WARP_B) {
            // Quantum Teleport Jump Pad
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.003);
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10;
            ctx.strokeRect(-tileSize * 0.35, -tileSize * 0.35, tileSize * 0.7, tileSize * 0.7);

            ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, tileSize * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (tile === TILE.SPEED_BOOST) {
            // Overclock Speed Pad
            ctx.fillStyle = 'rgba(255, 230, 0, 0.2)';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#ffe600';
            ctx.shadowColor = '#ffe600';
            ctx.shadowBlur = 8;
            ctx.font = `bold ${Math.floor(tileSize * 0.55)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', cx, cy);
          } else if (tile === TILE.EXIT) {
            // Exit Portal (Spinning vortex gateway)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.004);

            const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, tileSize * 0.45);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.4, '#00ff88');
            gradient.addColorStop(0.8, '#00f0ff');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, tileSize * 0.45, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 12;
            ctx.strokeRect(-tileSize * 0.3, -tileSize * 0.3, tileSize * 0.6, tileSize * 0.6);
            ctx.restore();
          }
        }
      }

      // 3. Draw Trail Particles
      for (let i = trailParticlesRef.current.length - 1; i >= 0; i--) {
        const p = trailParticlesRef.current[i];
        p.alpha -= dt * 2.2;
        if (p.alpha <= 0) {
          trailParticlesRef.current.splice(i, 1);
          continue;
        }

        const px = offsetX + p.x * tileSize;
        const py = offsetY + p.y * tileSize;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(px, py, tileSize * 0.16 * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 4. Draw Player Runner Node
      ctx.save();
      ctx.translate(playerPxX, playerPxY);

      // Player Glow Aura
      const pColor = speedBoostActive ? '#ff00ea' : '#00f0ff';
      const playerRadius = tileSize * 0.36;

      ctx.fillStyle = pColor;
      ctx.shadowColor = pColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner Core
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Heading Direction Indicator Needle
      const { dr, dc } = playerDirRef.current;
      const angle = Math.atan2(dr, dc);
      ctx.rotate(angle);
      ctx.fillStyle = '#060312';
      ctx.beginPath();
      ctx.moveTo(playerRadius * 0.7, 0);
      ctx.lineTo(playerRadius * 0.2, -playerRadius * 0.35);
      ctx.lineTo(playerRadius * 0.2, playerRadius * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 5. Draw Pulse Ripples
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

        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.alpha;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx, ry, r.r * tileSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // 6. Draw Floating Text Popups
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

        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, fx, fy);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      // 7. Darknet Radar / Fog of War (Levels with darkRadar)
      if (level.darkRadar) {
        ctx.save();
        const radarRadius = tileSize * 3.8;
        const grad = ctx.createRadialGradient(playerPxX, playerPxY, tileSize * 0.8, playerPxX, playerPxY, radarRadius);
        grad.addColorStop(0, 'rgba(6, 3, 18, 0)');
        grad.addColorStop(0.7, 'rgba(6, 3, 18, 0.7)');
        grad.addColorStop(1, 'rgba(6, 3, 18, 0.96)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Ambient radar sweep line
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1.5;
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
      <div
        className={`w-full mb-1.5 p-2 rounded-2xl border transition-all duration-300 shadow-xl flex flex-col gap-1.5 ${
          timeLeft <= 10
            ? 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.35)] animate-pulse'
            : timeLeft <= 20
            ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
            : 'bg-portal-surface/95 border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
        }`}
      >
        {/* Top Timer Bar Controls & Readout */}
        <div className="flex items-center justify-between">
          {/* Left: Sector Level & Score */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsLevelSelectOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-portal-card border border-portal-cyan/40 text-portal-cyan text-[11px] font-black hover:bg-portal-cyan/15 active:scale-95 transition-all shadow-sm"
              title="Select Sector Level"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>LVL {currentLevelIdx + 1}</span>
            </button>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-portal-card/80 border border-portal-border/60 text-[11px] font-bold text-slate-300">
              <Trophy className="w-3.5 h-3.5 text-portal-gold" />
              <span>{totalScore}</span>
            </div>
          </div>

          {/* Center: Running Countdown Display */}
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-xl font-mono font-black text-sm tracking-wider transition-all shadow-md ${
                timeLeft <= 10
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-400'
                  : timeLeft <= 20
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60'
                  : 'bg-cyan-500/20 text-portal-cyan border border-cyan-400/50'
              }`}
            >
              <Timer className={`w-3.5 h-3.5 ${timeLeft <= 10 ? 'text-rose-400 animate-spin' : 'text-portal-cyan'}`} />
              <span>{formattedTimeStr}</span>
            </div>
          </div>

          {/* Right: Sound Toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-1 rounded-lg bg-portal-card border border-portal-border text-slate-300 hover:text-white transition-colors"
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
            </button>
          </div>
        </div>

        {/* Running Depletion Progress Bar */}
        <div className="w-full flex flex-col gap-0.5">
          <div className="w-full h-2 rounded-full bg-black/60 border border-portal-border/60 overflow-hidden p-[1px] relative">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear relative ${
                timeLeft <= 10
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(244,63,94,0.9)]'
                  : timeLeft <= 20
                  ? 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                  : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(0,240,255,0.8)]'
              }`}
              style={{ width: `${timeProgress}%` }}
            >
              {/* Leading edge neon spark runner */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff] -mr-1" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono tracking-wider px-0.5">
            <span className="text-slate-400 uppercase">
              {timeLeft <= 10 ? '🚨 TIME CRITICAL' : timeLeft <= 20 ? '⚠️ TIME WARNING' : '⏱️ TIME REMAINING'}
            </span>
            <span
              className={`font-black ${
                timeLeft <= 10 ? 'text-rose-400 animate-pulse' : timeLeft <= 20 ? 'text-amber-300' : 'text-portal-cyan'
              }`}
            >
              {timeLeft}s / {timeLimit}s ({Math.round(timeProgress)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Level Info & Keys Strip */}
      <div className="w-full flex items-center justify-between px-3 py-1 mb-1.5 rounded-lg bg-portal-card/60 border border-portal-border/50 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="font-extrabold text-portal-cyan uppercase tracking-wider">{currentLevel.name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            Cores: <strong className="text-white">{coresCollectedInLevel}/{totalCoresInLevel}</strong>
          </span>
        </div>

        {/* Keycards Inventory */}
        <div className="flex items-center gap-1">
          {keysHeld.cyan && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-portal-cyan font-black border border-cyan-500/40">
              🔑 CYAN
            </span>
          )}
          {keysHeld.pink && (
            <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-portal-pink font-black border border-fuchsia-500/40">
              🔑 PINK
            </span>
          )}
          {keysHeld.gold && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-portal-gold font-black border border-amber-500/40">
              🔑 GOLD
            </span>
          )}
        </div>
      </div>

      {/* Main Game Viewport - Standard 9:16 Portrait Canvas */}
      <div className="relative w-full aspect-[9/16] bg-[#060312] rounded-2xl overflow-hidden border border-portal-border/80 shadow-2xl flex items-center justify-center">
        {/* Top-Pinned In-Game Timer Overlay during Active Play */}
        {isPlaying && (
          <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-portal-border/60 text-[10px] pointer-events-none animate-fadeIn">
            <div className="flex items-center gap-1 text-slate-300">
              <span className="font-bold text-portal-cyan font-mono text-[9px] uppercase">{currentLevel.name}</span>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                timeLeft <= 10
                  ? 'bg-rose-500/30 text-rose-300 animate-pulse border border-rose-400/50'
                  : timeLeft <= 20
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                  : 'bg-cyan-500/20 text-portal-cyan border border-cyan-400/30'
              }`}
            >
              <Timer className="w-3 h-3" />
              <span>{formattedTimeStr}</span>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Start / Intro Screen */}
        {!isPlaying && !isLevelCleared && !isTimedOut && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn z-10">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-portal-cyan flex items-center justify-center shadow-glow-cyan mb-3">
              <Layers className="w-7 h-7 text-portal-cyan" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wider mb-1 uppercase">
              {currentLevel.name}
            </h2>
            <p className="text-xs text-portal-cyan font-semibold mb-3">{currentLevel.subtitle}</p>

            <div className="bg-portal-card/80 border border-portal-border rounded-xl p-3 w-full text-left text-xs mb-4 space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Time Limit:</span>
                <strong className="text-portal-gold font-mono">60 SECONDS</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Objective:</span>
                <strong className="text-white">Collect Cores & Reach Exit</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Controls:</span>
                <strong className="text-portal-cyan">Swipe / D-Pad / Arrows</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => startLevel(currentLevelIdx)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-portal-cyan to-portal-neon text-black font-black text-xs uppercase tracking-wider hover:shadow-glow-cyan active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>START INFILTRATION</span>
              </button>
              <button
                onClick={() => setIsLevelSelectOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-portal-card border border-portal-border text-slate-300 hover:text-white text-xs font-bold"
              >
                Levels
              </button>
            </div>
          </div>
        )}

        {/* Level Clear Overlay */}
        {isLevelCleared && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400 flex items-center justify-center shadow-glow-cyan mb-2">
              <Award className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-lg font-black text-white tracking-wider uppercase mb-1">
              {isGameWonAll ? 'MAINFRAME PURGED - ALL LEVELS CLEARED!' : 'SECTOR OVERRIDDEN!'}
            </h2>
            <p className="text-xs text-portal-cyan font-bold mb-3">
              Cleared with {timeLeft}s remaining!
            </p>

            {/* Stars */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map(s => {
                const earned = (levelStars[currentLevelIdx + 1] || 1) >= s;
                return (
                  <Star
                    key={s}
                    className={`w-6 h-6 ${
                      earned ? 'text-portal-gold fill-portal-gold animate-bounce' : 'text-slate-600'
                    }`}
                  />
                );
              })}
            </div>

            <div className="bg-portal-card/80 border border-portal-border rounded-xl p-3 w-full text-left text-xs mb-4 space-y-1 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Time Bonus:</span>
                <strong className="text-portal-cyan">+{timeLeft * 50} pts</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Cores Gathered:</span>
                <strong className="text-white">{coresCollectedInLevel}/{totalCoresInLevel}</strong>
              </div>
              <div className="flex items-center justify-between border-t border-portal-border/60 pt-1">
                <span>Total Score:</span>
                <strong className="text-portal-gold font-mono font-black text-sm">{totalScore} pts</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => startLevel(currentLevelIdx)}
                className="px-3 py-2.5 rounded-xl bg-portal-card border border-portal-border text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1"
                title="Replay Level"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>

              {currentLevelIdx < MAZE_LEVELS.length - 1 ? (
                <button
                  onClick={() => startLevel(currentLevelIdx + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-portal-cyan to-portal-neon text-black font-black text-xs uppercase tracking-wider hover:shadow-glow-cyan active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  <span>NEXT SECTOR</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsLevelSelectOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-portal-gold to-amber-500 text-black font-black text-xs uppercase tracking-wider hover:shadow-glow-gold active:scale-95 transition-all"
                >
                  LEVEL SELECT
                </button>
              )}
            </div>
          </div>
        )}

        {/* Timeout Fail Overlay */}
        {isTimedOut && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn z-10">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500 flex items-center justify-center shadow-glow-purple mb-2 animate-pulse">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <h2 className="text-lg font-black text-white tracking-wider uppercase mb-1">
              SYSTEM PURGE - TIMEOUT!
            </h2>
            <p className="text-xs text-rose-400 font-semibold mb-3">
              The 60-second breach window expired.
            </p>

            <button
              onClick={() => startLevel(currentLevelIdx)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-portal-pink text-white font-black text-xs uppercase tracking-wider hover:shadow-glow-purple active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RETRY SECTOR (60s)</span>
            </button>
          </div>
        )}
      </div>

      {/* On-Screen Mobile Virtual D-Pad */}
      <div className="w-full mt-2 grid grid-cols-3 gap-1.5 max-w-[260px] p-2 bg-portal-card/60 rounded-2xl border border-portal-border/60">
        <div />
        <button
          onClick={() => movePlayer(-1, 0)}
          className="h-10 rounded-xl bg-portal-surface border border-portal-cyan/40 active:bg-portal-cyan active:text-black flex items-center justify-center text-portal-cyan active:scale-95 transition-all shadow-sm"
          aria-label="Up"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div />

        <button
          onClick={() => movePlayer(0, -1)}
          className="h-10 rounded-xl bg-portal-surface border border-portal-cyan/40 active:bg-portal-cyan active:text-black flex items-center justify-center text-portal-cyan active:scale-95 transition-all shadow-sm"
          aria-label="Left"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => movePlayer(1, 0)}
          className="h-10 rounded-xl bg-portal-surface border border-portal-cyan/40 active:bg-portal-cyan active:text-black flex items-center justify-center text-portal-cyan active:scale-95 transition-all shadow-sm"
          aria-label="Down"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
        <button
          onClick={() => movePlayer(0, 1)}
          className="h-10 rounded-xl bg-portal-surface border border-portal-cyan/40 active:bg-portal-cyan active:text-black flex items-center justify-center text-portal-cyan active:scale-95 transition-all shadow-sm"
          aria-label="Right"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Level Selection Drawer / Modal */}
      {isLevelSelectOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-portal-bg border border-portal-border rounded-3xl w-full max-w-[360px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between bg-portal-surface/90">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-portal-cyan" />
                <h3 className="text-sm font-black text-white">MAZE SECTOR SELECT</h3>
              </div>
              <button
                onClick={() => setIsLevelSelectOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-portal-card border border-portal-border"
              >
                Close
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {MAZE_LEVELS.map((lvl, idx) => {
                const isLocked = idx + 1 > unlockedLevel;
                const stars = levelStars[idx + 1] || 0;
                const isCurrent = idx === currentLevelIdx;

                return (
                  <button
                    key={lvl.id}
                    disabled={isLocked}
                    onClick={() => startLevel(idx)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isCurrent
                        ? 'bg-cyan-500/15 border-portal-cyan'
                        : isLocked
                        ? 'bg-portal-card/30 border-portal-border/30 opacity-45 cursor-not-allowed'
                        : 'bg-portal-card/70 border-portal-border hover:border-portal-cyan/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          isCurrent
                            ? 'bg-portal-cyan text-black'
                            : isLocked
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-slate-800 text-portal-cyan border border-portal-cyan/30'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white leading-tight">{lvl.name}</h4>
                        <p className="text-[10px] text-slate-400">{lvl.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            stars >= s ? 'text-portal-gold fill-portal-gold' : 'text-slate-700'
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
