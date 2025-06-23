import { z } from 'zod';
import { Router } from 'express';
import {
    isValidPassword,
    isValidTurnstileResponse,
    isValidUsername,
    PasswordValidation,
    UsernameValidation,
} from '../utils';
import crypto from 'crypto';
import { Database } from '../database';

const router = Router();

router.get('/login', (req, res) => {
    res.render('accounts/login', {
        error: '',
        turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
    });
});
router.get('/register', (req, res) => {
    res.render('accounts/register', {
        error: '',
        turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
    });
});

const registerValidator = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(8).max(100),
    confirm_password: z.string().min(8).max(100),
    email: z.string().email(),
    'cf-turnstile-response': z.string().min(1),
    invite_code: z.string().optional(),
});
router.post('/register', async (req, res) => {
    const result = registerValidator.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            error: 'Invalid input',
            details: result.error.errors,
        });
        return;
    }
    const {
        username,
        password,
        confirm_password,
        email,
        'cf-turnstile-response': turnstileResponse,
        invite_code,
    } = result.data;

    if (password !== confirm_password) {
        res.render('accounts/register', {
            error: 'Passwords do not match',
            turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
        });
        return;
    }

    if (!(await isValidTurnstileResponse(turnstileResponse))) {
        res.render('accounts/login', {
            error: 'Invalid Turnstile response.',
            turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
        });
        return;
    }
    switch (await isValidUsername(username)) {
        case UsernameValidation.TooShort:
        case UsernameValidation.TooLong:
            res.render('accounts/register', {
                error: 'Username must be between 3 and 20 characters long.',
                turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
            });
            return;
        case UsernameValidation.InvalidCharacters:
            res.render('accounts/register', {
                error: 'Username contains invalid characters. Only alphanumeric characters and underscores are allowed.',
                turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
            });
            return;
        case UsernameValidation.Blacklisted:
            res.render('accounts/register', {
                error: 'Username is blacklisted.',
                turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
            });
            return;
    }
    switch (await isValidPassword(password)) {
        case PasswordValidation.TooShort:
        case PasswordValidation.TooLong:
            res.render('accounts/register', {
                error: 'Password must be between 8 and 100 characters long.',
                turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
            });
            return;
        case PasswordValidation.Blacklisted:
            res.render('accounts/register', {
                error: 'Password is blacklisted.',
                turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
            });
            return;
    }
    const inviteCode = await Database.getDatabase().kickyInviteCode.findUnique({
        where: {
            code: invite_code,
        },
    });
    if (invite_code && !inviteCode) {
        res.render('accounts/register', {
            error: 'Invalid invite code.',
            turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
        });
        return;
    }
    const passwordSalt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto
        .pbkdf2Sync(password, passwordSalt, 100000, 64, 'sha512')
        .toString('hex');

    const user = await Database.getDatabase().kickyUser.create({
        data: {
            name: username,
            email,
            salt: passwordSalt,
            password: passwordHash,
        },
    });
    req.session.userId = user.id;
    res.redirect('/');
});
router.get('/logout', (req, res) => {
    req.session.userId = null;
    res.redirect('/');
});
const loginValidator = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(8).max(100),
    'cf-turnstile-response': z.string().min(1),
});
router.post('/login', async (req, res) => {
    const result = loginValidator.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            error: 'Invalid input',
            details: result.error.errors,
        });
        return;
    }
    const { username, password, 'cf-turnstile-response': turnstileResponse } = result.data;

    const user = await Database.getDatabase().kickyUser.findUnique({
        where: {
            name: username,
        },
    });
    if (!user) {
        res.render('accounts/login', {
            error: 'Invalid username or password.',
            turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
        });
        return;
    }
    if (!(await isValidTurnstileResponse(turnstileResponse))) {
        res.render('accounts/login', {
            error: 'Invalid Turnstile response.',
            turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
        });
        return;
    }
    const passwordHash = crypto
        .pbkdf2Sync(password, user.salt, 100000, 64, 'sha512')
        .toString('hex');
    if (passwordHash !== user.password) {
        res.render('accounts/login', {
            error: 'Invalid username or password.',
            turnstile_sitekey: process.env.TURNSTILE_SITEKEY,
        });
    }
    req.session.userId = user.id;
    res.redirect('/');
});

export default router;
