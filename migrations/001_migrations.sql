

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    spotify_user text UNIQUE NOT NULL ,
    display_name text ,
    refresh_token text NOT NULL 
    
);

CREATE TABLE artists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() ,
    name text NOT NULL ,
    image_url text,
    spotify_id text UNIQUE 
);

CREATE TABLE user_artists (
    user_id uuid REFERENCES users(id) ON DELETE CASCADE ,
    artist_id uuid REFERENCES artists(id) ON DELETE CASCADE ,
    PRIMARY KEY(user_id, artist_id)
);



CREATE TABLE releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() ,
    artist_id uuid REFERENCES artists(id) ON DELETE CASCADE ,
    title TEXT ,
    release_date DATE ,
    release_type text,
    release_date_precision text,
    UNIQUE NULLS NOT DISTINCT ( artist_id, title, release_date) 
    
);

CREATE TABLE seen ( 
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    release_id  uuid REFERENCES releases(id) ON DELETE CASCADE,
    first_seen_at timestamptz DEFAULT now(),
    PRIMARY KEY(user_id, release_id) 
);