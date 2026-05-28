# Play Store Publish Steps
# Run these commands from: C:\Users\hemin\Desktop\EXPO_APP\schoolconnect\mobile

## Step 1 — EAS login (one time)
npm install -g eas-cli
eas login
eas init

## Step 2 — Set Supabase secrets (one time)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://ouljlevztweykjoxjhal.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_aiAkLg0JpW7r7OQiVfprxg_LEhi_HrA"

## Step 3 — Build for Play Store
eas build --platform android --profile production
# Takes ~15 mins. Downloads a .aab file when done.

## Step 4 — Upload to Play Console
# Go to play.google.com/console
# Create app → Production → Create release → Upload the .aab file

## What you still need to prepare manually:
# - App icon: 512x512 PNG (for Play Store listing page)
# - Feature graphic: 1024x500 PNG  
# - 2+ screenshots from a real phone
# - Privacy policy URL (use privacypolicygenerator.info — free)
# - Short description (80 chars max)
# - Full description of the app
