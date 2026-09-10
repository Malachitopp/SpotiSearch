import express, { type Express, type Request, type Response } from 'express';
import { pool } from '../db.ts';
import { authRouter } from '../auth/spotiauth.ts';


const app: Express = express();



app.get('/releases/upcoming', async (req:Request, res: Response)=>{
    const user = req.query.user 
    if (!user) {
        return res.status(400).send("user parameter needed") 
    };
    const result = await pool.query(
        `SELECT a.name AS artist, r.title, r.release_date
        FROM releases r
        JOIN artists a ON a.id = r.artist_id
        JOIN user_artists ua ON ua.artist_id = a.id 
        WHERE ua.user_id = $1
            AND r.release_date >= CURRENT_DATE
        ORDER BY r.release_date
        LIMIT $2`,
        [user, 150]
    );
    res.json(result.rows);
});

app.use(authRouter);
app.listen(3001)