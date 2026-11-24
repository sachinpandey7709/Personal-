// DATABASE SETTINGS

const DB_NAME = "SKPVideoLibrary";
const STORE_NAME = "videos";

let db;
let currentFilter = "All";
let currentObjectURL = null;

// Allowed File Extensions

const allowedExtensions = [
    "mp4", "mkv", "avi", "mov",
    "wmv", "webm", "flv", "ts",
    "mp3", "wav", "aac", "m4a",
    "ogg", "flac"
];


// OPEN EXISTING DATABASE

const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = function(event) {

    db = event.target.result;

    if (!db.objectStoreNames.contains(STORE_NAME)) {

        db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true
        });

    }

};

request.onsuccess = function(event) {

    db = event.target.result;

    displayVideos();

};

request.onerror = function() {

    document.getElementById("status").textContent =
        "Database could not be opened.";

};


// UPLOAD VIDEO OR AUDIO

function uploadVideo() {

    const file = document.getElementById("videoFile").files[0];

    const name = document.getElementById("videoName").value.trim();

    const category = document.getElementById("category").value;

    if (!file) {

        alert("Please select a file.");

        return;

    }

    if (!name) {

        alert("Please enter file name.");

        return;

    }

    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {

        alert("Unsupported file format.");

        return;

    }

    if (!db) {

        alert("Database is not ready.");

        return;

    }

    const mediaType = file.type.startsWith("audio/")
        ? "audio"
        : file.type.startsWith("video/") || extension === "ts"
            ? "video"
            : ["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(extension)
                ? "audio"
                : "video";

    const video = {

        name: name,

        category: category,

        file: file,

        mediaType: mediaType,

        extension: extension,

        favourite: false,

        date: Date.now()

    };

    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).add(video);

    transaction.oncomplete = function() {

        document.getElementById("status").textContent =
            "File uploaded successfully!";

        document.getElementById("videoFile").value = "";

        document.getElementById("videoName").value = "";

        displayVideos();

    };

    transaction.onerror = function() {

        alert("Storage failed. Browser storage may be full.");

    };

}


// GET ALL FILES

function getVideos(callback) {

    const transaction = db.transaction(STORE_NAME, "readonly");

    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = function() {

        callback(request.result);

    };

}


// DISPLAY FILES

function displayVideos() {

    if (!db) return;

    getVideos(function(videos) {

        const container = document.getElementById("videoContainer");

        container.innerHTML = "";

        const search = document.getElementById("search")
            .value.toLowerCase();

        const filtered = videos.filter(video => {

            const matchesSearch =
                video.name.toLowerCase().includes(search);

            const matchesFilter =
                currentFilter === "All" ||
                (currentFilter === "Favourites" && video.favourite) ||
                video.category === currentFilter;

            return matchesSearch && matchesFilter;

        });

        filtered.reverse().forEach(video => {

            const url = URL.createObjectURL(video.file);

            const card = document.createElement("div");

            card.className = "video-card";

            // MEDIA PREVIEW

            let preview;

            const isAudio =
                video.mediaType === "audio" ||
                video.file.type.startsWith("audio/") ||
                ["mp3", "wav", "aac", "m4a", "ogg", "flac"]
                    .includes(video.extension);

            if (isAudio) {

                preview = document.createElement("audio");

                preview.controls = true;

                preview.src = url;

            } else {

                preview = document.createElement("video");

                preview.src = url;

                preview.muted = true;

                preview.preload = "metadata";

                preview.addEventListener("click", function() {

                    playVideo(video);

                });

            }

            const title = document.createElement("h3");

            title.textContent = video.name;

            const category = document.createElement("p");

            category.textContent =
                video.category + " | " + (video.extension || "File").toUpperCase();

            // BUTTONS

            const buttons = document.createElement("div");

            buttons.className = "card-buttons";

            const playButton = document.createElement("button");

            playButton.textContent = "▶ Open";

            playButton.onclick = () => playVideo(video);

            const favButton = document.createElement("button");

            favButton.textContent =
                video.favourite ? "♥ Saved" : "♡ Favourite";

            favButton.onclick = () => toggleFavourite(video.id);

            const downloadButton = document.createElement("button");

            downloadButton.textContent = "⬇ Download";

            downloadButton.onclick = function() {

                const downloadURL = URL.createObjectURL(video.file);

                const link = document.createElement("a");

                link.href = downloadURL;

                link.download = video.name + "." + video.extension;

                link.click();

                setTimeout(() => URL.revokeObjectURL(downloadURL), 1000);

            };

            const deleteButton = document.createElement("button");

            deleteButton.textContent = "Delete";

            deleteButton.onclick = () => deleteVideo(video.id);

            buttons.append(
                playButton,
                favButton,
                downloadButton,
                deleteButton
            );

            card.append(
                preview,
                title,
                category,
                buttons
            );

            container.appendChild(card);

        });

        if (filtered.length === 0) {

            container.innerHTML = "<p>No files found.</p>";

        }

    });

}


// FILTER FILES

function filterVideos(filter) {

    currentFilter = filter;

    displayVideos();

}


// FAVOURITES

function toggleFavourite(id) {

    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = function() {

        const video = request.result;

        if (!video) return;

        video.favourite = !video.favourite;

        store.put(video);

    };

    transaction.oncomplete = displayVideos;

}


// DELETE FILE

function deleteVideo(id) {

    if (!confirm("Are you sure you want to delete this file?")) {

        return;

    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = displayVideos;

}


// PLAY VIDEO OR AUDIO

function playVideo(video) {

    closePlayer();

    currentObjectURL = URL.createObjectURL(video.file);

    const area = document.getElementById("mediaPlayerArea");

    const isAudio =
        video.mediaType === "audio" ||
        video.file.type.startsWith("audio/") ||
        ["mp3", "wav", "aac", "m4a", "ogg", "flac"]
            .includes(video.extension);

    let player;

    if (isAudio) {

        player = document.createElement("audio");

    } else {

        player = document.createElement("video");

    }

    player.src = currentObjectURL;

    player.controls = true;

    player.autoplay = true;

    player.style.width = "100%";

    player.style.maxHeight = "70vh";

    area.appendChild(player);

    document.getElementById("playerTitle").textContent = video.name;

    document.getElementById("playerModal").style.display = "flex";

    player.play().catch(() => {});

}


// CLOSE PLAYER

function closePlayer() {

    const area = document.getElementById("mediaPlayerArea");

    if (area) {

        const player = area.querySelector("video, audio");

        if (player) {

            player.pause();

            player.removeAttribute("src");

            player.load();

        }

        area.innerHTML = "";

    }

    document.getElementById("playerModal").style.display = "none";

    if (currentObjectURL) {

        URL.revokeObjectURL(currentObjectURL);

        currentObjectURL = null;

    }

}


// SEARCH

document.getElementById("search").addEventListener("input", displayVideos);
