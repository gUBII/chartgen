// --- Configuration ---

const VARIANCE_MINUTES = 15;

// --- Temporal Realism Generator ---

/**
 * Introduces a realistic, random time variance to a scheduled time.
 * This function simulates the natural deviations that occur in a real-world
 * clinical setting when administering medication.
 *
 * @param scheduledTime The original, scheduled time of an event.
 * @returns A new Date object with a variance of +/- 15 minutes.
 */
export const generateTemporalRealism = (scheduledTime: Date): Date => {
  // Calculate the maximum variance in milliseconds (15 minutes * 60 seconds/min * 1000 ms/sec)
  const maxVarianceMs = VARIANCE_MINUTES * 60 * 1000;

  // Generate a random variance between -maxVarianceMs and +maxVarianceMs
  // Math.random() returns a value between 0 and 1.
  // (Math.random() * 2) gives a range of 0 to 2.
  // ((Math.random() * 2) - 1) shifts the range to -1 to 1.
  const variance = (Math.random() * 2 - 1) * maxVarianceMs;

  // Create a new Date object with the applied variance
  const actualTime = new Date(scheduledTime.getTime() + variance);

  return actualTime;
};

// --- Example Usage ---
/*
const scheduledTime = new Date('2024-08-15T12:00:00.000Z'); // 12:00 PM

console.log('Scheduled Time:   ', scheduledTime.toISOString());

for (let i = 0; i < 5; i++) {
  const actualTime = generateTemporalRealism(scheduledTime);
  console.log(`Generated Time #${i + 1}: `, actualTime.toISOString());
}

// Expected Output (will vary due to randomness):
//
// Scheduled Time:    2024-08-15T12:00:00.000Z
// Generated Time #1:  2024-08-15T12:08:31.123Z  (e.g., ~8 mins after)
// Generated Time #2:  2024-08-15T11:51:45.456Z  (e.g., ~8 mins before)
// Generated Time #3:  2024-08-15T12:01:10.789Z  (e.g., ~1 min after)
// Generated Time #4:  2024-08-15T11:45:00.000Z  (e.g., exactly 15 mins before)
// Generated Time #5:  2024-08-15T12:14:59.999Z  (e.g., almost 15 mins after)
*/
