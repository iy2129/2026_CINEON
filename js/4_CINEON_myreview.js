const reviewPage = document.querySelector(".my-review-main");
const reviewFilm = reviewPage.querySelector(".my-review-film");
const reviewMessage = reviewPage.querySelector(".my-review-message");
const reviewEditor = reviewPage.querySelector(".my-review-editor");
const reviewEditorToggle = reviewEditor.querySelector("summary");
const personalReviewForm = reviewEditor.querySelector("form");
const saveReviewStatus = reviewPage.querySelector(".my-review-save-status");
const ratingField = reviewPage.querySelector(".my-review-stars");
const starDisplay = ratingField.querySelector(".rating-stars");
const starOptions = ratingField.querySelector(".my-review-star-options");
const reviewComment = reviewPage.querySelector(".my-review-comment");
const requestedFilm = new URLSearchParams(window.location.search).get("movie");
let loadedReviewKey;

for (let half = 1; half <= 10; half++) {
    const value = half / 2;
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "rating";
    radio.value = value;
    radio.setAttribute("form", personalReviewForm.id);
    radio.setAttribute("aria-label", value + "점");
    starOptions.appendChild(radio);
}

starOptions.addEventListener("change", function (event) {
    starDisplay.style.setProperty("--rating-fill", Number(event.target.value) * 20 + "%");
    starDisplay.style.removeProperty("--rating-preview-fill");
    saveReviewStatus.textContent = "";
    reviewEditor.open = true;
});

starOptions.addEventListener("pointerover", function (event) {
    if (event.pointerType === "mouse" && event.target.matches("input") && !ratingField.disabled) {
        starDisplay.style.setProperty("--rating-preview-fill", Number(event.target.value) * 20 + "%");
    }
});

starOptions.addEventListener("pointerleave", function () {
    starDisplay.style.removeProperty("--rating-preview-fill");
});

function personalReviewKey() {
    const username = localStorage.getItem(authSessionKey);
    return username ? personalReviewStorageKey(username, requestedFilm) : null;
}

function showPersonalReview(review) {
    const rating = review?.rating || 0;
    const comment = review?.comment || "";
    starDisplay.style.setProperty("--rating-fill", rating * 20 + "%");
    starDisplay.style.removeProperty("--rating-preview-fill");
    reviewComment.textContent = comment || (rating ? "작성한 관람평이 없어요." : "아직 작성한 평가가 없어요.");
    reviewEditorToggle.textContent = rating ? "평가 수정" : "평가 작성";

    personalReviewForm.reset();
    personalReviewForm.elements.rating.value = rating || "";
    personalReviewForm.elements.comment.value = comment;
}

function loadPersonalReview() {
    reviewEditor.open = false;
    saveReviewStatus.textContent = "";
    try {
        const username = localStorage.getItem(authSessionKey);
        loadedReviewKey = username ? personalReviewStorageKey(username, requestedFilm) : null;
        reviewEditor.hidden = !loadedReviewKey;
        ratingField.disabled = !loadedReviewKey;
        showPersonalReview(username ? readPersonalReview(username, requestedFilm) : null);
    } catch (error) {
        reviewEditor.hidden = true;
        ratingField.disabled = true;
        showPersonalReview(null);
        saveReviewStatus.textContent = "저장한 평가를 불러오지 못했어요.";
    }
}

personalReviewForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const rating = Number(personalReviewForm.elements.rating.value);
    if (!Number.isInteger(rating * 2) || rating < 0.5 || rating > 5) {
        saveReviewStatus.textContent = "별점을 먼저 선택해 주세요.";
        starOptions.querySelector("input").focus({ preventScroll: true });
        return;
    }
    const comment = personalReviewForm.elements.comment.value.trim();
    try {
        const key = personalReviewKey();
        if (!key || key !== loadedReviewKey) {
            loadPersonalReview();
            return;
        }
        const review = { rating, comment, updatedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(review));
        showPersonalReview(review);
        reviewEditor.open = false;
        reviewEditorToggle.focus();
        saveReviewStatus.textContent = "평가를 저장했어요.";
    } catch (error) {
        saveReviewStatus.textContent = "평가를 저장하지 못했어요.";
    }
});

function renderReviewFilm(movie) {
    document.title = movie.title + " · 내 평가 | CINE:ON";
    reviewFilm.querySelector("h1").textContent = movie.title;
    reviewFilm.querySelector(".my-review-meta").textContent = movie.genres.join(" / ") + " · " + movie.minutes + "분";
    reviewFilm.querySelector(".my-review-date").textContent = "관람일 " + movie.date.replaceAll("-", ".");

    const poster = reviewFilm.querySelector(".my-review-poster");
    poster.src = movie.poster;
    poster.alt = movie.title + " 포스터";
    reviewFilm.querySelector(".my-review-backdrop").src = movie.backdrop || movie.poster;
    reviewFilm.querySelector(".my-review-story p").textContent = movie.synopsis;
    const detail = reviewFilm.querySelector(".my-review-detail");
    if (movie.detail) {
        detail.href = movie.detail;
        detail.hidden = false;
    }
    loadPersonalReview();
    reviewFilm.hidden = false;
    reviewMessage.hidden = true;
}

if (!reviewPage.hidden) {
    fetch("data/4_CINEON_mypage.json")
        .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        })
        .then(function (movies) {
            const movie = movies.find(record => record.id === requestedFilm);
            if (movie) {
                renderReviewFilm(movie);
            } else {
                reviewMessage.textContent = "관람 기록에서 이 영화를 찾지 못했어요.";
            }
        })
        .catch(function () {
            reviewMessage.textContent = "영화 정보를 불러오지 못했어요.";
        });

    window.addEventListener("storage", function (event) {
        if (event.key === authSessionKey || event.key === loadedReviewKey || event.key === null) {
            loadPersonalReview();
        }
    });
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            loadPersonalReview();
        }
    });
}
