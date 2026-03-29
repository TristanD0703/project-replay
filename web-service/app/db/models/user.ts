import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';
import { z } from 'zod';

const userDateSchema = z
    .union([z.date(), z.string(), z.number()])
    .pipe(z.coerce.date());

export const userSchema = z
    .object({
        id: z.uuid(),
        discord_username: z.string().min(1),
        discord_id: z.string().min(1),
        discord_avatar_hash: z.string().min(1).or(z.undefined()),
        is_streamer: z.boolean(),
        is_admin: z.boolean(),
        stream_key: z.string().min(1).or(z.undefined()),
        created_at: userDateSchema,
        updated_at: userDateSchema,
    })
    .strict();

export const createUserSchema = userSchema
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        discord_avatar_hash: z.string().min(1).optional(),
        is_streamer: z.boolean().optional().default(false),
        is_admin: z.boolean().optional().default(false),
        stream_key: z.string().min(1).optional(),
    });

export const updateUserSchema = createUserSchema.partial();

type UserSchema = z.infer<typeof userSchema>;

export interface UserModel
    extends Omit<UserSchema, 'created_at' | 'updated_at'> {
    created_at: ColumnType<UserSchema['created_at'], string | undefined, never>;
    updated_at: ColumnType<UserSchema['updated_at'], string | undefined, never>;
}

export type User = Selectable<UserModel>;
export type UserInput = UserSchema;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserUpdate = Updateable<UserModel>;
export type NewUser = Insertable<UserModel>;
