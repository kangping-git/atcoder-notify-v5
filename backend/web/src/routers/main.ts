import { Router } from 'express';
import { TwitterApi } from 'twitter-api-v2';
import { Database } from '../database';

const router = Router();
const twitterAPI = new TwitterApi({
    // clientId: process.env.TWITTER_CLIENT_KEY!,
    // clientSecret: process.env.TWITTER_SECRET_KEY!,
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_KEY_SECRET!,
});

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/special/418', (req, res) => {
    res.render('special/418');
});
router.get('/twitter/', async (req, res) => {
    if (!req.session.userId) {
        res.redirect('/accounts/login');
        return;
    }
    const { url, oauth_token, oauth_token_secret } = await twitterAPI.generateAuthLink('http://localhost:3080/twitter/callback');
    await Database.getDatabase().kickyUser.update({
        where: {
            id: req.session.userId!,
        },
        data: {
            twitterOAuthTokenSecret: oauth_token_secret,
        },
    });
    res.redirect(url);
});
router.get('/twitter/callback', async (req, res) => {
    if (!req.session.userId) {
        res.redirect('/accounts/login');
        return;
    }

    // コールバックのクエリパラメータを取得
    const { oauth_token: oauthToken, oauth_verifier: oauthVerifier } = req.query as {
        oauth_token?: string;
        oauth_verifier?: string;
    };

    if (!oauthToken || !oauthVerifier) {
        res.status(400).send('Missing oauth_token or oauth_verifier');
        return;
    }

    const userRecord = await Database.getDatabase().kickyUser.findUnique({
        where: { id: req.session.userId },
        select: { twitterOAuthTokenSecret: true },
    });

    if (!userRecord?.twitterOAuthTokenSecret) {
        res.status(400).send('OAuth token secret not found');
        return;
    }

    const twitterClient = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY!,
        appSecret: process.env.TWITTER_API_KEY_SECRET!,
        accessToken: oauthToken,
        accessSecret: userRecord.twitterOAuthTokenSecret,
    });

    try {
        const { client: loggedClient, accessToken: userAccessToken, accessSecret: userAccessSecret } = await twitterClient.login(oauthVerifier);
        const user = await loggedClient.currentUserV2();
        await Database.getDatabase().kickyUser.update({
            where: {
                id: req.session.userId!,
            },
            data: {
                twitterOAuthAccessToken: userAccessToken,
                twitterOAuthAccessSecret: userAccessSecret,
                twitterOAuthUsername: user.data.username,
            },
        });

        res.redirect('/accounts/dashboard');
    } catch (error) {
        console.error('Twitter OAuth callback error:', error);
        res.status(500).send('Twitter authentication failed');
    }
});

export default router;
