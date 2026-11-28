const seat_rows = ["A", "B", "C", "D", "E", "F"];
const seat_cols = 8;
const aisle_after = 4;
const max_people = 8;
const row_order = ["D", "E", "C", "F", "B", "A"];

const people_types = [
    { id: "adult", name: "일반", price: 14000 },
    { id: "teen", name: "청소년", price: 11000 },
    { id: "elder", name: "경로", price: 7000 },
    { id: "senior", name: "우대", price: 7000 }
];

const people_grid = document.getElementById("people-grid");
const people_msg = document.getElementById("people-msg");
const seat_grid = document.getElementById("seat-grid");
const seat_msg = document.getElementById("seat-msg");
const solo_msg = document.getElementById("solo-msg");
const discount_row = document.getElementById("discount-row");
const sum_discount = document.getElementById("sum-discount");
const sum_people = document.getElementById("sum-people");
const sum_seats = document.getElementById("sum-seats");
const sum_total = document.getElementById("sum-total");
const next_btn = document.getElementById("next-btn");
const seat_form = document.getElementById("seat-form");

let booking = JSON.parse(localStorage.getItem("cineon_booking"));
let reservations = JSON.parse(localStorage.getItem("cineon_reservations")) || [];

let movie = null;
let theater = null;
let schedule = null;

let people = { adult: 0, teen: 0, elder: 0, senior: 0 };
let picked_seats = [];
let recommended = [];
let manual = false;

if (!booking || !booking.schedule) {
    alert("상영시간을 먼저 선택해주세요.");
    location.href = "4_CINEON_timetable.html";
} else if (requireLogin("4_CINEON_booking.html")) {
    fetch("data/4_CINEON_data.json")
        .then(response => response.json())
        .then(result => {
            movie = findById(result.movies, booking.movie);
            theater = findById(result.theaters, booking.theater);
            addDemoSchedule(result.schedules);
            schedule = findById(result.schedules, booking.schedule);
            return fetch("data/4_CINEON_history.json");
        })
        .then(response => response.json())
        .then(history => {
            reservations = loadReservations(history.reservations);
            start();
        })
        .catch(error => {
            console.error("상영 정보를 불러오지 못했습니다:", error);
            seat_msg.innerText = "상영 정보를 불러오지 못했습니다.";
        });
}

function removeSeat(list, seat) {
    const result = [];
    for (const item of list) {
        if (item !== seat) {
            result.push(item);
        }
    }
    return result;
}

function start() {
    if (booking.people) {
        people = booking.people;
    }
    if (booking.seats && booking.seats.length > 0) {
        picked_seats = booking.seats;
        manual = true;
    }
    if (movie.age === "19") {
        people.teen = 0;
    }

    drawShowInfo();
    drawPeople();
    if (schedule.seats - getTakenSeats().length <= 0) {
        const inputs = people_grid.querySelectorAll("input");
        for (const input of inputs) {
            input.disabled = true;
        }
        people_msg.innerText = "매진된 회차입니다. 다른 상영시간을 선택해주세요.";
    }
    if (!manual) {
        recommendSeats();
    }
    update();
}

function drawShowInfo() {
    const parts = booking.date.split("-");
    const day = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const start_time = toMinutes(schedule.start);

    document.getElementById("show-poster").src = movie.poster;
    document.getElementById("show-poster").alt = movie.title + " 포스터";
    document.getElementById("show-title").innerHTML = ageIcon(movie.age, 20) + movie.title;
    document.getElementById("show-place").innerText = `${theater.name} ${schedule.screen} (2D)`;
    document.getElementById("show-time").innerHTML =
        `${parts[0]}.${parts[1]}.${parts[2]} (${week_names[day.getDay()]})<br>${schedule.start} ~ ${toTime(start_time + movie.runtime)}`;
}

function drawPeople() {
    let html = "";
    for (const type of people_types) {
        let disabled = "";
        let note = "";
        if (type.id === "teen" && movie.age === "19") {
            disabled = "disabled";
            note = '<span class="p-note">청소년 관람불가 영화입니다</span>';
        }
        html += `<li>
            <label for="${type.id}">
                <span class="p-name">${type.name}</span>
                <span class="p-price">${type.price.toLocaleString()}원</span>
                ${note}
            </label>
            <input type="number" id="${type.id}" name="${type.id}" min="0" max="${max_people}" step="1" value="${people[type.id]}" ${disabled}>
        </li>`;
    }
    people_grid.innerHTML = html;

    const inputs = people_grid.querySelectorAll("input");
    for (const input of inputs) {
        input.addEventListener("change", () => {
            changePeople(input);
        });
    }
}

function getTotalPeople() {
    return people.adult + people.teen + people.elder + people.senior;
}

function getTotalPrice() {
    let total = 0;
    for (const type of people_types) {
        total = total + people[type.id] * type.price;
    }
    return total;
}

function changePeople(input) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < 0) {
        value = 0;
    }

    const others = getTotalPeople() - people[input.id];
    const left_seats = schedule.seats - getTakenSeats().length;
    people_msg.innerText = "";
    if (others + value > left_seats) {
        value = left_seats - others;
        people_msg.innerText = `남은 좌석이 ${left_seats}석이라 그 이상 선택할 수 없습니다.`;
    }
    if (others + value > max_people) {
        value = max_people - others;
        people_msg.innerText = `한 번에 최대 ${max_people}명까지 예매할 수 있습니다.`;
    }

    input.value = value;
    people[input.id] = value;

    if (!manual) {
        recommendSeats();
    } else {
        while (picked_seats.length > getTotalPeople()) {
            picked_seats.pop();
        }
    }
    update();
}

function getTakenSeats() {
    const taken = [];
    for (const seat of schedule.sold) {
        taken.push(seat);
    }
    for (const item of reservations) {
        if (item.schedule === schedule.id && item.date === booking.date && !item.canceled) {
            for (const seat of item.seats) {
                taken.push(seat);
            }
        }
    }
    return taken;
}

function segmentOf(col) {
    if (col <= aisle_after) {
        return { first: 1, last: aisle_after };
    }
    return { first: aisle_after + 1, last: seat_cols };
}

function minutesToStart() {
    const day = booking.date.split("-");
    const time = schedule.start.split(":");
    const start_time = new Date(parseInt(day[0]), parseInt(day[1]) - 1, parseInt(day[2]), parseInt(time[0]), parseInt(time[1]));
    return (start_time.getTime() - new Date().getTime()) / 60000;
}

function isSoloTime() {
    const left = minutesToStart();
    return left > 0 && left <= solo_minutes;
}

function isSoloMode() {
    return isSoloTime() && getTotalPeople() === 1;
}

function isSingleSeat(row, col, taken) {
    const segment = segmentOf(col);
    const left_closed = col === segment.first || hasItem(taken, row + (col - 1));
    const right_closed = col === segment.last || hasItem(taken, row + (col + 1));
    return !hasItem(taken, row + col) && left_closed && right_closed;
}

function findSoloSeat(taken) {
    for (const row of row_order) {
        for (let col = 1; col <= seat_cols; col++) {
            if (isSingleSeat(row, col, taken)) {
                return row + col;
            }
        }
    }
    return "";
}

function getDiscount() {
    if (!isSoloMode() || picked_seats.length !== 1) {
        return 0;
    }
    const seat = picked_seats[0];
    const row = seat[0];
    const col = parseInt(seat.replace(row, ""));
    if (!isSingleSeat(row, col, getTakenSeats())) {
        return 0;
    }
    for (const type of people_types) {
        if (people[type.id] === 1) {
            return type.price * solo_rate;
        }
    }
    return 0;
}

function getBlockedSeats(taken) {
    if (isSoloTime()) {
        return [];
    }
    const remain = getTotalPeople() - picked_seats.length;
    if (remain <= 0) {
        return [];
    }

    const occupied = [];
    for (const seat of taken) {
        occupied.push(seat);
    }
    for (const seat of picked_seats) {
        occupied.push(seat);
    }
    const blocked = [];
    let free_count = 0;
    for (const row of seat_rows) {
        for (let col = 1; col <= seat_cols; col++) {
            const seat = row + col;
            if (!hasItem(occupied, seat)) {
                if (leavesGap(row, col, col, occupied)) {
                    blocked.push(seat);
                } else {
                    free_count++;
                }
            }
        }
    }

    if (free_count < remain) {
        return [];
    }
    return blocked;
}

function leavesGap(row, first, last, occupied) {
    const segment = segmentOf(first);

    let left = 0;
    let c = first - 1;
    while (c >= segment.first && !hasItem(occupied, row + c)) {
        left++;
        c--;
    }
    const left_closed = c >= segment.first;

    let right = 0;
    c = last + 1;
    while (c <= segment.last && !hasItem(occupied, row + c)) {
        right++;
        c++;
    }
    const right_closed = c <= segment.last;

    return (left === 1 && left_closed) || (right === 1 && right_closed);
}

function canSit(row, first, count, taken) {
    const last = first + count - 1;
    for (let c = first; c <= last; c++) {
        if (hasItem(taken, row + c)) {
            return false;
        }
    }
    return !leavesGap(row, first, last, taken);
}

function findSeats(count, taken) {
    for (const row of row_order) {
        for (let k = 0; k < aisle_after; k++) {
            const left_first = aisle_after - count + 1 - k;
            if (left_first >= 1 && canSit(row, left_first, count, taken)) {
                return { row: row, first: left_first };
            }
            const right_first = aisle_after + 1 + k;
            if (right_first + count - 1 <= seat_cols && canSit(row, right_first, count, taken)) {
                return { row: row, first: right_first };
            }
        }
    }
    return null;
}

function recommendSeats() {
    const count = getTotalPeople();
    picked_seats = [];
    recommended = [];
    seat_msg.innerText = "";
    if (count === 0) {
        return;
    }
    if (count > aisle_after) {
        seat_msg.innerText = `${aisle_after + 1}명 이상은 통로를 사이에 두고 앉게 되어 좌석을 직접 선택해주세요.`;
        return;
    }

    if (isSoloMode()) {
        const solo_seat = findSoloSeat(getTakenSeats());
        if (solo_seat !== "") {
            picked_seats.push(solo_seat);
            recommended.push(solo_seat);
            seat_msg.innerText = "혼영석을 추천 좌석으로 미리 선택했습니다.";
            return;
        }
    }

    const found = findSeats(count, getTakenSeats());
    if (found === null) {
        seat_msg.innerText = "함께 앉을 수 있는 좌석이 없습니다. 좌석을 직접 선택해주세요.";
        return;
    }

    for (let c = found.first; c < found.first + count; c++) {
        picked_seats.push(found.row + c);
        recommended.push(found.row + c);
    }
    seat_msg.innerText = "추천 좌석을 미리 선택했습니다. 다른 좌석을 누르면 바꿀 수 있습니다.";
}

function drawSeats() {
    const taken = getTakenSeats();
    const blocked = getBlockedSeats(taken);

    let html = "";
    for (const row of seat_rows) {
        html += `<span class="row-name">${row}</span>`;
        for (let col = 1; col <= seat_cols; col++) {
            if (col === aisle_after + 1) {
                html += '<span class="aisle"></span>';
            }

            const seat = row + col;
            let checked = "";
            let disabled = "";
            let class_name = "";
            let state = "";
            if (hasItem(taken, seat)) {
                disabled = "disabled";
                state = ", 예매 완료";
            } else if (hasItem(picked_seats, seat)) {
                checked = "checked";
                state = ", 선택됨";
                if (isSoloMode() && isSingleSeat(row, col, taken)) {
                    class_name = "solo";
                    state = ", 혼영석 선택됨";
                } else if (hasItem(recommended, seat)) {
                    class_name = "rec";
                    state = ", 추천 좌석";
                }
            } else if (isSoloMode() && isSingleSeat(row, col, taken)) {
                class_name = "solo";
                state = ", 혼영석 할인";
            } else if (hasItem(blocked, seat)) {
                disabled = "disabled";
                class_name = "blocked";
                state = ", 빈자리 방지로 선택 불가";
            }

            html += `<input type="checkbox" id="seat-${seat}" value="${seat}" aria-label="${row}열 ${col}번${state}" ${checked} ${disabled}>`;
            html += `<label for="seat-${seat}" class="${class_name}">${col}</label>`;
        }
        html += '<span class="row-end"></span>';
    }
    seat_grid.innerHTML = html;

    const inputs = seat_grid.querySelectorAll("input");
    for (const input of inputs) {
        input.addEventListener("change", () => {
            clickSeat(input);
        });
    }
}

function clickSeat(input) {
    const total = getTotalPeople();
    if (total === 0) {
        input.checked = false;
        seat_msg.innerText = "인원을 먼저 선택해주세요.";
        return;
    }

    if (input.checked) {
        if (picked_seats.length >= total) {
            input.checked = false;
            seat_msg.innerText = `${total}명 좌석을 모두 선택했습니다. 다른 좌석을 고르려면 선택한 좌석을 먼저 해제해주세요.`;
            return;
        }
        picked_seats.push(input.value);
    } else {
        picked_seats = removeSeat(picked_seats, input.value);
    }

    manual = true;
    recommended = [];
    seat_msg.innerText = "";
    update();
}

function getSortedSeats() {
    const result = [];
    for (const row of seat_rows) {
        for (let col = 1; col <= seat_cols; col++) {
            if (hasItem(picked_seats, row + col)) {
                result.push(row + col);
            }
        }
    }
    return result;
}

function drawSummary() {
    const people_text = [];
    for (const type of people_types) {
        if (people[type.id] > 0) {
            people_text.push(`${type.name} ${people[type.id]}명`);
        }
    }
    if (people_text.length > 0) {
        sum_people.innerText = people_text.join(", ");
    } else {
        sum_people.innerText = "-";
    }

    const seats = getSortedSeats();
    if (seats.length > 0) {
        let html = "";
        for (const seat of seats) {
            html += `<span class="booking-seat">${seat}</span>`;
        }
        sum_seats.innerHTML = html;
    } else {
        sum_seats.innerText = "-";
    }

    const discount = getDiscount();
    if (discount > 0) {
        sum_discount.innerText = "-" + discount.toLocaleString() + "원";
        discount_row.hidden = false;
    } else {
        discount_row.hidden = true;
    }
    sum_total.innerText = (getTotalPrice() - discount).toLocaleString() + "원";

    if (isSoloMode()) {
        solo_msg.innerText = `상영 ${solo_minutes}분 전이라 혼영석(양옆이 막힌 1석)을 ${solo_rate * 100}% 할인합니다.`;
    } else if (isSoloTime()) {
        solo_msg.innerText = `상영 ${solo_minutes}분 전 회차입니다. 1명이 예매하면 혼영석을 할인받을 수 있습니다.`;
    } else {
        solo_msg.innerText = "";
    }

    const total = getTotalPeople();
    next_btn.disabled = total === 0 || picked_seats.length !== total;
}

function saveBooking() {
    booking.people = people;
    booking.seats = getSortedSeats();
    booking.total = getTotalPrice();
    booking.discount = getDiscount();
    booking.price = booking.total - booking.discount;
    booking.title = movie.title;
    booking.age = movie.age;
    booking.poster = movie.poster;
    booking.place = document.getElementById("show-place").innerText;
    booking.time_text = document.getElementById("show-time").innerText;
    booking.start = schedule.start;
    booking.people_text = sum_people.innerText;
    localStorage.setItem("cineon_booking", JSON.stringify(booking));
}

function update() {
    drawSeats();
    drawSummary();
    saveBooking();
}

seat_form.addEventListener("submit", (event) => {
    const total = getTotalPeople();
    if (total === 0) {
        event.preventDefault();
        alert("인원을 선택해주세요.");
        return;
    }
    if (picked_seats.length !== total) {
        event.preventDefault();
        alert(`좌석을 ${total - picked_seats.length}개 더 선택해주세요.`);
        return;
    }
    saveBooking();
});
