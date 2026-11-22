const paymentForm = document.getElementById("payment-form");
const couponPanel = document.querySelector(".payment-coupons");
const autoCoupon = document.querySelector('[name="auto-coupon"]');
const coupons = couponPanel.querySelectorAll("input");
const pointsPanel = document.getElementById("payment-points");
const pointAmount = document.getElementById("payment-point-amount");
const card = document.getElementById("payment-card");
const simple = document.getElementById("payment-simple");
const mobile = document.getElementById("payment-mobile");
const baseAmount = parseInt(document.getElementById("payment-base").getAttribute("data-amount"));
const discountAmount = document.querySelector(".payment-discount-amount");
const totalAmount = document.querySelector(".sum-total");

function updatePayment() {
    const discountTab = document.querySelector('[name="discount-tab"]:checked');
    const paymentMethod = document.querySelector('[name="payment-method"]:checked');
    const usePoints = discountTab.value === "point";
    let discount = 0;

    pointsPanel.hidden = !usePoints;
    pointAmount.disabled = !usePoints;
    couponPanel.hidden = usePoints;
    autoCoupon.disabled = usePoints;
    autoCoupon.parentElement.hidden = usePoints;
    document.querySelector(".payment-hint").hidden = usePoints;

    if (usePoints) {
        discount = Math.max(0, Math.min(1000, parseInt(pointAmount.value) || 0));
    } else if (autoCoupon.checked) {
        for (let i = 0; i < coupons.length; i++) {
            discount = Math.max(discount, parseInt(coupons[i].getAttribute("data-amount")));
        }
    } else {
        const coupon = couponPanel.querySelector("input:checked");
        if (coupon) {
            discount = parseInt(coupon.getAttribute("data-amount"));
        }
    }

    for (let i = 0; i < coupons.length; i++) {
        coupons[i].disabled = usePoints || autoCoupon.checked;
    }
    card.hidden = card.disabled = paymentMethod.value !== "card";
    simple.hidden = simple.disabled = paymentMethod.value !== "simple";
    mobile.hidden = paymentMethod.value !== "mobile";

    discountAmount.innerText = (discount > 0 ? "-" : "") + discount.toLocaleString("ko-KR") + "원";
    totalAmount.innerText = (baseAmount - discount).toLocaleString("ko-KR") + "원";
}

paymentForm.addEventListener("change", updatePayment);
pointAmount.addEventListener("input", updatePayment);
paymentForm.addEventListener("reset", function () {
    setTimeout(updatePayment, 0);
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
