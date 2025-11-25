/* ===========================================================
   PREMIER FILMS – POS v3 (100% compatible con motor web)
=========================================================== */

"use strict";

const API = location.origin + "/Cine/backend";
const $ = (s, c = document) => c.querySelector(s);

let CURRENT_MOVIE = null;
let CURRENT_SCREENING = null;
let CURRENT_CLIENT = null;
let CART = [];

/* ============================
   CAMBIAR PASO
============================ */
function go(step) {
    ["step-movies", "step-showtimes", "step-seats"].forEach(id => {
        $("#" + id).classList.toggle("hidden", id !== step);
    });
}

/* ============================
   1) CARGAR PELÍCULAS
============================ */
async function loadMovies() {
    try {
        const res = await fetch(API + "/pos/get-movies.php");
        const json = await res.json();

        if (!json.ok) {
            alert("Error cargando películas");
            return;
        }

        const movies = json.movies; // ✔ AQUI SE ARREGLA

        const grid = $("#movieList");
        grid.innerHTML = "";

        movies.forEach(m => {
            const card = document.createElement("div");
            card.className = "movie-card";

            card.innerHTML = `
                <img src="${m.poster_url}" alt="${m.title}">
                <p>${m.title}</p>
            `;
            card.onclick = () => selectMovie(m);
            grid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        alert("Error cargando películas");
    }
}

/* ============================
   2) SELECCIONAR PELÍCULA
============================ */
async function selectMovie(movie) {
    CURRENT_MOVIE = movie;
    CURRENT_SCREENING = null;
    CART = [];
    renderCart();

    $("#clientModal").classList.remove("hidden");
}

/* =========================================================
   3) CLIENTE
========================================================= */
$("#clientCancel").onclick = () => {
    $("#clientModal").classList.add("hidden");
};

$("#clientContinue").onclick = async () => {
    const name = $("#clientName").value.trim();
    const email = $("#clientEmail").value.trim();

    if (!name || !email) return alert("Ingresa nombre y correo");

    const res = await fetch(API + "/pos/find-or-create-user.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, email})
    });

    const data = await res.json();
    if (!data.ok) return alert(data.error);

    CURRENT_CLIENT = data.client_id;

    $("#clientModal").classList.add("hidden");

    loadShowtimes(CURRENT_MOVIE.id);
};

/* ============================
   4) MOSTRAR HORARIOS
============================ */
async function loadShowtimes(movie_id) {
    go("step-showtimes");
    $("#movieTitle").innerText = CURRENT_MOVIE.title;

    try {
        const res = await fetch(API + "/screenings.php?movie_id=" + movie_id);
        const data = await res.json();

        const list = $("#showtimeList");
        list.innerHTML = "";

        data.forEach(sc => {
            const d = new Date(sc.start_datetime);

            const card = document.createElement("div");
            card.className = "showtime-card";
            card.innerHTML = `
                <div class="showtime-left">
                    <span class="showtime-time">
                        ${d.toLocaleTimeString("es-ES", {hour:"2-digit", minute:"2-digit"})}
                    </span>
                    <span class="showtime-date">
                        ${d.toLocaleDateString("es-ES",{weekday:"short", day:"numeric", month:"short"})}
                    </span>
                </div>
                <div class="showtime-right">
                    <span class="showtime-pill format">${sc.format}</span>
                    <span class="showtime-pill hall">Sala ${sc.hall}</span>
                </div>
            `;
            card.onclick = () => selectShowtime(sc);
            list.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        alert("Error de red cargando horarios");
    }
}

$("#btnBackMovies").onclick = () => go("step-movies");

/* ============================
   5) ASIENTOS
============================ */
function selectShowtime(sc) {
    CURRENT_SCREENING = sc.id;
    $("#seatTitle").innerText = CURRENT_MOVIE.title;

    go("step-seats");
    loadSeats();
}

async function loadSeats() {
    try {
        const url = API + "/seat.php?screening_id=" + CURRENT_SCREENING;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.ok) return alert("Error cargando asientos");

        renderSeatMap(data.seats);
    } catch (err) {
        console.error(err);
        alert("Error de red cargando asientos");
    }
}

$("#btnBackShowtimes").onclick = () => {
    CART = [];
    renderCart();
    go("step-showtimes");
};

/* ============================
   MAPA DE ASIENTOS
============================ */
function renderSeatMap(seats) {
    const cont = $("#seatMap");
    cont.innerHTML = "";
    CART = [];
    renderCart();

    const rows = {};

    seats.forEach(s => {
        const row = s.seat_code[0];
        if (!rows[row]) rows[row] = [];
        rows[row].push(s);
    });

    Object.keys(rows).sort().forEach(row => {
        const div = document.createElement("div");
        div.className = "seat-row";

        const label = document.createElement("span");
        label.className = "seat-row-label";
        label.textContent = row;
        div.appendChild(label);

        rows[row].sort((a,b)=>parseInt(a.seat_code.slice(1)) - parseInt(b.seat_code.slice(1)));

        rows[row].forEach(s => {
            const btn = document.createElement("button");
            btn.className = "seat-btn";
            btn.textContent = s.seat_code.slice(1);

            // === Estado del asiento ===
            if (s.status === "occupied") {
                btn.classList.add("seat-occupied");
                btn.disabled = true;
            }
            else if (s.status === "reserved") {
                btn.classList.add("seat-reserved");
                btn.disabled = true;
            }
            else if (s.status === "free") {
                btn.classList.add("seat-free");
                btn.onclick = () => toggleSeat(s, btn);
            }

            // === Premium ===
            if (s.tier === "premium") {
                btn.classList.add("seat-premium");
            }

            div.appendChild(btn);
        });

        cont.appendChild(div);
    });
}


/* ============================
   CARRITO
============================ */
function toggleSeat(seat, btn) {
    const exists = CART.find(s => s.seat_code === seat.seat_code);
    if (exists) {
        CART = CART.filter(s => s.seat_code !== seat.seat_code);
        btn.classList.remove("seat-selected");
    } else {
        CART.push(seat);
        btn.classList.add("seat-selected");
    }
    renderCart();
}

function renderCart() {
    const box = $("#cartItems");
    box.innerHTML = "";

    let subtotal = 0;

    CART.forEach(s => {
        const price = (s.tier === "premium") ? 23000 : 18000;
        subtotal += price;

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <span>${s.seat_code} - ${s.tier === "premium" ? "Premium" : "Normal"}</span>
            <b>$${price.toLocaleString()}</b>
        `;
        box.appendChild(div);
    });

    $("#cartSubtotal").innerText = "$" + subtotal.toLocaleString();
    $("#cartTotal").innerText = "$" + subtotal.toLocaleString();

    $("#btnReserve").disabled = CART.length === 0;
    $("#btnPay").disabled     = CART.length === 0;
}

/* ============================
   6) RESERVA
============================ */
$("#btnReserve").onclick = async () => {
    if (!CURRENT_CLIENT) return alert("Sin cliente");

    const payload = {
        movie_id: CURRENT_MOVIE.id,
        screening_id: CURRENT_SCREENING,
        client_id: CURRENT_CLIENT,
        seats: CART.map(s => s.seat_code),
        total: 0
    };

    const res = await fetch(API + "/pos/reservas-create.php", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) return alert(data.error);

    alert("Reserva creada");
    CART = [];
    renderCart();
    loadSeats();
};

/* ============================
   7) PAGO COMPLETO
============================ */
$("#btnPay").onclick = async () => {
    const payload = {
        screening_id: CURRENT_SCREENING,
        seats: CART.map(s => s.seat_code),
        coupon: "",
        use_points: 0
    };

    const res = await fetch(API + "/purchases/purchase.php", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) return alert(data.error);

    alert("Pago completado");

    CART = [];
    renderCart();
    loadSeats();
};

/* ============================
   INICIO
============================ */
document.addEventListener("DOMContentLoaded", loadMovies);

document.getElementById("btnLogout").onclick = async () => {
    const res = await fetch("/Cine/backend/auth/logout.php", {
        method: "POST",
        credentials: "include"
    });

    const data = await res.json();

    if (data.ok) {
        // Redirige al login
        window.location.href = "/Cine/html/auth.html";
    } else {
        alert("No se pudo cerrar sesión");
    }
};
