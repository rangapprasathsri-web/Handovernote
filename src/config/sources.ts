import { SourceConfig } from '../models/sourceConfig.js';

export const REGISTERED_SOURCES: SourceConfig[] = [
  {
    id: 'ticketing',
    name: 'Ticketing System',
    type: 'seeded_json',
    path: 'data/ticketing.json',
    enabled: true,
    description: 'Internal service desk and operations ticketing system (OPS queue)',
  },
  {
    id: 'incidents',
    name: 'Incident Management',
    type: 'seeded_json',
    path: 'data/incidents.json',
    enabled: true,
    description: 'Major incident tracker and operations on-call escalation stream (INC queue)',
  },
  {
    id: 'quiet_ops',
    name: 'Quiet Ops Queue (Empty)',
    type: 'seeded_json',
    path: 'data/quiet_ops.json',
    enabled: true,
    description: 'Empty operations queue fixture for demonstrating quiet shifts with zero activity',
  },
];

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-05:00 / -04:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-08:00 / -07:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-06:00 / -05:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+00:00 / +01:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, UTC+01:00 / +02:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT, UTC+10:00 / +11:00)' },
];

export const DEFAULT_SHIFT_WINDOW = {
  shift_start: '2026-09-03T17:00:00+05:30',
  shift_end: '2026-09-03T20:00:00+05:30',
  timezone: DEFAULT_TIMEZONE,
  sources: ['ticketing', 'incidents'],
};
