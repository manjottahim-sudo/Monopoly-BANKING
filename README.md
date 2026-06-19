# Rent Rush Bank

A Monopoly-style private money tracker for game night.

## What changed in this version
- Players join using only the game code.
- Each player creates their own name and PIN.
- Each player chooses a character and one of 10 colours.
- Bank stays green.
- Players can pay other players or the bank themselves.
- Banker can still pay from the bank, collect taxes/fees, and reset the game.
- Everyone can see all transactions.
- Players can switch between **My transactions** and **All transactions**.
- Players can log back in by choosing **Return** and entering their PIN.
- The app remembers the last login on the same phone.
- More creative Monopoly-inspired design and tab layout.

## Important security note
This is built for family/friends game night. It prevents normal cheating through the app UI using PINs, private balances, and a transaction log. It is not bank-grade security.

## Files to upload to GitHub
Upload these files to your existing GitHub repository:
- `index.html`
- `styles.css`
- `app.js`
- `package.json`
- `supabase_schema.sql`
- `README.md`

If you already connected GitHub to Vercel, Vercel should automatically update the website after you upload/replace these files.

## Required Supabase update
Because this version adds player characters and colours, run the new SQL once.

1. Open Supabase.
2. Open your project.
3. Go to **SQL Editor**.
4. Open `supabase_schema.sql` from this folder.
5. Copy everything.
6. Paste it in Supabase SQL Editor.
7. Click **Run**.

This SQL is safe to run even if you already installed the older version.

## How to use after update

### Banker creates the game
1. Open the website.
2. Create a new game code, for example `FAMILY1`.
3. Create the banker PIN.
4. Choose starting money, usually `1500`.
5. Click **Create game code**.
6. Share only the game code with players.

### Player joins for the first time
1. Open the website.
2. Enter game code.
3. Tap **Player**.
4. Stay on **New player**.
5. Enter name.
6. Create PIN.
7. Choose character.
8. Choose colour.
9. Tap **Join game**.

### Player logs back in
1. Open the website.
2. Enter game code.
3. Tap **Player**.
4. Tap **Return**.
5. Select name.
6. Enter PIN.
7. Tap **Open my wallet**.

### During the game
- Player can use **Pay** tab to pay another player or the bank.
- Player can use **Transactions** tab to see My transactions or All transactions.
- Player can use **Game** tab to see game code and player list.
- Banker can use **Move money**, **Players**, and **History** tabs.

## If something does not update live
Refresh the page. Supabase free projects sometimes pause live realtime if the project has been inactive.
