import { format, getISOWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export interface TemplateContext {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  datetime: string; // ISO datetime
  year: string;
  month: string;
  day: string;
  week: string; // ISO week number
  weekday: string; // Day name (Monday, Tuesday, etc.)
}

/**
 * Build template context from current time
 */
export function buildTemplateContext(timezone?: string): TemplateContext {
  const now = new Date();
  const zonedTime = timezone ? toZonedTime(now, timezone) : now;

  return {
    date: format(zonedTime, "yyyy-MM-dd"),
    time: format(zonedTime, "HH:mm"),
    datetime: zonedTime.toISOString(),
    year: format(zonedTime, "yyyy"),
    month: format(zonedTime, "MM"),
    day: format(zonedTime, "dd"),
    week: String(getISOWeek(zonedTime)).padStart(2, "0"),
    weekday: format(zonedTime, "EEEE"),
  };
}

/**
 * Replace {{variable}} placeholders in a string with values from context
 */
export function substituteTemplateVariables(
  template: string,
  context: TemplateContext
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in context) {
      return context[key as keyof TemplateContext];
    }
    // Return original if variable not found
    return match;
  });
}

/**
 * Process a routine's message and title with template substitution
 */
export function processTemplates(
  text: string,
  timezone?: string
): string {
  const context = buildTemplateContext(timezone);
  return substituteTemplateVariables(text, context);
}
