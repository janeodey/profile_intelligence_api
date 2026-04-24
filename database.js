const sqlite3 = require("sqlite3").verbose();

// create database file
const db = new sqlite3.Database("./profiles.db",(err)=>{
    if (err){
        console.log(err.message);        
    }else{
        console.log("connected to SQL database✅");
        
    }
})

db.serialize(()=>{
    db.run(`
        CREATE TABLE IF NOT EXISTS profiles(
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        gender TEXT,
        gender_probability REAL,
        sample_size INTEGER,
        age INTEGER,
        age_group TEXT,
        country_id TEXT,
        country_name TEXT,
        country_probability REAL,
        created_at TEXT
        )
        `)
})

module.exports = db