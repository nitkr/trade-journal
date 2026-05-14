import type { Segment, Direction } from '@/types';

export const SEGMENTS: Segment[] = ['Equity', 'Futures', 'Options', 'Currency'];

export const DIRECTIONS: Direction[] = ['Long', 'Short'];

export const EMOTION_LEVELS = [
  { value: 1, label: 'Very Calm', emoji: '😌' },
  { value: 2, label: 'Calm', emoji: '🙂' },
  { value: 3, label: 'Slightly Tense', emoji: '😐' },
  { value: 4, label: 'Tense', emoji: '😟' },
  { value: 5, label: 'Anxious', emoji: '😰' },
  { value: 6, label: 'Stressed', emoji: '😥' },
  { value: 7, label: 'Very Stressed', emoji: '😫' },
  { value: 8, label: 'Overwhelmed', emoji: '😩' },
  { value: 9, label: 'Panic', emoji: '😱' },
  { value: 10, label: 'Loss of Control', emoji: '🤯' },
];

export const DEFAULT_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export const DATE_FORMAT = 'dd MMM yyyy';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';