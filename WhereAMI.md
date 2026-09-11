spotiauth currently has 2 http calls that swaps an refresh token for an access token. then it queries the pool and inserts the spotify user id and refresh token into the database.

routers.ts does the main endpoint pull selecting the artists 
