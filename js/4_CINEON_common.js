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
