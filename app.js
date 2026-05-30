// ── BLE UUIDs — must match ESP32 Arduino sketch exactly ─────────────────────
const SERVICE_UUID        = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// ── State ────────────────────────────────────────────────────────────────────
let bleDevice         = null;
let bleServer         = null;
let ledCharacteristic = null;
let ledState          = false;   // false = OFF, true = ON

// ── DOM refs ─────────────────────────────────────────────────────────────────
const statusDot       = document.getElementById('status-dot');
const statusText      = document.getElementById('status-text');
const deviceInfo      = document.getElementById('device-info');
const deviceNameDisp  = document.getElementById('device-name-display');
const connectBtn      = document.getElementById('connect-btn');
const disconnectBtn   = document.getElementById('disconnect-btn');
const btnOn           = document.getElementById('btn-on');
const btnOff          = document.getElementById('btn-off');
const ledBulb         = document.getElementById('led-bulb');
const ledRing         = document.getElementById('led-ring');
const ledStatusText   = document.getElementById('led-status-text');
const ledStateTag     = document.getElementById('led-state-tag');
const signalBars      = document.getElementById('signal-bars');
const logEl           = document.getElementById('log');

// ── Logging ──────────────────────────────────────────────────────────────────
function log(msg, type = 'info') {
  const now  = new Date();
  const time = now.toTimeString().slice(0, 8);
  const entry = document.createElement('span');
  entry.className = `entry ${type}`;
  entry.textContent = `[${time}] ${msg}\n`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
  logEl.innerHTML = '';
}

// ── UI State helpers ─────────────────────────────────────────────────────────
function setStatus(state, text) {
  statusDot.className  = `status-dot ${state}`;
  statusText.textContent = text;
}

function setConnected(deviceName) {
  setStatus('connected', 'CONNECTED');
  deviceNameDisp.textContent  = deviceName || 'ESP32';
  deviceInfo.style.display    = 'flex';
  connectBtn.disabled         = true;
  disconnectBtn.disabled      = false;
  btnOn.disabled              = false;
  btnOff.disabled             = false;
  signalBars.classList.add('active');
}

function setDisconnected() {
  setStatus('disconnected', 'DISCONNECTED');
  deviceInfo.style.display = 'none';
  connectBtn.disabled      = false;
  disconnectBtn.disabled   = true;
  btnOn.disabled           = true;
  btnOff.disabled          = true;
  signalBars.classList.remove('active');
  updateLEDUI(false);
}

function setConnecting() {
  setStatus('connecting', 'CONNECTING...');
  connectBtn.disabled = true;
}

function updateLEDUI(isOn) {
  ledState = isOn;
  if (isOn) {
    ledBulb.classList.add('on');
    ledRing.classList.add('on');
    ledStatusText.classList.add('on');
    ledStatusText.textContent = 'LED ON';
    ledStateTag.textContent   = 'ON';
    ledStateTag.classList.add('on');
  } else {
    ledBulb.classList.remove('on');
    ledRing.classList.remove('on');
    ledStatusText.classList.remove('on');
    ledStatusText.textContent = 'LED OFF';
    ledStateTag.textContent   = 'OFF';
    ledStateTag.classList.remove('on');
  }
}

// ── Web Bluetooth API check ──────────────────────────────────────────────────
function checkBLESupport() {
  if (!navigator.bluetooth) {
    log('Web Bluetooth not supported. Use Chrome or Edge on desktop/Android.', 'err');
    connectBtn.disabled = true;
    connectBtn.querySelector('.btn-inner').textContent = 'NOT SUPPORTED';
    return false;
  }
  return true;
}

// ── Connect ──────────────────────────────────────────────────────────────────
async function connectBLE() {
  if (!checkBLESupport()) return;

  try {
    setConnecting();
    log('Scanning for ESP32 BLE device…', 'info');

    // Request the device — browser shows native BLE picker dialog
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [SERVICE_UUID] },   // primary filter: match by service
        { namePrefix: 'ESP32-LED' }     // also show devices named ESP32-LED*
      ],
      optionalServices: [SERVICE_UUID]
    });

    log(`Found: ${bleDevice.name || 'ESP32'}`, 'ok');

    // Listen for unexpected disconnections
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    // Connect to GATT server
    log('Connecting to GATT server…', 'info');
    bleServer = await bleDevice.gatt.connect();

    // Get primary service
    log('Getting BLE service…', 'info');
    const service = await bleServer.getPrimaryService(SERVICE_UUID);

    // Get characteristic
    log('Getting characteristic…', 'info');
    ledCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    setConnected(bleDevice.name);
    log(`Connected to ${bleDevice.name || 'ESP32'} ✓`, 'ok');

  } catch (err) {
    setDisconnected();
    if (err.name === 'NotFoundError') {
      log('No device selected or device not found.', 'warn');
    } else if (err.name === 'SecurityError') {
      log('BLE requires HTTPS. Make sure the page is served over HTTPS.', 'err');
    } else {
      log(`Connection error: ${err.message}`, 'err');
    }
  }
}

// ── Send command ─────────────────────────────────────────────────────────────
async function sendCommand(cmd) {
  // cmd: '1' = LED ON, '0' = LED OFF
  if (!ledCharacteristic) {
    log('Not connected to ESP32.', 'err');
    return;
  }

  try {
    const encoder = new TextEncoder();
    await ledCharacteristic.writeValue(encoder.encode(cmd));

    const isOn = cmd === '1';
    updateLEDUI(isOn);
    log(`Sent: ${cmd} → LED ${isOn ? 'ON' : 'OFF'}`, isOn ? 'ok' : 'warn');
  } catch (err) {
    log(`Send error: ${err.message}`, 'err');
  }
}

// ── Disconnect ───────────────────────────────────────────────────────────────
function disconnectBLE() {
  if (bleDevice && bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
    log('Disconnected by user.', 'warn');
  }
  setDisconnected();
}

// ── Handle unexpected disconnect ─────────────────────────────────────────────
function onDisconnected() {
  log('ESP32 disconnected unexpectedly.', 'err');
  setDisconnected();
  bleServer         = null;
  ledCharacteristic = null;
}

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  checkBLESupport();
  log('Ready. Click CONNECT ESP32 to start.', 'info');
});
