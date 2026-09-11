import express, { type Express, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';

import { getUser } from '../sources/spotify.ts';
import { pool } from '../db.ts';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URL;

if (!client_id || !client_secret || !redirect_uri) {
  throw new Error("Missing Spotify credentials in .env");
}

export const authRouter = express.Router();

authRouter.get('/login', async function(req:Request, res:Response) {
    const state = randomBytes(16).toString('hex');
    const scope = 'user-follow-read user-read-private'

    res.redirect('https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        response_type: 'code',
    }).toString() 
      
    );
});

authRouter.get('/callback', async function(req:Request, res:Response) {
    const code = req.query.code || null;
    const state = req.query.state || null;

    if (typeof req.query.error === "string"){
        return res.status(400).send(`${req.query.error}`);
    };
    if (typeof state !== "string") {
        return res.status(400).send("state missing ");
    }
    if (typeof code !== "string") {
        return res.status(400).send("No auth code") 
    }

    const tokenRes= await fetch("https://accounts.spotify.com/api/token", {
        method: "POST", 
        headers: {
            Authorization: "Basic " + Buffer.from(`${client_id}:${client_secret}`).toString("base64")
        },
        body: new URLSearchParams({
            grant_type : "authorization_code",

            code: code,
            redirect_uri:redirect_uri,

        }),

    });
    if (!tokenRes.ok){
        return res.status(500).send(`Token exchange failed: ${await tokenRes.text()}`);
    }
    const token = await tokenRes.json() 

    const accountId = await getUser(token.access_token) 

    const userResult = await pool.query(
        `INSERT INTO users (spotify_user, refresh_token) VALUES ($1,$2)
        ON CONFLICT (spotify_user) DO UPDATE SET refresh_token = EXCLUDED.refresh_token
        RETURNING id`,
        [accountId, token.refresh_token]
    );

    res.redirect(`http://localhost:3000/?user=${userResult.rows[0].id}`)

    
});


