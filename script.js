const DB_NAME = "SKPVideoLibrary";
const STORE_NAME = "videos";

let db;
let currentFilter = "All";
let currentObjectURL = null;

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

function uploadVideo() {
const file = document.getElementById("videoFile").files[0];
const name = document.getElementById("videoName").value.trim();
const category = document.getElementById("category").value;

if (!file || !file.type.startsWith("video/")) {
alert("Please select a video file.");
return;
}

if (!name) {
alert("Please enter video name.");
return;
}

const video = {
name,
category,
file,
favourite: false,
date: Date.now()
};

const transaction = db.transaction(STORE_NAME, "readwrite");
transaction.objectStore(STORE_NAME).add(video);

transaction.oncomplete = function() {
document.getElementById("status").textContent =
"Video uploaded successfully!";

document.getElementById("videoFile").value = "";  
document.getElementById("videoName").value = "";  

displayVideos();

};

transaction.onerror = function() {
alert("Storage failed. Your browser may be out of space.");
};

}

function getVideos(callback) {
const transaction = db.transaction(STORE_NAME, "readonly");
const request = transaction.objectStore(STORE_NAME).getAll();

request.onsuccess = function() {
callback(request.result);
};

}

function displayVideos() {
if (!db) return;

getVideos(function(videos) {
const container = document.getElementById("videoContainer");
container.innerHTML = "";

const search = document.getElementById("search").value.toLowerCase();  

const filtered = videos.filter(video => {  
    const matchesSearch = video.name.toLowerCase().includes(search);  

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

    const preview = document.createElement("video");  
    preview.src = url;  
    preview.muted = true;  
    preview.preload = "metadata";  
    preview.addEventListener("click", () => playVideo(video));  

    const title = document.createElement("h3");  
    title.textContent = video.name;  

    const category = document.createElement("p");  
    category.textContent = video.category;  

    const buttons = document.createElement("div");  
    buttons.className = "card-buttons";  

    const favButton = document.createElement("button");  
    favButton.className = "favourite";  
    favButton.textContent = video.favourite ? "♥ Saved" : "♡ Favourite";  
    favButton.onclick = () => toggleFavourite(video.id);  

    const deleteButton = document.createElement("button");  
    deleteButton.className = "delete";  
    deleteButton.textContent = "Delete";  
    deleteButton.onclick = () => deleteVideo(video.id);  

    buttons.append(favButton, deleteButton);  
    card.append(preview, title, category, buttons);  
    container.appendChild(card);  
});  

if (filtered.length === 0) {  
    container.innerHTML = "<p>No videos found.</p>";  
}

});

}

function filterVideos(filter) {
currentFilter = filter;
displayVideos();
}

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

function deleteVideo(id) {
if (!confirm("Are you sure you want to delete this video?")) return;

const transaction = db.transaction(STORE_NAME, "readwrite");
transaction.objectStore(STORE_NAME).delete(id);

transaction.oncomplete = displayVideos;

}

function playVideo(video) {
closePlayer();

currentObjectURL = URL.createObjectURL(video.file);

const player = document.getElementById("videoPlayer");
player.src = currentObjectURL;

document.getElementById("playerTitle").textContent = video.name;
document.getElementById("playerModal").style.display = "flex";

player.play().catch(() => {});

}

function closePlayer() {
const player = document.getElementById("videoPlayer");

player.pause();
player.removeAttribute("src");
player.load();

document.getElementById("playerModal").style.display = "none";

if (currentObjectURL) {
URL.revokeObjectURL(currentObjectURL);
currentObjectURL = null;
}

}

document.getElementById("search").addEventListener("input", displayVideos);
