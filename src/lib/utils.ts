import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return formatDate(d);
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "approved":
      return "badge-success";
    case "draft":
      return "badge-warning";
    case "review":
    case "under_review":
      return "badge-info";
    case "escalated":
    case "rejected":
      return "badge-danger";
    default:
      return "badge-primary";
  }
}

export function getCommentTypeIcon(type: string): string {
  switch (type.toLowerCase()) {
    case "suggestion":
      return "💡";
    case "objection":
      return "⚠️";
    case "clarification":
      return "❓";
    case "observation":
      return "👁️";
    case "approval":
      return "✅";
    case "question":
      return "❔";
    default:
      return "💬";
  }
}
