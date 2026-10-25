import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()


const supabaseurl = process.env.SUPABASE_URL
const supabasekey = process.env.SUPABASE_SECRET_KEY

if(!supabaseurl || !supabasekey){
    
    throw new Error("Missing Supabase keys in .env")
}


export const supabase = createClient(supabaseurl, supabasekey)