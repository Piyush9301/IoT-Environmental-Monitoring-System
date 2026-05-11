from flask import Flask, render_template
from flask_socketio import SocketIO
import serial
import json
import threading

app = Flask(__name__)
socketio = SocketIO(app)

# CHANGE COM PORT
ser = serial.Serial('COM5', 9600)

@app.route('/')
def index():
    return render_template('index.html')

def read_serial():
    while True:
        try:
            line = ser.readline().decode().strip()

            if line.startswith("{"):
                data = json.loads(line)

                socketio.emit('sensor_data', data)

                print(data)

        except Exception as e:
            print(e)

thread = threading.Thread(target=read_serial)
thread.daemon = True
thread.start()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
