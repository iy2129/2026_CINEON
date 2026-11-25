const movieMain = document.querySelector("main[data-movie-id]");
const movieId = movieMain.dataset.movieId;

const eventSection = movieMain.querySelector(".movie-events-section");
const eventFilter = eventSection.querySelector("#movie-event-filter");
const eventList = eventSection.querySelector(".event-list");
const eventMessage = eventSection.querySelector(".event-message");
let movieEvents = [];

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return [year, month, day].join("-");
}

function getEventStatus(movieEvent, today) {
    // YYYY-MM-DD 형식은 문자열 순서로 날짜를 비교할 수 있다.
    if (today < movieEvent.startDate) {
        return "예정";
    }
    if (today > movieEvent.endDate) {
        return "종료";
    }
    return "진행 중";
}

function formatEventDate(date) {
    const [year, month, day] = date.split("-");
    const weekday = "일월화수목금토"[new Date(date + "T00:00:00").getDay()];
    return year.slice(2) + "." + month + "." + day + "(" + weekday + ")";
}

function createEventCard(movieEvent, status) {
    const entry = document.createElement("div");
    entry.className = "event-entry";
    entry.innerHTML = `
        <article class="event-card">
            <div class="event-image"><img alt=""></div>
            <div class="event-info">
                <span class="event-category"></span>
                <span class="event-status"></span>
                <h3 class="event-title"></h3>
                <p class="event-period"></p>
            </div>
        </article>
    `;

    entry.querySelector("img").src = movieEvent.image;
    entry.querySelector(".event-category").textContent = movieEvent.category;
    entry.querySelector(".event-status").textContent = status;
    entry.querySelector(".event-title").textContent = movieEvent.title;
    entry.querySelector(".event-period").textContent =
        formatEventDate(movieEvent.startDate) + " ~ " + formatEventDate(movieEvent.endDate);
    return entry;
}

function renderEvents() {
    const today = getToday();
    const ongoingOnly = eventFilter.value === "ongoing";
    const visibleEvents = ongoingOnly
        ? movieEvents.filter(function (movieEvent) {
            return getEventStatus(movieEvent, today) === "진행 중";
        })
        : movieEvents;

    eventList.replaceChildren();
    for (const movieEvent of visibleEvents) {
        eventList.appendChild(createEventCard(movieEvent, getEventStatus(movieEvent, today)));
    }

    if (visibleEvents.length > 0) {
        eventMessage.textContent = "이벤트 " + visibleEvents.length + "건";
    } else {
        eventMessage.textContent = ongoingOnly
            ? "진행 중인 이벤트가 없습니다."
            : "표시할 이벤트가 없습니다.";
    }
}

eventFilter.addEventListener("change", renderEvents);

eventMessage.textContent = "이벤트를 불러오는 중입니다.";
fetch("data/4_CINEON_movie_events.json")
    .then(function (response) {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return response.json();
    })
    .then(function (data) {
        if (!data || !Array.isArray(data[movieId])) {
            throw new Error("영화별 이벤트 목록이 없습니다.");
        }
        movieEvents = data[movieId];
        renderEvents();
        eventFilter.disabled = false;
    })
    .catch(function (error) {
        eventList.replaceChildren();
        eventMessage.textContent = "이벤트를 불러오지 못했습니다.";
        console.error("이벤트 로드 오류:", error);
    });

const movieLikeButton = movieMain.querySelector(".detail-like");
const movieLikeKey = "cineon:movie-like:" + movieId;

function restoreMovieLike() {
    try {
        const liked = localStorage.getItem(movieLikeKey) === "true";
        movieLikeButton.setAttribute("aria-pressed", String(liked));
    } catch (error) {
        console.warn("찜 상태를 불러오지 못했습니다.", error);
    }
}

restoreMovieLike();
movieLikeButton.disabled = false;

movieLikeButton.addEventListener("click", function () {
    const liked = movieLikeButton.getAttribute("aria-pressed") !== "true";
    movieLikeButton.setAttribute("aria-pressed", String(liked));

    try {
        if (liked) {
            localStorage.setItem(movieLikeKey, "true");
        } else {
            localStorage.removeItem(movieLikeKey);
        }
    } catch (error) {
        console.warn("찜 상태를 저장하지 못했습니다.", error);
    }
});

window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        restoreMovieLike();
    }
});

window.addEventListener("storage", function (event) {
    if (event.key === movieLikeKey || event.key === null) {
        restoreMovieLike();
    }
});

function setupMovieMediaViewer() {
    const stillcuts = movieMain.querySelectorAll(".stillcut-link");
    const trailers = movieMain.querySelectorAll(".trailer-preview");
    const viewer = document.createElement("dialog");
    if (typeof viewer.showModal !== "function") {
        return;
    }

    viewer.className = "movie-media-viewer";
    viewer.innerHTML = `
        <div class="movie-media-viewer-content">
            <div class="movie-media-viewer-stage"></div>
            <div class="movie-media-viewer-controls">
                <button type="button" class="movie-media-prev" aria-label="이전 항목">‹</button>
                <button type="button" class="movie-media-next" aria-label="다음 항목">›</button>
                <button type="button" class="movie-media-close" aria-label="닫기" autofocus>×</button>
            </div>
            <p class="movie-media-caption" role="status"></p>
            <a class="movie-media-original" target="_blank" rel="noopener" hidden>유튜브에서 보기 (새 탭)</a>
        </div>
    `;
    document.body.appendChild(viewer);

    const stage = viewer.querySelector(".movie-media-viewer-stage");
    const caption = viewer.querySelector(".movie-media-caption");
    const original = viewer.querySelector(".movie-media-original");
    let links;
    let isTrailer;
    let currentIndex;

    function showMedia(index) {
        // 목록의 끝에서 계속 넘기면 반대쪽 끝으로 이동한다.
        currentIndex = (index + links.length) % links.length;
        const link = links[currentIndex];
        let title;

        if (isTrailer) {
            const videoId = new URL(link.href).pathname.slice(1);
            title = link.closest(".trailer-card").querySelector("figcaption").textContent.trim();
            const player = document.createElement("iframe");
            player.title = title;
            player.src = "https://www.youtube.com/embed/" + videoId;
            player.referrerPolicy = "strict-origin-when-cross-origin";
            player.allowFullscreen = true;
            stage.replaceChildren(player);
            original.href = link.href;
        } else {
            const image = document.createElement("img");
            title = link.querySelector("img").alt;
            image.src = link.getAttribute("href");
            image.alt = title;
            stage.replaceChildren(image);
        }

        caption.textContent = title + " (" + (currentIndex + 1) + " / " + links.length + ")";
    }

    function connectLinks(items, showTrailer) {
        items.forEach(function (link, index) {
            link.setAttribute("aria-haspopup", "dialog");
            if (!showTrailer) {
                link.title = "이미지 확대 보기";
            }
            link.addEventListener("click", function (event) {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                    return;
                }
                event.preventDefault();
                links = items;
                isTrailer = showTrailer;
                original.hidden = !isTrailer;
                viewer.setAttribute("aria-label", isTrailer ? "무비클립" : "포스터/스틸컷");
                link.focus({ preventScroll: true });
                showMedia(index);
                viewer.showModal();
            });
        });
    }

    connectLinks(stillcuts, false);
    connectLinks(trailers, true);

    viewer.querySelector(".movie-media-prev").addEventListener("click", function () {
        showMedia(currentIndex - 1);
    });
    viewer.querySelector(".movie-media-next").addEventListener("click", function () {
        showMedia(currentIndex + 1);
    });
    viewer.querySelector(".movie-media-close").addEventListener("click", function () {
        viewer.close();
    });

    viewer.addEventListener("click", function (event) {
        if (event.target === viewer) {
            viewer.close();
        }
    });
    viewer.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            showMedia(currentIndex + (event.key === "ArrowLeft" ? -1 : 1));
        }
    });
    viewer.addEventListener("close", function () {
        if (!viewer.open) {
            // 재생 중인 영상도 창을 닫으면 함께 정리한다.
            stage.replaceChildren();
        }
    });
}

setupMovieMediaViewer();
