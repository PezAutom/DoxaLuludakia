# DoxaLuludaki

A small IoT project that combines an ESP8266-based Arduino sketch with a Firebase-backed web dashboard for remote GPIO control and sensor monitoring.

## Project Contents

- `index.html` - A simple web dashboard for authenticating with Firebase and controlling three GPIO outputs.
- `styles.css` - Styling for the dashboard, including responsive card layout and button UI.
- `app.js` - Frontend JavaScript that connects to Firebase Authentication and Realtime Database, updates GPIO states, and toggles control buttons.
- `DoxaLuludaki.ino` - ESP8266 firmware that connects to Wi-Fi, synchronizes time with NTP, reads sensor values, and communicates with Firebase Realtime Database.

## Features

- Firebase Authentication login for dashboard access
- Realtime GPIO control via Firebase Database values
- ESP8266 connectivity to Firebase for sensor reporting and remote pump control
- Moisture sensor and water level monitoring
- Customizable timing settings from the Firebase `settings` node

## Requirements

- ESP8266 board compatible with Arduino IDE
- Firebase project with Realtime Database enabled
- Valid Firebase API key, database URL, and authentication credentials
- Wi-Fi network credentials

## Setup

1. Open `index.html` in a browser that supports ES modules.
2. Update `app.js` with your Firebase project configuration.
3. Open `DoxaLuludaki.ino` in the Arduino IDE.
4. Replace `WIFI_SSID` and `WIFI_PASSWORD` with your network credentials.
5. Replace the Firebase constants with your own Firebase project values.
6. Upload the sketch to your ESP8266 device.

## Firebase Database Structure

The ESP8266 sketch expects the following keys in the Realtime Database:

- `settings/intervalSend` - interval for sending sensor data
- `settings/intervalTake` - interval for reading commands from Firebase
- `settings/pumpTimer` - duration to run the pump
- `sensori/moisture/{timestamp}` - logged moisture readings
- `stati/livello` - water level state
- `stati/pompa` - pump control state

The web dashboard uses:

- `/gpio1`, `/gpio2`, `/gpio3` - booleans controlling GPIO outputs

## Notes

- The current sketch is configured for ESP8266 and uses Firebase ESP Client.
- The web UI currently supports three GPIO states on buttons and displays online/offline status.
- Do not commit real API keys or passwords to public repositories.
