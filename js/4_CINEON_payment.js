const paymentForm = document.getElementById("payment-form");
const couponPanel = document.querySelector(".payment-coupons");
const autoCoupon = document.querySelector('[name="auto-coupon"]');
const coupons = couponPanel.querySelectorAll("input");
const couponDetail = document.querySelector(".payment-coupon-detail");
const couponNames = [];
const couponChoice = document.getElementById("payment-coupon-choice");
const discountCoupon = coupons[0];
const pointsPanel = document.getElementById("payment-points");
const pointAmount = document.getElementById("payment-point-amount");
const pointAll = document.getElementById("payment-point-all");
const card = document.getElementById("payment-card");
const simple = document.getElementById("payment-simple");
const mobile = document.getElementById("payment-mobile");
const discountAmount = document.querySelector(".payment-discount-amount");
const totalAmount = document.querySelector(".sum-total");
const booking = JSON.parse(localStorage.getItem("cineon_booking"));
const pointRate = 0.01;

let baseAmount = 0;
let pointBalance = 0;
let availablePoints = 0;
let currentDiscount = 0;
let wallet = null;
let reservations = [];

if (!booking || !booking.seats || booking.seats.length === 0) {
    alert("좌석을 먼저 선택해주세요.");
    window.location.href = "4_CINEON_timetable.html";
} else if (requireLogin("4_CINEON_payment.html")) {
    fetch("data/4_CINEON_history.json")
        .then(function (response) {
            return response.json();
        })
        .then(function (history) {
            wallet = loadWallet(history);
            reservations = loadReservations(history.reservations);
            startPayment();
        })
        .catch(function (error) {
            console.error("결제 정보를 불러오지 못했습니다.", error);
            alert("결제 정보를 불러오지 못했습니다. Live Server로 열었는지 확인해 주세요.");
        });
}

function drawBookingInfo() {
    const poster = document.querySelector(".show-poster");
    poster.src = booking.poster;
    poster.alt = booking.title + " 포스터";
    document.querySelector(".show-title").innerHTML = ageIcon(booking.age, 20) + booking.title;
    document.querySelector(".show-place").innerText = booking.place;
    document.querySelector(".show-datetime").innerText = booking.time_text;
    document.querySelector(".sum-people").innerText = booking.people_text;

    let seatHtml = "";
    for (const seat of booking.seats) {
        seatHtml += '<span class="payment-seat">' + seat + "</span>";
    }
    document.querySelector(".sum-seats").innerHTML = seatHtml;

    baseAmount = booking.price;
    const base = document.getElementById("payment-base");
    base.setAttribute("data-amount", baseAmount);
    base.innerText = baseAmount.toLocaleString("ko-KR") + "원";
    if (booking.discount > 0) {
        base.innerText += " (혼영석 -" + booking.discount.toLocaleString("ko-KR") + "원)";
    }
}

function makeCouponOption(coupon, index) {
    for (let j = 1; j < coupons.length; j++) {
        if (coupons[j].getAttribute("data-name") === coupon.name) {
            coupons[j].setAttribute("data-count", parseInt(coupons[j].getAttribute("data-count")) + 1);
            return "";
        }
    }
    return '<option value="' + coupon.amount + '" data-index="' + index + '">' +
        coupon.name + " (" + coupon.amount.toLocaleString("ko-KR") + "원)</option>";
}

function drawWallet() {
    let options = '<option value="">할인쿠폰을 선택해 주세요</option>';
    for (let i = 0; i < wallet.coupons.length; i++) {
        if (canUseCoupon(wallet.coupons[i])) {
            options += makeCouponOption(wallet.coupons[i], i);
        }
    }
    couponChoice.innerHTML = options;

    pointBalance = 0;
    for (const point of wallet.points) {
        pointBalance += point.amount;
    }
    pointsPanel.setAttribute("data-balance", pointBalance);
    availablePoints = pointBalance;
    if (baseAmount < availablePoints) {
        availablePoints = baseAmount;
    }
    pointAmount.max = availablePoints;
    document.getElementById("payment-point-balance").innerText =
        "(사용가능: " + availablePoints.toLocaleString("ko-KR") + "원 | 보유 포인트: " +
        pointBalance.toLocaleString("ko-KR") + "원)";

    for (let i = 0; i < coupons.length; i++) {
        const label = coupons[i].nextElementSibling;
        couponNames[i] = label.innerText;
        const count = coupons[i] === discountCoupon
            ? couponChoice.options.length - 1
            : coupons[i].getAttribute("data-count");
        label.innerText = couponNames[i] + "(" + count + ")";
    }
}

function startPayment() {
    drawBookingInfo();
    drawWallet();
    updatePayment();
}

function readPoints() {
    return Math.max(0, Math.min(availablePoints, Math.floor(Number(pointAmount.value)) || 0));
}

function updatePayment() {
    const discountTab = document.querySelector('[name="discount-tab"]:checked');
    const paymentMethod = document.querySelector('[name="payment-method"]:checked');
    const usePoints = discountTab.value === "point";
    let discount = 0;

    pointsPanel.hidden = !usePoints;
    pointAmount.disabled = !usePoints;
    pointAll.disabled = !usePoints || availablePoints === 0;
    couponPanel.hidden = usePoints;
    autoCoupon.disabled = usePoints;
    autoCoupon.parentElement.hidden = usePoints;
    document.querySelector(".payment-hint").hidden = usePoints;

    const useAutoCoupon = !usePoints && autoCoupon.checked;
    let bestCoupon;
    let bestChoice = "";

    if (useAutoCoupon) {
        for (let i = 1; i < couponChoice.options.length; i++) {
            const option = couponChoice.options[i];
            const amount = Number(option.value);
            if (!option.disabled && amount > discount) {
                bestCoupon = discountCoupon;
                bestChoice = option.value;
                discount = amount;
            }
        }
        for (let i = 1; i < coupons.length; i++) {
            const coupon = coupons[i];
            const amount = Number(coupon.getAttribute("data-amount"));
            if (Number(coupon.getAttribute("data-count")) > 0 && amount > discount) {
                bestCoupon = coupon;
                discount = amount;
            }
        }
        for (let i = 0; i < coupons.length; i++) {
            coupons[i].checked = coupons[i] === bestCoupon;
        }
        couponChoice.value = bestCoupon === discountCoupon ? bestChoice : "";
    }

    for (let i = 0; i < coupons.length; i++) {
        coupons[i].disabled = usePoints || useAutoCoupon;
    }
    const showChoice = !usePoints && discountCoupon.checked && couponChoice.options.length > 1;
    couponChoice.hidden = !showChoice;
    couponChoice.disabled = !showChoice || useAutoCoupon;
    couponDetail.hidden = true;

    if (usePoints) {
        discount = readPoints();
    } else if (showChoice) {
        discount = Number(couponChoice.value);
    } else {
        let selectedIndex = -1;
        for (let i = 0; i < coupons.length; i++) {
            if (coupons[i].checked) {
                selectedIndex = i;
                break;
            }
        }
        if (selectedIndex >= 0 || useAutoCoupon) {
            const selected = coupons[selectedIndex];
            const hasCoupon = selected && Number(selected.getAttribute("data-count")) > 0;
            discount = hasCoupon ? Number(selected.getAttribute("data-amount")) : 0;
            couponDetail.hidden = false;
            couponDetail.innerText = hasCoupon
                ? couponNames[selectedIndex] + " · " + discount.toLocaleString("ko-KR") + "원 할인"
                : "보유한 쿠폰이 없습니다.";
        }
    }

    card.hidden = card.disabled = paymentMethod.value !== "card";
    simple.hidden = simple.disabled = paymentMethod.value !== "simple";
    mobile.hidden = paymentMethod.value !== "mobile";

    if (discount > baseAmount) {
        discount = baseAmount;
    }
    currentDiscount = discount;
    discountAmount.innerText = (discount > 0 ? "-" : "") + discount.toLocaleString("ko-KR") + "원";
    totalAmount.innerText = (baseAmount - discount).toLocaleString("ko-KR") + "원";
}

paymentForm.addEventListener("change", updatePayment);
pointAmount.addEventListener("input", updatePayment);
pointAmount.addEventListener("change", function () {
    if (pointAmount.value !== "") {
        pointAmount.value = readPoints();
    }
    updatePayment();
});
pointAll.addEventListener("click", function () {
    pointAmount.value = availablePoints;
    updatePayment();
});
document.querySelector(".payment-discount-reset").addEventListener("click", function () {
    document.querySelector('[name="discount-tab"][value="coupon"]').checked = true;
    for (let i = 0; i < coupons.length; i++) {
        coupons[i].checked = false;
    }
    autoCoupon.checked = false;
    couponChoice.value = "";
    pointAmount.value = "";
    updatePayment();
});

function findUsedCoupon() {
    const usePoints = document.querySelector('[name="discount-tab"]:checked').value === "point";
    if (usePoints || currentDiscount === 0) {
        return -1;
    }
    if (!couponChoice.hidden && couponChoice.value) {
        return parseInt(couponChoice.querySelector("option:checked").getAttribute("data-index"));
    }
    for (let i = 1; i < coupons.length; i++) {
        if (coupons[i].checked) {
            for (let j = 0; j < wallet.coupons.length; j++) {
                if (wallet.coupons[j].name === coupons[i].getAttribute("data-name") && canUseCoupon(wallet.coupons[j])) {
                    return j;
                }
            }
        }
    }
    return -1;
}

function isSeatTaken() {
    for (const item of reservations) {
        if (item.schedule === booking.schedule && item.date === booking.date && !item.canceled) {
            for (const seat of item.seats) {
                if (hasItem(booking.seats, seat)) {
                    return true;
                }
            }
        }
    }
    return false;
}

paymentForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (isSeatTaken()) {
        alert("이미 예매된 좌석이 포함되어 있습니다. 좌석을 다시 선택해 주세요.");
        window.location.href = "4_CINEON_booking.html";
        return;
    }

    let method = "휴대폰 결제";
    if (!card.disabled) {
        method = card.value;
    } else if (!simple.disabled) {
        method = simple.value;
    }

    const couponIndex = findUsedCoupon();
    const usePoints = document.querySelector('[name="discount-tab"]:checked').value === "point";
    let pointUsed = 0;
    if (usePoints) {
        pointUsed = currentDiscount;
    }
    const paid = baseAmount - currentDiscount;
    const pointEarned = Math.floor(paid * pointRate);
    const today = todayText(0);

    const reservation = {
        id: "CN" + (new Date().getTime() % 100000000),
        user: getUser(),
        schedule: booking.schedule,
        date: booking.date,
        start: booking.start,
        seats: booking.seats,
        people: booking.people,
        price: booking.total,
        solo_discount: booking.discount,
        point_used: pointUsed,
        point_earned: pointEarned,
        paid: paid,
        method: method,
        booked: today,
        canceled: false
    };
    if (couponIndex >= 0) {
        reservation.coupon = wallet.coupons[couponIndex].name;
        reservation.coupon_amount = currentDiscount;
        reservation.coupon_index = couponIndex;
        wallet.coupons[couponIndex].used = today;
    }
    if (pointUsed > 0) {
        wallet.points.push({ date: today, title: "예매 결제 사용", amount: -pointUsed });
    }
    if (pointEarned > 0) {
        wallet.points.push({ date: today, title: "예매 적립", amount: pointEarned });
    }

    reservations.push(reservation);
    localStorage.setItem("cineon_reservations", JSON.stringify(reservations));
    saveWallet(wallet);
    localStorage.removeItem("cineon_booking");

    const receipt = {
        id: reservation.id,
        movie: booking.title,
        show: booking.place + " · " + booking.time_text.replace("\n", " "),
        seats: booking.people_text + " · " + booking.seats.join(", "),
        method: method,
        total: totalAmount.innerText,
        point: pointEarned
    };
    sessionStorage.setItem("cineon-receipt", JSON.stringify(receipt));
    window.location.href = paymentForm.action;
});
