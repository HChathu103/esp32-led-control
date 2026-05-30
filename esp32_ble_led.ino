/*
  ESP32 BLE LED Control
  ─────────────────────
  LED connected to GPIO 15.
  Receives '1' over BLE → LED ON
  Receives '0' over BLE → LED OFF

  Board  : ESP32 (e.g. NodeMCU-32S, DOIT DevKit V1, etc.)
  Library: Built-in ESP32 BLE (no extra install needed)

  Install board in Arduino IDE:
    File → Preferences → Additional Boards Manager URLs:
    https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
    Then: Tools → Board → Boards Manager → search "esp32" → Install
*/

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── Pin ───────────────────────────────────────────────────────────────────────
#define LED_PIN 15

// ── BLE UUIDs — must match app.js exactly ────────────────────────────────────
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVICE_NAME         "ESP32-LED"

// ── Globals ───────────────────────────────────────────────────────────────────
BLEServer*         pServer         = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected     = false;
bool oldDeviceConnected  = false;

// ── Connection callbacks ──────────────────────────────────────────────────────
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Client connected");
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected");
  }
};

// ── Write callback — fires when webapp sends '1' or '0' ──────────────────────
class LEDCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    std::string value = pCharacteristic->getValue();

    if (value.length() > 0) {
      char cmd = value[0];
      Serial.print("[BLE] Received: ");
      Serial.println(cmd);

      if (cmd == '1') {
        digitalWrite(LED_PIN, HIGH);
        Serial.println("[LED] ON");
      } else if (cmd == '0') {
        digitalWrite(LED_PIN, LOW);
        Serial.println("[LED] OFF");
      }
    }
  }
};

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("Starting ESP32 BLE LED server…");

  // Init BLE
  BLEDevice::init(DEVICE_NAME);

  // Create server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create service
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Create characteristic with WRITE + READ properties
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ  |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setCallbacks(new LEDCallbacks());
  pCharacteristic->setValue("0");  // initial value

  // Start service & advertising
  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising started. Device name: " DEVICE_NAME);
  Serial.println("Waiting for connection…");
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  // Re-start advertising after disconnect so webapp can reconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Re-advertising…");
    oldDeviceConnected = false;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = true;
  }

  delay(10);
}
