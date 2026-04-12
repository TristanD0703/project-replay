import { Insertable, Selectable, Updateable } from 'kysely';

export interface TokenModel {
    user_id: string;
    access_token: string;
    refresh_token: string;
    salt: string;
    expires: Date;
}

export type Token = Selectable<TokenModel>;
export type NewToken = Insertable<TokenModel>;
export type TokenUpdate = Updateable<TokenModel>;
