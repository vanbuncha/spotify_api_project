var redirect_uri = "https://vanguyen.info/spotify_api_project/";


// Setting client_id and client_secret + savinig to localstorage
var client_id = "055761bcf5624053b43975b0a48c0f7b";
var client_secret = "a612abd8234648b7a1217b33d478f582";
localStorage.setItem("client_id", client_id);
localStorage.setItem("client_secret", client_secret);

// var initialize
var access_token = null;
var refresh_token = null;
var currentPlaylist = "";

// spotify endpoints used
const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token";
const PLAYLISTS = "https://api.spotify.com/v1/me/playlists";
const DEVICES = "https://api.spotify.com/v1/me/player/devices";
const PLAY = "https://api.spotify.com/v1/me/player/play";
const PAUSE = "https://api.spotify.com/v1/me/player/pause";
const NEXT = "https://api.spotify.com/v1/me/player/next";
const PREVIOUS = "https://api.spotify.com/v1/me/player/previous";
const PLAYER = "https://api.spotify.com/v1/me/player";
const TRACKS = "https://api.spotify.com/v1/playlists/{{PlaylistId}}/tracks";
const CURRENTLYPLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const SHUFFLE = "https://api.spotify.com/v1/me/player/shuffle";



// Refreshing forms if data is avaible
function onPageLoad() {
    client_id = localStorage.getItem("client_id");
    client_secret = localStorage.getItem("client_secret");
    if (window.location.search.length > 0) { // looking at querry param
        handleRedirect()

    }
    refreshDevices();
    refreshPlaylists();
    currentlyPlaying();
    addTrackExtract();
}
// Parse URL to get the CODE (URL PARA)
function handleRedirect() {
    let code = getCode();
    fetchAccessToken(code);
    window.history.pushState("", "", redirect_uri);
}
// Cleaning URL to get CODE only
function getCode() {
    let code = null;
    const queryString = window.location.search;
    if (queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code')
    }
    return code;
}
// Build URL for redirect with permission/data we intent to work with ()
function requestAuthorization() {
    let url = AUTHORIZE;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
    window.location.href = url;
}
// function to build form post to get access token
function fetchAccessToken(code) {
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;
    callAuthorizationApi(body);
}
// get the refresh token
function refreshAccessToken() {
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}
// api call to get acces token
function callAuthorizationApi(body) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}


// Understanding response from server
function handleAuthorizationResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        if (data.access_token != undefined) {
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if (data.refresh_token != undefined) {
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    } else {
        console.log(this.responseText);

    }
}

function refreshDevices() {
    callApi("GET", DEVICES, null, handleDevicesResponse);
}

function handleDevicesResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems("devices");
        data.devices.forEach(item => addDevice(item));
        document.getElementById('loginButton').style.display = 'none';
    } else if (this.status == 401) {
        refreshAccessToken()
    } else {
        console.log(this.responseText);

    }
}

function addDevice(item) {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerText = item.name;
    document.getElementById("devices").appendChild(node);
}

function callApi(method, url, body, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;
}

function refreshPlaylists() {
    callApi("GET", PLAYLISTS, null, handlePlaylistsResponse);
}

function handlePlaylistsResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems("playlists");
        data.items.forEach(item => addPlaylist(item));
        document.getElementById('playlists').value = currentPlaylist;
    } else if (this.status == 401) {
        refreshAccessToken()
    } else {
        console.log(this.responseText);

    }
}

function addPlaylist(item) {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerText = item.name + " (" + item.tracks.total + ")";
    document.getElementById("playlists").appendChild(node);
}

function removeAllItems(elementId) {
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function play() {
    let playlist_id = document.getElementById("playlists").value;
    let trackindex = document.getElementById("tracks").value;
    let body = {};
    body.context_uri = "spotify:playlist:" + playlist_id;
    body.offset = {};
    body.offset.position = trackindex.length > 0 ? Number(trackindex) : 0;
    body.offset.position_ms = 0;
    callApi("PUT", PLAY + "?device_id=" + deviceId(), JSON.stringify(body), handleApiResponse);
}

function shuffle() {
    callApi("PUT", SHUFFLE + "?state=true&device_id=" + deviceId(), null, handleApiResponse);
    play();
    setTimeout(currentlyPlaying, 3000);
}

function pause() {
    callApi("PUT", PAUSE + "?device_id=" + deviceId(), null, handleApiResponse);
}

function next() {
    callApi("POST", NEXT + "?device_id=" + deviceId(), null, handleApiResponse);
    setTimeout(currentlyPlaying, 2000);

}

function previous() {
    callApi("POST", PREVIOUS + "?device_id=" + deviceId(), null, handleApiResponse);
    setTimeout(currentlyPlaying, 2000);
}

function changeDevice() {
    let body = {};
    body.device_ids = [];
    body.device_ids.push(deviceId())
    callApi("PUT", PLAYER, JSON.stringify(body), handleApiResponse);
}
// for test purposes or debug - handling responses
function handleApiResponse() {
    if (this.status == 200) {
        console.log(this.responseText);
        setTimeout(currentlyPlaying, 2000);
    } else if (this.status == 204) {
        setTimeout(currentlyPlaying, 2000);
    } else if (this.status == 401) {
        refreshAccessToken()
    } else {
        console.log(this.responseText);

    }
}

function deviceId() {
    return document.getElementById("devices").value;
}

function fetchTracks() {
    document.getElementById("trackListExtract").innerText = "";
    let playlist_id = document.getElementById("playlists").value;
    if (playlist_id.length > 0) {
        url = TRACKS.replace("{{PlaylistId}}", playlist_id);
        callApi("GET", url, null, handleTracksResponse);

    }
}

function handleTracksResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems("tracks");
        data.items.forEach((item, index) => addTrack(item, index));
        data.items.forEach((item, index) => addTrackExtract(item, index));
    } else if (this.status == 401) {
        refreshAccessToken()
    } else {
        console.log(this.responseText);

    }
}

function addTrack(item, index) {
    let node = document.createElement("option");
    node.value = index;
    node.innerText = item.track.name + " (" + item.track.artists[0].name + ")";
    document.getElementById("tracks").appendChild(node);
}

function currentlyPlaying() {
    callApi("GET", PLAYER + "?market=US", null, handleCurrentlyPlayingResponse);
}

function handleCurrentlyPlayingResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        if (data.item != null) {
            document.getElementById("albumImage").src = data.item.album.images[0].url;
            document.getElementById("trackTitle").innerText = data.item.name;
            document.getElementById("trackArtist").innerText = data.item.artists[0].name;
        }


        if (data.device != null) {
            // select device
            currentDevice = data.device.id;
            document.getElementById('devices').value = currentDevice;
        }

        if (data.context != null) {
            // select playlist
            currentPlaylist = data.context.uri;
            currentPlaylist = currentPlaylist.substring(currentPlaylist.lastIndexOf(":") + 1, currentPlaylist.length);
            document.getElementById('playlists').value = currentPlaylist;
        }
    } else if (this.status == 204) {

    } else if (this.status == 401) {
        refreshAccessToken()
    } else {
        console.log(this.responseText);

    }
}

const loginButton = document.getElementById("loginButton");
loginButton.addEventListener("click", requestAuthorization, true);

const refreshDevicesButton = document.getElementById("refreshDevicesButton");
refreshDevicesButton.addEventListener("click", refreshDevices, true);

const changeDeviceButton = document.getElementById("changeDeviceButton");
changeDeviceButton.addEventListener("click", changeDevice, true);

const refreshPlaylistsButton = document.getElementById("refreshPlaylistsButton");
refreshPlaylistsButton.addEventListener("click", refreshPlaylists, true);

const fetchTracksButton = document.getElementById("fetchTracksButton");
fetchTracksButton.addEventListener("click", fetchTracks, true);

const previousButton = document.getElementById("previousButton");
previousButton.addEventListener("click", previous, true);

const playButton = document.getElementById("playButton");
playButton.addEventListener("click", play, true);

const shuffleButton = document.getElementById("shuffleButton");
shuffleButton.addEventListener("click", shuffle, true);

const pauseButton = document.getElementById("pauseButton");
pauseButton.addEventListener("click", pause, true);

const nextButton = document.getElementById("nextButton");
nextButton.addEventListener("click", next, true);
nextButton.addEventListener("click", currentlyPlaying, true);

const currentlyPlayingButton = document.getElementById("currentlyPlayingButton");
currentlyPlayingButton.addEventListener("click", currentlyPlaying, true);


// OBAHJOBA - vypis CLICKABLE SONGS

function addTrackExtract(item, index) {
    let node = document.createElement("span");
    node.value = index;
    node.id = "track-" + index;

    var minutes = Math.floor(item.track.duration_ms / 60000);
    var seconds = ((item.track.duration_ms % 60000) / 1000).toFixed(0);
    var time = null;
    time = minutes + ":" + (seconds < 10 ? '0' : '') + seconds;

    node.innerText = item.track.name + " (" + item.track.artists[0].name + ")" + time;

    document.getElementById("trackListExtract").appendChild(node);
    const playLink = document.getElementById(node.id);
    playLink.addEventListener("click", playClickedSong, true);

    function playClickedSong() {
        document.getElementById("tracks").value = node.value;
        let playlist_id = document.getElementById("playlists").value;
        let trackindex = document.getElementById("tracks").value;
        setTimeout(currentlyPlaying, 3000);


        let body = {};
        body.context_uri = "spotify:playlist:" + playlist_id;
        body.offset = {};
        body.offset.position = trackindex.length > 0 ? Number(trackindex) : 0;
        body.offset.position_ms = 0;
        callApi("PUT", PLAY + "?device_id=" + deviceId(), JSON.stringify(body), handleApiResponse);
        console.log(trackindex);
        console.log(node.value);
    }

}

playlists.addEventListener("change", fetchTracks, true);