/*
 * ============================================================
 *  Arduino Mega 2560 – IoT Environmental Monitor
 * ============================================================
 *  Connections:
 *   SIM800L / GSM  → Serial1  (TX:18, RX:19)
 *   GY-GPS6MV2     → Serial2  (TX:16, RX:17)
 *   DHT11          → A0  (as digital, using DHT lib)
 *   MQ-135         → A2  (analog)
 *   Relay          → D40 (digital output, active-LOW)
 *
 *  Libraries needed (install via Library Manager):
 *   - DHT sensor library  (Adafruit)
 *   - TinyGPS++           (Mikal Hart)
 * ============================================================
 */

#include <DHT.h>
#include <TinyGPS++.h>
#include <SoftwareSerial.h>

// ─── Pin Definitions ────────────────────────────────────────
#define DHT_PIN       A0      // DHT11 data pin
#define DHT_TYPE      DHT11
#define MQ135_PIN     A2      // MQ-135 analog pin
#define RELAY_PIN     40      // Relay control pin (active-LOW)

// ─── Serial Ports ────────────────────────────────────────────
// Serial1 → GSM  (TX=18, RX=19) — built-in on Mega
// Serial2 → GPS  (TX=16, RX=17) — built-in on Mega

// ─── Objects ─────────────────────────────────────────────────
DHT       dht(DHT_PIN, DHT_TYPE);
TinyGPSPlus gps;

// ─── Thresholds (tweak as needed) ────────────────────────────
const float  TEMP_THRESHOLD    = 35.0;   // °C  — relay triggers above this
const int    AIR_THRESHOLD     = 400;    // raw ADC — alert above this
const unsigned long SEND_INTERVAL = 30000; // 30 s between SMS alerts

// ─── State ───────────────────────────────────────────────────
unsigned long lastSendTime   = 0;
bool          relayState     = false;
String        alertPhone     = "+91XXXXXXXXXX"; // ← change to your number

// ─── Prototypes ──────────────────────────────────────────────
void  gsmInit();
bool  gsmSendSMS(const String& number, const String& message);
void  feedGPS();
void  printCSV();
void  controlRelay(float temp, int airQuality);

// ============================================================
void setup() {
  Serial.begin(9600);       // USB / dashboard serial
  Serial1.begin(9600);      // GSM module
  Serial2.begin(9600);      // GPS module

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // relay OFF (active-LOW)

  dht.begin();

  Serial.println(F("BOOT"));
  Serial.println(F("timestamp,temperature,humidity,airQuality,latitude,longitude,altitude,relay"));

  gsmInit();
  delay(2000);
}

// ============================================================
void loop() {
  // ── 1. Feed GPS parser ──────────────────────────────────
  feedGPS();

  // ── 2. Read DHT11 ───────────────────────────────────────
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    temperature = -99;
    humidity    = -99;
  }

  // ── 3. Read MQ-135 ──────────────────────────────────────
  int airQuality = analogRead(MQ135_PIN);   // 0-1023

  // ── 4. Relay logic ──────────────────────────────────────
  controlRelay(temperature, airQuality);

  // ── 5. Send CSV to Serial (for dashboard) ───────────────
  printCSV(temperature, humidity, airQuality);

  // ── 6. SMS alert (every SEND_INTERVAL if threshold hit) ─
  unsigned long now = millis();
  if ((now - lastSendTime) >= SEND_INTERVAL) {
    if (temperature > TEMP_THRESHOLD || airQuality > AIR_THRESHOLD) {
      String msg = "ALERT!\n";
      msg += "Temp: "     + String(temperature, 1) + " C\n";
      msg += "Humidity: " + String(humidity, 1)    + " %\n";
      msg += "AirQ: "     + String(airQuality)     + "\n";
      if (gps.location.isValid()) {
        msg += "GPS: "    + String(gps.location.lat(), 6)
                          + ","
                          + String(gps.location.lng(), 6);
      } else {
        msg += "GPS: No fix";
      }
      gsmSendSMS(alertPhone, msg);
      lastSendTime = now;
    }
  }

  delay(2000); // 2-second update cycle
}

// ============================================================
//  Print one CSV row to Serial (dashboard reads this)
// ============================================================
void printCSV(float temp, float hum, int airQ) {
  // timestamp (seconds since boot)
  Serial.print(millis() / 1000UL);
  Serial.print(',');
  Serial.print(temp, 1);
  Serial.print(',');
  Serial.print(hum, 1);
  Serial.print(',');
  Serial.print(airQ);
  Serial.print(',');

  if (gps.location.isValid()) {
    Serial.print(gps.location.lat(), 6);
    Serial.print(',');
    Serial.print(gps.location.lng(), 6);
    Serial.print(',');
    Serial.print(gps.altitude.meters(), 1);
  } else {
    Serial.print("0.000000,0.000000,0.0");
  }

  Serial.print(',');
  Serial.println(relayState ? 1 : 0);
}

// ============================================================
//  Feed all available GPS bytes into TinyGPS++
// ============================================================
void feedGPS() {
  while (Serial2.available()) {
    gps.encode(Serial2.read());
  }
}

// ============================================================
//  Relay control – active LOW
// ============================================================
void controlRelay(float temp, int airQuality) {
  if (temp > TEMP_THRESHOLD || airQuality > AIR_THRESHOLD) {
    digitalWrite(RELAY_PIN, LOW);  // ON
    relayState = true;
  } else {
    digitalWrite(RELAY_PIN, HIGH); // OFF
    relayState = false;
  }
}

// ============================================================
//  GSM initialisation (AT commands)
// ============================================================
void gsmInit() {
  Serial.println(F("GSM: Initialising..."));

  Serial1.println("AT");           delay(1000);
  Serial1.println("ATE0");         delay(500);   // echo off
  Serial1.println("AT+CMGF=1");    delay(500);   // text mode
  Serial1.println("AT+CNMI=1,2,0,0,0"); delay(500); // new msg notify

  Serial.println(F("GSM: Ready"));
}

// ============================================================
//  Send SMS via GSM module
// ============================================================
bool gsmSendSMS(const String& number, const String& message) {
  Serial1.print("AT+CMGS=\"");
  Serial1.print(number);
  Serial1.println("\"");
  delay(1000);

  if (Serial1.find(">")) {
    Serial1.print(message);
    Serial1.write(26); // Ctrl+Z to send
    delay(3000);
    Serial.println(F("GSM: SMS sent"));
    return true;
  }

  Serial.println(F("GSM: SMS failed"));
  return false;
}
