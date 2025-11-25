/**
 * Renderiza el mapa de asientos dinámicamente
 *
 * seats = [
 *   { seat_code:'A1', status:'free', is_premium:0 }
 * ]
 */

function renderSeatMap(seats, container, onSeatToggle) {
    container.innerHTML = "";

    // ordena por fila (A,B,C...) y número
    seats.sort((a,b)=>{
        const rA = a.seat_code[0];
        const rB = b.seat_code[0];
        const nA = parseInt(a.seat_code.substring(1));
        const nB = parseInt(b.seat_code.substring(1));

        if(rA === rB) return nA - nB;
        return rA.localeCompare(rB);
    });

    seats.forEach(seat => {
        let div = document.createElement("div");
        div.classList.add("seat");

        // ESTADO VISUAL
        if(seat.status === "free") div.classList.add("free");
        if(seat.status === "reserved") div.classList.add("reserved");
        if(seat.status === "occupied" || seat.status === "taken") div.classList.add("taken");
        if(seat.is_premium == 1) div.classList.add("premium");

        div.dataset.code = seat.seat_code;
        div.textContent = seat.seat_code;

        if(seat.status === "free"){
            div.addEventListener("click", ()=> onSeatToggle(seat));
        }

        container.appendChild(div);
    });
}
