const movieMain = document.querySelector("main[data-movie-id]");
const movieId = movieMain.dataset.movieId;

function setupMovieTabs() {
    const tabBar = movieMain.querySelector(".movie-tab-bar");
    const tabsStart = movieMain.querySelector(".movie-tabs-start");
    const tabs = Array.from(tabBar.querySelectorAll('[role="tab"]'));
    const overview = movieMain.querySelector(".movie-overview-panel");
    const sectionLinks = overview.querySelectorAll(".movie-section-nav a");

    function selectTab(selectedTab) {
        for (const tab of tabs) {
            const selected = tab === selectedTab;
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
            document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
        }
    }

    function activateTab(tab) {
        if (tab.getAttribute("aria-selected") === "true") {
            return;
        }

        const wasSticky = tabsStart.getBoundingClientRect().top < tabBar.getBoundingClientRect().top;
        selectTab(tab);
        if (wasSticky) {
            tabsStart.scrollIntoView({ behavior: "instant" });
        }
    }

    function syncSectionLink() {
        const hash = window.location.hash;
        const currentSection = hash || "#movie-overview";
        for (const link of sectionLinks) {
            if (link.getAttribute("href") === currentSection) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        }

        const target = document.getElementById(hash.slice(1));
        if (overview.hidden && overview.contains(target)) {
            selectTab(tabs[0]);
            target.scrollIntoView();
        }
    }

    for (const tab of tabs) {
        tab.addEventListener("click", function () {
            activateTab(tab);
        });
    }

    tabBar.addEventListener("keydown", function (event) {
        const index = tabs.indexOf(event.target);
        if (index < 0) {
            return;
        }

        let nextIndex;
        switch (event.key) {
            case "ArrowLeft":
                nextIndex = (index - 1 + tabs.length) % tabs.length;
                break;
            case "ArrowRight":
                nextIndex = (index + 1) % tabs.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        const nextTab = tabs[nextIndex];
        activateTab(nextTab);
        nextTab.focus({ preventScroll: true });
    });

    tabBar.hidden = false;
    syncSectionLink();
    window.addEventListener("hashchange", syncSectionLink);
}

setupMovieTabs();

const eventSection = movieMain.querySelector(".movie-events-section");
const eventList = eventSection.querySelector(".event-list");
const eventCount = eventSection.querySelector(".movie-event-count");
const eventMessage = eventSection.querySelector(".event-message");

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return [year, month, day].join("-");
}

function formatEventDate(date) {
    const [year, month, day] = date.split("-");
    const weekday = "일월화수목금토"[new Date(date + "T00:00:00").getDay()];
    return year.slice(2) + "." + month + "." + day + "(" + weekday + ")";
}

function createEventCard(movieEvent) {
    const entry = document.createElement("div");
    entry.className = "event-entry";
    entry.innerHTML = `
        <a class="event-card" href="#" title="이벤트 상세 보기">
            <div class="event-image"><img alt=""></div>
            <div class="event-info">
                <span class="event-category"></span>
                <h3 class="event-title"></h3>
                <p class="event-period"></p>
            </div>
        </a>
    `;

    entry.querySelector("img").src = movieEvent.image;
    entry.querySelector(".event-category").textContent = movieEvent.category;
    entry.querySelector(".event-title").textContent = movieEvent.title;
    entry.querySelector(".event-period").textContent =
        formatEventDate(movieEvent.startDate) + " ~ " + formatEventDate(movieEvent.endDate);
    return entry;
}

eventList.addEventListener("click", function (event) {
    if (event.target.closest('.event-card[href="#"]')) {
        event.preventDefault();
    }
});

function renderEvents(movieEvents) {
    const today = getToday();
    // YYYY-MM-DD 형식은 문자열 순서로 날짜를 비교할 수 있다.
    const ongoingEvents = movieEvents.filter(function (movieEvent) {
        return movieEvent.startDate <= today && today <= movieEvent.endDate;
    });

    eventList.replaceChildren();
    for (const movieEvent of ongoingEvents) {
        eventList.appendChild(createEventCard(movieEvent));
    }

    eventCount.textContent = ongoingEvents.length > 0 ? "(" + ongoingEvents.length + ")" : "";
    eventMessage.textContent = ongoingEvents.length === 0 ? "진행 중인 이벤트가 없습니다." : "";
}

function fetchMovieJson(path) {
    return fetch(path).then(function (response) {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return response.json();
    });
}

eventMessage.textContent = "이벤트를 불러오는 중입니다.";
fetchMovieJson("data/4_CINEON_movie_events.json")
    .then(function (data) {
        if (!data || !Array.isArray(data[movieId])) {
            throw new Error("영화별 이벤트 목록이 없습니다.");
        }
        renderEvents(data[movieId]);
    })
    .catch(function (error) {
        eventList.replaceChildren();
        eventMessage.textContent = "이벤트를 불러오지 못했습니다.";
        console.error("이벤트 로드 오류:", error);
    });

const movieLikeButton = movieMain.querySelector(".detail-like");
const movieLikePoster = movieMain.querySelector(".movie-poster img").getAttribute("src");
const movieLikeKey = movieWishKey(movieLikePoster);

function restoreMovieLike() {
    try {
        const liked = isMovieWished(movieLikePoster);
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
        setMovieWished(movieLikePoster, liked);
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

function setupMovieSeries() {
    const section = movieMain.querySelector(".movie-series-section");
    if (!section) {
        return;
    }

    const list = section.querySelector(".movie-series-list");
    const template = section.querySelector(".movie-series-template");
    fetchMovieJson("data/4_CINEON_movie_series.json")
        .then(function (movies) {
            if (!Array.isArray(movies) || movies.length === 0) {
                return;
            }

            movies.sort(function (first, second) {
                return first.releaseDate.localeCompare(second.releaseDate);
            });
            for (const movie of movies) {
                const card = template.content.cloneNode(true);
                card.querySelector("img").src = movie.poster;
                card.querySelector(".movie-series-title").textContent = movie.title;
                const release = card.querySelector("time");
                release.dateTime = movie.releaseDate;
                release.textContent = movie.releaseDate.split("-").join(".") + " 개봉";
                list.appendChild(card);
            }
            section.hidden = false;
        })
        .catch(function (error) {
            console.error("시리즈 영화 로드 오류:", error);
        });
}

setupMovieSeries();

function createMovieReviewCard(review) {
    const card = document.createElement("li");
    card.className = "movie-review-card";
    card.innerHTML = `
        <div class="movie-review-author">
            <img class="movie-review-avatar" alt="" width="36" height="36">
            <div class="movie-review-byline"><strong></strong><span></span></div>
            <span class="movie-review-score">
                <img src="images/4_icon_star.svg" alt="평점" width="16" height="16"><span></span>
            </span>
        </div>
        <p class="movie-review-text"></p>
        <span class="movie-review-stats">
            <img src="images/4_icon_thumb_up.svg" alt="" width="18" height="18"><span></span>
        </span>
    `;

    card.querySelector(".movie-review-avatar").src = review.avatar;
    card.querySelector(".movie-review-byline strong").textContent = review.author;
    card.querySelector(".movie-review-byline span").textContent = review.daysAgo === 0 ? "오늘" : review.daysAgo + "일 전";
    card.querySelector(".movie-review-score span").textContent = review.rating;
    card.querySelector(".movie-review-text").textContent = review.text;
    card.querySelector(".movie-review-stats span").textContent = "좋아요 " + review.likes;
    return card;
}

function setupMovieReviews() {
    const panel = movieMain.querySelector(".movie-review-panel");
    const count = panel.querySelector(".movie-review-count");
    const message = panel.querySelector(".movie-review-message");
    const list = panel.querySelector(".movie-review-list");
    const pageName = window.location.pathname.split("/").pop();

    fetchMovieJson("data/4_CINEON_movies.json")
        .then(function (movies) {
            const movie = movies.now.find(function (item) {
                return item.detail === pageName;
            });
            if (!movie || !movie.review) {
                count.textContent = "0건";
                message.textContent = "등록된 관람평이 없습니다.";
                return;
            }

            list.appendChild(createMovieReviewCard(movie.review));
            count.textContent = list.childElementCount + "건";
            message.textContent = "";
        })
        .catch(function (error) {
            message.textContent = "관람평을 불러오지 못했습니다.";
            console.error("관람평 로드 오류:", error);
        });
}

setupMovieReviews();
