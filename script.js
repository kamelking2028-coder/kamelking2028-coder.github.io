/* ============================================================
   RADIO MAP — VERSION PREMIUM AVANCÉE
   Optimisation : structure, géocodage, cache, performances
   Auteur : KAMEL MHALLA
   ============================================================ */

// === Variables globales ===

let map = null;
let marker = null;
let currentCountryCode = "";
let allRadiosCache = [];
let currentTab = "all";
let countries = [];

const radiosList = document.getElementById("radios");
const genreSelect = document.getElementById("genre");
const player = document.getElementById("player");
const tabButtons = document.querySelectorAll(".tab-btn");
const miniPlayer = document.getElementById("mini-player");
const miniTitle = document.getElementById("mini-title");
const miniCover = document.getElementById("mini-cover");
const miniStop = document.getElementById("mini-stop");
const countryListEl = document.getElementById("country-list");

// === Icônes météo ===

const weatherIcons = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    71: "❄️", 73: "❄️", 75: "❄️",
    95: "⛈️", 96: "⛈️", 99: "⛈️"
};

// === ICI : initialisation au chargement ===//
document.addEventListener("DOMContentLoaded", () => {

    map = L.map("map").setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);
    
    fetch("countries.json?v=" + Date.now())
        .then(res => res.json())
        .then(data => {
            countries = data;
            renderCountries(countries);
        });
        
    chargerRadios();
});

// === Chargement pays ==

fetch("countries.json?v=" + Date.now())
    .then(res => res.json())
    .then(data => {
        countries = data;
         renderCountries(countries);
    });

// === Affichage liste pays ===
function renderCountries(list) {
    countryListEl.innerHTML = "";
    list.forEach(c => {
        const div = document.createElement("div");
        div.className = "country-item";
        div.innerHTML = `
            <img class="country-flag" src="flags/${c.code.toLowerCase()}.svg">
            <span>${c.name}</span>
        `;
        div.onclick = () => {
            currentCountryCode = c.code.toUpperCase();
            afficherCarteLeaflet(currentCountryCode);
            fetchRadios(currentCountryCode);
            countryListEl.classList.add("hidden");
            document.querySelector(".toggle-btn").classList.remove("open");
        };
        countryListEl.appendChild(div);
    });
}
// === Recherche pays ===
const searchInputEl = document.getElementById("search-input");
if (searchInputEl) {
    searchInputEl.addEventListener("input", () => {
        const term = searchInputEl.value.toLowerCase();
        renderCountries(countries.filter(c => c.name.toLowerCase().includes(term)));
    });
}


// === Météo ===
async function getWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode`;
    const res = await fetch(url);
    return await res.json();
}

// Météo locale
navigator.geolocation.getCurrentPosition(async pos => {
    try {
        const { latitude, longitude } = pos.coords;
        const data = await getWeather(latitude, longitude);
       

        document.getElementById("weather-local").innerHTML = `
            <div class="weather-city">Votre météo</div>
            <div class="weather-temp">${data.current_weather.temperature}°</div>
            <div class="weather-icon">${weatherIcons[data.current_weather.weathercode] || "☁️"}</div>

        `;
        document.getElementById("weather-local").onclick = () =>
            showWeatherDetails(data, "Votre météo");

    } catch {
        document.getElementById("weather-local").innerHTML =
            `<p class="weather-loading">Météo locale indisponible</p>`;
    }
}, () => {
    document.getElementById("weather-local").innerHTML =
        `<p class="weather-loading">Localisation refusée</p>`;
});

// Météo externe
async function updateRadioWeather(lat, lon) {
    try {
        const data = await getWeather(lat, lon);
        document.getElementById("weather-radio").innerHTML = `
            <div class="weather-city">Météo externe</div>
            <div class="weather-temp">${data.current_weather.temperature}°</div>
            <div class="weather-icon">${weatherIcons[data.current_weather.weathercode] || "☁️"}</div>
        `;
        document.getElementById("weather-radio").onclick = () =>
            showWeatherDetails(data, "Météo externe");

    } catch {
        document.getElementById("weather-radio").innerHTML =
            `<p class="weather-loading">Météo externe indisponible</p>`;
    }
}

// === Détails météo ===
function showWeatherDetails(data, title) {
    const box = document.getElementById("weather-details");
    const hourlyTemps = data.hourly?.temperature_2m?.slice(0, 6) || [];
    const hourlyStr = hourlyTemps.map(t => `${t}°`).join(" • ");

    box.innerHTML = `
        <h2>${title}</h2>
        <p><strong>Température :</strong> ${data.current_weather.temperature}°C</p>
        <p><strong>Vent :</strong> ${data.current_weather.windspeed} km/h</p>
        <p><strong>Direction :</strong> ${data.current_weather.winddirection}°</p>
        <h3>Prochaines heures</h3>
        <p>${hourlyStr || "Données horaires indisponibles"}</p>
        <br>
        <button id="close-weather">Fermer</button>
    `;

    box.classList.add("show");
    document.getElementById("close-weather").onclick = () =>
        box.classList.remove("show");
}

// === Loader ===
function showLoader() {
    document.getElementById("loader").style.display = "block";
    radiosList.style.opacity = "0.3";
}
function hideLoader() {
    document.getElementById("loader").style.display = "none";
    radiosList.style.opacity = "1";
}

// === Mini player ===
miniStop.onclick = () => {
    player.pause();
    miniPlayer.style.display = "none";
};

// === Favoris ===
function getFavoris() {
    return JSON.parse(localStorage.getItem("favoris") || "[]");
}
function saveFavoris(favs) {
    localStorage.setItem("favoris", JSON.stringify(favs));
}
function isFavori(id) {
    return getFavoris().some(r => r.stationuuid === id);
}
function toggleFavori(radio) {
    let favs = getFavoris();
    if (isFavori(radio.stationuuid)) {
        favs = favs.filter(r => r.stationuuid !== radio.stationuuid);
    } else {
        favs.push(radio);
    }
    saveFavoris(favs);
    renderRadios();
}

// === Icône drapeau ===
function getFlagIcon(code) {
    if (!code) return null;
    return L.icon({
        iconUrl: "flags/" + code.toLowerCase() + ".svg",
        iconSize: [36, 27],
        iconAnchor: [18, 27],
        className: "flag-marker"
    });
}
// 1) Créer la carte
    map = L.map("map", {
        zoomControl: true,
        attributionControl: true
    }).setView([20, 0], 2);

    // 2) Ajouter le fond satellite
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri"
    }).addTo(map);

    // 3) Fix affichage
    setTimeout(() => map.invalidateSize(), 200);

    // 4) 🔥 Maintenant on peut afficher la carte monde
    afficherCarteLeaflet("WORLD");



document.addEventListener("DOMContentLoaded", () => {

    // === PARTIE 1 : Code général (modales, boutons, UI) ===
    countrySelect.addEventListener("change", () => {
        const radios = document.getElementById("radios");
        if (radios) radios.innerHTML = "";
    });

    // === PARTIE 2 : Vérifier si la page contient la carte ===
    if (!document.getElementById("map")) {
        console.log("Page sans carte → script carte ignoré.");
        return;
    }

    // === PARTIE 3 : Initialisation de la carte ===

    // 1) Créer la carte
    map = L.map("map", {
        zoomControl: true,
        attributionControl: true
    }).setView([20, 0], 2);

    // 2) Ajouter le fond satellite
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri"
    }).addTo(map);

    // 3) Fix affichage
    setTimeout(() => map.invalidateSize(), 200);

    // 4) 🔥 Maintenant on peut afficher la carte monde
    afficherCarteLeaflet("WORLD");
});

// === Carte Leaflet ===
function afficherCarteLeaflet(codePays) {
    if (!codePays) return;

    if (codePays === "WORLD") {
        map.setView([20, 0], 2);
        setTimeout(() => map.invalidateSize(), 200);
        return;
    }

    fetch("countries.json?v=" + Date.now())
        .then(r => r.json())
        .then(countries => {
            const country = countries.find(c => c.code === codePays);
            if (!country) return;

            const { lat, lon } = country;

            if (!map) {
                map = L.map("map").setView([lat, lon], 5);
                L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
                    attribution: "Tiles © Esri"
                }).addTo(map);
            } else {
                map.setView([lat, lon], 5);
            }

            setTimeout(() => {
                map.invalidateSize();
            }, 200);

            if (marker) marker.remove();
            marker = L.marker([lat, lon], { icon: getFlagIcon(codePays) }).addTo(map);
        });
}


// === Redessiner la carte sur resize ===

window.addEventListener("resize", () => {
    if (map) map.invalidateSize();
});

// === Serveurs RadioBrowser ===
const SERVERS = [
    "https://de1.api.radio-browser.info",
    "https://nl1.api.radio-browser.info",
    "https://fr1.api.radio-browser.info"
];

let workingServer = null;

async function findWorkingServer() {
    for (const server of SERVERS) {
        try {
            const test = await fetch(`${server}/json/stations/search?limit=1`);
            if (test.ok) return server;
        } catch {}
    }
    return null;
}

// === Radios ===
async function fetchRadios(codePays) {
    if (!codePays) {
        radiosList.innerHTML = "<p>Choisissez un pays pour afficher les radios.</p>";
        return;
    }

    if (!workingServer) {
        workingServer = await findWorkingServer();
        if (!workingServer) {
            radiosList.innerHTML = "<p>Aucun serveur RadioBrowser disponible.</p>";
            return;
        }
    }

    const genre = genreSelect.value;

    const params = new URLSearchParams({
        countrycode: codePays,
        hidebroken: "true",
        order: "clickcount",
        reverse: "true",
        limit: "100"
    });

    if (genre) params.append("tag", genre);

    showLoader();

    fetch(`${workingServer}/json/stations/search?${params}`)
        .then(r => r.json())
        .then(radios => {
            hideLoader();
            // 🔥🔥🔥 Fallback AdSense : si l’API renvoie vide
            if (!radios || radios.length === 0) {
                radiosList.innerHTML = "<p>Aucune radio trouvée pour ce pays.</p>";
                return;
            }

            allRadiosCache = radios;

            // Ajouts manuels
            if (codePays === "BE") {
                allRadiosCache.push({
                    name: "Arabel (ouvrir le player)",
                    url: "https://arabelfm.ice.infomaniak.ch/arabelprodcastfm.mp3",
                    //==externalLink: "https://www.arabel.fm/radioplayer/",== 
                    favicon: "icons/Logo-AraBel.png",
                    countrycode: "BE",
                    geo_lat: 50.8503,
                    geo_long: 4.3517,
                    tags: "arabic,community",
                    stationuuid: "arabel-manuel"
                });
            }
        


            renderRadios();
        })
        .catch(() => {
            hideLoader();
            radiosList.innerHTML = "<p>Impossible de charger les radios.</p>";
        });
}

// === Filtre recherche radios ===
function filterRadiosBySearch(radios) {
    const q = document.getElementById("search").value.toLowerCase().trim();
    if (!q) return radios;
    return radios.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.tags?.toLowerCase().includes(q)
    );
}

// === Affichage radios ===
function renderRadios() {
    radiosList.innerHTML = "";
    let radiosToShow = currentTab === "all" ? allRadiosCache : getFavoris();
    radiosToShow = filterRadiosBySearch(radiosToShow);

    if (!radiosToShow.length) {
        radiosList.innerHTML = "<p> Aucune radio trouvée.</p>";
        return;
    }

    radiosToShow.forEach(radio => {
        const card = document.createElement("div");
        card.className = "radio-item";

        const img = document.createElement("img");
        img.src = radio.favicon || "https://cdn-icons-png.flaticon.com/128/4214/4214997.png";
        img.onerror = () => img.src = "https://cdn-icons-png.flaticon.com/128/4214/4214997.png";

        const name = document.createElement("p");
        name.className = "radio-name";
        name.textContent = radio.name;

        const genre = document.createElement("p");
        genre.className = "radio-genre";
        genre.textContent = radio.tags?.split(",")[0] || "";

        const fav = document.createElement("span");
        fav.className = "fav-btn";
        fav.textContent = isFavori(radio.stationuuid) ? "❤️" : "💛";

        fav.onclick = e => {
            e.stopPropagation();
            toggleFavori(radio);
            fav.textContent = isFavori(radio.stationuuid) ? "❤️" :"💛";
        };
        
        card.onclick = async () => {

            if (radio.externalLink) {
                window.open(radio.externalLink, "_blank");
                return;
            }

            const url = radio.url_resolved || radio.url;
            if (!url) return;

            player.src = url;
            player.play();

            miniTitle.textContent = radio.name;
            miniCover.src = radio.favicon || "https://cdn-icons-png.flaticon.com/128/4214/4214997.png";
            miniPlayer.style.display = "flex";

            if (radio.geo_lat && radio.geo_long) {
                if (marker) marker.remove();
                marker = L.marker([radio.geo_lat, radio.geo_long], { icon: getFlagIcon(radio.countrycode) }).addTo(map);
                map.setView([radio.geo_lat, radio.geo_long], 12);
                updateRadioWeather(radio.geo_lat, radio.geo_long);
                afficherInfosRadio(radio); // ← AJOUT ICI
                return;
            }

            const city = radio.city || radio.state || radio.name;
            const coords = await geocodeLocation(city, radio.countrycode);

            if (!coords) return;
            
            if (marker) marker.remove();
            marker = L.marker([coords.lat, coords.lon], { icon: getFlagIcon(radio.countrycode) }).addTo(map);
            map.setView([coords.lat, coords.lon], 12);
            updateRadioWeather(coords.lat, coords.lon);
            afficherInfosRadio(radio); // ← AJOUT ICI AUSSI
        };

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(genre);
        card.appendChild(fav);
        radiosList.appendChild(card);
    });
}

// === Changement de genre ===
genreSelect.onchange = () => {
    if (currentCountryCode) fetchRadios(currentCountryCode);
};

// === Tabs ===
tabButtons.forEach(btn => {
    btn.onclick = () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentTab = btn.dataset.tab;
        renderRadios();
    };
});

// === Recherche radios ===
document.getElementById("search").oninput = () => renderRadios();

// === Mini-player draggable ===
let isDragging = false, offsetX = 0, offsetY = 0;

miniPlayer.onmousedown = startDrag;
miniPlayer.ontouchstart = startDrag;

function startDrag(e) {
    isDragging = true;
    const rect = miniPlayer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;

    document.onmousemove = drag;
    document.onmouseup = stopDrag;
    document.ontouchmove = drag;
    document.ontouchend = stopDrag;
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    miniPlayer.style.left = (clientX - offsetX) + "px";
    miniPlayer.style.top = (clientY - offsetY) + "px";
}

function stopDrag() {
    isDragging = false;
    document.onmousemove = null;
    document.onmouseup = null;
    document.ontouchmove = null;
    document.ontouchend = null;
}

// === Modales ===
const aboutBtn = document.getElementById("aboutBtn");
const aboutModal = document.getElementById("aboutModal");
const aboutClose = document.querySelector(".close");

if (aboutBtn && aboutModal && aboutClose) {
    aboutBtn.onclick = () => aboutModal.style.display = "block";
    aboutClose.onclick = () => aboutModal.style.display = "none";
}

// === Toggle liste pays ===
function toggleCountries() {
    const list = document.getElementById("country-list");
    const btn = document.querySelector(".toggle-btn");

    list.classList.toggle("hidden");
    btn.classList.toggle("open");
}
// === Redessiner carte sur resize ===
window.addEventListener("resize", () => {
    if (map) map.invalidateSize();
});

// === Orientation mobile ===
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 300);
});

// === Quand l’onglet devient visible ===
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && map) {
        setTimeout(() => map.invalidateSize(), 200);
    }
});

// === Quand tout est chargé ===
window.addEventListener("load", () => {
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 300);
});



// === Géocodage ===
async function geocodeLocation(city, country) {
    const query = encodeURIComponent(`${city || ""} ${country || ""}`);
    const url = `https://geocode.maps.co/search?q=${query}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
    } catch (e) {
        console.error("Erreur geocoding :", e);
    }

    return null;
}
