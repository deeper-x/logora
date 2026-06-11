# TaskAppend

**A simple, secure daily activity logger with QR-code verification.**

TaskAppend allows teams or individuals to log daily activities with **verified submissions** using personal QR codes. Perfect for freelancers, small teams, consultants, or anyone who wants a clean daily work journal.

![TaskAppend Screenshot](screenshot.png)

## ✨ Features

- **Admin Panel** — Create and manage users
- **One-time QR Code** — Generated automatically when creating a user (downloadable PNG)
- **Webcam QR Scanning** — Scan your personal QR code to verify submissions (no manual typing)
- **Daily Activity Append** — Quick logging with verification
- **Historical Logs** — View activities by date and user with calendar picker
- **Clean & Responsive UI** — Built with Tailwind CSS
- **Lightweight Database** — SQLite (zero configuration)

## 🛠 Tech Stack

- **Node.js** + **Express**
- **EJS** (templating)
- **SQLite3** (database)
- **html5-qrcode** (webcam scanning)
- **qrcode** (QR generation)
- **Tailwind CSS**
- **PM2** (recommended for production)

---

## Install

```
npm install -g pm2

pm2 start app.js --name "logora"
pm2 startup
pm2 save
```
