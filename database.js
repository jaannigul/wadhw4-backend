// database.js
const Pool = require('pg').Pool;
const pool = new Pool({
    user: "postgres",
    password: "admin",
    database: "wadhw",
    host: "localhost",
    port: "5432"
});
const execute = async(query) => {
    try {
        await pool.connect(); // create a connection
        await pool.query(query); // executes a query
        return true;
    } catch (error) {
        console.error(error.stack);
        return false;
    }
};

/* 
gen_random_uuid() A system function to generate a random Universally Unique IDentifier (UUID)
An example of generated uuid:  32165102-4866-4d2d-b90c-7a2fddbb6bc8
*/



const createTblQuery = `
    CREATE TABLE IF NOT EXISTS "users" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(200) NOT NULL UNIQUE,
        password VARCHAR(200) NOT NULL 
    );`;
const createTblQueryPosts = `
    CREATE TABLE IF NOT EXISTS "posts" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT,
        image_url TEXT,
        create_time TEXT,
        user_picture TEXT,
        username VARCHAR(200)

    );`;
execute(createTblQuery).then(result => {
    if (result) {
        console.log('Table "users" is created');
    }
});
execute(createTblQueryPosts).then(result => {
    if (result) {
        console.log('Table "posts" is created');
    }
});

/*
  // SQL query to insert data into the "users" table
  const authUser = pool.query(
    "INSERT INTO posts(content, create_time, username) VALUES ($1, $2, $3)",
    ["lorem ipsum", "2023-11-07", "Mari Maasikas"]
  );
execute(authUser).then(result => {
    if (result) {
        console.log('Content is inserted into the table "posts"');
    }
});



 */



module.exports = pool;