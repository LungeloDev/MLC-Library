import { Injectable } from '@angular/core';

import {
    Auth,
    User,
    signInWithEmailAndPassword,
    signOut,
    authState
} from '@angular/fire/auth';

import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private readonly adminUsername =
        'Midrand Lutheran Church';

    private readonly adminEmail =
        'admin@midrandlutheranchurch.co.za';

    user$: Observable<User | null>;

    constructor(
        private auth: Auth
    ) {
        this.user$ = authState(this.auth);
    }

    async login(
        username: string,
        password: string
    ): Promise<void> {

        if (
            username.trim().toLowerCase() !==
            this.adminUsername.toLowerCase()
        ) {
            throw new Error(
                'Invalid username or password.'
            );
        }

        try {

            await signInWithEmailAndPassword(
                this.auth,
                this.adminEmail,
                password
            );

        } catch (error) {

            console.error(
                'Firebase login error:',
                error
            );

            throw new Error(
                'Invalid username or password.'
            );
        }
    }

    async logout(): Promise<void> {
        await signOut(this.auth);
    }
}