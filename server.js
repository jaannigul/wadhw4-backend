// server.js
const express = require('express');
const pool = require('./database');
const cors = require('cors');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 3000;

const app = express();

app.use(cors({origin: 'http://localhost:8080', credentials: true}));
// We need to include "credentials: true" to allow cookies to be represented
// Also "credentials: 'include'" need to be added in Fetch API in the Vue.js App

app.use(express.json());  // Parses incoming requests with JSON payloads and is based on body-parser.
app.use(cookieParser());  // Parse Cookie header and populate req.cookies with an object keyed by the cookie names.
const secret = "asgh79gh9a7s7dfgoosjbn";
const maxAge = 3600; //1 hour
const generateJWT = (id) => {
    return jwt.sign({id}, secret, {expiresIn: maxAge})
    //jwt.sign(payload, secret, [options, callback]), and it returns the JWT as string
}
app.listen(port, () => {
    console.log("Server is listening to port " + port)
});
app.get('/auth/posts', async(req, res) => {
    try {
        console.log("get posts request has arrived");
        const posts = await pool.query(
            "SELECT * FROM posts"
        );
        res.json(posts.rows);
    } catch (err) {
        console.error(err.message);
    }
});
app.post('/auth/posts', async(req, res) => {
    try {
        console.log("a post request has arrived");
        const post = req.body;
        const newpost = await pool.query(
            "INSERT INTO posts(content, create_time) values ($1, $2)    RETURNING*", [post.content, post.create_time]
        );
        res.json(newpost);
    } catch (err) {
        console.error(err.message);
    }
});
// delete all posts
app.delete('/auth/posts', async(req, res) => {
    try {
        console.log("delete all posts request has arrived");
        const deletepost = await pool.query(
            "DELETE FROM posts RETURNING*",
        );
        res.json(deletepost);
    } catch (err) {
        console.error(err.message);
    }
});
// saving a single post in certainPostView
app.put('/auth/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const updatedPost = await pool.query('UPDATE posts SET content = $1 WHERE id = $2 RETURNING *', [content, id]);
        if (updatedPost.rows.length > 0) {
            res.json(updatedPost.rows[0]);
        } else {
            res.status(404).send('Post not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error 2');
    }
});
// delete a single post
app.delete('/auth/posts/:id', async(req, res) => {
    try {
        const { id } = req.params;
        console.log(`delete post request has arrived for post id: ${id}`);
        const deletepost = await pool.query(
            "DELETE FROM posts WHERE id = $1 RETURNING*", [id]
        );
        if (deletepost.rows.length > 0) {
            res.json(deletepost.rows[0]);
        } else {
            res.status(404).send('Post not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
// check if a user is authenticated
app.get('/auth/authenticate', async (req, res) => {
    console.log('authentication request has been arrived');
    const token = req.cookies.jwt; // assign the token named jwt to the token const
    //console.log("token " + token);
    let authenticated = false; // a user is not authenticated until proven the opposite
    try {
        if (token) { //checks if the token exists
            //jwt.verify(token, secretOrPublicKey, [options, callback]) verify a token
            await jwt.verify(token, secret, (err) => { //token exists, now we try to verify it
                if (err) { // not verified, redirect to login page
                    console.log(err.message);
                    console.log('token is not verified');
                    res.send({"authenticated": authenticated}); // authenticated = false
                } else { // token exists and it is verified
                    console.log('author is authenticated');
                    authenticated = true;
                    res.send({"authenticated": authenticated}); // authenticated = true
                }
            })
        } else { //applies when the token does not exist
            console.log('author is not authenticated');
            res.send({"authenticated": authenticated}); // authenticated = false
        }
    } catch (err) {
        console.error(err.message);
        res.status(400).send(err.message);
    }
});

//sign up
app.post('/auth/signup', async (req, res) => {
    try {
        console.log("a signup request has arrived");
        console.log(req.body);
        const {email, password} = req.body; //data sent from signup.vue

        const salt = await bcrypt.genSalt(); //  generates the salt, i.e., a random string
        const bcryptPassword = await bcrypt.hash(password, salt) // hash the password and the salt
        const authUser = await pool.query( // insert the user and the hashed password into the database
            "INSERT INTO users(email, password) values ($1, $2) RETURNING*", [email, bcryptPassword]
        );
        console.log(authUser.rows[0].id);
        const token = await generateJWT(authUser.rows[0].id); // generates a JWT by taking the user id as an input (payload)
        //console.log(token);
        //res.cookie("isAuthorized", true, { maxAge: 1000 * 60, httpOnly: true });
        //res.cookie('jwt', token, { maxAge: 6000000, httpOnly: true });
        res
            .status(201)
            .cookie('jwt', token, {maxAge: 6000000, httpOnly: true})
            .json({user_id: authUser.rows[0].id})
            .send;
    } catch (err) {
        console.error(err.message);
        res.status(400).send(err.message);
    }
});

//log in
app.post('/auth/login', async (req, res) => {
    try {
        console.log("a login request has arrived");
        console.log(req.body);
        const {email, password} = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(401).json({error: "Wrong username/email or password"});

        /*
        To authenticate users, you will need to compare the password they provide with the one in the database.
        bcrypt.compare() accepts the plain text password and the hash that you stored, along with a callback function.
        That callback supplies an object containing any errors that occurred, and the overall result from the comparison.
        If the password matches the hash, the result is true.

        bcrypt.compare method takes the first argument as a plain text and the second argument as a hash password.
        If both are equal then it returns true else returns false.
        */

        //Checking if the password is correct
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        //console.log("validPassword:" + validPassword);
        if (!validPassword) return res.status(401).json({error: "Incorrect password"});

        const token = await generateJWT(user.rows[0].id);
        res
            .status(201)
            .cookie('jwt', token, {maxAge: 6000000, httpOnly: true})
            .json({user_id: user.rows[0].id})
            .send;
    } catch (error) {
        res.status(401).json({error: error.message});
    }
});

//logout a user = deletes the jwt
app.get('/auth/logout', (req, res) => {
    console.log('delete jwt request arrived');
    res.status(202).clearCookie('jwt').json({"Msg": "cookie cleared"}).send
});