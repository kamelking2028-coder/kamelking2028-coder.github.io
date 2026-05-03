// --- Heure locale ---
function heureLocale(timezone) {
    return new Date().toLocaleTimeString("fr-FR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

// --- Météo locale ---
async function meteoLocale(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const r = await fetch(url);
    const data = await r.json();
    return `${data.current_weather.temperature}°C`;
}

// --- Mise à jour automatique ---
let intervalHeure = null;

async function afficherInfosRadio(radio) {

    // Heure locale
    clearInterval(intervalHeure);
    intervalHeure = setInterval(() => {
        document.getElementById("heure-radio").textContent = heureLocale(radio.timezone);
    }, 1000);

    // Météo locale
    const meteo = await meteoLocale(radio.lat, radio.lon);
    document.getElementById("meteo-radio").textContent = meteo;
}

