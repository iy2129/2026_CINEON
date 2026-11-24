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
const baseAmount = parseInt(document.getElementById("payment-base").getAttribute("data-amount"));
const discountAmount = document.querySelector(".payment-discount-amount");
const totalAmount = document.querySelector(".sum-total");

const pointBalance = parseInt(pointsPanel.getAttribute("data-balance"));
const availablePoints = Math.min(pointBalance, baseAmount);
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

paymentForm.addEventListener("submit", function (event) {
    event.preventDefault();
    let method = "휴대폰 결제";
    if (!card.disabled) {
        method = card.value;
    } else if (!simple.disabled) {
        method = simple.value;
    }

    // 같은 탭의 완료 화면에서 방금 결제한 예매 내용을 읽습니다.
    const seats = document.querySelectorAll(".payment-seat");
    const seatNames = [];
    for (let i = 0; i < seats.length; i++) {
        seatNames.push(seats[i].innerText);
    }
    const receipt = {
        movie: document.querySelector(".show-title").innerText,
        show: document.querySelector(".show-text > span").innerText + " · " +
            document.querySelector(".show-datetime").innerText.replace("\n", " "),
        seats: document.querySelector(".sum-people").innerText + " · " +
            seatNames.join(", "),
        method: method,
        total: totalAmount.innerText
    };

    sessionStorage.setItem("cineon-receipt", JSON.stringify(receipt));
    window.location.href = paymentForm.action;
});

updatePayment();
