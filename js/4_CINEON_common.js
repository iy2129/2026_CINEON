const week_names = ["일", "월", "화", "수", "목", "금", "토"];
const solo_rate = 0.3;
const solo_minutes = 20;

function twoDigits(num) {
    if (num < 10) {
        return "0" + num;
    }
    return "" + num;
}

function toMinutes(time) {
    const parts = time.split(":");
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function toTime(minutes) {
    const hour = Math.floor(minutes / 60) % 24;
    return twoDigits(hour) + ":" + twoDigits(minutes % 60);
}

function findById(list, id) {
    for (const item of list) {
        if (item.id === id) {
            return item;
        }
    }
    return null;
}

function hasItem(list, value) {
    for (const item of list) {
        if (item === value) {
            return true;
        }
    }
    return false;
}

function ageIcon(age, size) {
    let file = "4_icon_19.svg";
    let text = "청소년 이용불가";
    if (age === "all") {
        file = "4_icon_all.svg";
        text = "전체 이용가";
    } else if (age === "12") {
        file = "4_icon_12.svg";
        text = "12세 이용가";
    } else if (age === "15") {
        file = "4_icon_15.svg";
        text = "15세 이용가";
    }
    return `<img class="age" src="images/${file}" alt="${text}" width="${size}" height="${size}">`;
}

function addDemoSchedule(list) {
    const now = new Date();
    let start = now.getHours() * 60 + now.getMinutes() + 15;
    start = Math.ceil(start / 5) * 5;
    if (start >= 24 * 60) {
        return;
    }
    list.push({
        id: "demo-seomyeon",
        movie: "chiikawa",
        theater: "seomyeon",
        days: ["평일", "토", "일"],
        start: toTime(start),
        screen: "8관(시연)",
        seats: 48,
        sold: ["A1", "A2", "A3", "A4", "B2", "B3", "B6", "B7", "C1", "C4", "C5", "C8", "D1", "D3", "D4", "D6", "D7", "E1", "E2", "E4", "E5", "E6", "E7", "E8", "F3", "F4", "F5", "F6"]
    });
}

const people_labels = { adult: "일반", teen: "청소년", elder: "경로", senior: "우대" };

function getUser() {
    return localStorage.getItem("cineon-current-user");
}

function requireLogin(back_page) {
    if (getUser()) {
        return true;
    }
    alert("로그인이 필요한 서비스입니다.");
    sessionStorage.setItem("cineon_after_login", back_page);
    location.href = "4_CINEON_login.html";
    return false;
}

function todayText(plus) {
    const day = new Date();
    day.setDate(day.getDate() + plus);
    return day.getFullYear() + "-" + twoDigits(day.getMonth() + 1) + "-" + twoDigits(day.getDate());
}

function loadReservations(samples) {
    const list = JSON.parse(localStorage.getItem("cineon_reservations")) || [];
    for (const item of samples) {
        const saved = findById(list, item.id);
        if (!saved) {
            if (item.after) {
                item.date = todayText(item.after);
            }
            list.push(item);
        } else if (!saved.user) {
            saved.user = item.user;
        }
    }
    localStorage.setItem("cineon_reservations", JSON.stringify(list));
    return list;
}

function loadWallet(history) {
    const user = getUser();
    const wallets = JSON.parse(localStorage.getItem("cineon_wallets")) || {};
    if (!wallets[user]) {
        if (history.wallets[user]) {
            wallets[user] = history.wallets[user];
        } else {
            const coupons = [];
            for (const coupon of history.welcome) {
                coupons.push({ name: coupon.name, amount: coupon.amount, kind: coupon.kind, expire: todayText(coupon.days), used: "" });
            }
            const points = [{ date: todayText(0), title: "회원가입 축하 포인트", amount: 1000 }];
            wallets[user] = { points: points, coupons: coupons };
        }
        localStorage.setItem("cineon_wallets", JSON.stringify(wallets));
    }
    return wallets[user];
}

function saveWallet(wallet) {
    const wallets = JSON.parse(localStorage.getItem("cineon_wallets")) || {};
    wallets[getUser()] = wallet;
    localStorage.setItem("cineon_wallets", JSON.stringify(wallets));
}

function canUseCoupon(coupon) {
    return !coupon.used && coupon.expire >= todayText(0);
}

function makeWatched(data, item) {
    const schedule = findById(data.schedules, item.schedule);
    if (item.canceled || !schedule || item.user !== getUser()) {
        return null;
    }
    const movie = findById(data.movies, schedule.movie);
    const theater = findById(data.theaters, schedule.theater);
    const start = item.start || schedule.start;
    const end = new Date(item.date + "T" + start).getTime() + movie.runtime * 60000;
    if (end > new Date().getTime()) {
        return null;
    }
    const guests = {};
    for (const key in people_labels) {
        if (item.people[key] > 0) {
            guests[people_labels[key]] = item.people[key];
        }
    }
    return {
        id: movie.id,
        title: movie.title,
        date: item.date,
        ticket: {
            start: start,
            auditorium: theater.name + " " + schedule.screen,
            seats: item.seats,
            guests: guests,
            format: "2D"
        },
        genres: movie.genres,
        tags: movie.tags,
        minutes: movie.runtime,
        poster: movie.poster,
        backdrop: movie.backdrop,
        synopsis: movie.synopsis,
        detail: movie.detail
    };
}

function getWatched(data, reservations) {
    const list = [];
    for (const item of reservations) {
        const record = makeWatched(data, item);
        if (record) {
            list.push(record);
        }
    }
    return list;
}

function loadWatched() {
    let data;
    return fetch("data/4_CINEON_data.json")
        .then((response) => response.json())
        .then((result) => {
            data = result;
            return fetch("data/4_CINEON_history.json");
        })
        .then((response) => response.json())
        .then((history) => getWatched(data, loadReservations(history.reservations)));
}
