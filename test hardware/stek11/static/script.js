const socket = io();

const tempEl = document.getElementById('temp');
const humEl = document.getElementById('hum');
const mqEl = document.getElementById('mq');
const relayEl = document.getElementById('relay');

const ctx = document.getElementById('sensorChart').getContext('2d');

const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Temperature',
                borderColor: 'red',
                data: []
            },
            {
                label: 'Humidity',
                borderColor: 'blue',
                data: []
            },
            {
                label: 'Air Quality',
                borderColor: 'green',
                data: []
            }
        ]
    }
});

const map = L.map('map').setView([0, 0], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
}).addTo(map);

const marker = L.marker([0,0]).addTo(map);

socket.on('sensor_data', function(data){

    tempEl.innerHTML = data.temperature + " °C";
    humEl.innerHTML = data.humidity + " %";
    mqEl.innerHTML = data.mq135;

    relayEl.innerHTML = data.relay ? "ON" : "OFF";

    const time = new Date().toLocaleTimeString();

    chart.data.labels.push(time);

    chart.data.datasets[0].data.push(data.temperature);
    chart.data.datasets[1].data.push(data.humidity);
    chart.data.datasets[2].data.push(data.mq135);

    if(chart.data.labels.length > 10){
        chart.data.labels.shift();

        chart.data.datasets.forEach(ds => ds.data.shift());
    }

    chart.update();

    if(data.lat != 0 && data.lng != 0){

        marker.setLatLng([data.lat, data.lng]);

        map.setView([data.lat, data.lng], 15);
    }
});