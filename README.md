# ⚡ IoT Environmental Monitor

A real-time **IoT Environmental Monitoring System** built using **Arduino Mega 2560**, environmental sensors, GPS, GSM, relay control, and a web-based dashboard.

The system collects temperature, humidity, air-quality, and GPS data, sends the readings to a browser dashboard through USB Serial, automatically controls a relay when environmental thresholds are exceeded, and can send SMS alerts through a GSM module.

# ⚡ IoT Environmental Monitor

> A real-time IoT Environmental Monitoring System built using Arduino Mega 2560, environmental sensors, GPS, GSM, relay control, and a web-based dashboard.

## 📸 Dashboard Preview

<p align="center">
  <img src="assets/dashboard-preview.png" alt="IoT Environmental Monitor Dashboard" width="100%">
</p>

<p align="center">
  <b>Real-Time IoT Environmental Monitoring Dashboard</b>
</p>

---

## 🌐 Project Overview

The **IoT Environmental Monitor** combines embedded hardware with a real-time web dashboard.

```text
                 ┌─────────────────────────┐
                 │      ENVIRONMENTAL      │
                 │         SENSORS         │
                 │                         │
                 │ DHT11 → Temperature     │
                 │ DHT11 → Humidity        │
                 │ MQ-135 → Air Quality    │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │    ARDUINO MEGA 2560    │
                 │                         │
                 │ Sensor Processing       │
                 │ GPS Processing          │
                 │ Relay Control           │
                 │ GSM Communication       │
                 └──────┬──────┬──────┬───┘
                        │      │      │
                    USB │    GPS      │ GSM
                  Serial│   Serial2   │Serial1
                        │      │       │
                        ▼      ▼       ▼
                 ┌─────────────────────────┐
                 │    WEB DASHBOARD        │
                 │                         │
                 │ Temperature             │
                 │ Humidity                │
                 │ Air Quality             │
                 │ GPS Location            │
                 │ Relay Status            │
                 │ Live Charts             │
                 │ Event Logs              │
                 │ Alerts                  │
                 └─────────────────────────┘
```

---

# ✨ Features

* 🌡️ Real-time temperature monitoring
* 💧 Real-time humidity monitoring
* 🌿 MQ-135 air-quality monitoring
* 📍 GPS location tracking
* 📡 GSM-based SMS alerts
* ⚙️ Automatic relay control
* 📊 Live Chart.js graphs
* 🔌 Arduino Web Serial communication
* 🧪 Demo Mode
* 📋 Real-time event logging
* ⚠️ Threshold-based alerts
* 🗺️ Google Maps GPS link
* 📱 Remote SMS notification
* 📱 Responsive web interface

---

# 🧰 Hardware Components

| Component            | Purpose                           |
| -------------------- | --------------------------------- |
| Arduino Mega 2560    | Main microcontroller              |
| DHT11                | Temperature & humidity            |
| MQ-135               | Air-quality sensing               |
| GY-GPS6MV2           | GPS location                      |
| SIM800L / GSM Module | SMS communication                 |
| Relay Module         | Automatic control                 |
| USB Cable            | Arduino ↔ Dashboard communication |
| Power Supply         | System power                      |

---

# 🔌 Pin Configuration

## Arduino Mega 2560

| Device    | Arduino Pin | Interface     |
| --------- | ----------: | ------------- |
| DHT11     |          A0 | Digital       |
| MQ-135    |          A2 | Analog        |
| Relay     |         D40 | Digital       |
| GSM TX/RX |     Serial1 | Hardware UART |
| GPS TX/RX |     Serial2 | Hardware UART |
| Dashboard |      Serial | USB           |

### Hardware Serial Mapping

```text
Serial  → USB / Web Dashboard
Serial1 → GSM
Serial2 → GPS
```

Arduino Mega 2560 hardware UART pins:

```text
Serial1
TX1 → Pin 18
RX1 → Pin 19

Serial2
TX2 → Pin 16
RX2 → Pin 17
```

---

# 📡 GSM Configuration

The GSM module communicates with the Arduino through **Serial1**.

```text
GSM Module
    │
    ├── TX → Arduino RX1 (Pin 19)
    └── RX → Arduino TX1 (Pin 18)
```

Baud rate:

```text
9600
```

The firmware initializes the GSM module using AT commands.

```text
AT
ATE0
AT+CMGF=1
AT+CNMI=1,2,0,0,0
```

The system uses SMS alerts when temperature or air quality exceeds the configured threshold.

---

# 📍 GPS Configuration

The project uses a **GY-GPS6MV2** GPS module connected to `Serial2`.

```text
GPS
 │
 ├── TX → Arduino RX2 (Pin 17)
 └── RX → Arduino TX2 (Pin 16)
```

GPS data is processed using the **TinyGPS++** library.

The dashboard displays:

* Latitude
* Longitude
* Altitude
* GPS Fix status

When a valid GPS position is available, the dashboard provides an option to open the location in Google Maps.

---

# 🌡️ Environmental Sensors

## DHT11

The DHT11 provides:

```text
Temperature → °C
Humidity    → %
```

Connection:

```text
DHT11 DATA → A0
```

---

## 🌿 MQ-135

The MQ-135 is connected to:

```text
MQ-135 AO → A2
```

The Arduino reads the sensor using:

```cpp
analogRead(MQ135_PIN);
```

The ADC range is:

```text
0 – 1023
```

The dashboard categorizes the raw ADC reading as:

|       ADC | Status      |
| --------: | ----------- |
|   `< 200` | 🟢 Good     |
| `200–400` | 🟡 Moderate |
|   `> 400` | 🔴 Poor     |

> These values are threshold classifications for this project and are not a calibrated air-quality/PPM measurement.

---

# ⚙️ Automatic Relay Control

The relay is connected to:

```text
Relay → D40
```
//piyush bopche //
The relay is configured as **active LOW**.

```text
LOW  → Relay ON
HIGH → Relay OFF
```

The relay activates when either condition is true:

```text
Temperature > 35°C
       OR
Air Quality ADC > 400
```

Logic:

```text
             Sensor Data
                  │
          ┌───────┴────────┐
          │                │
      Temp > 35°C     AirQ > 400
          │                │
          └───────┬────────┘
                  │
                  ▼
             Relay ON
```

Otherwise:

```text
Temperature ≤ 35°C
       AND
Air Quality ≤ 400
       ↓
Relay OFF
```

---

# 📱 SMS Alert System

The system can send an SMS when an environmental threshold is exceeded.

Current firmware configuration:

```text
Temperature threshold = 35°C
Air-quality threshold = 400 ADC
SMS interval          = 30 seconds
```

The SMS contains:

```text
ALERT!

Temp: XX.X C
Humidity: XX.X %
AirQ: XXX
GPS: latitude,longitude
```

If GPS does not have a valid fix:

```text
GPS: No fix
```

### ⚠️ Configure Your Phone Number

In the Arduino code, replace:

```cpp
String alertPhone = "+91XXXXXXXXXX";
```

with your destination phone number.

**Do not commit a real phone number to a public GitHub repository.**

For a public repository, use a placeholder or move the number into a separate configuration file.

---

# 🔄 Data Flow

```text
DHT11 ───────────────┐
                     │
MQ-135 ──────────────┤
                     │
GPS ─────────────────┤
                     ▼
              Arduino Mega 2560
                     │
        ┌────────────┼─────────────┐
        │            │             │
        ▼            ▼             ▼
      Relay         GSM          USB Serial
        │            │             │
        │            ▼             ▼
        │          SMS Alert    Web Dashboard
        │                          │
        │                 ┌────────┼─────────┐
        │                 │        │         │
        ▼                 ▼        ▼         ▼
   Environmental       Charts     GPS       Logs
   Control             KPI       Map       Alerts
```

---

# 💻 Software Architecture

```text
Arduino Firmware
       │
       │ CSV over Serial
       ▼
Web Serial API
       │
       ▼
JavaScript
       │
       ├── CSV Parser
       ├── KPI Updater
       ├── GPS Updater
       ├── Relay Status
       ├── Event Logger
       └── Alert System
       │
       ▼
Chart.js
       │
       ▼
Web Dashboard
```

---

# 📡 Serial Communication Protocol

The Arduino sends data to the dashboard as comma-separated values.

Format:

```text
timestamp,temperature,humidity,airQuality,latitude,longitude,altitude,relay
```

Example:

```text
120,29.5,64.2,185,23.259900,77.412600,498.5,0
```

### Field Description

| Field         | Description                | Example     |
| ------------- | -------------------------- | ----------- |
| `timestamp`   | Seconds since Arduino boot | `120`       |
| `temperature` | Temperature                | `29.5`      |
| `humidity`    | Humidity                   | `64.2`      |
| `airQuality`  | Raw MQ-135 ADC             | `185`       |
| `latitude`    | GPS latitude               | `23.259900` |
| `longitude`   | GPS longitude              | `77.412600` |
| `altitude`    | GPS altitude               | `498.5`     |
| `relay`       | Relay state                | `0` / `1`   |

Relay:

```text
0 = OFF
1 = ON
```

---

# ⏱️ Update Cycle

The Arduino runs a **2-second sensor update cycle**.

```text
Every 2 seconds:

Read GPS
   ↓
Read DHT11
   ↓
Read MQ-135
   ↓
Control Relay
   ↓
Send CSV
   ↓
Wait 2 seconds
```

SMS alerts are checked using the configured SMS interval.

---

# 📊 Web Dashboard

The dashboard contains four primary KPI cards:

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Temperature  │ Humidity     │ Air Quality  │ Relay D40    │
│              │              │              │              │
│ 29.5 °C      │ 64.2 %       │ 185 ADC      │ OFF          │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## The HTML implementation includes these KPI cards and their live status elements.

# 📈 Real-Time Charts

The dashboard uses **Chart.js**.

Available graphs:

### Temperature

```text
Temperature History
```

### Humidity

```text
Humidity History
```

### Air Quality

```text
Air Quality (MQ-135 Raw ADC)
```

The dashboard keeps the latest **60 readings** for visualization.

---

# 📍 GPS Dashboard

GPS information is displayed as:

```text
Latitude
Longitude
Altitude
GPS Fix
```

When a valid fix is received:

```text
✔ Fixed
```

The dashboard generates a Google Maps location link using the received coordinates.

---

# 🧪 Demo Mode

The dashboard includes a Demo Mode that works without physical hardware.

Demo Mode generates simulated:

* Temperature
* Humidity
* Air Quality
* GPS
* Relay state

This is useful for:

* Hackathon demonstrations
* Project presentations
* UI development
* Testing
* Portfolio demonstrations

---

# 📋 Event Log

The dashboard provides a real-time event log.

Example:

```text
01:20:10  Dashboard ready
01:20:14  Serial port opened at 9600 baud
01:20:18  T:28.5°C H:62.4% AQ:175 Relay:OFF
01:21:02  High temperature: 36.2°C
01:21:04  Relay D40 activated
```

The dashboard limits the event log to 200 entries.

---

# ⚠️ Alert System

The dashboard generates alerts when configured limits are exceeded.

### Temperature Alert

```text
Temperature > 35°C
```

### Air Quality Alert

```text
Air Quality > 400 ADC
```

The dashboard displays a toast notification and records the event in the event log.

---

# 📁 Project Structure

```text
IoT-Environmental-Monitor/
│
├── index.html
├── style.css
├── app.js
├── arduino_mega_iot.ino
└── README.md
```

---

# 🧩 Required Arduino Libraries

Install the following libraries using the Arduino IDE Library Manager:

### DHT Sensor Library

**Author:** Adafruit

Used for:

```text
DHT11 Temperature
DHT11 Humidity
```

### TinyGPS++

**Author:** Mikal Hart

Used for:

```text
GPS parsing
Latitude
Longitude
Altitude
GPS validity
```

---

# 🛠️ Arduino Setup

## Step 1 — Install Arduino IDE

Install the Arduino IDE on your computer.

---

## Step 2 — Install Libraries

Open:

```text
Arduino IDE
   ↓
Library Manager
```

Install:

```text
DHT sensor library
TinyGPS++
```

---

## Step 3 — Select Board

Select:

```text
Arduino Mega or Mega 2560
```

Processor:

```text
ATmega2560
```

---

## Step 4 — Select COM Port

Connect the Arduino Mega 2560 using USB.

Then select the correct COM port:

```text
Tools → Port → COMx
```

---

## Step 5 — Configure Phone Number

Inside:

```text
arduino_mega_iot.ino
```

change:

```cpp
String alertPhone = "+91XXXXXXXXXX";
```

to your destination number.

For a public GitHub repository, keep the placeholder instead of publishing your private number.

---

## Step 6 — Upload Firmware

Upload:

```text
arduino_mega_iot.ino
```

to the Arduino Mega 2560.

---

# 🔌 Wiring Summary

```text
                    ARDUINO MEGA 2560
                   ┌─────────────────┐
                   │                 │
 DHT11 DATA ──────►│ A0              │
                   │                 │
 MQ-135 AO ───────►│ A2              │
                   │                 │
 Relay IN ────────►│ D40             │
                   │                 │
 GSM TX ──────────►│ RX1 / D19       │
 GSM RX ◄──────────│ TX1 / D18       │
                   │                 │
 GPS TX ──────────►│ RX2 / D17       │
 GPS RX ◄──────────│ TX2 / D16       │
                   │                 │
 USB ◄────────────►│ Serial          │
                   │                 │
                   └─────────────────┘
```

---

# 🌐 Running the Web Dashboard

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/IoT-Environmental-Monitor.git
```

Enter the directory:

```bash
cd IoT-Environmental-Monitor
```

Then open `index.html` using a local web server.

### VS Code

Install the **Live Server** extension.

Then:

```text
Right Click index.html
        ↓
Open with Live Server
```

---

# 🔌 Connect Dashboard to Arduino

1. Connect Arduino Mega 2560 through USB.
2. Upload the firmware.
3. Open the dashboard.
4. Click **Connect Serial**.
5. Select the Arduino COM port.
6. The dashboard communicates at:

```text
9600 baud
```

7. Live readings should appear automatically.

The dashboard's JavaScript uses the browser Web Serial API and opens the Arduino connection at 9600 baud.

---

# 🌍 Browser Requirements

Physical Arduino communication requires Web Serial support.

Recommended:

* Google Chrome
* Microsoft Edge

The dashboard also provides Demo Mode for environments where Web Serial is unavailable.

---

# 📊 Threshold Configuration

Thresholds can be changed in:

```text
arduino_mega_iot.ino
```

Current values:

```cpp
const float TEMP_THRESHOLD = 35.0;
const int AIR_THRESHOLD = 400;
const unsigned long SEND_INTERVAL = 30000;
```

Dashboard status thresholds correspond to the project logic for temperature and air quality.

---

# 🏭 Applications

This system can be used for:

### 🌾 Smart Agriculture

Environmental monitoring around agricultural fields.

### 🏭 Industrial IoT

Monitoring environmental conditions in industrial environments.

### 🏠 Smart Buildings

Monitoring indoor temperature, humidity and air quality.

### 🌳 Environmental Monitoring

Remote monitoring of environmental conditions.

### 🎓 Engineering Projects

Suitable for:

* ECE projects
* IoT projects
* Embedded Systems
* Final-year projects
* Hackathons
* Research prototypes

---

# 🚀 Future Improvements

* ☁️ Cloud database integration
* 📱 Android/iOS application
* 📡 LoRa communication
* 📶 Wi-Fi connectivity
* 📈 Historical analytics
* 💾 CSV data export
* 🗺️ Embedded interactive map
* 🔔 Email notifications
* 🤖 AI-based anomaly detection
* 🌦️ Weather API integration
* 🔐 User authentication
* 📊 Advanced reporting
* 🧠 Predictive environmental analytics

---

# 🧪 Project Status

```text
🟢 Working Prototype
```

### Completed

* [x] Arduino Mega 2560 firmware
* [x] DHT11 integration
* [x] MQ-135 integration
* [x] GPS integration
* [x] GSM integration
* [x] SMS alert system
* [x] Automatic relay control
* [x] Serial CSV communication
* [x] Web dashboard
* [x] Real-time charts
* [x] GPS visualization
* [x] Event logging
* [x] Alert notifications
* [x] Demo Mode
* [x] Responsive UI

### Planned

* [ ] Cloud integration
* [ ] Mobile application
* [ ] AI analytics
* [ ] Historical database
* [ ] Remote control
* [ ] Advanced visualization

---

# 🤝 Contributing

Contributions are welcome!

```bash
git checkout -b feature/new-feature
```

Make your changes and commit:

```bash
git add .
git commit -m "Add new feature"
```

Push your branch:

```bash
git push origin feature/new-feature
```

Then create a Pull Request.

---

# 🔒 Security Note

Do not publish private credentials in GitHub.

Before pushing this project publicly, check for:

```text
❌ Phone numbers
❌ API keys
❌ GSM credentials
❌ Wi-Fi passwords
❌ Cloud credentials
❌ Private tokens
```

The GSM phone number should remain a placeholder in the public repository.

---

# 👨‍💻 Author

## Piyush Bopche

**B.Tech — Electronics & Communication Engineering**

**LNCT Bhopal**

Interested in:

```text
IoT
Embedded Systems
Electronics
AI
Web Development
Smart Agriculture
```

---

# ⭐ Support the Project

If you find this project useful:

```text
⭐ Star the repository
🍴 Fork the repository
🐛 Report issues
💡 Suggest improvements
🤝 Contribute
```

---

## ⚡ IoT Environmental Monitor

```text
SENSE → PROCESS → ANALYZE → ALERT → ACT
```

Built for **IoT • Embedded Systems • Environmental Monitoring**
