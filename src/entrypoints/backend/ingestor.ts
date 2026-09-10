import { pool } from "./db.ts";
import { parse } from "./sources/wikipedia.ts"
import { getAccessToken, getFollowing, getUser } from "./sources/spotify.ts";



const release_body =  await parse("List_of_2026_albums") 

for (const r of release_body) {
    const artistResult = await pool.query(
        `INSERT INTO artists (name) VALUES ($1) 
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id`,
        [r.artist]
    );
    const artistId = artistResult.rows[0].id;

    await pool.query(
        `INSERT INTO releases (artist_id, title, release_date)
        VALUES($1, $2, $3)
        ON CONFLICT (artist_id, title, release_date) DO NOTHING`,
        [artistId, r.title, r.date]
    );

};
const users = await pool.query( ' SELECT id, refresh_token FROM users');

for (const user of users.rows){
    const accessToken = await getAccessToken(user.refresh_token) 
    const following = await getFollowing(accessToken) 

    for (const artist of following){
        const artistId = await pool.query(`INSERT INTO artists (name) VALUES ($1)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id`,[artist.name])
        
        await pool.query(`INSERT INTO user_artists VALUES($1, $2)
            ON CONFLICT DO NOTHING
                `, [user.id, artistId.rows[0].id])
        

    }
}


await pool.end();