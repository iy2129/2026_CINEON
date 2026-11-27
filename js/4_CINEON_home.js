const ranking = document.querySelector(".ranking-movies");
const exclusive = document.querySelector(".exclusive-movies");
const statusTabs = document.querySelectorAll('input[name="movie-status"]');

function releaseCountdown(releaseDate) {
    const today = new Date();
    const todayDate = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const release = new Date(releaseDate);
    const days = (release.getTime() - todayDate) / (24 * 60 * 60 * 1000);
    if (days > 0) {
        return "D-" + days;
    }
    return days === 0 ? "D-DAY" : "개봉";
}

function makeMovieCard(movie, rank, status) {
    const card = document.createElement("article");
    card.className = "movie-card";
    card.innerHTML = '<a class="movie-poster" title="영화 상세 보기">' +
        '<img class="poster-image" alt=""><span class="movie-rank"></span>' +
        '<span class="age-rating"><img alt=""></span>' +
        '<div class="movie-overlay"><p class="movie-summary"></p>' +
        '<div class="movie-review">평점 <strong></strong></div></div></a>' +
        '<h3 class="movie-title"></h3>';

    const poster = card.querySelector(".poster-image");
    const age = card.querySelector(".age-rating img");
    const rankLabel = card.querySelector(".movie-rank");

    card.querySelector(".movie-poster").href = movie.detail;
    poster.src = movie.poster;
    poster.alt = movie.title + " 포스터";
    age.src = movie.ageIcon;
    age.alt = movie.ageLabel;
    if (status === "coming-soon") {
        rankLabel.className = "movie-countdown";
        rankLabel.innerText = releaseCountdown(movie.releaseDate);
    } else {
        rankLabel.innerText = rank;
        rankLabel.hidden = status !== "now";
    }
    card.querySelector(".movie-summary").innerText = movie.summary;
    card.querySelector(".movie-review strong").innerText = movie.rating;
    card.querySelector(".movie-title").innerText = movie.title;

    if (status !== "exclusive") {
        const actions = document.createElement("div");
        actions.className = "movie-actions";
        actions.innerHTML = '<a class="btn-booking" href="4_CINEON_timetable.html">예매하기</a>';
        if (movie.likes !== null) {
            actions.innerHTML = '<label class="movie-like"><input type="checkbox">' +
                '<img class="movie-like-off movie-heart" src="images/4_icon_heart_off.svg" alt="" width="20" height="20">' +
                '<img class="movie-like-on movie-heart" src="images/4_icon_heart_on.svg" alt="" width="20" height="20">' +
                '<span class="movie-like-count"></span></label>' + actions.innerHTML;

            const like = actions.querySelector("input");
            like.setAttribute("aria-label", movie.title + " 좋아요");
            actions.querySelector(".movie-like-count").innerText = movie.likes;
            like.checked = isMovieWished(movie.poster);
            like.addEventListener("change", function () {
                setMovieWished(movie.poster, like.checked);
            });
            like.dataset.wishPoster = movie.poster;
        }
        card.appendChild(actions);
    }
    return card;
}

function refreshHomeHearts() {
    for (const like of ranking.querySelectorAll("input[data-wish-poster]")) {
        like.checked = isMovieWished(like.dataset.wishPoster);
    }
}

window.addEventListener("storage", refreshHomeHearts);
window.addEventListener("pageshow", refreshHomeHearts);

function makeReviewCard(movie) {
    const review = movie.review;
    const card = document.createElement("article");
    card.className = "movie-card review-card";
    card.innerHTML = '<header class="review-author"><img class="review-avatar" alt="" width="36" height="36">' +
        '<div class="review-byline"><div class="review-name"><strong></strong><span class="review-meta"><span class="review-time"></span>' +
        '<span class="review-rating"><img src="images/4_icon_star.svg" alt="" width="16" height="16"><strong></strong></span>' +
        '</span></div><h3 class="review-film-title"></h3></div>' +
        '<img class="review-poster" alt="" width="46" height="64"></header>' +
        '<p class="review-text"></p>' +
        '<footer class="review-stats">' +
        '<span><img src="images/4_icon_thumb_up.svg" alt="좋아요" width="18" height="18"><span class="review-like-count"></span></span>' +
        '<span><img src="images/4_icon_comment.svg" alt="댓글" width="18" height="18"><span class="review-comment-count"></span></span></footer>';

    card.querySelector(".review-avatar").src = review.avatar;
    card.querySelector(".review-byline strong").innerText = review.author;
    card.querySelector(".review-time").innerText = review.daysAgo === 0 ? "오늘" : review.daysAgo + "일 전";
    card.querySelector(".review-rating strong").innerText = review.rating;
    card.querySelector(".review-rating").setAttribute("aria-label", "10점 만점에 " + review.rating + "점");
    card.querySelector(".review-text").innerText = review.text;
    card.querySelector(".review-like-count").innerText = review.likes;
    card.querySelector(".review-comment-count").innerText = review.comments;
    card.querySelector(".review-poster").src = movie.poster;
    const title = card.querySelector(".review-film-title");
    title.innerText = movie.title;
    if (movie.detail !== "#") {
        const link = document.createElement("a");
        link.href = movie.detail;
        link.innerText = movie.title;
        title.innerText = "";
        title.appendChild(link);
    }
    return card;
}

function setupSlider(section, makeCard = makeMovieCard) {
    const list = section.querySelector(".movie-list");
    const previous = section.querySelector(".movie-prev");
    const next = section.querySelector(".movie-next");
    const message = section.querySelector(".movie-message");

    function updateArrows() {
        previous.disabled = list.scrollLeft <= 1;
        next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
    }

    function move(direction) {
        const cards = list.querySelectorAll(".movie-card");
        if (cards.length > 1) {
            const step = cards[1].offsetLeft - cards[0].offsetLeft;
            list.scrollLeft += step * direction;
        }
    }

    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    list.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);

    return function (movies, status, emptyMessage) {
        list.innerHTML = "";
        for (let i = 0; i < movies.length; i++) {
            list.appendChild(makeCard(movies[i], i + 1, status));
        }
        message.innerText = emptyMessage;
        message.hidden = movies.length > 0;
        list.scrollTo({ left: 0, behavior: "instant" });
        updateArrows();
    };
}

const showRanking = setupSlider(ranking);
const showExclusive = setupSlider(exclusive);
const reviewSlider = document.querySelector(".review-slider");
const reviewMore = document.querySelector(".review-more");
const showReviews = setupSlider(reviewSlider, makeReviewCard);

// Fetch로 외부 JSON을 불러온 뒤 DOM에 카드를 추가합니다.
fetch("data/4_CINEON_movies.json")
    .then(function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error("영화 목록을 불러올 수 없습니다.");
    })
    .then(function (movies) {
        const upcoming = movies.now.slice();
        upcoming.sort(function (first, second) {
            return new Date(first.releaseDate) - new Date(second.releaseDate);
        });

        function updateRanking() {
            const status = document.querySelector('input[name="movie-status"]:checked').value;
            const list = status === "coming-soon" ? upcoming : movies.now;
            showRanking(list, status, "등록된 상영 예정작이 없습니다.");
        }

        for (let i = 0; i < statusTabs.length; i++) {
            statusTabs[i].addEventListener("change", updateRanking);
        }
        updateRanking();
        showExclusive(movies.now, "exclusive", "등록된 영화가 없습니다.");

        const reviews = movies.now.filter(function (movie) {
            return movie.review;
        });
        showReviews(reviews, "", "등록된 관람평이 없습니다.");
        reviewMore.disabled = reviews.length === 0;
        reviewMore.addEventListener("click", function () {
            const expanded = reviewSlider.classList.toggle("reviews-expanded");
            reviewMore.setAttribute("aria-expanded", expanded);
            showReviews(reviews, "", "등록된 관람평이 없습니다.");
        });
    })
    .catch(function () {
        const message = "영화 목록을 불러오지 못했습니다. 페이지를 다시 열어 주세요.";
        showRanking([], "now", message);
        showExclusive([], "exclusive", message);
        showReviews([], "", "관람평을 불러오지 못했습니다.");
    });
