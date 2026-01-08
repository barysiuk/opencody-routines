import { z } from "zod";

export const scheduleTriggerSchema = z.object({
  when: z.string().min(1, "Schedule 'when' is required"),
  timezone: z.string().optional(),
});

export const triggersSchema = z
  .object({
    schedule: scheduleTriggerSchema.optional(),
    // Future trigger types:
    // file_watch: fileWatchTriggerSchema.optional(),
    // webhook: webhookTriggerSchema.optional(),
  })
  .refine(
    (triggers) => {
      // At least one trigger must be defined
      return Object.values(triggers).some((t) => t !== undefined);
    },
    { message: "At least one trigger must be defined" }
  );

export const notifySchema = z.object({
  title: z.string().min(1, "Notification title is required"),
  body: z.string().min(1, "Notification body is required"),
  deeplink: z.string().optional(),
});

export const newSessionActionSchema = z.object({
  type: z.literal("new_session"),
  title: z.string().optional(),
  model: z.string().optional(),
  agent: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  notify: notifySchema.optional(),
});

export const actionSchema = z.discriminatedUnion("type", [
  newSessionActionSchema,
  // Future action types can be added here
]);

export const routineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  triggers: triggersSchema,
  action: actionSchema,
});

export const routineConfigSchema = routineSchema;

export function validateRoutine(data: unknown): {
  success: boolean;
  data?: z.infer<typeof routineSchema>;
  error?: z.ZodError;
} {
  const result = routineSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
