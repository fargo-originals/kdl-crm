import { tool } from 'ai';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { addDays, setHours, setMinutes, format } from 'date-fns';

export const proposeSlots = tool({
  description: 'Propose 3 available appointment slots to the lead based on sales team availability',
  inputSchema: z.object({
    assignedUserId: z.string().describe('The UUID of the assigned sales rep'),
  }),
  execute: async ({ assignedUserId }) => {
    const { data: availability } = await supabaseServer
      .from('sales_availability')
      .select('weekday, start_time, end_time, timezone')
      .eq('user_id', assignedUserId);

    if (!availability || availability.length === 0) {
      // Default: Mon-Fri 10:00-18:00
      const slots = generateDefaultSlots();
      return { slots };
    }

    const slots = generateSlotsFromAvailability(availability);
    return { slots };
  },
});

function generateDefaultSlots(): string[] {
  const slots: string[] = [];
  let d = addDays(new Date(), 1);
  while (slots.length < 3) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) { // Mon-Fri
      slots.push(format(setMinutes(setHours(d, 10), 0), "EEEE d 'de' MMMM 'a las' HH:mm"));
      if (slots.length < 3) {
        slots.push(format(setMinutes(setHours(d, 16), 0), "EEEE d 'de' MMMM 'a las' HH:mm"));
      }
    }
    d = addDays(d, 1);
  }
  return slots.slice(0, 3);
}

function generateSlotsFromAvailability(availability: Array<{ weekday: number; start_time: string }>): string[] {
  const slots: string[] = [];
  let d = addDays(new Date(), 1);
  let attempts = 0;
  while (slots.length < 3 && attempts < 14) {
    const dow = d.getDay();
    const avail = availability.find(a => a.weekday === dow);
    if (avail) {
      const [h, m] = avail.start_time.split(':').map(Number);
      slots.push(format(setMinutes(setHours(d, h), m), "EEEE d 'de' MMMM 'a las' HH:mm"));
    }
    d = addDays(d, 1);
    attempts++;
  }
  return slots.slice(0, 3);
}
