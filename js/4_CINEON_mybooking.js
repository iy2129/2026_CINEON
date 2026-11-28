const my_sections = document.querySelectorAll(".my-section");
const service_view = document.querySelector(".mypage-service-view");
const profile_view = document.querySelector(".mypage-profile-view");
const ticket_list = document.getElementById("ticket-list");
const booking_guide = document.getElementById("booking-guide");
const booking_msg = document.getElementById("booking-msg");
const my_tabs = document.querySelectorAll(".my-tabs a");

let my_movies = [];
let my_theaters = [];
let my_schedules = [];
let my_reservations = [];
let my_wallet = null;

fetch("data/4_CINEON_data.json")
    .then((response) => response.json())
    .then((data) => {
        my_movies = data.movies;
        my_theaters = data.theaters;
        my_schedules = data.schedules;
        addDemoSchedule(my_schedules);
        return fetch("data/4_CINEON_history.json");
    })
    .then((response) => response.json())
    .then((history) => {
        my_wallet = loadWallet(history);
        my_reservations = loadReservations(history.reservations);
        drawAll();
    })
    .catch((error) => {
        console.log(error);
        booking_guide.innerText = "내역을 불러오지 못했습니다. Live Server로 열었는지 확인해 주세요.";
    });

function saveReservations() {
    localStorage.setItem("cineon_reservations", JSON.stringify(my_reservations));
}

function makeTicket(item) {
    const schedule = findById(my_schedules, item.schedule);
    if (!schedule || item.user !== getUser()) {
        return null;
    }
    const movie = findById(my_movies, schedule.movie);
    const theater = findById(my_theaters, schedule.theater);
    const start = new Date(item.date + "T" + (item.start || schedule.start));
    const end = new Date(start.getTime() + movie.runtime * 60000);
    return { item: item, schedule: schedule, movie: movie, theater: theater, start: start, end: end };
}

function getState(ticket) {
    if (ticket.item.canceled) {
        return "canceled";
    }
    if (ticket.end.getTime() <= new Date().getTime()) {
        return "watched";
    }
    return "booked";
}

function sortTickets(list, newest) {
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            const later = list[j].start.getTime() > list[i].start.getTime();
            if (later === newest) {
                const temp = list[i];
                list[i] = list[j];
                list[j] = temp;
            }
        }
    }
    return list;
}

function getTickets(state) {
    const list = [];
    for (const item of my_reservations) {
        const ticket = makeTicket(item);
        if (ticket && getState(ticket) === state) {
            list.push(ticket);
        }
    }
    return sortTickets(list, state !== "booked");
}

function dotDate(text) {
    return text.replace("-", ".").replace("-", ".");
}

function dateText(day) {
    return `${day.getFullYear()}.${twoDigits(day.getMonth() + 1)}.${twoDigits(day.getDate())} (${week_names[day.getDay()]})`;
}

function clockText(day) {
    return twoDigits(day.getHours()) + ":" + twoDigits(day.getMinutes());
}

function peopleText(people) {
    let text = "";
    for (const key in people_labels) {
        if (people[key] > 0) {
            if (text !== "") {
                text += ", ";
            }
            text += people_labels[key] + " " + people[key];
        }
    }
    return text;
}

function seatText(seats) {
    let text = "";
    for (const seat of seats) {
        if (text !== "") {
            text += ", ";
        }
        text += seat;
    }
    return text;
}

function minutesLeft(ticket) {
    return Math.floor((ticket.start.getTime() - new Date().getTime()) / 60000);
}

function dayBadge(ticket) {
    const left = minutesLeft(ticket);
    if (left <= 0) {
        return `<span class="t-badge now">상영 중</span>`;
    }
    const days = daysUntil(ticket.item.date);
    if (days === 0) {
        return `<span class="t-badge today">오늘</span>`;
    }
    return `<span class="t-badge">D-${days}</span>`;
}

function getFee(ticket) {
    if (minutesLeft(ticket) > solo_minutes) {
        return 0;
    }
    return Math.round(ticket.item.paid * solo_rate / 100) * 100;
}

function ticketButtons(ticket, state) {
    const id = ticket.item.id;
    if (state === "booked") {
        if (minutesLeft(ticket) <= 0) {
            return `<p class="t-note">상영이 시작되어 취소할 수 없습니다.</p>`;
        }
        let note = `상영 ${solo_minutes}분 전까지 무료 취소`;
        if (getFee(ticket) > 0) {
            note = `지금 취소하면 수수료 ${getFee(ticket).toLocaleString()}원`;
        }
        return `<p class="t-note">${note}</p>
            <button type="button" class="t-btn" data-cancel="${id}">예매 취소</button>`;
    }
    if (state === "watched") {
        return `<a class="t-btn" href="4_CINEON_myreview.html?movie=${ticket.movie.id}">관람평 쓰기</a>
            <button type="button" class="t-btn line" data-again="${ticket.movie.id}">다시 예매</button>`;
    }
    let fee_text = "전액 환불";
    if (ticket.item.fee > 0) {
        fee_text = `수수료 ${ticket.item.fee.toLocaleString()}원 제외 환불`;
    }
    return `<p class="t-note">${fee_text}</p>`;
}

function priceText(item) {
    const notes = [];
    if (item.solo_discount > 0) {
        notes.push(`혼영석 -${item.solo_discount.toLocaleString()}원`);
    }
    if (item.coupon) {
        notes.push(`${item.coupon} -${item.coupon_amount.toLocaleString()}원`);
    }
    if (item.point_used > 0) {
        notes.push(`포인트 -${item.point_used.toLocaleString()}P`);
    }
    let text = `${item.paid.toLocaleString()}원`;
    if (notes.length > 0) {
        text += ` <small>(${notes.join(", ")})</small>`;
    }
    return text;
}

function drawTickets(state) {
    const tickets = getTickets(state);
    const guides = {
        booked: "관람 예정인 예매입니다. 상영 20분 전부터는 혼영석 할인율만큼 취소 수수료가 붙습니다.",
        watched: "상영이 끝난 예매입니다. 관람평을 남기거나 같은 영화를 다시 예매할 수 있습니다.",
        canceled: "취소한 예매입니다."
    };
    const empties = {
        booked: `예매한 영화가 없습니다. <a href="4_CINEON_timetable.html">상영시간표 보러 가기</a>`,
        watched: "아직 관람한 영화가 없습니다.",
        canceled: "취소한 예매가 없습니다."
    };
    booking_guide.innerText = guides[state];

    if (tickets.length === 0) {
        ticket_list.innerHTML = `<li class="my-empty">${empties[state]}</li>`;
        return;
    }

    let html = "";
    for (const ticket of tickets) {
        let badge = "";
        if (state === "booked") {
            badge = dayBadge(ticket);
        }
        html += `
            <li class="ticket ${state}">
                <img class="t-poster" src="${ticket.movie.poster}" alt="${ticket.movie.title} 포스터" width="90" height="128">
                <div class="t-info">
                    <p class="t-title">${badge}${ageIcon(ticket.movie.age, 18)}${ticket.movie.title}</p>
                    <dl>
                        <div><dt>일시</dt><dd>${dateText(ticket.start)} ${clockText(ticket.start)} ~ ${clockText(ticket.end)}</dd></div>
                        <div><dt>극장</dt><dd>${ticket.theater.name} ${ticket.schedule.screen}</dd></div>
                        <div><dt>좌석</dt><dd>${seatText(ticket.item.seats)} (${peopleText(ticket.item.people)})</dd></div>
                        <div><dt>결제</dt><dd>${priceText(ticket.item)}</dd></div>
                    </dl>
                    <p class="t-number">예매번호 ${ticket.item.id}</p>
                </div>
                <div class="t-side">${ticketButtons(ticket, state)}</div>
            </li>`;
    }
    ticket_list.innerHTML = html;
}

function drawCounts() {
    const booked = getTickets("booked").length;
    document.getElementById("count-booked").innerText = booked;
    document.getElementById("count-watched").innerText = getTickets("watched").length;
    document.getElementById("count-canceled").innerText = getTickets("canceled").length;
    document.getElementById("stat-booked").innerText = booked;
}

ticket_list.addEventListener("click", (event) => {
    const cancel_id = event.target.getAttribute("data-cancel");
    const movie_id = event.target.getAttribute("data-again");

    if (movie_id) {
        localStorage.setItem("cineon_selectedMovie", movie_id);
        location.href = "4_CINEON_timetable.html";
        return;
    }
    if (!cancel_id) {
        return;
    }

    const item = findById(my_reservations, cancel_id);
    const ticket = makeTicket(item);
    if (minutesLeft(ticket) <= 0) {
        alert("상영이 시작되어 취소할 수 없습니다.");
        drawRoute();
        return;
    }
    const fee = getFee(ticket);
    let question = `${ticket.movie.title}\n${dateText(ticket.start)} ${clockText(ticket.start)} 예매를 취소할까요?`;
    if (fee > 0) {
        question += `\n상영 ${solo_minutes}분 전이 지나 수수료 ${fee.toLocaleString()}원이 붙습니다.`;
    }
    if (!confirm(question)) {
        return;
    }

    item.canceled = true;
    item.fee = fee;
    item.canceled_at = todayText(0);
    saveReservations();
    refundWallet(item);
    drawAll();
    booking_msg.innerText = `예매번호 ${item.id} 예매가 취소되었습니다. 환불 금액: ${(item.paid - fee).toLocaleString()}원`;
});

function refundWallet(item) {
    if (item.coupon_index >= 0) {
        my_wallet.coupons[item.coupon_index].used = "";
    }
    if (item.point_used > 0) {
        my_wallet.points.push({ date: todayText(0), title: "예매 취소 포인트 반환", amount: item.point_used });
    }
    if (item.point_earned > 0) {
        my_wallet.points.push({ date: todayText(0), title: "예매 취소 적립 회수", amount: -item.point_earned });
    }
    saveWallet(my_wallet);
}

function drawPoints() {
    const type = document.querySelector("input[name='point-type']:checked").value;
    let balance = 0;
    let plus = 0;
    let minus = 0;
    let rows = "";

    for (const point of my_wallet.points) {
        balance += point.amount;
        if (point.amount > 0) {
            plus += point.amount;
        } else {
            minus -= point.amount;
        }

        const show = type === "all" || (type === "plus" && point.amount > 0) || (type === "minus" && point.amount < 0);
        if (show) {
            let sign = "";
            let kind = "minus";
            if (point.amount > 0) {
                sign = "+";
                kind = "plus";
            }
            rows = `
                <tr>
                    <td>${dotDate(point.date)}</td>
                    <td>${point.title}</td>
                    <td class="${kind}">${sign}${point.amount.toLocaleString()}P</td>
                    <td>${balance.toLocaleString()}P</td>
                </tr>` + rows;
        }
    }

    if (rows === "") {
        rows = `<tr><td colspan="4" class="my-empty">내역이 없습니다.</td></tr>`;
    }
    document.getElementById("point-list").innerHTML = rows;
    document.getElementById("point-total").innerText = balance.toLocaleString() + "P";
    document.getElementById("point-plus").innerText = plus.toLocaleString() + "P";
    document.getElementById("point-minus").innerText = minus.toLocaleString() + "P";
    document.getElementById("stat-point").innerText = balance.toLocaleString() + "P";
}

function couponState(coupon) {
    if (coupon.used) {
        return "사용 완료";
    }
    if (canUseCoupon(coupon)) {
        return "사용 가능";
    }
    return "기간 만료";
}

function daysUntil(date) {
    const today = new Date(todayText(0) + "T00:00");
    const end = new Date(date + "T00:00");
    return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function drawCoupons() {
    const type = document.querySelector("input[name='coupon-type']:checked").value;
    let count = 0;
    let soon = 0;
    let html = "";

    for (const coupon of my_wallet.coupons) {
        const state = couponState(coupon);
        const left = daysUntil(coupon.expire);
        if (state === "사용 가능") {
            count++;
            if (left <= 7) {
                soon++;
            }
        }
        if (state === type) {
            html += couponItem(coupon, state, left);
        }
    }

    if (html === "") {
        html = `<li class="my-empty">${type} 쿠폰이 없습니다.</li>`;
    }
    document.getElementById("coupon-list").innerHTML = html;
    document.getElementById("coupon-count").innerText = count + "장";
    document.getElementById("coupon-soon").innerText = soon + "장";
    document.getElementById("stat-coupon").innerText = count + "장";
}

function couponItem(coupon, state, left) {
    let date_text = `${dotDate(coupon.expire)}까지`;
    let badge = "";
    if (state === "사용 완료") {
        date_text = `${dotDate(coupon.used)} 사용`;
    } else if (state === "사용 가능" && left <= 7) {
        badge = `<span class="t-badge today">D-${left}</span>`;
    }
    let value = coupon.amount.toLocaleString() + "원";
    if (coupon.kind === "관람권") {
        value = "1매";
    }
    let off = "off";
    if (state === "사용 가능") {
        off = "";
    }

    return `
        <li class="coupon ${off}">
            <strong class="c-value">${value}</strong>
            <div>
                <p class="c-name">${badge}${coupon.name}</p>
                <p class="c-date">${coupon.kind} · ${date_text}</p>
            </div>
            <span class="c-state">${state}</span>
        </li>`;
}

document.getElementById("point-filter").addEventListener("change", drawPoints);
document.getElementById("coupon-filter").addEventListener("change", drawCoupons);

function drawRoute() {
    const hash = location.hash;
    let found = false;

    for (const section of my_sections) {
        const routes = section.getAttribute("data-route").split(" ");
        section.hidden = !hasItem(routes, hash);
        if (!section.hidden) {
            found = true;
        }
    }
    if (!found) {
        return;
    }
    service_view.hidden = true;
    profile_view.hidden = true;

    for (const tab of my_tabs) {
        if (tab.getAttribute("href") === hash) {
            tab.setAttribute("aria-current", "page");
        } else {
            tab.setAttribute("aria-current", "false");
        }
    }

    if (my_schedules.length === 0) {
        return;
    }
    booking_msg.innerText = "";
    if (hash === "#bookings") {
        drawTickets("booked");
    } else if (hash === "#watched") {
        drawTickets("watched");
    } else if (hash === "#canceled") {
        drawTickets("canceled");
    }
}

function drawAll() {
    drawCounts();
    drawPoints();
    drawCoupons();
    drawRoute();
}

window.addEventListener("hashchange", drawRoute);
drawRoute();
