import { supabase } from "@/integrations/supabase/client";

/**
 * Update the child's reading streak. Called when a user opens or finishes a story.
 * - If last_story_read_date was yesterday → streak_count += 1
 * - If it was today already → no change
 * - Otherwise → reset to 1
 * Best-effort; failures are non-fatal.
 */
export async function bumpReadingStreak(childId: string): Promise<void> {
  try {
    await supabase.rpc("bump_reading_streak", { p_child_id: childId });
  } catch (e) {
    console.warn("bump_reading_streak failed", e);
  }
}
