import {Pool, types} from 'pg' 


types.setTypeParser(1082, (v) => v)

const connectionString = process.env.DATABASE_URL 
export const pool = new Pool({
    connectionString,
}) 
