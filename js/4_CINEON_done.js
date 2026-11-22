const savedReceipt = sessionStorage.getItem("cineon-receipt");
const details = document.getElementById("done-details");
const receiptButton = document.querySelector(".done-primary");

if (savedReceipt) {
    const receipt = JSON.parse(savedReceipt);
    document.querySelector(".done h1").innerText = "결제가 완료되었습니다";
    document.getElementById("done-message").innerText = "아래에서 예매 내역을 확인할 수 있습니다.";
    document.getElementById("done-movie").innerText = receipt.movie;
    document.getElementById("done-show").innerText = receipt.show;
    document.getElementById("done-seats").innerText = receipt.seats;
    document.getElementById("done-method").innerText = receipt.method;
    document.getElementById("done-total").innerText = receipt.total;
    document.querySelector(".done-icon").hidden = false;
    receiptButton.hidden = false;
}

receiptButton.addEventListener("click", function () {
    details.hidden = !details.hidden;
    receiptButton.setAttribute("aria-expanded", !details.hidden);
    receiptButton.innerText = details.hidden ? "예매 내역 확인하기" : "예매 내역 접기";
});
