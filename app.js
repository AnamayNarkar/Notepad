import express from "express";
import bodyParser from "body-parser";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('view engine', "ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "NotesApp",
  password: "",
  port: 5432,
});

await db.connect();

let accusername;
let accpassword;
let flag = false;
let newnote;
let oldnote;
let editednote;
let texteditid;

async function getpreviousnotes() {
  try {
    let previousnotes = await db.query("SELECT * FROM notes WHERE username = $1", [accusername]);
    return previousnotes.rows;
  } catch (error) {
    console.error("Error getting previous notes:", error);
    throw error;
  }
}

async function enternewcredentials() {
  try {
    await db.query("INSERT INTO credentials (username, password) VALUES ($1, $2)", [accusername, accpassword]);
  } catch (error) {
    console.error("Error entering new credentials:", error);
    throw error;
  }
}

async function getCredentialsFromDatabase() {
  try {
    let result = await db.query("SELECT * FROM credentials");
    return result.rows;
  } catch (error) {
    console.error("Error retrieving credentials:", error);
    throw error;
  }
}

async function addnewnotetodatabase() {
  try {
    await db.query("INSERT INTO notes (username, notes) VALUES ($1, $2)", [accusername, newnote]);
  } catch (error) {
    console.error("Error adding new note to database:", error);
    throw error;
  }
}

app.post("/delete-a-note", async (req, res) => {
  let idToDelete = req.body.myVariableid.trim();
  await db.query("DELETE FROM notes WHERE id = $1", [idToDelete]);
  res.redirect('/dashboard');
});


app.post("/login", async (req, res) => {
  try {
    accusername = req.body.username;
    accpassword = req.body.password;
    if(accusername=="" || accpassword==""){
      res.redirect('/');
      return;
    }
    let credentials = await getCredentialsFromDatabase();
    let flag = false;
    for (let i = 0; i < credentials.length; i++) {
      if (accusername == credentials[i].username) {
        let passwordcheck = false;
        if (accpassword == credentials[i].password) {
          passwordcheck = true;
        }
        flag = true;
        if (!passwordcheck) {
          res.status(401).send("Wrong Password");
          return;
        }
        break;
      }
    }

    if (flag) {
      res.redirect('/dashboard');
    } else {
      await enternewcredentials();
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error("Error retrieving credentials:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/edit-a-note", async (req, res) => {
  texteditid=req.body.editnotesid;
  oldnote = req.body.oldtext;
  editednote = req.body.editvalue;
  oldnote=oldnote.slice(1,-1);
  editednote=editednote.slice(1,-1);
  oldnote=oldnote.trim();
  editednote=editednote.trim();
  await db.query("UPDATE notes SET notes = $1 WHERE username = $2 AND id = $3", [editednote, accusername, texteditid]);
  res.redirect('/dashboard');
})

app.post("/add-new-note", async (req, res) => {
  newnote = req.body.note.trim();
  await addnewnotetodatabase();
  res.redirect('/dashboard');
});

app.get("/dashboard", async (req, res) => {
  let arr = [];
  let idarr = [];
  let resultObj = await getpreviousnotes();
  resultObj.sort((a, b) => a.id - b.id);
  for (let i = 0; i < resultObj.length; i++) {
    let trimmedNote = resultObj[i].notes.trim();
    arr.push(`\`${trimmedNote}\``);
    idarr.push(resultObj[i].id);
  }
  res.render('index', { arr: arr, idarr: idarr });
});

app.get("/", (req, res) => {
  res.render('login.ejs');
});

app.get("/login", (req, res) => {
  res.render('login.ejs');
});

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});