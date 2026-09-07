# Bhaktinandan Behera — Profile & Social Website

A small, colourful profile website for **Bhaktinandan Behera** — Class 9, Section A student at
**Global City International School, Bengaluru**. He loves painting, drawing and art, and his
favourite subjects are Mathematics and English.

The site is also a **lightweight social network**: visitors can comment on the wall, like and
reply to comments, send Bhaktinandan a friend request, and accepted friends appear on his
profile.

## What's inside

| File                  | Purpose                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `index.html`          | The website page                                                  |
| `styles.css`          | Colours, fonts and layout                                         |
| `script.js`           | AI avatar picker, photo upload and saved profile picture          |
| `social.js`           | Social wall: comments, likes, replies, friend requests            |
| `firebase-config.js`  | **Your Firebase keys go here** (the only file you edit)           |

## Social features

- **💬 Wall** — anyone can write a comment on the wall. Comments appear instantly for
  everyone, in real time.
- **❤️ Likes & replies** — like any comment, or reply to it (threaded, like Facebook).
- **🗑 Delete** — delete your own comments/replies anytime.
- **🤝 Friend requests** — visitors send a friend request to Bhaktinandan. When Bhaktinandan
  (or his family) accepts, the visitor appears in the **Friends** list on the profile.
- **👤 Visitor identity** — first time a visitor comments or sends a request, they pick a
  name and a fun avatar. It is remembered on their device.
- **🔑 Owner mode** — lets Bhaktinandan accept/decline friend requests and delete any
  comment. Login with the PIN in `firebase-config.js` (default: `bhakti2026` — change it!).

## Setup: connect the free Firebase database (once, ~5 minutes)

Comments and friend requests are shared with **every visitor** through Firebase Realtime
Database (free tier — no credit card). You only need to do this once:

1. Open **https://console.firebase.google.com** and sign in with a Google account.
2. Click **Add project**, give it any name (e.g. `bhaktinandan-wall`), and follow the steps.
   You can turn off Google Analytics if asked.
3. On the project page, click the **</> (Web)** icon to add a web app.
4. Give the app a name (e.g. `website`), click **Register app**.
5. Firebase shows a **firebaseConfig** block. Copy the whole `{ ... }` object.
6. Open **`firebase-config.js`** in this folder and paste it over the placeholder values
   (replace everything between `window.FIREBASE_CONFIG = { ... };`).
7. In the Firebase left menu: **Build → Realtime Database → Create database**.
   Choose a location near you, then pick **Start in test mode** (fine for this site).
8. (Optional but recommended) Change the **owner PIN** in `firebase-config.js` to
   something only your family knows.

That's it! Now drag the folder to Netlify Drop again (see below) to publish the update.

## How to put it online for free (Netlify Drop)

1. Open your browser and go to **https://app.netlify.com/drop**
2. Sign in or create a free account (email or Google works).
3. Drag the **`bhaktinandan-website`** folder (the one that contains `index.html`)
   and drop it onto the page.
4. Wait a few seconds — Netlify will give your site a free web address
   like `https://something-random.netlify.app`. 🎉

### Make the address nicer (optional, free)

1. On the site's page in Netlify, click **Domain settings** → **Domains**.
2. Click **Options** next to your address → **Edit site name**.
3. Type something like `bhaktinandan` → **Save**.
4. Your site will now be at `https://bhaktinandan.netlify.app`.

### Updating the site after a change

After you change any file, drag the whole folder into
**https://app.netlify.com/drop** again — it publishes a fresh copy.

> ⚠️ Security note: the database uses "test mode" rules, which is fine for a friendly
> school project but not for sensitive data. Anyone could technically read or edit the
> comments database if they knew the URL. Don't post personal/private information.

## Profile picture

- **📷 Upload Photo** — set a real photo of Bhaktinandan. The photo is saved in the browser
  (it stays only on the device/browser where you uploaded it — it is not stored on any server).
- **✨ AI Avatar** — pick from 10 fun avatar styles (Adventurer, Pixel Art, Fun Emoji, etc.)
  and shuffle for different looks. Works instantly, no account or API key needed.

---

Made with ❤️ for Bhaktinandan.