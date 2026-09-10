

export async function getUser(accessToken: string ) {
    const response = await fetch(`https://api.spotify.com/v1/me`,{
        headers : {Authorization: 'Bearer ' + accessToken}
    
});
    const data = await response.json() 
    return data.account_id 
}




export async function getFollowing(accessToken: string) {
    let after: string | undefined = undefined;
    
    const artists = [];
    
    

    while (true) {
        const params = new URLSearchParams({ type: "artist", limit: "50"});
        if (after) params.set("after", after);

        const response= await fetch(`https://api.spotify.com/v1/me/following?${params}`, {
            headers: {Authorization: 'Bearer ' + accessToken}
        });
        const data = await response.json() ;
        artists.push(...data.artists.items);
        if (data.artists.next === null) {break} else {
            after = data.artists.cursors.after
        }

    }
    return artists; 

}

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
if (!client_id || !client_secret) {
    throw new Error("Missing spoti creds") 
}

export async function getAccessToken(refreshToken: string) {
    
    
    const tokenRes= await fetch("https://accounts.spotify.com/api/token", {
        method: "POST", 
        headers: {
            Authorization: "Basic " + Buffer.from(`${client_id}:${client_secret}`).toString("base64")
        },
        body: new URLSearchParams({
            grant_type : "refresh_token",
            refresh_token: refreshToken
        }),

    });
    if (!tokenRes.ok){
        throw new Error("token refresh failed ")
    }
    const data = await tokenRes.json() 

    const accessToken = data.access_token
    return accessToken 
}
