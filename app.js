const https = require('https');
const fs = require('fs');

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const QRCode = require("qrcode");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

process.env.TZ = "Europe/Rome";


app.use(expressLayouts);
app.set("layout", "layout"); // This points to views/layout.ejs

app.use((req, res, next) => {
	res.locals.title = "Daily Log";
	res.locals.currentPage = "append"; // default
	next();
});

// Middleware
app.use(expressLayouts);
app.set("layout", "layout");
// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
	session({
		secret: "daily-log-secret-123",
		resave: false,
		saveUninitialized: true,
	}),
);

// Database setup
const db = new sqlite3.Database("dailylog.db");

db.serialize(() => {
	// Users table
	db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

	// Activities table
	db.run(`CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

	db.run(`ALTER TABLE users ADD COLUMN secret TEXT`, (err) => {
		if (err && !err.message.includes("duplicate column")) console.log("Secret column already exists");
	});

	// Default admin user
	db.run(`INSERT OR IGNORE INTO users (username, name) VALUES ('admin', 'Administrator')`);
});

// Helper: get today in YYYY-MM-DD
function getToday() {
	const now = new Date();
	return now.toLocaleDateString("it-IT", {timezone: "Europe/Rome"}); //toISOString().split("T")[0];
}

// Routes

// HOME - redirect to append
app.get("/", (req, res) => res.redirect("/append"));

// === ADMIN AREA ===
app.get("/admin", (req, res) => {
	db.all("SELECT * FROM users ORDER BY name", [], (err, users) => {
		res.render("admin", {
			users,
			title: "Admin",
			currentPage: "admin",
			message: "",
		});
	});
});

app.post("/admin/create", (req, res) => {
	const { username, name } = req.body;
	if (!username || !name) return res.redirect("/admin?message=All fields required");

	const secret = crypto.randomBytes(32).toString("hex"); // Strong secret

	db.run("INSERT INTO users (username, name, secret) VALUES (?, ?, ?)", [username, name, secret], function (err) {
		if (err) return res.redirect("/admin?message=Username already exists");

		// Generate QR Code
		const qrData = `Logora://${this.lastID}:${secret}`;

		QRCode.toDataURL(qrData, { width: 400 }, (err, qrUrl) => {
			res.render("admin-create-success", {
				userId: this.lastID,
				name,
				username,
				qrUrl,
				secret, // shown only once
			});
		});
	});
});
// === DAILY LOG APPEND ===
app.get("/append", (req, res) => {
	db.all("SELECT id, name FROM users ORDER BY name", [], (err, users) => {
		const today = getToday();
		db.all(
			`
            SELECT a.*, u.name as user_name 
            FROM activities a 
            JOIN users u ON a.user_id = u.id 
            WHERE date(a.created_at) = date(?) 
            ORDER BY a.created_at DESC
        `,
			[today],
			(err, todayLogs) => {
				res.render("append", {
					users,
					todayLogs,
					today,
					title: "Append Activity",
					currentPage: "append",
				});
			},
		);
	});
});

app.post("/append", (req, res) => {
	const { user_id, description, verification_code } = req.body;

	if (!user_id || !description || !verification_code) {
		return res.redirect("/append?error=missing");
	}

	db.get("SELECT secret FROM users WHERE id = ?", [user_id], (err, user) => {
		if (!user || user.secret !== verification_code) {
			return res.redirect("/append?error=invalid");
		}

		db.run("INSERT INTO activities (user_id, description) VALUES (?, ?)", [user_id, description.trim()], (err) => {
			res.redirect("/append?success=1");
		});
	});
});

// === DAILY LOG SHOW ===
app.get("/show", (req, res) => {
	db.all("SELECT id, name FROM users ORDER BY name", [], (err, users) => {
		res.render("show", {
			users,
			logs: [],
			selectedDate: "",
			selectedUser: "",
			title: "View Logs",
			currentPage: "show",
		});
	});
});

app.post("/show", (req, res) => {
	const { date, user_id } = req.body;

	let query = `
        SELECT a.*, u.name as user_name 
        FROM activities a 
        JOIN users u ON a.user_id = u.id 
        WHERE 1=1
    `;
	const params = [];

	if (date) {
		query += " AND date(a.created_at) = date(?)";
		params.push(date);
	}
	if (user_id) {
		query += " AND a.user_id = ?";
		params.push(user_id);
	}

	query += " ORDER BY a.created_at DESC";

	db.all(query, params, (err, logs) => {
		db.all("SELECT id, name FROM users ORDER BY name", [], (err2, users) => {
			res.render("show", {
				users,
				logs,
				selectedDate: date || "",
				selectedUser: user_id || "",
			});
		});
	});
});


// Production / HTTPS mode
const options = {
        key: fs.readFileSync(path.join(__dirname, 'certs/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs/fullchain.pem'))
};

https.createServer(options, app).listen(PORT, () => {
        console.log(`✅ TaskAppend HTTPS running on https://localhost:${PORT}`);
 });
