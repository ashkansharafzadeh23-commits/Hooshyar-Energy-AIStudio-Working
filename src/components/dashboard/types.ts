import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  provenance: 'REAL' | 'CALCULATED' | 'USER_PROVIDED' | 'MARKET' | 'AI' | 'MISSING';
  subtext?: string;
  icon?: LucideIcon;
}

export interface DashboardAttentionItem {
  id: string;
  title: string;
  description: string;
  severity: 'URGENT' | 'WARNING' | 'INFO';
  category: 'PROJECT' | 'RFQ' | 'CONTRACT' | 'FINANCE' | 'ASSET' | 'MAINTENANCE';
  actionLabel: string;
  actionHref: string;
  badgeText?: string;
}

export interface DashboardNextAction {
  id: string;
  projectOrAssetName: string;
  title: string;
  reason: string;
  actionText: string;
  actionHref: string;
  phaseTitle?: string;
  isPrimary?: boolean;
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  projectName?: string;
  eventType?: string;
}
