const ranking = document.querySelector(".ranking-movies");
const exclusive = document.querySelector(".exclusive-movies");
const statusTabs = document.querySelectorAll('input[name="movie-status"]');

function makeMovieCard(movie, rank) {
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
    rankLabel.innerText = rank;
    rankLabel.hidden = rank === 0;
    card.querySelector(".movie-summary").innerText = movie.summary;
    card.querySelector(".movie-review strong").innerText = movie.rating;
    card.querySelector(".movie-title").innerText = movie.title;

    if (rank > 0) {
        const actions = document.createElement("div");
        actions.className = "movie-actions";
        actions.innerHTML = '<a class="btn-booking" href="4_CINEON_timetable.html">예매하기</a>';
        if (movie.likes !== null) {
            actions.innerHTML = '<label class="movie-like"><input type="checkbox">' +
                '<img class="movie-like-off movie-heart" src="images/4_icon_heart_off.svg" alt="" width="20" height="20">' +
                '<img class="movie-like-on movie-heart" src="images/4_icon_heart_on.svg" alt="" width="20" height="20">' +
                '<span class="movie-like-count"></span></label>' + actions.innerHTML;

            const like = actions.querySelector("input");
            const likeKey = "cineon-like-" + movie.poster;
            like.setAttribute("aria-label", movie.title + " 좋아요");
            actions.querySelector(".movie-like-count").innerText = movie.likes;
            like.checked = localStorage.getItem(likeKey) === "true";
            like.addEventListener("change", function () {
                localStorage.setItem(likeKey, like.checked);
            });
        }
        card.appendChild(actions);
    }
    return card;
}

function setupSlider(section) {
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

    return function (movies, showRank, emptyMessage) {
        list.innerHTML = "";
        for (let i = 0; i < movies.length; i++) {
            list.appendChild(makeMovieCard(movies[i], showRank ? i + 1 : 0));
        }
        message.innerText = emptyMessage;
        message.hidden = movies.length > 0;
        updateArrows();
    };
}

const showRanking = setupSlider(ranking);
const showExclusive = setupSlider(exclusive);

// Fetch로 외부 JSON을 불러온 뒤 DOM에 카드를 추가합니다.
fetch("data/4_CINEON_movies.json")
    .then(function (response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error("영화 목록을 불러올 수 없습니다.");
    })
    .then(function (movies) {
        function updateRanking() {
            const status = document.querySelector('input[name="movie-status"]:checked').value;
            showRanking(movies[status], true, "등록된 상영 예정작이 없습니다.");
        }

        for (let i = 0; i < statusTabs.length; i++) {
            statusTabs[i].addEventListener("change", updateRanking);
        }
        updateRanking();
        showExclusive(movies.now, false, "등록된 영화가 없습니다.");
    })
    .catch(function () {
        const message = "영화 목록을 불러오지 못했습니다. 페이지를 다시 열어 주세요.";
        showRanking([], true, message);
        showExclusive([], false, message);
    });
