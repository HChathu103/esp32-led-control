# ESP32 BLE LED Control — Complete Setup Guide

## Hardware Wiring

Connect the LED to ESP32 GPIO pin 15:

```
ESP32 Pin 15  ──→  220Ω Resistor  ──→  LED Anode (+)
ESP32 GND     ──────────────────────── LED Cathode (–)
```

> Use a 220Ω resistor in series with the LED to limit current.
> LED longer leg = Anode (+), shorter leg = Cathode (–).

---

## Step 1 — Set Up Arduino IDE for ESP32

1. Open Arduino IDE (download at https://www.arduino.cc if not installed)
2. Go to **File → Preferences**
3. Paste this into "Additional boards manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search `esp32`, install **esp32 by Espressif Systems**

---

## Step 2 — Upload ESP32 Sketch

1. Open `esp32_ble_led.ino` in Arduino IDE
2. Select your board: **Tools → Board → ESP32 Arduino → your ESP32 model**
   (e.g. "DOIT ESP32 DEVKIT V1" or "ESP32 Dev Module")
3. Select the correct COM/USB port: **Tools → Port**
4. Click **Upload** (→ arrow button)
5. Open **Serial Monitor** (baud 115200) — you should see:
   ```
   BLE advertising started. Device name: ESP32-LED
   Waiting for connection…
   ```

---


## Step 3 — How to Use the Web App

1. Open the URL https://hchathu103.github.io/esp32-led-control/ in **Chrome or Edge** (desktop or Android)
   > ⚠ Safari / Firefox / iOS are NOT supported for Web Bluetooth
2. Make sure your computer/phone Bluetooth is turned ON
3. Click **CONNECT ESP32**
4. A browser dialog appears — select **ESP32-LED** from the list
5. Click **Pair / Connect**
6. Use the **ON** and **OFF** buttons to control the LED

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ESP32-LED not in list | Make sure sketch is uploaded and Serial Monitor shows "Waiting for connection" |
| "Web Bluetooth not supported" | Switch to Chrome or Edge. Not supported on iOS. |
| Connection drops | Press Connect again — ESP32 re-advertises automatically after disconnect |
| LED doesn't light up | Check wiring: resistor, polarity (long leg = +), GPIO 15 |
| Page can't use Bluetooth | GitHub Pages URL must be HTTPS. Don't use plain HTTP. |

---

## How It Works (Summary)

```
Browser (Chrome/Edge)
   │  User clicks "CONNECT ESP32"
   │  navigator.bluetooth.requestDevice() → browser BLE picker
   │  Connect to GATT server
   │  Get Service  (UUID: 4fafc201-...)
   │  Get Characteristic (UUID: beb5483e-...)
   │
   │  User clicks ON → writeValue('1')
   │  User clicks OFF → writeValue('0')
   │
   ↓  BLE radio signal
ESP32
   │  BLECharacteristicCallbacks::onWrite()
   │  Reads '1' or '0'
   ↓
GPIO 15 → HIGH (LED ON) or LOW (LED OFF)
```
