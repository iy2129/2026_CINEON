const date_list = document.getElementById("date-list");
const region_list = document.getElementById("region-list");
const theater_list = document.getElementById("theater-list");
const movie_list = document.getElementById("movie-list");
const time_list = document.getElementById("time-list");
const pick_summary = document.getElementById("pick-summary");
const next_btn = document.getElementById("next-btn");
const timetable_form = document.getElementById("timetable-form");
const end_filter = document.getElementById("end-filter");

let movies = [];
let theaters = [];
let schedules = [];
let dates = [];
let reservations = JSON.parse(localStorage.getItem("cineon_reservations")) || [];

let picked = {
    date: "",
    region: "",
    theater: "",
    movie: "",
    schedule: ""
};

fetch("data/4_CINEON_data.json")
    .then(response => response.json())
    .then(result => {
        movies = result.movies;
        theaters = result.theaters;
        schedules = result.schedules;
        addDemoSchedule(schedules);
        makeDates();
        loadPicked();
        drawAll();
    })
    .catch(error => {
        console.error("상영 정보를 불러오지 못했습니다:", error);
        time_list.innerHTML = '<li class="empty">상영 정보를 불러오지 못했습니다.</li>';
    });

function makeDates() {
    dates = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);

        let label = week_names[day.getDay()];
        if (i === 0) {
            label = "오늘";
        } else if (i === 1) {
            label = "내일";
        }

        let type = "평일";
        if (day.getDay() === 6) {
            type = "토";
        } else if (day.getDay() === 0) {
            type = "일";
        }

        dates.push({
            value: day.getFullYear() + "-" + twoDigits(day.getMonth() + 1) + "-" + twoDigits(day.getDate()),
            month: day.getMonth() + 1,
            date: day.getDate(),
            week: week_names[day.getDay()],
            weekday: day.getDay(),
            label: label,
            type: type
        });
    }
}

function findDate(value) {
    for (const item of dates) {
        if (item.value === value) {
            return item;
        }
    }
    return null;
}

function getSchedules(movie_id) {
    const result = [];
    const date = findDate(picked.date);
    for (const schedule of schedules) {
        if (schedule.movie === movie_id && schedule.theater === picked.theater && hasItem(schedule.days, date.type)) {
            result.push(schedule);
        }
    }
    return result;
}

function countBooked(schedule_id, date) {
    let count = 0;
    for (const item of reservations) {
        if (item.schedule === schedule_id && item.date === date && !item.canceled) {
            count = count + item.seats.length;
        }
    }
    return count;
}

function isStarted(date, start) {
    if (date !== dates[0].value) {
        return false;
    }
    const now = new Date();
    const now_minutes = now.getHours() * 60 + now.getMinutes();
    return toMinutes(start) <= now_minutes;
}

function loadPicked() {
    const saved = JSON.parse(localStorage.getItem("cineon_booking"));
    if (saved && findDate(saved.date) && findById(schedules, saved.schedule)) {
        picked.date = saved.date;
        picked.theater = saved.theater;
        picked.region = findById(theaters, saved.theater).region;
        picked.movie = saved.movie;
        picked.schedule = saved.schedule;
    }

    const selected_movie = localStorage.getItem("cineon_selectedMovie");
    if (selected_movie && findById(movies, selected_movie)) {
        if (picked.movie !== selected_movie) {
            picked.region = "";
            picked.theater = "";
            picked.movie = selected_movie;
            picked.schedule = "";
        }
        localStorage.removeItem("cineon_selectedMovie");
    }
}

function drawAll() {
    drawDates();
    drawRegions();
    drawTheaters();
    drawMovies();
    drawTimes();
    drawSummary();
}

function drawDates() {
    let html = "";
    for (let i = 0; i < dates.length; i++) {
        const item = dates[i];
        let class_name = "";
        if (item.weekday === 6) {
            class_name = "sat";
        } else if (item.weekday === 0) {
            class_name = "sun";
        }
        let checked = "";
        if (item.value === picked.date) {
            checked = "checked";
        }
        html += `<li class="${class_name}">
            <input type="radio" id="d-${i}" name="date" value="${item.value}" ${checked}>
            <label for="d-${i}">${item.date}<span>·${item.label}</span></label>
        </li>`;
    }
    html += `<li class="cal">
        <input type="date" id="cal-date" title="날짜 직접 선택" value="${picked.date}" min="${dates[0].value}" max="${dates[dates.length - 1].value}">
    </li>`;
    date_list.innerHTML = html;

    const inputs = date_list.querySelectorAll("input[type=radio]");
    for (const input of inputs) {
        input.addEventListener("change", () => {
            picked.date = input.value;
            picked.schedule = "";
            document.getElementById("cal-date").value = input.value;
            drawMovies();
            drawTimes();
            drawSummary();
        });
    }

    const cal_date = document.getElementById("cal-date");
    cal_date.addEventListener("change", () => {
        if (findDate(cal_date.value)) {
            picked.date = cal_date.value;
            picked.schedule = "";
        } else {
            alert("오늘부터 7일 안의 날짜만 선택할 수 있습니다.");
        }
        drawDates();
        drawMovies();
        drawTimes();
        drawSummary();
    });
}

function drawRegions() {
    const regions = [];
    for (const theater of theaters) {
        let found = false;
        for (const region of regions) {
            if (region.name === theater.region) {
                region.count++;
                found = true;
            }
        }
        if (!found) {
            regions.push({ name: theater.region, count: 1 });
        }
    }

    let html = "";
    for (let i = 0; i < regions.length; i++) {
        let checked = "";
        if (regions[i].name === picked.region) {
            checked = "checked";
        }
        html += `<li>
            <input type="radio" id="r-${i}" name="region" value="${regions[i].name}" ${checked}>
            <label for="r-${i}">${regions[i].name}(${regions[i].count})</label>
        </li>`;
    }
    region_list.innerHTML = html;

    const inputs = region_list.querySelectorAll("input");
    for (const input of inputs) {
        input.addEventListener("change", () => {
            picked.region = input.value;
            picked.theater = "";
            picked.schedule = "";
            drawTheaters();
            drawMovies();
            drawTimes();
            drawSummary();
        });
    }
}

function drawTheaters() {
    if (!picked.region) {
        theater_list.innerHTML = '<li class="empty">지역을 선택해주세요.</li>';
        return;
    }

    let html = "";
    for (const theater of theaters) {
        if (theater.region === picked.region) {
            let checked = "";
            if (theater.id === picked.theater) {
                checked = "checked";
            }
            html += `<li>
                <input type="radio" id="t-${theater.id}" name="theater" value="${theater.id}" ${checked}>
                <label for="t-${theater.id}">${theater.name}</label>
            </li>`;
        }
    }
    theater_list.innerHTML = html;

    const inputs = theater_list.querySelectorAll("input");
    for (const input of inputs) {
        input.addEventListener("change", () => {
            picked.theater = input.value;
            picked.schedule = "";
            drawMovies();
            drawTimes();
            drawSummary();
        });
    }
}

function drawMovies() {
    let html = "";
    for (const movie of movies) {
        let playing = true;
        if (picked.date && picked.theater) {
            playing = getSchedules(movie.id).length > 0;
        }
        if (!playing && movie.id === picked.movie) {
            picked.movie = "";
            picked.schedule = "";
        }

        let checked = "";
        if (movie.id === picked.movie) {
            checked = "checked";
        }
        let disabled = "";
        let note = "";
        if (!playing) {
            disabled = "disabled";
            note = '<span class="no-show">상영 없음</span>';
        }
        html += `<li>
            <input type="radio" id="m-${movie.id}" name="movie" value="${movie.id}" ${checked} ${disabled}>
            <label for="m-${movie.id}">${ageIcon(movie.age, 22)}<span class="m-title">${movie.title}${note}</span></label>
        </li>`;
    }
    movie_list.innerHTML = html;

    const inputs = movie_list.querySelectorAll("input");
    for (const input of inputs) {
        input.addEventListener("change", () => {
            picked.movie = input.value;
            picked.schedule = "";
            drawTimes();
            drawSummary();
        });
    }
}

function drawTimes() {
    if (!picked.date || !picked.theater || !picked.movie) {
        time_list.innerHTML = '<li class="empty">날짜, 극장, 영화를 모두 선택하면 상영시간이 표시됩니다.</li>';
        return;
    }

    const list = getSchedules(picked.movie);
    if (list.length === 0) {
        time_list.innerHTML = '<li class="empty">선택한 날짜에 상영 회차가 없습니다.</li>';
        return;
    }

    const movie = findById(movies, picked.movie);
    const end_limit = parseInt(end_filter.value) * 60;
    let html = "";
    for (const schedule of list) {
        const start = toMinutes(schedule.start);
        if (end_limit === 0 || start + movie.runtime <= end_limit) {
            html += makeTimeItem(schedule, start, movie);
        } else if (schedule.id === picked.schedule) {
            picked.schedule = "";
        }
    }
    if (html === "") {
        time_list.innerHTML = '<li class="empty">조건에 맞는 회차가 없습니다.</li>';
        return;
    }
    time_list.innerHTML = html;

    const inputs = time_list.querySelectorAll("input");
    for (const input of inputs) {
        input.addEventListener("change", () => {
            picked.schedule = input.value;
            drawSummary();
        });
    }
}

function makeTimeItem(schedule, start, movie) {
    const end = toTime(start + movie.runtime);
    const left = schedule.seats - schedule.sold.length - countBooked(schedule.id, picked.date);
    const started = isStarted(picked.date, schedule.start);

    let icon = "";
    if (start < 600) {
        icon = '<span class="sun">☀</span> ';
    } else if (start >= 1320) {
        icon = '<span class="moon">☾</span> ';
    }

    let badge = "";
    let disabled = "";
    if (started) {
        badge = '<em class="badge badge-off">상영 시작</em>';
        disabled = "disabled";
    } else if (left <= 0) {
        badge = '<em class="badge badge-off">매진</em>';
        disabled = "disabled";
    } else if (left <= 10) {
        badge = '<em class="badge">마감 임박</em>';
    }

    if (disabled && schedule.id === picked.schedule) {
        picked.schedule = "";
    }
    let checked = "";
    if (schedule.id === picked.schedule) {
        checked = "checked";
    }

    return `<li>
        <input type="radio" id="s-${schedule.id}" name="schedule" value="${schedule.id}" ${checked} ${disabled}>
        <label for="s-${schedule.id}">
            <span class="t-main">${icon}<strong>${schedule.start}</strong> ~ ${end}</span>
            <small>${schedule.screen} · 2D · 잔여 ${left}/${schedule.seats}석</small>
            ${badge}
        </label>
    </li>`;
}

function getMissing() {
    const missing = [];
    if (!picked.date) {
        missing.push("날짜");
    }
    if (!picked.theater) {
        missing.push("극장");
    }
    if (!picked.movie) {
        missing.push("영화");
    }
    if (!picked.schedule) {
        missing.push("시간");
    }
    return missing;
}

function drawSummary() {
    const missing = getMissing();
    if (missing.length > 0) {
        pick_summary.innerText = "선택하지 않은 항목: " + missing.join(", ");
        next_btn.disabled = true;
        return;
    }

    const movie = findById(movies, picked.movie);
    const theater = findById(theaters, picked.theater);
    const schedule = findById(schedules, picked.schedule);
    const date = findDate(picked.date);
    pick_summary.innerText = `${movie.title} · ${theater.name} ${schedule.screen} · ${date.month}.${date.date}(${date.week}) ${schedule.start}`;
    next_btn.disabled = false;
}

end_filter.addEventListener("change", () => {
    drawTimes();
    drawSummary();
});

timetable_form.addEventListener("submit", (event) => {
    const missing = getMissing();
    if (missing.length > 0) {
        event.preventDefault();
        alert(missing.join(", ") + "을(를) 선택해주세요.");
        return;
    }

    const booking = {
        date: picked.date,
        theater: picked.theater,
        movie: picked.movie,
        schedule: picked.schedule
    };
    const saved = JSON.parse(localStorage.getItem("cineon_booking"));
    if (saved && saved.schedule === picked.schedule && saved.date === picked.date) {
        booking.people = saved.people;
        booking.seats = saved.seats;
    }
    localStorage.setItem("cineon_booking", JSON.stringify(booking));
    if (!getUser()) {
        event.preventDefault();
        requireLogin("4_CINEON_booking.html");
    }
});
